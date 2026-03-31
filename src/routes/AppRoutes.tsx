import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { ApprovalsPage } from "../pages/ApprovalsPage";
import { BudgetsPage } from "../pages/BudgetsPage";
import { ExpenseReportsPage } from "../pages/ExpenseReportsPage";
import { MembersPage } from "../pages/MembersPage";
import { OverviewPage } from "../pages/OverviewPage";
import { ReimbursementsPage } from "../pages/ReimbursementsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SignInPage } from "../pages/SignInPage";
import { TransactionsPage } from "../pages/TransactionsPage";

function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { loading, session } = useAuth();
  if (loading) {
    return <div className="splash">Loading treasury workspace...</div>;
  }
  if (!session) {
    return <Navigate to="/signin" replace />;
  }
  return children;
}

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/expense-reports" element={<ExpenseReportsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/reimbursements" element={<ReimbursementsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
