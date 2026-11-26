-- Ejecutar UNA vez en Supabase: SQL Editor → New query → pegar → Run. Se puede repetir sin problema.
-- Catálogo de alimentos COMPARTIDO: cuando alguien escanea el envase de un producto, queda guardado y
-- el resto de usuarios ya lo encuentran sin subir foto. Las fotos NO se guardan; solo los datos nutricionales.
-- Seguridad: todos los usuarios con sesión pueden leer; solo se escribe con food_add() (valida y evita duplicados).

create extension if not exists pgcrypto;

create table if not exists public.foods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  brand       text not null default '' check (char_length(brand) <= 60),
  barcode     text check (barcode is null or barcode ~ '^[0-9]{6,14}$'),
  name_key    text not null,                       -- nombre+marca en minúsculas y sin acentos: evita duplicados y sirve para buscar
  kcal100     numeric(6,1) not null check (kcal100 between 0 and 900),
  protein100  numeric(5,1) not null check (protein100 between 0 and 100),
  carbs100    numeric(5,1) not null check (carbs100 between 0 and 100),
  fat100      numeric(5,1) not null check (fat100 between 0 and 100),
  sugar100    numeric(5,1) check (sugar100 between 0 and 100),
  fiber100    numeric(5,1) check (fiber100 between 0 and 100),
  salt100     numeric(5,2) check (salt100 between 0 and 100),
  unit_name   text check (unit_name is null or char_length(unit_name) <= 24),   -- «loncha», «yogur», «galleta»…
  unit_g      numeric(6,1) check (unit_g is null or unit_g between 1 and 2000), -- gramos de una unidad
  ingredients text check (ingredients is null or char_length(ingredients) <= 1500),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  reports     integer not null default 0
);
create unique index if not exists foods_key_uq on public.foods (name_key);
create unique index if not exists foods_barcode_uq on public.foods (barcode) where barcode is not null;
create index if not exists foods_key_idx on public.foods (name_key text_pattern_ops);

alter table public.foods enable row level security;
drop policy if exists "foods_select" on public.foods;
create policy "foods_select" on public.foods for select to authenticated using (reports < 3 or created_by = auth.uid());
revoke all on public.foods from anon, authenticated;
grant select on public.foods to authenticated;     -- escribir solo con food_add()

-- Normaliza para comparar: minúsculas, sin acentos, solo letras y números.
create or replace function public.food_key(p_name text, p_brand text)
returns text language sql immutable as $$
  select trim(regexp_replace(translate(lower(coalesce(p_name,'') || ' ' || coalesce(p_brand,'')), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'), '[^a-z0-9]+', ' ', 'g'))
$$;

-- Añade un alimento (o devuelve el que ya existía con el mismo código de barras o nombre+marca).
create or replace function public.food_add(p jsonb)
returns public.foods
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := left(trim(coalesce(p->>'name','')), 80);
  v_brand text := left(trim(coalesce(p->>'brand','')), 60);
  v_code text := nullif(regexp_replace(coalesce(p->>'barcode',''), '[^0-9]', '', 'g'), '');
  v_key text; v_row public.foods;
begin
  if v_uid is null then raise exception 'sin sesión'; end if;
  if char_length(v_name) < 2 then raise exception 'nombre no válido'; end if;
  v_key := public.food_key(v_name, v_brand);
  if v_code is not null then select * into v_row from public.foods where barcode = v_code; if found then return v_row; end if; end if;
  select * into v_row from public.foods where name_key = v_key; if found then return v_row; end if;
  insert into public.foods (name, brand, barcode, name_key, kcal100, protein100, carbs100, fat100, sugar100, fiber100, salt100, unit_name, unit_g, ingredients, created_by)
  values (v_name, v_brand, case when v_code ~ '^[0-9]{6,14}$' then v_code end, v_key,
          (p->>'kcal100')::numeric, (p->>'protein100')::numeric, (p->>'carbs100')::numeric, (p->>'fat100')::numeric,
          nullif(p->>'sugar100','')::numeric, nullif(p->>'fiber100','')::numeric, nullif(p->>'salt100','')::numeric,
          nullif(left(trim(coalesce(p->>'unit_name','')), 24), ''), nullif(p->>'unit_g','')::numeric,
          nullif(left(coalesce(p->>'ingredients',''), 1500), ''), v_uid)
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.food_add(jsonb) from public, anon;
grant execute on function public.food_add(jsonb) to authenticated;

-- «Estos datos están mal»: con 3 avisos de personas distintas el alimento deja de mostrarse.
create table if not exists public.food_reports (
  food_id uuid not null references public.foods (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (food_id, user_id)
);
alter table public.food_reports enable row level security;
revoke all on public.food_reports from anon, authenticated;
create or replace function public.food_report(p_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  insert into public.food_reports (food_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  if found then update public.foods set reports = reports + 1 where id = p_id; end if;
end;
$$;
revoke all on function public.food_report(uuid) from public, anon;
grant execute on function public.food_report(uuid) to authenticated;

-- Límite diario de fotos leídas por la IA (lo usa solo la Edge Function «scan-food»).
create table if not exists public.scan_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default (now() at time zone 'utc')::date,
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);
alter table public.scan_usage enable row level security;
revoke all on table public.scan_usage from anon, authenticated;
create or replace function public.scan_take_quota(p_user uuid, p_limit integer)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
  if p_limit is null or p_limit < 1 then raise exception 'límite no válido'; end if;
  insert into public.scan_usage (user_id, day, count) values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = public.scan_usage.count + 1 where public.scan_usage.count < p_limit
  returning count into v_count;
  if v_count is null then return -1; end if;
  return p_limit - v_count;
end;
$$;
create or replace function public.scan_refund_quota(p_user uuid)
returns void language sql security definer set search_path = public
as $$ update public.scan_usage set count = greatest(count - 1, 0) where user_id = p_user and day = (now() at time zone 'utc')::date $$;
revoke all on function public.scan_take_quota(uuid, integer), public.scan_refund_quota(uuid) from public, anon, authenticated;
