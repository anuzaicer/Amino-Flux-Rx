import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Loader2,
  Plus,
  Video,
  Phone,
  Menu,
  Stethoscope,
  ClipboardCheck,
  FileText,
  FlaskConical,
  ExternalLink,
  Clock3,
  X,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatTime } from "@/components/scheduling/LabReviewScheduler";
import {
  addSlots,
  addStandardWeeks,
  myStaffRole,
  providerAgenda,
  removeSlot,
  setAppointmentOutcome,
} from "@/lib/scheduling.functions";

import { TreatmentReviewQueue } from "@/components/review/TreatmentReviewQueue";
import {
  appointmentLabFiles,
  setLabDocumentStatus,
  pendingLabDocuments,
  type PatientLabFile,
  type PendingLabRow,
} from "@/lib/review.functions";
import { ProviderSidebar, type ProviderTab } from "@/components/admin/ProviderSidebar";
import { MessagesInbox } from "@/components/admin/MessagesInbox";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () => ({
    meta: [
      { title: "Practitioner Portal — Amino Flux Rx" },
      {
        name: "description",
        content:
          "Publish weekly lab-review availability for Amino Flux Rx patients and manage booked Zoom or phone consultations and treatment approvals.",
      },
      { property: "og:title", content: "Practitioner Portal — Amino Flux Rx" },
      {
        property: "og:description",
        content: "Publish availability, manage booked lab reviews, and decide treatment approvals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProviderPage,
});

type AgendaSlot = {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  meeting_mode: string;
  status: string;
  provider_name: string;
  lab_appointments: {
    id: string;
    status: string;
    lab_source: string;
    patient_name: string | null;
    patient_phone: string | null;
    contact_preference: string;
    notes: string | null;
  } | null;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 15-minute blocks, 8:00 AM – 8:00 PM (matches the standard weekly schedule).
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const total = 8 * 60 + i * 15;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
});

const TIME_GROUPS = Array.from({ length: 12 }, (_, index) => {
  const hour = 8 + index;
  return {
    label: `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? "PM" : "AM"}`,
    times: TIME_OPTIONS.filter((time) => Number(time.slice(0, 2)) === hour),
  };
});

/** Opens the patient's uploaded lab panels for the booked review. */
/** Record how a booked visit went. "Didn't attend" emails the patient a
 *  rebooking link — nothing detects a no-show automatically. */
function AppointmentOutcome({ appointmentId }: { appointmentId: string }) {
  const record = useServerFn(setAppointmentOutcome);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = async (outcome: "completed" | "no_show") => {
    setBusy(outcome);
    setErr(null);
    try {
      await record({ data: { appointmentId, outcome } });
      setDone(outcome);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setBusy(null);
    }
  };

  if (done) {
    return (
      <p className="mt-3 text-[14px] font-semibold opacity-70">
        {done === "completed"
          ? "Marked as completed."
          : "Marked as missed — the patient has been emailed a rebooking link."}
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => set("completed")}
        disabled={busy !== null}
        className="bg-provider-accent text-provider-accent-foreground hover:bg-provider-deep"
      >
        {busy === "completed" ? "Saving…" : "Visit completed"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => set("no_show")}
        disabled={busy !== null}
        className="border-provider-border bg-provider-surface text-provider-ink hover:bg-provider-canvas"
      >
        {busy === "no_show" ? "Saving…" : "Patient didn't attend"}
      </Button>
      {err && <span className="text-[13px] text-red-600">{err}</span>}
    </div>
  );
}

function AppointmentLabFiles({ appointmentId }: { appointmentId: string }) {
  const load = useServerFn(appointmentLabFiles);
  const setStatus = useServerFn(setLabDocumentStatus);
  const [files, setFiles] = useState<PatientLabFile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const open = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await load({ data: { appointmentId } });
      setFiles(res.files as PatientLabFile[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load the lab files.");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (documentId: string, status: "verified" | "rejected") => {
    // A rejection has to tell the patient what was wrong with the file.
    let note: string | undefined;
    if (status === "rejected") {
      const reason = window.prompt("Why can't this file be used? The patient sees this message.");
      if (!reason?.trim()) return;
      note = reason.trim();
    }
    setStatusBusy(documentId);
    setErr(null);
    try {
      await setStatus({ data: { documentId, status, note } });
      setFiles((prev) =>
        prev ? prev.map((f) => (f.id === documentId ? { ...f, status } : f)) : prev,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update the lab status.");
    } finally {
      setStatusBusy(null);
    }
  };

  if (files === null) {
    return (
      <div className="mt-4 border-t border-provider-border pt-4">
        <Button
          type="button"
          size="sm"
          onClick={open}
          disabled={busy}
          className="bg-provider-deep text-provider-accent-foreground hover:bg-provider-accent"
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <FileText className="h-4 w-4" /> View lab panel
        </Button>
        {err && <p className="mt-2 text-[15px] font-semibold text-red-600">{err}</p>}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <p className="mt-3 text-[15px] opacity-65">This patient has not uploaded a lab panel yet.</p>
    );
  }

  return (
    <>
      {err && <p className="mt-2 text-[15px] font-semibold text-red-600">{err}</p>}
      <ul className="mt-4 divide-y divide-provider-border overflow-hidden rounded-lg border border-provider-border bg-provider-canvas/60">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 text-[13px]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-provider-accent-soft text-provider-accent">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-provider-ink">{f.fileName}</span>
              <span className="block text-[12px] text-provider-muted">
              {f.labSource === "purchased" ? "Purchased panel" : "Uploaded"} ·{" "}
              {new Date(f.createdAt).toLocaleDateString()}
              </span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                f.status === "verified"
                  ? "bg-provider-accent-soft text-provider-deep"
                  : f.status === "rejected"
                    ? "bg-red-500/10 text-red-600"
                    : "bg-provider-canvas text-provider-muted"
              }`}
            >
              {f.status.replace("_", " ")}
            </span>
            {f.url && (
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-provider-accent hover:text-provider-deep"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {f.status === "pending_review" && (
              <span className="flex w-full gap-2 sm:w-auto sm:justify-end">
                 <Button
                  type="button"
                  size="sm"
                  disabled={statusBusy === f.id}
                  onClick={() => void decide(f.id, "verified")}
                   className="flex-1 bg-provider-accent text-provider-accent-foreground hover:bg-provider-deep sm:flex-none"
                >
                  {statusBusy === f.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  Approve
                </Button>
                 <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={statusBusy === f.id}
                  onClick={() => void decide(f.id, "rejected")}
                   className="flex-1 border-provider-border bg-provider-surface text-provider-ink hover:bg-provider-canvas sm:flex-none"
                >
                  Reject
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Every uploaded lab panel awaiting a decision, even without a booked review. */
function PendingLabPanels() {
  const load = useServerFn(pendingLabDocuments);
  const setStatus = useServerFn(setLabDocumentStatus);
  const [rows, setRows] = useState<PendingLabRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setRows(res.files as PendingLabRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load pending lab panels.");
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const decide = async (documentId: string, status: "verified" | "rejected") => {
    let note: string | undefined;
    if (status === "rejected") {
      const reason = window.prompt("Why can't this file be used? The patient sees this message.");
      if (!reason?.trim()) return;
      note = reason.trim();
    }
    setBusy(documentId);
    setErr(null);
    try {
      await setStatus({ data: { documentId, status, note } });
      setRows((prev) => (prev ? prev.filter((r) => r.id !== documentId) : prev));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update the lab status.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-provider-accent">Review queue</p>
          <h2 className="mt-1 font-provider-display text-xl font-bold text-provider-ink">Pending lab panels</h2>
          <p className="mt-1 text-[13px] text-provider-muted">Review submitted files before the patient's consultation.</p>
        </div>
        {rows && rows.length > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase text-amber-700">
            {rows.length} {rows.length === 1 ? "review" : "reviews"} waiting
          </span>
        )}
      </div>
      {err && <p className="mt-3 text-[15px] font-semibold text-red-600">{err}</p>}
      {rows === null ? (
        <p className="flex items-center gap-2 rounded-lg border border-provider-border bg-provider-surface px-4 py-5 text-[13px] text-provider-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading lab panels…
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-provider-border bg-provider-surface px-5 py-8 text-center shadow-provider-soft">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-provider-accent-soft text-provider-accent"><ClipboardCheck className="h-5 w-5" /></span>
          <p className="mt-3 text-[14px] font-bold text-provider-ink">Queue clear</p>
          <p className="mt-1 text-[13px] text-provider-muted">No lab panels are waiting on a decision.</p>
        </div>
      ) : (
        <ul className="divide-y divide-provider-border overflow-hidden rounded-lg border border-provider-border bg-provider-surface shadow-provider-soft">
          {rows.map((f) => (
            <li
              key={f.id}
              className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-provider-canvas/50 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-bold text-provider-ink">{f.fileName}</span>
                  <span className="block truncate text-[12px] text-provider-muted">{f.patient.name ?? "Patient"} · {f.patient.email ?? "No email"}</span>
                </span>
              </span>
              <span className="text-[12px] text-provider-muted">
                <span className="block font-semibold text-provider-ink">{f.labSource === "purchased" ? "Purchased panel" : "Patient upload"}</span>
                {new Date(f.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex flex-wrap items-center gap-2 sm:justify-end">
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-provider-border bg-provider-surface px-3 text-[12px] font-bold text-provider-ink hover:bg-provider-canvas"
                >
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === f.id}
                  onClick={() => void decide(f.id, "verified")}
                  className="bg-provider-accent text-provider-accent-foreground hover:bg-provider-deep"
                >
                  {busy === f.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === f.id}
                  onClick={() => void decide(f.id, "rejected")}
                  className="border-provider-border bg-provider-surface text-provider-ink hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  Reject
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProviderPage() {
  const { user, loading } = useAuth();

  const checkRole = useServerFn(myStaffRole);
  const loadAgenda = useServerFn(providerAgenda);
  const publish = useServerFn(addSlots);
  const publishStandard = useServerFn(addStandardWeeks);
  const drop = useServerFn(removeSlot);

  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<ProviderTab>("availability");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [times, setTimes] = useState<string[]>([]);
  const [mode, setMode] = useState<"zoom" | "phone">("zoom");
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNote, setBulkNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void checkRole().then((r) => setIsStaff(r.isStaff));
  }, [user, checkRole]);

  const range = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 2, 0);
    return { from: iso(from), to: iso(to) };
  }, [month]);

  const refresh = useCallback(async () => {
    if (!isStaff) return;
    try {
      const res = await loadAgenda({ data: range });
      setSlots(res.slots as AgendaSlot[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the schedule.");
    }
  }, [isStaff, loadAgenda, range]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isStaff) return;
    const channel = supabase
      .channel("provider-slots-staff")
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_slots" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_appointments" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isStaff, refresh]);

  const dayKey = date ? iso(date) : null;
  const daySlots = slots.filter((s) => s.slot_date === dayKey);
  const booked = slots.filter((s) => s.status === "booked");

  const savePublish = async () => {
    if (!dayKey || times.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await publish({ data: { date: dayKey, times, meetingMode: mode, durationMinutes: 15 } });
      setTimes([]);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish those times.");
    } finally {
      setBusy(false);
    }
  };

  const fillStandard = async (weeks: number) => {
    setBulkBusy(true);
    setError(null);
    setBulkNote(null);
    try {
      const res = await publishStandard({ data: { weeks, meetingMode: mode } });
      setBulkNote(
        res.added > 0
          ? `Published ${res.added} standard 15-minute slots for the next ${weeks} weeks.`
          : "Those weeks are already published.",
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish the standard schedule.");
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading || isStaff === null) {
    return (
      <div className="grid min-h-screen place-items-center text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen text-foreground">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-6 py-28 text-center">
          <h1 className="font-display text-3xl font-semibold">Clinical staff only</h1>
          <p className="mt-3 text-white/75">
            This schedule portal is limited to licensed providers and administrators.
          </p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const stats = [
    {
      label: "Open slots",
      value: slots.filter((s) => s.status === "open").length,
      icon: CalendarDays,
      tone: "accent",
    },
    { label: "Booked reviews", value: booked.length, icon: Stethoscope, tone: "deep" },
    { label: "Published this view", value: slots.length, icon: ClipboardCheck, tone: "muted" },
  ];

  const availabilitySection = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-provider-border bg-provider-surface p-4 shadow-provider-soft">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold uppercase text-provider-muted">
                {s.label}
              </p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tone === "accent" ? "bg-provider-accent-soft text-provider-accent" : s.tone === "deep" ? "bg-provider-deep text-provider-accent-foreground" : "bg-muted text-provider-muted"}`}>
                <s.icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-provider-border bg-provider-surface shadow-provider-soft">
        <div className="grid md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="min-w-0 p-4 sm:p-6 md:border-r md:border-provider-border lg:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase text-provider-accent">Choose a date</p>
              <p className="mt-1 text-[13px] text-provider-muted">Select a day to manage its availability.</p>
            </div>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setTimes([]);
            }}
            month={month}
            onMonthChange={setMonth}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            modifiers={{
              hasAvailability: (d) => slots.some((slot) => slot.slot_date === iso(d)),
            }}
            modifiersClassNames={{
              hasAvailability:
                "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:h-1 [&>button]:after:w-1 [&>button]:after:rounded-full [&>button]:after:bg-provider-accent",
            }}
            className="pointer-events-auto mx-auto w-full bg-transparent p-0 text-provider-ink [--cell-size:2.25rem] sm:[--cell-size:2.55rem] lg:[--cell-size:3rem]"
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full gap-4",
              month_caption: "text-provider-ink",
               weekday:
                 "text-provider-muted flex-1 select-none rounded-md text-[0.7rem] font-bold uppercase",
               week: "mt-1.5 flex w-full",
              today: "rounded-md bg-provider-accent-soft text-provider-deep font-semibold",
              day: "group/day relative aspect-square h-full w-full select-none p-0 text-center text-provider-ink",
              day_button:
                "relative text-provider-ink hover:bg-provider-accent-soft data-[selected-single=true]:bg-provider-accent data-[selected-single=true]:text-provider-accent-foreground data-[selected-single=true]:after:bg-provider-accent-foreground",
              outside: "text-provider-muted opacity-30",
              disabled: "bg-provider-canvas text-provider-muted opacity-35",
            }}
          />
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-2.5 border-t border-provider-border pt-4 text-[12px] text-provider-muted lg:grid-cols-4">
            <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-provider-accent" />Has times</span>
            <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-provider-accent" />Selected</span>
            <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-provider-accent-soft" />Today</span>
            <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-provider-canvas" />Unavailable</span>
          </div>
        </div>

        <div className="min-w-0 border-t border-provider-border bg-provider-canvas/60 p-4 sm:p-5 md:col-span-2 md:row-start-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-provider-border pb-3">
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase text-provider-accent">Selected day</p>
              <h2 className="mt-1 truncate text-lg font-bold sm:text-xl">
                {date
                  ? date.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "Pick a date"}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-provider-accent-soft px-2.5 py-1 text-[12px] font-bold text-provider-deep">
              {daySlots.length} published
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <Label>Add 15-minute review slots</Label>
              {times.length > 0 && (
                <span className="text-[12px] font-semibold text-provider-accent">
                  {times.length} selected
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-y-3 md:grid-cols-2 md:gap-x-8">
              {TIME_GROUPS.map((group) => (
                <div
                  key={group.label}
                  className="grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3"
                >
                  <span className="text-[12px] font-semibold uppercase text-provider-muted">{group.label}</span>
                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
                    {group.times.map((t) => {
                      const existingSlot = daySlots.find((s) => s.start_time.slice(0, 5) === t);
                      const picked = times.includes(t);
                      const displayTime = formatTime(t).replace(/\s[AP]M$/, "");
                      return (
                        <Button
                          key={t}
                          variant="outline"
                          size="sm"
                          type="button"
                          disabled={existingSlot?.status === "booked"}
                          title={
                            existingSlot?.status === "booked"
                              ? `${formatTime(t)} — booked`
                              : existingSlot
                                ? `${formatTime(t)} — already published`
                                : `${formatTime(t)} — available`
                          }
                          onClick={async () => {
                            if (existingSlot?.status === "open") {
                              await drop({ data: { slotId: existingSlot.id } });
                              await refresh();
                              return;
                            }
                            setTimes((prev) =>
                              prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                            );
                          }}
                          className={`relative h-10 min-w-0 rounded-lg px-1 text-[12px] font-semibold shadow-none ${
                            existingSlot?.status === "booked"
                              ? "border-provider-accent/30 bg-provider-accent-soft text-provider-deep opacity-100"
                              : existingSlot
                                ? "border-provider-accent/40 bg-provider-accent-soft text-provider-deep opacity-100 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                : picked
                                  ? "border-provider-accent bg-provider-accent text-provider-accent-foreground hover:bg-provider-deep hover:text-provider-accent-foreground"
                                  : "border-provider-border bg-provider-surface text-provider-ink hover:border-provider-accent hover:bg-provider-accent-soft hover:text-provider-deep"
                          }`}
                        >
                          <span className="truncate">{displayTime}</span>
                          {existingSlot?.status === "booked" && (
                            <span className="ml-1 text-[9px] font-bold uppercase">Booked</span>
                          )}
                          {existingSlot?.status === "open" && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-provider-deep text-provider-accent-foreground ring-2 ring-provider-surface">
                              <X className="h-2.5 w-2.5" />
                              <span className="sr-only">Remove {formatTime(t)}</span>
                            </span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

             <div className="mt-4 grid grid-cols-2 gap-2 border-t border-provider-border pt-4 sm:flex sm:flex-wrap sm:items-center">
              {(
                [
                  { id: "zoom", label: "Zoom", icon: Video },
                  { id: "phone", label: "Phone", icon: Phone },
                ] as const
              ).map((o) => (
                <Button
                  key={o.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMode(o.id)}
                  className={`h-8 rounded-md px-3 text-[13px] font-semibold shadow-none ${
                    mode === o.id ? "border-provider-accent bg-provider-accent text-provider-accent-foreground hover:bg-provider-deep hover:text-provider-accent-foreground" : "border-provider-border bg-provider-surface text-provider-ink hover:bg-provider-accent-soft"
                  }`}
                >
                  <o.icon className="h-4 w-4" /> {o.label}
                </Button>
              ))}
              <Button
                onClick={savePublish}
                disabled={busy || times.length === 0}
                size="sm"
                 className="col-span-2 h-auto min-h-9 w-full whitespace-normal bg-provider-accent text-provider-accent-foreground hover:bg-provider-deep sm:ml-auto sm:w-auto"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Publish {times.length || ""} time{times.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>

        </div>
        <div className="border-t border-provider-border bg-provider-canvas/50 p-4 sm:p-6 md:col-start-2 md:row-start-1 md:border-t-0 lg:p-7">
        <div className="grid gap-5">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase text-provider-accent">Standard weekly schedule</p>
              <div className="mt-4 grid grid-cols-1 gap-2">
              {[
                ["Tuesday", "9:00 AM – 7:00 PM"],
                ["Saturday", "3:00 PM – 6:00 PM"],
                ["Sunday", "3:00 PM – 6:00 PM"],
              ].map(([day, hours]) => (
                 <div key={day} className="min-w-0 rounded-lg border border-provider-border bg-provider-surface px-2.5 py-3 shadow-provider-soft lg:px-3.5 lg:py-3.5">
                   <p className="truncate text-[12px] font-bold text-provider-ink lg:text-[13px]">{day}</p>
                    <p className="mt-1 text-[10px] leading-snug text-provider-muted lg:text-[12px]">{hours}</p>
                </div>
              ))}
            </div>
          </div>
           <div className="flex flex-wrap gap-2 border-t border-provider-border pt-5">
            <Button
              onClick={() => fillStandard(4)}
              disabled={bulkBusy}
              size="sm"
              className="bg-provider-accent text-provider-accent-foreground hover:bg-provider-deep"
            >
              {bulkBusy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Fill next 4 weeks
            </Button>
            <Button
              onClick={() => fillStandard(8)}
              disabled={bulkBusy}
              size="sm"
              variant="outline"
              className="border-provider-accent bg-provider-surface text-provider-deep shadow-none hover:bg-provider-accent-soft"
            >
              Fill next 8 weeks
            </Button>
          </div>
        </div>
         <p className="rounded-lg border border-provider-accent/15 bg-provider-accent-soft/50 p-3 text-[12px] leading-relaxed text-provider-muted">
          Published as 15-minute review slots. Already-published times are skipped, and you can add
          or remove individual times above for exceptions.
        </p>
        {bulkNote && <p className="mt-2 text-[13px] font-semibold text-provider-accent">{bulkNote}</p>}
        </div>
        </div>
      </section>
    </div>
  );

  const appointmentsSection = (
    <div className="space-y-8">
      <PendingLabPanels />
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-provider-accent">Clinical agenda</p>
            <h2 className="mt-1 font-provider-display text-xl font-bold text-provider-ink">Upcoming lab reviews</h2>
            <p className="mt-1 text-[13px] text-provider-muted">Open each patient's lab packet and record the visit outcome.</p>
          </div>
          {booked.length > 0 && <span className="text-[12px] font-bold text-provider-muted">{booked.length} booked</span>}
        </div>
        {booked.length === 0 ? (
          <div className="rounded-lg border border-provider-border bg-provider-surface px-5 py-8 text-center shadow-provider-soft">
            <CalendarDays className="mx-auto h-6 w-6 text-provider-accent" />
            <p className="mt-3 text-[14px] font-bold text-provider-ink">No booked consultations</p>
            <p className="mt-1 text-[13px] text-provider-muted">New patient bookings will appear here.</p>
          </div>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {booked.map((s) => {
              const appt = s.lab_appointments;
              return (
                <li key={s.id} className="group rounded-lg border border-provider-border bg-provider-surface p-5 shadow-provider-soft transition-colors hover:border-provider-accent/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-provider-accent-soft text-provider-accent"><FlaskConical className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="truncate font-provider-display text-[16px] font-bold text-provider-ink">{appt?.patient_name ?? "Patient"}</p>
                        <p className="mt-0.5 truncate text-[12px] text-provider-muted">{appt?.patient_phone ?? "No phone on file"}</p>
                      </div>
                    </div>
                    <span className="rounded-md bg-provider-canvas px-2 py-1 text-[10px] font-bold uppercase text-provider-muted">Booked</span>
                  </div>
                   <div className="mt-4 grid grid-cols-1 gap-3 border-y border-provider-border py-3 text-[12px] sm:grid-cols-2">
                    <span className="flex items-center gap-2 text-provider-muted"><CalendarDays className="h-4 w-4 text-provider-accent" /><span><b className="block text-provider-ink">{new Date(`${s.slot_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</b>{formatTime(s.start_time)}</span></span>
                    <span className="flex items-center gap-2 text-provider-muted"><Clock3 className="h-4 w-4 text-provider-accent" /><span><b className="block capitalize text-provider-ink">{appt?.contact_preference ?? s.meeting_mode}</b>{appt?.lab_source === "purchased" ? "Purchased panel" : "Patient upload"}</span></span>
                  </div>
                  {appt?.notes && <p className="mt-3 rounded-md bg-provider-canvas px-3 py-2 text-[12px] italic text-provider-muted">“{appt.notes}”</p>}
                  {appt?.id && <AppointmentLabFiles appointmentId={appt.id} />}
                  {appt?.id && appt.status === "scheduled" && (
                    <AppointmentOutcome appointmentId={appt.id} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );

  const approvalsSection = <TreatmentReviewQueue />;

  const PAGE: Record<ProviderTab, { title: string; subtitle: string; body: React.ReactNode }> = {
    availability: {
      title: "Availability",
      subtitle:
        "Publish your weekly lab-review availability. Claimed times disappear here and in every patient portal instantly.",
      body: availabilitySection,
    },
    appointments: {
      title: "Lab Reviews",
      subtitle: "Every booked Zoom or phone consultation in one list.",
      body: appointmentsSection,
    },
    approvals: {
      title: "Treatment Approvals",
      subtitle: "Approve or deny controlled substance orders after reviewing labs.",
      body: approvalsSection,
    },
    messages: {
      title: "Messages",
      subtitle: "Answer patient questions from their secure portal inbox.",
      body: <MessagesInbox />,
    },
  };

  const page = PAGE[activeTab];

  return (
    <div className="provider-portal flex min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-provider-canvas font-provider-body text-provider-ink">
      <ProviderSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

       <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-provider-border bg-provider-surface/95 px-4 py-3 backdrop-blur-xl sm:px-[26px] lg:min-h-20">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-provider-muted hover:bg-provider-canvas hover:text-provider-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate font-provider-display text-[17px] font-bold text-provider-ink sm:text-xl">
                {page.title}
              </h1>
              <p className="hidden max-w-2xl truncate text-[12px] text-provider-muted sm:block sm:text-[13px]">
                {page.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-56 truncate text-[13px] font-bold text-provider-ink">{user?.email ?? "Practitioner"}</p>
              <p className="text-[12px] text-provider-muted">Clinical provider</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-provider-deep text-[13px] font-bold text-provider-accent-foreground">
              {user?.email?.slice(0, 2).toUpperCase() ?? "PR"}
            </div>
          </div>
        </header>

         <div className="mx-auto w-full max-w-[1440px] space-y-5 px-3 py-4 sm:space-y-6 sm:px-[26px] sm:py-6">
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-[15px] text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}
          {page.body}
        </div>
      </main>
    </div>
  );
}
