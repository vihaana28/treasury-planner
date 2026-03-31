import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders, createSupabaseClients, jsonResponse } from "../_shared/common.ts";

const requestSchema = z.object({
  version: z.literal("1.0"),
  payload: z.object({
    organizationId: z.string().uuid()
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
    if (actorProfileResult.data.organization_id !== body.payload.organizationId) {
      return jsonResponse(403, { error: "Organization mismatch" });
    }
    if (
      actorProfileResult.data.role !== "admin" &&
      actorProfileResult.data.role !== "treasurer"
    ) {
      return jsonResponse(403, { error: "Role cannot recalculate alerts" });
    }

    const categoriesResult = await serviceClient
      .from("budget_categories")
      .select("id, name, limit_amount, spent_amount, alert_threshold")
      .eq("organization_id", body.payload.organizationId);

    if (categoriesResult.error) {
      return jsonResponse(400, { error: categoriesResult.error.message });
    }

    const categories = categoriesResult.data ?? [];

    await serviceClient
      .from("alerts")
      .delete()
      .eq("organization_id", body.payload.organizationId)
      .eq("type", "budget");

    const alerts = categories
      .map((category) => {
        const usage = category.limit_amount > 0 ? category.spent_amount / category.limit_amount : 0;
        if (usage >= 1) {
          return {
            organization_id: body.payload.organizationId,
            type: "budget",
            severity: "critical",
            message: `${category.name} is over budget`,
            related_entity: "budget_categories",
            related_id: category.id
          };
        }
        if (usage >= category.alert_threshold) {
          return {
            organization_id: body.payload.organizationId,
            type: "budget",
            severity: "warning",
            message: `${category.name} reached ${Math.round(usage * 100)}% of budget`,
            related_entity: "budget_categories",
            related_id: category.id
          };
        }
        return null;
      })
      .filter((value) => value !== null);

    if (alerts.length > 0) {
      const insertResult = await serviceClient.from("alerts").insert(alerts);
      if (insertResult.error) {
        return jsonResponse(400, { error: insertResult.error.message });
      }
    }

    return jsonResponse(200, { count: alerts.length });
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
