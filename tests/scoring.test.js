import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeIndicator, formatPercent, explainIndicator, projectIndicator,
  indicatorsByArea, indicatorsByFramework, improvementItems, highPriorityPending, nextActions,
} from '../js/scoring.js';
import { CONTROLS, AREAS, FRAMEWORKS, controlIdsForFramework } from '../js/controls.js';
import { project, assessment, stateWith } from './helpers.js';

function map(entries) {
  return new Map(entries.map(([id, status, extra = {}]) => [id, { status, evidenceText: '', evidenceUrl: '', ...extra }]));
}

describe('computeIndicator', () => {
  test('calcula com todas as situações', () => {
    const m = map([
      ['A', 'implementado'], ['B', 'parcial'], ['C', 'nao_implementado'],
      ['D', 'nao_avaliado'], ['E', 'nao_aplicavel'],
    ]);
    const r = computeIndicator(['A', 'B', 'C', 'D', 'E'], m);
    assert.equal(r.total, 5);
    assert.equal(r.applicable, 4);
    assert.equal(r.numerator, 1.5);
    assert.equal(r.percent, 37.5);
    assert.deepEqual(r.counts, { nao_avaliado: 1, nao_implementado: 1, parcial: 1, implementado: 1, nao_aplicavel: 1 });
  });

  test('parcialmente implementado tem peso 0,5', () => {
    const r = computeIndicator(['A', 'B'], map([['A', 'parcial'], ['B', 'parcial']]));
    assert.equal(r.numerator, 1);
    assert.equal(r.percent, 50);
  });

  test('não aplicável é excluído do denominador', () => {
    const r = computeIndicator(['A', 'B', 'C'], map([['A', 'implementado'], ['B', 'nao_aplicavel'], ['C', 'nao_aplicavel']]));
    assert.equal(r.applicable, 1);
    assert.equal(r.percent, 100);
  });

  test('não avaliado permanece no denominador com peso 0', () => {
    const r = computeIndicator(['A', 'B'], map([['A', 'implementado'], ['B', 'nao_avaliado']]));
    assert.equal(r.applicable, 2);
    assert.equal(r.percent, 50);
  });

  test('controle sem registro conta como não avaliado', () => {
    const r = computeIndicator(['A', 'B'], map([['A', 'implementado']]));
    assert.equal(r.counts.nao_avaliado, 1);
    assert.equal(r.percent, 50);
  });

  test('sem controles aplicáveis: percent é null e exibe "Sem base para cálculo"', () => {
    const r = computeIndicator(['A', 'B'], map([['A', 'nao_aplicavel'], ['B', 'nao_aplicavel']]));
    assert.equal(r.applicable, 0);
    assert.equal(r.percent, null);
    assert.equal(formatPercent(r.percent), 'Sem base para cálculo');
    assert.match(explainIndicator(r), /Sem base para cálculo/);
    const empty = computeIndicator([], new Map());
    assert.equal(empty.percent, null);
  });

  test('nunca exibe NaN, Infinity, 0% ou 100% quando não há base', () => {
    for (const v of [null, NaN, Infinity, -Infinity, undefined]) {
      assert.equal(formatPercent(v), 'Sem base para cálculo');
    }
  });

  test('arredonda somente na apresentação (valor bruto preservado)', () => {
    // 1 implementado de 3 aplicáveis = 33,333...%
    const r = computeIndicator(['A', 'B', 'C'], map([['A', 'implementado'], ['B', 'nao_implementado'], ['C', 'nao_avaliado']]));
    assert.equal(r.percent, (1 / 3) * 100);
    assert.notEqual(r.percent, 33.3);
    assert.equal(formatPercent(r.percent), '33,3%');
    // 2/3 = 66,666...% → 66,7%
    assert.equal(formatPercent(200 / 3), '66,7%');
    assert.equal(formatPercent(0), '0,0%');
    assert.equal(formatPercent(100), '100,0%');
  });

  test('ID duplicado no grupo é contado uma única vez', () => {
    const r = computeIndicator(['A', 'A', 'B'], map([['A', 'implementado'], ['B', 'nao_implementado']]));
    assert.equal(r.total, 2);
    assert.equal(r.percent, 50);
  });

  test('implementado sem evidência mantém peso 1 e conta como evidência pendente', () => {
    const r = computeIndicator(['A', 'B', 'C', 'D'], map([
      ['A', 'implementado'],
      ['B', 'implementado', { evidenceText: 'Documento X' }],
      ['C', 'implementado', { evidenceUrl: 'https://example.org/x' }],
      ['D', 'parcial'],
    ]));
    assert.equal(r.pendingEvidence, 1);
    assert.equal(r.numerator, 3.5);
  });

  test('explicação mostra numerador e denominador', () => {
    const r = computeIndicator(['A', 'B', 'C'], map([['A', 'implementado'], ['B', 'parcial'], ['C', 'nao_implementado']]));
    const text = explainIndicator(r);
    assert.match(text, /1 implementado/);
    assert.match(text, /0,5 × 1 parcial/);
    assert.match(text, /1,5 ÷ 3/);
    assert.match(text, /50,0%/);
  });
});

