import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: SupabaseClient; userId: string };

const idInput = (data: unknown) => {
  const id = (data as { fulfillmentId?: unknown } | undefined)?.fulfillmentId;
  if (typeof id !== "string" || id.length < 10) throw new Error("A lab order is required.");
  return { fulfillmentId: id };
};

/**
 * Loads the signed-in patient's own fulfillment (RLS-scoped) and verifies it is
 * in the Quest-ready state. Returns the row so callers can stay idempotent.
 */
async function loadOwnReadyFulfillment(ctx: Ctx, fulfillmentId: string) {
  const { data, error } = await ctx.supabase
    .from("lab_fulfillments")
    .select("id, status, draw_booked_at, draw_completed_at")
    .eq("id", fulfillmentId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("We couldn't find that lab order.");
  if (data.status !== "ready") {
    throw new Error("This lab order isn't ready for scheduling yet.");
  }
  return data as {
    id: string;
    status: string;
    draw_booked_at: string | null;
    draw_completed_at: string | null;
  };
}

/**
 * Patient self-reports that they booked their Quest appointment. This is portal
 * progress tracking only — it never changes the clinical `status` enum.
 */
export const markMyQuestDrawBooked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    const row = await loadOwnReadyFulfillment(ctx, data.fulfillmentId);
    if (row.draw_booked_at) return { ok: true, drawBookedAt: row.draw_booked_at };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("lab_fulfillments")
      .update({ draw_booked_at: now })
      .eq("id", row.id)
      .eq("user_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { ok: true, drawBookedAt: now };
  });

/** Patient self-reports that the blood draw itself is done. */
export const markMyQuestDrawCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    const row = await loadOwnReadyFulfillment(ctx, data.fulfillmentId);
    if (row.draw_completed_at) {
      return { ok: true, drawCompletedAt: row.draw_completed_at };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("lab_fulfillments")
      .update({ draw_booked_at: row.draw_booked_at ?? now, draw_completed_at: now })
      .eq("id", row.id)
      .eq("user_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { ok: true, drawCompletedAt: now };
  });
