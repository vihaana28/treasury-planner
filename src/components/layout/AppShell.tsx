import { Link, NavLink, Outlet } from "react-router-dom";
import { useMemo, useState } from "react";
import type { UserRole } from "../../types/domain";
import { useAuth } from "../../context/AuthContext";
import {
  canManageMembers,
  canViewApprovals
} from "../../utils/permissions";

interface NavItem {
  to: string;
  label: string;
  visible: (role: UserRole) => boolean;
}

const navItems: NavItem[] = [
  { to: "/overview", label: "Overview", visible: () => true },
  { to: "/transactions", label: "Transactions", visible: () => true },
  { to: "/budgets", label: "Budgets", visible: () => true },
  { to: "/expense-reports", label: "Expense Reports", visible: () => true },
  { to: "/approvals", label: "Approvals", visible: canViewApprovals },
  { to: "/reimbursements", label: "Reimbursements", visible: canViewApprovals },
  { to: "/members", label: "Members", visible: canManageMembers },
  { to: "/settings", label: "Settings", visible: () => true }
];

export function AppShell(): JSX.Element {
  const { profile, signOut } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const visibleNavItems = useMemo(() => {
    if (!profile?.role) {
      return [];
    }
    return navItems.filter((item) => item.visible(profile.role));
  }, [profile?.role]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? "sidebar--open" : ""}`}>
        <Link className="brand" to="/overview">
          Treasury Ops
        </Link>
        <p className="brand-subtitle">Chapter finance control room</p>
        <nav className="nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link nav-link--active" : "nav-link")}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="content">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setNavOpen((open) => !open)}
            type="button"
            aria-label="Toggle menu"
          >
            Menu
          </button>
          <div className="topbar__identity">
            <span>{profile?.full_name ?? "Unknown user"}</span>
            <span className="role-badge">{profile?.role ?? "role missing"}</span>
          </div>
          <button className="secondary-button" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </header>
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
