import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload,
  ShoppingCart,
  Loader2,
  FlaskConical,
  CheckCircle2,
  CalendarClock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabReviewScheduler, formatTime } from "@/components/scheduling/LabReviewScheduler";
import { myLabDocuments, uploadLabResults } from "@/lib/purchase.functions";
import { cancelAppointment, myAppointments } from "@/lib/scheduling.functions";

type LabDoc = {
  id: string;
  file_name: string;
  status: string;
  lab_source: string | null;
  created_at: string;
};

type Appt = {
  id: string;
  status: string;
  lab_source: string;
  contact_preference: string;
  notes: string | null;
  provider_slots: {
    slot_date: string;
    start_time: string;
    end_time: string;
    provider_name: string;
    meeting_mode: string;
  } | null;
};

/**
 * The complete lab path for a patient: upload existing labs OR purchase a panel,
 * then book the mandatory nurse-practitioner review call.
 */
export function LabReviewFlow({
  defaultName,
  defaultPhone,
}: {
  defaultName?: string;
  defaultPhone?: string;
}) {
  const runUpload = useServerFn(uploadLabResults);
  const loadDocs = useServerFn(myLabDocuments);
  const loadAppts = useServerFn(myAppointments);
  const runCancel = useServerFn(cancelAppointment);

  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<LabDoc[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);

  const refresh = async () => {
    const [d, a] = await Promise.all([loadDocs(), loadAppts()]);
    setDocs(d.documents as LabDoc[]);
    setAppts(a.appointments as unknown as Appt[]);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = appts.filter((a) => a.status === "scheduled");

  const onFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      buf.forEach((b) => (binary += String.fromCharCode(b)));
      await runUpload({
        data: {
          fileName: file.name,
          contentType: file.type || "application/pdf",
          dataBase64: btoa(binary),
        },
      });
      await refresh();
      setShowScheduler(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1 — two paths */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--pd-brand,#2173D1)]/10 text-[color:var(--pd-brand,#2173D1)]">
            <Upload className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[15px] font-bold">Option 1 — Upload your labs</p>
          <p className="mt-1 text-[15px] opacity-70">
            Already have blood work from the last 6 months? Upload the PDF or photo and book your
            review call.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-4 bg-[color:var(--pd-brand,#2173D1)] text-white hover:opacity-90"
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload lab results
          </Button>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--pd-brand,#2173D1)]/10 text-[color:var(--pd-brand,#2173D1)]">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[15px] font-bold">Option 2 — Purchase a lab panel</p>
          <p className="mt-1 text-[15px] opacity-70">
            Your purchased panel is uploaded to this portal within 12 hours. Then schedule your
            blood draw at a Quest Diagnostics location near you.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/lab-testing">Browse lab panels</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-[#FAFBFC] p-4 text-[15px]">
        <p className="flex items-center gap-2 font-bold">
          <MapPin className="h-4 w-4" /> Both options end the same way
        </p>
        <p className="mt-1 opacity-75">
          Every lab panel — uploaded or purchased — must be reviewed by our nurse practitioner on a
          Zoom or phone call before a prescription can be issued.
        </p>
      </div>

      {/* Uploaded / delivered panels */}
      {docs.length > 0 && (
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <p className="text-[15px] font-bold">Your lab files</p>
          <ul className="mt-3 space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-black/5 bg-[#FAFBFC] px-3 py-2 text-[15px]"
              >
                <FlaskConical className="h-4 w-4 opacity-60" />
                <span className="font-semibold">{d.file_name}</span>
                <span className="opacity-60">
                  {d.lab_source === "purchased" ? "Purchased panel" : "Uploaded"} ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
                <span className="ml-auto rounded-full bg-black/5 px-2.5 py-0.5 font-semibold opacity-75">
                  {d.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upcoming reviews */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-[color:var(--pd-brand,#2173D1)]/25 bg-[color:var(--pd-brand,#2173D1)]/5 p-5">
          <p className="flex items-center gap-2 text-[15px] font-bold">
            <CheckCircle2 className="h-4 w-4" /> Your lab review appointment
          </p>
          {upcoming.map((a) => (
            <div key={a.id} className="mt-3 flex flex-wrap items-center gap-3 text-[15px]">
              <span className="font-semibold">
                {a.provider_slots
                  ? `${new Date(`${a.provider_slots.slot_date}T00:00:00`).toLocaleDateString(
                      undefined,
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      },
                    )} at ${formatTime(a.provider_slots.start_time)}`
                  : "Scheduled"}
              </span>
              <span className="opacity-70">
                with {a.provider_slots?.provider_name ?? "your provider"} · {a.contact_preference}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await runCancel({ data: { appointmentId: a.id } });
                  await refresh();
                }}
                className="ml-auto text-[15px] font-semibold text-red-600"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Step 2 — book the review */}
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <p className="flex items-center gap-2 text-[15px] font-bold">
          <CalendarClock className="h-4 w-4" /> Schedule your lab review with the nurse practitioner
        </p>
        <p className="mt-1 text-[15px] opacity-70">
          Pick a date, then choose from the times the provider has open. Booked times disappear for
          everyone instantly.
        </p>
        {showScheduler || upcoming.length === 0 ? (
          <div className="mt-5">
            <LabReviewScheduler
              labSource={docs.some((d) => d.lab_source === "purchased") ? "purchased" : "uploaded"}
              defaultName={defaultName}
              defaultPhone={defaultPhone}
              onBooked={refresh}
            />
          </div>
        ) : (
          <Button variant="outline" className="mt-4" onClick={() => setShowScheduler(true)}>
            Book another review
          </Button>
        )}
      </div>

      {error && <p className="text-[15px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}

export default LabReviewFlow;
