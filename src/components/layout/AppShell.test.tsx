import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";

const signOut = vi.fn();
let role: "admin" | "treasurer" | "member" = "member";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      id: "user-1",
      organization_id: "org-1",
      full_name: "Test User",
      role
    },
    signOut
  })
}));

function renderShell(): void {
  render(
    <MemoryRouter initialEntries={["/overview"]}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route path="overview" element={<div>Overview content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("AppShell", () => {
  it("shows menu toggle and member-safe navigation", async () => {
    role = "member";
    renderShell();

    expect(await screen.findByRole("button", { name: "Toggle menu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Expense Reports" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Approvals" })).not.toBeInTheDocument();
  });

  it("shows approvals navigation for treasurer", async () => {
    role = "treasurer";
    renderShell();
    expect(await screen.findByRole("link", { name: "Approvals" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Members" })).toBeInTheDocument();
  });
});
