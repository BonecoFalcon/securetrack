// Exportação, importação e validação estrutural de conjuntos de dados.
// O mesmo validador é usado para arquivos importados e para o conteúdo do
// localStorage, pois ambos são entradas não confiáveis.

import { CATALOG_VERSION, isKnownControlId } from './controls.js';
import {
  PROJECT_ID_PATTERN,
  isPlainObject,
  isIsoDate,
  validateProjectFields,
  validateAssessmentFields,
} from './validation.js';
import { MAX_PROJECTS } from './projects.js';

export const EXPORT_FORMAT = 'securetrack-export';
export const STORAGE_FORMAT = 'securetrack-storage';
export const FORMAT_VERSION = 1;
export const SUPPORTED_CATALOG_VERSIONS = Object.freeze([CATALOG_VERSION]);
export const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB
export const MAX_ASSESSMENTS = MAX_PROJECTS * 15;
const MAX_ERRORS = 20;

const PROJECT_KEYS = ['id', 'name', 'description', 'repositoryUrl', 'technologies', 'createdAt', 'updatedAt'];
const ASSESSMENT_KEYS = [
  'projectId', 'controlId', 'status', 'priority',
  'evidenceText', 'evidenceUrl', 'justification', 'action', 'updatedAt',
];
const EXPORT_KEYS = ['format', 'formatVersion', 'catalogVersion', 'exportedAt', 'projects', 'assessments'];
const STORAGE_KEYS = ['format', 'formatVersion', 'catalogVersion', 'savedAt', 'selectedProjectId', 'projects', 'assessments'];

export function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

function unknownKeys(obj, allowed) {
  return Object.keys(obj).filter((k) => !allowed.includes(k));
}

function nameKey(name) {
  return name.toLocaleLowerCase('pt-BR');
}

/**
 * Valida a estrutura completa e constrói um estado NOVO somente com campos
 * permitidos. Nunca devolve referências aos objetos recebidos.
 * @param {unknown} data objeto já interpretado de JSON
 * @param {'export'|'storage'} kind
 */
export function validateDataset(data, kind = 'export') {
  const errors = [];
  const add = (msg) => { if (errors.length < MAX_ERRORS) errors.push(msg); };
  const fail = () => ({ ok: false, errors });

  if (!isPlainObject(data)) {
    add('O conteúdo não é um objeto JSON do SecureTrack.');
    return fail();
  }
  const expectedFormat = kind === 'storage' ? STORAGE_FORMAT : EXPORT_FORMAT;
  if (data.format !== expectedFormat) {
    add(kind === 'storage'
      ? 'Os dados salvos não estão no formato esperado.'
      : 'O arquivo não é uma exportação do SecureTrack (campo "format" ausente ou diferente).');
    return fail();
  }
  if (data.formatVersion !== FORMAT_VERSION) {
    add(`Versão de formato incompatível: ${JSON.stringify(data.formatVersion) ?? 'ausente'}. ` +
      `Esta versão do SecureTrack aceita somente a versão ${FORMAT_VERSION}.`);
    return fail();
  }
  if (!SUPPORTED_CATALOG_VERSIONS.includes(data.catalogVersion)) {
    add(`Versão de catálogo incompatível: ${JSON.stringify(data.catalogVersion) ?? 'ausente'}. ` +
      `Versões aceitas: ${SUPPORTED_CATALOG_VERSIONS.join(', ')}.`);
    return fail();
  }
  const extra = unknownKeys(data, kind === 'storage' ? STORAGE_KEYS : EXPORT_KEYS);
  if (extra.length) add(`Campos não permitidos na raiz: ${extra.slice(0, 5).join(', ')}.`);

  const dateField = kind === 'storage' ? 'savedAt' : 'exportedAt';
  if (!isIsoDate(data[dateField])) add(`Campo "${dateField}" ausente ou com data inválida.`);

  if (!Array.isArray(data.projects)) {
    add('Campo "projects" deve ser uma lista.');
    return fail();
  }
  if (data.projects.length > MAX_PROJECTS) {
    add(`O arquivo tem ${data.projects.length} projetos; o máximo permitido é ${MAX_PROJECTS}.`);
    return fail();
  }
  if (!Array.isArray(data.assessments)) {
    add('Campo "assessments" deve ser uma lista.');
    return fail();
  }
  if (data.assessments.length > MAX_ASSESSMENTS) {
    add(`O arquivo tem ${data.assessments.length} avaliações; o máximo permitido é ${MAX_ASSESSMENTS}.`);
    return fail();
  }

  const projects = [];
  const ids = new Set();
  const names = new Set();
  data.projects.forEach((p, i) => {
    const where = `Projeto ${i + 1}`;
    if (!isPlainObject(p)) { add(`${where}: formato inválido.`); return; }
    const bad = unknownKeys(p, PROJECT_KEYS);
    if (bad.length) add(`${where}: campos não permitidos (${bad.slice(0, 5).join(', ')}).`);
    if (typeof p.id !== 'string' || !PROJECT_ID_PATTERN.test(p.id)) {
      add(`${where}: identificador inválido.`);
    } else if (ids.has(p.id)) {
      add(`${where}: identificador duplicado (${p.id}).`);
    } else {
      ids.add(p.id);
    }
    const v = validateProjectFields(p);
    if (!v.ok) {
      for (const msg of Object.values(v.errors)) add(`${where}: ${msg}`);
    } else {
      const key = nameKey(v.value.name);
      if (names.has(key)) add(`${where}: nome de projeto duplicado ("${v.value.name}").`);
      names.add(key);
    }
    if (!isIsoDate(p.createdAt)) add(`${where}: data de criação inválida.`);
    if (!isIsoDate(p.updatedAt)) add(`${where}: data de atualização inválida.`);
    if (isIsoDate(p.createdAt) && isIsoDate(p.updatedAt) && p.updatedAt < p.createdAt) {
      add(`${where}: data de atualização anterior à data de criação.`);
    }
    if (v.ok) {
      projects.push({ id: p.id, ...v.value, createdAt: p.createdAt, updatedAt: p.updatedAt });
    }
  });

  const assessments = [];
  const pairs = new Set();
  data.assessments.forEach((a, i) => {
    const where = `Avaliação ${i + 1}`;
    if (!isPlainObject(a)) { add(`${where}: formato inválido.`); return; }
    const bad = unknownKeys(a, ASSESSMENT_KEYS);
    if (bad.length) add(`${where}: campos não permitidos (${bad.slice(0, 5).join(', ')}).`);
    if (typeof a.projectId !== 'string' || !ids.has(a.projectId)) {
      add(`${where}: referência a projeto inexistente.`);
    }
    if (!isKnownControlId(a.controlId)) {
      add(`${where}: controle desconhecido (${typeof a.controlId === 'string' ? a.controlId.slice(0, 20) : 'inválido'}).`);
    }
    const pair = `${a.projectId}|${a.controlId}`;
    if (pairs.has(pair)) add(`${where}: avaliação duplicada para o mesmo projeto e controle.`);
    pairs.add(pair);
    const v = validateAssessmentFields(a);
    if (!v.ok) for (const msg of Object.values(v.errors)) add(`${where}: ${msg}`);
    if (!isIsoDate(a.updatedAt)) add(`${where}: data de atualização inválida.`);
    if (v.ok) {
      assessments.push({ projectId: a.projectId, controlId: a.controlId, ...v.value, updatedAt: a.updatedAt });
    }
  });

  let selectedProjectId = null;
  if (kind === 'storage') {
    if (data.selectedProjectId !== null && !ids.has(data.selectedProjectId)) {
      add('Projeto selecionado não existe nos dados salvos.');
    } else {
      selectedProjectId = data.selectedProjectId;
    }
  } else {
    selectedProjectId = projects.length ? projects[0].id : null;
  }

  if (errors.length) return fail();
  return {
    ok: true,
    state: { schemaVersion: 1, catalogVersion: CATALOG_VERSION, projects, assessments, selectedProjectId },
  };
}

