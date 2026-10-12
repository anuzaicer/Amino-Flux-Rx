import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertStaffRole({ supabase, userId }: Ctx) {
  const [{ data: provider }, { data: admin }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "provider" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (!provider && !admin) throw new Error("Practitioners only.");
  return { isAdmin: Boolean(admin) };
}

export type ReviewQueueRow = {
  id: string;
  status: "pending" | "approved" | "denied" | "more_info";
  provider_note: string | null;
  patient_message: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string | null;
  orderId: string | null;
  orderNumber: string;
  productName: string | null;
  totalCents: number;
  patient: { name: string | null; email: string | null; phone: string | null };
  items: { name: string; quantity: number }[];
  labsReceived: boolean;
  /** Clinical onboarding the patient must finish before the consultation. */
  prerequisites: { intake: boolean; photoId: boolean; consents: boolean; labsVerified: boolean };
  reviewAppointment: { date: string; start: string; mode: string; providerName: string } | null;
};

export type UpcomingReviewRow = {
  userId: string;
  patient: { name: string | null; email: string | null; phone: string | null };
  appointmentType: string;
  appointment: { date: string; start: string; mode: string; providerName: string } | null;
  labsReceived: boolean;
};

/**
 * Treatment requests waiting on a practitioner decision (step 6 of the six-step
 * process), newest first, plus the lab review appointment they belong to.
 */
export const reviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertStaffRole(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("order_approvals")
      .select(
        "id, status, provider_note, patient_message, product_id, product_name, decided_at, created_at, updated_at, order_id, user_id, orders(order_number, total_cents)",
      )
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const orderIds = rows.map((r: any) => r.order_id).filter(Boolean);
    const userIds = [...new Set(rows.map((r: any) => r.user_id))] as string[];
    const fallbackId = "00000000-0000-0000-0000-000000000000";

    const [
      { data: items },
      { data: profiles },
      { data: fulfillments },
      { data: appts },
      { data: intakes },
      { data: documents },
      { data: consents },
    ] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("order_id, product_name, quantity")
        .in("order_id", orderIds.length ? orderIds : [fallbackId]),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds.length ? userIds : [fallbackId]),
      supabaseAdmin
        .from("lab_fulfillments")
        .select("user_id, status")
        .in("user_id", userIds.length ? userIds : [fallbackId]),
      supabaseAdmin
        .from("lab_appointments")
        .select(
          "user_id, status, created_at, provider_slots(slot_date, start_time, meeting_mode, provider_name)",
        )
        .in("user_id", userIds.length ? userIds : [fallbackId])
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("patient_intakes")
        .select("user_id, submitted_at")
        .in("user_id", userIds.length ? userIds : [fallbackId]),
      supabaseAdmin
        .from("patient_documents")
        .select("user_id, kind, status")
        .in("user_id", userIds.length ? userIds : [fallbackId]),
      supabaseAdmin
        .from("consent_signatures")
        .select("user_id")
        .in("user_id", userIds.length ? userIds : [fallbackId]),
    ]);

    const emails = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        emails.set(id, u?.user?.email ?? null);
      }),
    );

    const queue: ReviewQueueRow[] = rows.map((r: any) => {
      const profile = (profiles ?? []).find((p: any) => p.id === r.user_id);
      const appt = (appts ?? []).find(
        (a: any) => a.user_id === r.user_id && a.status !== "cancelled",
      );
      const userDocs = (documents ?? []).filter((d: any) => d.user_id === r.user_id);
      return {
        id: r.id,
        status: r.status,
        provider_note: r.provider_note,
        patient_message: r.patient_message ?? null,
        decided_at: r.decided_at,
        created_at: r.created_at,
        updated_at: r.updated_at ?? null,
        orderId: r.order_id ?? null,
        orderNumber: r.orders?.order_number ?? "",
        productName: r.product_name ?? null,
        totalCents: r.orders?.total_cents ?? 0,
        patient: {
          name: profile?.full_name ?? null,
          email: emails.get(r.user_id) ?? null,
          phone: profile?.phone ?? null,
        },
        items: (items ?? [])
          .filter((i: any) => r.order_id && i.order_id === r.order_id)
          .map((i: any) => ({ name: i.product_name, quantity: i.quantity })),
        labsReceived: (fulfillments ?? []).some(
          (f: any) => f.user_id === r.user_id && f.status === "results_received",
        ),
        prerequisites: {
          intake: Boolean((intakes ?? []).find((i: any) => i.user_id === r.user_id)?.submitted_at),
          photoId: userDocs.some((d: any) => d.kind === "photo_id"),
          consents: (consents ?? []).some((c: any) => c.user_id === r.user_id),
          labsVerified: userDocs.some((d: any) => d.kind !== "photo_id" && d.status === "verified"),
        },
        reviewAppointment: appt?.provider_slots
          ? {
              date: appt.provider_slots.slot_date,
              start: appt.provider_slots.start_time,
              mode: appt.provider_slots.meeting_mode,
              providerName: appt.provider_slots.provider_name,
            }
          : null,
      };
    });

    // Patients with a booked review who haven't placed a treatment order yet —
    // practitioners should see who's in the pipeline before step 6.
    const { data: upcomingAppts } = await supabaseAdmin
      .from("lab_appointments")
      .select(
        "user_id, status, appointment_type, notes, provider_slots(slot_date, start_time, meeting_mode, provider_name)",
      )
      .neq("status", "cancelled")
      .gte("created_at", new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    const knownUsers = new Set(userIds);
    const upcomingUsers = [
      ...new Set(
        (upcomingAppts ?? [])
          .map((a: any) => a.user_id)
          .filter((id: string) => !knownUsers.has(id)),
      ),
    ] as string[];

    let upcoming: UpcomingReviewRow[] = [];
    if (upcomingUsers.length) {
      const [{ data: upProfiles }, { data: upFulfillments }] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", upcomingUsers),
        supabaseAdmin
          .from("lab_fulfillments")
          .select("user_id, status")
          .in("user_id", upcomingUsers),
      ]);
      const upEmails = new Map<string, string | null>();
      await Promise.all(
        upcomingUsers.map(async (id) => {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
          upEmails.set(id, u?.user?.email ?? null);
        }),
      );
      upcoming = upcomingUsers
        .map((id) => {
          const appt = (upcomingAppts ?? []).find((a: any) => a.user_id === id);
          const profile = (upProfiles ?? []).find((p: any) => p.id === id);
          return {
            userId: id,
            patient: {
              name: profile?.full_name ?? null,
              email: upEmails.get(id) ?? null,
              phone: profile?.phone ?? null,
            },
            appointmentType: appt?.appointment_type ?? "lab_review",
            appointment: appt?.provider_slots
              ? {
                  date: appt.provider_slots.slot_date,
                  start: appt.provider_slots.start_time,
                  mode: appt.provider_slots.meeting_mode,
                  providerName: appt.provider_slots.provider_name,
                }
              : null,
            labsReceived: (upFulfillments ?? []).some(
              (f: any) => f.user_id === id && f.status === "results_received",
            ),
          };
        })
        .filter((r) => r.appointment);
    }

    return { queue, upcoming };
  });

