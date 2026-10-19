// Servidor HTTP estático mínimo para desenvolvimento local (sem dependências).
// Uso: node scripts/serve.js [porta]
// Serve o projeto em http://127.0.0.1:<porta>/ e também em
// http://127.0.0.1:<porta>/securetrack/ para simular hospedagem em subdiretório
// (como GitHub Pages). Escuta apenas em 127.0.0.1. Não use em produção.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8000);
const SUBDIR = '/securetrack';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
};
// Somente estes diretórios/arquivos são servidos.
const ALLOWED_TOP = new Set(['index.html', 'css', 'js', 'data', 'img']);

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método não permitido');
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Requisição inválida');
  }
  if (path === SUBDIR) { res.writeHead(301, { Location: SUBDIR + '/' }); return res.end(); }
  if (path.startsWith(SUBDIR + '/')) path = path.slice(SUBDIR.length);
  if (path.endsWith('/')) path += 'index.html';
  const rel = normalize(path).replace(/^([/\\])+/, '');
  const top = rel.split(/[/\\]/)[0];
  if (!ALLOWED_TOP.has(top) || rel.includes('..')) return send(res, 404, 'Não encontrado');
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT + sep)) return send(res, 404, 'Não encontrado');
  try {
    const info = await stat(file);
    if (!info.isFile()) return send(res, 404, 'Não encontrado');
    const body = await readFile(file);
    send(res, 200, req.method === 'HEAD' ? '' : body, TYPES[extname(file)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Não encontrado');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SecureTrack em http://127.0.0.1:${PORT}/`);
  console.log(`Simulação de subdiretório em http://127.0.0.1:${PORT}${SUBDIR}/`);
  console.log('Pressione Ctrl+C para encerrar.');
});
