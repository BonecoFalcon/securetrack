import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITS, checkText, checkHttpsUrl, isIsoDate, validateProjectFields, validateAssessmentFields, hasPendingEvidence,
} from '../js/validation.js';

describe('texto', () => {
  test('remove espaços nas extremidades e rejeita obrigatório vazio', () => {
    assert.deepEqual(checkText('  abc  ', { label: 'X', max: 10 }), { ok: true, value: 'abc' });
    assert.equal(checkText('   ', { label: 'Nome', max: 10, required: true }).ok, false);
    assert.equal(checkText(undefined, { label: 'X', max: 10 }).value, '');
  });

  test('rejeita tipos não textuais', () => {
    assert.equal(checkText(123, { label: 'X', max: 10 }).ok, false);
    assert.equal(checkText({}, { label: 'X', max: 10 }).ok, false);
  });
});

describe('limites dos campos de projeto', () => {
  const ok = { name: 'P', description: '', repositoryUrl: '', technologies: '' };
  const cases = [
    ['name', LIMITS.projectName],
    ['description', LIMITS.projectDescription],
    ['technologies', LIMITS.technologies],
  ];
  for (const [field, max] of cases) {
    test(`${field}: aceita ${max} e rejeita ${max + 1} caracteres`, () => {
      assert.equal(validateProjectFields({ ...ok, [field]: 'a'.repeat(max) }).ok, true);
      const r = validateProjectFields({ ...ok, [field]: 'a'.repeat(max + 1) });
      assert.equal(r.ok, false);
      assert.ok(r.errors[field]);
    });
  }

  test('URL do repositório: limite de 2.048 caracteres', () => {
    const base = 'https://example.org/';
    const exact = base + 'a'.repeat(LIMITS.url - base.length);
    assert.equal(exact.length, 2048);
    assert.equal(validateProjectFields({ ...ok, repositoryUrl: exact }).ok, true);
    assert.equal(validateProjectFields({ ...ok, repositoryUrl: exact + 'a' }).ok, false);
  });

  test('nome obrigatório', () => {
    const r = validateProjectFields({ ...ok, name: '   ' });
    assert.equal(r.ok, false);
    assert.match(r.errors.name, /obrigatório/);
  });

  test('constrói objeto novo apenas com campos permitidos', () => {
    const input = JSON.parse('{"name":" X ","id":"hack","isAdmin":true,"__proto__":{"polluted":1}}');
    const r = validateProjectFields(input);
    assert.equal(r.ok, true);
    assert.equal({}.polluted, undefined);
    assert.deepEqual(Object.keys(r.value).sort(), ['description', 'name', 'repositoryUrl', 'technologies']);
    assert.equal(r.value.name, 'X');
  });
});

describe('URLs', () => {
  const rejected = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'http://example.org',
    'ftp://example.org',
    'vbscript:msgbox(1)',
    '//example.org',
    'example.org',
    'https://',
    'https://user:senha@example.org',
    'https://exa mple.org',
    'https://example.org/\u0000',
  ];
  for (const u of rejected) {
    test(`rejeita ${JSON.stringify(u)}`, () => {
      assert.equal(checkHttpsUrl(u, { label: 'Link' }).ok, false);
    });
  }

  test('aceita https e campo vazio', () => {
    assert.deepEqual(checkHttpsUrl('', { label: 'Link' }), { ok: true, value: '' });
    assert.deepEqual(checkHttpsUrl('  https://github.com/org/repo  ', { label: 'Link' }), { ok: true, value: 'https://github.com/org/repo' });
  });
});

describe('datas', () => {
  test('aceita ISO 8601 UTC e rejeita formatos inválidos', () => {
    assert.equal(isIsoDate('2026-10-18T10:00:00.000Z'), true);
    assert.equal(isIsoDate('2026-10-18T10:00:00Z'), true);
    for (const bad of ['2026-02-31T10:00:00.000Z', '2026-10-18', '18/10/2026', '', null, 0, '2026-13-01T00:00:00.000Z']) {
      assert.equal(isIsoDate(bad), false, String(bad));
    }
  });
});

describe('avaliação', () => {
  const base = { status: 'implementado', priority: 'alta', evidenceText: '', evidenceUrl: '', justification: '', action: '' };

  test('"não aplicável" exige justificativa não vazia', () => {
    const r = validateAssessmentFields({ ...base, status: 'nao_aplicavel', justification: '   ' });
    assert.equal(r.ok, false);
    assert.ok(r.errors.justification);
    assert.equal(validateAssessmentFields({ ...base, status: 'nao_aplicavel', justification: 'Sem dependências.' }).ok, true);
  });

  test('situação e prioridade devem estar na lista permitida', () => {
    assert.equal(validateAssessmentFields({ ...base, status: 'ok' }).ok, false);
    assert.equal(validateAssessmentFields({ ...base, priority: 'urgente' }).ok, false);
  });

  test('limites de evidência, justificativa e ação', () => {
    assert.equal(validateAssessmentFields({ ...base, evidenceText: 'a'.repeat(2000) }).ok, true);
    assert.equal(validateAssessmentFields({ ...base, evidenceText: 'a'.repeat(2001) }).ok, false);
    assert.equal(validateAssessmentFields({ ...base, justification: 'a'.repeat(1001) }).ok, false);
    assert.equal(validateAssessmentFields({ ...base, action: 'a'.repeat(1001) }).ok, false);
    assert.equal(validateAssessmentFields({ ...base, evidenceUrl: 'javascript:alert(1)' }).ok, false);
  });

  test('implementado sem evidência é permitido e marcado como evidência pendente', () => {
    const r = validateAssessmentFields(base);
    assert.equal(r.ok, true);
    assert.equal(hasPendingEvidence(r.value), true);
    assert.equal(hasPendingEvidence({ ...r.value, evidenceText: 'Doc' }), false);
    assert.equal(hasPendingEvidence({ ...r.value, status: 'parcial' }), false);
  });

  test('texto com HTML é mantido literalmente (a exibição usa textContent)', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const r = validateAssessmentFields({ ...base, evidenceText: payload });
    assert.equal(r.value.evidenceText, payload);
  });
});
