import { render, screen } from "@testing-library/react";
import { OverviewPage } from "./OverviewPage";

const getKpis = vi.fn();
const getAlerts = vi.fn();
const getTransactions = vi.fn();
const getBudgets = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      id: "user-1",
      organization_id: "org-1",
      full_name: "Treasurer",
      role: "treasurer"
    }
  })
}));

vi.mock("../services/dashboardService", () => ({
  DashboardService: {
    getKpis: (...args: unknown[]) => getKpis(...args),
    getAlerts: (...args: unknown[]) => getAlerts(...args)
  }
}));

vi.mock("../services/treasuryDataService", () => ({
  TreasuryDataService: {
    getTransactions: (...args: unknown[]) => getTransactions(...args),
    getBudgets: (...args: unknown[]) => getBudgets(...args)
  }
}));

describe("OverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders KPI cards and alert empty state", async () => {
    getKpis.mockResolvedValue({
      cashPosition: 200,
      monthToDateIncome: 600,
      monthToDateExpense: 400,
      burnRate: 25,
      budgetVariance: 300,
      pendingApprovals: 2,
      pendingReimbursements: 1
    });
    getAlerts.mockResolvedValue([]);
    getTransactions.mockResolvedValue([]);
    getBudgets.mockResolvedValue([]);

    render(<OverviewPage />);

    expect(await screen.findByText("Cash Position")).toBeInTheDocument();
    expect(await screen.findByText("$200.00")).toBeInTheDocument();
    expect(await screen.findByText("No active alerts")).toBeInTheDocument();
  });

  it("shows error state when service call fails", async () => {
    getKpis.mockRejectedValue(new Error("Network issue"));
    getAlerts.mockResolvedValue([]);
    getTransactions.mockResolvedValue([]);
    getBudgets.mockResolvedValue([]);

    render(<OverviewPage />);
    expect(await screen.findByText("Could not load overview")).toBeInTheDocument();
    expect(await screen.findByText("Network issue")).toBeInTheDocument();
  });
});
