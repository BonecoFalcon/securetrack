# Segurança do próprio SecureTrack

Este documento descreve as práticas de S-SDLC aplicadas ao desenvolvimento do SecureTrack, com evidências no código e nos testes. Ele é uma autodescrição do projeto, não uma auditoria.

## Controles implementados

| # | Controle | Evidência no código | Evidência em teste |
|---|---|---|---|
| 1 | Entradas tratadas como não confiáveis (formulários, JSON, `localStorage`) | `js/validation.js`; `validateDataset()` em `js/transfer.js` usado pela importação e por `storage.load()` | `tests/validation.test.js`, `tests/transfer.test.js`, `tests/storage.test.js` |
| 2 | Validação no JavaScript além do HTML (`maxlength`, `type=url`) | `validateProjectFields`, `validateAssessmentFields`; formulários com `novalidate` para que a mesma regra valha sempre | `tests/validation.test.js` |
| 3 | Remoção de espaços nas extremidades e rejeição de obrigatórios vazios | `checkText()` | `tests/validation.test.js` ("remove espaços…") |
| 4 | Exibição segura com `createElement`/`textContent` | `el()` e `append()` em `js/ui.js`; `el()` recusa atributos `on*`, `style` e `srcdoc` | Inspeção estática em `tests/catalog-and-static.test.js`; navegador (docs/TESTES.md) |
| 5 | Sem `innerHTML`, `document.write`, `eval`, `new Function` | Todo `js/` | Teste "não usa innerHTML…" |
| 6 | URLs só `https:` validadas com a API `URL`; vazio permitido; sem usuário/senha na URL | `checkHttpsUrl()` | 15 casos em `tests/validation.test.js` |
| 7 | Links externos com `target="_blank"` + `rel="noopener noreferrer"` + `referrerpolicy="no-referrer"` | `externalLink()` em `js/ui.js` | Teste estático e navegador |
| 8 | Nenhum carregamento automático de conteúdo dos links | Links são só âncoras; não há `<img>`, `<iframe>` ou `fetch` de URLs do usuário | Teste "não faz requisições a terceiros" |
| 9 | IDs gerados pela aplicação (`crypto.getRandomValues`) e checagem de unicidade | `generateProjectId()`, `uniqueId()`; padrão validado na importação | `tests/projects-assessments.test.js`, `tests/transfer.test.js` |
| 10 | Estado persistido validado antes do uso | `createStorage().load()` | `tests/storage.test.js` |
| 11 | Falhas de armazenamento tratadas sem perda e sem falso sucesso | `save()` confere a gravação lendo de volta; `createStateContainer().commit()` só troca o estado após sucesso | `tests/storage.test.js` ("falhas de persistência…") |
| 12 | Recuperação de dados corrompidos | Tela de recuperação em `js/app.js`: download do bruto como `text/plain` via `Blob`; reinicialização com confirmação | Navegador (docs/TESTES.md) |
| 13 | Catálogo separado, versionado e imutável; não importável | `js/controls.js` com `Object.freeze`; exportação sem catálogo | `tests/catalog-and-static.test.js`, `tests/transfer.test.js` |
| 14 | Importação segura | Limite de 1 MB (antes e depois de ler), 50 projetos, campos permitidos, objetos novos, resumo e confirmação, substituição transacional | `tests/transfer.test.js`; navegador |
| 15 | Sem terceiros: fontes, scripts, imagens, APIs ou telemetria | `index.html` só referencia arquivos locais | Teste estático; navegador registrou zero requisições externas |
| 16 | CSP restritiva via meta | `index.html` | Teste estático; navegador sem violações |
| 17 | Avisos de privacidade | Seção "Onde ficam os dados" em Backup e dados; rodapé; README | Navegador |
| 18 | Repositório sem segredos | `.gitignore` cobre `.env`, chaves e backups; projeto não usa segredos | Inspeção |
| 19 | CI com privilégio mínimo | `.github/workflows/tests.yml`: `permissions: contents: read`, `persist-credentials: false`, ações por SHA completo, sem segredos | Inspeção |

## Content Security Policy

