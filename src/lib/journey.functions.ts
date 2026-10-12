import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATALOG } from "@/data/catalog";
import type { JourneyState } from "@/lib/journey";

type Ctx = { supabase: any; userId: string };

/**
 * One authenticated round-trip that returns everything the patient dashboard
 * and the gated product wizard need to decide the next action. RLS scopes every
 * query to the signed-in patient.
 */
export const myJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;

    const [intake, docs, fulfillments, appts, approvals, consents, orders] = await Promise.all([
      supabase.from("patient_intakes").select("submitted_at").eq("user_id", userId).maybeSingle(),
      supabase
        .from("patient_documents")
        .select("id, kind, file_name, status, lab_source, review_note, created_at, for_product_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("lab_fulfillments")
        .select(
          "id, status, quest_link, quest_reference, draw_booked_at, draw_completed_at, order_id, for_product_id, orders(order_number, status)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("lab_appointments")
        .select(
          "id, appointment_type, status, notes, for_product_id, provider_slots(slot_date, start_time, meeting_mode, provider_name)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("order_approvals")
        .select(
          "id, product_id, product_name, patient_confirmed_at, status, patient_message, provider_note, decided_at, order_id, updated_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("consent_signatures").select("consent_slug").eq("user_id", userId),
      supabase
        .from("orders")
        .select(
          "id, order_number, status, carrier, tracking_number, shipped_at, delivered_at, created_at, order_items(product_id, product_name, product_group)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const allDocs = (docs.data ?? []) as any[];

    const state: JourneyState = {
      intakeSubmitted: Boolean(intake.data?.submitted_at),
      photoIdOnFile: allDocs.some((d) => d.kind === "photo_id"),
      consentSlugs: (consents.data ?? []).map((c: any) => c.consent_slug),
      labDocs: allDocs
        .filter((d) => d.kind !== "photo_id")
        .map((d) => ({
          id: d.id,
          forProductId: d.for_product_id ?? null,
          fileName: d.file_name,
          status: d.status,
          reviewNote: d.review_note ?? null,
          labSource: d.lab_source ?? null,
          createdAt: d.created_at,
        })),
      fulfillments: (fulfillments.data ?? []).map((f: any) => ({
        id: f.id,
        forProductId: f.for_product_id ?? null,
        status: f.status,
        questLink: f.quest_link,
        questReference: f.quest_reference,
        orderId: f.order_id,
        orderNumber: f.orders?.order_number ?? null,
        orderStatus: f.orders?.status ?? null,
        drawBookedAt: f.draw_booked_at ?? null,
        drawCompletedAt: f.draw_completed_at ?? null,
      })),
      appointments: (appts.data ?? []).map((a: any) => ({
        id: a.id,
        forProductId: a.for_product_id ?? null,
        appointmentType: a.appointment_type,
        status: a.status,
        slotDate: a.provider_slots?.slot_date ?? null,
        startTime: a.provider_slots?.start_time ?? null,
        meetingMode: a.provider_slots?.meeting_mode ?? null,
        providerName: a.provider_slots?.provider_name ?? null,
        notes: a.notes,
      })),
      eligibility: (approvals.data ?? []).map((r: any) => ({
        id: r.id,
        productId: r.product_id ?? null,
        productName: r.product_name ?? null,
        patientConfirmedAt: r.patient_confirmed_at ?? null,
        status: r.status,
        patientMessage: r.patient_message ?? null,
        providerNote: r.provider_note ?? null,
        decidedAt: r.decided_at ?? null,
        orderId: r.order_id ?? null,
        updatedAt: r.updated_at ?? null,
      })),
      orders: (orders.data ?? []).map((o: any) => {
        const items = (o.order_items ?? []).map((i: any) => ({
          productId: i.product_id,
          productName: i.product_name,
          group: i.product_group,
        }));
        return {
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          labOnly: items.length > 0 && items.every((i: any) => i.group === "labs"),
          carrier: o.carrier,
          trackingNumber: o.tracking_number,
          shippedAt: o.shipped_at,
          deliveredAt: o.delivered_at ?? null,
          createdAt: o.created_at,
          items,
        };
      }),
    };

    return { state };
  });

type StartEligibilityInput = { productId: string };

/**
 * Opens (or reuses) the practitioner eligibility episode for a gated product,
 * so the treatment can be reviewed and decided before any medication is bought.
 */
export const startEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: StartEligibilityInput) => {
    if (!input?.productId) throw new Error("Missing product.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as Ctx;
    const product = CATALOG.find((p) => p.id === data.productId);
    if (!product) throw new Error("Unknown product.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("order_approvals")
      .select("id, status, patient_confirmed_at")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const current = existing?.[0];
    if (current) {
      if (!current.patient_confirmed_at) {
        const { error } = await supabaseAdmin
          .from("order_approvals")
          .update({ patient_confirmed_at: new Date().toISOString() })
          .eq("id", current.id)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      }
      return { id: current.id, status: current.status, created: false };
    }

    const { data: row, error } = await supabaseAdmin
      .from("order_approvals")
      .insert({
        user_id: userId,
        product_id: product.id,
        product_name: product.name,
        patient_confirmed_at: new Date().toISOString(),
        status: "pending",
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, status: row.status, created: true };
  });

type RespondInput = { approvalId: string; message: string };

/** Patient answers a practitioner's "more information required" request. */
export const respondToInfoRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RespondInput) => {
    if (!input?.approvalId) throw new Error("Missing request.");
    if (!input.message?.trim()) throw new Error("Please write a short reply first.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("order_approvals")
      .select("id, user_id, provider_note")
      .eq("id", data.approvalId)
      .maybeSingle();
    if (!row || row.user_id !== userId) throw new Error("That request is not yours.");

    const note = `${row.provider_note ?? ""}\n\nPatient reply: ${data.message.trim()}`.trim();
    const { error } = await supabaseAdmin
      .from("order_approvals")
      .update({ status: "pending", provider_note: note, patient_message: null })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
