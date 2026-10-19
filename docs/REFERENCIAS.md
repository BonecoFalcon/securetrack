# Referências e relacionamentos

Este documento registra as fontes oficiais consultadas e justifica os relacionamentos entre os controles do SecureTrack e os três referenciais.

## Três coisas diferentes

| Conceito | O que é | Onde está |
|---|---|---|
| **Controle didático** | Item de checklist escrito pelo SecureTrack em linguagem simples (ex.: `ST-05 Validação de entradas e saída segura`). Não é texto oficial de nenhum referencial. | `js/controls.js` |
| **Prática oficial** | Identificador e título publicados pelo referencial (ex.: `PW.5 — Create Source Code by Adhering to Secure Coding Practices`). Citados em inglês, como na fonte, sem reprodução extensa. | Fonte oficial (links abaixo) |
| **Interpretação** | Justificativa do SecureTrack para relacionar o controle à prática. É uma **aproximação documentada**, não uma equivalência normativa. | Campo `interpretation` em `js/controls.js` e tabelas abaixo |

Status usados no catálogo:

- **conferido**: identificador e título da prática foram encontrados na fonte oficial na data da consulta. O vínculo em si continua sendo interpretação.
- **pendente**: não foi possível conferir. Nenhum relacionamento do catálogo 1.0.0 está nesse estado. Onde não houve confirmação de que uma prática trata do tema, **o relacionamento não foi criado** (veja "Lacunas intencionais").

## Fontes consultadas

**Data real da consulta: 18/10/2026.** As consultas foram feitas pela IA assistente, com acesso à internet, durante a construção do projeto. Páginas web mudam: reconfira antes de citar em trabalhos.

### NIST SSDF 1.1 — SP 800-218

- Nome: *Secure Software Development Framework (SSDF) Version 1.1: Recommendations for Mitigating the Risk of Software Vulnerabilities*, NIST Special Publication 800-218, fevereiro de 2022.
- Página oficial: <https://csrc.nist.gov/pubs/sp/800/218/final>
- PDF consultado (fonte dos relacionamentos): <https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218.pdf>
- DOI: <https://doi.org/10.6028/NIST.SP.800-218>
- Conferidos no PDF: os nomes das práticas PO.1–PO.5, PS.1–PS.3, PW.1–PW.9 e RV.1–RV.3, e o texto das tarefas citadas (PO.1.2, PO.3.1, PO.4.1, PS.1.1, PS.2.1, PS.3.1, PS.3.2, PW.1.1, PW.1.2, PW.4.1, PW.4.4, PW.5.1, PW.7.2, PW.8.2, PW.9.1, PW.9.2, RV.1.1, RV.1.3, RV.2.1, RV.2.2, RV.3.1–RV.3.4). Também foram conferidos os exemplos de implementação de PW.5.1 que mencionam validação de entradas, codificação de saídas, tratamento de erros e registro.

### OWASP SAMM 2.0

