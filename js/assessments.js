// Operações puras sobre avaliações. Cada avaliação é identificada pelo par
// (projectId, controlId). Controles sem registro são tratados como "não avaliado".

import { CONTROLS, getControl } from './controls.js';
import { validateAssessmentFields, hasPendingEvidence } from './validation.js';
import { nowIso } from './projects.js';

export function defaultAssessment(projectId, control) {
  return {
    projectId,
    controlId: control.id,
    status: 'nao_avaliado',
    priority: control.defaultPriority,
    evidenceText: '',
    evidenceUrl: '',
    justification: '',
    action: '',
    updatedAt: null,
  };
}

export function getAssessment(state, projectId, controlId) {
  const found = state.assessments.find((a) => a.projectId === projectId && a.controlId === controlId);
  if (found) return found;
  const control = getControl(controlId);
  return control ? defaultAssessment(projectId, control) : null;
}

/** Mapa controlId -> avaliação (efetiva) para um projeto, cobrindo todo o catálogo. */
export function assessmentsByControl(state, projectId, controls = CONTROLS) {
  const map = new Map();
  for (const c of controls) map.set(c.id, getAssessment(state, projectId, c.id));
  return map;
}

/**
 * Salva a avaliação de UM controle, preservando as demais.
 * Retorna novo estado; não altera o recebido.
 */
export function saveAssessment(state, projectId, controlId, input, { now = nowIso } = {}) {
  if (!state.projects.some((p) => p.id === projectId)) {
    return { ok: false, errors: { form: 'Projeto não encontrado.' } };
  }
  if (!getControl(controlId)) return { ok: false, errors: { form: 'Controle desconhecido.' } };
  const v = validateAssessmentFields(input);
  if (!v.ok) return v;
  const assessment = { projectId, controlId, ...v.value, updatedAt: now() };
  const others = state.assessments.filter((a) => !(a.projectId === projectId && a.controlId === controlId));
  return { ok: true, assessment, state: { ...state, assessments: [...others, assessment] } };
}

export { hasPendingEvidence };
