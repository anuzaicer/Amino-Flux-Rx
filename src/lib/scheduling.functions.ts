import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff, buildSlotRows, syncLinkedAvailability } from "@/lib/scheduling.server";

type RangeInput = { from: string; to: string };

/** Mirror Nicole's other schedule at most once a minute per server instance. */
let lastLinkedSync = 0;
async function refreshLinkedAvailability(force = false) {
  const now = Date.now();
  if (!force && now - lastLinkedSync < 60_000) return;
  lastLinkedSync = now;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await syncLinkedAvailability(supabaseAdmin as never);
  } catch {
    /* the local schedule still works if her other site is unreachable */
  }
}

/** Open slots in a date range — patients see availability across all providers. */
export const listOpenSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RangeInput) => {
    if (!input?.from || !input?.to) throw new Error("A date range is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await refreshLinkedAvailability();
    const { data: slots, error } = await supabase
      .from("provider_slots")
      .select("id, provider_name, slot_date, start_time, end_time, meeting_mode, status")
      .eq("status", "open")
      .gte("slot_date", data.from)
      .lte("slot_date", data.to)
      .order("slot_date")
      .order("start_time");
    if (error) throw new Error(error.message);
    return { slots: slots ?? [] };
  });

type BookInput = {
  slotId: string;
  labSource: "uploaded" | "purchased";
  patientName?: string;
  patientPhone?: string;
  contactPreference?: "zoom" | "phone";
  notes?: string;
  orderId?: string;
  /** Treatment this visit is booked for — each treatment needs its own visit. */
  forProductId?: string;
  /** Lab review, initial treatment consultation, or follow-up. */
  appointmentType?: "lab_review" | "treatment_approval" | "initial_consult" | "follow_up";
};

const VISIT_LABEL: Record<string, string> = {
  lab_review: "lab review",
  treatment_approval: "treatment approval visit",
  initial_consult: "initial treatment consultation",
  follow_up: "follow-up visit",
};

/** Atomically claim an open slot so it disappears from every portal at once. */
export const bookSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BookInput) => {
    if (!input?.slotId) throw new Error("Pick a time slot first.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("provider_slots")
      .update({ status: "booked" })
      .eq("id", data.slotId)
      .eq("status", "open")
      .select("id, provider_name, slot_date, start_time, end_time")
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) throw new Error("That time was just taken. Please choose another slot.");

    const appointmentType = data.appointmentType ?? "lab_review";

    const { data: appointment, error } = await supabaseAdmin
      .from("lab_appointments")
      .insert({
        user_id: userId,
        slot_id: claimed.id,
        order_id: data.orderId ?? null,
        for_product_id: data.forProductId ?? null,
        lab_source: data.labSource,
        appointment_type: appointmentType,
        patient_name: data.patientName ?? null,
        patient_phone: data.patientPhone ?? null,
        contact_preference: data.contactPreference ?? "zoom",
        notes: data.notes ?? null,
      })
      .select("id")
      .single();

    if (error) {
      await supabaseAdmin.from("provider_slots").update({ status: "open" }).eq("id", claimed.id);
      throw new Error(error.message);
    }

    // Confirmation email — a failed send must never lose the booking.
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
      const email = u?.user?.email;
      if (email) {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("appointment-confirmation", email, {
          templateData: {
            name: data.patientName ?? undefined,
            date: claimed.slot_date,
            time: String(claimed.start_time).slice(0, 5),
            mode: data.contactPreference ?? "zoom",
            providerName: claimed.provider_name,
            visitType: VISIT_LABEL[appointmentType] ?? "appointment",
          },
          idempotencyKey: `appointment-confirmation-${appointment.id}`,
        });
      }
    } catch (emailError) {
      console.error("appointment-confirmation email failed", emailError);
    }

    return { appointmentId: appointment.id, slot: claimed };
  });

/** Patient's own lab-review appointments, newest first. */
export const myAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("lab_appointments")
      .select(
        "id, status, lab_source, contact_preference, notes, created_at, provider_slots(slot_date, start_time, end_time, provider_name, meeting_mode)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { appointments: data ?? [] };
  });