type DecideInput = {
  approvalId: string;
  decision: "approved" | "denied" | "more_info";
  note?: string;
};

/**
 * Practitioner records the eligibility decision after the consultation:
 * approve, deny, or ask the patient for more information. Only an approval
 * unlocks the medication purchase (also enforced server-side in `placeOrder`).
 */
export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DecideInput) => {
    if (!input?.approvalId) throw new Error("Missing request.");
    if (!["approved", "denied", "more_info"].includes(input.decision)) {
      throw new Error("Choose approve, deny, or request more information.");
    }
    if (input.decision !== "approved" && !input.note?.trim()) {
      throw new Error(
        input.decision === "denied"
          ? "Add a note explaining the decision for the patient."
          : "Tell the patient what you need from them.",
      );
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertStaffRole(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const note = data.note?.trim() || null;
    const moreInfo = data.decision === "more_info";

    const { data: approval, error } = await supabaseAdmin
      .from("order_approvals")
      .update({
        status: data.decision,
        provider_note: note,
        // Only the "more information" message is written back to the patient.
        patient_message: moreInfo ? note : null,
        decided_at: moreInfo ? null : new Date().toISOString(),
        decided_by: ctx.userId,
      })
      .eq("id", data.approvalId)
      .select("id, order_id, user_id, product_id, product_name, orders(order_number)")
      .single();
    if (error) throw new Error(error.message);

    // Eligibility approvals created before a medication order exist without an
    // order_id — there is nothing to mirror the decision onto yet.
    if (approval.order_id && !moreInfo) {
      await supabaseAdmin
        .from("orders")
        .update({ status: data.decision === "approved" ? "approved" : "denied" })
        .eq("id", approval.order_id);
    }

    // Once the practitioner has decided (approved or denied), the consultation
    // for that treatment is effectively over — mark its scheduled appointment
    // completed so the patient no longer sees it as "Upcoming".
    if (!moreInfo && approval.product_id) {
      await supabaseAdmin
        .from("lab_appointments")
        .update({ status: "completed" })
        .eq("user_id", approval.user_id)
        .eq("for_product_id", approval.product_id)
        .eq("status", "scheduled");
    }

    // Notifying the patient must never roll back the decision.
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(approval.user_id);
      const [{ data: patient }, { data: me }] = await Promise.all([
        supabaseAdmin.from("profiles").select("full_name").eq("id", approval.user_id).maybeSingle(),
        supabaseAdmin.from("profiles").select("full_name").eq("id", ctx.userId).maybeSingle(),
      ]);
      const email = u?.user?.email;
      if (email) {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        if (moreInfo) {
          await sendTemplateEmail("more-information-required", email, {
            templateData: {
              name: patient?.full_name ?? undefined,
              providerName: me?.full_name ?? undefined,
              message: note ?? undefined,
            },
            idempotencyKey: `more-info-${approval.id}-${note?.slice(0, 24) ?? ""}`,
          });
        } else {
          await sendTemplateEmail("treatment-decision", email, {
            templateData: {
              name: patient?.full_name ?? undefined,
              orderNumber:
                (approval as any).orders?.order_number ?? approval.product_name ?? undefined,
              approved: data.decision === "approved",
              providerName: me?.full_name ?? undefined,
              note: note ?? undefined,
            },
            idempotencyKey: `treatment-decision-${approval.id}-${data.decision}`,
          });
        }
      }
    } catch (emailError) {
      console.error("treatment-decision email failed", emailError);
    }

    return { ok: true };
  });

