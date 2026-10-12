import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin({ supabase, userId }: Ctx) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admins only.");
}

/** Is the signed-in user an admin? Used to gate the admin portal UI. */
export const myAdminRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return { isAdmin: Boolean(data) };
  });

export type QuestQueueRow = {
  id: string;
  status: "awaiting_setup" | "ready" | "results_received";
  quest_reference: string | null;
  quest_link: string | null;
  admin_note: string | null;
  ready_at: string | null;
  draw_booked_at: string | null;
  draw_completed_at: string | null;
  created_at: string;
  order: {
    id: string;
    order_number: string;
    status: string;
    total_cents: number;
    created_at: string;
    shipping_name: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_zip: string | null;
  };
  patient: { name: string | null; phone: string | null; email: string | null };
  panels: { name: string; quantity: number }[];
};

/** Every lab order awaiting (or past) Quest setup, newest first. */
export const listQuestQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("lab_fulfillments")
      .select(
        "id, status, quest_reference, quest_link, admin_note, ready_at, draw_booked_at, draw_completed_at, created_at, user_id, orders(id, order_number, status, total_cents, created_at, shipping_name, shipping_city, shipping_state, shipping_zip)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const orderIds = rows.map((r: any) => r.orders?.id).filter(Boolean);
    const userIds = [...new Set(rows.map((r: any) => r.user_id))];

    const [{ data: items }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("order_id, product_name, quantity, product_group")
        .in("order_id", orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const emails = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id as string);
        emails.set(id as string, u?.user?.email ?? null);
      }),
    );

    const queue: QuestQueueRow[] = rows.map((r: any) => {
      const profile = (profiles ?? []).find((p: any) => p.id === r.user_id);
      return {
        id: r.id,
        status: r.status,
        quest_reference: r.quest_reference,
        quest_link: r.quest_link,
        admin_note: r.admin_note,
        ready_at: r.ready_at,
        draw_booked_at: r.draw_booked_at ?? null,
        draw_completed_at: r.draw_completed_at ?? null,
        created_at: r.created_at,
        order: r.orders,
        patient: {
          name: profile?.full_name ?? r.orders?.shipping_name ?? null,
          phone: profile?.phone ?? null,
          email: emails.get(r.user_id) ?? null,
        },
        panels: (items ?? [])
          .filter((i: any) => i.order_id === r.orders?.id && i.product_group === "labs")
          .map((i: any) => ({ name: i.product_name, quantity: i.quantity })),
      };
    });

    return { queue };
  });

/** Quest's public patient scheduling page — used when only a confirmation code is entered. */
export const QUEST_SCHEDULING_URL = "https://appointment.questdiagnostics.com/as-home";

type ReadyInput = {
  fulfillmentId: string;
  questLink?: string;
  questReference?: string;
  note?: string;
};

/** Mark a lab order as entered into Quest and notify the patient. */
export const markQuestReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ReadyInput) => {
    if (!input?.fulfillmentId) throw new Error("Missing order.");
    if (!input.questLink && !input.questReference) {
      throw new Error("Add a Quest scheduling link or confirmation code first.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const questLink = data.questLink?.trim() || QUEST_SCHEDULING_URL;
    const questReference = data.questReference?.trim() || null;
    const adminNote = data.note?.trim() || null;

    // Payment gate: staff confirm payment (manually, for now) before a Quest
    // order is released. Rows already past setup are untouched.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("lab_fulfillments")
      .select("id, status, order_id, orders(status)")
      .eq("id", data.fulfillmentId)
      .single();
    if (existingError) throw new Error(existingError.message);
    if (existing.status === "awaiting_setup" && (existing as any).orders?.status !== "paid") {
      throw new Error("Confirm payment before releasing the Quest order.");
    }

    const { data: fulfillment, error } = await supabaseAdmin
      .from("lab_fulfillments")
      .update({
        status: "ready",
        quest_link: questLink,
        quest_reference: questReference,
        admin_note: adminNote,
        ready_at: new Date().toISOString(),
        ready_by: ctx.userId,
      })
      .eq("id", data.fulfillmentId)
      .select("id, order_id, user_id, orders(order_number)")
      .single();
    if (error) throw new Error(error.message);

    // Email the patient their Quest scheduling link. A failed send must not
    // roll back the status change — the link is also shown in the portal.
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(fulfillment.user_id);
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", fulfillment.user_id)
        .maybeSingle();
      const email = u?.user?.email;
      if (email) {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("quest-order-ready", email, {
          templateData: {
            name: profile?.full_name ?? undefined,
            orderNumber: (fulfillment as any).orders?.order_number,
            questLink,
            questReference: questReference ?? undefined,
            note: adminNote ?? undefined,
          },
          idempotencyKey: `quest-order-ready-${fulfillment.id}`,
        });
      }
    } catch (emailError) {
      console.error("quest-order-ready email failed", emailError);
    }

    return { ok: true };
  });

