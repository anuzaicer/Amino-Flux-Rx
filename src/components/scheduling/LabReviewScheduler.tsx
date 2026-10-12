import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { DayButton } from "react-day-picker";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { bookSlot, listOpenSlots } from "@/lib/scheduling.functions";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  provider_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  meeting_mode: string;
  status: string;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function ConsultationDayButton({
  className,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const disabled = Boolean(modifiers.disabled);
  const selected = Boolean(modifiers.selected);
  const today = Boolean(modifiers.today);

  return (
    <CalendarDayButton
      {...props}
      modifiers={modifiers}
      className={cn(
        "rounded-md font-medium transition-colors",
        !disabled &&
          !selected &&
          "[background-color:color-mix(in_oklab,var(--pd-brand,#2173D1)_9%,transparent)] text-slate-800 hover:[background-color:color-mix(in_oklab,var(--pd-brand,#2173D1)_16%,transparent)]",
        today &&
          !disabled &&
          !selected &&
          "ring-1 ring-inset ring-[color:var(--pd-brand,#2173D1)]",
        disabled &&
          "cursor-not-allowed bg-transparent text-slate-400 opacity-100 hover:bg-transparent hover:text-slate-400",
        selected &&
          "data-[selected-single=true]:!bg-[color:var(--pd-brand,#2173D1)] data-[selected-single=true]:!text-primary-foreground font-bold shadow-sm",
        className,
      )}
    />
  );
}

type Props = {
  /** Where the labs came from — shown to the provider before the review call. */
  labSource: "uploaded" | "purchased";
  defaultName?: string;
  defaultPhone?: string;
  onBooked?: () => void;
  /** Tag prepended to the note so staff can tell visit types apart. */
  notePrefix?: string;
  /** Headline shown after a successful booking. */
  confirmTitle?: string;
  /** Treatment this visit belongs to — each treatment needs its own visit. */
  forProductId?: string;
  /** What kind of visit this is, stored on the appointment for staff queues. */
  appointmentType?: "lab_review" | "treatment_approval" | "initial_consult" | "follow_up";
};

/**
 * Patient-facing lab review booking: pick a date, see the nurse practitioner's
 * open times for that day, and claim one. Claimed times vanish from every
 * portal in realtime.
 */
export function LabReviewScheduler({
  labSource,
  defaultName,
  defaultPhone,
  onBooked,
  notePrefix,
  confirmTitle,
  appointmentType,
  forProductId,
}: Props) {
  const load = useServerFn(listOpenSlots);
  const book = useServerFn(bookSlot);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<Date>(new Date());
  const [date, setDate] = useState<Date | undefined>();
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<"date" | "time">("date");
  const name = defaultName ?? "";
  const phone = defaultPhone ?? "";
  const mode = "zoom" as const;
  const notes = "";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Slot | null>(null);

  const range = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 3, 0);
    return { from: iso(from), to: iso(to) };
  }, [month]);

  const refresh = useCallback(async () => {
    try {
      const res = await load({ data: range });
      setSlots(res.slots as Slot[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load availability.");
    } finally {
      setLoading(false);
    }
  }, [load, range]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  // Live sync: when Nicole edits her schedule or another patient books, update.
  useEffect(() => {
    const channel = supabase
      .channel("provider-slots-patient")
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_slots" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const daysWithSlots = useMemo(() => new Set(slots.map((s) => s.slot_date)), [slots]);
  const dayKey = date ? iso(date) : null;
  const dayySlots = useMemo(() => slots.filter((s) => s.slot_date === dayKey), [slots, dayKey]);

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await book({
        data: {
          slotId: selected,
          labSource,
          patientName: name || undefined,
          patientPhone: phone || undefined,
          contactPreference: mode,
          notes: [notePrefix, notes].filter(Boolean).join(" ") || undefined,
          appointmentType,
          forProductId,
        },
      });
      setConfirmed(slots.find((s) => s.id === res.slot.id) ?? null);
      setSelected(null);
      await refresh();
      onBooked?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book that time.");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const brand = "var(--pd-brand,#2173D1)";

  if (confirmed) {
    return (
      <div
        className="rounded-xl border p-5 text-center"
        style={{
          borderColor: `color-mix(in oklab, ${brand} 28%, transparent)`,
          background: `color-mix(in oklab, ${brand} 5%, white)`,
        }}
      >
        <CheckCircle2 className="mx-auto h-9 w-9" style={{ color: brand }} />
        <p className="mt-2 text-[15px] font-bold text-[#0F1E33]">
          {confirmTitle ?? "Lab review scheduled"}
        </p>
        <p className="mt-1 text-[14px] text-slate-600">
          {new Date(`${confirmed.slot_date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}{" "}
          at {formatTime(confirmed.start_time)} with {confirmed.provider_name}
        </p>
        <p className="mt-1.5 text-[13px] text-slate-500">
          You'll get {mode === "zoom" ? "a Zoom link" : "a call"} at your appointment time.
          This slot is now removed from the provider schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="box-border w-full max-w-full min-w-0 overflow-x-hidden text-slate-900">
      <div className={cn("box-border w-full max-w-full min-w-0", step !== "date" && "hidden")}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setSelected(null);
          }}
          month={month}
          onMonthChange={setMonth}
          disabled={(d) =>
            d < new Date(new Date().setHours(0, 0, 0, 0)) || !daysWithSlots.has(iso(d))
          }
          components={{ DayButton: ConsultationDayButton }}
          classNames={{
            root: "w-full",
            months: "relative w-full",
            month: "flex w-full flex-col gap-1.5",
            month_caption:
              "pointer-events-none flex h-10 w-full min-w-0 items-center justify-center px-10",
            nav: "absolute inset-x-0 top-0 flex h-10 w-full items-center justify-between",
            button_previous:
              "h-10 w-10 rounded-md text-slate-500 hover:bg-slate-100",
            button_next:
              "h-10 w-10 rounded-md text-slate-500 hover:bg-slate-100",
            caption_label: "truncate text-[14px] font-semibold text-slate-900",
            table: "w-full table-fixed border-collapse",
            weekdays: "table-row w-full",
            weekday:
              "h-8 w-[14.285%] min-w-0 text-center align-middle text-[12px] font-medium text-slate-500",
            week: "table-row w-full",
            day: "h-10 w-[14.285%] min-w-0 p-0 text-center align-middle",
            today: "bg-transparent text-inherit",
            disabled: "text-slate-400 opacity-100",
            outside: "text-slate-400",
          }}
          className="pointer-events-auto box-border w-full max-w-full bg-transparent p-0 text-slate-900 [--cell-size:2.5rem] [&_[data-slot=calendar]]:max-w-full [&_button[data-day]]:mx-auto [&_button[data-day]]:aspect-square [&_button[data-day]]:h-auto [&_button[data-day]]:max-h-10 [&_button[data-day]]:w-full [&_button[data-day]]:max-w-10 [&_button[data-day]]:min-w-0"
        />
        {!date && (
          <p className="mt-2 text-[13px] leading-snug text-slate-500">
            {loading
              ? "Loading available dates…"
              : "Select an available date to view appointment times."}
          </p>
        )}
      </div>

      <div className="box-border w-full max-w-full min-w-0">
        {step === "time" && !loading && date && (
          <div className="box-border w-full max-w-full animate-in fade-in slide-in-from-bottom-1 duration-200">
            <button
              type="button"
              onClick={() => {
                setStep("date");
                setSelected(null);
              }}
              className="mb-2 text-[13px] font-semibold text-slate-500 hover:text-slate-700"
            >
              ← Change date
            </button>
            <p className="text-[16px] font-semibold leading-snug text-slate-800">
              {date.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="mt-1 text-[14px] font-semibold text-slate-600">Available times</p>
            {dayySlots.length === 0 ? (
              <p className="mt-2 text-[14px] leading-snug text-slate-500">
                No appointment times are available for this date. Please choose another date.
              </p>
            ) : (
              <div className="mt-2 grid w-full max-w-full grid-cols-2 gap-2.5 sm:grid-cols-3">
                {dayySlots.map((s) => (
                  <Button
                    key={s.id}
                    type="button"
                    variant="outline"
                    onClick={() => setSelected(s.id)}
                    className={`h-9 w-full min-w-0 rounded-md px-2 text-[13px] font-semibold transition-colors ${
                      selected === s.id
                        ? "border-transparent !bg-[color:var(--pd-brand,#2173D1)] !text-primary-foreground shadow-sm hover:opacity-90"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {formatTime(s.start_time)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-[14px] font-semibold text-red-600">{error}</p>}

        <Button
          onClick={() => {
            if (step === "date") {
              setStep("time");
              return;
            }
            void submit();
          }}
          disabled={step === "date" ? !date : !selected || saving}
          className="mt-4 h-10 w-full text-[14px] font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: brand }}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Next
        </Button>
      </div>
    </div>
  );
}

export default LabReviewScheduler;
