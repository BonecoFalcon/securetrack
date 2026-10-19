import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseImport, serializeExport, buildExport, validateDataset, MAX_IMPORT_BYTES } from '../js/transfer.js';
import { CONTROLS, CATALOG_VERSION } from '../js/controls.js';
import { project, assessment, stateWith, exportDoc } from './helpers.js';

const P1 = project('p_0000000000000001', 'Projeto 1');
const P2 = project('p_0000000000000002', 'Projeto 2', { repositoryUrl: 'https://example.org/repo' });

function errorsOf(doc) {
  const r = parseImport(JSON.stringify(doc));
  assert.equal(r.ok, false, 'deveria rejeitar');
  return r.errors.join(' | ');
}

describe('exportação', () => {
  test('contém versão do formato, versão do catálogo, data e dados, sem o catálogo', () => {
    const s = stateWith([P1], [assessment(P1.id, 'ST-01', 'implementado')]);
    const doc = buildExport(s, '2026-10-18T10:00:00.000Z');
    assert.equal(doc.formatVersion, 1);
    assert.equal(doc.catalogVersion, CATALOG_VERSION);
    assert.equal(doc.exportedAt, '2026-10-18T10:00:00.000Z');
    assert.deepEqual(Object.keys(doc).sort(), ['assessments', 'catalogVersion', 'exportedAt', 'format', 'formatVersion', 'projects']);
    const text = JSON.stringify(doc);
    assert.ok(!text.includes('relationships'));
    assert.ok(!text.includes(CONTROLS[0].guidance));
  });

  test('ciclo exportação → importação preserva os dados', () => {
    const s = stateWith([P1, P2], [
      assessment(P1.id, 'ST-01', 'implementado', { evidenceText: '<img src=x onerror=alert(1)>' }),
      assessment(P1.id, 'ST-07', 'nao_aplicavel', { justification: 'Sem dependências' }),
      assessment(P2.id, 'ST-10', 'parcial', { action: 'Ampliar testes', priority: 'alta' }),
    ]);
    const r = parseImport(serializeExport(s, '2026-10-18T10:00:00.000Z'));
    assert.equal(r.ok, true);
    assert.deepEqual(r.state.projects, s.projects);
    assert.deepEqual(r.state.assessments, s.assessments);
    assert.equal(r.summary.projectCount, 2);
    assert.equal(r.summary.assessmentCount, 3);
  });

  test('demonstração GuitarScore é válida e identificada como simulada', () => {
    const text = readFileSync(new URL('../data/demo.json', import.meta.url), 'utf8');
    const r = parseImport(text);
    assert.equal(r.ok, true, r.errors?.join('; '));
    assert.equal(r.state.projects.length, 1);
    const p = r.state.projects[0];
    assert.equal(p.name, 'GuitarScore — demonstração');
    assert.match(p.description, /simulad/i);
    assert.equal(p.repositoryUrl, '');
    assert.ok(r.state.assessments.every((a) => a.evidenceUrl === ''), 'sem links inventados');
    assert.ok(r.state.assessments.filter((a) => a.evidenceText).every((a) => a.evidenceText.startsWith('[Simulado]')));
  });
});

