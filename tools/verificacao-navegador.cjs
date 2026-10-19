// Verificações de navegador do SecureTrack em Chromium headless (Playwright).
//
// OPCIONAL e fora do `npm test`: exige o Playwright, que NÃO é dependência do
// projeto. Foi usado pela IA assistente para registrar os resultados de
// docs/TESTES.md. Não substitui os testes manuais feitos por uma pessoa.
//
// Uso (em uma pasta temporária, fora do repositório):
//   npm install playwright && npx playwright install chromium
//   node scripts/serve.js 8123            # em outro terminal, na pasta do projeto
//   NODE_PATH=./node_modules node /caminho/securetrack/tools/verificacao-navegador.cjs
// Variáveis opcionais: BASE (URL), CHROMIUM_PATH (executável), OUT (pasta de saída).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8123/securetrack/';
const OUT = process.env.OUT || path.join(require('os').tmpdir(), 'securetrack-verificacao');
fs.mkdirSync(OUT, { recursive: true });
const XSS = '<img src=x onerror=alert(1)>';
const results = [];
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${detail ? ' :: ' + detail : ''}`);
}

async function newPage(browser, opts = {}) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: opts.viewport || { width: 1280, height: 900 } });
  if (opts.init) await context.addInitScript(opts.init);
  await context.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  const page = await context.newPage();
  page.__log = { dialogs: [], console: [], errors: [], requests: [] };
  page.on('dialog', async (d) => { page.__log.dialogs.push(`${d.type()}: ${d.message()}`); await d.dismiss(); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') page.__log.console.push(m.text()); });
  page.on('pageerror', (e) => page.__log.errors.push(String(e)));
  page.on('request', (r) => page.__log.requests.push(r.url()));
  return { context, page };
}

async function cspViolations(page) {
  return page.evaluate(() => window.__csp);
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const { context, page } = await newPage(browser);

  // 1. Estado vazio em subdiretório
  await page.goto(BASE);
  await page.waitForSelector('main h2');
  check('Subdiretório: página carrega em /securetrack/', (await page.textContent('main h2')).includes('Dashboard'));
  check('Estado vazio oferece criar projeto e carregar demonstração',
    (await page.locator('.empty a', { hasText: 'Criar projeto' }).count()) === 1 &&
    (await page.locator('.empty button', { hasText: 'Carregar demonstração' }).count()) === 1);
  await page.screenshot({ path: path.join(OUT, '01-vazio.png'), fullPage: true });

  // 2. Criar projeto com payload XSS
  await page.click('nav a[href="#projetos"]');
  await page.fill('#pf-name', '   ');
  await page.click('form button[type=submit]');
  check('Nome vazio (só espaços) é rejeitado com erro próximo ao campo',
    (await page.textContent('[data-error-for="name"]')).includes('obrigatório') &&
    (await page.getAttribute('#pf-name', 'aria-invalid')) === 'true');
  await page.fill('#pf-name', XSS);
  await page.fill('#pf-description', `Descrição ${XSS}`);
  await page.fill('#pf-url', 'javascript:alert(1)');
  await page.click('form button[type=submit]');
  check('URL javascript: rejeitada no formulário de projeto',
    (await page.textContent('[data-error-for="repositoryUrl"]')).includes('https'));
  check('Projeto não foi criado com URL inválida', (await page.locator('tbody tr').count()) === 0);
  await page.fill('#pf-url', 'https://example.org/repo-ficticio');
  await page.fill('#pf-tech', 'HTML, CSS, JS');
  await page.click('form button[type=submit]');
  await page.waitForSelector('tbody tr');
  const rowText = await page.textContent('tbody tr th');
  check('Payload XSS exibido literalmente no nome', rowText === XSS, rowText);
  check('Nenhum <img src=x> injetado no DOM', (await page.locator('main img[src="x"]').count()) === 0);
  const link = page.locator('tbody a.external');
  check('Link do repositório usa target _blank e rel noopener noreferrer',
    (await link.getAttribute('target')) === '_blank' && (await link.getAttribute('rel')) === 'noopener noreferrer');
  check('Mensagem de sucesso acessível (role=status)', (await page.textContent('#global-status')).includes('criado'));

  // 3. Editar projeto
  await page.click('tbody button:has-text("Editar")');
  await page.fill('#pf-name', 'Projeto Teste');
  await page.click('form button[type=submit]');
  await page.waitForTimeout(100);
  check('Edição de projeto salva', (await page.textContent('tbody tr th')) === 'Projeto Teste');

  // 4. Avaliações
  await page.click('tbody button:has-text("Avaliar")');
  await page.waitForSelector('#c-ST-01');
  await page.check('#c-ST-01-st-implementado');
  await page.click('#c-ST-01 button[type=submit]');
  await page.waitForTimeout(100);
  check('Implementado sem evidência mostra "Evidência pendente"',
    (await page.textContent('#c-ST-01 .control-head')).includes('Evidência pendente'));
  await page.check('#c-ST-07-st-nao_aplicavel');
  await page.click('#c-ST-07 button[type=submit]');
  check('"Não aplicável" sem justificativa é rejeitado',
    (await page.textContent('#c-ST-07 [data-error-for="justification"]')).includes('justificativa'));
  // edição não salva em outro cartão deve permanecer
  await page.fill('#c-ST-03-act', 'rascunho não salvo');
  await page.fill('#c-ST-07-just', 'Projeto sem dependências externas');
  await page.click('#c-ST-07 button[type=submit]');
  await page.waitForTimeout(100);
  check('"Não aplicável" com justificativa é salvo',
    (await page.textContent('#c-ST-07 .control-head')).includes('Não aplicável'));
  check('Rascunho em outro controle é preservado ao salvar', (await page.inputValue('#c-ST-03-act')) === 'rascunho não salvo');
  await page.check('#c-ST-02-st-parcial');
  await page.fill('#c-ST-02-act', `Ação ${XSS}`);
  await page.fill('#c-ST-02-evurl', 'javascript:alert(1)');
  await page.click('#c-ST-02 button[type=submit]');
  check('Link de evidência javascript: rejeitado', (await page.textContent('#c-ST-02 [data-error-for="evidenceUrl"]')).includes('https'));
  await page.fill('#c-ST-02-evurl', '');
  await page.click('#c-ST-02 button[type=submit]');
  await page.waitForTimeout(100);
  check('Progresso atualizado', (await page.textContent('#ev-progress')).startsWith('3 de 15'));

  // 5. Persistência após recarregar
  await page.reload();
  await page.waitForSelector('#c-ST-01');
  check('Persistência após recarregar', (await page.textContent('#c-ST-07 .control-head')).includes('Não aplicável') &&
    (await page.textContent('#ev-progress')).startsWith('3 de 15'));

  // 6. Dashboard: 1 impl, 1 parcial, 1 NA, 12 não avaliados → 1,5/14 = 10,7%
  await page.click('nav a[href="#painel"]');
  await page.waitForSelector('.kpi-value');
  const kpi = await page.textContent('.kpi-value');
  check('Dashboard: indicador = 10,7% (1,5 ÷ 14)', kpi === '10,7%', kpi);
  check('Dashboard: explicação com numerador e denominador', (await page.textContent('.kpi-main')).includes('1,5 ÷ 14'));
  const tiles = await page.locator('.tile-value').allTextContents();
  check('Dashboard: 12 não avaliados, 1 evidência pendente', tiles[0] === '12' && tiles[1] === '1', tiles.join(','));
  check('Dashboard: ação com XSS exibida literalmente', (await page.textContent('main')).includes(`Ação ${XSS}`));
  await page.screenshot({ path: path.join(OUT, '02-dashboard.png'), fullPage: true });

  // 7. Demonstração (com confirmação)
  await page.click('nav a[href="#dados"]');
  await page.click('button:has-text("Carregar demonstração")');
  await page.waitForSelector('dialog[open]');
  check('Carregar demonstração pede confirmação quando há dados', (await page.locator('dialog[open]').count()) === 1);
  await page.click('dialog button:has-text("Adicionar demonstração")');
  await page.waitForSelector('.kpi-value');
  await page.waitForTimeout(150);
  const demoKpi = await page.textContent('.kpi-value');
  check('Demo GuitarScore: indicador = 42,9% (6 ÷ 14)', demoKpi === '42,9%', demoKpi);
  const demoTiles = await page.locator('.tile-value').allTextContents();
  check('Demo: 3 não avaliados, 2 evidências pendentes', demoTiles[0] === '3' && demoTiles[1] === '2', demoTiles.join(','));
  check('Visão geral lista 2 projetos individualmente', (await page.locator('.card table tbody tr').first().count()) === 1 &&
    (await page.textContent('main')).includes('Total de projetos: 2'));
  const fwRows = await page.locator('table:has(caption:text("Indicador por recorte de framework")) tbody tr').allTextContents();
  console.log('Framework rows:', fwRows);
  const areaRows = await page.locator('table:has(caption:text("Indicador por área")) tbody tr').allTextContents();
  console.log('Area rows:', areaRows);
  await page.screenshot({ path: path.join(OUT, '03-demo-dashboard.png'), fullPage: true });

  // 8. Plano de melhorias com filtros
  await page.click('nav a[href="#plano"]');
  await page.waitForSelector('#acts-title');
  const allActs = await page.textContent('#acts-title');
  await page.selectOption('#f-priority', 'alta');
  const altaActs = await page.textContent('#acts-title');
  await page.selectOption('#f-project', { label: 'GuitarScore — demonstração' });
  const demoAlta = await page.textContent('#acts-title');
  check('Filtros do plano alteram resultados', allActs !== altaActs || altaActs !== demoAlta, `${allActs} | ${altaActs} | ${demoAlta}`);
  await page.selectOption('#f-priority', '');
  const demoAll = await page.textContent('#acts-title');
  check('Demo: 7 ações (3 não impl. + 4 parciais)', demoAll.includes('(7)'), demoAll);
  check('Plano mostra "Definir ação" quando não há ação registrada', (await page.textContent('#plan-results')).includes('Definir ação'));
  check('Demo: 3 avaliações pendentes', (await page.textContent('#pend-title')).includes('(3)'));
  const prios = await page.locator('#plan-results section:first-of-type tbody .prio').allTextContents();
  const rank = { Alta: 0, 'Média': 1, Baixa: 2 };
  check('Ações ordenadas por prioridade', prios.every((p, i) => i === 0 || rank[prios[i - 1]] <= rank[p]), prios.join(','));
  await page.screenshot({ path: path.join(OUT, '04-plano.png'), fullPage: true });

  // 9. Exportar
  await page.click('nav a[href="#dados"]');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Exportar backup")')]);
  const exportPath = path.join(OUT, 'export.json');
  await download.saveAs(exportPath);
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  check('Exportação com formatVersion, catalogVersion, exportedAt e 2 projetos',
    exported.formatVersion === 1 && exported.catalogVersion === '1.0.0' && !!exported.exportedAt && exported.projects.length === 2,
    download.suggestedFilename());
  check('Exportação não contém o catálogo', !JSON.stringify(exported).includes('relationships'));

  // 10. Importação cancelada não altera dados
  const before = await page.evaluate(() => localStorage.getItem('securetrack:v1'));
  const oneProject = { ...exported, projects: [exported.projects[0]], assessments: exported.assessments.filter((a) => a.projectId === exported.projects[0].id) };
  const p1 = path.join(OUT, 'one.json');
  fs.writeFileSync(p1, JSON.stringify(oneProject));
  await page.setInputFiles('#imp-file', p1);
  await page.click('button:has-text("Validar arquivo")');
  await page.waitForSelector('#imp-sum-title');
  check('Importação mostra resumo antes de substituir', (await page.textContent('#import-result')).includes('Projetos: 1'));
  await page.click('button:has-text("Cancelar importação")');
  const after = await page.evaluate(() => localStorage.getItem('securetrack:v1'));
  check('Cancelar importação não altera dados', before === after);

  // 11. Importação maliciosa rejeitada
  const bad = { ...exported, projects: [{ ...exported.projects[0], repositoryUrl: 'javascript:alert(1)' }] };
  const pBad = path.join(OUT, 'bad.json');
  fs.writeFileSync(pBad, JSON.stringify(bad));
  await page.setInputFiles('#imp-file', pBad);
  await page.click('button:has-text("Validar arquivo")');
  await page.waitForSelector('#import-result .callout-error');
  check('Importação com URL javascript: rejeitada', (await page.textContent('#import-result')).includes('https'));
  check('Dados preservados após importação rejeitada', before === (await page.evaluate(() => localStorage.getItem('securetrack:v1'))));
  const pBad2 = path.join(OUT, 'bad2.json');
  fs.writeFileSync(pBad2, JSON.stringify({ ...exported, formatVersion: 99 }));
  await page.setInputFiles('#imp-file', pBad2);
  await page.click('button:has-text("Validar arquivo")');
  await page.waitForSelector('#import-result .callout-error');
  check('Versão incompatível rejeitada com mensagem clara', (await page.textContent('#import-result')).includes('Versão de formato incompatível'));

  // 12. Importação válida com XSS no conteúdo e confirmação
  const xssDoc = { ...exported, projects: exported.projects.map((p, i) => ({ ...p, name: i === 0 ? `JSON ${XSS}` : p.name })) };
  const pX = path.join(OUT, 'xss.json');
  fs.writeFileSync(pX, JSON.stringify(xssDoc));
  await page.setInputFiles('#imp-file', pX);
  await page.click('button:has-text("Validar arquivo")');
  await page.waitForSelector('#imp-sum-title');
  check('Resumo exibe nome com XSS literalmente', (await page.textContent('#import-result')).includes(`JSON ${XSS}`));
  await page.click('button:has-text("Substituir dados atuais")');
  await page.waitForSelector('.kpi-value');
  check('Importação confirmada restaura dados', (await page.textContent('main')).includes(`JSON ${XSS}`));
  check('Nenhum <img src=x> após importação', (await page.locator('img[src="x"]').count()) === 0);

  // 13. Excluir projeto: cancelar e confirmar
  await page.click('nav a[href="#projetos"]');
  await page.waitForSelector('#projects-title');
  const countBefore = await page.locator('tbody tr').count();
  await page.locator('tbody tr').first().locator('button:has-text("Excluir")').click();
  await page.waitForSelector('dialog[open]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  check('Excluir: Esc cancela sem excluir', (await page.locator('tbody tr').count()) === countBefore);
  await page.locator('tbody tr').first().locator('button:has-text("Excluir")').click();
  await page.click('dialog button:has-text("Excluir projeto")');
  await page.waitForTimeout(150);
  check('Excluir: confirmação remove o projeto', (await page.locator('tbody tr').count()) === countBefore - 1);

  // 14. Teclado
  await page.goto(BASE + '#painel');
  await page.reload();
  await page.waitForSelector('main h2');
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement.textContent);
  check('Primeiro Tab foca o link "Pular para o conteúdo"', first.includes('Pular'), first);
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  check('Foco visível (outline)', outline !== 'none', outline);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const h2 = await page.textContent('main h2');
  check('Seção Projetos aberta via teclado e foco no título', h2 === 'Projetos' && (await page.evaluate(() => document.activeElement.tagName)) === 'H2', h2);
  // Percorre todos os focáveis e garante que são alcançáveis
  let tabs = 0; const seen = new Set();
  for (; tabs < 80; tabs++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}#${a.id}.${a.textContent.slice(0, 20)}` : ''; });
    seen.add(d);
  }
  check('Tab percorre vários controles da página', seen.size > 10, `${seen.size} elementos distintos`);

  // CSP e rede
  const viol = await cspViolations(page);
  const external = page.__log.requests.filter((u) => !u.startsWith(new URL(BASE).origin + '/') && !u.startsWith('blob:') && !u.startsWith('data:'));
  check('Nenhuma violação de CSP', viol.length === 0, viol.join(' | '));
  check('Nenhuma requisição externa', external.length === 0, external.join(' | '));
  check('Nenhum diálogo alert() disparado', page.__log.dialogs.length === 0, page.__log.dialogs.join(' | '));
  check('Nenhum erro de JavaScript', page.__log.errors.length === 0, page.__log.errors.join(' | '));
  console.log('Console warnings/errors:', page.__log.console);
  await context.close();

  // 15. Tela pequena
  {
    const { context: c2, page: p2 } = await newPage(browser, { viewport: { width: 360, height: 740 } });
    await p2.goto(BASE);
    await p2.waitForSelector('main h2');
    await p2.click('.empty button:has-text("Carregar demonstração")');
    await p2.waitForSelector('.kpi-value');
    const overflow = {};
    for (const r of ['painel', 'projetos', 'avaliacao', 'plano', 'dados', 'sobre']) {
      await p2.goto(BASE + '#' + r);
      await p2.waitForSelector('main h2');
      await p2.waitForTimeout(150);
      overflow[r] = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      await p2.screenshot({ path: path.join(OUT, `mobile-${r}.png`), fullPage: false });
    }
    check('Tela 360px: sem rolagem horizontal da página', Object.values(overflow).every((v) => v <= 0), JSON.stringify(overflow));
    check('Demo carregada sem confirmação quando não havia dados', (await p2.locator('dialog').count()) === 0);
    check('Tela pequena: sem violações de CSP', (await cspViolations(p2)).length === 0);
    await c2.close();
  }

  // 16. Armazenamento corrompido
  {
    const { context: c3, page: p3 } = await newPage(browser);
    await p3.goto(BASE);
    await p3.evaluate((x) => localStorage.setItem('securetrack:v1', '{"format":"securetrack-storage", ' + x), XSS);
    await p3.reload();
    await p3.waitForSelector('main h2');
    check('Armazenamento corrompido: tela de recuperação', (await p3.textContent('main h2')).includes('não puderam ser carregados'));
    check('Conteúdo corrompido não foi apagado', (await p3.evaluate(() => localStorage.getItem('securetrack:v1'))).includes('onerror'));
    const [dl] = await Promise.all([p3.waitForEvent('download'), p3.click('button:has-text("Baixar conteúdo bruto")')]);
    const rawPath = path.join(OUT, 'raw.txt');
    await dl.saveAs(rawPath);
    check('Download do conteúdo bruto idêntico ao salvo', fs.readFileSync(rawPath, 'utf8') === '{"format":"securetrack-storage", ' + XSS);
    check('Conteúdo bruto não interpretado como HTML', (await p3.locator('img[src="x"]').count()) === 0 && p3.__log.dialogs.length === 0);
    await p3.click('button:has-text("Reinicializar dados salvos")');
    await p3.click('dialog button:has-text("Cancelar")');
    check('Reinicialização cancelada mantém dados', (await p3.evaluate(() => localStorage.getItem('securetrack:v1'))) !== null);
    await p3.click('button:has-text("Reinicializar dados salvos")');
    await p3.click('dialog button:has-text("Apagar e reinicializar")');
    await p3.waitForSelector('.empty');
    check('Reinicialização confirmada limpa os dados', (await p3.evaluate(() => localStorage.getItem('securetrack:v1'))) === null);
    await p3.screenshot({ path: path.join(OUT, '05-recuperado.png') });
    await c3.close();
  }

  // 17. Armazenamento indisponível
  {
    const { context: c4, page: p4 } = await newPage(browser, {
      init: () => {
        Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Bloqueado', 'SecurityError'); } });
      },
    });
    await p4.goto(BASE);
    await p4.waitForSelector('main h2');
    check('Armazenamento indisponível: aviso exibido', (await p4.textContent('#storage-banner')).includes('Armazenamento indisponível'));
    await p4.goto(BASE + '#projetos');
    await p4.fill('#pf-name', 'Teste');
    await p4.click('form button[type=submit]');
    await p4.waitForTimeout(100);
    const toast = await p4.textContent('#global-status');
    check('Sem armazenamento: não indica sucesso e informa falha', toast.includes('Nada foi salvo') && !toast.includes('criado'), toast);
    check('Sem armazenamento: projeto não aparece como salvo', (await p4.locator('tbody tr').count()) === 0);
    await c4.close();
  }

  // 18. Cota excedida
  {
    const { context: c5, page: p5 } = await newPage(browser, {
      init: () => {
        const orig = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (window.__quota) throw new DOMException('cheio', 'QuotaExceededError');
          return orig.call(this, k, v);
        };
      },
    });
    await p5.goto(BASE);
    await p5.waitForSelector('main h2');
    await p5.click('.empty button:has-text("Carregar demonstração")');
    await p5.waitForSelector('.kpi-value');
    const saved = await p5.evaluate(() => localStorage.getItem('securetrack:v1'));
    await p5.evaluate(() => { window.__quota = true; });
    await p5.goto(BASE + '#projetos');
    await p5.fill('#pf-name', 'Excede cota');
    await p5.click('form button[type=submit]');
    await p5.waitForTimeout(100);
    check('Cota excedida: mensagem de falta de espaço', (await p5.textContent('#global-status')).includes('Sem espaço'));
    check('Cota excedida: dados anteriores preservados', saved === (await p5.evaluate(() => localStorage.getItem('securetrack:v1'))) &&
      (await p5.locator('tbody tr').count()) === 1);
    await c5.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} verificações passaram.`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
