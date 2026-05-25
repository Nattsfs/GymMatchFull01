
-- =========== ENUMS ===========
create type public.app_role as enum ('admin','student');
create type public.gender as enum ('male','female','non_binary','other');
create type public.goal as enum ('friends','training_partner','romance');
create type public.training_level as enum ('beginner','intermediate','advanced');
create type public.training_hour as enum ('morning','afternoon','night');
create type public.profile_status as enum ('active','paused','deleted','suspended');
create type public.message_type as enum ('text','audio','image');
create type public.report_reason as enum ('harassment','fake_profile','offensive_language','spam','inappropriate_behavior','racism');
create type public.report_status as enum ('pending','reviewed','action_taken','dismissed');
create type public.plan_type as enum ('free','premium');

-- =========== GYMS ===========
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  qr_code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========== PROFILES ===========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid references public.gyms(id),
  name text,
  email text,
  phone text,
  age int check (age is null or age >= 18),
  gender public.gender,
  cpf text unique,
  cpf_verified boolean not null default false,
  sexual_orientation text,
  hide_orientation boolean not null default false,
  interests text[] not null default '{}',
  goal public.goal,
  looking_for public.goal[] not null default '{}',
  gender_preference public.gender[] not null default '{}',
  training_level public.training_level,
  available_hours public.training_hour[] not null default '{}',
  hide_hours boolean not null default false,
  modalities text[] not null default '{}',
  training_split text,
  bio text,
  photo_url text,
  plan public.plan_type not null default 'free',
  status public.profile_status not null default 'active',
  profile_complete boolean not null default false,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles (gym_id);
create index on public.profiles (status);

-- =========== ROLES ===========
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create or replace function public.my_gym_id()
returns uuid language sql stable security definer set search_path=public as $$
  select gym_id from public.profiles where id = auth.uid()
$$;

-- =========== LIKES ===========
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  is_like boolean not null,
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);
create index on public.likes (to_user);

-- =========== MATCHES ===========
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  has_messages boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index on public.matches (user_a);
create index on public.matches (user_b);

-- =========== MESSAGES ===========
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type public.message_type not null default 'text',
  content text not null,
  deleted_for_user boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.messages (match_id, created_at);

-- =========== REPORTS ===========
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'pending',
  urgent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (reporter_id, reported_id)
);

-- =========== BLOCKS ===========
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

-- =========== ANNOUNCEMENTS ===========
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- =========== AUDIT LOGS ===========
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  target text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =========== TRIGGERS ===========
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'student')
    on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Mutual like => match
create or replace function public.create_match_on_mutual_like()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  reciprocal boolean;
  a uuid; b uuid;
begin
  if new.is_like is not true then return new; end if;
  select exists(
    select 1 from public.likes
    where from_user = new.to_user and to_user = new.from_user and is_like = true
  ) into reciprocal;
  if reciprocal then
    a := least(new.from_user, new.to_user);
    b := greatest(new.from_user, new.to_user);
    insert into public.matches (user_a, user_b) values (a, b)
      on conflict do nothing;
  end if;
  return new;
end $$;

create trigger trg_like_match after insert on public.likes
for each row execute function public.create_match_on_mutual_like();

-- Mark match as has_messages on first message
create or replace function public.mark_match_messaged()
returns trigger language plpgsql as $$
begin
  update public.matches set has_messages = true where id = new.match_id and has_messages = false;
  return new;
end $$;
create trigger trg_msg_mark after insert on public.messages
for each row execute function public.mark_match_messaged();

-- =========== RLS ===========
alter table public.gyms enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

-- gyms: anyone authenticated can read; admin writes; also anon read by qr_code (for join landing)
create policy "gyms read" on public.gyms for select to anon, authenticated using (true);
create policy "gyms admin write" on public.gyms for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- profiles: self read/write; same-gym read of active members; admin all
create policy "profile self read" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profile same gym read" on public.profiles for select to authenticated
  using (
    status = 'active'
    and profile_complete = true
    and gym_id is not null
    and gym_id = public.my_gym_id()
    and not exists (select 1 from public.blocks b where b.blocker_id = profiles.id and b.blocked_id = auth.uid())
    and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = profiles.id)
  );
create policy "profile admin read" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "profile self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profile admin update" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "profile self insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- user_roles: read own; admin all
create policy "roles self read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin write" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- likes: own only
create policy "likes own read" on public.likes for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
create policy "likes own insert" on public.likes for insert to authenticated
  with check (from_user = auth.uid());

-- matches: only participants; admin read
create policy "matches participants read" on public.matches for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "matches admin update" on public.matches for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- messages: only match participants; admin read
create policy "messages read" on public.messages for select to authenticated using (
  public.has_role(auth.uid(),'admin') or exists (
    select 1 from public.matches m where m.id = messages.match_id
    and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);
create policy "messages insert" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.matches m where m.id = match_id and m.active = true
    and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);
create policy "messages soft delete by sender" on public.messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- reports: insert own, read own + admin
create policy "reports insert" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "reports read own" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "reports admin update" on public.reports for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- blocks: own
create policy "blocks own all" on public.blocks for all to authenticated
  using (blocker_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (blocker_id = auth.uid());

-- announcements: read same gym or global; admin write
create policy "announcements read" on public.announcements for select to authenticated
  using (gym_id is null or gym_id = public.my_gym_id() or public.has_role(auth.uid(),'admin'));
create policy "announcements admin write" on public.announcements for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- audit logs: admin read; users insert their own
create policy "audit admin read" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "audit insert" on public.audit_logs for insert to authenticated
  with check (actor_id = auth.uid() or actor_id is null);

-- =========== REALTIME ===========
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.likes;

-- =========== STORAGE ===========
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('chat-media','chat-media', false)
on conflict (id) do nothing;

create policy "avatars public read" on storage.objects for select using (bucket_id='avatars');
create policy "avatars user upload" on storage.objects for insert to authenticated
  with check (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars user update" on storage.objects for update to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars user delete" on storage.objects for delete to authenticated
  using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat-media auth read" on storage.objects for select to authenticated
  using (bucket_id='chat-media');
create policy "chat-media user upload" on storage.objects for insert to authenticated
  with check (bucket_id='chat-media' and (storage.foldername(name))[1] = auth.uid()::text);
