-- Import extracted from Chapter Budget Presentation.xlsx
-- Target org: Zeta Beta Tau UCF
begin;

-- Optional cleanup of prior imports from this workbook for 2026-03-31
delete from public.transactions where organization_id = '72c300a4-1525-4fa1-9c18-59c9f18b6316'::uuid and description like '[%] row %:%' and occurred_on = '2026-03-31';

with ctx as (
  select '72c300a4-1525-4fa1-9c18-59c9f18b6316'::uuid as organization_id,
         (select id from auth.users where email = 'vihaan282007@gmail.com' limit 1) as user_id
), data(direction, amount, description) as (
  values
    ('income', 132410, '[summary] row 3: Summary: Revenue'),
    ('income', 31050, '[main] row 4: Dues: Active'),
    ('expense', 250, '[officer] row 4: Recruitment Director: Syllabus Week - DT'),
    ('expense', 63068, '[summary] row 4: Summary: Fixed Expenses'),
    ('income', 4800, '[main] row 5: Dues: Inactive'),
    ('expense', 66, '[officer] row 5: Recruitment Director: Syllabus Week - Bid Cards'),
    ('expense', 29631, '[summary] row 5: Summary: Operating Expenses'),
    ('income', 10800, '[main] row 6: Dues: Early Alum'),
    ('expense', 400, '[officer] row 6: Recruitment Director: Pre-Rush- Bottles'),
    ('income', 18000, '[main] row 7: Dues: NIB (Estimated)'),
    ('expense', 50, '[officer] row 7: Recruitment Director: Pre-Rush-Mixers/Cheap Alc'),
    ('income', 10500, '[main] row 8: Dues: Platinum'),
    ('expense', 200, '[officer] row 8: Recruitment Director: Pre-Rush - Post Game Keg'),
    ('income', 800, '[main] row 9: Dues: Diamond'),
    ('expense', 250, '[officer] row 9: Recruitment Director: Rush Day 1- Food (Chick-fil-a)'),
    ('expense', 38769, '[summary] row 9: Summary: National Debt Owed'),
    ('income', 5600, '[main] row 10: Dues: House'),
    ('expense', 20, '[officer] row 10: Recruitment Director: Rush Day 1 - Water'),
    ('income', 950, '[main] row 11: Dues: Standards'),
    ('expense', 600, '[officer] row 11: Recruitment Director: Rush Day 1 - Bounce Table'),
    ('income', 700, '[main] row 12: Dues: IVP'),
    ('expense', 200, '[officer] row 12: Recruitment Director: Rush Day 1 - Postgame Keg'),
    ('income', 850, '[main] row 13: Dues: EVP'),
    ('expense', 50, '[officer] row 13: Recruitment Director: Rush Day 1- Mixers/Beer'),
    ('income', 650, '[main] row 14: Dues: Finance Director'),
    ('expense', 100, '[officer] row 14: Recruitment Director: Rush Day 2 - Food (Costco)'),
    ('income', 750, '[main] row 15: Dues: Provost'),
    ('expense', 20, '[officer] row 15: Recruitment Director: Rush Day 2 - Water'),
    ('income', 950, '[main] row 16: Dues: BDD'),
    ('expense', 250, '[officer] row 16: Recruitment Director: Rush Day 2 - DT'),
    ('income', 950, '[main] row 17: Dues: Risk Manager'),
    ('expense', 100, '[officer] row 17: Recruitment Director: Rush Pool Day- Beer'),
    ('income', 850, '[main] row 18: Dues: Recruitment'),
    ('expense', 20, '[officer] row 18: Recruitment Director: Rush Day 3 - Water'),
    ('income', 950, '[main] row 19: Dues: Secretary'),
    ('expense', 50, '[officer] row 19: Recruitment Director: Rush Day 3 - Mixers/Cheap Alc'),
    ('expense', 200, '[officer] row 20: Recruitment Director: Rush Day 3- Postgame Keg'),
    ('expense', 20, '[officer] row 21: Recruitment Director: Rush Day 4 - Water'),
    ('income', 20160, '[main] row 22: Rent: Front Room'),
    ('expense', 1760, '[officer] row 22: Recruitment Director: 80 Rush Shirts'),
    ('income', 18760, '[main] row 23: Rent: Back Room'),
    ('income', 4340, '[main] row 24: Rent: Poker Room'),
    ('expense', 2000, '[officer] row 27: BDD: 22 stoles'),
    ('expense', 500, '[officer] row 28: BDD: Beer Olympics - Keg/Beer'),
    ('expense', 500, '[officer] row 29: BDD: Senior Sendoff'),
    ('expense', 300, '[officer] row 30: BDD: Beach Retreat'),
    ('expense', 1500, '[officer] row 35: Secretary: Composite'),
    ('expense', 500, '[main] row 39: Fixed Expenses: IFC Dues'),
    ('expense', 800, '[main] row 40: Fixed Expenses: UCF Dues'),
    ('expense', 300, '[officer] row 40: Risk Manager: Uber Safety Fund'),
    ('expense', 75, '[officer] row 41: Risk Manager: First Aid Fund'),
    ('expense', 980, '[main] row 42: Fixed Expenses: Internet'),
    ('expense', 7000, '[main] row 43: Fixed Expenses: Electricity'),
    ('expense', 5600, '[main] row 44: Fixed Expenses: Garbage'),
    ('expense', 70, '[main] row 45: Fixed Expenses: Door Bell'),
    ('expense', 378, '[main] row 46: Fixed Expenses: Exterminator'),
    ('expense', 2400, '[officer] row 46: EVP: Social #1- KD'),
    ('expense', 15540, '[main] row 47: Fixed Expenses: Spring NIB Dues'),
    ('expense', 1300, '[officer] row 47: EVP: Social #2- PiPhi'),
    ('expense', 32200, '[main] row 48: Fixed Expenses: Rent'),
    ('expense', 2500, '[officer] row 48: EVP: Social #3- AXID'),
    ('expense', 4200, '[officer] row 49: EVP: GAD #1'),
    ('expense', 4500, '[officer] row 50: EVP: Tahiti Party'),
    ('expense', 3300, '[main] row 51: Operating Budget: BDD'),
    ('expense', 2500, '[main] row 52: Operating Budget: Operations Director'),
    ('expense', 450, '[main] row 53: Operating Budget: Finance Director'),
    ('expense', 14900, '[main] row 54: Operating Budget: Programming Director'),
    ('expense', 4606, '[main] row 55: Operating Budget: Recruitment Director'),
    ('expense', 1050, '[officer] row 55: IVP: Bar Rebuild - Wood'),
    ('expense', 2000, '[main] row 56: Operating Budget: External Philo Director'),
    ('expense', 100, '[officer] row 56: IVP: Bar Rebuild- Paint/Stain'),
    ('expense', 375, '[main] row 57: Operating Budget: Risk Manager'),
    ('expense', 200, '[officer] row 57: IVP: Bar Rebuild - Hardware'),
    ('expense', 1500, '[main] row 58: Operating Budget: Secretary'),
    ('expense', 435, '[officer] row 58: IVP: Bar Rebuild- Steel Paneling'),
    ('expense', 200, '[officer] row 59: IVP: Outside Cameras'),
    ('expense', 40, '[officer] row 60: IVP: Past Projects - ZTA Chairs'),
    ('expense', 80, '[officer] row 61: IVP: Past Projects - DDD Bench'),
    ('expense', 395, '[officer] row 62: IVP: House Safety Fund'),
    ('expense', 11611, '[main] row 66: National Debt Owed: 2024 Returning Brother Dues'),
    ('expense', 27158, '[main] row 67: National Debt Owed: 2025 Returning Brother Dues'),
    ('expense', 450, '[officer] row 67: Finance Director: Dover Days'),
    ('expense', 150, '[officer] row 72: EPD: Car Wash'),
    ('expense', 200, '[officer] row 73: EPD: Field Day Equipment'),
    ('expense', 100, '[officer] row 74: EPD: Trophy'),
    ('expense', 500, '[officer] row 75: EPD: Catering'),
    ('expense', 350, '[officer] row 76: EPD: Surfboards'),
    ('expense', 700, '[officer] row 77: EPD: Philo Comps')
)
insert into public.transactions (
  organization_id, account_id, category_id, direction, amount, description, occurred_on, created_by
)
select
  ctx.organization_id,
  null::uuid as account_id,
  null::uuid as category_id,
  data.direction,
  data.amount,
  data.description,
  '2026-03-31'::date as occurred_on,
  ctx.user_id as created_by
from ctx
cross join data
where ctx.user_id is not null;

commit;
