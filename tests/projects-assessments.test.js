import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createProject, updateProject, deleteProject, generateProjectId, MAX_PROJECTS } from '../js/projects.js';
import { saveAssessment, getAssessment } from '../js/assessments.js';
import { PROJECT_ID_PATTERN } from '../js/validation.js';
import { baseState, project, assessment, stateWith, fixedNow, seqId, T0, T1 } from './helpers.js';

describe('projetos', () => {
  test('cria com ID gerado, datas gerenciadas e campos aparados', () => {
    const r = createProject(baseState(), { name: '  App  ', description: ' d ', technologies: ' JS ', repositoryUrl: '' }, { now: fixedNow(T0), newId: seqId });
    assert.equal(r.ok, true);
    assert.match(r.project.id, PROJECT_ID_PATTERN);
    assert.equal(r.project.name, 'App');
    assert.equal(r.project.description, 'd');
    assert.equal(r.project.createdAt, T0);
    assert.equal(r.project.updatedAt, T0);
    assert.equal(r.state.selectedProjectId, r.project.id);
  });

  test('não altera o estado recebido', () => {
    const s = baseState();
    createProject(s, { name: 'A' }, { now: fixedNow(), newId: seqId });
    assert.equal(s.projects.length, 0);
  });

  test('gerador de ID produz formato esperado e IDs distintos', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateProjectId()));
    assert.equal(ids.size, 100);
    for (const id of ids) assert.match(id, PROJECT_ID_PATTERN);
  });

  test('rejeita nome duplicado (sem diferenciar maiúsculas)', () => {
    const s = stateWith([project('p_0000000000000001', 'App')], []);
    const r = createProject(s, { name: 'app' }, { now: fixedNow(), newId: seqId });
    assert.equal(r.ok, false);
    assert.ok(r.errors.name);
  });

  test('respeita limite de projetos', () => {
    const many = Array.from({ length: MAX_PROJECTS }, (_, i) => project('p_' + i.toString(16).padStart(16, '0'), `P${i}`));
    const r = createProject(stateWith(many, []), { name: 'Extra' }, { now: fixedNow(), newId: seqId });
    assert.equal(r.ok, false);
  });

  test('edita mantendo ID e data de criação e atualizando a data de atualização', () => {
    const p = project('p_0000000000000001', 'App');
    const r = updateProject(stateWith([p], []), p.id, { name: 'App 2', repositoryUrl: 'https://example.org/r' }, { now: fixedNow(T1) });
    assert.equal(r.ok, true);
    assert.equal(r.project.id, p.id);
    assert.equal(r.project.createdAt, T0);
    assert.equal(r.project.updatedAt, T1);
    assert.equal(r.project.repositoryUrl, 'https://example.org/r');
  });

  test('edição inválida não altera nada', () => {
    const p = project('p_0000000000000001', 'App');
    const r = updateProject(stateWith([p], []), p.id, { name: 'App', repositoryUrl: 'javascript:alert(1)' });
    assert.equal(r.ok, false);
    assert.ok(r.errors.repositoryUrl);
  });

  test('exclui projeto e somente suas avaliações', () => {
    const a = project('p_0000000000000001', 'A');
    const b = project('p_0000000000000002', 'B');
    const s = stateWith([a, b], [assessment(a.id, 'ST-01', 'implementado'), assessment(b.id, 'ST-01', 'parcial')]);
    const r = deleteProject(s, a.id);
    assert.equal(r.ok, true);
    assert.deepEqual(r.state.projects.map((p) => p.id), [b.id]);
    assert.deepEqual(r.state.assessments.map((x) => x.projectId), [b.id]);
    assert.equal(r.state.selectedProjectId, b.id);
  });
});

describe('avaliações', () => {
  const p = project('p_0000000000000001', 'App');
  const input = { status: 'parcial', priority: 'alta', evidenceText: ' doc ', evidenceUrl: '', justification: '', action: ' fazer ' };

  test('situação inicial é "não avaliado" com prioridade padrão do controle', () => {
    const a = getAssessment(stateWith([p], []), p.id, 'ST-01');
    assert.equal(a.status, 'nao_avaliado');
    assert.equal(a.priority, 'alta');
    assert.equal(a.updatedAt, null);
  });

  test('salva com data de atualização e substitui somente o mesmo controle', () => {
    let s = stateWith([p], [assessment(p.id, 'ST-02', 'implementado')]);
    let r = saveAssessment(s, p.id, 'ST-01', input, { now: fixedNow(T1) });
    assert.equal(r.ok, true);
    assert.equal(r.assessment.evidenceText, 'doc');
    assert.equal(r.assessment.updatedAt, T1);
    s = r.state;
    r = saveAssessment(s, p.id, 'ST-01', { ...input, status: 'implementado' }, { now: fixedNow(T1) });
    assert.equal(r.state.assessments.length, 2);
    assert.equal(getAssessment(r.state, p.id, 'ST-01').status, 'implementado');
    assert.equal(getAssessment(r.state, p.id, 'ST-02').status, 'implementado');
  });

  test('rejeita projeto inexistente, controle desconhecido e NA sem justificativa', () => {
    const s = stateWith([p], []);
    assert.equal(saveAssessment(s, 'p_00000000000000ff', 'ST-01', input).ok, false);
    assert.equal(saveAssessment(s, p.id, 'ST-99', input).ok, false);
    const na = saveAssessment(s, p.id, 'ST-07', { ...input, status: 'nao_aplicavel', justification: '' });
    assert.equal(na.ok, false);
    assert.ok(na.errors.justification);
  });
});
