import { applyExpenseTransition, canTransitionExpenseStatus } from "./expenseWorkflow";

describe("expense workflow transitions", () => {
  it("allows valid transitions", () => {
    expect(canTransitionExpenseStatus("submitted", "approved")).toBe(true);
    expect(canTransitionExpenseStatus("submitted", "rejected")).toBe(true);
    expect(canTransitionExpenseStatus("approved", "paid")).toBe(true);
    expect(applyExpenseTransition("submitted", "approved")).toBe("approved");
  });

  it("blocks invalid transitions", () => {
    expect(canTransitionExpenseStatus("submitted", "paid")).toBe(false);
    expect(() => applyExpenseTransition("rejected", "approved")).toThrow(
      /Invalid expense status transition/
    );
  });
});
