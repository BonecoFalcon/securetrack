# Testes

Este documento separa o que foi **executado de fato**, o que foi **verificado por inspeção** e o que **ainda depende do aluno**. Nenhum resultado aqui foi estimado.

## 1. Testes automatizados (executados)

- Comando: `npm test` (equivale a `node --test`, executor nativo do Node.js).
- Ambiente: Node.js 22.22.0, Linux, sandbox da IA assistente, em 18/10/2026.
- Resultado: **100 testes, 16 suítes, 100 aprovados, 0 falhas** (duração aproximada de 0,8 s).

| Arquivo | Testes | Cobertura principal |
|---|---|---|
| `tests/scoring.test.js` | 21 | Todas as situações; peso 0,5; não aplicáveis fora do denominador; não avaliados no denominador; "Sem base para cálculo"; NaN/infinito; arredondamento só na exibição; recortes por área e framework; sem contagem duplicada; evidência pendente; plano de melhorias, filtros e ordenação estável |
| `tests/validation.test.js` | 29 | Limites de todos os campos; obrigatórios; espaços nas extremidades; 14 URLs rejeitadas (`javascript:`, `data:`, `file:`, `http:` etc.); datas; "não aplicável" sem justificativa; objetos com campos permitidos |
| `tests/transfer.test.js` | 19 | Exportação sem catálogo; ciclo exportar/importar; demonstração válida e simulada; JSON inválido; versões incompatíveis; IDs e nomes duplicados; controle desconhecido; avaliação duplicada; projeto inexistente; tipos, situações, prioridades, datas; campos extras e `__proto__`; 50 projetos; 1 MB |
| `tests/storage.test.js` | 11 | Backend simulado injetável; vazio, indisponível, corrompido (sem apagar), estrutura inválida; falta de espaço e falha de verificação preservando o estado; importação inválida ou com falha de gravação preservando dados; salvar uma avaliação sem perder as demais |
| `tests/projects-assessments.test.js` | 11 | Criar, editar, excluir; IDs; datas; nome duplicado; limite; avaliação inicial; salvar e substituir somente o controle |
| `tests/catalog-and-static.test.js` | 9 | Integridade do catálogo; fontes oficiais `https`; imutabilidade; inspeção estática (sem `innerHTML`, `eval` etc.; sem requisições externas; CSP; sem inline; `noopener`; caminhos relativos) |

Os testes de armazenamento usam `createMemoryBackend()` em vez do `localStorage` real.

**Limitação:** testes unitários não comprovam, sozinhos, a ausência de XSS na interface. A inspeção estática usa expressões regulares e pode ter falsos negativos.

## 2. Verificações em navegador automatizadas (executadas pela IA)

- Script: `tools/verificacao-navegador.cjs` (opcional, exige Playwright, que **não** é dependência do projeto).
- Ambiente: Chromium 141.0.7390.37 headless, Playwright 1.56.0, servidor `node scripts/serve.js 8123`, aplicação aberta em **`http://127.0.0.1:8123/securetrack/`** (subdiretório), em 18/10/2026.
- Resultado da última execução: **64 de 64 verificações aprovadas**.
- Histórico real: na primeira execução, 58 de 64 passaram. Uma falha era da aplicação: **rolagem horizontal em tela de 360 px** no Dashboard e em Projetos. A causa eram tabelas sem contêiner de rolagem e textos visualmente ocultos posicionados fora dele. Foi corrigida em `js/app.js` e `css/styles.css`. As outras 5 falhas eram erros do próprio script de verificação (seletores e ordem de passos), corrigidos no script.

| Procedimento | Resultado registrado |
|---|---|
| Criar, editar e excluir projeto (Esc cancela; confirmação exclui) | Aprovado |
| Nome só com espaços rejeitado, com erro junto ao campo e `aria-invalid` | Aprovado |
| Salvar e editar avaliações; "não aplicável" sem justificativa rejeitado; rascunho em outro cartão preservado | Aprovado |
| "Implementado" sem evidência exibe "Evidência pendente" | Aprovado |
| Recarregar a página mantém os dados | Aprovado |
| Dashboard com valores calculados manualmente: 1 implementado + 1 parcial + 1 N/A + 12 não avaliados → (1 + 0,5) ÷ 14 = **10,7%** | Exibido 10,7% e "1,5 ÷ 14" |
| Demonstração: (4 + 0,5 × 4) ÷ 14 = **42,9%**; SAMM (2 + 2) ÷ 10 = 40,0%; SDL (3 + 2) ÷ 12 = 41,7%; 3 não avaliados; 2 evidências pendentes | Valores exibidos iguais aos calculados |
| Plano de melhorias: filtros alteram resultados; demo com 7 ações e 3 pendentes; ordenação por prioridade; "Definir ação" | Aprovado |
| Exportar e restaurar (resumo, confirmação, substituição) | Aprovado |
| Cancelar importação não altera o `localStorage` | Aprovado |
| Importação com `javascript:` e com versão 99 rejeitada; dados preservados | Aprovado |
| `<img src=x onerror=alert(1)>` no formulário, em JSON importado e em `localStorage` corrompido exibido literalmente; nenhum `alert` e nenhum `<img src="x">` no DOM | Aprovado |
| Links `javascript:` rejeitados (repositório e evidência) | Aprovado |
| Links externos com `target="_blank"` e `rel="noopener noreferrer"` | Aprovado |
| Armazenamento indisponível: aviso; criar projeto mostra "Nada foi salvo" e não exibe sucesso | Aprovado |
| Cota excedida: mensagem de falta de espaço; dados anteriores preservados | Aprovado |
| Armazenamento corrompido: tela de recuperação, dados não apagados, download do bruto idêntico, reinicialização só após confirmação | Aprovado |
| Teclado: primeiro Tab no "Pular para o conteúdo"; foco com contorno visível; Enter em "Projetos" muda de seção e move foco para o título | Aprovado |
| Tela de 360 × 740: sem rolagem horizontal nas 6 seções | Aprovado (após correção) |
| Funcionamento em subdiretório `/securetrack/` | Aprovado |
| Violações de CSP (evento `securitypolicyviolation`), requisições externas, erros de JavaScript e avisos no console | Nenhum registrado |

