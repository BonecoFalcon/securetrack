// Catálogo de controles didáticos do SecureTrack.
// Este módulo é a única fonte dos controles e relacionamentos. Ele é
// separado das avaliações do usuário e nunca é importado de arquivos JSON.
//
// Os relacionamentos são APROXIMAÇÕES DOCUMENTADAS, não equivalências
// normativas. Veja docs/REFERENCIAS.md para datas de consulta e justificativas.

export const CATALOG_VERSION = '1.0.0';

/** Data real em que as fontes oficiais foram consultadas (AAAA-MM-DD). */
export const REFERENCES_CHECKED_ON = '2026-10-18';

export const AREAS = Object.freeze([
  Object.freeze({ id: 'planejamento', name: 'Planejamento e requisitos' }),
  Object.freeze({ id: 'arquitetura', name: 'Arquitetura e ameaças' }),
  Object.freeze({ id: 'implementacao', name: 'Implementação segura' }),
  Object.freeze({ id: 'verificacao', name: 'Verificação e testes' }),
  Object.freeze({ id: 'entrega', name: 'Entrega e proteção do software' }),
  Object.freeze({ id: 'manutencao', name: 'Manutenção e resposta a vulnerabilidades' }),
]);

export const FRAMEWORKS = Object.freeze([
  Object.freeze({
    id: 'ssdf',
    name: 'NIST SSDF 1.1 (SP 800-218)',
    url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
  }),
  Object.freeze({
    id: 'samm',
    name: 'OWASP SAMM 2.0',
    url: 'https://owaspsamm.org/model/',
  }),
  Object.freeze({
    id: 'sdl',
    name: 'Microsoft SDL',
    url: 'https://www.microsoft.com/en-us/securityengineering/sdl/practices',
  }),
]);

const SSDF_PDF = 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218.pdf';
const SAMM = 'https://owaspsamm.org/model/';
const SDL = 'https://www.microsoft.com/en-us/securityengineering/sdl/practices/';

/**
 * status do relacionamento:
 *  - 'conferido': identificador e título da prática foram conferidos na fonte
 *    oficial na data REFERENCES_CHECKED_ON. O vínculo continua sendo uma
 *    interpretação do SecureTrack.
 *  - 'pendente': não foi possível conferir; não deve ser tratado como verificado.
 */
function rel(framework, reference, sourceUrl, interpretation, status = 'conferido') {
  return Object.freeze({ framework, reference, sourceUrl, interpretation, status });
}

