import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Truck, PackageCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markCompleted, markShipped, shippingQueue, type ShipRow } from "@/lib/review.functions";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : null);

/** Admin fulfillment queue: paid/approved orders out the door, with tracking email. */
export function ShipQueue() {
  const load = useServerFn(shippingQueue);
  const ship = useServerFn(markShipped);
  const complete = useServerFn(markCompleted);
  const [notice, setNotice] = useState<string | null>(null);

  const [rows, setRows] = useState<ShipRow[] | null>(null);
  const [form, setForm] = useState<
    Record<string, { carrier: string; tracking: string; url: string }>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setRows(res.orders as ShipRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the shipping queue.");
      setRows([]);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const field = (id: string) => form[id] ?? { carrier: "", tracking: "", url: "" };

  const emailNotice = (
    label: string,
    orderNumber: string,
    res: { emailStatus?: string; emailError?: string | null },
  ) => {
    const s = res.emailStatus;
    if (s === "sent") return `${orderNumber}: ${label} email sent to the customer.`;
    if (s === "already_sent") return `${orderNumber}: ${label} email was already sent earlier — not resent.`;
    if (s === "suppressed") return `${orderNumber}: saved. Customer has opted out of emails, so none was sent.`;
    if (s === "no_email") return `${orderNumber}: saved. No customer email on file, so none was sent.`;
    return null;
  };

  const handleEmailResult = (
    label: string,
    orderNumber: string,
    res: { emailStatus?: string; emailError?: string | null },
  ) => {
    if (res.emailStatus === "failed") {
      setError(
        `${orderNumber}: order saved, but the ${label} email failed${res.emailError ? ` (${res.emailError})` : ""}.`,
      );
    } else setNotice(emailNotice(label, orderNumber, res));
  };

  const finish = async (row: ShipRow) => {
    setBusy(row.id);
    setError(null);
    setNotice(null);
    try {
      const res = await complete({ data: { orderId: row.id } });
      handleEmailResult("thank-you", row.orderNumber, res);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark that order completed.");
    } finally {
      setBusy(null);
    }
  };

  const completeButton = (row: ShipRow) =>
    row.completedAt ? (
      <p className="mt-2 flex items-center gap-2 text-[14px] font-semibold text-admin-accent">
        <CheckCircle2 className="h-4 w-4" /> Completed {day(row.completedAt)}
      </p>
    ) : (
      <Button
        variant="outline"
        onClick={() => finish(row)}
        disabled={busy === row.id}
        className="mt-3 h-auto w-full whitespace-normal py-2 sm:w-auto"
      >
        {busy === row.id ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Mark completed & send thank-you
      </Button>
    );

  const submit = async (row: ShipRow) => {
    setBusy(row.id);
    setError(null);
    setNotice(null);
    try {
      const f = field(row.id);
      const res = await ship({
        data: {
          orderId: row.id,
          carrier: f.carrier,
          trackingNumber: f.tracking,
          trackingUrl: f.url,
        },
      });
      handleEmailResult("shipping", row.orderNumber, res);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark that order shipped.");
    } finally {
      setBusy(null);
    }
  };

  if (rows === null) {
    return (
      <p className="mt-3 flex items-center gap-2 text-[15px] opacity-65">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
      </p>
    );
  }

  const readyToFulfill = rows.filter((r) => r.status !== "fulfilled");
  const shipped = rows.filter((r) => r.status === "fulfilled" && !r.deliveredAt);
  const delivered = rows.filter((r) => r.status === "fulfilled" && r.deliveredAt);

  const header = (title: string, count: number, note: string) => (
    <div className="mb-3 flex flex-wrap items-baseline gap-2">
      <h3 className="text-[17px] font-bold tracking-tight">{title}</h3>
      <span className="rounded-full bg-admin-accent-soft px-2.5 py-0.5 text-[13px] font-bold text-admin-accent">
        {count}
      </span>
      <span className="text-[13px] opacity-60">{note}</span>
    </div>
  );

  const summary = (row: ShipRow) => (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[15px] font-bold">{row.patient.name ?? "Patient"}</p>
        <span className="text-[13px] opacity-60">{row.patient.email}</span>
       <span className="w-full text-[13px] font-semibold opacity-70 sm:ml-auto sm:w-auto">
          {row.orderNumber} · {money(row.totalCents)}
        </span>
      </div>
      <p className="mt-1 text-[15px] opacity-75">
        {row.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(", ")}
      </p>
      {row.address && <p className="mt-1 text-[13px] opacity-60">{row.address}</p>}
    </>
  );

  return (
    <div className="space-y-8">
      {error && <p className="text-[15px] font-semibold text-red-600">{error}</p>}
      {notice && <p className="text-[15px] font-semibold text-admin-accent">{notice}</p>}

      <section>
        {header("Ready to fulfill", readyToFulfill.length, "paid or practitioner-approved orders")}
        {readyToFulfill.length === 0 ? (
          <p className="rounded-xl bg-admin-canvas px-4 py-6 text-center text-[15px] opacity-60">
            Nothing waiting to ship right now.
          </p>
        ) : (
          <ul className="space-y-4">
            {readyToFulfill.map((row) => {
              const f = field(row.id);
              return (
                <li key={row.id} className="rounded-xl border border-black/10 p-4">
                  {summary(row)}
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <Input
                      value={f.carrier}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [row.id]: { ...f, carrier: e.target.value } }))
                      }
                      placeholder="Carrier (UPS)"
                    />
                    <Input
                      value={f.tracking}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [row.id]: { ...f, tracking: e.target.value } }))
                      }
                      placeholder="Tracking number"
                    />
                    <Input
                      value={f.url}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [row.id]: { ...f, url: e.target.value } }))
                      }
                      placeholder="Tracking link (optional)"
                    />
                  </div>
                   <Button
                    onClick={() => submit(row)}
                    disabled={busy === row.id}
                     className="mt-3 h-auto w-full whitespace-normal bg-admin-accent py-2.5 text-admin-accent-foreground hover:opacity-90 sm:w-auto"
                  >
                    {busy === row.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Truck className="mr-2 h-4 w-4" />
                    )}
                    Mark shipped & email tracking
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        {header(
          "Shipped — in transit",
          shipped.length,
          "waiting on the patient to confirm arrival",
        )}
        {shipped.length === 0 ? (
          <p className="text-[15px] opacity-60">No packages in transit.</p>
        ) : (
          <ul className="space-y-3">
            {shipped.map((row) => (
              <li key={row.id} className="rounded-xl border border-black/10 p-4">
                {summary(row)}
                <p className="mt-2 flex flex-wrap items-center gap-2 break-all text-[15px] font-semibold text-[#4d7d21]">
                  <Truck className="h-4 w-4" /> Shipped
                  {row.carrier ? ` · ${row.carrier}` : ""}
                  {row.trackingNumber ? ` · ${row.trackingNumber}` : ""}
                  {day(row.shippedAt) ? ` · ${day(row.shippedAt)}` : ""}
                </p>
                {completeButton(row)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        {header("Delivered", delivered.length, "patient confirmed arrival in their portal")}
        {delivered.length === 0 ? (
          <p className="text-[15px] opacity-60">No confirmed deliveries yet.</p>
        ) : (
          <ul className="space-y-2">
            {delivered.map((row) => (
              <li key={row.id} className="rounded-xl border border-admin-border bg-admin-canvas px-4 py-3">
                <p className="flex flex-wrap items-center gap-2 text-[15px]">
                  <PackageCheck className="h-4 w-4 text-admin-accent" />
                  <span className="font-semibold">{row.orderNumber}</span>
                  <span className="opacity-70">{row.patient.name ?? row.patient.email}</span>
                  <span className="text-[13px] opacity-60">
                    Delivered · patient confirmed {day(row.deliveredAt)}
                  </span>
                </p>
                {completeButton(row)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ShipQueue;
