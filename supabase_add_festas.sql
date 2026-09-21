-- Execute este script no Supabase (Project → SQL Editor → New query → Run)
-- depois de já ter rodado o supabase_schema.sql original.
--
-- Cria as tabelas usadas pelo novo módulo de CRM de Festas: contatos
-- (clientes), eventos (agendamentos/festas) e estações (catálogo de
-- estações de comida). Segue o mesmo padrão das tabelas existentes: cada
-- linha guarda o registro inteiro numa coluna JSONB.

create table if not exists clientes (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists eventos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists estacoes (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table clientes enable row level security;
alter table eventos enable row level security;
alter table estacoes enable row level security;

create policy "allow all - clientes" on clientes for all using (true) with check (true);
create policy "allow all - eventos" on eventos for all using (true) with check (true);
create policy "allow all - estacoes" on estacoes for all using (true) with check (true);

-- Mesma observação de segurança das outras tabelas: acesso liberado para a
-- chave "anon" do projeto, sem exigir login — adequado para uso interno
-- entre poucas pessoas de confiança, não para dados sensíveis.
