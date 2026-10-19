// Validação centralizada. Tudo o que vem de formulários, arquivos JSON ou
// localStorage é tratado como entrada não confiável e passa por aqui.

export const LIMITS = Object.freeze({
  projectName: 100,
  projectDescription: 1000,
  url: 2048,
  technologies: 200,
  evidenceText: 2000,
  justification: 1000,
  action: 1000,
});

export const STATUSES = Object.freeze([
  'nao_avaliado',
  'nao_implementado',
  'parcial',
  'implementado',
  'nao_aplicavel',
]);

export const STATUS_LABELS = Object.freeze({
  nao_avaliado: 'Não avaliado',
  nao_implementado: 'Não implementado',
  parcial: 'Parcialmente implementado',
  implementado: 'Implementado',
  nao_aplicavel: 'Não aplicável',
});

export const PRIORITIES = Object.freeze(['alta', 'media', 'baixa']);

export const PRIORITY_LABELS = Object.freeze({ alta: 'Alta', media: 'Média', baixa: 'Baixa' });

export const PROJECT_ID_PATTERN = /^p_[a-f0-9]{16}$/;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export function isPlainObject(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * Comprimento usado nos limites. Usa unidades UTF-16 (String.length), a mesma
 * contagem do atributo HTML maxlength, para que formulário e importação concordem.
 */
export function charLength(s) {
  return s.length;
}

/**
 * Normaliza um campo de texto: exige string, remove espaços nas extremidades
 * e verifica o limite. Retorna { ok, value, error }.
 */
export function checkText(raw, { label, max, required = false }) {
  if (raw === undefined || raw === null) raw = '';
  if (typeof raw !== 'string') return { ok: false, error: `${label}: valor inválido.` };
  const value = raw.trim();
  if (required && value === '') return { ok: false, error: `${label} é obrigatório.` };
  if (charLength(value) > max) {
    return { ok: false, error: `${label} deve ter no máximo ${max.toLocaleString('pt-BR')} caracteres.` };
  }
  return { ok: true, value };
}

/**
 * Valida URL opcional. Campo vazio é permitido. Somente https: é aceito.
 * Rejeita javascript:, data:, file:, http: e qualquer outro esquema.
 */
export function checkHttpsUrl(raw, { label }) {
  const base = checkText(raw, { label, max: LIMITS.url });
  if (!base.ok) return base;
  const value = base.value;
  if (value === '') return { ok: true, value: '' };
  if (/[\u0000-\u001F\u007F\s]/.test(value)) {
    return { ok: false, error: `${label}: o endereço não pode conter espaços ou caracteres de controle.` };
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: `${label}: informe um endereço completo, começando com https://.` };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: `${label}: somente endereços https:// são aceitos.` };
  }
  if (!parsed.hostname) {
    return { ok: false, error: `${label}: endereço sem domínio.` };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: `${label}: não inclua usuário ou senha no endereço.` };
  }
  return { ok: true, value };
}

export function isIsoDate(v) {
  if (typeof v !== 'string' || !ISO_DATE_PATTERN.test(v)) return false;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return false;
  // Rejeita datas "roladas" como 2026-02-31.
  return new Date(t).toISOString().slice(0, 19) === v.slice(0, 19);
}

export function isStatus(v) {
  return typeof v === 'string' && STATUSES.includes(v);
}

export function isPriority(v) {
  return typeof v === 'string' && PRIORITIES.includes(v);
}

/**
 * Valida os campos editáveis de um projeto (formulário ou importação).
 * Constrói um objeto novo somente com campos permitidos.
 */
export function validateProjectFields(input) {
  const errors = {};
  const src = isPlainObject(input) ? input : {};
  const name = checkText(src.name, { label: 'Nome', max: LIMITS.projectName, required: true });
  const description = checkText(src.description, { label: 'Descrição', max: LIMITS.projectDescription });
  const repositoryUrl = checkHttpsUrl(src.repositoryUrl, { label: 'URL do repositório' });
  const technologies = checkText(src.technologies, { label: 'Tecnologias', max: LIMITS.technologies });
  if (!name.ok) errors.name = name.error;
  if (!description.ok) errors.description = description.error;
  if (!repositoryUrl.ok) errors.repositoryUrl = repositoryUrl.error;
  if (!technologies.ok) errors.technologies = technologies.error;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: name.value,
      description: description.value,
      repositoryUrl: repositoryUrl.value,
      technologies: technologies.value,
    },
  };
}

/**
 * Valida os campos editáveis de uma avaliação.
 * Regra: "não aplicável" exige justificativa não vazia.
 */
export function validateAssessmentFields(input) {
  const errors = {};
  const src = isPlainObject(input) ? input : {};
  if (!isStatus(src.status)) errors.status = 'Situação inválida.';
  if (!isPriority(src.priority)) errors.priority = 'Prioridade inválida.';
  const evidenceText = checkText(src.evidenceText, { label: 'Descrição da evidência', max: LIMITS.evidenceText });
  const evidenceUrl = checkHttpsUrl(src.evidenceUrl, { label: 'Link da evidência' });
  const justification = checkText(src.justification, { label: 'Justificativa', max: LIMITS.justification });
  const action = checkText(src.action, { label: 'Ação de melhoria', max: LIMITS.action });
  if (!evidenceText.ok) errors.evidenceText = evidenceText.error;
  if (!evidenceUrl.ok) errors.evidenceUrl = evidenceUrl.error;
  if (!justification.ok) errors.justification = justification.error;
  if (!action.ok) errors.action = action.error;
  if (src.status === 'nao_aplicavel' && justification.ok && justification.value === '') {
    errors.justification = 'Informe a justificativa para marcar o controle como não aplicável.';
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      status: src.status,
      priority: src.priority,
      evidenceText: evidenceText.value,
      evidenceUrl: evidenceUrl.value,
      justification: justification.value,
      action: action.value,
    },
  };
}

/** Indica se a avaliação foi declarada implementada sem descrição nem link de evidência. */
export function hasPendingEvidence(a) {
  return !!a && a.status === 'implementado' && a.evidenceText === '' && a.evidenceUrl === '';
}
