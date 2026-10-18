-- SPEC 12: perfiles de usuario (username) ligados a auth.users + trigger de alta

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null check (username ~ '^[A-Za-z0-9_]{3,12}$'),
  created_at  timestamptz not null default now()
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- RLS: select público; sin policies de insert/update/delete (solo el trigger escribe).
alter table public.profiles enable row level security;

create policy "profiles_select_public" on public.profiles
  for select to anon, authenticated using (true);

-- Crea el perfil al registrarse. Nunca falla por colisión de username:
-- si el nombre ya existe se recorta y se añade sufijo numérico (kai, kai_2, kai_3…).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name  text;
  base      text;
  cand      text;
  suffix    text;
  n         int := 1;
begin
  -- email: username del formulario; GitHub: user_name; Google: name; último recurso: email
  raw_name := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'user_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'user'
  );

  base := left(regexp_replace(raw_name, '[^A-Za-z0-9_]', '', 'g'), 12);
  if length(base) < 3 then
    base := rpad(base, 3, '_');
  end if;

  cand := base;
  loop
    begin
      insert into public.profiles (id, username) values (new.id, cand);
      exit;
    exception when unique_violation then
      n := n + 1;
      suffix := '_' || n::text;
      cand := left(base, 12 - length(suffix)) || suffix;
    end;
  end loop;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
