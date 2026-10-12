import { useState } from "react";
import { Upload, Video, Package, HelpCircle } from "lucide-react";
import { SIX_STEPS } from "@/components/process/SixStepProcess";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  accent: string;
  requiresLabs: boolean;
  requiresTelehealth: boolean;
};

/**
 * "How to purchase this medication" explainer — surfaces the lab → provider
 * review → telehealth → purchase sequence before the patient checks out.
 */
export function HowToPurchase({ accent, requiresLabs, requiresTelehealth }: Props) {
  const [open, setOpen] = useState(false);

  const sixStep = SIX_STEPS.map((s) => ({ icon: s.icon, title: s.title, text: s.text }));

  const steps = requiresLabs
    ? sixStep
    : ([
        requiresTelehealth && {
          icon: Video,
          title: "Book your telehealth visit",
          text: "Select a slot and meet with a licensed clinician for your treatment-approval visit.",
        },
        {
          icon: Package,
          title: "Purchase & ship",
          text: "Once approved, your medication is dispensed by a licensed pharmacy and shipped discreetly to your door.",
        },
      ].filter(Boolean) as { icon: typeof Upload; title: string; text: string }[]);

  const requirement = requiresLabs
    ? "This medication requires a clinician-approved lab review before purchase — here is the 6 step process."
    : "This medication requires clinician approval before purchase.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-[15px] font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <HelpCircle className="h-4 w-4" /> How to purchase this medication
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#0F1E33]/95 p-0 text-white backdrop-blur-xl">
        <div className="p-6 pb-5">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="font-display text-xl font-semibold tracking-tight text-white">
              How to purchase this medication
            </DialogTitle>
            <p
              className="font-mono text-[15px] uppercase tracking-[0.18em]"
              style={{ color: accent }}
            >
              Prescription therapy — how to purchase
            </p>
            <p className="text-[15px] leading-relaxed text-white/80">{requirement}</p>
          </DialogHeader>

          <ol className="mt-6 space-y-5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span
                  className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                    <s.icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
                    {s.title}
                  </h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-white/75">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full py-3.5 text-base font-semibold text-white transition hover:brightness-110"
          style={{ backgroundColor: accent }}
        >
          Got it
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default HowToPurchase;