Política definida em `index.html`:

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self';
connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'
```

- `script-src 'self'` sem `unsafe-inline`/`unsafe-eval`: só módulos locais.
- `style-src 'self'`: só `css/styles.css`. As larguras das barras são definidas via CSSOM (`element.style.width`), o que a CSP não bloqueia.
- `connect-src 'self'`: só o `fetch` de `data/demo.json`.
- `form-action 'none'`: nenhum formulário envia dados; todos são tratados em JavaScript.

### O que depende de cabeçalhos HTTP da hospedagem

Uma CSP em `<meta>` **não** substitui cabeçalhos. Não podem ser garantidos pelo próprio código:

| Proteção | Por que não funciona via meta | Situação |
|---|---|---|
| `frame-ancestors` (anti-clickjacking) | Ignorada em meta pela especificação | Depende da hospedagem (cabeçalho CSP ou `X-Frame-Options`) |
| `report-uri` / `report-to` e `sandbox` | Ignoradas em meta | Não usadas |
| `X-Content-Type-Options: nosniff` | Só existe como cabeçalho | O `scripts/serve.js` envia; GitHub Pages: depende da plataforma |
| `Strict-Transport-Security` (HSTS) | Só cabeçalho | Depende da hospedagem e do HTTPS |
| `Referrer-Policy` | Há `<meta name="referrer" content="no-referrer">` | Coberto parcialmente pela meta |
| `Permissions-Policy`, `Cross-Origin-Opener-Policy` | Só cabeçalho | Depende da hospedagem |
| Proteção dos primeiros bytes antes da meta | A CSP só vale a partir de onde a meta aparece | A meta é o primeiro item útil do `<head>`, antes de qualquer script |

O GitHub Pages não permite configurar cabeçalhos personalizados. Quem precisar dessas proteções deve usar uma hospedagem que permita cabeçalhos.

## Relacionamento com os referenciais

Interpretação do SecureTrack sobre como as práticas acima se aproximam de práticas oficiais (mesmas fontes de docs/REFERENCIAS.md, consultadas em 18/10/2026):

| Prática aplicada no SecureTrack | NIST SSDF 1.1 | OWASP SAMM 2.0 | Microsoft SDL |
|---|---|---|---|
| Requisitos de segurança escritos (`docs/REQUISITOS.md`) | PO.1 (PO.1.2) | Security Requirements A | Practice 1 |
| Modelagem de ameaças STRIDE (`docs/AMEACAS.md`) | PW.1 (PW.1.1) | Threat Assessment B | Practice 3 |
| Validação, codificação de saída e tratamento de erros | PW.5 (PW.5.1) | — | — |
| Padrões seguros (CSP, só `https:`, sem terceiros) | PW.9 (PW.9.1) | Secure Architecture A (interpretação) | Practice 3 (padrões seguros) |
| Testes automatizados com casos negativos e CI | PW.8 (PW.8.2); PO.4 (PO.4.1) | Requirements-driven Testing A e B; Security Testing A | Practice 7 |
| Revisão de código (a cargo do aluno, ver USO-DA-IA.md) | PW.7 (PW.7.2) | — | Practice 6 |
| Ações do CI fixadas por SHA, sem dependências de execução | PW.4 (PW.4.1); PO.3 | Secure Build A e B | Practice 5 |
| Proteção do repositório e ausência de segredos | PS.1 (PS.1.1) | Secure Deployment B | Practice 6 |
| SECURITY.md e processo de relato | RV.1 (RV.1.1, RV.1.3) | Defect Management A | Practice 9 |
| Documentação de limitações | PW.9 (PW.9.2); PW.1 (PW.1.2) | — | — |

## Limitações e pendências

1. **Sem criptografia nem controle de acesso.** Quem acessa o navegador acessa os dados. Isso é intencional: criptografia improvisada daria falsa sensação de proteção.
2. **Meta CSP limitada** (ver tabela acima).
3. **Releases não assinadas.** A verificação de integridade das entregas depende do GitHub.
4. **Canal privado de vulnerabilidades não definido** (ver SECURITY.md).
5. **SHAs das ações do CI** foram obtidos com `git ls-remote` em 18/10/2026. Reconfira antes de publicar e ao atualizar.
6. **Inspeção estática por expressões regulares** é simples e pode ter falsos negativos. Ferramentas automáticas não garantem ausência de vulnerabilidades.
7. **Testes de navegador** foram feitos pela IA em Chromium headless. Firefox, Safari e leitores de tela não foram testados.
8. **Revisão humana do código** ainda não foi registrada.
