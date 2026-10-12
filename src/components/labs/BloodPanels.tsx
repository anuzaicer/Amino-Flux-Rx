import { useMemo, useState } from "react";
import { ChevronDown, FlaskConical, MapPin, CalendarCheck, FileCheck2 } from "lucide-react";
import { LAB_PANELS, type LabPanel } from "@/data/labPanels";
import { useGender } from "@/components/gender/GenderContext";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

/** Maps a displayed panel to its purchasable catalog product id. */
const PANEL_PRODUCT_ID: Record<string, string> = {
  "thyroid-panel": "lab-thyroid-comprehensive",
  "urinalysis-reflex": "lab-urinalysis-reflex",
  "male-comprehensive": "lab-male-comprehensive",
  "male-comprehensive-hormones": "lab-male-comprehensive-plus-hormones",
  "male-trt-monitoring": "lab-male-trt-monitoring",
  "female-comprehensive": "lab-female-comprehensive",
  "female-comprehensive-hormones": "lab-female-comprehensive-plus-hormones",
  "female-hrt-baseline": "lab-female-hrt-baseline",
  "womens-hrt-monitoring": "lab-womens-hrt-monitoring",
  "female-fertility": "lab-female-fertility",
};

function PanelCard({
  panel,
  accent,
  audienceLabel,
}: {
  panel: LabPanel;
  accent: string;
  audienceLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const count = panel.markers.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] sm:rounded-3xl">
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.3em]"
          style={{ color: accent }}
        >
          {audienceLabel}
        </span>
        <h3 className="mt-2 font-display text-lg font-bold text-[#0F1E33]">{panel.name}</h3>
        <p className="mt-1.5 text-sm text-[#0F1E33]/70">{panel.summary}</p>
        <p className="mt-3 text-xs text-[#0F1E33]/60">
          <span className="font-semibold text-[#0F1E33]/80">Best for:</span> {panel.usedFor}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-base font-bold text-[#0F1E33]">{panel.price}</span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ backgroundColor: `${accent}1A`, color: accent }}
          >
            <FlaskConical className="h-3 w-3" /> {count} biomarkers
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-4 inline-flex items-center justify-between gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-[#0F1E33] transition hover:bg-black/5"
        >
          {open ? "Hide biomarkers" : "See every biomarker tested"}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="mt-4 space-y-4 border-t border-black/5 pt-4">
            {panel.markers.map((g) => (
              <div key={g.group}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0F1E33]/80">
                  {g.group}
                </p>
                <ul className="mt-2 grid gap-1">
                  {g.items.map((m) => (
                    <li key={m} className="flex items-start gap-2 text-xs text-[#0F1E33]/70">
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: accent }}
                      />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {PANEL_PRODUCT_ID[panel.id] ? (
          <AddToCartButton
            productId={PANEL_PRODUCT_ID[panel.id]!}
            accent={accent}
            className="mt-5 w-full"
          />
        ) : (
          <a
            href="/labs"
            className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Purchase this panel
          </a>
        )}
      </div>
    </div>
  );
}

export function BloodPanels() {
  const { theme } = useGender();
  const accent = theme === "women" ? "#5C9330" : "#2173D1";

  // One list, scoped to the active care path. Panels shared by men and women
  // are the same panel record — they simply present under the current path.
  const pathLabel = theme === "women" ? "Women's panels" : "Men's panels";
  const items = useMemo(
    () => LAB_PANELS.filter((p) => p.audience === theme || p.audience === "both"),
    [theme],
  );

  return (
    <section
      id="blood-panels"
      className="relative z-10 mx-auto max-w-7xl scroll-mt-28 px-4 pb-14 sm:px-6 sm:pb-16"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
        Blood panels
      </span>
      <h2 className="mt-3 max-w-3xl font-display text-2xl font-semibold md:text-3xl">
        Every blood panel and the biomarkers it measures
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-clinical-copy">
        These are the panels available for your care path. Open any card to see the exact biomarkers
        included before you buy.
      </p>

      <div className="mt-8">
        <h3 className="font-display text-xl font-semibold">{pathLabel}</h3>
        <p className="mt-1 text-xs text-clinical-copy">{items.length} panels</p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PanelCard key={p.id} panel={p} accent={accent} audienceLabel={pathLabel} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function QuestNotice() {
  const { theme } = useGender();
  const accent = theme === "women" ? "#5C9330" : "#2173D1";

  const steps = [
    {
      icon: FileCheck2,
      t: "Purchase your panel",
      d: "Buy the panel here. We send your lab order electronically, no doctor visit needed first.",
    },
    {
      icon: CalendarCheck,
      t: "Book your Quest appointment",
      d: "Schedule a blood draw at Quest Diagnostics using the confirmation link in your email.",
    },
    {
      icon: MapPin,
      t: "Visit your Quest location",
      d: "Bring a photo ID and your lab order. The draw takes about 15 minutes.",
    },
  ];

  return (
    <section
      id="quest"
      className="relative z-10 mx-auto max-w-7xl scroll-mt-28 px-4 pb-14 sm:px-6 sm:pb-16"
    >
      <div className="overflow-hidden rounded-2xl border border-clinical-border bg-clinical-tint p-4 sm:rounded-3xl sm:p-8">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.3em]"
          style={{ color: accent }}
        >
          Where you get tested
        </span>
        <h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
          All blood draws are done at Quest Diagnostics
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-clinical-copy">
          After you purchase a lab panel, you must book an appointment with Quest Diagnostics to
          have your blood drawn. Walk-ins are not guaranteed, so schedule ahead. Results are sent
          back to your provider, usually in 2 to 5 days.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.t}
              className="relative rounded-xl border border-clinical-border bg-white p-4 text-left text-clinical-ink shadow-sm sm:rounded-2xl sm:p-6"
            >
              <span className="absolute right-4 top-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#0F1E33]/40">
                0{i + 1}
              </span>
              <s.icon className="h-6 w-6" style={{ color: accent }} />
              <h3 className="mt-4 font-display text-base font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-[#0F1E33]/70">{s.d}</p>
            </div>
          ))}
        </div>

        <a
          href="https://appointment.questdiagnostics.com/schedule-appointment"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-center text-sm font-semibold text-white transition hover:brightness-110 sm:mt-8 sm:w-auto sm:px-6"
          style={{ backgroundColor: accent }}
        >
          Book Quest for Your Blood Work
        </a>
        <p className="mt-3 text-xs text-clinical-copy">
          Purchase your panel first — you will need your Amino Flux Rx lab order number when
          booking, then get your blood work done.
        </p>
      </div>
    </section>
  );
}
