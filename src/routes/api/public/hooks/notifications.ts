/**
 * Time-based lifecycle reminder runner.
 *
 * This endpoint does NOT schedule itself. It must be invoked by an external
 * scheduler (pg_cron via pg_net, or any HTTP cron service) roughly every
 * 15-30 minutes:
 *
 *   POST https://<site>/api/public/hooks/notifications
 *   Header: x-cron-secret: <NOTIFICATION_CRON_SECRET>
 *
 * Every send goes through `sendOnce`, so re-running the job — at any cadence,
 * or twice at once — never produces a duplicate email.
 */
import { createFileRoute } from "@tanstack/react-router";

const HOUR = 60 * 60 * 1000;

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Slot dates/times are stored without a timezone; treat them as UTC. */
function slotStart(slotDate: string, startTime: string): number {
  return Date.parse(`${slotDate}T${String(startTime).slice(0, 8)}Z`);
}

const VISIT_LABEL: Record<string, string> = {
  lab_review: "lab review",
  treatment_approval: "treatment approval visit",
  initial_consult: "initial treatment consultation",
  follow_up: "follow-up visit",
};

async function runReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendOnce, patientContact } = await import("@/lib/notifications.server");
  const now = Date.now();
  const sent = { appointment24h: 0, appointment1h: 0, approvedNotOrdered: 0 };

  /* ------------------------------------------------ appointment reminders */
  // Only still-scheduled visits qualify; cancelled/completed/no-show rows are
  // filtered out here, so a cancelled appointment can never be reminded.
  const today = new Date(now - 12 * HOUR).toISOString().slice(0, 10);
  const horizon = new Date(now + 48 * HOUR).toISOString().slice(0, 10);
  const { data: appointments } = await supabaseAdmin
    .from("lab_appointments")
    .select(
      "id, user_id, status, appointment_type, contact_preference, patient_name, provider_slots!inner(slot_date, start_time, provider_name, meeting_mode)",
    )
    .eq("status", "scheduled")
    .gte("provider_slots.slot_date", today)
    .lte("provider_slots.slot_date", horizon)
    .limit(500);

  for (const appt of appointments ?? []) {
    const slot = (appt as any).provider_slots;
    if (!slot?.slot_date || !slot?.start_time) continue;
    const start = slotStart(slot.slot_date, slot.start_time);
    if (!Number.isFinite(start) || start <= now) continue;
    const until = start - now;

    let window: "24 hours" | "1 hour" | null = null;
    if (until <= 25 * HOUR && until > 2 * HOUR) window = "24 hours";
    else if (until <= 1.5 * HOUR) window = "1 hour";
    if (!window) continue;

    const key = window === "1 hour" ? "appointment-reminder-1h" : "appointment-reminder-24h";
    const contact = await patientContact(appt.user_id);
    if (!contact.email) continue;
    const result = await sendOnce(`${key}:${appt.id}`, "appointment-reminder", contact.email, {
      name: contact.name ?? appt.patient_name ?? undefined,
      date: new Date(`${slot.slot_date}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      time: String(slot.start_time).slice(0, 5),
      mode: appt.contact_preference ?? slot.meeting_mode ?? undefined,
      providerName: slot.provider_name,
      visitType: VISIT_LABEL[appt.appointment_type as string] ?? "appointment",
      window,
      meetingDetail:
        (appt.contact_preference ?? slot.meeting_mode) === "phone"
          ? "Your practitioner will call the number on your file."
          : "Your join link is in the appointments section of your portal.",
    });
    if (result.sent) {
      if (window === "1 hour") sent.appointment1h++;
      else sent.appointment24h++;
    }
  }

  /* ------------------------------------- approved treatment, not yet ordered */
  const { data: approvals } = await supabaseAdmin
    .from("order_approvals")
    .select("id, user_id, product_name, product_id, status, order_id, decided_at")
    .eq("status", "approved")
    .is("order_id", null)
    .gte("decided_at", new Date(now - 5 * 24 * HOUR).toISOString())
    .limit(500);

  for (const approval of approvals ?? []) {
    if (!approval.decided_at) continue;
    const age = now - Date.parse(approval.decided_at);
    let window: "24h" | "48h" | null = null;
    if (age >= 24 * HOUR && age < 36 * HOUR) window = "24h";
    else if (age >= 48 * HOUR && age < 60 * HOUR) window = "48h";
    if (!window) continue;

    // Suppress once any medication order exists for this patient after the
    // decision — the reminder is no longer true.
    const { count } = await supabaseAdmin
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", approval.user_id)
      .neq("product_group", "labs")
      .gte("created_at", approval.decided_at);
    if (count && count > 0) continue;

    const contact = await patientContact(approval.user_id);
    if (!contact.email) continue;
    const result = await sendOnce(
      `approved-not-ordered-${window}:${approval.id}`,
      "treatment-order-reminder",
      contact.email,
      { name: contact.name ?? undefined, productName: approval.product_name ?? undefined },
    );
    if (result.sent) sent.approvedNotOrdered++;
  }

  return sent;
}

export const Route = createFileRoute("/api/public/hooks/notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["NOTIFICATION_CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!secret || !constantTimeEqual(provided, secret)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const sent = await runReminders();
          return new Response(JSON.stringify({ ok: true, sent }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("notification runner failed", error);
          return new Response(
            JSON.stringify({ ok: false, error: (error as Error).message ?? "failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
