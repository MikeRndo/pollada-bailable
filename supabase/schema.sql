-- Gran Pollada Bailable · esquema para sincronizar varios celulares
-- Pega esto en Supabase → SQL Editor → Run.

create table if not exists public.tickets (
  id              uuid primary key,
  numero          integer not null unique check (numero > 0),   -- evita números duplicados entre celulares
  compra_id       uuid,                                          -- agrupa varios tickets de una misma compra
  firma           text not null,
  comprador       text not null,
  telefono        text not null default '',
  metodo_pago     text not null check (metodo_pago in ('Yape', 'Efectivo')),
  estado_pago     text not null check (estado_pago in ('Pagado', 'Pendiente')),
  estado_entrega  text not null default 'Pendiente' check (estado_entrega in ('Pendiente', 'PorRecoger', 'Entregado')),
  fecha_registro  timestamptz not null default now(),
  fecha_pago      timestamptz,
  fecha_escaneo   timestamptz,
  fecha_entrega   timestamptz
);

-- Si ya habías creado la tabla antes, esto agrega la columna nueva:
alter table public.tickets add column if not exists compra_id uuid;
create index if not exists tickets_compra_idx on public.tickets (compra_id);
alter table public.tickets add column if not exists fecha_escaneo timestamptz;
alter table public.tickets drop constraint if exists tickets_estado_entrega_check;
alter table public.tickets add constraint tickets_estado_entrega_check
  check (estado_entrega in ('Pendiente', 'PorRecoger', 'Entregado'));

create table if not exists public.config (
  id         integer primary key default 1 check (id = 1),
  capacidad  integer not null default 500 check (capacidad > 0)
);
insert into public.config (id, capacidad) values (1, 500) on conflict (id) do nothing;

-- Acceso con la anon key (evento pequeño, equipo de confianza).
-- ⚠️ Cualquiera que tenga la URL + anon key puede leer/editar. No publiques el enlace.
alter table public.tickets enable row level security;
alter table public.config  enable row level security;

drop policy if exists "equipo_tickets" on public.tickets;
create policy "equipo_tickets" on public.tickets for all to anon using (true) with check (true);

drop policy if exists "equipo_config" on public.config;
create policy "equipo_config" on public.config for all to anon using (true) with check (true);

-- Tiempo real (caja ↔ cocina)
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.config;
