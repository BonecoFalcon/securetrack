# Requisitos

Cada requisito tem critérios de aceite verificáveis. A coluna "Verificação" indica onde ele é verificado: **U** = teste automatizado (`tests/`), **N** = verificação em navegador (docs/TESTES.md), **I** = inspeção.

## Requisitos funcionais

### RF-01 Cadastro de projetos

| ID | Critério de aceite | Verificação |
|---|---|---|
| RF-01.1 | É possível criar, listar, editar e excluir projetos. | U, N |
| RF-01.2 | O identificador interno é gerado pela aplicação no formato `p_` + 16 hexadecimais. | U |
| RF-01.3 | Nome obrigatório (após remover espaços das extremidades), até 100 caracteres. | U, N |
| RF-01.4 | Descrição até 1.000; URL do repositório até 2.048 (opcional, `https://`); tecnologias até 200. | U |
| RF-01.5 | Datas de criação e atualização são gerenciadas pela aplicação; a edição mantém a data de criação. | U |
| RF-01.6 | A exclusão pede confirmação e remove o projeto e somente as avaliações dele. | U, N |
| RF-01.7 | Não são permitidos dois projetos com o mesmo nome (sem diferenciar maiúsculas). Limite de 50 projetos. | U |

### RF-02 Catálogo de controles

| ID | Critério de aceite | Verificação |
|---|---|---|
| RF-02.1 | O catálogo tem 15 controles distribuídos nas 6 áreas, com ID estável (`ST-01` a `ST-15`). | U |
| RF-02.2 | Cada controle tem título, área, descrição, orientação, exemplos de evidência, prioridade padrão e relacionamentos com fonte oficial e interpretação. | U |
| RF-02.3 | Um controle pode se relacionar a mais de um framework; não há cópias do checklist por framework. | I |
| RF-02.4 | O catálogo tem versão explícita (`CATALOG_VERSION`), fica separado das avaliações e é imutável em execução. | U |

### RF-03 Avaliação por projeto

| ID | Critério de aceite | Verificação |
|---|---|---|
| RF-03.1 | Situações: não avaliado, não implementado, parcialmente implementado, implementado, não aplicável. A situação inicial é "não avaliado". | U |
| RF-03.2 | Limites: evidência 2.000; link 2.048 (`https://`); justificativa 1.000; ação 1.000; prioridade baixa/média/alta. | U |
| RF-03.3 | "Não aplicável" exige justificativa não vazia. | U, N |
| RF-03.4 | "Implementado" sem descrição nem link é aceito e exibido como **evidência pendente**. Evidência informada é exibida como "não validada". | U, N |
| RF-03.5 | Salvar um controle não altera os demais nem descarta rascunhos de outros cartões. | U, N |
| RF-03.6 | Links de evidência não são acessados nem verificados automaticamente. | I |

### RF-04 Dashboard

| ID | Critério de aceite | Verificação |
|---|---|---|
| RF-04.1 | Mostra total de projetos e resultado individual de cada projeto, sem média global. | N |
| RF-04.2 | Mostra o "Indicador de implementação — autodeclaração" do projeto selecionado, com numerador, denominador e explicação. | U, N |
| RF-04.3 | Pesos: implementado 1; parcial 0,5; não implementado e não avaliado 0 (no denominador); não aplicável fora do denominador. | U |
| RF-04.4 | Sem controles aplicáveis, mostra "Sem base para cálculo". | U |
| RF-04.5 | Arredonda apenas a exibição, com uma casa decimal. | U |
| RF-04.6 | Mostra distribuição das situações, resultado por área e por framework, com tabela textual equivalente a cada gráfico. | N |
| RF-04.7 | Recortes por área ou framework usam somente controles vinculados, cada um contado uma vez; os recortes não são somados. | U |
| RF-04.8 | Mostra quantidade de não avaliados, de implementados com evidência pendente, pendências de prioridade alta e as 5 próximas ações. | U, N |

Definição adotada: **pendência de prioridade alta** = controle com prioridade alta e situação não implementado, parcialmente implementado ou não avaliado.

### RF-05 Plano de melhorias

| ID | Critério de aceite | Verificação |
|---|---|---|
| RF-05.1 | Lista controles não implementados e parciais com projeto, controle, situação, prioridade e ação ou "Definir ação". | U, N |
| RF-05.2 | Lista separadamente os não avaliados como "Avaliações pendentes". | U, N |
| RF-05.3 | Filtros por projeto, área, situação e prioridade. | U, N |
| RF-05.4 | Ordenação por prioridade (alta → baixa) e, como critério secundário estável, nome do projeto, ID do projeto, ordem da área e ID do controle. | U |

### RF-06 Exportação e importação

| ID | Critério de aceite | Verificação |
|---|---|---|
| RF-06.1 | A exportação contém versão do formato, versão do catálogo, data, projetos e avaliações, sem o catálogo. | U, N |
| RF-06.2 | A importação rejeita arquivos acima de 1 MB e com mais de 50 projetos. | U |
| RF-06.3 | Rejeita JSON inválido, versões incompatíveis, campos não permitidos, IDs duplicados, nomes duplicados, controles desconhecidos, avaliações duplicadas e referências a projetos inexistentes. | U, N |
| RF-06.4 | Valida tipos, tamanhos, situações, prioridades, datas, URLs e a justificativa de "não aplicável". | U |
| RF-06.5 | Constrói objetos novos apenas com campos permitidos. | U |
| RF-06.6 | Mostra resumo e pede confirmação antes de substituir; cancelar não altera dados. | N |
| RF-06.7 | Qualquer falha de validação ou gravação preserva o estado anterior; o sucesso só é exibido após a persistência. | U, N |

### RF-07 Demonstração

| ID | Critério de aceite | Verificação |
|---|---|---|
| RF-07.1 | Existe a opção "Carregar demonstração", que adiciona o projeto "GuitarScore — demonstração". | N |
| RF-07.2 | Todos os dados da demonstração são identificados como simulados; não há links inventados. | U |
| RF-07.3 | Se houver dados, a aplicação pede confirmação e não sobrescreve outros projetos. | N |
| RF-07.4 | Sem dados, a tela inicial mostra estado vazio com "Criar projeto" e "Carregar demonstração". | N |

## Requisitos de segurança

| ID | Requisito e critério de aceite | Verificação |
|---|---|---|
| RS-01 | Formulários, JSON importado e `localStorage` são validados no JavaScript antes do uso, além dos atributos HTML. | U |
| RS-02 | Conteúdo do usuário é exibido com `textContent`/`createElement`. Não há `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` nem `new Function`. | U (inspeção estática), N |
| RS-03 | `<img src=x onerror=alert(1)>` digitado ou importado aparece literalmente e não executa. | N |
| RS-04 | URLs aceitas somente com `https:` (API `URL`); `javascript:`, `data:`, `file:`, `http:` e outros esquemas são rejeitados; campo vazio é permitido. | U, N |
| RS-05 | Links externos usam `target="_blank"` com `rel="noopener noreferrer"`; nenhum conteúdo de link é carregado automaticamente. | U, N |
| RS-06 | Dados corrompidos não são apagados silenciosamente; há download do conteúdo bruto como texto e reinicialização só após confirmação. | U, N |
| RS-07 | Armazenamento indisponível ou cheio gera mensagem de erro; nunca é indicado sucesso quando a gravação falha. | U, N |
| RS-08 | CSP via meta: `default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`, sem `unsafe-inline` ou `unsafe-eval`. | U, N |
| RS-09 | Nenhum recurso, fonte, script ou requisição a terceiros; sem telemetria. | U, N |
| RS-10 | A interface informa que os dados ficam no navegador, sem sincronização nem garantia de confidencialidade, e recomenda backups. | N |
| RS-11 | O repositório não contém `.env`, segredos ou dados pessoais; o `.gitignore` cobre arquivos sensíveis e backups. | I |
| RS-12 | O workflow de CI usa `permissions: contents: read`, sem segredos, e ações fixadas por SHA completo. | I |

## Requisitos não funcionais

| ID | Requisito e critério de aceite | Verificação |
|---|---|---|
| RNF-01 | Sem dependências de execução; testes com `node --test` em Node.js LTS. | I, U |
| RNF-02 | Funciona por servidor HTTP local e em subdiretório (caminhos relativos). | U, N |
| RNF-03 | Interface em português do Brasil, responsiva (sem rolagem horizontal a 360 px). | N |
| RNF-04 | HTML semântico, labels associados, navegação por teclado, foco visível, erros junto aos campos, mensagens de status acessíveis, situações identificadas por texto e ícone além da cor. | N (parcial), I |
| RNF-05 | Nenhuma alegação de conformidade de acessibilidade sem avaliação apropriada. | I |