export type PendingPaymentRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalCents: number;
  kind: "labs" | "medication" | "mixed";
  patient: { name: string | null; email: string | null };
  items: { name: string; quantity: number }[];
};

/** Every order still waiting on a payment confirmation, newest first. */
export const pendingPaymentOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fallbackId = "00000000-0000-0000-0000-000000000000";

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, created_at, total_cents, user_id, shipping_name")
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const orderIds = rows.map((r: any) => r.id);
    const userIds = [...new Set(rows.map((r: any) => r.user_id))] as string[];

    const [{ data: items }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("order_id, product_name, quantity, product_group")
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

    const orders: PendingPaymentRow[] = rows.map((r: any) => {
      const own = (items ?? []).filter((i: any) => i.order_id === r.id);
      const allLabs = own.length > 0 && own.every((i: any) => i.product_group === "labs");
      const noLabs = own.every((i: any) => i.product_group !== "labs");
      return {
        id: r.id,
        orderNumber: r.order_number,
        createdAt: r.created_at,
        totalCents: r.total_cents,
        kind: allLabs ? "labs" : noLabs ? "medication" : "mixed",
        patient: {
          name:
            (profiles ?? []).find((p: any) => p.id === r.user_id)?.full_name ??
            r.shipping_name ??
            null,
          email: emails.get(r.user_id) ?? null,
        },
        items: own.map((i: any) => ({ name: i.product_name, quantity: i.quantity })),
      };
    });

    return { orders };
  });

/**
 * Admin attestation that payment for an order arrived outside the portal.
 * This records a manual/external payment — it does not charge a card.
 */
export const markOrderPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error("Missing order.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, status, user_id, order_number, total_cents, requires_labs")
      .eq("id", data.orderId)
      .single();
    if (error) throw new Error(error.message);
    if (order.status === "paid") return { ok: true, alreadyPaid: true };
    if (order.status !== "pending_payment") {
      throw new Error("This order is no longer awaiting payment.");
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid" })
      .eq("id", data.orderId)
      .eq("status", "pending_payment");
    if (updateError) throw new Error(updateError.message);

    // Receipt for a payment arranged outside the portal — never implies a card
    // was charged here.
    const { trySendOnce, patientContact } = await import("@/lib/notifications.server");
    const { data: labItem } = await supabaseAdmin
      .from("order_items")
      .select("id")
      .eq("order_id", order.id)
      .eq("product_group", "labs")
      .limit(1)
      .maybeSingle();
    const contact = await patientContact(order.user_id);
    await trySendOnce(`payment-received:${order.id}`, "payment-received", contact.email, {
      name: contact.name ?? undefined,
      orderNumber: order.order_number,
      amount: `$${(order.total_cents / 100).toFixed(2)}`,
      nextStep: labItem
        ? "Our team is entering your lab order with Quest now. You'll get an email with your scheduling link as soon as it's ready."
        : "Your order now moves to fulfillment. We'll email tracking details as soon as it ships.",
    });

    return { ok: true, alreadyPaid: false };
  });

