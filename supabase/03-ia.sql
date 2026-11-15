-- Límite diario de recetas con IA por usuario.
-- La tabla y las funciones solo las usa la Edge Function (con la clave de servicio, que vive en Supabase).
-- Ningún usuario puede leer ni tocar esto desde la app. Se puede ejecutar más de una vez sin problema.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default (now() at time zone 'utc')::date,
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;   -- sin políticas: nadie accede desde la app
revoke all on table public.ai_usage from anon, authenticated;

-- Reserva una petición. Devuelve cuántas quedan hoy, o -1 si ya se alcanzó el límite.
create or replace function public.ai_take_quota(p_user uuid, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if p_limit is null or p_limit < 1 then raise exception 'límite no válido'; end if;
  insert into public.ai_usage (user_id, day, count)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
    where public.ai_usage.count < p_limit
  returning count into v_count;
  if v_count is null then return -1; end if;
  return p_limit - v_count;
end;
$$;

-- Devuelve la petición si la IA falló por nuestra parte (para no gastar el cupo del usuario).
create or replace function public.ai_refund_quota(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;

revoke all on function public.ai_take_quota(uuid, integer) from public, anon, authenticated;
revoke all on function public.ai_refund_quota(uuid)        from public, anon, authenticated;
grant execute on function public.ai_take_quota(uuid, integer) to service_role;
grant execute on function public.ai_refund_quota(uuid)        to service_role;
