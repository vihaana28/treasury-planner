create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'treasurer', 'member');
create type public.expense_status as enum ('submitted', 'approved', 'rejected', 'paid');
create type public.account_type as enum ('cash', 'checking', 'savings');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'USD',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  account_type public.account_type not null default 'checking',
  balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.budget_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint valid_period check (end_date >= start_date)
);

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_id uuid not null references public.budget_periods (id) on delete cascade,
  name text not null,
  limit_amount numeric(12, 2) not null default 0,
  spent_amount numeric(12, 2) not null default 0,
  alert_threshold numeric(4, 3) not null default 0.8,
  created_at timestamptz not null default now(),
  constraint threshold_bounds check (alert_threshold >= 0 and alert_threshold <= 1)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.budget_categories (id) on delete set null,
  direction text not null check (direction in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount >= 0),
  description text not null,
  occurred_on date not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.expense_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  submitted_by uuid not null references auth.users (id),
  title text not null,
  note text,
  status public.expense_status not null default 'submitted',
  total_amount numeric(12, 2) not null default 0,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.expense_reports (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  expense_date date not null,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  receipt_url text
);

create table public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_id uuid not null references public.expense_reports (id) on delete cascade,
  actor_id uuid not null references auth.users (id),
  decision text not null check (decision in ('approve', 'reject')),
  note text,
  created_at timestamptz not null default now()
);

create table public.reimbursements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_id uuid not null unique references public.expense_reports (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  method text not null,
  reference text,
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type text not null check (type in ('budget', 'workflow', 'system')),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  message text not null,
  related_entity text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_profiles_org on public.profiles (organization_id);
create index idx_transactions_org_date on public.transactions (organization_id, occurred_on desc);
create index idx_expense_reports_org_status on public.expense_reports (organization_id, status);
create index idx_alerts_org_created on public.alerts (organization_id, created_at desc);

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.update_expense_report_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_expense_reports_updated_at
before update on public.expense_reports
for each row execute function public.update_expense_report_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budget_periods enable row level security;
alter table public.budget_categories enable row level security;
alter table public.expense_reports enable row level security;
alter table public.expense_items enable row level security;
alter table public.approval_actions enable row level security;
alter table public.reimbursements enable row level security;
alter table public.alerts enable row level security;

create policy "org read own organization"
on public.organizations for select
to authenticated
using (id = public.current_org_id());

create policy "org update by treasury admins"
on public.organizations for update
to authenticated
using (id = public.current_org_id() and public.current_user_role() in ('admin', 'treasurer'))
with check (id = public.current_org_id());

create policy "profiles read same org"
on public.profiles for select
to authenticated
using (organization_id = public.current_org_id());

create policy "profiles self insert"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and organization_id = public.current_org_id());

create policy "profiles update by admins"
on public.profiles for update
to authenticated
using (organization_id = public.current_org_id() and public.current_user_role() in ('admin', 'treasurer'))
with check (organization_id = public.current_org_id());

create policy "accounts read same org"
on public.accounts for select
to authenticated
using (organization_id = public.current_org_id());

create policy "accounts write by admins"
on public.accounts for all
to authenticated
using (organization_id = public.current_org_id() and public.current_user_role() in ('admin', 'treasurer'))
with check (organization_id = public.current_org_id());

create policy "transactions read same org"
on public.transactions for select
to authenticated
using (organization_id = public.current_org_id());

create policy "transactions write by admins"
on public.transactions for all
to authenticated
using (organization_id = public.current_org_id() and public.current_user_role() in ('admin', 'treasurer'))
with check (organization_id = public.current_org_id());

create policy "budget periods read same org"
on public.budget_periods for select
to authenticated
using (organization_id = public.current_org_id());

create policy "budget periods write by admins"
on public.budget_periods for all
to authenticated
using (organization_id = public.current_org_id() and public.current_user_role() in ('admin', 'treasurer'))
with check (organization_id = public.current_org_id());

create policy "budget categories read same org"
on public.budget_categories for select
to authenticated
using (organization_id = public.current_org_id());

create policy "budget categories write by admins"
on public.budget_categories for all
to authenticated
using (organization_id = public.current_org_id() and public.current_user_role() in ('admin', 'treasurer'))
with check (organization_id = public.current_org_id());

create policy "expense reports read same org"
on public.expense_reports for select
to authenticated
using (organization_id = public.current_org_id());

create policy "expense reports submit"
on public.expense_reports for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and submitted_by = auth.uid()
);

create policy "expense reports update by approvers"
on public.expense_reports for update
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('admin', 'treasurer')
)
with check (organization_id = public.current_org_id());

create policy "expense items read same org"
on public.expense_items for select
to authenticated
using (organization_id = public.current_org_id());

create policy "expense items submit"
on public.expense_items for insert
to authenticated
with check (organization_id = public.current_org_id());

create policy "approval actions read same org"
on public.approval_actions for select
to authenticated
using (organization_id = public.current_org_id());

create policy "approval actions create by approvers"
on public.approval_actions for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and actor_id = auth.uid()
  and public.current_user_role() in ('admin', 'treasurer')
);

create policy "reimbursements read same org"
on public.reimbursements for select
to authenticated
using (organization_id = public.current_org_id());

create policy "reimbursements write by approvers"
on public.reimbursements for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('admin', 'treasurer')
);

create policy "alerts read same org"
on public.alerts for select
to authenticated
using (organization_id = public.current_org_id());

create policy "alerts update same org"
on public.alerts for update
to authenticated
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "alerts insert by approvers"
on public.alerts for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_user_role() in ('admin', 'treasurer')
);