export const cancelAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { appointmentId: string }) => {
    if (!input?.appointmentId) throw new Error("Missing appointment.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: appt } = await supabase
      .from("lab_appointments")
      .select("id, slot_id")
      .eq("id", data.appointmentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!appt) throw new Error("Appointment not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("lab_appointments").update({ status: "cancelled" }).eq("id", appt.id);
    await supabaseAdmin.from("provider_slots").update({ status: "open" }).eq("id", appt.slot_id);
    return { ok: true };
  });

/**
 * Staff record how a booked visit actually went. Marking a visit missed sends
 * the patient a rebooking follow-up — there is no automated no-show detection.
 */
export const setAppointmentOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { appointmentId: string; outcome: "completed" | "no_show" }) => {
    if (!input?.appointmentId) throw new Error("Missing appointment.");
    if (input.outcome !== "completed" && input.outcome !== "no_show") {
      throw new Error("Choose completed or missed.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase as never, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appt, error } = await supabaseAdmin
      .from("lab_appointments")
      .update({ status: data.outcome })
      .eq("id", data.appointmentId)
      .eq("status", "scheduled")
      .select("id, user_id, provider_slots(slot_date, start_time, provider_name)")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!appt) return { ok: true, alreadyRecorded: true };

    if (data.outcome === "no_show") {
      const { trySendOnce, patientContact } = await import("@/lib/notifications.server");
      const contact = await patientContact(appt.user_id);
      const slot = (appt as any).provider_slots;
      await trySendOnce(`appointment-missed:${appt.id}`, "appointment-missed", contact.email, {
        name: contact.name ?? undefined,
        date: slot?.slot_date,
        providerName: slot?.provider_name,
      });
    }

    return { ok: true, alreadyRecorded: false };
  });

/* ---------------------------------------------------------------- provider */

export const myStaffRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map((r) => r.role as string);
    return { roles, isStaff: roles.includes("provider") || roles.includes("admin") };
  });

type AddSlotsInput = {
  date: string;
  times: string[]; // "09:00"
  durationMinutes?: number;
  meetingMode?: "zoom" | "phone";
  providerName?: string;
};

export const addSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AddSlotsInput) => {
    if (!input?.date || !input.times?.length) throw new Error("Pick a date and at least one time.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase as never, userId);

    const rows = buildSlotRows({
      providerId: userId,
      providerName: data.providerName || "Nicole, NP",
      date: data.date,
      times: data.times,
      durationMinutes: data.durationMinutes ?? 30,
      meetingMode: data.meetingMode ?? "zoom",
    });

    const { error } = await supabase
      .from("provider_slots")
      .upsert(rows, { onConflict: "provider_id,slot_date,start_time", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { added: rows.length };
  });

export const removeSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slotId: string }) => {
    if (!input?.slotId) throw new Error("Missing slot.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase as never, userId);
    const { error } = await supabase
      .from("provider_slots")
      .delete()
      .eq("id", data.slotId)
      .eq("provider_id", userId)
      .eq("status", "open");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const providerAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RangeInput) => {
    if (!input?.from || !input?.to) throw new Error("A date range is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase as never, userId);
    await refreshLinkedAvailability();

    const { data: slots, error } = await supabase
      .from("provider_slots")
      .select(
        "id, slot_date, start_time, end_time, meeting_mode, status, provider_name, lab_appointments(id, status, lab_source, patient_name, patient_phone, contact_preference, notes)",
      )
      .eq("provider_id", userId)
      .gte("slot_date", data.from)
      .lte("slot_date", data.to)
      .order("slot_date")
      .order("start_time");
    if (error) throw new Error(error.message);
    return { slots: slots ?? [] };
  });

/**
 * Wellness Flow standard weekly schedule: Tuesdays 9:00 AM–7:00 PM,
 * Saturdays and Sundays 3:00–6:00 PM, published as 15-minute blocks.
 */
export const STANDARD_WEEKLY_TEMPLATE = [
  { dow: 2, startMin: 9 * 60, endMin: 19 * 60 },
  { dow: 6, startMin: 15 * 60, endMin: 18 * 60 },
  { dow: 0, startMin: 15 * 60, endMin: 18 * 60 },
] as const;

export const STANDARD_SLOT_MINUTES = 15;

export const addStandardWeeks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { weeks: number; meetingMode?: "zoom" | "phone"; providerName?: string }) => {
      if (!input?.weeks || input.weeks < 1 || input.weeks > 12) throw new Error("Pick 1–12 weeks.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase as never, userId);

    const rows: ReturnType<typeof buildSlotRows> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 0; d < data.weeks * 7; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() + d);
      const match = STANDARD_WEEKLY_TEMPLATE.find((t) => t.dow === day.getDay());
      if (!match) continue;
      const times: string[] = [];
      for (
        let m = match.startMin;
        m + STANDARD_SLOT_MINUTES <= match.endMin;
        m += STANDARD_SLOT_MINUTES
      ) {
        times.push(
          `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
        );
      }
      rows.push(
        ...buildSlotRows({
          providerId: userId,
          providerName: data.providerName || "Nicole, NP",
          date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
          times,
          durationMinutes: STANDARD_SLOT_MINUTES,
          meetingMode: data.meetingMode ?? "zoom",
        }),
      );
    }

    if (rows.length === 0) return { added: 0 };

    const { error } = await supabase
      .from("provider_slots")
      .upsert(rows, { onConflict: "provider_id,slot_date,start_time", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { added: rows.length };
  });
