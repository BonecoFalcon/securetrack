# Política de segurança

## Escopo de suporte

O SecureTrack é um projeto acadêmico e educacional, mantido sem garantia de suporte ou de prazos de correção.

| Versão | Suporte |
|---|---|
| 1.0.x (branch `main`) | Recebe correções de segurança no melhor esforço |
| Versões anteriores | Sem suporte |

Estão no escopo: o código desta aplicação (`index.html`, `css/`, `js/`, `data/`, `scripts/serve.js`) e o workflow de testes. Estão fora do escopo: o navegador, a hospedagem escolhida por quem publicar uma cópia, e os referenciais citados (NIST, OWASP, Microsoft).

O `scripts/serve.js` é um servidor só para desenvolvimento local. Não o use para expor a aplicação na internet.

## Como comunicar uma vulnerabilidade

**Canal privado: ainda não definido.** O mantenedor deve configurar um canal privado antes de divulgar o projeto (sugestão: ativar o *Private vulnerability reporting* nas configurações de segurança do repositório no GitHub). Esta seção deve ser atualizada quando isso acontecer.

Até lá:

1. **Não publique detalhes sensíveis em issues públicas**, pull requests ou discussões. Isso inclui passos de exploração, provas de conceito e dados afetados.
2. Se o repositório oferecer o botão **Report a vulnerability** (aba *Security*), use-o.
3. Se não houver canal privado, abra uma issue pública apenas pedindo um contato privado, **sem descrever a vulnerabilidade**.

Ao relatar, se possível, informe: versão ou commit, navegador, passos para reproduzir, impacto esperado e se há uma correção sugerida.

## O que esperar

Por ser um projeto acadêmico, não há prazo garantido de resposta. Relatos válidos serão analisados, corrigidos quando possível e registrados nas notas de versão sem expor detalhes antes da correção.

## Lembrete de uso

O SecureTrack guarda dados apenas no navegador, sem criptografia nem controle de acesso. Não registre nele credenciais, tokens, dados pessoais ou detalhes confidenciais de vulnerabilidades.
