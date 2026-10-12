import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markOrderPaid, pendingPaymentOrders, type PendingPaymentRow } from "@/lib/admin.functions";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const KIND_LABEL: Record<PendingPaymentRow["kind"], string> = {
  labs: "Lab panel",
  medication: "Medication",
  mixed: "Labs + medication",
};

/**
 * Manual payment bridge: no card processor is connected, so staff confirm that
 * money arrived outside the portal. Confirming never charges the patient.
 */
export function PaymentsQueue({ onChanged }: { onChanged?: () => void }) {
  const load = useServerFn(pendingPaymentOrders);
  const confirm = useServerFn(markOrderPaid);

  const [rows, setRows] = useState<PendingPaymentRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setRows(res.orders as PendingPaymentRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load payments.");
      setRows([]);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 text-[15px] opacity-65">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payments…
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h3 className="text-[17px] font-bold tracking-tight">Awaiting payment confirmation</h3>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[13px] font-bold text-amber-800">
          {rows.length}
        </span>
      </div>
      <p className="mb-5 text-[15px] text-admin-muted">
        Confirming payment records money collected outside the portal — it does not charge the
        patient. Lab orders unlock Quest setup; medication orders move to Ready to fulfill.
      </p>

      {error && <p className="mb-3 text-[15px] font-semibold text-red-600">{error}</p>}

      {rows.length === 0 ? (
        <p className="rounded-xl bg-admin-canvas px-4 py-6 text-center text-[15px] text-admin-muted">
          No orders are waiting on payment.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-col items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
            >
              <span className="font-semibold">{row.orderNumber}</span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[13px] font-semibold text-admin-muted">
                {KIND_LABEL[row.kind]}
              </span>
              <span className="min-w-0 break-words text-[15px] text-admin-muted">
                {row.patient.name ?? row.patient.email}
              </span>
              <span className="text-[15px] text-admin-muted">
                {row.items
                  .map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name))
                  .join(", ") || "Order"}
              </span>
              <span className="text-[13px] text-admin-muted">
                {money(row.totalCents)} · {new Date(row.createdAt).toLocaleDateString()}
              </span>
              <Button
                size="sm"
                disabled={busy === row.id}
                className="mt-1 w-full bg-admin-accent text-admin-accent-foreground hover:opacity-90 sm:ml-auto sm:mt-0 sm:w-auto"
                onClick={async () => {
                  setBusy(row.id);
                  setError(null);
                  try {
                    await confirm({ data: { orderId: row.id } });
                    await refresh();
                    onChanged?.();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not confirm that payment.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === row.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Mark payment received
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PaymentsQueue;
