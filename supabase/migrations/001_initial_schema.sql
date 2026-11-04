create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'organizer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  category text not null default 'Community',
  description text not null,
  image_url text,
  image_alt text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'organizer')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  club_id uuid not null references public.clubs (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null,
  category text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/New_York',
  venue_name text not null,
  neighborhood text not null,
  address text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency char(3) not null default 'USD',
  capacity integer not null check (capacity > 0),
  registered_count integer not null default 0 check (registered_count >= 0),
  registration_deadline timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  image_url text,
  image_alt text,
  highlights text[] not null default '{}',
  schedule jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (registered_count <= capacity),
  check (registration_deadline <= starts_at)
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.event_registrations (id) on delete cascade,
  ticket_code text not null unique,
  status text not null default 'valid' check (status in ('valid', 'used', 'cancelled')),
  issued_at timestamptz not null default now()
);

create index events_public_listing_idx on public.events (starts_at) where status = 'published';
create index events_club_idx on public.events (club_id, starts_at);
create index registrations_user_idx on public.event_registrations (user_id, created_at desc);
create index registrations_event_status_idx on public.event_registrations (event_id, status);
create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);
create index memberships_user_idx on public.club_memberships (user_id, club_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger clubs_set_updated_at before update on public.clubs
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

create or replace view public.club_member_counts
with (security_invoker = false)
as
select club_id, count(*)::integer as member_count
from public.club_memberships
group by club_id;

grant select on public.club_member_counts to anon, authenticated;

revoke all on public.profiles, public.clubs, public.club_memberships, public.events,
  public.event_registrations, public.bookmarks, public.tickets from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.clubs, public.events to anon, authenticated;
grant select on public.profiles, public.club_memberships, public.event_registrations, public.bookmarks, public.tickets to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant insert, delete on public.bookmarks to authenticated;
grant insert, update, delete on public.clubs, public.events to authenticated;

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.bookmarks enable row level security;
alter table public.tickets enable row level security;

create policy profiles_read_self on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy clubs_read_public on public.clubs
for select to anon, authenticated using (true);
create policy clubs_create_organizer on public.clubs
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('organizer', 'admin'))
);
create policy clubs_update_owner_or_admin on public.clubs
for update to authenticated
using (
  created_by = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  or exists (select 1 from public.club_memberships m where m.club_id = clubs.id and m.user_id = (select auth.uid()) and m.role = 'organizer')
)
with check (
  created_by = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  or exists (select 1 from public.club_memberships m where m.club_id = clubs.id and m.user_id = (select auth.uid()) and m.role = 'organizer')
);

create policy memberships_read_self on public.club_memberships
for select to authenticated using (user_id = (select auth.uid()));

create policy events_read_published_or_managed on public.events
for select to anon, authenticated
using (
  status = 'published'
  or created_by = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  or exists (select 1 from public.club_memberships m where m.club_id = events.club_id and m.user_id = (select auth.uid()) and m.role = 'organizer')
);
create policy events_create_for_managed_club on public.events
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    or exists (select 1 from public.club_memberships m where m.club_id = events.club_id and m.user_id = (select auth.uid()) and m.role = 'organizer')
  )
);
create policy events_update_for_managed_club on public.events
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  or exists (select 1 from public.club_memberships m where m.club_id = events.club_id and m.user_id = (select auth.uid()) and m.role = 'organizer')
)
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  or exists (select 1 from public.club_memberships m where m.club_id = events.club_id and m.user_id = (select auth.uid()) and m.role = 'organizer')
);

create policy registrations_read_self_or_event_organizer on public.event_registrations
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.events e
    join public.club_memberships m on m.club_id = e.club_id
    where e.id = event_id and m.user_id = (select auth.uid()) and m.role = 'organizer'
  )
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

create policy bookmarks_read_self on public.bookmarks
for select to authenticated using (user_id = (select auth.uid()));
create policy bookmarks_add_self on public.bookmarks
for insert to authenticated with check (user_id = (select auth.uid()));
create policy bookmarks_remove_self on public.bookmarks
for delete to authenticated using (user_id = (select auth.uid()));

create policy tickets_read_owner on public.tickets
for select to authenticated
using (exists (select 1 from public.event_registrations r where r.id = registration_id and r.user_id = (select auth.uid())));

create or replace function public.create_club(
  p_slug text,
  p_name text,
  p_description text,
  p_category text default 'Community',
  p_image_url text default null,
  p_image_alt text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_club_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id and p.role in ('organizer', 'admin')) then
    raise exception using errcode = '42501', message = 'ORGANIZER_REQUIRED';
  end if;
  insert into public.clubs (slug, name, category, description, image_url, image_alt, created_by)
    values (p_slug, p_name, p_category, p_description, p_image_url, p_image_alt, v_user_id)
    returning id into v_club_id;
  insert into public.club_memberships (club_id, user_id, role)
    values (v_club_id, v_user_id, 'organizer');
  return v_club_id;
end;
$$;

create or replace function public.join_club(p_club_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not exists (select 1 from public.clubs where id = p_club_id) then
    raise exception using errcode = 'P0002', message = 'CLUB_NOT_FOUND';
  end if;
  insert into public.club_memberships (club_id, user_id, role)
  values (p_club_id, v_user_id, 'member')
  on conflict (club_id, user_id) do nothing
  returning id into v_membership_id;
  if v_membership_id is null then
    select id into v_membership_id from public.club_memberships where club_id = p_club_id and user_id = v_user_id;
  end if;
  return v_membership_id;
end;
$$;

create or replace function public.register_for_event(p_event_id uuid)
returns table (registration_id uuid, ticket_id uuid, ticket_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity integer;
  v_registered_count integer;
  v_deadline timestamptz;
  v_status text;
  v_registered integer;
  v_registration_id uuid;
  v_ticket_id uuid;
  v_ticket_code text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select e.capacity, e.registered_count, e.registration_deadline, e.status
    into v_capacity, v_registered_count, v_deadline, v_status
    from public.events e
    where e.id = p_event_id
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'EVENT_NOT_FOUND';
  end if;
  if v_status <> 'published' then
    raise exception using errcode = 'P0001', message = 'EVENT_NOT_OPEN';
  end if;
  if v_deadline <= now() then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;

  if v_registered_count >= v_capacity then
    raise exception using errcode = 'P0001', message = 'EVENT_FULL';
  end if;

  insert into public.event_registrations (event_id, user_id)
    values (p_event_id, v_user_id)
    on conflict (event_id, user_id) do nothing
    returning id into v_registration_id;
  if v_registration_id is null then
    raise exception using errcode = '23505', message = 'ALREADY_REGISTERED';
  end if;

  update public.events
    set registered_count = registered_count + 1
    where id = p_event_id;

  v_ticket_code := 'NXC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.tickets (registration_id, ticket_code)
    values (v_registration_id, v_ticket_code)
    returning id into v_ticket_id;

  return query select v_registration_id, v_ticket_id, v_ticket_code;
end;
$$;

revoke all on function public.join_club(uuid) from public;
revoke all on function public.create_club(text, text, text, text, text, text) from public;
revoke all on function public.register_for_event(uuid) from public;
grant execute on function public.join_club(uuid) to authenticated;
grant execute on function public.create_club(text, text, text, text, text, text) to authenticated;
grant execute on function public.register_for_event(uuid) to authenticated;
