create table public.user_photos (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  url        text        not null,
  position   int         not null default 0,
  created_at timestamptz not null default now()
);

create index on public.user_photos (user_id, position);

alter table public.user_photos enable row level security;

create policy "user_photos self all"
  on public.user_photos for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_photos others read"
  on public.user_photos for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_photos.user_id
        and p.status = 'active'
        and p.profile_complete = true
    )
  );
