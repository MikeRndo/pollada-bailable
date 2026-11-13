-- Ejecutar UNA vez en Supabase → SQL Editor → Run
-- Agrega el nombre del vendedor a cada ticket
alter table public.tickets add column if not exists vendedor text not null default '';
create index if not exists tickets_vendedor_idx on public.tickets (vendedor);
