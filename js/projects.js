// Operações puras sobre projetos. Nenhuma função altera o estado recebido:
// todas retornam um novo estado, que só é adotado após persistência bem-sucedida.

import { validateProjectFields, PROJECT_ID_PATTERN } from './validation.js';

export const MAX_PROJECTS = 50;

export function emptyState(catalogVersion) {
  return { schemaVersion: 1, catalogVersion, projects: [], assessments: [], selectedProjectId: null };
}

/** Gera um identificador interno aleatório no formato p_ + 16 hexadecimais. */
export function generateProjectId(randomSource = globalThis.crypto) {
  const bytes = new Uint8Array(8);
  randomSource.getRandomValues(bytes);
  return 'p_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function nowIso() {
  return new Date().toISOString();
}

function nameTaken(state, name, exceptId = null) {
  const key = name.toLocaleLowerCase('pt-BR');
  return state.projects.some((p) => p.id !== exceptId && p.name.toLocaleLowerCase('pt-BR') === key);
}

const DUPLICATE_NAME = 'Já existe um projeto com este nome.';

function uniqueId(state, newId) {
  for (let i = 0; i < 5; i++) {
    const id = newId();
    if (PROJECT_ID_PATTERN.test(id) && !state.projects.some((p) => p.id === id)) return id;
  }
  throw new Error('Não foi possível gerar um identificador único.');
}

export function createProject(state, input, { now = nowIso, newId = generateProjectId } = {}) {
  if (state.projects.length >= MAX_PROJECTS) {
    return { ok: false, errors: { form: `Limite de ${MAX_PROJECTS} projetos atingido.` } };
  }
  const v = validateProjectFields(input);
  if (!v.ok) return v;
  if (nameTaken(state, v.value.name)) return { ok: false, errors: { name: DUPLICATE_NAME } };
  const ts = now();
  const project = { id: uniqueId(state, newId), ...v.value, createdAt: ts, updatedAt: ts };
  return {
    ok: true,
    project,
    state: { ...state, projects: [...state.projects, project], selectedProjectId: project.id },
  };
}

export function updateProject(state, id, input, { now = nowIso } = {}) {
  const current = state.projects.find((p) => p.id === id);
  if (!current) return { ok: false, errors: { form: 'Projeto não encontrado.' } };
  const v = validateProjectFields(input);
  if (!v.ok) return v;
  if (nameTaken(state, v.value.name, id)) return { ok: false, errors: { name: DUPLICATE_NAME } };
  let ts = now();
  if (ts < current.createdAt) ts = current.createdAt;
  const project = { ...current, ...v.value, updatedAt: ts };
  return {
    ok: true,
    project,
    state: { ...state, projects: state.projects.map((p) => (p.id === id ? project : p)) },
  };
}

/** Exclui o projeto e todas as suas avaliações. */
export function deleteProject(state, id) {
  if (!state.projects.some((p) => p.id === id)) {
    return { ok: false, errors: { form: 'Projeto não encontrado.' } };
  }
  const projects = state.projects.filter((p) => p.id !== id);
  const assessments = state.assessments.filter((a) => a.projectId !== id);
  let selectedProjectId = state.selectedProjectId;
  if (selectedProjectId === id) selectedProjectId = projects.length ? projects[0].id : null;
  return { ok: true, state: { ...state, projects, assessments, selectedProjectId } };
}

export function selectProject(state, id) {
  if (id !== null && !state.projects.some((p) => p.id === id)) return state;
  return { ...state, selectedProjectId: id };
}

export function getProject(state, id) {
  return state.projects.find((p) => p.id === id) || null;
}

export function countAssessments(state, projectId) {
  return state.assessments.filter((a) => a.projectId === projectId).length;
}