const RAW_CONTROLS = [
  {
    id: 'ST-01',
    title: 'Requisitos de segurança definidos',
    area: 'planejamento',
    description:
      'O projeto possui requisitos de segurança escritos, revisados e conhecidos pela equipe, ' +
      'além dos requisitos funcionais.',
    guidance:
      'Verifique se existe uma lista de requisitos de segurança (autenticação, autorização, ' +
      'privacidade, registro de eventos etc.) e se ela é revisada quando o escopo muda.',
    evidenceExamples: [
      'Seção de requisitos de segurança no documento de requisitos',
      'Critérios de aceite de segurança em histórias de usuário',
    ],
    defaultPriority: 'alta',
    relationships: [
      rel('ssdf', 'PO.1 — Define Security Requirements for Software Development (tarefa PO.1.2)', SSDF_PDF,
        'PO.1.2 trata de identificar, documentar e manter requisitos de segurança do software desenvolvido.'),
      rel('samm', 'Design › Security Requirements — Stream A: Software Requirements',
        SAMM + 'design/security-requirements/',
        'A prática SAMM aborda a definição de requisitos de segurança do software.'),
      rel('sdl', 'Practice 1 — Establish security standards, metrics, and governance',
        SDL + 'security-program-management',
        'A página da prática trata de manter requisitos e uma linha de base mínima de segurança.'),
    ],
  },
  {
    id: 'ST-02',
    title: 'Dados sensíveis identificados',
    area: 'planejamento',
    description:
      'A equipe sabe quais dados o software trata, quais são sensíveis e onde eles são armazenados ou transmitidos.',
    guidance:
      'Procure um inventário simples dos dados tratados, com classificação (público, interno, sensível) ' +
      'e indicação de onde ficam.',
    evidenceExamples: [
      'Tabela de inventário de dados com classificação',
      'Diagrama indicando onde dados sensíveis circulam',
    ],
    defaultPriority: 'alta',
    relationships: [
      rel('ssdf', 'PW.1 — Design Software to Meet Security Requirements and Mitigate Security Risks (tarefa PW.1.1)', SSDF_PDF,
        'Interpretação: conhecer os dados tratados é insumo para a avaliação de risco prevista em PW.1.1.'),
      rel('samm', 'Operations › Operational Management — Stream A: Data Protection',
        SAMM + 'operations/operational-management/',
        'O stream de proteção de dados pressupõe saber quais dados precisam de proteção.'),
      rel('samm', 'Design › Threat Assessment — Stream A: Application Risk Profile',
        SAMM + 'design/threat-assessment/',
        'Interpretação: o perfil de risco da aplicação considera os dados que ela trata.'),
      rel('sdl', 'Practice 3 — Perform security design review and threat modeling',
        SDL + 'secure-by-design',
        'A página discute ativos sensíveis e quais dados o sistema trata durante a modelagem.'),
    ],
  },
  {
    id: 'ST-03',
    title: 'Modelagem de ameaças realizada',
    area: 'arquitetura',
    description:
      'As principais ameaças ao software foram identificadas de forma estruturada e as mitigações foram registradas.',
    guidance:
      'Verifique se há um modelo de ameaças (por exemplo, STRIDE) com ativos, limites de confiança, ' +
      'ameaças e mitigações, e se ele foi atualizado após mudanças relevantes de arquitetura.',
    evidenceExamples: [
      'Documento de modelagem de ameaças com data de revisão',
      'Itens de trabalho criados para as mitigações identificadas',
    ],
    defaultPriority: 'alta',
    relationships: [
      rel('ssdf', 'PW.1 — Design Software to Meet Security Requirements and Mitigate Security Risks (tarefa PW.1.1)', SSDF_PDF,
        'PW.1.1 cita modelagem de ameaças, de ataque ou mapeamento de superfície de ataque.'),
      rel('samm', 'Design › Threat Assessment — Stream B: Threat Modeling',
        SAMM + 'design/threat-assessment/',
        'Correspondência direta de tema: modelagem de ameaças.'),
      rel('sdl', 'Practice 3 — Perform security design review and threat modeling',
        SDL + 'secure-by-design',
        'A prática descreve modelagem de ameaças com STRIDE e acompanhamento das mitigações.'),
    ],
  },
  {
    id: 'ST-04',
    title: 'Superfície de ataque reduzida e privilégio mínimo',
    area: 'arquitetura',
    description:
      'O software expõe apenas o necessário e cada componente ou usuário recebe somente as permissões de que precisa.',
    guidance:
      'Confira se funções, portas, rotas e permissões desnecessárias foram removidas ou desativadas e se as ' +
      'configurações padrão são seguras.',
    evidenceExamples: [
      'Lista de pontos de entrada revisada',
      'Matriz de permissões por perfil ou componente',
    ],
    defaultPriority: 'media',
    relationships: [
      rel('ssdf', 'PW.1 — Design Software to Meet Security Requirements and Mitigate Security Risks (tarefa PW.1.1)', SSDF_PDF,
        'Interpretação: o mapeamento de superfície de ataque citado em PW.1.1 apoia a sua redução.'),
      rel('ssdf', 'PW.9 — Configure Software to Have Secure Settings by Default (tarefa PW.9.1)', SSDF_PDF,
        'Configurações padrão seguras reduzem a exposição desnecessária.'),
      rel('samm', 'Design › Secure Architecture — Stream A: Architecture Design',
        SAMM + 'design/secure-architecture/',
        'Interpretação: decisões de arquitetura segura incluem limitar exposição e privilégios.'),
      rel('sdl', 'Practice 3 — Perform security design review and threat modeling',
        SDL + 'secure-by-design',
        'A página lista minimizar a superfície de ataque, privilégio mínimo e configuração segura por padrão.'),
    ],
  },
  {
    id: 'ST-05',
    title: 'Validação de entradas e saída segura',
    area: 'implementacao',
    description:
      'Dados recebidos são validados antes do uso e dados exibidos ou enviados a outros sistemas são codificados ' +
      'de forma adequada ao contexto.',
    guidance:
      'Verifique se há validação por lista de valores permitidos, limites de tamanho e codificação de saída ' +
      '(por exemplo, evitar inserir texto do usuário como HTML).',
    evidenceExamples: [
      'Módulo ou função central de validação',
      'Testes que rejeitam entradas inválidas',
    ],
    defaultPriority: 'alta',
    relationships: [
      rel('ssdf', 'PW.5 — Create Source Code by Adhering to Secure Coding Practices (tarefa PW.5.1)', SSDF_PDF,
        'Os exemplos de PW.5.1 incluem validar entradas e validar/codificar saídas.'),
    ],
  },
  {
    id: 'ST-06',
    title: 'Tratamento seguro de erros e registros',
    area: 'implementacao',
    description:
      'Erros são tratados sem expor detalhes internos ao usuário e os registros não guardam segredos ou dados sensíveis.',
    guidance:
      'Observe mensagens de erro exibidas ao usuário, o comportamento em falhas e o conteúdo dos registros (logs).',
    evidenceExamples: [
      'Padrão de tratamento de erros documentado',
      'Amostra de log revisada sem dados sensíveis',
    ],
    defaultPriority: 'media',
    relationships: [
      rel('ssdf', 'PW.5 — Create Source Code by Adhering to Secure Coding Practices (tarefa PW.5.1)', SSDF_PDF,
        'Os exemplos de PW.5.1 incluem detectar e tratar erros adequadamente e prover registro e rastreamento.'),
      rel('sdl', 'Practice 2 — Require use of proven security features, languages, and frameworks',
        SDL + 'secure-platforms',
        'Interpretação parcial: a página menciona registro de segurança (security logging), não tratamento de erros.'),
    ],
  },
  {
    id: 'ST-07',
    title: 'Dependências gerenciadas',
    area: 'implementacao',
    description:
      'Bibliotecas e componentes de terceiros são conhecidos, escolhidos com critério e atualizados quando há ' +
      'vulnerabilidades. Marque "não aplicável" se o projeto realmente não usa dependências.',
    guidance:
      'Verifique se há inventário de dependências (manifesto, lockfile ou SBOM), versões fixadas e rotina de ' +
      'atualização ou alerta de vulnerabilidades.',
    evidenceExamples: [
      'Arquivo de manifesto e lockfile versionados',
      'Registro de atualização de dependência vulnerável',
    ],
    defaultPriority: 'alta',
    relationships: [
      rel('ssdf', 'PW.4 — Reuse Existing, Well-Secured Software When Feasible Instead of Duplicating Functionality (tarefas PW.4.1 e PW.4.4)', SSDF_PDF,
        'PW.4.1 e PW.4.4 tratam de adquirir, manter e verificar componentes de terceiros.'),
      rel('samm', 'Implementation › Secure Build — Stream B: Software Dependencies',
        SAMM + 'implementation/secure-build/',
        'Correspondência direta de tema: dependências de software.'),
      rel('sdl', 'Practice 5 — Secure the software supply chain',
        'https://www.microsoft.com/securityengineering/sdl/practices/sscs',
        'A página trata de inventariar dependências e atualizar componentes vulneráveis.'),
    ],
  },
  {
    id: 'ST-08',
    title: 'Segredos e repositório protegidos',
    area: 'entrega',
    description:
      'Senhas, tokens e chaves não ficam no código-fonte e o acesso ao repositório é controlado.',
    guidance:
      'Confira o histórico do repositório em busca de segredos, o uso de .gitignore, proteção de branch, ' +
      'revisão obrigatória antes do merge e autenticação multifator.',
    evidenceExamples: [
      'Configuração de proteção da branch principal',
      'Política de armazenamento de segredos fora do código',
    ],
    defaultPriority: 'alta',
    relationships: [
      rel('ssdf', 'PS.1 — Protect All Forms of Code from Unauthorized Access and Tampering (tarefa PS.1.1)', SSDF_PDF,
        'PS.1.1 trata de armazenar o código em repositório com privilégio mínimo. Interpretação: segredos no código ampliam o impacto de acesso indevido.'),
      rel('samm', 'Implementation › Secure Deployment — Stream B: Secret Management',
        SAMM + 'implementation/secure-deployment/',
        'Correspondência direta de tema: gestão de segredos.'),
      rel('sdl', 'Practice 6 — Secure the engineering environment',
        'https://www.microsoft.com/securityengineering/sdl/practices/secure-dev-infra',
        'A página trata de acesso ao controle de versão, autenticação multifator e proteção de branch.'),
      rel('sdl', 'Practice 2 — Require use of proven security features, languages, and frameworks',
        SDL + 'secure-platforms',
        'A página menciona gestão de identidades e de segredos com serviços próprios para isso.'),
    ],
  },
  {
    id: 'ST-09',
    title: 'Revisão de código',
    area: 'verificacao',
    description:
      'Alterações são revisadas por outra pessoa, com atenção a aspectos de segurança, antes de serem integradas.',
    guidance:
      'Verifique se pull requests exigem aprovação e se há checklist ou orientação de segurança para revisores.',
    evidenceExamples: [
      'Pull requests com aprovação registrada',
      'Checklist de revisão com itens de segurança',
    ],
    defaultPriority: 'media',
    relationships: [
      rel('ssdf', 'PW.7 — Review and/or Analyze Human-Readable Code to Identify Vulnerabilities and Verify Compliance with Security Requirements (tarefa PW.7.2)', SSDF_PDF,
        'PW.7.2 trata de revisar ou analisar o código e fazer a triagem dos problemas encontrados.'),
      rel('sdl', 'Practice 6 — Secure the engineering environment',
        'https://www.microsoft.com/securityengineering/sdl/practices/secure-dev-infra',
        'A página recomenda exigir revisão e aprovação de código em pull requests.'),
      rel('sdl', 'Practice 7 — Perform security testing',
        SDL + 'security-testing',
        'A página cita revisões de código manuais e automatizadas combinadas a testes.'),
    ],
  },
  {
    id: 'ST-10',
    title: 'Testes funcionais e de segurança',
    area: 'verificacao',
    description:
      'Há testes que verificam o funcionamento esperado e também casos de abuso, como entradas maliciosas.',
    guidance:
      'Procure casos de teste derivados dos requisitos de segurança e testes de casos negativos (rejeição de ' +
      'entradas inválidas, acesso indevido).',
    evidenceExamples: [
      'Suíte de testes com casos negativos',
      'Relatório de execução de testes',
    ],
    defaultPriority: 'alta',
    relationships: [
      rel('ssdf', 'PW.8 — Test Executable Code to Identify Vulnerabilities and Verify Compliance with Security Requirements (tarefa PW.8.2)', SSDF_PDF,
        'PW.8.2 trata de planejar, executar e documentar testes e fazer a triagem dos problemas.'),
      rel('samm', 'Verification › Requirements-driven Testing — Streams A (Control Verification) e B (Misuse/Abuse Testing)',
        SAMM + 'verification/requirements-driven-testing/',
        'Testes derivados de requisitos e testes de abuso.'),
      rel('sdl', 'Practice 7 — Perform security testing',
        SDL + 'security-testing',
        'A prática trata de testes de segurança por métodos manuais e automatizados.'),
    ],
  },
  {
    id: 'ST-11',
    title: 'Verificações automatizadas',
    area: 'verificacao',
    description:
      'Testes e ferramentas de análise rodam automaticamente (por exemplo, a cada alteração) com critérios ' +
      'definidos para aprovar ou bloquear a entrega.',
    guidance:
      'Verifique se há pipeline de integração contínua executando testes e análises e se os critérios de falha ' +
      'estão documentados. Ferramentas automáticas não garantem ausência de vulnerabilidades.',
    evidenceExamples: [
      'Arquivo de workflow de integração contínua',
      'Histórico de execuções do pipeline',
    ],
    defaultPriority: 'media',
    relationships: [
      rel('ssdf', 'PO.3 — Implement Supporting Toolchains (tarefa PO.3.1)', SSDF_PDF,
        'PO.3.1 trata de especificar ferramentas e sua integração na cadeia de ferramentas.'),
      rel('ssdf', 'PO.4 — Define and Use Criteria for Software Security Checks (tarefa PO.4.1)', SSDF_PDF,
        'PO.4.1 trata de definir critérios para as verificações de segurança.'),
      rel('samm', 'Verification › Security Testing — Stream A: Scalable Baseline',
        SAMM + 'verification/security-testing/',
        'Interpretação: uma linha de base escalável de testes costuma depender de automação.'),
      rel('sdl', 'Practice 7 — Perform security testing',
        SDL + 'security-testing',
        'A página cita análise estática na automação de build e integração ao pipeline de CI/CD.'),
    ],
  },
  {
    id: 'ST-12',
    title: 'Documentação de segurança e limitações',
    area: 'entrega',
    description:
      'Usuários e mantenedores encontram informações sobre configurações de segurança, decisões tomadas e ' +
      'limitações conhecidas do software.',
    guidance:
      'Verifique se o README ou outro documento descreve configurações seguras, riscos residuais e o que o ' +
      'software não protege.',
    evidenceExamples: [
      'Seção de segurança e limitações no README',
      'Registro de decisões de arquitetura',
    ],
    defaultPriority: 'media',
    relationships: [
      rel('ssdf', 'PW.9 — Configure Software to Have Secure Settings by Default (tarefa PW.9.2)', SSDF_PDF,
        'PW.9.2 trata de documentar as configurações padrão para administradores.'),
      rel('ssdf', 'PW.1 — Design Software to Meet Security Requirements and Mitigate Security Risks (tarefa PW.1.2)', SSDF_PDF,
        'PW.1.2 trata de registrar e manter requisitos, riscos e decisões de projeto.'),
      rel('sdl', 'Practice 1 — Establish security standards, metrics, and governance',
        SDL + 'security-program-management',
        'Interpretação parcial: a página exige documentar exceções às políticas, com riscos e plano de correção.'),
    ],
  },
  {
    id: 'ST-13',
    title: 'Entregas íntegras e identificáveis',
    area: 'entrega',
    description:
      'Cada versão entregue é identificada (por exemplo, por tag ou número de versão) e é possível verificar ' +
      'que ela não foi alterada.',
    guidance:
      'Confira se versões têm tag, notas de versão, artefatos arquivados e algum meio de verificação de ' +
      'integridade (hash, assinatura ou atestação).',
    evidenceExamples: [
      'Tags e releases versionadas',
      'Hash publicado junto ao artefato',
    ],
    defaultPriority: 'media',
    relationships: [
      rel('ssdf', 'PS.2 — Provide a Mechanism for Verifying Software Release Integrity (tarefa PS.2.1)', SSDF_PDF,
        'PS.2.1 trata de disponibilizar informação para verificar a integridade das versões.'),
      rel('ssdf', 'PS.3 — Archive and Protect Each Software Release (tarefas PS.3.1 e PS.3.2)', SSDF_PDF,
        'PS.3 trata de arquivar cada versão e manter dados de proveniência.'),
      rel('samm', 'Implementation › Secure Build — Stream A: Build Process',
        SAMM + 'implementation/secure-build/',
        'Interpretação: um processo de build definido apoia entregas reproduzíveis e identificáveis.'),
      rel('samm', 'Implementation › Secure Deployment — Stream A: Deployment Process',
        SAMM + 'implementation/secure-deployment/',
        'Interpretação: o processo de implantação controla o que é entregue.'),
      rel('sdl', 'Practice 5 — Secure the software supply chain',
        'https://www.microsoft.com/securityengineering/sdl/practices/sscs',
        'A página trata de SBOM com checksums e de assinatura e atestação de artefatos.'),
    ],
  },
  {
    id: 'ST-14',
    title: 'Relato e tratamento de vulnerabilidades',
    area: 'manutencao',
    description:
      'Existe um canal conhecido para comunicar vulnerabilidades e um processo para analisar, priorizar e corrigir.',
    guidance:
      'Verifique se há SECURITY.md ou política equivalente, quem recebe os relatos e como as correções são ' +
      'priorizadas e acompanhadas.',
    evidenceExamples: [
      'Arquivo SECURITY.md com orientação de comunicação',
      'Registro de vulnerabilidades com prioridade e prazo',
    ],
    defaultPriority: 'alta',
    relationships: [
      rel('ssdf', 'RV.1 — Identify and Confirm Vulnerabilities on an Ongoing Basis (tarefas RV.1.1 e RV.1.3)', SSDF_PDF,
        'RV.1.1 trata de receber relatos; RV.1.3 de manter política de divulgação e correção.'),
      rel('ssdf', 'RV.2 — Assess, Prioritize, and Remediate Vulnerabilities (tarefas RV.2.1 e RV.2.2)', SSDF_PDF,
        'RV.2 trata de analisar, priorizar e corrigir vulnerabilidades.'),
      rel('samm', 'Implementation › Defect Management — Stream A: Defect Tracking',
        SAMM + 'implementation/defect-management/',
        'Acompanhamento de defeitos de segurança.'),
      rel('samm', 'Operations › Incident Management — Stream B: Incident Response',
        SAMM + 'operations/incident-management/',
        'Interpretação: a resposta a incidentes complementa o tratamento de vulnerabilidades exploradas.'),
      rel('sdl', 'Practice 9 — Implement security monitoring and response',
        SDL + 'monitoring-and-response',
        'A página trata de processo de resposta com equipe de resposta (PSIRT). Não descreve a divulgação coordenada em detalhe.'),
    ],
  },
  {
    id: 'ST-15',
    title: 'Revisão de correções e prevenção de recorrência',
    area: 'manutencao',
    description:
      'Após corrigir uma vulnerabilidade, a equipe confirma a correção, procura falhas semelhantes e ajusta o ' +
      'processo para evitar que se repita.',
    guidance:
      'Procure análises de causa raiz, testes de regressão criados para a falha e mudanças de processo decorrentes.',
    evidenceExamples: [
      'Análise de causa raiz registrada',
      'Teste de regressão adicionado após correção',
    ],
    defaultPriority: 'media',
    relationships: [
      rel('ssdf', 'RV.3 — Analyze Vulnerabilities to Identify Their Root Causes (tarefas RV.3.1 a RV.3.4)', SSDF_PDF,
        'RV.3 trata de causa raiz, padrões recorrentes, falhas semelhantes e ajuste do ciclo de desenvolvimento.'),
      rel('samm', 'Implementation › Defect Management — Stream B: Metrics and Feedback',
        SAMM + 'implementation/defect-management/',
        'Interpretação: métricas e retorno sobre defeitos alimentam a prevenção de recorrência.'),
    ],
  },
];

