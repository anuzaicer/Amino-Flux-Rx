import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { listProductOrders, type ProductOrderRow } from "@/lib/admin.functions";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-sky-100 text-sky-800",
  in_review: "bg-violet-100 text-violet-800",
  approved: "bg-emerald-100 text-emerald-800",
  denied: "bg-red-100 text-red-700",
  fulfilled: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700",
};

type Filter = "all" | "pending_payment" | "paid" | "fulfilled";

/** Shop-style order list: who bought what, for how much, and where it stands. */
export function ProductOrders() {
  const load = useServerFn(listProductOrders);
  const [rows, setRows] = useState<ProductOrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setRows(res.orders as ProductOrderRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders.");
      setRows([]);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 text-[15px] text-admin-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
      </p>
    );
  }

  const q = query.trim().toLowerCase();
  const visible = rows.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (!q) return true;
    return [o.orderNumber, o.patient.name, o.patient.email, ...o.items.map((i) => i.name)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const count = (s: Filter) =>
    s === "all" ? rows.length : rows.filter((o) => o.status === s).length;

  return (
    <div>
       <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] sm:items-center">
         <div className="grid grid-cols-2 rounded-lg border border-admin-border bg-admin-canvas p-1 sm:flex sm:flex-wrap">
          {(
            [
              ["all", "All"],
              ["pending_payment", "Awaiting payment"],
              ["paid", "Paid"],
              ["fulfilled", "Shipped"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition ${
                filter === key
                  ? "bg-admin-surface text-admin-ink shadow-admin-soft"
                  : "text-admin-muted hover:text-admin-ink"
              }`}
            >
              {label} ({count(key)})
            </button>
          ))}
        </div>
         <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order, customer or product"
            className="h-9 pl-9 text-[14px]"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-[14px] font-semibold text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-admin-border">
        <div className="hidden grid-cols-[1.1fr_1.5fr_1.8fr_0.8fr_1fr_auto] gap-3 bg-admin-canvas px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-admin-muted lg:grid">
          <span>Order</span>
          <span>Customer</span>
          <span>Products</span>
          <span>Total</span>
          <span>Status</span>
          <span className="w-24 text-right">Details</span>
        </div>

        {visible.length === 0 ? (
          <p className="bg-admin-surface px-4 py-8 text-center text-[15px] text-admin-muted">
            No orders match this view.
          </p>
        ) : (
          <ul className="divide-y divide-admin-border bg-admin-surface">
            {visible.map((o) => {
              const open = openId === o.id;
              const label = STATUS_LABEL[o.status as OrderStatus] ?? o.status;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : o.id)}
                    aria-expanded={open}
                     className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-3 text-left transition hover:bg-admin-canvas/60 lg:grid-cols-[1.1fr_1.5fr_1.8fr_0.8fr_1fr_auto] lg:items-center lg:gap-3"
                  >
                    <span className="text-[14px] font-bold">
                      #{o.orderNumber}
                      <span className="mt-0.5 block text-[12px] font-medium text-admin-muted">
                        {when(o.createdAt)}
                      </span>
                    </span>
                     <span className="col-span-2 min-w-0 text-[14px] lg:col-auto">
                      <span className="block truncate font-semibold">
                        {o.patient.name ?? "Customer"}
                      </span>
                      <span className="block truncate text-[12px] text-admin-muted">
                        {o.patient.email}
                      </span>
                    </span>
                     <span className="col-span-2 min-w-0 truncate text-[14px] text-admin-muted lg:col-auto">
                      {o.items
                        .map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name))
                        .join(", ")}
                    </span>
                    <span className="text-[14px] font-semibold">{money(o.totalCents)}</span>
                     <span className="col-start-1 lg:col-auto">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold ${
                          STATUS_STYLE[o.status] ?? "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {label}
                      </span>
                    </span>
                     <span className="col-start-2 row-start-1 flex w-24 items-center justify-end gap-2 text-[13px] font-semibold text-admin-muted lg:col-auto lg:row-auto">
                      {open ? "Close" : "View"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>

                  {open && (
                    <div className="grid gap-4 border-t border-admin-border bg-admin-canvas/50 px-4 py-4 lg:grid-cols-3">
                      <div className="rounded-lg border border-admin-border bg-admin-surface p-4 lg:col-span-2">
                        <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                          Items
                        </p>
                        <ul className="mt-2 divide-y divide-admin-border text-[14px]">
                          {o.items.map((i, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-3 py-2">
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{i.name}</span>
                                <span className="text-[12px] text-admin-muted">
                                  {i.group} · qty {i.quantity}
                                </span>
                              </span>
                              <span className="shrink-0 font-semibold">
                                {money(i.unitPriceCents * i.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 flex justify-between border-t border-admin-border pt-3 text-[15px] font-bold">
                          <span>Order total</span>
                          <span>{money(o.totalCents)}</span>
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-lg border border-admin-border bg-admin-surface p-4">
                          <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                            Customer
                          </p>
                          <p className="mt-2 text-[14px] font-semibold">
                            {o.patient.name ?? "Customer"}
                          </p>
                          <p className="text-[13px] text-admin-muted">{o.patient.email}</p>
                          {o.patient.phone && (
                            <p className="text-[13px] text-admin-muted">{o.patient.phone}</p>
                          )}
                        </div>

                        <div className="rounded-lg border border-admin-border bg-admin-surface p-4">
                          <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                            Shipping
                          </p>
                          {o.shipping.address1 ? (
                            <p className="mt-2 text-[14px] leading-relaxed">
                              {o.shipping.name}
                              <br />
                              {o.shipping.address1}
                              {o.shipping.address2 ? (
                                <>
                                  <br />
                                  {o.shipping.address2}
                                </>
                              ) : null}
                              <br />
                              {[o.shipping.city, o.shipping.state, o.shipping.zip]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          ) : (
                            <p className="mt-2 text-[14px] text-admin-muted">
                              No shipping address on this order.
                            </p>
                          )}
                          {o.trackingNumber && (
                            <p className="mt-2 text-[13px] text-admin-muted">
                              {o.carrier ?? "Carrier"} · {o.trackingNumber}
                            </p>
                          )}
                        </div>

                        <div className="rounded-lg border border-admin-border bg-admin-surface p-4">
                          <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                            Payment
                          </p>
                          <p className="mt-2 text-[14px] capitalize">
                            {o.paymentProvider ?? "Recorded manually"}
                          </p>
                          {o.paymentRef && (
                            <p className="break-all text-[12px] text-admin-muted">{o.paymentRef}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ProductOrders;
