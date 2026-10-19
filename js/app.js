// Controlador da interface do SecureTrack.
// Fluxo de alteração de dados: validar → calcular novo estado → persistir →
// somente então atualizar a interface como sucesso.

import {
  AREAS, CONTROLS, FRAMEWORKS, CATALOG_VERSION, REFERENCES_CHECKED_ON,
  areaName, frameworkName,
} from './controls.js';
import {
  LIMITS, STATUSES, STATUS_LABELS, PRIORITIES, PRIORITY_LABELS, hasPendingEvidence,
} from './validation.js';
import {
  emptyState, createProject, updateProject, deleteProject, selectProject, getProject,
  countAssessments, MAX_PROJECTS,
} from './projects.js';
import { getAssessment, saveAssessment, assessmentsByControl } from './assessments.js';
import {
  projectIndicator, indicatorsByArea, indicatorsByFramework, formatPercent, formatNumber,
  explainIndicator, improvementItems, highPriorityPending, nextActions,
} from './scoring.js';
import { createStorage, createStateContainer } from './storage.js';
import { parseImport, serializeExport, exportFileName, MAX_IMPORT_BYTES } from './transfer.js';
import {
  el, append, clear, externalLink, announce, confirmDialog, downloadText, meter,
  statusBadge, formatDateTime, showFormErrors, clearFormErrors, field,
} from './ui.js';

const ROUTES = ['painel', 'projetos', 'avaliacao', 'plano', 'dados', 'sobre'];
const ROUTE_TITLES = {
  painel: 'Dashboard',
  projetos: 'Projetos',
  avaliacao: 'Avaliação',
  plano: 'Plano de melhorias',
  dados: 'Backup e dados',
  sobre: 'Sobre e referências',
};

let storage;
let store;
let mode = 'ok'; // 'ok' | 'unavailable' | 'corrupt'
let corruptInfo = null;
let editingProjectId = null;
let pendingImport = null;
const planFilters = { projectId: '', areaId: '', status: '', priority: '' };

function getLocalStorage() {
  // Acessar window.localStorage pode lançar exceção (ex.: bloqueio de cookies).
  return window.localStorage;
}