function freezeControl(c) {
  return Object.freeze({
    ...c,
    evidenceExamples: Object.freeze([...c.evidenceExamples]),
    relationships: Object.freeze([...c.relationships]),
  });
}

export const CONTROLS = Object.freeze(RAW_CONTROLS.map(freezeControl));

export const CONTROL_IDS = Object.freeze(CONTROLS.map((c) => c.id));

const CONTROL_MAP = new Map(CONTROLS.map((c) => [c.id, c]));

export function getControl(id) {
  return CONTROL_MAP.get(id);
}

export function isKnownControlId(id) {
  return typeof id === 'string' && CONTROL_MAP.has(id);
}

export function areaName(id) {
  const a = AREAS.find((x) => x.id === id);
  return a ? a.name : id;
}

export function frameworkName(id) {
  const f = FRAMEWORKS.find((x) => x.id === id);
  return f ? f.name : id;
}

/** IDs de controles vinculados a um framework, sem duplicidade. */
export function controlIdsForFramework(frameworkId, controls = CONTROLS) {
  const ids = new Set();
  for (const c of controls) {
    if (c.relationships.some((r) => r.framework === frameworkId)) ids.add(c.id);
  }
  return [...ids];
}

export function controlIdsForArea(areaId, controls = CONTROLS) {
  return controls.filter((c) => c.area === areaId).map((c) => c.id);
}
