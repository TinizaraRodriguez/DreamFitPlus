-- Ejecutar UNA vez en Supabase: SQL Editor → New query → pegar → Run.
-- Crea la tabla donde cada usuario guarda sus datos y las reglas de privacidad (RLS):
-- cada persona SOLO puede ver y modificar sus propias filas.

create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null check (key ~ '^dreamfit_[a-z0-9_]+$' and char_length(key) <= 64),
  value      text        check (value is null or char_length(value) <= 500000),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

drop policy if exists "user_data_select_own" on public.user_data;
drop policy if exists "user_data_insert_own" on public.user_data;
drop policy if exists "user_data_update_own" on public.user_data;
drop policy if exists "user_data_delete_own" on public.user_data;

create policy "user_data_select_own" on public.user_data
  for select to authenticated using (auth.uid() = user_id);
create policy "user_data_insert_own" on public.user_data
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_data_update_own" on public.user_data
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data_delete_own" on public.user_data
  for delete to authenticated using (auth.uid() = user_id);

-- Sin sesión (clave pública sola) no se puede leer ni escribir nada
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

-- La fecha de modificación la pone siempre el servidor
create or replace function public.touch_user_data()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch
  before update on public.user_data
  for each row execute function public.touch_user_data();
