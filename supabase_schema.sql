-- Execute este script inteiro no Supabase: Project → SQL Editor → New query → Run
-- Cria as 4 tabelas que o app usa, cada uma guardando os dados em uma coluna
-- JSONB (mesmo formato que já era usado no localStorage) para não precisar
-- mapear campo por campo.

create table if not exists comercios (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists entregas (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists prospectos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

-- Habilita Row Level Security (obrigatório no Supabase) e libera acesso
-- total de leitura/escrita para a chave "anon" (pública do projeto).
--
-- ATENÇÃO: isso significa que qualquer pessoa que descobrir a URL e a chave
-- anon do seu projeto Supabase consegue ler e alterar os dados. Como é uma
-- ferramenta interna de uso só entre você e sua esposa, e a chave não fica
-- exposta publicamente (só dentro do app), o risco é baixo — mas não
-- coloque dados sensíveis (senhas, dados bancários) nessas tabelas, e não
-- publique a URL/chave em lugar público. Se um dia quiser mais segurança,
-- dá para adicionar login por e-mail/senha e trocar essas policies por
-- regras que exigem autenticação.

alter table comercios enable row level security;
alter table entregas enable row level security;
alter table prospectos enable row level security;
alter table settings enable row level security;

create policy "allow all - comercios" on comercios for all using (true) with check (true);
create policy "allow all - entregas" on entregas for all using (true) with check (true);
create policy "allow all - prospectos" on prospectos for all using (true) with check (true);
create policy "allow all - settings" on settings for all using (true) with check (true);
