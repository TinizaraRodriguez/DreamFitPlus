-- Ejecutar UNA vez en Supabase: SQL Editor → New query → pegar → Run. Se puede repetir sin problema.
-- Datos que CRECEN con el tiempo (pesos, fuerza, días, historial, carreras, medidas): UNA FILA POR REGISTRO.
-- Antes cada tipo de dato era un JSON enorme dentro de user_data; ahora, al cambiar un peso solo se envía ese peso,
-- y se puede consultar por fecha. La app migra sola lo que ya tenías la primera vez que sincroniza.
-- Privacidad (RLS): cada persona solo ve y modifica sus propias filas.

create table if not exists public.records (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('weights','history','sessions','measures','days','log','strength')),
  rid        text        not null check (char_length(rid) between 1 and 160),   -- identificador estable del registro (p. ej. la fecha)
  date       date,                                                              -- fecha del registro (para consultas por rango)
  data       jsonb       not null check (octet_length(data::text) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, rid)
);
create index if not exists records_by_date on public.records (user_id, kind, date desc);

alter table public.records enable row level security;
drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;
drop policy if exists "records_delete_own" on public.records;
create policy "records_select_own" on public.records for select to authenticated using (auth.uid() = user_id);
create policy "records_insert_own" on public.records for insert to authenticated with check (auth.uid() = user_id);
create policy "records_update_own" on public.records for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "records_delete_own" on public.records for delete to authenticated using (auth.uid() = user_id);
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;

-- La fecha de modificación la pone siempre el servidor
create or replace function public.touch_records() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records for each row execute function public.touch_records();
