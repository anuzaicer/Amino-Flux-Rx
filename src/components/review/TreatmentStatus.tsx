import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Loader2, Package, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { myApprovals } from "@/lib/review.functions";

type Approval = {
  id: string;
  status: "pending" | "approved" | "denied";
  provider_note: string | null;
  decided_at: string | null;
  orders: {
    order_number: string;
    status: string;
    carrier: string | null;
    tracking_number: string | null;
    shipped_at: string | null;
  } | null;
};

/**
 * Step 6, patient side: the practitioner's decision on a controlled-substance
 * order and its delivery status.
 */
export function TreatmentStatus() {
  const load = useServerFn(myApprovals);
  const [rows, setRows] = useState<Approval[] | null>(null);

  useEffect(() => {
    void load()
      .then((r) => setRows(r.approvals as unknown as Approval[]))
      .catch(() => setRows([]));
  }, [load]);

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 text-[15px] opacity-65">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your treatment status…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-[15px] text-[color:var(--pd-deep)]/70">
        <p>
          No treatment requiring practitioner approval yet. Once your Quest results are in and you
          have reviewed them with a practitioner, your approved medication can be ordered here.
        </p>
        <Button asChild className="mt-4 bg-[color:var(--pd-brand)] text-white hover:opacity-90">
          <Link to="/how-it-works">See the 6 step process</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const order = row.orders;
        const shipped = order?.status === "fulfilled";
        const Icon =
          row.status === "approved"
            ? shipped
              ? Package
              : CheckCircle2
            : row.status === "denied"
              ? XCircle
              : Clock;
        return (
          <li key={row.id} className="rounded-xl border border-black/10 bg-white p-4">
            <div className="flex items-start gap-3">
              <Icon
                className={`mt-0.5 h-5 w-5 ${
                  row.status === "denied"
                    ? "text-red-600"
                    : row.status === "approved"
                      ? "text-[#4d7d21]"
                      : "opacity-60"
                }`}
              />
              <div className="min-w-0">
                <p className="text-[15px] font-bold">
                  {order?.order_number ?? "Your order"} ·{" "}
                  {row.status === "pending"
                    ? "Awaiting practitioner decision"
                    : row.status === "approved"
                      ? shipped
                        ? "Approved — shipped to your door"
                        : "Approved — preparing your shipment"
                      : "Not approved"}
                </p>
                {row.provider_note && (
                  <p className="mt-1 text-[15px] opacity-75">“{row.provider_note}”</p>
                )}
                {shipped && order?.tracking_number && (
                  <p className="mt-1 text-[15px] opacity-75">
                    {order.carrier ? `${order.carrier} · ` : ""}Tracking {order.tracking_number}
                  </p>
                )}
                {row.status === "pending" && (
                  <p className="mt-1 text-[15px] opacity-65">
                    Your practitioner reviews your labs on the call and records the decision here.
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default TreatmentStatus;
