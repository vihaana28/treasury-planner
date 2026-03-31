import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, createSupabaseClients, jsonResponse } from "../_shared/common.ts";

const expenseItemSchema = z.object({
  expenseDate: z.string().min(1),
  category: z.string().min(2),
  amount: z.number().positive(),
  description: z.string().min(2),
  receiptUrl: z.string().url().optional()
});

const payloadSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(3),
  note: z.string().optional(),
  items: z.array(expenseItemSchema).min(1)
});

const requestSchema = z.object({
  version: z.literal("1.0"),
  payload: payloadSchema
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = requestSchema.parse(await req.json());
    const { authClient, serviceClient } = createSupabaseClients(req);

    const userResult = await authClient.auth.getUser();
    if (userResult.error || !userResult.data.user) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const userId = userResult.data.user.id;
    const profileResult = await serviceClient
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .maybeSingle();

    if (
      profileResult.error ||
      !profileResult.data ||
      profileResult.data.organization_id !== body.payload.organizationId
    ) {
      return jsonResponse(403, { error: "Profile organization mismatch" });
    }

    const totalAmount = body.payload.items.reduce((sum, item) => sum + item.amount, 0);

    const reportInsert = await serviceClient
      .from("expense_reports")
      .insert({
        organization_id: body.payload.organizationId,
        submitted_by: userId,
        title: body.payload.title,
        note: body.payload.note ?? null,
        status: "submitted",
        total_amount: totalAmount
      })
      .select("id")
      .single();

    if (reportInsert.error || !reportInsert.data) {
      return jsonResponse(400, { error: reportInsert.error?.message ?? "Could not create report" });
    }

    const reportId = reportInsert.data.id as string;

    const itemsInsert = await serviceClient.from("expense_items").insert(
      body.payload.items.map((item) => ({
        report_id: reportId,
        organization_id: body.payload.organizationId,
        expense_date: item.expenseDate,
        category: item.category,
        amount: item.amount,
        description: item.description,
        receipt_url: item.receiptUrl ?? null
      }))
    );

    if (itemsInsert.error) {
      await serviceClient.from("expense_reports").delete().eq("id", reportId);
      return jsonResponse(400, { error: itemsInsert.error.message });
    }

    await serviceClient.from("alerts").insert({
      organization_id: body.payload.organizationId,
      type: "workflow",
      severity: "info",
      message: `New expense report submitted: ${body.payload.title}`,
      related_entity: "expense_reports",
      related_id: reportId
    });

    return jsonResponse(200, { reportId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(400, {
        error: "Validation failed",
        details: error.flatten()
      });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(500, { error: message });
  }
});
