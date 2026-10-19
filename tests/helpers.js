// Utilitários compartilhados pelos testes (não é um arquivo de teste).
import { CATALOG_VERSION } from '../js/controls.js';
import { emptyState } from '../js/projects.js';

export const T0 = '2026-10-01T12:00:00.000Z';
export const T1 = '2026-10-02T12:00:00.000Z';

export function fixedNow(ts = T1) {
  return () => ts;
}

let counter = 0;
export function seqId() {
  counter += 1;
  return 'p_' + counter.toString(16).padStart(16, '0');
}

export function baseState() {
  return emptyState(CATALOG_VERSION);
}

export function project(id, name, extra = {}) {
  return { id, name, description: '', repositoryUrl: '', technologies: '', createdAt: T0, updatedAt: T0, ...extra };
}

export function assessment(projectId, controlId, status, extra = {}) {
  return {
    projectId, controlId, status, priority: 'media',
    evidenceText: '', evidenceUrl: '', justification: status === 'nao_aplicavel' ? 'Não se aplica.' : '',
    action: '', updatedAt: T1, ...extra,
  };
}

export function stateWith(projects, assessments) {
  return { ...baseState(), projects, assessments, selectedProjectId: projects[0]?.id ?? null };
}

export function exportDoc(projects = [], assessments = [], overrides = {}) {
  return {
    format: 'securetrack-export',
    formatVersion: 1,
    catalogVersion: CATALOG_VERSION,
    exportedAt: T1,
    projects,
    assessments,
    ...overrides,
  };
}