- Nome: OWASP Software Assurance Maturity Model (SAMM), versão 2. Segundo o blog oficial, a versão 2 teve lançamento público em 31/01/2020 (<https://owaspsamm.org/blog/samm2-release/>). A página do modelo não exibe número de versão.
- Modelo: <https://owaspsamm.org/model/>
- Páginas de práticas consultadas, com os nomes dos streams A e B:
  - Design › Threat Assessment — <https://owaspsamm.org/model/design/threat-assessment/> (A: Application Risk Profile; B: Threat Modeling)
  - Design › Security Requirements — <https://owaspsamm.org/model/design/security-requirements/> (A: Software Requirements; B: Supplier Security)
  - Design › Secure Architecture — <https://owaspsamm.org/model/design/secure-architecture/> (A: Architecture Design; B: Technology Management)
  - Implementation › Secure Build — <https://owaspsamm.org/model/implementation/secure-build/> (A: Build Process; B: Software Dependencies)
  - Implementation › Secure Deployment — <https://owaspsamm.org/model/implementation/secure-deployment/> (A: Deployment Process; B: Secret Management)
  - Implementation › Defect Management — <https://owaspsamm.org/model/implementation/defect-management/> (A: Defect Tracking; B: Metrics and Feedback)
  - Verification › Requirements-driven Testing — <https://owaspsamm.org/model/verification/requirements-driven-testing/> (A: Control Verification; B: Misuse/Abuse Testing)
  - Verification › Security Testing — <https://owaspsamm.org/model/verification/security-testing/> (A: Scalable Baseline; B: Deep Understanding)
  - Operations › Incident Management — <https://owaspsamm.org/model/operations/incident-management/> (A: Incident Detection; B: Incident Response)
  - Operations › Operational Management — <https://owaspsamm.org/model/operations/operational-management/> (A: Data Protection; B: System Decommissioning / Legacy Management)
- Observação: o SecureTrack **não** atribui níveis de maturidade SAMM. Os relacionamentos indicam apenas proximidade de tema com um stream.

### Microsoft Security Development Lifecycle (SDL)

- Nome: Microsoft Security Development Lifecycle — página de práticas (10 práticas numeradas). A página não informa versão nem data de atualização.
- Índice: <https://www.microsoft.com/en-us/securityengineering/sdl/practices>
- Páginas de práticas consultadas:
  - Practice 1 — Establish security standards, metrics, and governance: <https://www.microsoft.com/en-us/securityengineering/sdl/practices/security-program-management>
  - Practice 2 — Require use of proven security features, languages, and frameworks: <https://www.microsoft.com/en-us/securityengineering/sdl/practices/secure-platforms>
  - Practice 3 — Perform security design review and threat modeling: <https://www.microsoft.com/en-us/securityengineering/sdl/practices/secure-by-design>
  - Practice 5 — Secure the software supply chain: <https://www.microsoft.com/securityengineering/sdl/practices/sscs>
  - Practice 6 — Secure the engineering environment: <https://www.microsoft.com/securityengineering/sdl/practices/secure-dev-infra>
  - Practice 7 — Perform security testing: <https://www.microsoft.com/en-us/securityengineering/sdl/practices/security-testing>
  - Practice 9 — Implement security monitoring and response: <https://www.microsoft.com/en-us/securityengineering/sdl/practices/monitoring-and-response>
- Práticas 4 (criptografia), 8 (plataforma operacional) e 10 (treinamento) não foram relacionadas: os 15 controles selecionados não tratam desses temas.
- Os links curtos `aka.ms` do índice não puderam ser lidos pela ferramenta de consulta (bloqueio por robots). As páginas foram lidas pelos endereços completos acima.

## Relacionamentos por controle

Legenda: **SSDF** = NIST SP 800-218; **SAMM** = OWASP SAMM 2.0; **SDL** = Microsoft SDL. Todos com status *conferido*.

| Controle | SSDF | SAMM | SDL | Justificativa resumida |
|---|---|---|---|---|
| ST-01 Requisitos de segurança definidos | PO.1 (PO.1.2) | Security Requirements, stream A | Practice 1 | PO.1.2 trata de requisitos de segurança do software; a página da Practice 1 trata de linha de base mínima de segurança. |
| ST-02 Dados sensíveis identificados | PW.1 (PW.1.1) | Operational Management A; Threat Assessment A | Practice 3 | *Interpretação:* saber quais dados são sensíveis é insumo da avaliação de risco (PW.1.1) e do perfil de risco. A Practice 3 discute ativos sensíveis na modelagem. |
| ST-03 Modelagem de ameaças realizada | PW.1 (PW.1.1) | Threat Assessment B | Practice 3 | PW.1.1 cita modelagem de ameaças; correspondência direta de tema no SAMM e no SDL. |
| ST-04 Superfície de ataque e privilégio mínimo | PW.1 (PW.1.1); PW.9 (PW.9.1) | Secure Architecture A | Practice 3 | PW.1.1 cita mapeamento de superfície de ataque; PW.9 trata de padrões seguros; a Practice 3 lista privilégio mínimo e redução da superfície de ataque. |
| ST-05 Validação de entradas e saída segura | PW.5 (PW.5.1) | — | — | Exemplos de PW.5.1 citam validar entradas e codificar saídas. Veja lacunas. |
| ST-06 Tratamento seguro de erros e registros | PW.5 (PW.5.1) | — | Practice 2 | Exemplos de PW.5.1 citam tratar erros e prover registro. *Parcial:* a Practice 2 menciona registro de segurança, não tratamento de erros. |
| ST-07 Dependências gerenciadas | PW.4 (PW.4.1, PW.4.4) | Secure Build B | Practice 5 | Componentes de terceiros; dependências de software; inventário e atualização de dependências. |
| ST-08 Segredos e repositório protegidos | PS.1 (PS.1.1) | Secure Deployment B | Practices 6 e 2 | PS.1.1 trata de proteger o repositório com privilégio mínimo. *Interpretação:* segredos no código aumentam o impacto de acesso indevido. A Practice 6 trata de acesso ao repositório e proteção de branch; a Practice 2 cita gestão de segredos. |
| ST-09 Revisão de código | PW.7 (PW.7.2) | — | Practices 6 e 7 | PW.7.2 trata de revisar ou analisar código. A Practice 6 recomenda revisão obrigatória em pull requests; a Practice 7 cita revisões de código. |
| ST-10 Testes funcionais e de segurança | PW.8 (PW.8.2) | Requirements-driven Testing A e B | Practice 7 | Testes derivados de requisitos e testes de abuso. |
| ST-11 Verificações automatizadas | PO.3 (PO.3.1); PO.4 (PO.4.1) | Security Testing A | Practice 7 | Cadeia de ferramentas e critérios de verificação. A Practice 7 cita SAST na automação de build e integração ao CI/CD. *Interpretação:* a linha de base escalável do SAMM costuma depender de automação. |
| ST-12 Documentação de segurança e limitações | PW.9 (PW.9.2); PW.1 (PW.1.2) | — | Practice 1 | Documentar configurações e decisões de projeto. *Parcial:* a Practice 1 exige documentar exceções com riscos e plano. |
| ST-13 Entregas íntegras e identificáveis | PS.2 (PS.2.1); PS.3 (PS.3.1, PS.3.2) | Secure Build A; Secure Deployment A | Practice 5 | Integridade, arquivamento e proveniência das versões. A Practice 5 cita SBOM com checksums, assinatura e atestação. |
| ST-14 Relato e tratamento de vulnerabilidades | RV.1 (RV.1.1, RV.1.3); RV.2 | Defect Management A; Incident Management B | Practice 9 | Receber relatos, manter política de divulgação, priorizar e corrigir. A Practice 9 trata de processo de resposta com PSIRT, mas não detalha divulgação coordenada. |
| ST-15 Revisão de correções e prevenção de recorrência | RV.3 (RV.3.1–RV.3.4) | Defect Management B | — | Causa raiz, falhas semelhantes e ajuste do processo. Veja lacunas. |

## Lacunas intencionais

Relacionamentos **não criados** porque a consulta não confirmou que a prática trata do tema:

- **ST-05 × SAMM e SDL:** nenhuma prática SAMM consultada trata diretamente de codificação segura. A página da Practice 2 do SDL não menciona validação de entradas nem codificação de saída.
- **ST-06 × SAMM:** nenhuma prática SAMM consultada trata de tratamento de erros.
- **ST-09 × SAMM:** a revisão de código pode estar coberta pelo stream *Deep Understanding* de Security Testing, mas isso não foi confirmado na consulta.
- **ST-12 × SAMM:** a prática *Policy & Compliance* (streams *Policy and Standards* e *Compliance Management*) foi consultada, mas não trata de documentação para usuários e mantenedores.
- **ST-15 × SDL:** a página da Practice 9 não menciona análise de causa raiz.

Consequência: o recorte de cada framework tem um número diferente de controles (SSDF: 15; SDL: 13; SAMM: 11). Esses números refletem apenas a seleção do SecureTrack, não a abrangência dos referenciais.

## Como revisar

1. Abra a fonte indicada para o controle.
2. Confirme se o identificador e o título continuam iguais.
3. Avalie se a interpretação faz sentido. Se discordar, altere `js/controls.js`, incremente `CATALOG_VERSION` e registre a mudança aqui e em `docs/USO-DA-IA.md`.
4. Atualize a data de consulta (`REFERENCES_CHECKED_ON`).

Mudar `CATALOG_VERSION` faz backups antigos serem rejeitados na importação (versão de catálogo incompatível). Isso é intencional nesta primeira versão, que não tem migração de catálogo.
