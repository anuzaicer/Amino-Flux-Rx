import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

/**
 * Public PayPal settings the browser needs to render the button.
 * Returns `null` when PayPal isn't configured, so the UI simply hides it.
 */
export const paypalConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { paypalPublicConfig } = await import("@/lib/paypal.server");
  return paypalPublicConfig();
});

/**
 * Starts a PayPal payment for one of the caller's own orders.
 * The amount always comes from the stored order total, never from the client.
 */
export const createPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error("Missing order.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, order_number, total_cents")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("We couldn't find that order.");
    if (order.user_id !== ctx.userId) throw new Error("Not your order.");
    if (order.status === "paid") return { alreadyPaid: true, paypalOrderId: null };
    if (order.status !== "pending_payment") throw new Error("This order isn't awaiting payment.");

    const { createPaypalOrderRemote } = await import("@/lib/paypal.server");
    const paypalOrderId = await createPaypalOrderRemote({
      amountCents: order.total_cents,
      reference: order.order_number,
      description: `Amino Flux Rx order ${order.order_number}`,
    });

    await supabaseAdmin
      .from("orders")
      .update({ payment_provider: "paypal", payment_ref: paypalOrderId })
      .eq("id", order.id);

    return { alreadyPaid: false, paypalOrderId };
  });

/**
 * Captures the approved PayPal payment and marks the order paid.
 * Idempotent: an order that's already paid returns success without redoing work.
 */
export const capturePaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; paypalOrderId: string }) => {
    if (!input?.orderId || !input?.paypalOrderId) throw new Error("Missing payment details.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, order_number, total_cents, payment_ref")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("We couldn't find that order.");
    if (order.user_id !== ctx.userId) throw new Error("Not your order.");
    if (order.status === "paid") return { ok: true, alreadyPaid: true };
    if (order.payment_ref && order.payment_ref !== data.paypalOrderId) {
      throw new Error("This payment doesn't match your order.");
    }

    const { capturePaypalOrderRemote } = await import("@/lib/paypal.server");
    const capture = await capturePaypalOrderRemote(data.paypalOrderId);
    if (capture.status !== "COMPLETED") {
      throw new Error("PayPal didn't complete this payment. Nothing was charged.");
    }
    if (capture.amountCents !== null && capture.amountCents !== order.total_cents) {
      throw new Error("The paid amount didn't match your order total. Our team will follow up.");
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        payment_provider: "paypal",
        payment_ref: capture.captureId ?? data.paypalOrderId,
      })
      .eq("id", order.id)
      .eq("status", "pending_payment");
    if (updateError) throw new Error(updateError.message);

    // Same receipt + downstream handling as an admin-confirmed payment.
    try {
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
    } catch (e) {
      console.error("payment-received email failed", e);
    }

    return { ok: true, alreadyPaid: false };
  });
