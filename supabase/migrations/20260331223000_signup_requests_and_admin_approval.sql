create table if not exists public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  email text not null,
  requested_role text not null default 'member' check (requested_role in ('admin', 'treasurer', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_signup_requests_org_status
on public.signup_requests (organization_id, status, created_at);

alter table public.signup_requests enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations public signup read'
  ) then
    execute 'drop policy "organizations public signup read" on public.organizations';
  end if;
end
$$;

create policy "organizations public signup read"
on public.organizations for select
to anon, authenticated
using (true);

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles insert by approvers'
  ) then
    execute 'drop policy "profiles insert by approvers" on public.profiles';
  end if;
end
$$;

create policy "profiles insert by approvers"
on public.profiles for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles approver
    where approver.id = auth.uid()
      and approver.organization_id = profiles.organization_id
      and approver.role in ('admin', 'treasurer')
  )
);

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'signup_requests'
      and policyname = 'signup requests insert pending'
  ) then
    execute 'drop policy "signup requests insert pending" on public.signup_requests';
  end if;
end
$$;

create policy "signup requests insert pending"
on public.signup_requests for insert
to anon, authenticated
with check (
  status = 'pending'
  and requested_role in ('admin', 'treasurer', 'member')
  and reviewed_by is null
  and reviewed_at is null
);

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'signup_requests'
      and policyname = 'signup requests read own'
  ) then
    execute 'drop policy "signup requests read own" on public.signup_requests';
  end if;
end
$$;

create policy "signup requests read own"
on public.signup_requests for select
to authenticated
using (user_id = auth.uid());

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'signup_requests'
      and policyname = 'signup requests admin read'
  ) then
    execute 'drop policy "signup requests admin read" on public.signup_requests';
  end if;
end
$$;

create policy "signup requests admin read"
on public.signup_requests for select
to authenticated
using (
  exists (
    select 1
    from public.profiles approver
    where approver.id = auth.uid()
      and approver.organization_id = signup_requests.organization_id
      and approver.role in ('admin', 'treasurer')
  )
);

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'signup_requests'
      and policyname = 'signup requests admin update'
  ) then
    execute 'drop policy "signup requests admin update" on public.signup_requests';
  end if;
end
$$;

create policy "signup requests admin update"
on public.signup_requests for update
to authenticated
using (
  exists (
    select 1
    from public.profiles approver
    where approver.id = auth.uid()
      and approver.organization_id = signup_requests.organization_id
      and approver.role in ('admin', 'treasurer')
  )
)
with check (
  exists (
    select 1
    from public.profiles approver
    where approver.id = auth.uid()
      and approver.organization_id = signup_requests.organization_id
      and approver.role in ('admin', 'treasurer')
  )
);

grant select on public.organizations to anon, authenticated;
grant select, insert, update on public.signup_requests to anon, authenticated;
