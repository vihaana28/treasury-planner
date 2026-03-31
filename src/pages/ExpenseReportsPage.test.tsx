import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseReportsPage } from "./ExpenseReportsPage";

const listReports = vi.fn();
const submitReport = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      id: "user-1",
      organization_id: "00000000-0000-0000-0000-000000000001",
      full_name: "Member One",
      role: "member"
    }
  })
}));

vi.mock("../services/expenseService", () => ({
  ExpenseService: {
    listReports: (...args: unknown[]) => listReports(...args),
    submitReport: (...args: unknown[]) => submitReport(...args)
  }
}));

describe("ExpenseReportsPage", () => {
  beforeEach(() => {
    listReports.mockResolvedValue([]);
    submitReport.mockResolvedValue({ reportId: "rep-1" });
  });

  it("shows empty state when no reports exist", async () => {
    render(<ExpenseReportsPage />);
    expect(await screen.findByText("No reports yet")).toBeInTheDocument();
  });

  it("validates that at least one line item exists before submit", async () => {
    const user = userEvent.setup();
    render(<ExpenseReportsPage />);

    await user.type(screen.getByLabelText("Report title"), "Dues reimbursement");
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    expect(
      await screen.findByText("Add at least one expense item before submitting.")
    ).toBeInTheDocument();
    expect(submitReport).not.toHaveBeenCalled();
  });
});
