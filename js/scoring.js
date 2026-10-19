// Cálculo do "Indicador de implementação — autodeclaração".
//
// Implementação (%) = (implementados + 0,5 × parciais) ÷ aplicáveis × 100
//   - Implementado: peso 1 (mesmo sem evidência: é autodeclaração).
//   - Parcialmente implementado: peso 0,5.
//   - Não implementado e Não avaliado: peso 0, permanecem no denominador.
//   - Não aplicável: excluído do denominador.
// O valor bruto nunca é arredondado; apenas a exibição usa uma casa decimal.

import { AREAS, CONTROLS, FRAMEWORKS, controlIdsForArea, controlIdsForFramework, getControl } from './controls.js';
import { assessmentsByControl } from './assessments.js';
import { STATUSES, PRIORITIES, hasPendingEvidence } from './validation.js';

export const WEIGHTS = Object.freeze({
  implementado: 1,
  parcial: 0.5,
  nao_implementado: 0,
  nao_avaliado: 0,
});

/**
 * Calcula o indicador para um conjunto de controles.
 * @param {string[]} controlIds IDs dos controles do grupo (duplicados são ignorados).
 * @param {Map<string, {status:string, evidenceText:string, evidenceUrl:string}>} byControl
 */
export function computeIndicator(controlIds, byControl) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  let pendingEvidence = 0;
  const unique = [...new Set(controlIds)];
  for (const id of unique) {
    const a = byControl.get(id);
    const status = a && STATUSES.includes(a.status) ? a.status : 'nao_avaliado';
    counts[status] += 1;
    if (hasPendingEvidence(a)) pendingEvidence += 1;
  }
  const total = unique.length;
  const applicable = total - counts.nao_aplicavel;
  const numerator = counts.implementado * WEIGHTS.implementado + counts.parcial * WEIGHTS.parcial;
  const percent = applicable > 0 ? (numerator / applicable) * 100 : null;
  return { total, counts, applicable, numerator, percent, pendingEvidence };
}

/** Formata para exibição com uma casa decimal; null vira "Sem base para cálculo". */
export function formatPercent(percent) {
  if (percent === null || typeof percent !== 'number' || !Number.isFinite(percent)) {
    return 'Sem base para cálculo';
  }
  return percent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

export function formatNumber(n) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** Texto que explica o cálculo, para leitura humana e por leitores de tela. */
export function explainIndicator(ind) {
  if (ind.percent === null) {
    return `Nenhum controle aplicável neste recorte (${ind.counts.nao_aplicavel} não aplicável(is)). Sem base para cálculo.`;
  }
  return (
    `(${ind.counts.implementado} implementado(s) + 0,5 × ${ind.counts.parcial} parcial(is)) ` +
    `÷ ${ind.applicable} aplicável(is) × 100 = ${formatNumber(ind.numerator)} ÷ ${ind.applicable} × 100 = ` +
    formatPercent(ind.percent)
  );
}

export function projectIndicator(state, projectId, controls = CONTROLS) {
  const byControl = assessmentsByControl(state, projectId, controls);
  return computeIndicator(controls.map((c) => c.id), byControl);
}

export function indicatorsByArea(state, projectId, controls = CONTROLS) {
  const byControl = assessmentsByControl(state, projectId, controls);
  return AREAS.map((area) => ({
    area,
    indicator: computeIndicator(controlIdsForArea(area.id, controls), byControl),
  }));
}

export function indicatorsByFramework(state, projectId, controls = CONTROLS) {
  const byControl = assessmentsByControl(state, projectId, controls);
  return FRAMEWORKS.map((framework) => ({
    framework,
    indicator: computeIndicator(controlIdsForFramework(framework.id, controls), byControl),
  }));
}

const PRIORITY_RANK = Object.fromEntries(PRIORITIES.map((p, i) => [p, i])); // alta=0
const AREA_RANK = Object.fromEntries(AREAS.map((a, i) => [a.id, i]));

/**
 * Ordena por prioridade (alta → baixa) e depois por critério estável:
 * nome do projeto, ordem da área, ID do controle.
 */
export function compareItems(a, b) {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    a.projectName.localeCompare(b.projectName, 'pt-BR') ||
    a.projectId.localeCompare(b.projectId) ||
    (AREA_RANK[a.areaId] ?? 99) - (AREA_RANK[b.areaId] ?? 99) ||
    a.controlId.localeCompare(b.controlId)
  );
}

/**
 * Itens para o plano de melhorias.
 * kind = 'acao' → não implementados e parcialmente implementados.
 * kind = 'pendente' → não avaliados ("Avaliações pendentes").
 */
export function improvementItems(state, { kind = 'acao', projectId = '', areaId = '', status = '', priority = '' } = {}) {
  const wanted = kind === 'pendente' ? ['nao_avaliado'] : ['nao_implementado', 'parcial'];
  const items = [];
  for (const project of state.projects) {
    if (projectId && project.id !== projectId) continue;
    const byControl = assessmentsByControl(state, project.id);
    for (const control of CONTROLS) {
      if (areaId && control.area !== areaId) continue;
      const a = byControl.get(control.id);
      if (!wanted.includes(a.status)) continue;
      if (status && a.status !== status) continue;
      if (priority && a.priority !== priority) continue;
      items.push({
        projectId: project.id,
        projectName: project.name,
        controlId: control.id,
        controlTitle: control.title,
        areaId: control.area,
        status: a.status,
        priority: a.priority,
        action: a.action,
      });
    }
  }
  return items.sort(compareItems);
}

/** Pendências de prioridade alta de um projeto: não implementado, parcial ou não avaliado. */
export function highPriorityPending(state, projectId) {
  const byControl = assessmentsByControl(state, projectId);
  return CONTROLS.filter((c) => {
    const a = byControl.get(c.id);
    return a.priority === 'alta' && ['nao_implementado', 'parcial', 'nao_avaliado'].includes(a.status);
  }).map((c) => ({ control: c, assessment: byControl.get(c.id) }));
}

/** Próximas ações de um projeto: itens do plano, ordenados, limitados a `limit`. */
export function nextActions(state, projectId, limit = 5) {
  return improvementItems(state, { kind: 'acao', projectId }).slice(0, limit);
}

export function pendingEvidenceControls(state, projectId) {
  const byControl = assessmentsByControl(state, projectId);
  return CONTROLS.filter((c) => hasPendingEvidence(byControl.get(c.id)));
}

export { getControl };
