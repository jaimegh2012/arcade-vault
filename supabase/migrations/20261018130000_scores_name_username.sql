-- Permite el username completo (1-12, A-Z 0-9 _) como nombre en scores

alter table public.scores drop constraint scores_name_check;
alter table public.scores
  add constraint scores_name_check check (name ~ '^[A-Z0-9_]{1,12}$');

drop policy "scores_insert_public" on public.scores;
create policy "scores_insert_public" on public.scores
  for insert to anon, authenticated
  with check (
    name ~ '^[A-Z0-9_]{1,12}$'
    and score >= 0 and score <= 9999999
  );
