import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, createMemoryBackend, createStateContainer, STORAGE_KEY } from '../js/storage.js';
import { parseImport, buildStorageRecord } from '../js/transfer.js';
import { createProject } from '../js/projects.js';
import { saveAssessment } from '../js/assessments.js';
import { project, assessment, stateWith, baseState, exportDoc, fixedNow, seqId } from './helpers.js';

const P1 = project('p_0000000000000001', 'Projeto 1');

function quotaError() {
  const e = new Error('cheio');
  e.name = 'QuotaExceededError';
  return e;
}

describe('carregamento', () => {
  test('vazio quando não há dados', () => {
    assert.deepEqual(createStorage(() => createMemoryBackend()).load(), { status: 'empty' });
  });

  test('armazenamento indisponível (acesso lança exceção)', () => {
    const st = createStorage(() => { throw new Error('SecurityError'); });
    assert.equal(st.load().status, 'unavailable');
    const r = st.save(baseState());
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'unavailable');
  });

  test('conteúdo corrompido não é apagado e o bruto é devolvido para recuperação', () => {
    const backend = createMemoryBackend({ [STORAGE_KEY]: '{corrompido<img src=x onerror=alert(1)>' });
    const r = createStorage(() => backend).load();
    assert.equal(r.status, 'corrupt');
    assert.equal(r.raw, '{corrompido<img src=x onerror=alert(1)>');
    assert.equal(backend.getItem(STORAGE_KEY), '{corrompido<img src=x onerror=alert(1)>', 'nada apagado');
  });

  test('JSON válido mas estrutura inválida é tratado como corrompido', () => {
    const rec = buildStorageRecord(stateWith([P1], [assessment(P1.id, 'ST-99', 'implementado')]));
    const backend = createMemoryBackend({ [STORAGE_KEY]: JSON.stringify(rec) });
    const r = createStorage(() => backend).load();
    assert.equal(r.status, 'corrupt');
    assert.match(r.errors.join(' '), /controle desconhecido/);
  });

  test('projeto selecionado inexistente é detectado', () => {
    const rec = { ...buildStorageRecord(stateWith([P1], [])), selectedProjectId: 'p_00000000000000ff' };
    const r = createStorage(() => createMemoryBackend({ [STORAGE_KEY]: JSON.stringify(rec) })).load();
    assert.equal(r.status, 'corrupt');
  });

  test('salva e recarrega o estado', () => {
    const backend = createMemoryBackend();
    const st = createStorage(() => backend);
    const s = stateWith([P1], [assessment(P1.id, 'ST-01', 'parcial')]);
    assert.deepEqual(st.save(s), { ok: true });
    const r = st.load();
    assert.equal(r.status, 'ok');
    assert.deepEqual(r.state.projects, s.projects);
    assert.deepEqual(r.state.assessments, s.assessments);
    assert.equal(r.state.selectedProjectId, P1.id);
  });
});

describe('falhas de persistência preservam dados anteriores', () => {
  test('falta de espaço: estado em memória e armazenado permanecem os anteriores', () => {
    const backend = createMemoryBackend();
    const st = createStorage(() => backend);
    const initial = stateWith([P1], []);
    assert.equal(st.save(initial).ok, true);
    const before = backend.getItem(STORAGE_KEY);
    const container = createStateContainer(st, initial);

    const created = createProject(initial, { name: 'Novo' }, { now: fixedNow(), newId: seqId });
    assert.equal(created.ok, true);
    const failing = { ...backend, setItem: () => { throw quotaError(); } };
    const st2 = createStorage(() => failing);
    const container2 = createStateContainer(st2, initial);
    const r = container2.commit(created.state);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'quota');
    assert.equal(container2.get(), initial, 'estado anterior preservado');
    assert.equal(backend.getItem(STORAGE_KEY), before, 'armazenamento inalterado');
    assert.equal(container.get(), initial);
  });

  test('falha de verificação após gravação não é reportada como sucesso', () => {
    const backend = createMemoryBackend();
    const liar = { getItem: () => 'outro', setItem: () => {}, removeItem: () => {} };
    const r = createStorage(() => liar).save(baseState());
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'verify');
    assert.equal(backend.getItem(STORAGE_KEY), null);
  });

  test('importação inválida não altera o estado nem o armazenamento', () => {
    const backend = createMemoryBackend();
    const st = createStorage(() => backend);
    const initial = stateWith([P1], [assessment(P1.id, 'ST-01', 'implementado')]);
    st.save(initial);
    const before = backend.getItem(STORAGE_KEY);
    const container = createStateContainer(st, initial);
    const bad = parseImport(JSON.stringify(exportDoc([P1], [assessment(P1.id, 'ST-99', 'implementado')])));
    assert.equal(bad.ok, false);
    // Fluxo da aplicação: só faz commit quando parseImport é ok.
    assert.equal(container.get(), initial);
    assert.equal(backend.getItem(STORAGE_KEY), before);
  });

  test('importação válida com falha de gravação preserva estado anterior', () => {
    const initial = stateWith([P1], []);
    const st = createStorage(() => createMemoryBackend({}, { failOnSet: quotaError() }));
    const container = createStateContainer(st, initial);
    const good = parseImport(JSON.stringify(exportDoc([project('p_0000000000000009', 'Importado')])));
    assert.equal(good.ok, true);
    assert.equal(container.commit(good.state).ok, false);
    assert.equal(container.get(), initial);
  });

  test('salvar uma avaliação preserva as demais', () => {
    const backend = createMemoryBackend();
    const st = createStorage(() => backend);
    const initial = stateWith([P1], [assessment(P1.id, 'ST-01', 'implementado'), assessment(P1.id, 'ST-02', 'parcial')]);
    const container = createStateContainer(st, initial);
    const r = saveAssessment(container.get(), P1.id, 'ST-03', {
      status: 'nao_implementado', priority: 'alta', evidenceText: '', evidenceUrl: '', justification: '', action: 'Modelar',
    }, { now: fixedNow() });
    assert.equal(r.ok, true);
    assert.equal(container.commit(r.state).ok, true);
    const loaded = st.load();
    assert.equal(loaded.state.assessments.length, 3);
    assert.ok(loaded.state.assessments.some((a) => a.controlId === 'ST-01' && a.status === 'implementado'));
  });
});
