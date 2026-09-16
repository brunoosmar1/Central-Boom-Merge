# Central de Gestão — Boom Algodão Doce

App em React + Vite com tudo em um só lugar: painel de vendas/prospecção,
prospecção de comércios (com disparo de mensagem de triagem por WhatsApp),
cadastro de comércios, lançamentos de entrega/venda com recibo em PDF/imagem,
e resumo com valor a receber e saldo pendente por comércio.

## Configurando o banco de dados compartilhado (Supabase)

Os dados agora ficam num banco compartilhado — você e sua esposa veem os
mesmos dados, em aparelhos diferentes. Para ativar:

1. Crie uma conta grátis em **supabase.com** e um novo projeto.
2. No painel do projeto, vá em **SQL Editor → New query**, cole todo o
   conteúdo do arquivo `supabase_schema.sql` (na raiz deste projeto) e
   clique em **Run**. Isso cria as tabelas necessárias.
3. Vá em **Project Settings → API** e copie a **Project URL** e a chave
   **anon public**.
4. Na Vercel, abra o projeto → **Settings → Environment Variables** e
   adicione:
   - `VITE_SUPABASE_URL` = a Project URL que você copiou
   - `VITE_SUPABASE_ANON_KEY` = a chave anon public que você copiou
5. Refaça o deploy (a Vercel pede pra redeployar depois de adicionar
   variáveis de ambiente — tem um botão "Redeploy" no painel).

Sem essas variáveis configuradas, o app continua funcionando normalmente,
só que salvando os dados apenas no aparelho local (como funcionava antes) —
por isso não quebra nada se você quiser testar antes de configurar o banco.

**Nota de segurança:** as tabelas ficam com acesso liberado para a chave
"anon" (pública) do projeto, sem exigir login — é a forma mais simples de
colocar no ar rápido para uso entre vocês dois. Isso significa que qualquer
pessoa que descubra a URL e a chave do seu projeto Supabase consegue ler e
alterar os dados. Não é recomendado para dados sensíveis, e se um dia quiser
mais segurança dá para adicionar login por e-mail/senha.

**Sincronização:** cada vez que o app abre (ou quando você toca no ícone de
atualizar no topo, ao lado do título), ele busca os dados mais recentes do
servidor. Não é uma sincronização "ao vivo" (se sua esposa lançar algo
enquanto você está com o app aberto, você só vê a mudança ao atualizar) —
mas resolve o caso de uso de vocês dois mexerem em horários diferentes.

## Mensagem de triagem por WhatsApp (aba Prospecção)

Cada comércio da lista de prospecção tem um botão **"Enviar WhatsApp"**, que
abre o WhatsApp já com uma mensagem pronta (editável no topo da aba, tocando
em "Editar"), perguntando se o comércio tem interesse em consignação — sem
precisar visitar pessoalmente no horário de pico. Quando o comércio responder
interessado, é só marcar o status como "Visitado" e, quando a entrega for
combinada, "Fechado" (que libera o botão de criar o comércio automaticamente
no cadastro).

Isso **não é** envio em massa nem leitura automática de respostas — cada
mensagem ainda é enviada manualmente, um toque por vez, usando o WhatsApp
normal do celular. Automação completa (disparo em massa e leitura de
respostas) exigiria a API oficial do WhatsApp Business (Meta), que tem
aprovação de conta comercial e custo por conversa — um projeto à parte, não
incluído aqui.

## Rodando localmente

```bash
npm install
```

Crie um arquivo `.env` (copie de `.env.example`) com suas credenciais do
Supabase, depois:

```bash
npm run dev
```

Abre em `http://localhost:5173`.

## Deploy na Vercel


**Opção 1 — pelo site da Vercel (mais simples, sem usar terminal):**
1. Crie uma conta em https://vercel.com (dá pra usar login do GitHub, Google etc.)
2. Suba esta pasta para um repositório no GitHub (crie um repositório vazio e
   faça o upload dos arquivos pela própria interface do GitHub, sem precisar
   de linha de comando).
3. Na Vercel, clique em **Add New → Project**, selecione o repositório e
   clique em **Deploy**. A Vercel detecta automaticamente que é um projeto
   Vite e configura tudo sozinha.

**Opção 2 — pelo terminal (Vercel CLI):**
```bash
npm install -g vercel
cd controle-consignado-boom
vercel
```
Siga as instruções no terminal (login, nome do projeto, confirmar deploy).
Rodar `vercel --prod` depois publica a versão definitiva.

## Recibo de consignação

Ao salvar um lançamento (aba "Lançamentos"), o app já abre automaticamente um
recibo com: estoque anterior, quantidade reposta, quantidade vendida, quantidade
recolhida (avaria/vencido/devolução) e estoque atual no ponto — pronto para
enviar na hora.

- **"Compartilhar agora"** abre o menu nativo de compartilhamento do celular
  (funciona em Android/Chrome e iPhone/Safari) com a imagem do recibo já
  pronta — é só escolher o WhatsApp do responsável no comércio.
- **"WhatsApp (texto)"** é um atalho alternativo que abre o WhatsApp com um
  resumo em texto (usa o telefone cadastrado do comércio, se houver).
- **"Baixar imagem"** salva o recibo como PNG no aparelho, caso prefira
  enviar manualmente por outro app.

Cada recibo já feito pode ser reaberto a qualquer momento pelo botão
"Recibo" no card do lançamento correspondente.

## Estrutura do projeto

```
index.html          — página HTML base
src/main.jsx         — ponto de entrada do React
src/App.jsx          — toda a lógica e telas do app
package.json         — dependências (React + lucide-react)
vite.config.js       — configuração do Vite
```
