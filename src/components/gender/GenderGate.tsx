import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mars, Venus, X } from "lucide-react";
import heroPortraitMen from "@/assets/hero-portrait-men.jpg";
import heroPortraitWomen from "@/assets/hero-portrait.jpg";
import logoAsset from "@/assets/amino-flux-logo-transparent.png.asset.json";
import { useGender, type Gender } from "./GenderContext";

const OPTIONS: {
  id: Gender;
  label: string;
  icon: typeof Mars;
  bg: string;
  ring: string;
  tint: string;
  blurb: string;
  photo: string;
}[] = [
  {
    id: "men",
    label: "Men",
    icon: Mars,
    bg: "bg-gate-men",
    ring: "ring-gate-men",
    tint: "bg-gate-men/70",
    blurb: "Testosterone, energy, weight, heart health, hair and skin.",
    photo: heroPortraitMen,
  },
  {
    id: "women",
    label: "Women",
    icon: Venus,
    bg: "bg-gate-women",
    ring: "ring-gate-women",
    tint: "bg-gate-women/70",
    blurb: "Hormone balance, weight, energy, skin and lab testing.",
    photo: heroPortraitWomen,
  },
];

/**
 * First-visit chooser: picking Men or Women personalizes products and labs.
 */
export function GenderGate() {
  const { gender, hydrated, setGender, gateOpen, closeGate } = useGender();
  const open = hydrated && (gender === null || gateOpen);
  const dismissible = gender !== null;

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeGate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, closeGate]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-deep/70 px-3 py-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="What would you like help with?"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="gate-neumo-panel relative max-h-[calc(100svh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl p-4 text-gate-ink sm:rounded-3xl sm:p-6 md:p-8"
          >
            {dismissible && (
              <button
                type="button"
                onClick={closeGate}
                aria-label="Close and keep my current selection"
                className="gate-neumo-raised absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-gate-muted transition active:translate-y-px active:shadow-inner hover:text-gate-ink sm:right-5 sm:top-5 sm:h-11 sm:w-11"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <span className="gate-neumo-raised grid h-10 w-10 place-items-center rounded-xl p-1">
                <img
                  src={logoAsset.url}
                  alt="Amino Flux Rx"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="font-mono text-[12px] uppercase tracking-[0.28em]">
                <span className="text-primary">Welcome to</span>{" "}
                <span className="text-deep">Amino Flux</span>{" "}
                <span className="text-primary">Rx</span>
              </span>
            </div>

            <h2 className="mt-4 font-display text-xl font-semibold text-deep md:text-2xl">
              What would you like help with?
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-gate-muted">
              Pick the option that fits you and we&apos;ll show the products and lab panels made for
              you. You can change it any time with the Men / Women switch at the top.
            </p>

            <div className="mt-4 grid gap-3 min-[390px]:grid-cols-2 sm:mt-5 sm:gap-4">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setGender(o.id)}
                  aria-pressed={gender === o.id}
                  className={`gate-neumo-choice group relative flex h-40 flex-col justify-end overflow-hidden rounded-2xl border-[6px] border-gate-surface text-left text-primary-foreground transition hover:-translate-y-0.5 sm:h-48 ${o.bg} ${
                    gender === o.id ? `ring-3 ${o.ring} ring-offset-4 ring-offset-gate-surface` : ""
                  }`}
                >
                  <img
                    src={o.photo}
                    alt={`${o.label}'s care`}
                    className="absolute inset-0 h-full w-full object-cover object-top opacity-90 transition duration-700 group-hover:scale-105"
                    loading="eager"
                  />
                  <span className={`absolute inset-0 ${o.tint}`} />
                  <span className="absolute inset-0 bg-gradient-to-t from-deep/80 via-transparent to-transparent" />
                  <span className="relative z-10 p-4">
                    <span className="gate-neumo-inset inline-flex h-9 w-9 items-center justify-center rounded-full bg-gate-ink/35 text-black">
                      <o.icon className="h-4 w-4" />
                    </span>
                    <span className="mt-2 block font-display text-base font-semibold uppercase tracking-[0.18em]">
                      {o.label}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-primary-foreground/90">
                      {o.blurb}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {dismissible && (
              <button
                type="button"
                onClick={closeGate}
                className="mt-5 text-[13px] font-semibold text-deep underline underline-offset-4"
              >
                Keep my current selection
              </button>
            )}
            <p className="mt-5 text-[12px] text-gate-muted">
              Amino Flux Rx connects you with licensed providers. Lab testing may be required before
              treatment.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GenderGate;
