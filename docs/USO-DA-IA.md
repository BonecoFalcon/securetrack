# Uso de IA generativa

Registro da participação da IA no SecureTrack 1.0.0. A primeira parte descreve o que a IA fez de fato. A segunda é para o aluno preencher. Nada aqui afirma revisões humanas que ainda não aconteceram.

## Ferramenta

- Assistente: Claude (Anthropic), no modo de trabalho com arquivos (Cowork), identificador de modelo configurado `claude-opus-5-5`.
- Data: 18/10/2026.
- Entrada: especificação detalhada escrita pelo aluno (escopo, funcionalidades, regras de cálculo, requisitos de segurança, testes, documentação e critérios de aceite).

## O que a IA fez

1. **Consulta às referências.** Leu as páginas oficiais do NIST (página da SP 800-218 e PDF), do OWASP SAMM (modelo e 10 páginas de práticas) e do Microsoft SDL (índice e 7 páginas de práticas). Conferiu nomes de práticas, tarefas e streams. Os links curtos `aka.ms` foram bloqueados para a ferramenta de leitura; as páginas foram lidas pelos endereços completos.
2. **Catálogo.** Redigiu os 15 controles didáticos e propôs os relacionamentos e interpretações (`js/controls.js`, `docs/REFERENCIAS.md`).
3. **Código.** Escreveu todo o HTML, CSS e JavaScript, o servidor local `scripts/serve.js`, o arquivo de demonstração e o workflow de CI.
4. **Testes.** Escreveu 100 testes com `node:test`, executou-os e corrigiu dois testes que falharam por erro nos próprios testes (comparação de ponto flutuante e construção de objeto com `__proto__`).
5. **Verificação em navegador.** Escreveu e executou `tools/verificacao-navegador.cjs` em Chromium headless. Encontrou e corrigiu um defeito real de layout em tela pequena (ver docs/TESTES.md).
6. **SHAs do CI.** Obteve os SHAs de `actions/checkout` e `actions/setup-node` com `git ls-remote` nos repositórios oficiais. Não executou o workflow no GitHub.
7. **Documentação.** Escreveu README, SECURITY e todos os documentos de `docs/`.

## Decisões técnicas tomadas pela IA (para o aluno avaliar)

| Decisão | Motivo | Alternativa descartada |
|---|---|---|
| Avaliações em lista separada (`assessments`), ligadas por `projectId` | Permite validar referências a projetos inexistentes na importação | Avaliações aninhadas em cada projeto |
| Mesmo validador para importação e `localStorage` | Os dois são entradas não confiáveis | Confiar no que a própria aplicação gravou |
| Campos desconhecidos rejeitados (não ignorados) | Deixa explícito o que é aceito e bloqueia `__proto__` | Ignorar silenciosamente campos extras |
| Nomes de projeto únicos | Evita ambiguidade no plano e define "projeto duplicado" na importação | Permitir nomes repetidos |
| Gravação confirmada por leitura de volta; estado só muda após sucesso | Não indicar sucesso quando o salvamento falha | Atualizar a tela e salvar depois |
| Com armazenamento indisponível, nenhuma alteração é aceita | Coerente com "não indicar salvamento quando falhar" | Modo só em memória |
| Demonstração **adicionada** aos dados (não substitui) | Não sobrescrever dados do usuário | Substituir tudo pela demonstração |
| "Pendência de prioridade alta" inclui não avaliados | Controles críticos ainda não avaliados também exigem atenção | Só não implementados e parciais |
| Limites contados em unidades UTF-16 | Mesma contagem do `maxlength` do HTML | Contagem por ponto de código |
| Relacionamento não criado quando a fonte não confirmou o tema (ex.: ST-05 × SAMM) | Não inventar equivalências | Forçar ao menos um vínculo por framework |
| Servidor local próprio em Node, sem dependências | Simula subdiretório e evita instalar pacotes | `npx serve` ou `http-server` |
| Script de navegador fora do `npm test` | Playwright seria dependência; o projeto não deve ter dependências | Incluir Playwright no `package.json` |

## Limitações do trabalho da IA

- A IA pode errar na interpretação dos referenciais. Os relacionamentos precisam de revisão humana.
- A IA não executou testes com leitor de tela, em Firefox ou Safari, nem em celular real.
- A verificação em navegador foi automatizada e não substitui uso real.
- Datas e SHAs refletem o dia da consulta e podem mudar.

---

## Registro do aluno

Preencha após revisar. Registre apenas o que de fato aconteceu.

### Revisão do código

| Data | Arquivo(s) revisado(s) | Problemas encontrados | Ação tomada |
|---|---|---|---|
| | | | |

### Revisão dos relacionamentos com os frameworks

| Data | Controle | Concorda com a interpretação? | Alteração feita |
|---|---|---|---|
| | | | |

### Sugestões da IA aceitas, alteradas ou rejeitadas

| Sugestão | Decisão (aceita/alterada/rejeitada) | Justificativa |
|---|---|---|
| | | |

### Testes executados pelo aluno

| Data | Teste (ver docs/TESTES.md) | Ambiente | Resultado |
|---|---|---|---|
| | | | |

### Aprendizados

- O que a IA acelerou:
- Onde a IA errou ou precisou de correção:
- O que foi necessário verificar manualmente:
- O que faria diferente:
