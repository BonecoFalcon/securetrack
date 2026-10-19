# SecureTrack

Aplicação web educacional para **autoavaliação de práticas de desenvolvimento seguro (S-SDLC)**: cadastre projetos de software, avalie 15 controles selecionados, registre evidências e acompanhe um plano de melhorias.

> **Aviso importante.** O SecureTrack é uma ferramenta educacional de autoavaliação. Seus resultados **não** representam auditoria, certificação, comprovação de segurança, conformidade integral nem pontuação oficial do NIST SSDF, do OWASP SAMM ou do Microsoft SDL. A ferramenta **não** analisa código, **não** faz varredura de vulnerabilidades e **não** consulta repositórios.

## Contexto acadêmico

Mini-projeto desenvolvido para a pós-graduação em Engenharia de Software com IA Generativa. O objetivo é praticar requisitos, modelagem de ameaças, desenvolvimento seguro, testes e documentação em um projeto pequeno e completo, aplicando ao próprio SecureTrack as práticas que ele ajuda a avaliar.

Referenciais usados como base (detalhes em [docs/REFERENCIAS.md](docs/REFERENCIAS.md)):

- NIST SSDF 1.1 — SP 800-218
- OWASP SAMM 2.0
- Microsoft Security Development Lifecycle (SDL)

## Funcionalidades

- **Projetos:** criar, listar, editar e excluir (com confirmação). Nome obrigatório; descrição, URL `https://` do repositório e tecnologias opcionais.
- **Checklist:** 15 controles didáticos em 6 áreas, cada um com descrição, orientação, exemplos de evidência, prioridade padrão e relacionamentos documentados com os três referenciais.
- **Avaliação por projeto:** situação (não avaliado, não implementado, parcialmente implementado, implementado, não aplicável), evidência, link, justificativa, ação de melhoria e prioridade. Cada controle é salvo separadamente.
- **Dashboard:** visão geral por projeto (sem média global), indicador detalhado do projeto selecionado, distribuição das situações, resultados por área e por recorte de framework, pendências e próximas ações. Gráficos em HTML/CSS acompanhados de tabelas.
- **Plano de melhorias:** ações para controles não implementados ou parciais, com filtros por projeto, área, situação e prioridade; lista separada de avaliações pendentes.
- **Backup:** exportação e importação em JSON, com validação completa, resumo e confirmação.
- **Demonstração:** projeto fictício "GuitarScore — demonstração", com dados simulados.

## Tecnologias e requisitos

- HTML, CSS e JavaScript puro com módulos ES. Sem frameworks, sem dependências de execução, sem backend.
- Dados no `localStorage` do navegador.
- **Node.js LTS 22 ou 24** (somente para os testes e para o servidor local opcional). Os testes foram executados com Node.js 22.22.0. Confira as versões LTS suportadas em <https://nodejs.org/en/about/previous-releases>.
- Um navegador atual (Chrome, Edge, Firefox ou Safari).

## Executar localmente

Módulos JavaScript não funcionam abrindo o `index.html` diretamente (`file://`). Use um servidor HTTP local.

**Opção 1 — servidor incluído (Node.js, sem dependências):**

```bash
cd securetrack
npm start
```

Abra <http://127.0.0.1:8000/>. O mesmo servidor também publica a aplicação em <http://127.0.0.1:8000/securetrack/> para simular hospedagem em subdiretório (como o GitHub Pages). Para encerrar, pressione `Ctrl+C`.

Para outra porta: `node scripts/serve.js 8080`.

**Opção 2 — Python 3:**

```bash
cd securetrack
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra <http://127.0.0.1:8000/>.

## Executar os testes

```bash
cd securetrack
npm test
```

O comando executa `node --test`, o executor nativo do Node.js, sobre os arquivos `tests/*.test.js`. Não há pacotes para instalar (`npm install` não é necessário). Resultados e limitações em [docs/TESTES.md](docs/TESTES.md).

## Como o indicador é calculado

O resultado se chama **Indicador de implementação — autodeclaração**.

```
Implementação (%) = (implementados + 0,5 × parcialmente implementados) ÷ controles aplicáveis × 100
```

| Situação | Peso | Denominador |
|---|---|---|
| Implementado | 1 | entra |
| Parcialmente implementado | 0,5 | entra |
| Não implementado | 0 | entra |
| Não avaliado | 0 | entra |
| Não aplicável | — | excluído |

- Sem controles aplicáveis, a tela mostra **"Sem base para cálculo"** (nunca 0%, 100%, NaN ou infinito).
- Apenas a exibição é arredondada, com uma casa decimal.
- A tela mostra numerador, denominador e a conta completa.
- "Implementado" sem descrição nem link de evidência continua com peso 1, por ser autodeclaração, mas aparece como **evidência pendente**. Texto ou link informado também não comprova a suficiência da evidência.
- Por área ou framework, usam-se apenas os controles vinculados ao grupo, cada um contado uma vez.

Exemplo (demonstração GuitarScore): 4 implementados, 4 parciais, 3 não implementados, 3 não avaliados e 1 não aplicável → (4 + 0,5 × 4) ÷ 14 × 100 = **42,9%**.

O indicador **não** é nível de maturidade SAMM, índice de segurança, certificação nem percentual de conformidade.

## Escopo dos relacionamentos com os frameworks

- Os 15 controles são **didáticos, definidos pelo SecureTrack**. Eles não reproduzem os referenciais.
- Cada controle aponta para uma ou mais práticas oficiais. Identificadores e títulos foram conferidos nas fontes oficiais em 18/10/2026.
- Os relacionamentos são **aproximações documentadas**, não equivalências normativas. A justificativa de cada um está no catálogo (`js/controls.js`) e em [docs/REFERENCIAS.md](docs/REFERENCIAS.md).
- O "resultado por framework" é um **recorte** dos controles selecionados. Ele não cobre todo o referencial, e os recortes se sobrepõem. Por isso não devem ser somados.

## Demonstração GuitarScore

Em **Backup e dados → Carregar demonstração** (ou no estado vazio do Dashboard), a aplicação adiciona o projeto fictício "GuitarScore — demonstração", descrito como catálogo pessoal de guitarras com avaliações.

- Todos os dados são **simulados**. O GuitarScore não foi construído, testado nem auditado.
- Não há links de repositório, relatórios ou evidências reais.
- Se já houver dados, a aplicação pede confirmação. Seus outros projetos não são alterados. Se a demonstração já existir, ela é substituída pela versão original.

## Estrutura do projeto

```
securetrack/
├── index.html              # Página única, com CSP via meta
├── css/styles.css
├── img/favicon.svg
├── js/
│   ├── app.js              # Controlador da interface (DOM)
│   ├── ui.js               # Criação segura de elementos, diálogos, downloads
│   ├── controls.js         # Catálogo versionado de controles e relacionamentos
│   ├── validation.js       # Regras de validação e limites
│   ├── projects.js         # Operações puras sobre projetos
│   ├── assessments.js      # Operações puras sobre avaliações
│   ├── scoring.js          # Indicadores, recortes e plano de melhorias
│   ├── storage.js          # localStorage com backend injetável
│   └── transfer.js         # Exportação, importação e validação estrutural
├── data/demo.json          # Demonstração GuitarScore (simulada)
├── scripts/serve.js        # Servidor local opcional (desenvolvimento)
├── tests/                  # Testes com node:test
├── tools/verificacao-navegador.cjs  # Verificação opcional em navegador (exige Playwright; fora do npm test)
├── docs/                   # Requisitos, ameaças, segurança, testes, IA, referências, publicação
├── .github/workflows/tests.yml
├── README.md · SECURITY.md · LICENSE · package.json · .gitignore
```

A estrutura sugerida foi mantida. Acréscimos: `scripts/serve.js` (servidor local sem dependências que também simula o subdiretório), `img/favicon.svg` (ícone local, para não depender de recursos externos) e `tools/verificacao-navegador.cjs` (roteiro automatizado usado para registrar as verificações em navegador de `docs/TESTES.md`).

## Segurança, privacidade e limitações

- Os dados ficam **somente neste navegador**, sem sincronização, sem servidor e sem garantia de confidencialidade. Não registre credenciais, tokens, dados pessoais nem detalhes confidenciais de vulnerabilidades.
- Formulários, arquivos importados e o próprio `localStorage` são tratados como entradas não confiáveis e validados.
- Conteúdo do usuário é exibido com `textContent`. O código não usa `innerHTML`, `document.write`, `eval` nem `new Function`.
- Links aceitos somente com `https://`. Links externos abrem em nova aba com `rel="noopener noreferrer"` e nunca são acessados automaticamente.
- Content Security Policy restritiva via `<meta>`, sem scripts inline e sem conexões externas. Algumas proteções dependem de cabeçalhos HTTP da hospedagem: veja [docs/SEGURANCA.md](docs/SEGURANCA.md).
- Não há autenticação nem criptografia: a ferramenta não protege os dados contra quem tem acesso ao navegador.
- Detalhes em [docs/SEGURANCA.md](docs/SEGURANCA.md) e [docs/AMEACAS.md](docs/AMEACAS.md). Para comunicar vulnerabilidades, veja [SECURITY.md](SECURITY.md).

## Backup e restauração

1. **Backup e dados → Exportar backup (JSON)**. O arquivo `securetrack-backup-AAAA-MM-DD.json` contém versão do formato, versão do catálogo, data, projetos e avaliações. O catálogo de controles não é exportado.
2. Para restaurar: **Importar**, escolha o arquivo e clique em **Validar arquivo**. Confira o resumo e confirme em **Substituir dados atuais**.
3. A importação **substitui** todos os dados (não há mesclagem nesta versão). Limite de 1 MB e 50 projetos. Qualquer erro de validação ou de gravação mantém os dados anteriores.
4. Se o conteúdo salvo estiver corrompido, a aplicação abre uma tela de recuperação: baixe o conteúdo bruto (`.txt`) e só reinicialize após confirmar.

Os arquivos de backup podem conter informações sobre seus projetos. Guarde-os com cuidado e não os publique no repositório (o `.gitignore` já ignora `securetrack-backup-*.json`).

## Participação da IA

O código, os testes e a documentação desta versão foram gerados com apoio de um assistente de IA generativa (Claude), a partir de uma especificação detalhada escrita pelo aluno. A IA também consultou as fontes oficiais e executou os testes descritos em [docs/TESTES.md](docs/TESTES.md). Revisões e decisões humanas devem ser registradas pelo aluno em [docs/USO-DA-IA.md](docs/USO-DA-IA.md).

## Melhorias futuras

- Importação com mesclagem e migração entre versões do catálogo.
- Histórico de avaliações por data, para acompanhar evolução.
- Exportação do plano de melhorias em CSV.
- Avaliação de acessibilidade com leitores de tela e especialistas.
- Revisão dos relacionamentos por especialistas e inclusão de outros referenciais.

## Licença

Código original sob licença [MIT](LICENSE). NIST SSDF, OWASP SAMM e Microsoft SDL pertencem aos seus respectivos autores. Este projeto apenas cita títulos e identificadores e aponta para as fontes oficiais, sem reproduzir extensamente seus textos.
