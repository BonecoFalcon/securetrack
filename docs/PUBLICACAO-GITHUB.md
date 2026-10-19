# Como publicar no GitHub usando o GitHub Desktop

Guia para iniciantes. Não exige serviços pagos nem credenciais além da sua conta gratuita do GitHub.

## 1. Preparar a pasta local

1. Coloque a pasta `securetrack` em um local fácil, por exemplo `Documentos/securetrack`.
2. Confira que ela contém `index.html`, `README.md`, `package.json` e as pastas `js`, `css`, `docs` e `tests`.
3. Abra o `LICENSE` e, se quiser, troque "Autores do SecureTrack" pelo seu nome.
4. Em `docs/USO-DA-IA.md`, preencha a seção "Registro do aluno" com o que você revisou.

## 2. Executar a aplicação e os testes

1. Instale o Node.js LTS (22 ou 24) em <https://nodejs.org/>.
2. Abra um terminal na pasta `securetrack`:
   - Windows: na pasta, clique na barra de endereço, digite `cmd` e pressione Enter.
   - macOS: clique com o botão direito na pasta → *Novo Terminal na Pasta* (ou abra o Terminal e use `cd`).
3. Rode os testes:

   ```bash
   npm test
   ```

   Ao final deve aparecer `pass 100` e `fail 0`.
4. Rode a aplicação:

   ```bash
   npm start
   ```

   Abra <http://127.0.0.1:8000/> e faça os testes manuais de `docs/TESTES.md`. Encerre com `Ctrl+C`.

## 3. Adicionar ou criar o repositório local

1. Instale o GitHub Desktop: <https://desktop.github.com/> e entre com sua conta.
2. Menu **File → Add local repository…** e escolha a pasta `securetrack`.
3. Como a pasta ainda não é um repositório, o GitHub Desktop vai oferecer **create a repository**. Clique nele.
4. Na tela de criação:
   - **Name:** `securetrack`
   - **Git ignore:** *None* (o projeto já tem `.gitignore`)
   - **License:** *None* (o projeto já tem `LICENSE`)
5. Clique em **Create repository**.

## 4. Revisar arquivos e impedir exposição de dados e segredos

Antes do primeiro commit, olhe a lista **Changes** à esquerda.

- Devem aparecer somente arquivos do projeto: `index.html`, `css/`, `js/`, `data/demo.json`, `img/`, `docs/`, `tests/`, `tools/`, `scripts/`, `.github/`, `README.md`, `SECURITY.md`, `LICENSE`, `package.json`, `.gitignore`.
- **Não** devem aparecer: `.env`, chaves (`.pem`, `.key`), backups `securetrack-backup-*.json`, conteúdo bruto `securetrack-conteudo-bruto-*.txt`, `node_modules/`, `.DS_Store`.
- Se algo indevido aparecer, clique com o botão direito no arquivo → **Ignore file** ou desmarque a caixa ao lado dele.
- Abra `data/demo.json` e confirme que só contém dados simulados.
- Procure no projeto por senhas, tokens, e-mails ou nomes reais que não devam ser públicos.

Lembre: tudo que entra em um commit fica no histórico, mesmo que você apague depois.

## 5. Fazer o primeiro commit

1. No canto inferior esquerdo, em **Summary**, escreva: `Versão inicial do SecureTrack`.
2. Clique em **Commit to main**.

## 6. Publicar como repositório público

1. Clique em **Publish repository** (barra superior).
2. **Desmarque** *Keep this code private* para tornar o repositório público.
3. Confira o nome e clique em **Publish repository**.
4. Clique em **Repository → View on GitHub** para abrir a página.

## 7. Conferir README e GitHub Actions

1. Na página do repositório, confirme que o README aparece formatado.
2. Abra a aba **Actions**. O workflow **Testes** deve rodar no push para `main`.
3. Aguarde os jobs `22.x` e `24.x` ficarem verdes. Se falharem, abra o job, leia o erro e corrija localmente.
4. Antes de confiar no workflow, confira os SHAs fixados em `.github/workflows/tests.yml`:
   - Abra <https://github.com/actions/checkout/releases> e <https://github.com/actions/setup-node/releases>.
   - Clique na tag indicada no comentário (v7.0.1 e v7.1.0) e compare o SHA do commit com o do arquivo.
5. Em **Settings → Security** (ou *Code security*), ative **Private vulnerability reporting** se disponível e atualize o `SECURITY.md` dizendo que esse é o canal.

## 8. Criar a release v1.0.0

1. Na página do repositório, clique em **Releases → Create a new release** (ou *Draft a new release*).
2. Em **Choose a tag**, digite `v1.0.0` e escolha *Create new tag on publish*.
3. Título: `SecureTrack v1.0.0`.
4. Descrição sugerida: funcionalidades principais, aviso de que é ferramenta educacional e link para `docs/TESTES.md`.
5. Clique em **Publish release**. O GitHub gera os arquivos `.zip` e `.tar.gz` do código.

## 9. Confirmar o acesso público em janela anônima

1. Copie o endereço do repositório (ex.: `https://github.com/SEU-USUARIO/securetrack`).
2. Abra uma janela anônima/privada do navegador, sem login.
3. Cole o endereço e confirme que o código, o README e a release aparecem.

## 10. Hospedar uma demonstração é opcional

Publicar o **código** (passos acima) é diferente de **hospedar a aplicação** para uso no navegador.

- O código no GitHub já permite que qualquer pessoa baixe e rode localmente.
- Se quiser uma demonstração online, use o **GitHub Pages**: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, pasta `/ (root)`, **Save**. Depois de alguns minutos o site fica em `https://SEU-USUARIO.github.io/securetrack/`. A aplicação usa caminhos relativos, então funciona nesse subdiretório.
- Ao hospedar, lembre que:
  - Os dados de cada visitante ficam só no navegador dele; nada é enviado ao GitHub.
  - O GitHub Pages não permite cabeçalhos HTTP personalizados. Proteções como `frame-ancestors` não ficam garantidas (ver `docs/SEGURANCA.md`).
  - Os arquivos `docs/`, `tests/` e `tools/` também ficam acessíveis pelo site. Isso não é um problema porque não contêm segredos.
