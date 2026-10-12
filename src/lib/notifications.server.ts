/**
 * Server-only lifecycle notification helpers.
 *
 * Every lifecycle email goes through `sendOnce`, which claims a deterministic
 * event key in `public.notification_log` before sending. The claim is the
 * idempotency guard: a second call with the same key (a retry, a re-run of the
 * reminder job, a double click in the admin portal) short-circuits and sends
 * nothing. The same key is also passed to Lovable's email API as its
 * idempotency key, so duplicates are suppressed on both sides.
 *
 * Never import this from client code.
 */

import { sendTemplateEmail, type SendTemplateEmailResult } from "./email-templates/send-email";

export type SendOnceResult = SendTemplateEmailResult | { sent: false; reason: "already_sent" };

/** Claim an event key. Returns false when this event was already handled. */
export async function claimEvent(eventKey: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any)
    .from("notification_log")
    .insert({ event_key: eventKey });
  if (!error) return true;
  // 23505 = unique violation → this event was already recorded.
  if (error.code === "23505") return false;
  throw new Error(error.message);
}

async function releaseEvent(eventKey: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("notification_log").delete().eq("event_key", eventKey);
  } catch {
    /* best effort — a stale claim only suppresses one retry */
  }
}

/**
 * Send a template email at most once for `eventKey`. A suppressed recipient
 * counts as handled (Lovable enforces suppression server-side); a transport
 * failure releases the claim so a later run can retry.
 */
export async function sendOnce(
  eventKey: string,
  templateName: string,
  to: string,
  templateData: Record<string, unknown> = {},
): Promise<SendOnceResult> {
  if (!to) return { sent: false, reason: "already_sent" };
  const claimed = await claimEvent(eventKey);
  if (!claimed) return { sent: false, reason: "already_sent" };
  try {
    return await sendTemplateEmail(templateName, to, {
      templateData,
      idempotencyKey: eventKey,
    });
  } catch (error) {
    await releaseEvent(eventKey);
    throw error;
  }
}

/** Same as `sendOnce`, but a failure is logged instead of thrown — use when
 *  the surrounding write must never be rolled back by an email problem. */
export async function trySendOnce(
  eventKey: string,
  templateName: string,
  to: string | null | undefined,
  templateData: Record<string, unknown> = {},
): Promise<void> {
  if (!to) return;
  try {
    await sendOnce(eventKey, templateName, to, templateData);
  } catch (error) {
    console.error(`notification failed (${eventKey})`, error);
  }
}

/** Look up a patient's email address and display name. */
export async function patientContact(
  userId: string,
): Promise<{ email: string | null; name: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: u }, { data: profile }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  return { email: u?.user?.email ?? null, name: profile?.full_name ?? null };
}
