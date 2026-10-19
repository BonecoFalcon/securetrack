// Integridade do catálogo e verificações estáticas de segurança do código-fonte.
// As verificações estáticas são inspeções automatizadas simples: não provam
// ausência de XSS na interface, que depende também de testes no navegador.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CONTROLS, AREAS, FRAMEWORKS, CATALOG_VERSION } from '../js/controls.js';
import { PRIORITIES } from '../js/validation.js';

const root = new URL('../', import.meta.url);

describe('catálogo', () => {
  test('tem versão explícita e cerca de 15 controles com IDs únicos', () => {
    assert.match(CATALOG_VERSION, /^\d+\.\d+\.\d+$/);
    assert.equal(CONTROLS.length, 15);
    assert.equal(new Set(CONTROLS.map((c) => c.id)).size, 15);
  });

  test('todas as áreas têm controles e todos os campos obrigatórios existem', () => {
    for (const a of AREAS) assert.ok(CONTROLS.some((c) => c.area === a.id), a.id);
    for (const c of CONTROLS) {
      assert.match(c.id, /^ST-\d{2}$/);
      for (const k of ['title', 'description', 'guidance']) assert.ok(c[k].length > 10, `${c.id}.${k}`);
      assert.ok(c.evidenceExamples.length >= 1);
      assert.ok(PRIORITIES.includes(c.defaultPriority));
      assert.ok(c.relationships.length >= 1, `${c.id} sem relacionamento`);
    }
  });

  test('relacionamentos usam frameworks conhecidos, fonte https oficial e status explícito', () => {
    const fwIds = FRAMEWORKS.map((f) => f.id);
    const officialHosts = ['nvlpubs.nist.gov', 'csrc.nist.gov', 'owaspsamm.org', 'www.microsoft.com'];
    for (const c of CONTROLS) {
      for (const r of c.relationships) {
        assert.ok(fwIds.includes(r.framework));
        const u = new URL(r.sourceUrl);
        assert.equal(u.protocol, 'https:');
        assert.ok(officialHosts.includes(u.hostname), `${c.id}: ${u.hostname}`);
        assert.ok(['conferido', 'pendente'].includes(r.status));
        assert.ok(r.interpretation.length > 10);
      }
    }
  });

  test('catálogo é imutável em tempo de execução', () => {
    assert.throws(() => { CONTROLS[0].title = 'x'; });
    assert.throws(() => { CONTROLS.push({}); });
  });
});

function listFiles(dir) {
  return readdirSync(new URL(dir, root)).filter((f) => f.endsWith('.js')).map((f) => [f, readFileSync(new URL(dir + f, root), 'utf8')]);
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('inspeção estática', () => {
  const files = listFiles('js/');

  test('não usa innerHTML, outerHTML, insertAdjacentHTML, document.write, eval ou new Function', () => {
    const banned = [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new\s+Function\s*\(/, /setTimeout\s*\(\s*['"`]/];
    for (const [name, src] of files) {
      const code = stripComments(src);
      for (const re of banned) assert.ok(!re.test(code), `${name} contém ${re}`);
    }
  });

  test('não faz requisições a terceiros nem usa telemetria', () => {
    for (const [name, src] of files) {
      const code = stripComments(src);
      assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(code), name);
      for (const m of code.matchAll(/fetch\(([^)]*)\)/g)) {
        assert.match(m[1], /demo\.json/, `${name}: fetch inesperado`);
      }
    }
  });

  test('index.html tem CSP restritiva e nenhum script ou estilo inline', () => {
    const html = readFileSync(new URL('index.html', root), 'utf8');
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
    assert.ok(csp, 'CSP ausente');
    const policy = csp[1];
    for (const d of ["default-src 'none'", "script-src 'self'", "style-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'none'"]) {
      assert.ok(policy.includes(d), d);
    }
    assert.ok(!/unsafe-inline|unsafe-eval|https?:/.test(policy));
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'script inline');
    assert.ok(!/<style\b/i.test(html), 'style inline');
    assert.ok(!/\sstyle=/i.test(html), 'atributo style');
    assert.ok(!/\son[a-z]+=/i.test(html), 'manipulador inline');
    assert.ok(!/(src|href)="(https?:)?\/\//i.test(html), 'recurso externo');
  });

  test('links com target="_blank" usam rel="noopener noreferrer"', () => {
    const ui = readFileSync(new URL('js/ui.js', root), 'utf8');
    assert.match(ui, /target: '_blank',\s*rel: 'noopener noreferrer'/);
    for (const [name, src] of files) {
      if (name === 'ui.js') continue;
      assert.ok(!/_blank/.test(stripComments(src)), `${name} deve usar externalLink()`);
    }
  });

  test('caminhos de recursos são relativos (compatível com subdiretório)', () => {
    const html = readFileSync(new URL('index.html', root), 'utf8');
    for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      assert.ok(!m[1].startsWith('/'), `caminho absoluto: ${m[1]}`);
    }
  });
});