/**
 * Interpreta um texto de importação. Não altera nenhum estado: apenas
 * devolve o novo estado candidato e um resumo para confirmação.
 */
export function parseImport(text) {
  if (typeof text !== 'string') return { ok: false, errors: ['Conteúdo de arquivo inválido.'] };
  if (byteLength(text) > MAX_IMPORT_BYTES) {
    return { ok: false, errors: ['O arquivo excede o limite de 1 MB.'] };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['O arquivo não contém JSON válido.'] };
  }
  const result = validateDataset(data, 'export');
  if (!result.ok) return result;
  return {
    ok: true,
    state: result.state,
    summary: {
      exportedAt: data.exportedAt,
      catalogVersion: data.catalogVersion,
      projectCount: result.state.projects.length,
      assessmentCount: result.state.assessments.length,
      projectNames: result.state.projects.map((p) => p.name),
    },
  };
}

function cleanProject(p) {
  return {
    id: p.id, name: p.name, description: p.description, repositoryUrl: p.repositoryUrl,
    technologies: p.technologies, createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
}

function cleanAssessment(a) {
  return {
    projectId: a.projectId, controlId: a.controlId, status: a.status, priority: a.priority,
    evidenceText: a.evidenceText, evidenceUrl: a.evidenceUrl, justification: a.justification,
    action: a.action, updatedAt: a.updatedAt,
  };
}

/** Monta o objeto de exportação somente com dados do usuário (sem o catálogo). */
export function buildExport(state, now = new Date().toISOString()) {
  return {
    format: EXPORT_FORMAT,
    formatVersion: FORMAT_VERSION,
    catalogVersion: CATALOG_VERSION,
    exportedAt: now,
    projects: state.projects.map(cleanProject),
    assessments: state.assessments.map(cleanAssessment),
  };
}

export function serializeExport(state, now) {
  return JSON.stringify(buildExport(state, now), null, 2);
}

/** Monta o registro persistido no localStorage. */
export function buildStorageRecord(state, now = new Date().toISOString()) {
  return {
    format: STORAGE_FORMAT,
    formatVersion: FORMAT_VERSION,
    catalogVersion: CATALOG_VERSION,
    savedAt: now,
    selectedProjectId: state.selectedProjectId,
    projects: state.projects.map(cleanProject),
    assessments: state.assessments.map(cleanAssessment),
  };
}

export function exportFileName(now = new Date()) {
  const d = now.toISOString().slice(0, 10);
  return `securetrack-backup-${d}.json`;
}
