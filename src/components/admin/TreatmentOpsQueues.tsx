import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { reviewQueue, type ReviewQueueRow, type UpcomingReviewRow } from "@/lib/review.functions";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "");

/**
 * Read-only admin view of the practitioner workflow. Decisions stay with
 * practitioners in /provider — admins only need visibility here.
 */
export function TreatmentOpsQueues() {
  const load = useServerFn(reviewQueue);
  const [rows, setRows] = useState<ReviewQueueRow[] | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setRows(res.queue as ReviewQueueRow[]);
      setUpcoming((res as { upcoming?: UpcomingReviewRow[] }).upcoming ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load treatment operations.");
      setRows([]);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 text-[15px] opacity-65">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading treatment operations…
      </p>
    );
  }

  const pending = rows.filter((r) => r.status === "pending");
  const moreInfo = rows.filter((r) => r.status === "more_info");
  const approvedAwaitingPurchase = rows.filter((r) => r.status === "approved" && !r.orderId);
  const denied = rows.filter((r) => r.status === "denied");

  const groups = [
    {
      key: "pending",
      title: "Waiting for practitioner",
      note: "A decision is needed before the patient can order.",
      rows: pending,
      empty: "No treatment requests are waiting on a decision.",
      tone: "border-amber-200 bg-amber-50/60",
    },
    {
      key: "more_info",
      title: "More information requested",
      note: "Waiting on the patient to reply in their portal.",
      rows: moreInfo,
      empty: "Nothing is waiting on a patient reply.",
      tone: "border-admin-accent/25 bg-admin-accent-soft/50",
    },
    {
      key: "approved",
      title: "Approved — awaiting medication purchase",
      note: "Cleared by a practitioner; the patient has not placed the order yet.",
      rows: approvedAwaitingPurchase,
      empty: "Every approval has been turned into an order.",
      tone: "border-admin-accent/25 bg-admin-accent-soft/50",
    },
    {
      key: "denied",
      title: "Denied (reference)",
      note: "History only — no action needed.",
      rows: denied,
      empty: "No denials on record.",
      tone: "border-black/10 bg-admin-canvas",
    },
  ] as const;

  return (
    <div className="space-y-8">
      {error && <p className="text-[15px] font-semibold text-red-600">{error}</p>}

      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-3 flex flex-wrap items-baseline gap-2">
            <h3 className="text-[17px] font-bold tracking-tight">{group.title}</h3>
            <span className="rounded-full bg-admin-accent-soft px-2.5 py-0.5 text-[13px] font-bold text-admin-accent">
              {group.rows.length}
            </span>
            <span className="text-[13px] opacity-60">{group.note}</span>
          </div>
          {group.rows.length === 0 ? (
            <p className="rounded-xl bg-admin-canvas px-4 py-5 text-center text-[15px] opacity-60">
              {group.empty}
            </p>
          ) : (
            <ul className="space-y-2">
              {group.rows.slice(0, 25).map((row) => (
                <li key={row.id} className={`rounded-xl border px-4 py-3 ${group.tone}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[15px] font-bold">{row.patient.name ?? "Patient"}</span>
                    <span className="text-[13px] opacity-60">{row.patient.email}</span>
                    <span className="w-full text-[13px] font-semibold opacity-70 sm:ml-auto sm:w-auto">
                      {row.orderId
                        ? `${row.orderNumber} · ${money(row.totalCents)}`
                        : "Pre-purchase eligibility"}
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] opacity-75">
                    {row.items.length
                      ? row.items
                          .map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name))
                          .join(", ")
                      : (row.productName ?? "Treatment request")}
                  </p>
                   <p className="mt-1 break-words text-[13px] opacity-60">
                    Intake {row.prerequisites.intake ? "✓" : "✗"} · Photo ID{" "}
                    {row.prerequisites.photoId ? "✓" : "✗"} · Consents{" "}
                    {row.prerequisites.consents ? "✓" : "✗"} · Labs{" "}
                    {row.prerequisites.labsVerified ? "✓" : "✗"} ·{" "}
                    {row.status === "pending" ? "Requested" : "Updated"}{" "}
                    {day(row.decided_at ?? row.created_at)}
                  </p>
                  {row.provider_note && (
                    <p className="mt-1 text-[13px] opacity-70">Note: “{row.provider_note}”</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h3 className="text-[17px] font-bold tracking-tight">Consultations booked</h3>
          <span className="rounded-full bg-admin-accent-soft px-2.5 py-0.5 text-[13px] font-bold text-admin-accent">
            {upcoming.length}
          </span>
          <span className="text-[13px] opacity-60">visits scheduled, no decision yet</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-xl bg-admin-canvas px-4 py-5 text-center text-[15px] opacity-60">
            No consultations on the books.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((row) => (
              <li
                key={row.userId}
                className="rounded-xl border border-black/10 bg-admin-canvas px-4 py-3 text-[15px]"
              >
                <span className="font-bold">{row.patient.name ?? "Patient"}</span>{" "}
                <span className="opacity-60">{row.patient.email}</span>
                {row.appointment && (
                  <span className="block text-[13px] opacity-70">
                    {row.appointmentType === "treatment_approval"
                      ? "Treatment review"
                      : "Lab review"}{" "}
                    {new Date(`${row.appointment.date}T00:00:00`).toLocaleDateString()} ·{" "}
                    {row.appointment.start.slice(0, 5)} · {row.appointment.mode} with{" "}
                    {row.appointment.providerName}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default TreatmentOpsQueues;
