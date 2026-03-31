import { evaluateBudgetAlert } from "./alertRules";

describe("budget alert rules", () => {
  it("triggers warning at threshold", () => {
    const result = evaluateBudgetAlert({
      id: "cat-1",
      name: "Events",
      limit_amount: 1000,
      spent_amount: 820,
      alert_threshold: 0.8
    });
    expect(result.triggered).toBe(true);
    expect(result.severity).toBe("warning");
  });

  it("triggers critical over budget", () => {
    const result = evaluateBudgetAlert({
      id: "cat-2",
      name: "Travel",
      limit_amount: 500,
      spent_amount: 525,
      alert_threshold: 0.8
    });
    expect(result.triggered).toBe(true);
    expect(result.severity).toBe("critical");
  });

  it("stays informational below threshold", () => {
    const result = evaluateBudgetAlert({
      id: "cat-3",
      name: "Supplies",
      limit_amount: 1000,
      spent_amount: 200,
      alert_threshold: 0.8
    });
    expect(result.triggered).toBe(false);
    expect(result.severity).toBe("info");
  });
});
