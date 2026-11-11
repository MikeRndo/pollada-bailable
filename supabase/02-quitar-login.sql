-- Ejecutar en Supabase → SQL Editor → Run
-- Vuelve a permitir que la app guarde SIN iniciar sesión (y borra lo del enlace público)
drop policy if exists "personal_tickets" on public.tickets;
drop policy if exists "personal_config"  on public.config;
drop policy if exists "equipo_tickets"   on public.tickets;
drop policy if exists "equipo_config"    on public.config;

create policy "equipo_tickets" on public.tickets for all to anon, authenticated using (true) with check (true);
create policy "equipo_config"  on public.config  for all to anon, authenticated using (true) with check (true);

drop function if exists public.ticket_publico(uuid);
