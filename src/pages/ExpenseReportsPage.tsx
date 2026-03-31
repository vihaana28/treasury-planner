import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusPill } from "../components/common/StatusPill";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { ExpenseService } from "../services/expenseService";
import type { ExpenseItemInput, ExpenseReport } from "../types/domain";
import { toShortDate, toUsd } from "../utils/format";

const blankItem: ExpenseItemInput = {
  expenseDate: new Date().toISOString().slice(0, 10),
  category: "",
  amount: 0,
  description: "",
  receiptUrl: ""
};

export function ExpenseReportsPage(): JSX.Element {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [itemDraft, setItemDraft] = useState<ExpenseItemInput>(blankItem);
  const [items, setItems] = useState<ExpenseItemInput[]>([]);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadReports(): Promise<void> {
    if (!profile?.organization_id) {
      return;
    }
    setLoading(true);
    try {
      const result = await ExpenseService.listReports(profile.organization_id);
      setReports(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    void loadReports();
  }, [profile?.organization_id]);

  function addItem(): void {
    setError(null);
    if (!itemDraft.expenseDate || !itemDraft.category || !itemDraft.description) {
      setError("Expense item requires date, category, and description.");
      return;
    }
    if (itemDraft.amount <= 0) {
      setError("Expense item amount must be greater than zero.");
      return;
    }
    setItems((current) => [...current, itemDraft]);
    setItemDraft(blankItem);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (!profile?.organization_id) {
      setError("Profile is missing organization.");
      return;
    }
    if (title.trim().length < 3) {
      setError("Report title must be at least 3 characters.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one expense item before submitting.");
      return;
    }

    setSaving(true);
    try {
      await ExpenseService.submitReport({
        organizationId: profile.organization_id,
        title: title.trim(),
        note: note.trim() ? note.trim() : undefined,
        items
      });
      setTitle("");
      setNote("");
      setItems([]);
      await loadReports();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to submit report");
    } finally {
      setSaving(false);
    }
  }

  const visibleReports = useMemo(() => {
    if (!profile) {
      return reports;
    }
    if (profile.role === "member") {
      return reports.filter((report) => report.submitted_by === profile.id);
    }
    return reports;
  }, [reports, profile]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Expense Pipeline</p>
          <h1>Expense Reports</h1>
        </div>
      </header>

      <div className="panel-grid">
        <article className="panel">
          <h2>Submit report</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Report title
              <input
                aria-label="Report title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Social event supplies"
              />
            </label>
            <label>
              Note
              <textarea
                aria-label="Note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
              />
            </label>
            <fieldset className="item-builder">
              <legend>Add line item</legend>
              <label>
                Date
                <input
                  type="date"
                  value={itemDraft.expenseDate}
                  onChange={(event) =>
                    setItemDraft((current) => ({ ...current, expenseDate: event.target.value }))
                  }
                />
              </label>
              <label>
                Category
                <input
                  value={itemDraft.category}
                  onChange={(event) =>
                    setItemDraft((current) => ({ ...current, category: event.target.value }))
                  }
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDraft.amount}
                  onChange={(event) =>
                    setItemDraft((current) => ({
                      ...current,
                      amount: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label>
                Description
                <input
                  value={itemDraft.description}
                  onChange={(event) =>
                    setItemDraft((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label>
                Receipt URL
                <input
                  type="url"
                  value={itemDraft.receiptUrl}
                  onChange={(event) =>
                    setItemDraft((current) => ({ ...current, receiptUrl: event.target.value }))
                  }
                  placeholder="https://..."
                />
              </label>
              <button type="button" className="secondary-button" onClick={addItem}>
                Add item
              </button>
            </fieldset>

            {items.length > 0 ? (
              <div className="inline-list" aria-label="Expense items list">
                {items.map((item, index) => (
                  <p key={`${item.category}-${index}`}>
                    {item.expenseDate} • {item.category} • {toUsd(item.amount)}
                  </p>
                ))}
              </div>
            ) : null}

            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Submitting..." : "Submit report"}
            </button>
          </form>
        </article>

        <article className="panel">
          <h2>Recent reports</h2>
          {loading ? <StateMessage kind="loading" title="Loading reports..." /> : null}
          {!loading && visibleReports.length === 0 ? (
            <StateMessage title="No reports yet" detail="Submitted reports will appear here." />
          ) : null}
          {!loading && visibleReports.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th className="align-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report) => (
                    <tr key={report.id}>
                      <td>{toShortDate(report.submitted_at)}</td>
                      <td>{report.title}</td>
                      <td>
                        <StatusPill status={report.status} />
                      </td>
                      <td className="align-right">{toUsd(report.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