describe('recortes por área e framework', () => {
  const p = project('p_00000000000000aa', 'Projeto A');
  const all = CONTROLS.map((c) => assessment(p.id, c.id, 'implementado', { evidenceText: 'ok' }));

  test('cada área usa apenas seus controles', () => {
    const s = stateWith([p], [
      ...CONTROLS.filter((c) => c.area !== 'planejamento').map((c) => assessment(p.id, c.id, 'nao_implementado')),
      ...CONTROLS.filter((c) => c.area === 'planejamento').map((c) => assessment(p.id, c.id, 'implementado', { evidenceText: 'x' })),
    ]);
    const rows = indicatorsByArea(s, p.id);
    assert.equal(rows.length, AREAS.length);
    for (const r of rows) {
      const expectedTotal = CONTROLS.filter((c) => c.area === r.area.id).length;
      assert.equal(r.indicator.total, expectedTotal);
      assert.equal(r.indicator.percent, r.area.id === 'planejamento' ? 100 : 0);
    }
  });

  test('cada framework usa apenas controles vinculados, sem duplicidade', () => {
    const s = stateWith([p], all);
    for (const { framework, indicator } of indicatorsByFramework(s, p.id)) {
      const ids = controlIdsForFramework(framework.id);
      assert.equal(new Set(ids).size, ids.length, 'IDs únicos');
      assert.equal(indicator.total, ids.length);
      // Controles com mais de um relacionamento ao mesmo framework contam uma vez.
      const multi = CONTROLS.filter((c) => c.relationships.filter((r) => r.framework === framework.id).length > 1);
      for (const c of multi) assert.ok(ids.includes(c.id));
    }
  });

  test('ST-02 (dois vínculos SAMM) é contado uma vez no recorte SAMM', () => {
    const st02 = CONTROLS.find((c) => c.id === 'ST-02');
    assert.ok(st02.relationships.filter((r) => r.framework === 'samm').length >= 2);
    const s = stateWith([p], [assessment(p.id, 'ST-02', 'implementado', { evidenceText: 'x' })]);
    const samm = indicatorsByFramework(s, p.id).find((r) => r.framework.id === 'samm').indicator;
    assert.equal(samm.counts.implementado, 1);
  });

  test('totais por framework não são somados (recortes se sobrepõem)', () => {
    const s = stateWith([p], all);
    const sum = indicatorsByFramework(s, p.id).reduce((n, r) => n + r.indicator.total, 0);
    assert.ok(sum > CONTROLS.length, 'a soma excede o catálogo, provando a sobreposição');
    assert.equal(FRAMEWORKS.length, 3);
  });

  test('indicador do projeto cobre todo o catálogo', () => {
    const s = stateWith([p], []);
    const r = projectIndicator(s, p.id);
    assert.equal(r.total, CONTROLS.length);
    assert.equal(r.counts.nao_avaliado, CONTROLS.length);
    assert.equal(r.percent, 0);
  });
});

describe('plano de melhorias', () => {
  const pa = project('p_00000000000000a1', 'Alfa');
  const pb = project('p_00000000000000b2', 'Beta');
  const s = stateWith([pb, pa], [
    assessment(pa.id, 'ST-03', 'nao_implementado', { priority: 'baixa' }),
    assessment(pa.id, 'ST-01', 'parcial', { priority: 'alta', action: 'Fazer X' }),
    assessment(pb.id, 'ST-05', 'nao_implementado', { priority: 'alta' }),
    assessment(pa.id, 'ST-07', 'implementado', { priority: 'alta' }),
    assessment(pa.id, 'ST-13', 'nao_aplicavel', { priority: 'alta' }),
  ]);

  test('inclui somente não implementados e parciais, ordenados por prioridade e critério estável', () => {
    const items = improvementItems(s, { kind: 'acao' });
    assert.deepEqual(items.map((i) => `${i.projectName}:${i.controlId}`), ['Alfa:ST-01', 'Beta:ST-05', 'Alfa:ST-03']);
    assert.equal(items[0].action, 'Fazer X');
    assert.equal(items[1].action, '');
  });

  test('avaliações pendentes listam somente não avaliados', () => {
    const items = improvementItems(s, { kind: 'pendente', projectId: pa.id });
    assert.ok(items.every((i) => i.status === 'nao_avaliado'));
    assert.equal(items.length, CONTROLS.length - 4);
  });

  test('filtros por projeto, área, situação e prioridade', () => {
    assert.equal(improvementItems(s, { projectId: pb.id }).length, 1);
    assert.equal(improvementItems(s, { areaId: 'planejamento' }).length, 1);
    assert.equal(improvementItems(s, { status: 'parcial' }).length, 1);
    assert.equal(improvementItems(s, { priority: 'baixa' }).length, 1);
    assert.equal(improvementItems(s, { priority: 'media' }).length, 0);
  });

  test('ordem é estável entre execuções', () => {
    const a = improvementItems(s).map((i) => i.controlId).join();
    const b = improvementItems({ ...s, assessments: [...s.assessments].reverse() }).map((i) => i.controlId).join();
    assert.equal(a, b);
  });

  test('pendências de prioridade alta e próximas ações', () => {
    const high = highPriorityPending(s, pa.id).map((x) => x.control.id);
    assert.ok(high.includes('ST-01'));
    assert.ok(!high.includes('ST-07'), 'implementado não é pendência');
    assert.ok(!high.includes('ST-13'), 'não aplicável não é pendência');
    assert.ok(!high.includes('ST-03'), 'prioridade baixa não entra');
    assert.deepEqual(nextActions(s, pa.id, 5).map((i) => i.controlId), ['ST-01', 'ST-03']);
  });
});