function currentRoute() {
  const h = location.hash.replace(/^#/, '');
  return ROUTES.includes(h) ? h : null;
}

function state() {
  return store.get();
}

/** Persiste e confirma. Retorna true somente se salvou. */
function commit(nextState, successMessage) {
  const result = store.commit(nextState);
  if (!result.ok) {
    announce(result.message, 'error');
    return false;
  }
  if (successMessage) announce(successMessage, 'success');
  return true;
}

// ---------------------------------------------------------------- inicialização

function init() {
  storage = createStorage(getLocalStorage);
  const loaded = storage.load();
  let initial = emptyState(CATALOG_VERSION);
  if (loaded.status === 'ok') initial = loaded.state;
  else if (loaded.status === 'unavailable') mode = 'unavailable';
  else if (loaded.status === 'corrupt') { mode = 'corrupt'; corruptInfo = loaded; }
  store = createStateContainer(storage, initial);

  for (const link of document.querySelectorAll('[data-route-link]')) {
    link.addEventListener('click', () => {
      // Se a rota já é a atual, hashchange não dispara: renderiza mesmo assim.
      if (link.getAttribute('href') === location.hash) render(true);
    });
  }
  window.addEventListener('hashchange', () => { if (currentRoute()) render(true); });
  render(false);
}

function render(moveFocus) {
  renderBanner();
  const route = currentRoute() || 'painel';
  for (const link of document.querySelectorAll('[data-route-link]')) {
    if (link.getAttribute('href') === `#${route}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const main = document.getElementById('main');
  clear(main);
  if (mode === 'corrupt') {
    renderCorrupt(main);
  } else {
    const views = { painel: renderPainel, projetos: renderProjetos, avaliacao: renderAvaliacao, plano: renderPlano, dados: renderDados, sobre: renderSobre };
    views[route](main);
  }
  document.title = `${mode === 'corrupt' ? 'Recuperação de dados' : ROUTE_TITLES[route]} — SecureTrack`;
  if (moveFocus) {
    const h = main.querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }
}

function renderBanner() {
  const banner = document.getElementById('storage-banner');
  clear(banner);
  if (mode === 'unavailable') {
    banner.hidden = false;
    banner.append(el('p', {},
      el('strong', { text: 'Armazenamento indisponível. ' }),
      'O navegador não permite usar o armazenamento local nesta página. Nenhuma alteração poderá ser salva. ' +
      'Verifique as permissões de armazenamento do site ou use outro perfil de navegador.'));
  } else {
    banner.hidden = true;
  }
}

// ---------------------------------------------------------------- recuperação

function renderCorrupt(main) {
  append(main,
    el('h2', { text: 'Dados salvos não puderam ser carregados' }),
    el('div', { class: 'callout callout-error' },
      el('p', { text: 'O conteúdo salvo neste navegador está corrompido ou em formato incompatível. ' +
        'Nada foi apagado. Para proteger seus dados, o SecureTrack não fará alterações até que você decida o que fazer.' }),
      el('p', { text: 'Problemas encontrados:' }),
      el('ul', {}, corruptInfo.errors.map((m) => el('li', { text: m })))),
    el('h3', { text: 'Opções' }),
    el('ol', { class: 'steps' },
      el('li', {}, 'Baixe o conteúdo bruto para guardar uma cópia. O arquivo é salvo como texto e não é interpretado.'),
      el('li', {}, 'Se tiver um backup exportado, reinicialize os dados e depois importe o backup em "Backup e dados".')),
  );
  const dl = el('button', { type: 'button', class: 'btn btn-primary', text: 'Baixar conteúdo bruto (.txt)' });
  dl.addEventListener('click', () => {
    downloadText(`securetrack-conteudo-bruto-${new Date().toISOString().slice(0, 10)}.txt`, corruptInfo.raw, 'text/plain');
    announce('Download do conteúdo bruto iniciado.', 'success');
  });
  const reset = el('button', { type: 'button', class: 'btn btn-danger', text: 'Reinicializar dados salvos' });
  reset.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reinicializar dados?',
      message: 'O conteúdo salvo neste navegador será apagado definitivamente. Recomenda-se baixar o conteúdo bruto antes.',
      confirmLabel: 'Apagar e reinicializar',
      danger: true,
    });
    if (!ok) return;
    const r = storage.reset();
    if (!r.ok) { announce(r.message, 'error'); return; }
    mode = 'ok';
    corruptInfo = null;
    store.replaceInMemory(emptyState(CATALOG_VERSION));
    location.hash = '#painel';
    render(true);
    announce('Dados reinicializados. O SecureTrack está vazio.', 'success');
  });
  main.append(el('div', { class: 'actions' }, dl, reset));
}

// ---------------------------------------------------------------- componentes comuns

function emptyStateBox(message) {
  const create = el('a', { href: '#projetos', class: 'btn btn-primary', text: 'Criar projeto' });
  const demo = el('button', { type: 'button', class: 'btn', text: 'Carregar demonstração' });
  demo.addEventListener('click', loadDemo);
  return el('div', { class: 'empty' },
    el('p', { text: message }),
    el('div', { class: 'actions' }, create, demo));
}

function projectSelect(id, onChange) {
  const s = state();
  const select = el('select', { id, name: 'project' },
    s.projects.map((p) => el('option', { value: p.id, text: p.name })));
  select.value = s.selectedProjectId || (s.projects[0] && s.projects[0].id) || '';
  select.addEventListener('change', () => {
    const next = selectProject(state(), select.value);
    // A seleção é uma preferência de navegação: se não puder ser salva, vale só nesta sessão.
    const r = store.commit(next);
    if (!r.ok) store.replaceInMemory(next);
    onChange();
  });
  return el('div', { class: 'field field-inline' }, el('label', { for: id, text: 'Projeto' }), select);
}

function selectedProject() {
  const s = state();
  return getProject(s, s.selectedProjectId) || s.projects[0] || null;
}

function indicatorCell(ind) {
  return el('span', { class: 'indicator-value', text: formatPercent(ind.percent) });
}

function groupTable(caption, rows, firstHeader) {
  return el('div', { class: 'table-wrap' }, el('table', { class: 'data' },
    el('caption', { text: caption }),
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col', text: firstHeader }),
      el('th', { scope: 'col', text: 'Indicador' }),
      el('th', { scope: 'col', class: 'col-bar' }, el('span', { class: 'visually-hidden', text: 'Barra' })),
      el('th', { scope: 'col', text: 'Cálculo' }))),
    el('tbody', {}, rows.map(({ name, ind }) => el('tr', {},
      el('th', { scope: 'row', text: name }),
      el('td', {}, indicatorCell(ind)),
      el('td', { class: 'col-bar' }, meter(ind.percent)),
      el('td', { class: 'calc', text: explainIndicator(ind) }))))));
}

// ---------------------------------------------------------------- dashboard

function renderPainel(main) {
  const s = state();
  main.append(el('h2', { text: 'Dashboard' }));
  if (!s.projects.length) {
    main.append(emptyStateBox('Nenhum projeto cadastrado ainda. Crie um projeto ou carregue a demonstração GuitarScore para conhecer a ferramenta.'));
    return;
  }

  // Visão geral: resultados individuais, sem média global.
  const overview = el('section', { class: 'card', 'aria-labelledby': 'ov-title' },
    el('h3', { id: 'ov-title', text: 'Visão geral' }),
    el('p', {}, 'Total de projetos: ', el('strong', { text: String(s.projects.length) })),
    el('p', { class: 'note', text: 'Cada projeto é mostrado individualmente. Não é calculada uma média entre projetos.' }),
    el('div', { class: 'table-wrap' }, el('table', { class: 'data' },
      el('caption', { class: 'visually-hidden', text: 'Indicador por projeto' }),
      el('thead', {}, el('tr', {},
        el('th', { scope: 'col', text: 'Projeto' }),
        el('th', { scope: 'col', text: 'Indicador de implementação — autodeclaração' }),
        el('th', { scope: 'col', text: 'Não avaliados' }),
        el('th', { scope: 'col', text: 'Evidência pendente' }),
        el('th', { scope: 'col', text: 'Detalhes' }))),
      el('tbody', {}, s.projects.map((p) => {
        const ind = projectIndicator(s, p.id);
        const btn = el('button', { type: 'button', class: 'btn btn-small', text: 'Ver no dashboard' });
        btn.append(el('span', { class: 'visually-hidden', text: `: ${p.name}` }));
        btn.addEventListener('click', () => {
          const next = selectProject(state(), p.id);
          if (!store.commit(next).ok) store.replaceInMemory(next);
          render(false);
          document.getElementById('detail-title')?.focus();
        });
        return el('tr', {},
          el('th', { scope: 'row', text: p.name }),
          el('td', {}, indicatorCell(ind), el('span', { class: 'muted', text: ` (${formatNumber(ind.numerator)} de ${ind.applicable})` })),
          el('td', { text: String(ind.counts.nao_avaliado) }),
          el('td', { text: String(ind.pendingEvidence) }),
          el('td', {}, btn));
      })))));
  main.append(overview);

  const project = selectedProject();
  const ind = projectIndicator(s, project.id);
  const detail = el('section', { class: 'card', 'aria-labelledby': 'detail-title' });
  append(detail,
    el('h3', { id: 'detail-title', tabindex: '-1' }, 'Projeto selecionado: ', el('span', { text: project.name })),
    projectSelect('dash-project', () => render(false)));

  // Indicador principal
  const big = el('div', { class: 'kpi-main' },
    el('p', { class: 'kpi-label', text: 'Indicador de implementação — autodeclaração' }),
    el('p', { class: 'kpi-value', text: formatPercent(ind.percent) }),
    meter(ind.percent),
    el('p', { class: 'calc' },
      el('strong', { text: 'Cálculo: ' }), explainIndicator(ind)),
    el('p', { class: 'calc' }, `Numerador: ${formatNumber(ind.numerator)} · Denominador (controles aplicáveis): ${ind.applicable} · ` +
      `Não aplicáveis excluídos: ${ind.counts.nao_aplicavel}`),
    el('p', { class: 'note', text: 'Fórmula: (implementados + 0,5 × parcialmente implementados) ÷ controles aplicáveis × 100. ' +
      'Não avaliados contam como 0 e permanecem no denominador; não aplicáveis são excluídos. ' +
      'Este resultado é uma autodeclaração sobre controles selecionados: não é nível de maturidade SAMM, índice de segurança, certificação nem percentual de conformidade.' }));

  const tiles = el('ul', { class: 'tiles' },
    tile('Controles não avaliados', ind.counts.nao_avaliado),
    tile('Implementados com evidência pendente', ind.pendingEvidence),
    tile('Pendências de prioridade alta', highPriorityPending(s, project.id).length));

  append(detail, big, tiles);

  // Distribuição
  const dist = el('div', { class: 'stack', 'aria-hidden': 'true' });
  for (const st of STATUSES) {
    const n = ind.counts[st];
    if (!n) continue;
    const seg = el('div', { class: `stack-seg status-${st}`, title: `${STATUS_LABELS[st]}: ${n}` });
    seg.style.width = `${(n / ind.total) * 100}%`;
    dist.append(seg);
  }
  append(detail,
    el('h4', { text: 'Distribuição das situações' }),
    dist,
    el('div', { class: 'table-wrap' }, el('table', { class: 'data' },
      el('caption', { class: 'visually-hidden', text: 'Distribuição das situações' }),
      el('thead', {}, el('tr', {},
        el('th', { scope: 'col', text: 'Situação' }),
        el('th', { scope: 'col', text: 'Quantidade' }),
        el('th', { scope: 'col', text: '% do total de controles' }))),
      el('tbody', {}, STATUSES.map((st) => el('tr', {},
        el('th', { scope: 'row' }, statusBadge(st, STATUS_LABELS[st])),
        el('td', { text: String(ind.counts[st]) }),
        el('td', { text: formatPercent((ind.counts[st] / ind.total) * 100) })))),
      el('tfoot', {}, el('tr', {}, el('th', { scope: 'row', text: 'Total' }), el('td', { text: String(ind.total) }), el('td', { text: '' }))))));

  // Por área
  append(detail,
    el('h4', { text: 'Resultado por área' }),
    groupTable('Indicador por área (somente controles da área)',
      indicatorsByArea(s, project.id).map((r) => ({ name: r.area.name, ind: r.indicator })), 'Área'));

  // Por framework
  append(detail,
    el('h4', { text: 'Resultado por framework (recorte)' }),
    el('p', { class: 'note', text: 'Cada linha considera apenas os controles do SecureTrack relacionados àquele referencial. ' +
      'Os recortes não cobrem todo o referencial, se sobrepõem e não devem ser somados.' }),
    groupTable('Indicador por recorte de framework',
      indicatorsByFramework(s, project.id).map((r) => ({ name: r.framework.name, ind: r.indicator })), 'Framework'));

  // Pendências alta
  const high = highPriorityPending(s, project.id);
  append(detail,
    el('h4', { text: 'Pendências de prioridade alta' }),
    high.length
      ? el('ul', { class: 'list' }, high.map(({ control, assessment }) => el('li', {},
        el('strong', { text: `${control.id} ` }), control.title, ' — ', statusBadge(assessment.status, STATUS_LABELS[assessment.status]))))
      : el('p', { text: 'Nenhuma pendência de prioridade alta.' }));

  // Próximas ações
  const actions = nextActions(s, project.id, 5);
  append(detail,
    el('h4', { text: 'Próximas ações de melhoria' }),
    actions.length
      ? el('ol', { class: 'list' }, actions.map((it) => el('li', {},
        el('strong', { text: `${it.controlId} — ${it.controlTitle}` }),
        ` (prioridade ${PRIORITY_LABELS[it.priority].toLowerCase()}): `,
        it.action ? el('span', { text: it.action }) : el('em', { class: 'todo', text: 'Definir ação' }))))
      : el('p', { text: 'Nenhuma ação: não há controles não implementados ou parcialmente implementados.' }),
    el('p', {}, el('a', { href: '#plano', text: 'Ver plano de melhorias completo' })));

  main.append(detail);
}

function tile(label, value) {
  return el('li', { class: 'tile' }, el('span', { class: 'tile-value', text: String(value) }), el('span', { class: 'tile-label', text: label }));
}

// ---------------------------------------------------------------- projetos

function renderProjetos(main) {
  const s = state();
  const editing = editingProjectId ? getProject(s, editingProjectId) : null;
  if (editingProjectId && !editing) editingProjectId = null;
  main.append(el('h2', { text: 'Projetos' }));

  const form = el('form', { class: 'card form', novalidate: true, 'aria-labelledby': 'pf-title' });
  append(form,
    el('h3', { id: 'pf-title', text: editing ? `Editar projeto: ${editing.name}` : 'Novo projeto' }),
    el('p', { class: 'note', text: 'Não registre credenciais, tokens, dados pessoais ou detalhes confidenciais de vulnerabilidades.' }),
    field({ id: 'pf-name', name: 'name', label: 'Nome', required: true, maxlength: LIMITS.projectName, value: editing?.name || '', hint: `Até ${LIMITS.projectName} caracteres.` }),
    field({ id: 'pf-description', name: 'description', label: 'Descrição', kind: 'textarea', maxlength: LIMITS.projectDescription, value: editing?.description || '', hint: `Opcional. Até ${LIMITS.projectDescription.toLocaleString('pt-BR')} caracteres.` }),
    field({ id: 'pf-url', name: 'repositoryUrl', label: 'URL do repositório', type: 'url', maxlength: LIMITS.url, value: editing?.repositoryUrl || '', hint: 'Opcional. Somente endereços https://. O SecureTrack não acessa o link.' }),
    field({ id: 'pf-tech', name: 'technologies', label: 'Tecnologias', maxlength: LIMITS.technologies, value: editing?.technologies || '', hint: `Opcional. Até ${LIMITS.technologies} caracteres.` }),
    el('p', { class: 'field-error', 'data-error-for': 'form', hidden: true }));
  const submit = el('button', { type: 'submit', class: 'btn btn-primary', text: editing ? 'Salvar alterações' : 'Criar projeto' });
  const actions = el('div', { class: 'actions' }, submit);
  if (editing) {
    const cancel = el('button', { type: 'button', class: 'btn', text: 'Cancelar edição' });
    cancel.addEventListener('click', () => { editingProjectId = null; render(false); document.getElementById('pf-name').focus(); });
    actions.append(cancel);
  }
  form.append(actions);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = {
      name: form.elements.name.value,
      description: form.elements.description.value,
      repositoryUrl: form.elements.repositoryUrl.value,
      technologies: form.elements.technologies.value,
    };
    const result = editing ? updateProject(state(), editing.id, input) : createProject(state(), input);
    if (!result.ok) { showFormErrors(form, result.errors); return; }
    clearFormErrors(form);
    if (!commit(result.state, editing ? `Projeto "${result.project.name}" atualizado.` : `Projeto "${result.project.name}" criado.`)) return;
    editingProjectId = null;
    render(false);
    document.getElementById('projects-title')?.focus();
  });
  main.append(form);

  const list = el('section', { class: 'card', 'aria-labelledby': 'projects-title' },
    el('h3', { id: 'projects-title', tabindex: '-1', text: `Projetos cadastrados (${s.projects.length} de ${MAX_PROJECTS})` }));
  if (!s.projects.length) {
    list.append(emptyStateBox('Nenhum projeto cadastrado. Use o formulário acima ou carregue a demonstração.'));
  } else {
    const table = el('table', { class: 'data' },
      el('caption', { class: 'visually-hidden', text: 'Projetos cadastrados' }),
      el('thead', {}, el('tr', {},
        el('th', { scope: 'col', text: 'Nome' }),
        el('th', { scope: 'col', text: 'Descrição e tecnologias' }),
        el('th', { scope: 'col', text: 'Repositório' }),
        el('th', { scope: 'col', text: 'Criado / atualizado' }),
        el('th', { scope: 'col', text: 'Ações' }))),
      el('tbody', {}, s.projects.map((p) => projectRow(p))));
    list.append(el('div', { class: 'table-wrap' }, table));
  }
  main.append(list);
}

function projectRow(p) {
  const edit = el('button', { type: 'button', class: 'btn btn-small', text: 'Editar' });
  edit.append(el('span', { class: 'visually-hidden', text: ` ${p.name}` }));
  edit.addEventListener('click', () => {
    editingProjectId = p.id;
    render(false);
    document.getElementById('pf-name').focus();
  });
  const assess = el('button', { type: 'button', class: 'btn btn-small', text: 'Avaliar' });
  assess.append(el('span', { class: 'visually-hidden', text: ` ${p.name}` }));
  assess.addEventListener('click', () => {
    const next = selectProject(state(), p.id);
    if (!store.commit(next).ok) store.replaceInMemory(next);
    location.hash = '#avaliacao';
  });
  const del = el('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Excluir' });
  del.append(el('span', { class: 'visually-hidden', text: ` ${p.name}` }));
  del.addEventListener('click', async () => {
    const n = countAssessments(state(), p.id);
    const ok = await confirmDialog({
      title: 'Excluir projeto?',
      message: `O projeto "${p.name}" e suas ${n} avaliação(ões) registrada(s) serão excluídos deste navegador. Esta ação não pode ser desfeita. Considere exportar um backup antes.`,
      confirmLabel: 'Excluir projeto',
      danger: true,
    });
    if (!ok) return;
    const result = deleteProject(state(), p.id);
    if (!result.ok) { announce(result.errors.form, 'error'); return; }
    if (editingProjectId === p.id) editingProjectId = null;
    if (commit(result.state, `Projeto "${p.name}" excluído.`)) {
      render(false);
      document.getElementById('projects-title')?.focus();
    }
  });
  return el('tr', {},
    el('th', { scope: 'row', text: p.name }),
    el('td', {},
      p.description ? el('p', { class: 'pre', text: p.description }) : el('span', { class: 'muted', text: 'Sem descrição' }),
      p.technologies ? el('p', { class: 'muted' }, 'Tecnologias: ', el('span', { text: p.technologies })) : null),
    el('td', {}, p.repositoryUrl ? externalLink(p.repositoryUrl, 'Abrir repositório') : el('span', { class: 'muted', text: '—' })),
    el('td', { text: `${formatDateTime(p.createdAt)} / ${formatDateTime(p.updatedAt)}` }),
    el('td', {}, el('div', { class: 'row-actions' }, edit, assess, del)));
}

// ---------------------------------------------------------------- avaliação

function renderAvaliacao(main) {
  const s = state();
  main.append(el('h2', { text: 'Avaliação de controles' }));
  if (!s.projects.length) {
    main.append(emptyStateBox('Cadastre um projeto para começar a avaliação.'));
    return;
  }
  const project = selectedProject();
  const byControl = assessmentsByControl(s, project.id);
  const evaluated = CONTROLS.filter((c) => byControl.get(c.id).status !== 'nao_avaliado').length;
  append(main,
    projectSelect('ev-project', () => render(false)),
    el('p', { id: 'ev-progress', class: 'progress-text', text: `${evaluated} de ${CONTROLS.length} controles avaliados em "${project.name}". Cada controle é salvo separadamente.` }),
    el('p', { class: 'note', text: 'Evidências são autodeclaradas. A presença de texto ou link não comprova que a evidência é suficiente, e o SecureTrack não acessa nem verifica links.' }));

  for (const area of AREAS) {
    const section = el('section', { class: 'area', 'aria-labelledby': `area-${area.id}` },
      el('h3', { id: `area-${area.id}`, text: area.name }));
    for (const control of CONTROLS.filter((c) => c.area === area.id)) {
      section.append(controlCard(project, control));
    }
    main.append(section);
  }
}

function controlCard(project, control) {
  const a = getAssessment(state(), project.id, control.id);
  const p = `c-${control.id}`;
  const card = el('article', { class: 'control', id: p, 'aria-labelledby': `${p}-title` });
  const header = el('header', { class: 'control-head' },
    el('h4', { id: `${p}-title` }, el('span', { class: 'cid', text: control.id }), ' ', control.title),
    el('div', { class: 'badges' },
      statusBadge(a.status, STATUS_LABELS[a.status]),
      hasPendingEvidence(a) ? el('span', { class: 'badge badge-warn' }, el('span', { 'aria-hidden': 'true', text: '⚠' }), ' Evidência pendente') : null,
      a.status !== 'nao_avaliado' && !hasPendingEvidence(a) && (a.evidenceText || a.evidenceUrl)
        ? el('span', { class: 'badge badge-info', text: 'Evidência informada (não validada)' }) : null));
  const info = el('details', { class: 'control-info' },
    el('summary', { text: 'Descrição, orientação e referências' }),
    el('p', {}, el('strong', { text: 'Descrição: ' }), control.description),
    el('p', {}, el('strong', { text: 'Como avaliar: ' }), control.guidance),
    el('p', {}, el('strong', { text: 'Exemplos de evidência:' })),
    el('ul', {}, control.evidenceExamples.map((x) => el('li', { text: x }))),
    el('p', {}, el('strong', { text: `Área: ` }), areaName(control.area), ' · ', el('strong', { text: 'Prioridade padrão: ' }), PRIORITY_LABELS[control.defaultPriority]),
    el('p', {}, el('strong', { text: 'Relacionamentos (aproximações, não equivalências):' })),
    el('ul', { class: 'rels' }, control.relationships.map((r) => el('li', {},
      el('span', { class: 'fw', text: frameworkName(r.framework) }), ': ',
      externalLink(r.sourceUrl, r.reference),
      el('span', { class: r.status === 'conferido' ? 'tag tag-ok' : 'tag tag-pend', text: r.status === 'conferido' ? ' referência conferida' : ' pendente de confirmação' }),
      el('br'),
      el('span', { class: 'muted', text: `Interpretação: ${r.interpretation}` })))));

  const form = el('form', { class: 'form', novalidate: true });
  const statusFs = el('fieldset', { class: 'status-group', 'aria-describedby': `${p}-status-error` },
    el('legend', { text: 'Situação' }),
    STATUSES.map((st) => {
      const id = `${p}-st-${st}`;
      const input = el('input', { type: 'radio', name: 'status', id, value: st });
      input.checked = a.status === st;
      return el('div', { class: 'radio' }, input, el('label', { for: id }, statusBadge(st, STATUS_LABELS[st])));
    }),
    el('p', { class: 'field-error', id: `${p}-status-error`, 'data-error-for': 'status', hidden: true }));
  append(form,
    statusFs,
    field({ id: `${p}-ev`, name: 'evidenceText', label: 'Descrição da evidência', kind: 'textarea', maxlength: LIMITS.evidenceText, value: a.evidenceText, hint: `Opcional, até ${LIMITS.evidenceText.toLocaleString('pt-BR')} caracteres. Descreva onde a evidência está; não cole segredos nem detalhes confidenciais.` }),
    field({ id: `${p}-evurl`, name: 'evidenceUrl', label: 'Link da evidência', type: 'url', maxlength: LIMITS.url, value: a.evidenceUrl, hint: 'Opcional. Somente https://. O link não é acessado nem verificado.' }),
    field({ id: `${p}-just`, name: 'justification', label: 'Justificativa', kind: 'textarea', maxlength: LIMITS.justification, value: a.justification, hint: `Obrigatória para "Não aplicável". Até ${LIMITS.justification.toLocaleString('pt-BR')} caracteres.` }),
    field({ id: `${p}-act`, name: 'action', label: 'Ação de melhoria', kind: 'textarea', maxlength: LIMITS.action, value: a.action, hint: `Opcional. Até ${LIMITS.action.toLocaleString('pt-BR')} caracteres.` }),
    field({ id: `${p}-prio`, name: 'priority', label: 'Prioridade', kind: 'select', value: a.priority, options: PRIORITIES.map((x) => ({ value: x, label: PRIORITY_LABELS[x] })) }),
    el('p', { class: 'field-error', 'data-error-for': 'form', hidden: true }));
  const save = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Salvar avaliação' });
  save.append(el('span', { class: 'visually-hidden', text: ` de ${control.id}` }));
  const meta = el('p', { class: 'muted', text: a.updatedAt ? `Última atualização: ${formatDateTime(a.updatedAt)}` : 'Ainda não salvo.' });
  if (a.evidenceUrl) meta.append(' · ', externalLink(a.evidenceUrl, 'Abrir link da evidência (não verificado)'));
  form.append(el('div', { class: 'actions' }, save), meta);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const checked = form.querySelector('input[name="status"]:checked');
    const input = {
      status: checked ? checked.value : '',
      evidenceText: form.elements.evidenceText.value,
      evidenceUrl: form.elements.evidenceUrl.value,
      justification: form.elements.justification.value,
      action: form.elements.action.value,
      priority: form.elements.priority.value,
    };
    const result = saveAssessment(state(), project.id, control.id, input);
    if (!result.ok) { showFormErrors(form, result.errors); return; }
    if (!commit(result.state, `Avaliação de ${control.id} salva.`)) return;
    // Substitui apenas este cartão, preservando edições não salvas nos demais.
    const fresh = controlCard(project, control);
    card.replaceWith(fresh);
    const s2 = state();
    const byControl = assessmentsByControl(s2, project.id);
    const evaluated = CONTROLS.filter((c) => byControl.get(c.id).status !== 'nao_avaliado').length;
    const prog = document.getElementById('ev-progress');
    if (prog) prog.textContent = `${evaluated} de ${CONTROLS.length} controles avaliados em "${project.name}". Cada controle é salvo separadamente.`;
    fresh.querySelector('button[type="submit"]').focus();
  });

  append(card, header, info, form);
  return card;
}

// ---------------------------------------------------------------- plano de melhorias

function renderPlano(main) {
  const s = state();
  main.append(el('h2', { text: 'Plano de melhorias' }));
  if (!s.projects.length) {
    main.append(emptyStateBox('Sem projetos, não há plano de melhorias.'));
    return;
  }
  if (planFilters.projectId && !getProject(s, planFilters.projectId)) planFilters.projectId = '';

  const filters = el('form', { class: 'card filters', 'aria-labelledby': 'flt-title', novalidate: true },
    el('h3', { id: 'flt-title', text: 'Filtros' }),
    el('div', { class: 'filter-grid' },
      field({ id: 'f-project', name: 'projectId', label: 'Projeto', kind: 'select', value: planFilters.projectId,
        options: [{ value: '', label: 'Todos' }, ...s.projects.map((p) => ({ value: p.id, label: p.name }))] }),
      field({ id: 'f-area', name: 'areaId', label: 'Área', kind: 'select', value: planFilters.areaId,
        options: [{ value: '', label: 'Todas' }, ...AREAS.map((a) => ({ value: a.id, label: a.name }))] }),
      field({ id: 'f-status', name: 'status', label: 'Situação', kind: 'select', value: planFilters.status,
        options: [{ value: '', label: 'Todas' }, { value: 'nao_implementado', label: STATUS_LABELS.nao_implementado }, { value: 'parcial', label: STATUS_LABELS.parcial }] }),
      field({ id: 'f-priority', name: 'priority', label: 'Prioridade', kind: 'select', value: planFilters.priority,
        options: [{ value: '', label: 'Todas' }, ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))] })));
  const results = el('div', { id: 'plan-results' });
  filters.addEventListener('change', () => {
    planFilters.projectId = filters.elements.projectId.value;
    planFilters.areaId = filters.elements.areaId.value;
    planFilters.status = filters.elements.status.value;
    planFilters.priority = filters.elements.priority.value;
    renderPlanResults(results);
  });
  filters.addEventListener('submit', (e) => e.preventDefault());
  main.append(filters, results);
  renderPlanResults(results);
}

function renderPlanResults(container) {
  const s = state();
  clear(container);
  const actions = improvementItems(s, { kind: 'acao', ...planFilters });
  const pending = improvementItems(s, { kind: 'pendente', projectId: planFilters.projectId, areaId: planFilters.areaId, priority: planFilters.priority });
  const live = el('p', { class: 'visually-hidden', role: 'status', text: `${actions.length} ação(ões) e ${pending.length} avaliação(ões) pendente(s) com os filtros atuais.` });
  container.append(live);

  const sec1 = el('section', { class: 'card', 'aria-labelledby': 'acts-title' },
    el('h3', { id: 'acts-title', text: `Ações de melhoria (${actions.length})` }),
    el('p', { class: 'note', text: 'Controles não implementados ou parcialmente implementados, ordenados por prioridade (alta → baixa), depois por projeto, área e ID do controle.' }));
  sec1.append(actions.length ? planTable(actions, true) : el('p', { text: 'Nenhuma ação encontrada com os filtros atuais.' }));

  const sec2 = el('section', { class: 'card', 'aria-labelledby': 'pend-title' },
    el('h3', { id: 'pend-title', text: `Avaliações pendentes (${pending.length})` }),
    el('p', { class: 'note', text: 'Controles ainda não avaliados. O filtro de situação não se aplica a esta lista.' }));
  sec2.append(pending.length ? planTable(pending, false) : el('p', { text: 'Nenhuma avaliação pendente com os filtros atuais.' }));
  container.append(sec1, sec2);
}

function planTable(items, withAction) {
  return el('div', { class: 'table-wrap' }, el('table', { class: 'data' },
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col', text: 'Projeto' }),
      el('th', { scope: 'col', text: 'Controle' }),
      el('th', { scope: 'col', text: 'Área' }),
      el('th', { scope: 'col', text: 'Situação' }),
      el('th', { scope: 'col', text: 'Prioridade' }),
      withAction ? el('th', { scope: 'col', text: 'Ação' }) : null)),
    el('tbody', {}, items.map((it) => el('tr', {},
      el('td', { text: it.projectName }),
      el('th', { scope: 'row', text: `${it.controlId} — ${it.controlTitle}` }),
      el('td', { text: areaName(it.areaId) }),
      el('td', {}, statusBadge(it.status, STATUS_LABELS[it.status])),
      el('td', {}, el('span', { class: `prio prio-${it.priority}`, text: PRIORITY_LABELS[it.priority] })),
      withAction ? el('td', {}, it.action ? el('span', { class: 'pre', text: it.action }) : el('em', { class: 'todo', text: 'Definir ação' })) : null)))));
}

// ---------------------------------------------------------------- dados

function renderDados(main) {
  const s = state();
  main.append(el('h2', { text: 'Backup e dados' }));
  main.append(el('section', { class: 'card callout', 'aria-labelledby': 'priv-title' },
    el('h3', { id: 'priv-title', text: 'Onde ficam os dados' }),
    el('ul', {},
      el('li', { text: 'Os dados ficam somente neste navegador, neste dispositivo (localStorage). Não há servidor nem sincronização.' }),
      el('li', { text: 'Não há garantia de confidencialidade: outras pessoas ou extensões com acesso a este navegador podem ler os dados. Não registre credenciais, tokens, dados pessoais nem detalhes confidenciais de vulnerabilidades.' }),
      el('li', { text: 'Limpar os dados do navegador apaga as avaliações. Exporte backups regularmente.' }))));

  // Exportar
  const exp = el('button', { type: 'button', class: 'btn btn-primary', text: 'Exportar backup (JSON)' });
  exp.disabled = !s.projects.length;
  exp.addEventListener('click', () => {
    downloadText(exportFileName(), serializeExport(state()));
    announce('Exportação gerada. Guarde o arquivo em local seguro.', 'success');
  });
  main.append(el('section', { class: 'card', 'aria-labelledby': 'exp-title' },
    el('h3', { id: 'exp-title', text: 'Exportar' }),
    el('p', { text: 'O arquivo contém versão do formato, versão do catálogo, data da exportação, projetos e avaliações. O catálogo de controles não é exportado.' }),
    s.projects.length ? null : el('p', { class: 'muted', text: 'Não há dados para exportar.' }),
    exp));

  // Importar
  const importSection = el('section', { class: 'card', 'aria-labelledby': 'imp-title' },
    el('h3', { id: 'imp-title', text: 'Importar (substitui todos os dados)' }),
    el('p', { text: `Aceita arquivos exportados pelo SecureTrack, até 1 MB e ${MAX_PROJECTS} projetos. A importação substitui os dados atuais; não há mesclagem nesta versão.` }));
  const form = el('form', { class: 'form', novalidate: true });
  append(form,
    el('div', { class: 'field' },
      el('label', { for: 'imp-file', text: 'Arquivo de backup (.json)' }),
      el('input', { type: 'file', id: 'imp-file', name: 'file', accept: '.json,application/json', 'aria-describedby': 'imp-file-error' }),
      el('p', { class: 'field-error', id: 'imp-file-error', 'data-error-for': 'file', hidden: true })),
    el('div', { class: 'actions' }, el('button', { type: 'submit', class: 'btn', text: 'Validar arquivo' })));
  const resultBox = el('div', { id: 'import-result' });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);
    clear(resultBox);
    pendingImport = null;
    const file = form.elements.file.files[0];
    if (!file) { showFormErrors(form, { file: 'Selecione um arquivo.' }); return; }
    if (file.size > MAX_IMPORT_BYTES) { showFormErrors(form, { file: 'O arquivo excede o limite de 1 MB.' }); return; }
    let text;
    try { text = await file.text(); } catch { showFormErrors(form, { file: 'Não foi possível ler o arquivo.' }); return; }
    const parsed = parseImport(text);
    if (!parsed.ok) {
      resultBox.append(el('div', { class: 'callout callout-error', role: 'alert' },
        el('p', { text: 'Importação rejeitada. Nenhum dado foi alterado.' }),
        el('ul', {}, parsed.errors.map((m) => el('li', { text: m })))));
      return;
    }
    pendingImport = parsed;
    showImportSummary(resultBox, parsed);
  });
  importSection.append(form, resultBox);
  main.append(importSection);

  // Demonstração
  const demoBtn = el('button', { type: 'button', class: 'btn', text: 'Carregar demonstração' });
  demoBtn.addEventListener('click', loadDemo);
  main.append(el('section', { class: 'card', 'aria-labelledby': 'demo-title' },
    el('h3', { id: 'demo-title', text: 'Demonstração GuitarScore' }),
    el('p', { text: 'Adiciona o projeto fictício "GuitarScore — demonstração", com dados simulados, aos dados atuais. Se já existir, a demonstração é substituída. Seus outros projetos não são alterados.' }),
    demoBtn));

  // Apagar tudo
  const wipe = el('button', { type: 'button', class: 'btn btn-danger', text: 'Apagar todos os dados' });
  wipe.disabled = !s.projects.length;
  wipe.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Apagar todos os dados?',
      message: `Todos os ${state().projects.length} projeto(s) e avaliações serão apagados deste navegador. Esta ação não pode ser desfeita. Exporte um backup antes.`,
      confirmLabel: 'Apagar tudo',
      danger: true,
    });
    if (!ok) return;
    if (commit(emptyState(CATALOG_VERSION), 'Todos os dados foram apagados.')) render(false);
  });
  main.append(el('section', { class: 'card', 'aria-labelledby': 'wipe-title' },
    el('h3', { id: 'wipe-title', text: 'Apagar dados' }), wipe));
}

function showImportSummary(box, parsed) {
  const { summary } = parsed;
  const confirmBtn = el('button', { type: 'button', class: 'btn btn-danger', text: 'Substituir dados atuais' });
  const cancelBtn = el('button', { type: 'button', class: 'btn', text: 'Cancelar importação' });
  const panel = el('div', { class: 'callout', role: 'region', 'aria-labelledby': 'imp-sum-title', tabindex: '-1' },
    el('h4', { id: 'imp-sum-title', text: 'Arquivo válido — confirme a substituição' }),
    el('ul', {},
      el('li', { text: `Exportado em: ${formatDateTime(summary.exportedAt)}` }),
      el('li', { text: `Versão do catálogo: ${summary.catalogVersion}` }),
      el('li', { text: `Projetos: ${summary.projectCount}` }),
      el('li', { text: `Avaliações registradas: ${summary.assessmentCount}` })),
    summary.projectNames.length ? el('p', { text: 'Projetos no arquivo:' }) : null,
    summary.projectNames.length ? el('ul', {}, summary.projectNames.slice(0, 10).map((n) => el('li', { text: n })),
      summary.projectNames.length > 10 ? el('li', { text: `… e mais ${summary.projectNames.length - 10}` }) : null) : null,
    el('p', { class: 'warn', text: `Os ${state().projects.length} projeto(s) atuais e suas avaliações serão substituídos.` }),
    el('div', { class: 'actions' }, cancelBtn, confirmBtn));
  cancelBtn.addEventListener('click', () => {
    pendingImport = null;
    clear(box);
    announce('Importação cancelada. Nenhum dado foi alterado.', 'info');
    document.getElementById('imp-file')?.focus();
  });
  confirmBtn.addEventListener('click', () => {
    if (!pendingImport) return;
    const next = pendingImport.state;
    pendingImport = null;
    if (!commit(next, `Importação concluída: ${next.projects.length} projeto(s) restaurado(s).`)) {
      clear(box);
      box.append(el('div', { class: 'callout callout-error', role: 'alert' },
        el('p', { text: 'A importação não foi salva. Os dados anteriores foram preservados.' })));
      return;
    }
    editingProjectId = null;
    location.hash = '#painel';
    render(true);
  });
  box.append(panel);
  panel.focus();
}

// ---------------------------------------------------------------- demonstração

async function loadDemo() {
  let parsed;
  try {
    const resp = await fetch(new URL('../data/demo.json', import.meta.url), { cache: 'no-store', credentials: 'same-origin' });
    if (!resp.ok) throw new Error();
    parsed = parseImport(await resp.text());
  } catch {
    announce('Não foi possível carregar o arquivo de demonstração.', 'error');
    return;
  }
  if (!parsed.ok) { announce('O arquivo de demonstração é inválido.', 'error'); return; }
  const demoProject = parsed.state.projects[0];
  const s = state();
  const exists = s.projects.some((p) => p.id === demoProject.id);
  const nameClash = s.projects.some((p) => p.id !== demoProject.id && p.name.toLocaleLowerCase('pt-BR') === demoProject.name.toLocaleLowerCase('pt-BR'));
  if (nameClash) { announce('Já existe outro projeto com o nome da demonstração. Renomeie-o antes de carregar.', 'error'); return; }
  const others = s.projects.filter((p) => p.id !== demoProject.id);
  if (others.length >= MAX_PROJECTS) { announce(`Limite de ${MAX_PROJECTS} projetos atingido.`, 'error'); return; }
  if (s.projects.length) {
    const ok = await confirmDialog({
      title: 'Carregar demonstração?',
      message: exists
        ? 'O projeto de demonstração já existe e será substituído pela versão original, descartando alterações feitas nele. Seus outros projetos não serão alterados.'
        : 'O projeto fictício "GuitarScore — demonstração" será adicionado aos seus dados. Seus projetos não serão alterados.',
      confirmLabel: exists ? 'Substituir demonstração' : 'Adicionar demonstração',
    });
    if (!ok) return;
  }
  const next = {
    ...s,
    projects: [...others, demoProject],
    assessments: [...s.assessments.filter((a) => a.projectId !== demoProject.id), ...parsed.state.assessments],
    selectedProjectId: demoProject.id,
  };
  if (commit(next, 'Demonstração GuitarScore carregada. Todos os dados dela são simulados.')) {
    if (currentRoute() === 'painel' || !currentRoute()) render(true);
    else location.hash = '#painel';
  }
}

// ---------------------------------------------------------------- sobre

function renderSobre(main) {
  append(main,
    el('h2', { text: 'Sobre e referências' }),
    el('section', { class: 'card' },
      el('h3', { text: 'O que é o SecureTrack' }),
      el('p', { text: 'Ferramenta educacional de autoavaliação de práticas de desenvolvimento seguro (S-SDLC), criada como mini-projeto acadêmico.' }),
      el('p', { class: 'warn', text: 'Os resultados não representam auditoria, certificação, comprovação de segurança, conformidade integral nem pontuação oficial dos frameworks. ' +
        'O SecureTrack não analisa código, não faz varredura de vulnerabilidades e não consulta repositórios.' })),
    el('section', { class: 'card' },
      el('h3', { text: 'Indicador de implementação — autodeclaração' }),
      el('p', { text: 'Implementação (%) = (implementados + 0,5 × parcialmente implementados) ÷ controles aplicáveis × 100.' }),
      el('ul', {},
        el('li', { text: 'Implementado: peso 1 (inclusive sem evidência, por ser autodeclaração; a pendência fica destacada).' }),
        el('li', { text: 'Parcialmente implementado: peso 0,5.' }),
        el('li', { text: 'Não implementado e não avaliado: peso 0; permanecem no denominador.' }),
        el('li', { text: 'Não aplicável: excluído do denominador.' }),
        el('li', { text: 'Sem controles aplicáveis: "Sem base para cálculo".' }),
        el('li', { text: 'Somente a exibição é arredondada, com uma casa decimal.' }))),
    el('section', { class: 'card' },
      el('h3', { text: 'Referenciais usados' }),
      el('p', { text: `Catálogo de controles versão ${CATALOG_VERSION}, com ${CONTROLS.length} controles didáticos definidos pelo SecureTrack. Fontes consultadas em ${REFERENCES_CHECKED_ON.split('-').reverse().join('/')}.` }),
      el('ul', {}, FRAMEWORKS.map((f) => el('li', {}, externalLink(f.url, f.name)))),
      el('p', { class: 'note', text: 'Os relacionamentos entre controles e práticas são aproximações documentadas pelo SecureTrack, não equivalências normativas. Detalhes em docs/REFERENCIAS.md no repositório.' })),
    el('section', { class: 'card' },
      el('h3', { text: 'Privacidade' }),
      el('p', { text: 'Sem servidor, login, telemetria, APIs externas ou bibliotecas de terceiros. Os dados ficam apenas neste navegador.' })),
  );
}

// Evita uso antes do DOM estar pronto (módulos já são adiados, mas por segurança):
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
