-- Corrected import extracted from Chapter Budget Presentation.xlsx
-- Target org: Zeta Beta Tau UCF
-- Validated totals: income = 132410, expense = 92699
begin;

with ctx as (
  select
    '72c300a4-1525-4fa1-9c18-59c9f18b6316'::uuid as organization_id,
    (select id from auth.users where email = 'vihaan282007@gmail.com' limit 1) as user_id,
    (select id from public.accounts where organization_id = '72c300a4-1525-4fa1-9c18-59c9f18b6316'::uuid order by created_at asc limit 1) as account_id
), data(direction, amount, description, category_name) as (
  values
    ('income', 31050, 'Dues: Active', null),
    ('income', 4800, 'Dues: Inactive', null),
    ('income', 10800, 'Dues: Early Alum', null),
    ('income', 18000, 'Dues: NIB (Estimated)', null),
    ('income', 10500, 'Dues: Platinum', null),
    ('income', 800, 'Dues: Diamond', null),
    ('income', 5600, 'Dues: House', null),
    ('income', 950, 'Dues: Standards', null),
    ('income', 700, 'Dues: IVP', null),
    ('income', 850, 'Dues: EVP', null),
    ('income', 650, 'Dues: Finance Director', null),
    ('income', 750, 'Dues: Provost', null),
    ('income', 950, 'Dues: BDD', null),
    ('income', 950, 'Dues: Risk Manager', null),
    ('income', 850, 'Dues: Recruitment', null),
    ('income', 950, 'Dues: Secretary', null),
    ('income', 20160, 'Rent: Front Room', null),
    ('income', 18760, 'Rent: Back Room', null),
    ('income', 4340, 'Rent: Poker Room', null),
    ('expense', 500, 'Fixed Expenses: IFC Dues', 'Fixed Expenses'),
    ('expense', 800, 'Fixed Expenses: UCF Dues', 'Fixed Expenses'),
    ('expense', 0, 'Fixed Expenses: Returning Brother Dues (FALL)', 'Fixed Expenses'),
    ('expense', 980, 'Fixed Expenses: Internet', 'Fixed Expenses'),
    ('expense', 7000, 'Fixed Expenses: Electricity', 'Fixed Expenses'),
    ('expense', 5600, 'Fixed Expenses: Garbage', 'Fixed Expenses'),
    ('expense', 70, 'Fixed Expenses: Door Bell', 'Fixed Expenses'),
    ('expense', 378, 'Fixed Expenses: Exterminator', 'Fixed Expenses'),
    ('expense', 15540, 'Fixed Expenses: Spring NIB Dues', 'Fixed Expenses'),
    ('expense', 32200, 'Fixed Expenses: Rent', 'Fixed Expenses'),
    ('expense', 3300, 'Operating Budget: BDD', 'BDD'),
    ('expense', 2500, 'Operating Budget: Operations Director', 'Operating Allocations'),
    ('expense', 450, 'Operating Budget: Finance Director', 'Finance Director'),
    ('expense', 14900, 'Operating Budget: Programming Director', 'Operating Allocations'),
    ('expense', 4606, 'Operating Budget: Recruitment Director', 'Recruitment Director'),
    ('expense', 2000, 'Operating Budget: External Philo Director', 'EPD'),
    ('expense', 375, 'Operating Budget: Risk Manager', 'Risk Manager'),
    ('expense', 1500, 'Operating Budget: Secretary', 'Secretary')
), category_map as (
  select name, id
  from public.budget_categories
  where organization_id = '72c300a4-1525-4fa1-9c18-59c9f18b6316'::uuid
), deleted as (
  delete from public.transactions t
  using ctx
  where t.organization_id = ctx.organization_id
  returning t.id
)
insert into public.transactions (
  organization_id, account_id, category_id, direction, amount, description, occurred_on, created_by
)
select
  ctx.organization_id,
  ctx.account_id,
  cm.id as category_id,
  data.direction::public.transaction_direction,
  data.amount,
  data.description,
  '2026-03-31'::date as occurred_on,
  ctx.user_id
from ctx
cross join data
left join category_map cm on cm.name = data.category_name
where ctx.user_id is not null;

-- Recalculate budget spent amounts from current transactions
update public.budget_categories
set spent_amount = 0
where organization_id = '72c300a4-1525-4fa1-9c18-59c9f18b6316'::uuid;

update public.budget_categories bc
set spent_amount = coalesce(tx.total_spent, 0)
from (
  select category_id, sum(amount) as total_spent
  from public.transactions
  where organization_id = '72c300a4-1525-4fa1-9c18-59c9f18b6316'::uuid
    and direction = 'expense'
    and category_id is not null
  group by category_id
) tx
where bc.id = tx.category_id
  and bc.organization_id = '72c300a4-1525-4fa1-9c18-59c9f18b6316'::uuid;

commit;
