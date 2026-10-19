// Persistência em localStorage com backend injetável (permite testes sem navegador).
// Regras:
//  - Conteúdo salvo é validado antes do uso (entrada não confiável).
//  - Conteúdo corrompido nunca é apagado silenciosamente.
//  - save() só informa sucesso depois de gravar e conferir a gravação.

import { validateDataset, buildStorageRecord } from './transfer.js';

export const STORAGE_KEY = 'securetrack:v1';

function isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
}

/**
 * @param {() => {getItem(k:string):string|null, setItem(k:string,v:string):void, removeItem(k:string):void}} getBackend
 *        função que devolve o backend; pode lançar exceção se indisponível.
 */
export function createStorage(getBackend, key = STORAGE_KEY) {
  function backend() {
    const b = getBackend();
    if (!b || typeof b.getItem !== 'function' || typeof b.setItem !== 'function') {
      throw new Error('Armazenamento indisponível.');
    }
    return b;
  }

  /**
   * @returns {{status:'ok', state:object} | {status:'empty'} |
   *           {status:'corrupt', raw:string, errors:string[]} | {status:'unavailable', message:string}}
   */
  function load() {
    let raw;
    try {
      raw = backend().getItem(key);
    } catch {
      return { status: 'unavailable', message: 'O armazenamento local do navegador não está disponível.' };
    }
    if (raw === null || raw === undefined) return { status: 'empty' };
    if (typeof raw !== 'string') {
      return { status: 'corrupt', raw: String(raw), errors: ['Conteúdo salvo em formato inesperado.'] };
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { status: 'corrupt', raw, errors: ['O conteúdo salvo não é JSON válido.'] };
    }
    const result = validateDataset(data, 'storage');
    if (!result.ok) return { status: 'corrupt', raw, errors: result.errors };
    return { status: 'ok', state: result.state };
  }

  /** @returns {{ok:true} | {ok:false, reason:'quota'|'unavailable'|'verify', message:string}} */
  function save(state, now) {
    let text;
    try {
      text = JSON.stringify(buildStorageRecord(state, now));
    } catch {
      return { ok: false, reason: 'verify', message: 'Não foi possível preparar os dados para salvar.' };
    }
    let b;
    try {
      b = backend();
    } catch {
      return { ok: false, reason: 'unavailable', message: 'O armazenamento local do navegador não está disponível. Nada foi salvo.' };
    }
    try {
      b.setItem(key, text);
    } catch (e) {
      if (isQuotaError(e)) {
        return { ok: false, reason: 'quota', message: 'Sem espaço no armazenamento do navegador. Nada foi salvo. Exporte um backup e reduza os dados.' };
      }
      return { ok: false, reason: 'unavailable', message: 'Falha ao gravar no armazenamento do navegador. Nada foi salvo.' };
    }
    try {
      if (b.getItem(key) !== text) {
        return { ok: false, reason: 'verify', message: 'A gravação não pôde ser confirmada. Considere os dados como não salvos.' };
      }
    } catch {
      return { ok: false, reason: 'verify', message: 'A gravação não pôde ser confirmada. Considere os dados como não salvos.' };
    }
    return { ok: true };
  }

  /** Remove os dados salvos. Use somente após confirmação explícita do usuário. */
  function reset() {
    try {
      backend().removeItem(key);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Não foi possível limpar o armazenamento.' };
    }
  }

  return { load, save, reset, key };
}

/** Backend em memória para testes e simulações. */
export function createMemoryBackend(initial = {}, { failOnSet = null } = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      if (failOnSet) throw failOnSet;
      data.set(k, String(v));
    },
    removeItem: (k) => { data.delete(k); },
    _data: data,
  };
}

/**
 * Contêiner de estado com confirmação transacional: o novo estado só passa a
 * valer depois que a persistência for concluída com sucesso. Em caso de falha,
 * o estado anterior é preservado (em memória e no armazenamento).
 */
export function createStateContainer(storage, initialState) {
  let state = initialState;
  return {
    get: () => state,
    /** @returns {{ok:true} | {ok:false, message:string, reason:string}} */
    commit(nextState, now) {
      const result = storage.save(nextState, now);
      if (result.ok) state = nextState;
      return result;
    },
    /** Substitui sem persistir (usado apenas na inicialização). */
    replaceInMemory(nextState) {
      state = nextState;
    },
  };
}