export const markResultsReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fulfillmentId: string }) => {
    if (!input?.fulfillmentId) throw new Error("Missing order.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fulfillment, error } = await supabaseAdmin
      .from("lab_fulfillments")
      .update({ status: "results_received", results_at: new Date().toISOString() })
      .eq("id", data.fulfillmentId)
      .select("id, user_id, orders(order_number)")
      .single();
    if (error) throw new Error(error.message);

    // Results live in the portal only — never in the email body or subject.
    const { trySendOnce, patientContact } = await import("@/lib/notifications.server");
    const contact = await patientContact(fulfillment.user_id);
    await trySendOnce(`lab-results-ready:${fulfillment.id}`, "lab-results-ready", contact.email, {
      name: contact.name ?? undefined,
      orderNumber: (fulfillment as any).orders?.order_number,
    });

    return { ok: true };
  });

/* --------------------------------------------------------- practitioners */

export const listPractitioners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role")
      .in("role", ["provider", "admin"]);
    if (error) throw new Error(error.message);

    const people = await Promise.all(
      (roles ?? []).map(async (r: any) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", r.user_id)
          .maybeSingle();
        return {
          id: r.id,
          userId: r.user_id,
          role: r.role as string,
          email: u?.user?.email ?? null,
          name: p?.full_name ?? null,
        };
      }),
    );

    return { people };
  });

/** Grant provider (practitioner) or admin access by email address. */
export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: "provider" | "admin" }) => {
    if (!input?.email?.includes("@")) throw new Error("Enter a valid email address.");
    if (input.role !== "provider" && input.role !== "admin") throw new Error("Unknown role.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.trim().toLowerCase();
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw new Error(listError.message);
    const match = list.users.find((u) => u.email?.toLowerCase() === email);
    if (!match)
      throw new Error("No patient account uses that email yet — ask them to sign up first.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: match.id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true, email };
  });

/** Create a brand-new practitioner (or admin) login without waiting for them to sign up. */
export const createPractitioner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { email: string; fullName: string; password: string; role: "provider" | "admin" }) => {
      if (!input?.email?.includes("@")) throw new Error("Enter a valid email address.");
      if (!input.fullName?.trim()) throw new Error("Enter the practitioner's full name.");
      if (!input.password || input.password.length < 8)
        throw new Error("Password must be at least 8 characters.");
      if (input.role !== "provider" && input.role !== "admin") throw new Error("Unknown role.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName.trim();

    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw new Error(listError.message);
    const existing = list.users.find((u) => u.email?.toLowerCase() === email);

    let userId = existing?.id;
    let created = false;

    if (!userId) {
      const { data: made, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError) throw new Error(createError.message);
      userId = made.user!.id;
      created = true;
    } else {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
      });
      if (updateError) throw new Error(updateError.message);
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: fullName }, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    return { ok: true, email, created, name: fullName };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { roleId: string }) => {
    if (!input?.roleId) throw new Error("Missing role.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("id", data.roleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------- lab panel purchases */

export type LabPanelPurchaseRow = {
  fulfillmentId: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  totalCents: number;
  orderStatus: string;
  labStatus: "awaiting_setup" | "ready" | "results_received";
  approved: boolean;
  patient: { name: string | null; email: string | null };
  panels: { name: string; quantity: number }[];
  forProductId: string | null;
  report: { id: string; fileName: string; createdAt: string } | null;
  questLink: string | null;
  questReference: string | null;
  adminNote: string | null;
  drawBookedAt: string | null;
  drawCompletedAt: string | null;
};

/** Everyone who purchased a lab panel, with where their panel stands. */
export const listLabPanelPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fallbackId = "00000000-0000-0000-0000-000000000000";

    const { data, error } = await supabaseAdmin
      .from("lab_fulfillments")
      .select(
        "id, status, created_at, user_id, order_id, for_product_id, quest_link, quest_reference, admin_note, draw_booked_at, draw_completed_at, orders(id, order_number, status, total_cents, shipping_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const orderIds = rows.map((r: any) => r.order_id).filter(Boolean);
    const userIds = [...new Set(rows.map((r: any) => r.user_id))] as string[];

    const [{ data: items }, { data: profiles }, { data: reports }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("order_id, product_name, quantity, product_group")
        .in("order_id", orderIds.length ? orderIds : [fallbackId]),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds.length ? userIds : [fallbackId]),
      supabaseAdmin
        .from("patient_documents")
        .select("id, user_id, file_name, created_at, review_note, kind, lab_source")
        .eq("kind", "lab_result")
        .eq("lab_source", "purchased")
        .in("user_id", userIds.length ? userIds : [fallbackId])
        .order("created_at", { ascending: false }),
    ]);

    const emails = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        emails.set(id, u?.user?.email ?? null);
      }),
    );

    const purchases: LabPanelPurchaseRow[] = rows.map((r: any) => {
      // The report an admin uploaded when approving is tagged with the
      // fulfillment id in its review note, so it stays tied to that panel.
      const report = (reports ?? []).find(
        (d: any) => d.user_id === r.user_id && d.review_note === `lab-panel:${r.id}`,
      );
      return {
        fulfillmentId: r.id,
        orderId: r.order_id,
        orderNumber: r.orders?.order_number ?? "",
        createdAt: r.created_at,
        totalCents: r.orders?.total_cents ?? 0,
        orderStatus: r.orders?.status ?? "",
        labStatus: r.status,
        approved: r.status === "results_received",
        forProductId: r.for_product_id ?? null,
        questLink: r.quest_link ?? null,
        questReference: r.quest_reference ?? null,
        adminNote: r.admin_note ?? null,
        drawBookedAt: r.draw_booked_at ?? null,
        drawCompletedAt: r.draw_completed_at ?? null,
        report: report
          ? { id: report.id, fileName: report.file_name, createdAt: report.created_at }
          : null,
        patient: {
          name:
            (profiles ?? []).find((p: any) => p.id === r.user_id)?.full_name ??
            r.orders?.shipping_name ??
            null,
          email: emails.get(r.user_id) ?? null,
        },
        panels: (items ?? [])
          .filter((i: any) => i.order_id === r.order_id && i.product_group === "labs")
          .map((i: any) => ({ name: i.product_name, quantity: i.quantity })),
      };
    });

    return { purchases };
  });

