# Modelagem de ameaças (simplificada)

Escopo: SecureTrack 1.0.0, aplicação estática executada no navegador, com dados no `localStorage`. Método: STRIDE simplificado, proporcional a um projeto acadêmico.

## Ativos

| Ativo | Por que importa |
|---|---|
| Dados do usuário (projetos e avaliações) | Podem revelar fragilidades de projetos reais. Perda ou exposição afeta o usuário. |
| Arquivos de backup (JSON) | Cópia completa dos dados, fora do controle da aplicação. |
| Integridade da interface | Um script injetado poderia ler ou alterar dados e enganar o usuário. |
| Catálogo de controles | Define o que é avaliado. Se fosse substituível por importação, resultados poderiam ser manipulados. |
| Código-fonte e pipeline (repositório e GitHub Actions) | Comprometimento afetaria todos que usam a aplicação publicada. |

## Fluxo de dados e limites de confiança

```
 [Usuário] --digita--> (Formulários) --validação--> [Estado em memória] --persistência--> [localStorage]
                                                          ^      |
 [Arquivo JSON] --leitura <=1 MB--> (Importação: parse + validação completa) 
                                                          |      v
                                              (Renderização com textContent) --> [Tela]
                                                          |
                                                          v
                                               (Exportação) --> [Arquivo JSON baixado]

 [Hospedagem estática] --HTML/CSS/JS--> [Navegador]        [data/demo.json] --fetch same-origin--> (Importação)
```

Limites de confiança (tudo que os cruza é tratado como não confiável):

1. **Usuário → aplicação**: campos de formulário.
2. **Arquivo → aplicação**: JSON importado (pode ter sido editado ou criado por terceiros).
3. **localStorage → aplicação**: pode ter sido alterado por extensões, ferramentas de desenvolvedor ou outra versão da aplicação.
4. **Hospedagem → navegador**: arquivos entregues pelo servidor (integridade depende da hospedagem e do repositório).
5. **Aplicação → links externos**: URLs informadas pelo usuário, abertas apenas por clique.

## STRIDE

| Categoria | Aplica? | Ameaça | Mitigação implementada | Risco residual |
|---|---|---|---|---|
| **S**poofing (falsificação de identidade) | Parcial | Não há contas nem login, então não há identidade a falsificar na aplicação. Um site falso poderia se passar pelo SecureTrack. | Nenhuma autenticação improvisada. Documentação orienta a usar a URL oficial do repositório. | Usuário pode usar uma cópia adulterada hospedada por terceiros. |
| **T**ampering (adulteração) | Sim | (a) JSON importado malicioso; (b) `localStorage` alterado; (c) importação que substitui o catálogo; (d) adulteração do código no repositório ou na hospedagem. | (a, b) Validação estrutural completa, lista de campos permitidos, objetos novos, IDs no padrão, referências checadas. (c) O catálogo é código e não é importado; a exportação não o inclui. (d) CI com permissões mínimas e ações fixadas por SHA; revisão antes do merge recomendada. | Quem controla o navegador pode alterar dados de forma válida. Não há assinatura das entregas (ST-13 do próprio catálogo fica como melhoria). |
| **R**epudiation (repúdio) | Não aplicável | Ferramenta pessoal, sem múltiplos usuários nem trilha de auditoria exigida. | Datas de atualização registradas por avaliação, apenas como informação. | As datas podem ser editadas via JSON e não servem como prova. |
| **I**nformation disclosure (exposição) | Sim | (a) XSS persistente lendo dados; (b) envio de dados a terceiros; (c) vazamento de referrer ao abrir links; (d) acesso local ao navegador ou ao backup; (e) usuário registrar segredos. | (a) `textContent`, sem APIs de HTML, CSP sem scripts inline. (b) Nenhuma requisição externa; `connect-src 'self'`. (c) `rel="noopener noreferrer"`, `referrerpolicy="no-referrer"` e meta `referrer`. (d, e) Avisos na interface e no README; `.gitignore` para backups. | Dados no `localStorage` não são criptografados. Extensões do navegador e pessoas com acesso ao computador podem lê-los. |
| **D**enial of service (negação de serviço) | Parcial | Arquivo enorme ou com milhares de itens travando a página; armazenamento cheio. | Limite de 1 MB checado antes da leitura; até 50 projetos e 750 avaliações; erro de cota tratado sem perder dados. | Um arquivo de até 1 MB ainda é processado de forma síncrona; impacto apenas local. |
| **E**levation of privilege (elevação de privilégio) | Parcial | Script injetado ganharia os mesmos poderes da página; links `javascript:` executariam código. | Bloqueio de esquemas não `https:`; CSP; ausência de `eval`/`new Function`. | Proteções que dependem de cabeçalhos (ex.: `frame-ancestors`) não estão garantidas pela meta CSP. |

## Ameaças específicas

### XSS persistente

- Vetor: texto salvo (nome, evidência, ação) ou importado contendo HTML/JS, exibido depois.
- Mitigações: renderização exclusiva por `createElement`/`textContent` (verificado por inspeção estática automatizada em `tests/catalog-and-static.test.js`), recusa de atributos `on*` no utilitário `el()`, links apenas `https:`, CSP sem `unsafe-inline`.
- Verificação em navegador: payload `<img src=x onerror=alert(1)>` em formulário, em JSON importado e em `localStorage` corrompido exibido literalmente, sem `alert` (docs/TESTES.md).

### Importação maliciosa

- Vetores: poluição de protótipo (`__proto__`), campos extras, tipos errados, valores enormes, IDs que colidem, referências quebradas, esquemas perigosos em URLs, troca de versão.
- Mitigações: `JSON.parse` + validação de tudo antes de qualquer alteração; rejeição de chaves não permitidas (incluindo `__proto__`); construção de objetos novos; resumo com confirmação; gravação transacional.

### Perda de dados

- Vetores: limpeza do navegador, armazenamento cheio, conteúdo corrompido, importação acidental, exclusão acidental.
- Mitigações: exportação de backup; confirmações para excluir, importar, carregar demonstração e reinicializar; tela de recuperação que nunca apaga sem confirmação e permite baixar o conteúdo bruto; commit só após gravação confirmada.
- Residual: sem backup, a limpeza dos dados do navegador apaga tudo.

### Dependências e cadeia de entrega

- O projeto não tem dependências de execução nem de teste (usa `node:test`). Não há `package-lock.json` porque não há pacotes.
- O CI usa `actions/checkout` e `actions/setup-node` fixadas por SHA completo, com `permissions: contents: read` e `persist-credentials: false`.
- Residuais: confiança no GitHub, no runner e na hospedagem; ausência de assinatura de releases; o navegador do usuário pode estar desatualizado.

## Riscos residuais (resumo)

1. Dados sem criptografia e sem controle de acesso no navegador.
2. Meta CSP não cobre `frame-ancestors`, `report-to` nem `sandbox`; clickjacking depende da hospedagem.
3. Hospedagem estática (ex.: GitHub Pages) não permite configurar cabeçalhos personalizados.
4. Entregas não assinadas.
5. Autoavaliação pode ser imprecisa: evidências não são verificadas.
6. Acessibilidade verificada apenas parcialmente (teclado e tela pequena automatizados; sem leitor de tela).