describe('importação inválida', () => {
  test('JSON inválido', () => {
    const r = parseImport('{ isso não é json');
    assert.equal(r.ok, false);
    assert.match(r.errors[0], /JSON válido/);
  });

  test('raiz não objeto e formato errado', () => {
    assert.equal(parseImport('[]').ok, false);
    assert.equal(parseImport('null').ok, false);
    assert.match(errorsOf({ ...exportDoc(), format: 'outro' }), /não é uma exportação/);
  });

  test('versão de formato incompatível', () => {
    assert.match(errorsOf(exportDoc([], [], { formatVersion: 2 })), /Versão de formato incompatível/);
    assert.match(errorsOf(exportDoc([], [], { formatVersion: '1' })), /Versão de formato incompatível/);
  });

  test('versão de catálogo incompatível', () => {
    assert.match(errorsOf(exportDoc([], [], { catalogVersion: '9.0.0' })), /catálogo incompatível/);
  });

  test('IDs de projeto duplicados', () => {
    assert.match(errorsOf(exportDoc([P1, { ...P1, name: 'Outro' }])), /identificador duplicado/);
  });

  test('nomes de projeto duplicados', () => {
    assert.match(errorsOf(exportDoc([P1, { ...P2, name: 'projeto 1' }])), /nome de projeto duplicado/);
  });

  test('identificador fora do padrão gerado pela aplicação', () => {
    assert.match(errorsOf(exportDoc([{ ...P1, id: '../../x' }])), /identificador inválido/);
  });

  test('controle desconhecido', () => {
    assert.match(errorsOf(exportDoc([P1], [assessment(P1.id, 'ST-99', 'implementado')])), /controle desconhecido/);
  });

  test('avaliação duplicada', () => {
    const a = assessment(P1.id, 'ST-01', 'implementado');
    assert.match(errorsOf(exportDoc([P1], [a, { ...a }])), /avaliação duplicada/);
  });

  test('referência a projeto inexistente', () => {
    assert.match(errorsOf(exportDoc([P1], [assessment('p_00000000000000ff', 'ST-01', 'implementado')])), /projeto inexistente/);
  });

  test('"não aplicável" sem justificativa', () => {
    const a = assessment(P1.id, 'ST-07', 'nao_aplicavel', { justification: '' });
    assert.match(errorsOf(exportDoc([P1], [a])), /justificativa/);
  });

  test('tipos, situações, prioridades, datas e URLs inválidos', () => {
    assert.match(errorsOf(exportDoc([{ ...P1, name: 42 }])), /Nome/);
    assert.match(errorsOf(exportDoc([P1], [assessment(P1.id, 'ST-01', 'feito')])), /Situação inválida/);
    assert.match(errorsOf(exportDoc([P1], [assessment(P1.id, 'ST-01', 'parcial', { priority: 'urgente' })])), /Prioridade inválida/);
    assert.match(errorsOf(exportDoc([{ ...P1, createdAt: 'ontem' }])), /data de criação/);
    assert.match(errorsOf(exportDoc([{ ...P1, updatedAt: '2020-01-01T00:00:00.000Z' }])), /anterior à data de criação/);
    assert.match(errorsOf(exportDoc([P1], [assessment(P1.id, 'ST-01', 'parcial', { updatedAt: null })])), /data de atualização inválida/);
    assert.match(errorsOf(exportDoc([{ ...P1, repositoryUrl: 'javascript:alert(1)' }])), /https/);
    assert.match(errorsOf(exportDoc([], [], { exportedAt: '2026-99-99' })), /exportedAt/);
  });

  test('campos não permitidos e chaves de protótipo são rejeitados', () => {
    assert.match(errorsOf(exportDoc([{ ...P1, admin: true }])), /campos não permitidos/);
    const text = JSON.stringify(exportDoc([P1])).replace('"name":', '"__proto__":{"x":1},"name":');
    const r = parseImport(text);
    assert.equal(r.ok, false);
    assert.match(r.errors.join(' '), /__proto__/);
    assert.equal({}.x, undefined, 'sem poluição de protótipo');
    assert.match(errorsOf(exportDoc([], [], { controls: [] })), /Campos não permitidos na raiz/);
  });

  test('limite de 50 projetos', () => {
    const many = Array.from({ length: 51 }, (_, i) => project('p_' + i.toString(16).padStart(16, '0'), `P${i}`));
    assert.match(errorsOf(exportDoc(many)), /máximo permitido é 50/);
    const fifty = many.slice(0, 50);
    assert.equal(parseImport(JSON.stringify(exportDoc(fifty))).ok, true);
  });

  test('limite de 1 MB', () => {
    const big = JSON.stringify(exportDoc([{ ...P1, description: 'x' }])) + ' '.repeat(MAX_IMPORT_BYTES);
    const r = parseImport(big);
    assert.equal(r.ok, false);
    assert.match(r.errors[0], /1 MB/);
  });

  test('validação não devolve referências aos objetos recebidos', () => {
    const input = exportDoc([P1], [assessment(P1.id, 'ST-01', 'parcial')]);
    const r = validateDataset(input, 'export');
    assert.equal(r.ok, true);
    assert.notEqual(r.state.projects[0], input.projects[0]);
    input.projects[0].name = 'alterado';
    assert.equal(r.state.projects[0].name, 'Projeto 1');
  });
});
