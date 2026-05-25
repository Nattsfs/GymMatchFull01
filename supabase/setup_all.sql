-- =============================================================
-- GYM MATCH — Script completo de setup do banco
-- Cole e execute este arquivo inteiro no SQL Editor do Supabase
-- =============================================================

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
create type public.plan_type as enum ('free','gold','diamond');

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
create unique index if not exists likes_from_to_unique on public.likes (from_user, to_user);

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

-- =========== SUBSCRIPTION PLANS ===========
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name plan_type not null unique,
  price numeric(10,2) not null default 0,
  benefits_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
create policy "plans read" on public.subscription_plans for select to authenticated using (true);
create policy "plans admin write" on public.subscription_plans for all to authenticated
  using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

insert into public.subscription_plans (name, price, benefits_json) values
  ('free',    0.00,  '{"daily_likes": 20, "max_matches": 5,  "images_in_chat": false, "undo": false, "see_likes": 0,  "boost": false, "advanced_filters": false}'::jsonb),
  ('gold',    29.90, '{"daily_likes": -1, "max_matches": 20, "images_in_chat": true,  "undo": true,  "see_likes": 5,  "boost": false, "advanced_filters": false}'::jsonb),
  ('diamond', 59.90, '{"daily_likes": -1, "max_matches": -1, "images_in_chat": true,  "undo": true,  "see_likes": -1, "boost": true,  "advanced_filters": true}'::jsonb)
on conflict (name) do update set price = excluded.price, benefits_json = excluded.benefits_json;

-- =========== USER SUBSCRIPTIONS ===========
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_subs_user on public.user_subscriptions(user_id);
alter table public.user_subscriptions enable row level security;
create policy "subs self read" on public.user_subscriptions for select to authenticated
  using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "subs self insert" on public.user_subscriptions for insert to authenticated
  with check (user_id = auth.uid());
create policy "subs admin update" on public.user_subscriptions for update to authenticated
  using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

-- =========== PROFILE BOOSTS ===========
create table public.profile_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_boosts_user on public.profile_boosts(user_id);
alter table public.profile_boosts enable row level security;
create policy "boost self read" on public.profile_boosts for select to authenticated
  using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "boost self insert" on public.profile_boosts for insert to authenticated
  with check (user_id = auth.uid());

-- =========== PROFILE HISTORY ===========
create table public.profile_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  field_changed text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);
create index if not exists idx_phistory_user on public.profile_history(user_id);
alter table public.profile_history enable row level security;
create policy "phistory self read" on public.profile_history for select to authenticated
  using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "phistory insert" on public.profile_history for insert to authenticated
  with check (user_id = auth.uid() or has_role(auth.uid(),'admin'));

-- =========== SUBSCRIPTIONS (STRIPE) ===========
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_stripe_id on public.subscriptions(stripe_subscription_id);
alter table public.subscriptions enable row level security;
create policy "subscriptions self read" on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);
create policy "subscriptions service manage" on public.subscriptions for all to service_role
  using (true) with check (true);

-- =========== USER GYMS ===========
create table public.user_gyms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (user_id, gym_id)
);
create index if not exists user_gyms_user_idx on public.user_gyms(user_id);
create index if not exists user_gyms_gym_idx on public.user_gyms(gym_id);
alter table public.user_gyms enable row level security;
create policy "user_gyms self read" on public.user_gyms for select to authenticated
  using (user_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role));
create policy "user_gyms self insert" on public.user_gyms for insert to authenticated
  with check (user_id = auth.uid());
create policy "user_gyms self delete" on public.user_gyms for delete to authenticated
  using (user_id = auth.uid());

-- =========== USER PHOTOS ===========
create table public.user_photos (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  url        text        not null,
  position   int         not null default 0,
  created_at timestamptz not null default now()
);
create index on public.user_photos (user_id, position);
alter table public.user_photos enable row level security;
create policy "user_photos self all" on public.user_photos for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "user_photos others read" on public.user_photos for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_photos.user_id
        and p.status = 'active'
        and p.profile_complete = true
    )
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

create or replace function public.mark_match_messaged()
returns trigger language plpgsql as $$
begin
  update public.matches set has_messages = true where id = new.match_id and has_messages = false;
  return new;
end $$;
create trigger trg_msg_mark after insert on public.messages
for each row execute function public.mark_match_messaged();

create or replace function public.log_profile_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fields text[] := array['name','bio','photo_url','goal','training_level','training_split','sexual_orientation','gender','plan','status','hide_orientation','hide_hours'];
  f text;
  old_v text;
  new_v text;
begin
  foreach f in array fields loop
    execute format('select ($1).%I::text, ($2).%I::text', f, f) into old_v, new_v using old, new;
    if old_v is distinct from new_v then
      insert into public.profile_history(user_id, field_changed, old_value, new_value)
        values (new.id, f, old_v, new_v);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_log_profile_changes on public.profiles;
create trigger trg_log_profile_changes
  after update on public.profiles
  for each row execute function public.log_profile_changes();

-- =========== RPCs ===========
create or replace function public.get_profile_deck(current_user_id uuid, page_limit integer default 20, page_offset integer default 0)
returns table(user_id uuid, name text, age integer, gender text, goal text, training_level text, preferred_modalities text[], available_hours text[], photo_url text, bio text)
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  current_goal text;
  current_pref_genders text[];
