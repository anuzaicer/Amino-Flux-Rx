import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Loader2, RefreshCw, Truck } from "lucide-react";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { useGender } from "@/components/gender/GenderContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/cart-context";
import { STATUS_HELP, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { markMyOrderDelivered, requestRefill } from "@/lib/purchase.functions";

export const Route = createFileRoute("/_authenticated/account_/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order details | Amino Flux Rx" },
      {
        name: "description",
        content: "See your Amino Flux Rx order items, provider review status, and request refills.",
      },
      { property: "og:title", content: "Order details | Amino Flux Rx" },
      { property: "og:description", content: "Order items, provider review status, and refills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetailPage,
});

type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  requires_labs: boolean;
  requires_approval: boolean;
  shipping_name: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

type Item = {
  id: string;
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  requires_labs: boolean;
};

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { theme } = useGender();
  const accent = theme === "men" ? "#2173D1" : "#5C9330";
  const { user, loading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [approvalNote, setApprovalNote] = useState<string | null>(null);
  const [refilled, setRefilled] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const runRefill = useServerFn(requestRefill);
  const runDelivered = useServerFn(markMyOrderDelivered);
  const [confirming, setConfirming] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: o }, { data: its }, { data: ap }, { data: refs }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
      supabase
        .from("order_approvals")
        .select("status, provider_note")
        .eq("order_id", orderId)
        .maybeSingle(),
      supabase.from("refill_requests").select("product_id").eq("order_id", orderId),
    ]);
    if (!o) return setNotFound(true);
    setOrder(o as Order);
    setItems((its ?? []) as Item[]);
    setApprovalNote(ap?.provider_note ?? null);
    setRefilled((refs ?? []).map((r) => r.product_id));
  }, [orderId]);

  useEffect(() => {
    if (loading || !user) return;
    void load();
  }, [loading, user, load]);

  const onRefill = async (productId: string) => {
    setBusy(productId);
    try {
      await runRefill({ data: { orderId, productId } });
      setRefilled((prev) => [...prev, productId]);
    } catch {
      /* surfaced by the button state */
    }
    setBusy(null);
  };

  const onConfirmDelivery = async () => {
    setConfirming(true);
    setDeliveryError(null);
    try {
      await runDelivered({ data: { orderId } });
      await load();
    } catch (e) {
      setDeliveryError((e as Error).message);
    }
    setConfirming(false);
  };

  return (
    <div className="relative min-h-screen text-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-white/85 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All orders
        </Link>

        {loading ? (
          <p className="mt-10 text-white/80">Loading…</p>
        ) : !user ? (
          <div className="mt-10 rounded-3xl bg-white p-8 text-[#0F1E33]">
            <p className="font-semibold">Sign in to view this order.</p>
            <Link
              to="/auth"
              className="mt-4 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Sign in
            </Link>
          </div>
        ) : notFound ? (
          <p className="mt-10 text-white/85">We couldn't find that order.</p>
        ) : !order ? (
          <p className="mt-10 text-white/80">Loading your order…</p>
        ) : (
          <>
            <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Order {order.order_number}
            </h1>
            <p className="mt-2 text-white/85">
              Placed {new Date(order.created_at).toLocaleDateString()}
            </p>

            <section className="mt-8 rounded-3xl bg-white p-6 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)]">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[15px] font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                {STATUS_LABEL[order.status]}
              </span>
              <p className="mt-3 text-[15px] text-[#0F1E33]/75">{STATUS_HELP[order.status]}</p>
              {approvalNote && (
                <p className="mt-3 rounded-2xl bg-[#0F1E33]/5 p-3 text-[15px]">
                  <strong>Provider note:</strong> {approvalNote}
                </p>
              )}
              {order.requires_labs && (
                <p className="mt-3 text-[15px] text-[#0F1E33]/75">
                  This plan requires blood work.{" "}
                  <Link
                    to="/lab-testing"
                    className="font-semibold underline"
                    style={{ color: accent }}
                  >
                    Book Quest &amp; get your blood work done
                  </Link>
                  .
                </p>
              )}
            </section>

            <section className="mt-6 rounded-3xl bg-white p-6 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)]">
              <h2 className="font-display text-xl font-bold">Items</h2>
              <ul className="mt-4 divide-y divide-[#0F1E33]/10">
                {items.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-[200px] flex-1">
                      <p className="font-semibold">{i.product_name}</p>
                      <p className="text-[15px] text-[#0F1E33]/70">Qty {i.quantity}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">
                        {formatPrice(i.unit_price_cents * i.quantity)}
                      </span>
                      {refilled.includes(i.product_id) ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-[15px] font-semibold"
                          style={{ color: accent }}
                        >
                          <Check className="h-3.5 w-3.5" /> Refill requested
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRefill(i.product_id)}
                          disabled={busy === i.product_id}
                          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-60"
                          style={{ backgroundColor: accent }}
                        >
                          {busy === i.product_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Request refill
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-[#0F1E33]/10 pt-4 text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatPrice(order.total_cents)}</span>
              </div>
            </section>

            {order.status === "fulfilled" && order.shipped_at && (
              <section className="mt-6 rounded-3xl bg-white p-6 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)]">
                <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                  <Truck className="h-5 w-5" style={{ color: accent }} /> On the way
                </h2>
                <p className="mt-3 text-[15px] text-[#0F1E33]/80">
                  Shipped {new Date(order.shipped_at).toLocaleDateString()}
                  {order.carrier ? ` · ${order.carrier}` : ""}
                </p>
                {order.tracking_number && (
                  <p className="mt-1 text-[15px] text-[#0F1E33]/80">
                    Tracking number: <strong>{order.tracking_number}</strong>
                  </p>
                )}
                {order.delivered_at ? (
                  <p
                    className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold"
                    style={{ color: accent }}
                  >
                    <Check className="h-4 w-4" /> Delivery confirmed on{" "}
                    {new Date(order.delivered_at).toLocaleDateString()}
                  </p>
                ) : (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={onConfirmDelivery}
                      disabled={confirming}
                      className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[15px] font-semibold text-white disabled:opacity-60"
                      style={{ backgroundColor: accent }}
                    >
                      {confirming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      I've received my order
                    </button>
                    <p className="mt-2 text-[15px] text-[#0F1E33]/70">
                      This confirms receipt in your Amino Flux portal; it does not update the
                      carrier.
                    </p>
                    {deliveryError && (
                      <p className="mt-2 text-[15px] font-semibold text-red-600">{deliveryError}</p>
                    )}
                  </div>
                )}
              </section>
            )}

            <section className="mt-6 rounded-3xl bg-white p-6 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)]">
              <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                <Truck className="h-5 w-5" style={{ color: accent }} /> Shipping to
              </h2>
              <address className="mt-3 not-italic text-[15px] text-[#0F1E33]/80">
                {order.shipping_name}
                <br />
                {order.shipping_address1}
                {order.shipping_address2 ? `, ${order.shipping_address2}` : ""}
                <br />
                {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
              </address>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
