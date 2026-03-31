# Treasury Operations Dashboard

Role-based React + Vite + Supabase dashboard for fraternity/sorority treasury operations, with an extensible single-org schema that is ready for future multi-organization support.

## Features

- Role-aware navigation (`admin`, `treasurer`, `member`)
- Signup request flow with admin/treasurer approval queue
- Cash-flow overview KPIs
- Budget monitoring and threshold alerts (in-app)
- Expense workflow: `submit -> approve/reject -> reimburse`
- Interactive reporting via filters and drill-down tables
- Supabase schema + RLS policies + edge functions
- Unit, integration, and UI tests with Vitest + Testing Library

## Stack

- React + Vite + TypeScript
- React Router
- Supabase Auth / Postgres / Edge Functions
- Vitest + Testing Library

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

You can use either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`.

3. Run the frontend:

```bash
npm run dev
```

4. Run tests:

```bash
npm run test:run
```

## Supabase Setup

1. Run migration in your Supabase project:
   - `supabase/migrations/20260331143000_treasury_dashboard_init.sql`
   - `supabase/migrations/20260331223000_signup_requests_and_admin_approval.sql`
2. Deploy edge functions:
   - `create-expense-report`
   - `approve-expense-report`
   - `mark-reimbursement-paid`
   - `recalculate-budget-alerts`
3. Ensure edge function secrets include:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

- Signup and access:
  - New users can request access at `/signup`.
  - Treasurer/admin approves requests from the `Approvals` page.
  - Approved users are provisioned into `profiles` automatically.

## Notes

- v1 intentionally excludes bank sync and export pipelines.
- Default organization settings are USD / America/New_York.
- The schema stores `organization_id` across records for future tenant expansion.
