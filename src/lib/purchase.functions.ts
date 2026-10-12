import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATALOG } from "@/data/catalog";
import { isControlledProduct, priceToCents, requiresApprovalProduct } from "@/lib/cart-context";

type PlaceOrderInput = {
  items: { productId: string; quantity: number; forProductId?: string | null }[];
  shipping: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
};

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PlaceOrderInput) => {
    if (!input?.items?.length) throw new Error("Your cart is empty.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Prices always come from the server-side catalog, never from the client.
    const resolved = data.items.map((line) => {
      const product = CATALOG.find((p) => p.id === line.productId);
      if (!product) throw new Error(`Unknown product: ${line.productId}`);
      const quantity = Math.max(1, Math.min(12, Math.round(line.quantity) || 1));
      return {
        product,
        quantity,
        unitPriceCents: priceToCents(product.price),
        forProductId: line.forProductId ?? null,
      };
    });

    const subtotalCents = resolved.reduce((s, r) => s + r.unitPriceCents * r.quantity, 0);
    const requiresLabs = resolved.some((r) => r.product.lab);
    const requiresApproval = resolved.some((r) => requiresApprovalProduct(r.product));
    const requiresPhotoId = resolved.some((r) => isControlledProduct(r.product));
    const requiresTelehealth = resolved.some((r) => r.product.telehealth);

    // A practitioner approval for a product is the final clinical sign-off: it
    // is only issued after that treatment's blood work and visit were reviewed.
    // Once it exists, the earlier per-step gates must not block the order.
    const { data: approvalRows } = await supabase
      .from("order_approvals")
      .select("id, product_id, status, order_id")
      .eq("user_id", userId);
    const approvedProductIds = new Set(
      (approvalRows ?? [])
        .filter((a: any) => a.status === "approved")
        .map((a: any) => a.product_id as string),
    );

    // Server-side gate: labs must be on file AND verified by a practitioner
    // before any therapy that requires blood work can be ordered.
    if (requiresLabs) {
      // Blood work is per treatment: the verified file must be tagged with
      // this exact product, so every therapy starts with its own fresh labs.
      for (const line of resolved.filter(
        (r) => r.product.lab && !approvedProductIds.has(r.product.id),
      )) {
        const [{ count: verifiedLabs }, { count: completedPanels }] = await Promise.all([
          supabase
            .from("patient_documents")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .neq("kind", "photo_id")
            .eq("status", "verified")
            .eq("for_product_id", line.product.id),
          supabase
            .from("lab_fulfillments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("for_product_id", line.product.id)
            .in("status", ["results_received"]),
        ]);
        if (!verifiedLabs && !completedPanels) {
          throw new Error(
            `Blood work for ${line.product.name} must be reviewed and approved by a practitioner before you can order it.`,
          );
        }
      }
    }

    // Server-side gate: a practitioner consultation must be booked or done.
    if (requiresTelehealth) {
      // One consultation per treatment: the visit must be tagged with this product.
      for (const line of resolved.filter(
        (r) => r.product.telehealth && !approvedProductIds.has(r.product.id),
      )) {
        const { count: visits } = await supabase
          .from("lab_appointments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", ["scheduled", "completed"])
          .in("appointment_type", ["treatment_approval", "initial_consult", "follow_up"])
          .eq("for_product_id", line.product.id);
        if (!visits) {
          throw new Error(
            `Please schedule your practitioner consultation for ${line.product.name} before ordering it.`,
          );
        }
      }
    }

    // Server-side gate: the practitioner must have APPROVED this exact product
    // before it can be bought. This is the hard boundary behind the wizard.
    if (requiresApproval) {
      const gated = resolved.filter((r) => requiresApprovalProduct(r.product));
      for (const line of gated) {
        if (!approvedProductIds.has(line.product.id)) {
          throw new Error(
            `${line.product.name} has to be approved by a practitioner before you can order it. Start the eligibility process on the product page.`,
          );
        }
      }
    }

    // Server-side gate: controlled items need a photo ID on file.
    if (requiresPhotoId) {
      const { count } = await supabase
        .from("patient_documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("kind", "photo_id");
      if (!count) throw new Error("A government photo ID is required before ordering these items.");
    }

    // Server-side gate: intake and consents must be complete for anything but labs.
    if (resolved.some((r) => r.product.group !== "labs")) {
      const [{ data: intake }, { count: consentCount }] = await Promise.all([
        supabase.from("patient_intakes").select("submitted_at").eq("user_id", userId).maybeSingle(),
        supabase
          .from("consent_signatures")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);
      if (!intake?.submitted_at) throw new Error("Please complete your medical intake first.");
      if (!consentCount) throw new Error("Please sign your consents and agreements first.");
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "pending_payment",
        subtotal_cents: subtotalCents,
        total_cents: subtotalCents,
        requires_labs: requiresLabs,
        requires_approval: requiresApproval,
        shipping_name: data.shipping.name || null,
        shipping_address1: data.shipping.address1 || null,
        shipping_address2: data.shipping.address2 || null,
        shipping_city: data.shipping.city || null,
        shipping_state: data.shipping.state || null,
        shipping_zip: data.shipping.zip || null,
      })
      .select("id, order_number")
      .single();
    if (orderError || !order) throw new Error(orderError?.message ?? "Could not create the order.");

    const { error: itemsError } = await supabase.from("order_items").insert(
      resolved.map((r) => ({
        order_id: order.id,
        user_id: userId,
        product_id: r.product.id,
        product_name: r.product.name,
        product_group: r.product.group,
        unit_price_cents: r.unitPriceCents,
        quantity: r.quantity,
        requires_labs: r.product.lab,
        for_product_id: r.forProductId,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    // The approval already happened before this purchase — attach the order to
    // the eligibility record so staff and the patient see them together.
    if (requiresApproval) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const gatedIds = resolved
        .filter((r) => requiresApprovalProduct(r.product))
        .map((r) => r.product.id);
      await supabaseAdmin
        .from("order_approvals")
        .update({ order_id: order.id })
        .eq("user_id", userId)
        .eq("status", "approved")
        .is("order_id", null)
        .in("product_id", gatedIds);
    }

    // Lab panels: confirm payment by email and let the patient know the Quest
    // scheduling link follows. Email failures must never block the order.
    if (requiresLabs) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();
        const email = u?.user?.email;
        if (email) {
          const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
          await sendTemplateEmail("lab-order-confirmation", email, {
            templateData: {
              name: profile?.full_name ?? data.shipping.name,
              orderNumber: order.order_number,
              panels: resolved
                .filter((r) => r.product.group === "labs")
                .map((r) => (r.quantity > 1 ? `${r.product.name} ×${r.quantity}` : r.product.name)),
            },
            idempotencyKey: `lab-order-confirmation-${order.id}`,
          });
        }
      } catch (emailError) {
        console.error("lab-order-confirmation email failed", emailError);
      }
    }

    return { orderId: order.id, orderNumber: order.order_number, requiresApproval };
  });

type UploadPhotoIdInput = { fileName: string; contentType: string; dataBase64: string };

export const uploadPhotoId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UploadPhotoIdInput) => {
    if (!input?.dataBase64) throw new Error("No file received.");
    if (!/^(image\/(jpeg|png|webp|heic)|application\/pdf)$/.test(input.contentType)) {
      throw new Error("Upload a JPG, PNG, WEBP, or PDF file.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("File must be under 10MB.");

    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
    const path = `${userId}/photo-id-${Date.now()}-${safeName}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: uploadError } = await supabaseAdmin.storage
      .from("patient-documents")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { error } = await supabaseAdmin.from("patient_documents").insert({
      user_id: userId,
      kind: "photo_id",
      file_name: safeName,
      storage_path: path,
    });
    if (error) throw new Error(error.message);

    return { ok: true, fileName: safeName };
  });

type RefillInput = { orderId: string; productId: string; notes?: string };

export const requestRefill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RefillInput) => {
    if (!input?.orderId || !input?.productId) throw new Error("Missing order details.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: item } = await supabase
      .from("order_items")
      .select("product_id, product_name")
      .eq("order_id", data.orderId)
      .eq("product_id", data.productId)
      .maybeSingle();
    if (!item) throw new Error("That item is not on this order.");

    const { error } = await supabase.from("refill_requests").insert({
      user_id: userId,
      order_id: data.orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type UploadLabsInput = {
  fileName: string;
  contentType: string;
  dataBase64: string;
  /** Treatment this blood work is being uploaded for. */
  forProductId?: string | null;
};

export const uploadLabResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UploadLabsInput) => {
    if (!input?.dataBase64) throw new Error("No file received.");
    if (!/^(image\/(jpeg|png|webp|heic)|application\/pdf)$/.test(input.contentType)) {
      throw new Error("Upload a JPG, PNG, WEBP, or PDF file.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("File must be under 15MB.");

    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
    const path = `${userId}/labs-${Date.now()}-${safeName}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: uploadError } = await supabaseAdmin.storage
      .from("patient-documents")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { error } = await supabaseAdmin.from("patient_documents").insert({
      user_id: userId,
      kind: "lab_result",
      lab_source: "uploaded",
      for_product_id: data.forProductId ?? null,
      file_name: safeName,
      storage_path: path,
    });
    if (error) throw new Error(error.message);

    return { ok: true, fileName: safeName };
  });

export const myLabDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("patient_documents")
      .select("id, file_name, status, lab_source, created_at")
      .eq("user_id", userId)
      .eq("kind", "lab_result")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { documents: data ?? [] };
  });

/**
 * Patient self-confirmation that a shipped order arrived. This records receipt
 * in the portal only — it does not contact the carrier and does not change the
 * order status, treatment status, or any clinical record.
 */
export const markMyOrderDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error("Missing order.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // RLS-scoped read: only the signed-in patient's own order is visible here.
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, shipped_at, delivered_at, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.user_id !== userId) {
      throw new Error("We couldn't find that order on your account.");
    }
    if (order.delivered_at) return { ok: true, alreadyConfirmed: true };
    if (order.status !== "fulfilled" || !order.shipped_at) {
      throw new Error("This order hasn't shipped yet, so it can't be marked as received.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .is("delivered_at", null);
    if (updateError) throw new Error(updateError.message);
    return { ok: true, alreadyConfirmed: false };
  });
