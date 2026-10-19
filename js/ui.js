// Utilitários de interface. Toda criação de conteúdo usa createElement e
// textContent. Este módulo não usa innerHTML, document.write, eval nem new Function.

const BLOCKED_ATTR = /^(on|style$|srcdoc$|formaction$)/i;

/**
 * Cria um elemento com atributos e filhos.
 * - attrs.text define textContent.
 * - attrs.class define className.
 * - Atributos de evento (on*) são recusados: use addEventListener.
 * - Filhos string viram nós de texto.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') node.textContent = String(value);
    else if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'href') setSafeHref(node, value);
    else if (BLOCKED_ATTR.test(key)) throw new Error(`Atributo não permitido: ${key}`);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  append(node, ...children);
  return node;
}

export function append(parent, ...children) {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  return parent;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Aceita apenas âncoras internas (#...), caminhos relativos do próprio app ou https:. */
function setSafeHref(node, value) {
  const v = String(value);
  if (v.startsWith('#')) { node.setAttribute('href', v); return; }
  let url;
  try { url = new URL(v, document.baseURI); } catch { return; }
  if (url.protocol === 'https:' || (url.origin === location.origin && url.protocol === location.protocol)) {
    node.setAttribute('href', url.href);
  }
}

/** Link externo seguro: somente https, nova aba, sem opener nem referrer. */
export function externalLink(href, text) {
  let url;
  try { url = new URL(href); } catch { return el('span', { text }); }
  if (url.protocol !== 'https:') return el('span', { text });
  const a = el('a', {
    href: url.href,
    target: '_blank',
    rel: 'noopener noreferrer',
    referrerpolicy: 'no-referrer',
    class: 'external',
  }, text);
  a.append(el('span', { class: 'visually-hidden', text: ' (abre em nova aba, site externo)' }));
  return a;
}

let liveTimer = null;
/**
 * Anuncia uma mensagem na região de status global (aria-live polite), que
 * permanece no DOM para que leitores de tela percebam a mudança.
 */
export function announce(message, kind = 'success') {
  const region = document.getElementById('global-status');
  if (!region) return;
  clear(region);
  region.className = `toast toast-${kind}`;
  region.append(el('p', { text: message }));
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { clear(region); region.className = 'toast'; }, 10000);
}

/** Diálogo de confirmação acessível com <dialog>. Retorna Promise<boolean>. */
export function confirmDialog({ title, message, details = [], confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const dialog = el('dialog', { class: 'confirm-dialog', 'aria-labelledby': 'confirm-title', 'aria-describedby': 'confirm-msg' });
    const cancelBtn = el('button', { type: 'button', class: 'btn', text: 'Cancelar' });
    const okBtn = el('button', { type: 'button', class: danger ? 'btn btn-danger' : 'btn btn-primary', text: confirmLabel });
    const list = details.length ? el('ul', { class: 'dialog-details' }, details.map((d) => el('li', { text: d }))) : null;
    append(dialog,
      el('h2', { id: 'confirm-title', text: title }),
      el('p', { id: 'confirm-msg', text: message }),
      list,
      el('div', { class: 'dialog-actions' }, cancelBtn, okBtn));
    document.body.append(dialog);
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      if (previous && typeof previous.focus === 'function' && previous.isConnected) previous.focus();
      resolve(value);
    };
    cancelBtn.addEventListener('click', () => finish(false));
    okBtn.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
    dialog.showModal();
    cancelBtn.focus();
  });
}

/** Baixa texto como arquivo, sem interpretar o conteúdo. */
export function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = el('a', { download: filename, class: 'visually-hidden' });
  a.setAttribute('href', url); // blob: URL gerada localmente
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Barra horizontal decorativa (o valor textual deve estar ao lado). */
export function meter(percent, label) {
  const wrap = el('div', { class: 'meter', 'aria-hidden': 'true' });
  const fill = el('div', { class: 'meter-fill' });
  if (percent === null) {
    wrap.classList.add('meter-empty');
  } else {
    fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }
  wrap.append(fill);
  if (label) wrap.title = label;
  return wrap;
}

export const STATUS_ICONS = Object.freeze({
  implementado: '✔',
  parcial: '½',
  nao_implementado: '✖',
  nao_avaliado: '?',
  nao_aplicavel: '—',
});

export function statusBadge(status, label) {
  return el('span', { class: `badge status-${status}` },
    el('span', { 'aria-hidden': 'true', text: STATUS_ICONS[status] || '' }), ' ', label);
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Marca um campo como inválido e mostra a mensagem logo abaixo dele. */
export function setFieldError(form, name, message) {
  const field = form.elements.namedItem(name);
  const errorEl = form.querySelector(`[data-error-for="${name}"]`);
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
  }
  const target = field && typeof field.setAttribute === 'function' ? field : null;
  if (target) {
    if (message) target.setAttribute('aria-invalid', 'true');
    else target.removeAttribute('aria-invalid');
  } else if (field && field.length) {
    for (const f of field) {
      if (message) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
    }
  }
}

export function clearFormErrors(form) {
  for (const e of form.querySelectorAll('[data-error-for]')) { e.textContent = ''; e.hidden = true; }
  for (const f of form.querySelectorAll('[aria-invalid]')) f.removeAttribute('aria-invalid');
}

/** Aplica erros {campo: msg} e move o foco para o primeiro campo inválido. */
export function showFormErrors(form, errors) {
  clearFormErrors(form);
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    setFieldError(form, name, msg);
    if (!first) {
      const f = form.elements.namedItem(name);
      first = f && f.length && !f.tagName ? f[0] : f;
    }
  }
  if (first && typeof first.focus === 'function') first.focus();
}

/**
 * Campo de formulário com label, dica e área de erro associados.
 * kind: 'input' | 'textarea' | 'select'
 */
export function field({ id, name, label, kind = 'input', type = 'text', value = '', maxlength, required = false, hint, options, rows = 3, autocomplete = 'off' }) {
  const hintId = hint ? `${id}-hint` : null;
  const errId = `${id}-error`;
  const describedBy = [hintId, errId].filter(Boolean).join(' ');
  let control;
  if (kind === 'textarea') {
    control = el('textarea', { id, name, rows, maxlength, required, 'aria-describedby': describedBy });
    control.value = value;
  } else if (kind === 'select') {
    control = el('select', { id, name, required, 'aria-describedby': describedBy },
      options.map((o) => el('option', { value: o.value, text: o.label })));
    control.value = value;
  } else {
    control = el('input', { id, name, type, maxlength, required, autocomplete, 'aria-describedby': describedBy, spellcheck: type === 'url' ? 'false' : undefined });
    control.value = value;
  }
  return el('div', { class: 'field' },
    el('label', { for: id }, label, required ? el('span', { class: 'req', text: ' (obrigatório)' }) : null),
    hint ? el('p', { class: 'hint', id: hintId, text: hint }) : null,
    control,
    el('p', { class: 'field-error', id: errId, 'data-error-for': name, hidden: true }));
}
