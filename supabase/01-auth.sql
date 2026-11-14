-- Ejecutar UNA vez en Supabase: SQL Editor → New query → pegar → Run.
-- Permite que cada usuario elimine su propia cuenta desde la app (Progreso → Cuenta → Eliminar).
-- (Un usuario normal no puede borrar su cuenta con la clave pública; por eso hace falta esta función.)

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