type ShipInput = {
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

/** Admin marks an approved order shipped and emails the patient tracking details. */
export const markShipped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ShipInput) => {
    if (!input?.orderId) throw new Error("Missing order.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { isAdmin } = await assertStaffRole(ctx);
    if (!isAdmin) throw new Error("Admins only.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const carrier = data.carrier?.trim() || null;
    const trackingNumber = data.trackingNumber?.trim() || null;

    // Persist first — the email is only attempted after this succeeds.
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "fulfilled",
        carrier,
        tracking_number: trackingNumber,
        shipped_at: new Date().toISOString(),
      })
      .eq("id", data.orderId)
      .select("id, order_number, user_id, shipping_address1")
      .single();
    if (error) throw new Error(error.message);

    let emailStatus: "sent" | "already_sent" | "suppressed" | "no_email" | "failed" = "no_email";
    let emailError: string | null = null;
    try {
      const { sendOnce, patientContact } = await import("@/lib/notifications.server");
      const { email, name } = await patientContact(order.user_id);
      if (email) {
        const { data: items } = await supabaseAdmin
          .from("order_items")
          .select("product_name, quantity")
          .eq("order_id", order.id);
        const isUsps = !!carrier && /usps|postal/i.test(carrier);
        // Only build a USPS link when there's a real USPS tracking number; never fabricate one.
        const trackingUrl =
          isUsps && trackingNumber
            ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`
            : data.trackingUrl?.trim() || undefined;
        // Key includes the tracking number so a genuinely new tracking number can notify again,
        // while re-clicking with the same one never duplicates.
        const res = await sendOnce(
          `order-shipped:${order.id}:${trackingNumber ?? "none"}`,
          "order-shipped",
          email,
          {
            name: name ?? undefined,
            orderNumber: order.order_number,
            carrier: carrier ?? undefined,
            trackingNumber: trackingNumber ?? undefined,
            trackingUrl,
            items: (items ?? []).map((i: any) =>
              i.quantity > 1 ? `${i.product_name} ×${i.quantity}` : i.product_name,
            ),
          },
        );
        emailStatus = res.sent
          ? "sent"
          : res.reason === "already_sent"
            ? "already_sent"
            : "suppressed";
      }
    } catch (e) {
      emailStatus = "failed";
      emailError = e instanceof Error ? e.message : String(e);
      console.error(`order-shipped email failed (order ${order.id})`, e);
    }

    return { ok: true, emailStatus, emailError };
  });

/** Admin marks a shipped order completed and thanks the customer (once). */
export const markCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error("Missing order.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { isAdmin } = await assertStaffRole(ctx);
    if (!isAdmin) throw new Error("Admins only.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: readErr } = await (supabaseAdmin as any)
      .from("orders")
      .select("id, order_number, user_id, status, completed_at")
      .eq("id", data.orderId)
      .single();
    if (readErr) throw new Error(readErr.message);
    if (existing.status !== "fulfilled") {
      throw new Error("Only shipped orders can be marked completed.");
    }

    let order = existing;
    if (!existing.completed_at) {
      const { data: updated, error } = await (supabaseAdmin as any)
        .from("orders")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", data.orderId)
        .select("id, order_number, user_id, status, completed_at")
        .single();
      if (error) throw new Error(error.message);
      order = updated;
    }

    let emailStatus: "sent" | "already_sent" | "suppressed" | "no_email" | "failed" = "no_email";
    let emailError: string | null = null;
    try {
      const { sendOnce, patientContact } = await import("@/lib/notifications.server");
      const { email, name } = await patientContact(order.user_id);
      if (email) {
        const res = await sendOnce(`order-completed:${order.id}`, "order-completed", email, {
          name: name ?? undefined,
          orderNumber: order.order_number,
        });
        emailStatus = res.sent
          ? "sent"
          : res.reason === "already_sent"
            ? "already_sent"
            : "suppressed";
      }
    } catch (e) {
      emailStatus = "failed";
      emailError = e instanceof Error ? e.message : String(e);
      console.error(`order-completed email failed (order ${order.id})`, e);
    }

    return { ok: true, emailStatus, emailError };
  });

/* ------------------------------------------------------------- patient */

/** The signed-in patient's treatment approvals and delivery status. */
export const myApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data, error } = await supabase
      .from("order_approvals")
      .select(
        "id, status, provider_note, decided_at, created_at, order_id, orders(order_number, status, carrier, tracking_number, shipped_at)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { approvals: data ?? [] };
  });

/* --------------------------------------------------------------- shipping */

export type ShipRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  patient: { name: string | null; email: string | null };
  address: string | null;
  items: { name: string; quantity: number }[];
};

/** Approved (and recently shipped) orders for the admin fulfillment queue. */
export const shippingQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { isAdmin } = await assertStaffRole(ctx);
    if (!isAdmin) throw new Error("Admins only.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, total_cents, created_at, carrier, tracking_number, shipped_at, delivered_at, completed_at, user_id, shipping_name, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_zip",
      )
      .in("status", ["paid", "approved", "fulfilled"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const fallbackId = "00000000-0000-0000-0000-000000000000";
    const orderIds = rows.map((r: any) => r.id);
    const userIds = [...new Set(rows.map((r: any) => r.user_id))] as string[];

    const [{ data: items }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("order_id, product_name, quantity")
        .in("order_id", orderIds.length ? orderIds : [fallbackId]),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds.length ? userIds : [fallbackId]),
    ]);

    const emails = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        emails.set(id, u?.user?.email ?? null);
      }),
    );

    const orders: ShipRow[] = rows.map((r: any) => ({
      id: r.id,
      orderNumber: r.order_number,
      status: r.status,
      totalCents: r.total_cents,
      createdAt: r.created_at,
      carrier: r.carrier,
      trackingNumber: r.tracking_number,
      shippedAt: r.shipped_at,
      deliveredAt: r.delivered_at ?? null,
      completedAt: r.completed_at ?? null,
      patient: {
        name: (profiles ?? []).find((p: any) => p.id === r.user_id)?.full_name ?? r.shipping_name,
        email: emails.get(r.user_id) ?? null,
      },
      address:
        [
          r.shipping_address1,
          r.shipping_address2,
          r.shipping_city,
          r.shipping_state,
          r.shipping_zip,
        ]
          .filter(Boolean)
          .join(", ") || null,
      items: (items ?? [])
        .filter((i: any) => i.order_id === r.id)
        .map((i: any) => ({ name: i.product_name, quantity: i.quantity })),
    }));

    return { orders };
  });

export type PatientLabFile = {
  id: string;
  fileName: string;
  status: string;
  labSource: string | null;
  createdAt: string;
  url: string | null;
};

/**
 * The lab panels a booked patient uploaded (or had delivered), with short-lived
 * signed links so the practitioner can open them from the Lab Reviews tab.
 */
export const appointmentLabFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { appointmentId: string }) => {
    if (!input?.appointmentId) throw new Error("Missing appointment.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertStaffRole(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appt, error: apptError } = await supabaseAdmin
      .from("lab_appointments")
      .select("user_id")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (apptError) throw new Error(apptError.message);
    if (!appt) throw new Error("Appointment not found.");

    const { data: docs, error } = await supabaseAdmin
      .from("patient_documents")
      .select("id, file_name, status, lab_source, created_at, storage_path")
      .eq("user_id", appt.user_id)
      .eq("kind", "lab_result")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const files: PatientLabFile[] = await Promise.all(
      (docs ?? []).map(async (d: any) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("patient-documents")
          .createSignedUrl(d.storage_path, 60 * 30);
        return {
          id: d.id,
          fileName: d.file_name,
          status: d.status,
          labSource: d.lab_source,
          createdAt: d.created_at,
          url: signed?.signedUrl ?? null,
        };
      }),
    );

    return { files };
  });

/** Staff verify or reject a patient's lab document. Verifying unlocks the
 *  patient's final purchase step. */
export const setLabDocumentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { documentId: string; status: "verified" | "rejected"; note?: string }) => {
      if (!input?.documentId || !["verified", "rejected"].includes(input?.status)) {
        throw new Error("Missing document or invalid status.");
      }
      if (input.status === "rejected" && !input.note?.trim()) {
        throw new Error("Tell the patient why this file can't be used.");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertStaffRole(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const note = data.note?.trim() || null;

    const { data: doc, error } = await supabaseAdmin
      .from("patient_documents")
      .update({
        status: data.status,
        review_note: note,
        reviewed_at: new Date().toISOString(),
        reviewed_by: ctx.userId,
      })
      .eq("id", data.documentId)
      .select("id, user_id, file_name")
      .single();
    if (error) throw new Error(error.message);

    // Telling the patient must never roll back the review decision.
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(doc.user_id);
      const { data: patient } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", doc.user_id)
        .maybeSingle();
      const email = u?.user?.email;
      if (email) {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("lab-review-result", email, {
          templateData: {
            name: patient?.full_name ?? undefined,
            verified: data.status === "verified",
            fileName: doc.file_name,
            note: note ?? undefined,
          },
          idempotencyKey: `lab-review-${doc.id}-${data.status}`,
        });
      }
    } catch (emailError) {
      console.error("lab-review-result email failed", emailError);
    }

    return { ok: true };
  });

export type PendingLabRow = PatientLabFile & {
  userId: string;
  patient: { name: string | null; email: string | null };
};

/**
 * Every patient lab panel still waiting on a practitioner decision, whether or
 * not the patient has booked a review appointment yet.
 */
export const pendingLabDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertStaffRole(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: docs, error } = await supabaseAdmin
      .from("patient_documents")
      .select("id, user_id, file_name, status, lab_source, created_at, storage_path")
      .eq("kind", "lab_result")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows = docs ?? [];
    const userIds = [...new Set(rows.map((d: any) => d.user_id))] as string[];
    const fallbackId = "00000000-0000-0000-0000-000000000000";

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds.length ? userIds : [fallbackId]);

    const emails = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        emails.set(id, u?.user?.email ?? null);
      }),
    );

    const files: PendingLabRow[] = await Promise.all(
      rows.map(async (d: any) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("patient-documents")
          .createSignedUrl(d.storage_path, 60 * 30);
        return {
          id: d.id,
          fileName: d.file_name,
          status: d.status,
          labSource: d.lab_source,
          createdAt: d.created_at,
          url: signed?.signedUrl ?? null,
          userId: d.user_id,
          patient: {
            name: (profiles ?? []).find((p: any) => p.id === d.user_id)?.full_name ?? null,
            email: emails.get(d.user_id) ?? null,
          },
        };
      }),
    );

    return { files };
  });
