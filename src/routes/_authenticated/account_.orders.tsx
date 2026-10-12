import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Package } from "lucide-react";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { useGender } from "@/components/gender/GenderContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/cart-context";
import { STATUS_LABEL } from "@/lib/order-status";
import { productImageFor } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/account_/orders")({
  head: () => ({
    meta: [
      { title: "Your orders | Amino Flux Rx" },
      {
        name: "description",
        content:
          "Track your Amino Flux Rx treatment orders, provider review status, and refill requests.",
      },
      { property: "og:title", content: "Your orders | Amino Flux Rx" },
      {
        property: "og:description",
        content: "Track your treatment orders and provider review status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

type OrderItemRow = {
  product_id: string;
  product_name: string;
  product_group: string;
  quantity: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: keyof typeof STATUS_LABEL;
  total_cents: number;
  created_at: string;
  order_items: OrderItemRow[];
};

function OrdersPage() {
  const { theme } = useGender();
  const accent = theme === "men" ? "#2173D1" : "#5C9330";
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    void supabase
      .from("orders")
      .select(
        "id, order_number, status, total_cents, created_at, order_items(product_id, product_name, product_group, quantity)",
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, [loading, user]);

  return (
    <div className="relative min-h-screen text-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-white/85 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Your orders
        </h1>

        {loading ? (
          <p className="mt-10 text-white/80">Loading…</p>
        ) : !user ? (
          <div className="mt-10 rounded-3xl bg-white p-8 text-[#0F1E33]">
            <p className="font-semibold">Sign in to view your orders.</p>
            <Link
              to="/auth"
              className="mt-4 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Sign in
            </Link>
          </div>
        ) : orders === null ? (
          <p className="mt-10 text-white/80">Loading your orders…</p>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white p-8 text-center text-[#0F1E33]">
            <Package className="mx-auto h-8 w-8" style={{ color: accent }} />
            <p className="mt-3 font-semibold">No orders yet.</p>
            <Link
              to="/category/$category"
              params={{ category: theme }}
              className="mt-5 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Browse care
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {orders.map((o) => {
              const items = o.order_items ?? [];
              return (
                <li key={o.id}>
                  <Link
                    to="/account/orders/$orderId"
                    params={{ orderId: o.id }}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex shrink-0 -space-x-3">
                        {(items.length ? items.slice(0, 2) : [null]).map((it, i) => (
                          <img
                            key={it ? it.product_id : "placeholder"}
                            src={productImageFor(it?.product_group, it?.product_id)}
                            alt={it ? it.product_name : "Order"}
                            className="h-14 w-14 rounded-2xl border-2 border-white object-cover shadow-sm"
                            style={{ zIndex: 2 - i }}
                            loading="lazy"
                          />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg font-bold">
                          {items.length
                            ? items
                                .map((it) =>
                                  it.quantity > 1
                                    ? `${it.product_name} ×${it.quantity}`
                                    : it.product_name,
                                )
                                .join(" · ")
                            : o.order_number}
                        </p>
                        <p className="text-[15px] text-[#0F1E33]/70">
                          {o.order_number} · {new Date(o.created_at).toLocaleDateString()} ·{" "}
                          {STATUS_LABEL[o.status] ?? o.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-display text-lg font-bold">
                        {formatPrice(o.total_cents)}
                      </span>
                      <ArrowRight className="h-4 w-4" style={{ color: accent }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
