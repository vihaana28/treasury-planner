import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, createSupabaseClients, jsonResponse } from "../_shared/common.ts";

const requestSchema = z.object({
  version: z.literal("1.0"),
  payload: z.object({
    organizationId: z.string().uuid(),
    reportId: z.string().uuid(),
    method: z.string().min(2),
    paidAt: z.string().min(1),
    reference: z.string().optional()
  })
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

    const actorId = userResult.data.user.id;
    const actorProfileResult = await serviceClient
      .from("profiles")
      .select("organization_id, role")
      .eq("id", actorId)
      .maybeSingle();

    if (actorProfileResult.error || !actorProfileResult.data) {
      return jsonResponse(403, { error: "Missing profile" });
    }

    const actorProfile = actorProfileResult.data;
    if (actorProfile.organization_id !== body.payload.organizationId) {
      return jsonResponse(403, { error: "Organization mismatch" });
    }
    if (actorProfile.role !== "admin" && actorProfile.role !== "treasurer") {
      return jsonResponse(403, { error: "Role cannot mark reimbursements paid" });
    }

    const reportResult = await serviceClient
      .from("expense_reports")
      .select("id, title, status, total_amount")
      .eq("id", body.payload.reportId)
      .eq("organization_id", body.payload.organizationId)
      .maybeSingle();

    if (reportResult.error || !reportResult.data) {
      return jsonResponse(404, { error: "Expense report not found" });
    }

    if (reportResult.data.status !== "approved") {
      return jsonResponse(409, { error: "Only approved reports can be marked paid" });
    }

    const reimbursementResult = await serviceClient
      .from("reimbursements")
      .insert({
        organization_id: body.payload.organizationId,
        report_id: body.payload.reportId,
        amount: reportResult.data.total_amount,
        method: body.payload.method,
        reference: body.payload.reference ?? null,
        paid_at: body.payload.paidAt
      })
      .select("id")
      .single();

    if (reimbursementResult.error || !reimbursementResult.data) {
      return jsonResponse(400, {
        error: reimbursementResult.error?.message ?? "Could not create reimbursement"
      });
    }

    const reportUpdate = await serviceClient
      .from("expense_reports")
      .update({ status: "paid" })
      .eq("id", body.payload.reportId);

    if (reportUpdate.error) {
      return jsonResponse(400, { error: reportUpdate.error.message });
    }

    await serviceClient.from("alerts").insert({
      organization_id: body.payload.organizationId,
      type: "workflow",
      severity: "info",
      message: `Reimbursement marked paid: ${reportResult.data.title}`,
      related_entity: "expense_reports",
      related_id: body.payload.reportId
    });

    return jsonResponse(200, {
      reportId: body.payload.reportId,
      reimbursementId: reimbursementResult.data.id
    });
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