/**
 * Approve a purchased lab panel. The patient paid for a report, so a report
 * file MUST be attached: it is stored with their documents (visible to the
 * patient and to practitioners reviewing the case later), the external payment
 * is recorded if still outstanding, and the blood-work step is cleared so the
 * treatment wizard moves on by itself.
 */
export const approveLabPanelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      fulfillmentId: string;
      fileName: string;
      contentType: string;
      dataBase64: string;
      note?: string;
    }) => {
      if (!input?.fulfillmentId) throw new Error("Missing lab order.");
      if (!input.dataBase64) throw new Error("Attach the lab report before approving.");
      if (!/^(image\/(jpeg|png|webp|heic)|application\/pdf)$/.test(input.contentType)) {
        throw new Error("Upload a PDF, JPG, PNG or WEBP report.");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("lab_fulfillments")
      .select("id, status, user_id, order_id, for_product_id, orders(id, status, order_number)")
      .eq("id", data.fulfillmentId)
      .single();
    if (error) throw new Error(error.message);
    if (row.status === "results_received") return { ok: true, alreadyApproved: true };

    // 1. Store the report first — approving without the report would leave the
    // patient with a cleared step and nothing to read.
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 20 * 1024 * 1024) throw new Error("Report must be under 20MB.");
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60) || "lab-report.pdf";
    const path = `${row.user_id}/lab-report-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("patient-documents")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { error: docError } = await supabaseAdmin.from("patient_documents").insert({
      user_id: row.user_id,
      kind: "lab_result",
      lab_source: "purchased",
      for_product_id: (row as any).for_product_id ?? null,
      file_name: safeName,
      storage_path: path,
      status: "verified",
      review_note: `lab-panel:${row.id}`,
      reviewed_at: new Date().toISOString(),
      reviewed_by: ctx.userId,
    });
    if (docError) throw new Error(docError.message);

    if ((row as any).orders?.status === "pending_payment") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "paid" })
        .eq("id", row.order_id)
        .eq("status", "pending_payment");
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("lab_fulfillments")
      .update({
        status: "results_received",
        results_at: now,
        ready_at: now,
        ready_by: ctx.userId,
        admin_note: data.note?.trim() || null,
      })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);

    const { trySendOnce, patientContact } = await import("@/lib/notifications.server");
    const contact = await patientContact(row.user_id);
    await trySendOnce(`lab-results-ready:${row.id}`, "lab-results-ready", contact.email, {
      name: contact.name ?? undefined,
      orderNumber: (row as any).orders?.order_number,
    });

    return { ok: true, alreadyApproved: false };
  });

/** Short-lived link so staff can open a lab report they uploaded. */
export const labPanelReportUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { documentId: string }) => {
    if (!input?.documentId) throw new Error("Missing document.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc, error } = await supabaseAdmin
      .from("patient_documents")
      .select("storage_path")
      .eq("id", data.documentId)
      .single();
    if (error) throw new Error(error.message);
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("patient-documents")
      .createSignedUrl(doc.storage_path, 300);
    if (signError) throw new Error(signError.message);
    return { url: signed.signedUrl };
  });

/* ------------------------------------------------- product orders (shop) */

export type ProductOrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalCents: number;
  paymentProvider: string | null;
  paymentRef: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  patient: { name: string | null; email: string | null; phone: string | null };
  shipping: {
    name: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  items: { name: string; quantity: number; unitPriceCents: number; group: string }[];
};

/**
 * Every product (non-lab-panel) order, newest first — the shop order list.
 * Lab panel purchases live in their own queue, so they are excluded here.
 */
export const listProductOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fallbackId = "00000000-0000-0000-0000-000000000000";

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, created_at, status, total_cents, user_id, payment_provider, payment_ref, carrier, tracking_number, shipped_at, delivered_at, shipping_name, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_zip",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const orderIds = rows.map((r: any) => r.id);
    const userIds = [...new Set(rows.map((r: any) => r.user_id))] as string[];

    const [{ data: items }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("order_id, product_name, quantity, product_group, unit_price_cents")
        .in("order_id", orderIds.length ? orderIds : [fallbackId]),
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds.length ? userIds : [fallbackId]),
    ]);

    const emails = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        emails.set(id, u?.user?.email ?? null);
      }),
    );

    const orders: ProductOrderRow[] = rows
      .map((r: any) => {
        const own = (items ?? []).filter((i: any) => i.order_id === r.id);
        const profile = (profiles ?? []).find((p: any) => p.id === r.user_id);
        return {
          id: r.id,
          orderNumber: r.order_number,
          createdAt: r.created_at,
          status: r.status,
          totalCents: r.total_cents,
          paymentProvider: r.payment_provider ?? null,
          paymentRef: r.payment_ref ?? null,
          carrier: r.carrier ?? null,
          trackingNumber: r.tracking_number ?? null,
          shippedAt: r.shipped_at ?? null,
          deliveredAt: r.delivered_at ?? null,
          patient: {
            name: profile?.full_name ?? r.shipping_name ?? null,
            email: emails.get(r.user_id) ?? null,
            phone: profile?.phone ?? null,
          },
          shipping: {
            name: r.shipping_name ?? null,
            address1: r.shipping_address1 ?? null,
            address2: r.shipping_address2 ?? null,
            city: r.shipping_city ?? null,
            state: r.shipping_state ?? null,
            zip: r.shipping_zip ?? null,
          },
          items: own.map((i: any) => ({
            name: i.product_name,
            quantity: i.quantity,
            unitPriceCents: i.unit_price_cents,
            group: i.product_group,
          })),
        };
      })
      // Shop orders only: skip orders that are purely lab panels.
      .filter((o) => o.items.length > 0 && o.items.some((i) => i.group !== "labs"));

    return { orders };
  });

/* ------------------------------------------------------------- patient */

/** The signed-in patient's Quest lab orders and their fulfillment state. */
export const myLabFulfillments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data, error } = await supabase
      .from("lab_fulfillments")
      .select(
        "id, status, quest_reference, quest_link, admin_note, ready_at, draw_booked_at, draw_completed_at, created_at, orders(order_number, created_at, status)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { fulfillments: data ?? [] };
  });
