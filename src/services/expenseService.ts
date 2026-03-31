import { z } from "zod";
import { supabase } from "../lib/supabase";
import type {
  ApprovalPayload,
  ExpenseItemInput,
  ExpenseReport,
  PaymentMeta,
  SubmitExpensePayload
} from "../types/domain";

const expenseItemSchema: z.ZodType<ExpenseItemInput> = z.object({
  expenseDate: z.string().min(1),
  category: z.string().min(2),
  amount: z.number().positive(),
  description: z.string().min(2),
  receiptUrl: z.string().url().optional()
});

const submitExpenseSchema: z.ZodType<SubmitExpensePayload> = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(3),
  note: z.string().optional(),
  items: z.array(expenseItemSchema).min(1)
});

const approvalSchema: z.ZodType<ApprovalPayload> = z.object({
  organizationId: z.string().uuid(),
  reportId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().optional()
});

const paymentSchema: z.ZodType<PaymentMeta> = z.object({
  organizationId: z.string().uuid(),
  reportId: z.string().uuid(),
  method: z.string().min(2),
  paidAt: z.string().min(1),
  reference: z.string().optional()
});

export const ExpenseService = {
  async submitReport(payload: SubmitExpensePayload): Promise<{ reportId: string }> {
    submitExpenseSchema.parse(payload);

    const response = await supabase.functions.invoke("create-expense-report", {
      body: {
        version: "1.0",
        payload
      }
    });

    if (response.error) {
      throw response.error;
    }

    return response.data as { reportId: string };
  },

  async approveReport(
    reportId: string,
    decision: "approve" | "reject",
    organizationId: string,
    note?: string
  ): Promise<{ reportId: string; status: string }> {
    approvalSchema.parse({
      organizationId,
      reportId,
      decision,
      note
    });

    const response = await supabase.functions.invoke("approve-expense-report", {
      body: {
        version: "1.0",
        payload: {
          reportId,
          decision,
          note,
          organizationId
        }
      }
    });

    if (response.error) {
      throw response.error;
    }

    return response.data as { reportId: string; status: string };
  },

  async markPaid(
    reportId: string,
    paymentMeta: PaymentMeta
  ): Promise<{ reportId: string; reimbursementId: string }> {
    paymentSchema.parse({
      ...paymentMeta,
      reportId
    });

    const response = await supabase.functions.invoke("mark-reimbursement-paid", {
      body: {
        version: "1.0",
        payload: {
          ...paymentMeta,
          reportId
        }
      }
    });

    if (response.error) {
      throw response.error;
    }

    return response.data as { reportId: string; reimbursementId: string };
  },

  async listReports(
    organizationId: string,
    statuses?: Array<ExpenseReport["status"]>
  ): Promise<ExpenseReport[]> {
    let query = supabase
      .from("expense_reports")
      .select("*")
      .eq("organization_id", organizationId)
      .order("submitted_at", { ascending: false });

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const result = await query;
    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as ExpenseReport[];
  }
};