**Limitações:** um único navegador (Chromium), em modo headless e automatizado. A ausência de requisições externas foi medida nas requisições feitas pela página; durante a execução, o próprio Chromium tentou conexões de serviços internos do navegador (domínios do Google, como autopreenchimento), que não partem da aplicação e foram bloqueadas pelo ambiente. O teste de teclado percorre a página com Tab, mas não avalia a qualidade da experiência. Não houve teste com leitor de tela.

## 3. Verificações por inspeção (feitas pela IA)

- Ausência de `innerHTML`, `document.write`, `eval` e `new Function` (também automatizada).
- `index.html` sem scripts, estilos ou manipuladores inline, e sem recursos externos (também automatizada).
- `.gitignore` cobre `.env`, chaves e backups; nenhum segredo no repositório.
- Workflow com `permissions: contents: read`, sem segredos e ações fixadas por SHA completo. Os SHAs foram obtidos com `git ls-remote` nos repositórios oficiais `actions/checkout` (tag `v7.0.1`) e `actions/setup-node` (tag `v7.1.0`) em 18/10/2026. **O workflow ainda não foi executado no GitHub.**
- Contraste: cores escolhidas com texto escuro sobre fundos claros e texto branco sobre azul `#1f4e79`. **Não foi medido com ferramenta.**

## 4. Testes manuais pendentes (a cargo do aluno)

Marque cada item ao executar, registrando data, navegador e resultado real.

| # | Procedimento | Resultado esperado | Resultado obtido |
|---|---|---|---|
| M-01 | Seguir somente o README para executar (`npm start`) e testar (`npm test`) | Aplicação abre; 100 testes passam | Pendente |
| M-02 | Criar, editar e excluir projeto | Conforme RF-01 | Pendente |
| M-03 | Avaliar os 15 controles de um projeto e conferir o indicador com uma conta feita à mão | Valor igual ao calculado | Pendente |
| M-04 | Filtrar o plano de melhorias por cada filtro | Listas coerentes | Pendente |
| M-05 | Recarregar a página e fechar/abrir o navegador | Dados mantidos | Pendente |
| M-06 | Exportar, apagar tudo e importar o backup | Dados restaurados | Pendente |
| M-07 | Iniciar importação e cancelar | Nada muda | Pendente |
| M-08 | Usar a aplicação só com teclado (Tab, Shift+Tab, Enter, Espaço, setas nos rádios, Esc no diálogo) | Tudo alcançável, foco sempre visível | Pendente |
| M-09 | Usar em celular real ou modo responsivo do navegador | Sem rolagem horizontal; botões utilizáveis | Pendente |
| M-10 | Digitar `<img src=x onerror=alert(1)>` em campos e importar um JSON com esse texto | Texto literal, sem alerta | Pendente |
| M-11 | Tentar `javascript:alert(1)` como link | Rejeitado com mensagem | Pendente |
| M-12 | No console do navegador, executar `localStorage.setItem('securetrack:v1','{quebrado')` e recarregar | Tela de recuperação; download do bruto; reinicialização só após confirmar | Pendente |
| M-13 | Bloquear armazenamento do site nas configurações do navegador e recarregar | Aviso de armazenamento indisponível; nada indicado como salvo | Pendente |
| M-14 | Abrir `http://127.0.0.1:8000/securetrack/` e, se publicar, o endereço do GitHub Pages | Funciona em subdiretório | Pendente |
| M-15 | Abrir as ferramentas do desenvolvedor (Console) em todas as seções | Nenhuma violação de CSP | Pendente |
| M-16 | Repetir M-02 a M-15 no Firefox e/ou Safari | Mesmo comportamento | Pendente |
| M-17 | Testar com leitor de tela (NVDA, VoiceOver ou TalkBack) | Rótulos, mensagens e tabelas compreensíveis | Pendente |
| M-18 | Medir contraste com uma ferramenta (ex.: verificador de contraste do navegador) | Contraste adequado | Pendente |
| M-19 | Conferir a execução do GitHub Actions após publicar | Jobs Node 22.x e 24.x verdes | Pendente |

O SecureTrack não declara conformidade com WCAG ou outra norma de acessibilidade: isso exigiria avaliação apropriada.