begin
  select p.goal::text,
         (select array_agg(g::text) from unnest(p.gender_preference) g)
    into current_goal, current_pref_genders
  from public.profiles p
  where p.id = current_user_id;

  return query
  select distinct on (p.id)
    p.id, p.name, p.age, p.gender::text, p.goal::text, p.training_level::text,
    p.modalities,
    case when p.hide_hours then null
         else (select array_agg(h::text) from unnest(p.available_hours) h) end,
    p.photo_url, p.bio
  from public.profiles p
  where p.id <> current_user_id
    and p.status = 'active'
    and p.profile_complete = true
    and p.photo_url is not null
    and exists (
      select 1 from public.user_gyms ug_other
      where ug_other.user_id = p.id
        and ug_other.gym_id in (
          select ug_me.gym_id from public.user_gyms ug_me
          where ug_me.user_id = current_user_id
        )
    )
    and not exists (select 1 from public.likes l where l.from_user = current_user_id and l.to_user = p.id)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = current_user_id and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = current_user_id)
    )
    and (
      current_goal <> 'romance'
      or current_pref_genders is null
      or array_length(current_pref_genders, 1) is null
      or p.gender::text = any(current_pref_genders)
    )
  order by p.id, random()
  limit page_limit offset page_offset;
end;
$function$;

create or replace function public.handle_swipe(from_user uuid, to_user uuid, swipe_action text)
returns json language plpgsql security definer set search_path to 'public'
as $function$
declare
  is_like_bool boolean;
  active_count int;
  daily_count int;
  user_plan text;
  cap int;
  match_row record;
begin
  if swipe_action not in ('like', 'reject') then
    raise exception 'invalid swipe_action: %', swipe_action;
  end if;
  is_like_bool := (swipe_action = 'like');
  select plan::text into user_plan from public.profiles where id = from_user;

  if is_like_bool then
    if user_plan = 'free' then
      select count(*) into daily_count from public.likes
        where from_user = handle_swipe.from_user and is_like = true and created_at >= current_date;
      if daily_count >= 20 then
        return json_build_object('matched', false, 'blocked', true, 'reason', 'daily_limit_reached', 'plan', user_plan);
      end if;
    end if;
    cap := case user_plan when 'free' then 5 when 'gold' then 20 else null end;
    if cap is not null then
      select count(*) into active_count from public.matches m
        where m.active = true and (m.user_a = from_user or m.user_b = from_user);
      if active_count >= cap then
        return json_build_object('matched', false, 'blocked', true, 'reason', 'limit_reached', 'plan', user_plan, 'cap', cap);
      end if;
    end if;
  end if;

  insert into public.likes (from_user, to_user, is_like) values (from_user, to_user, is_like_bool) on conflict do nothing;

  if is_like_bool then
    select * into match_row from public.matches m
      where m.user_a = least(from_user, to_user) and m.user_b = greatest(from_user, to_user) limit 1;
    if found then
      return json_build_object('matched', true, 'match_id', match_row.id);
    end if;
  end if;
  return json_build_object('matched', false);
end
$function$;

create or replace function public.has_active_subscription(user_uuid uuid, check_env text default 'live')
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid and environment = check_env
      and (
        (status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end > now())
      )
  );
$$;

revoke execute on function public.get_profile_deck(uuid, int, int) from public, anon;
revoke execute on function public.handle_swipe(uuid, uuid, text) from public, anon;
grant execute on function public.get_profile_deck(uuid, int, int) to authenticated;
grant execute on function public.handle_swipe(uuid, uuid, text) to authenticated;

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

create policy "gyms read" on public.gyms for select to anon, authenticated using (true);
create policy "gyms admin write" on public.gyms for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "profile self read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profile same gym read" on public.profiles for select to authenticated
  using (
    status = 'active' and profile_complete = true and photo_url is not null
    and exists (
      select 1 from public.user_gyms ug_other
      where ug_other.user_id = profiles.id
        and ug_other.gym_id in (select ug_me.gym_id from public.user_gyms ug_me where ug_me.user_id = auth.uid())
    )
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

create policy "roles self read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin write" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "likes own read" on public.likes for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
create policy "likes own insert" on public.likes for insert to authenticated
  with check (from_user = auth.uid());

create policy "matches participants read" on public.matches for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "matches admin update" on public.matches for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

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

create policy "reports insert" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "reports read own" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "reports admin update" on public.reports for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "blocks own all" on public.blocks for all to authenticated
  using (blocker_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (blocker_id = auth.uid());

create policy "announcements read" on public.announcements for select to authenticated
  using (gym_id is null or gym_id = public.my_gym_id() or public.has_role(auth.uid(),'admin'));
create policy "announcements admin write" on public.announcements for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "audit admin read" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "audit insert" on public.audit_logs for insert to authenticated
  with check (actor_id = auth.uid() or actor_id is null);

-- =========== REALTIME ===========
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.likes;

-- =========== STORAGE ===========
insert into storage.buckets (id, name, public) values ('avatars','avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('chat-media','chat-media', false) on conflict (id) do nothing;

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
