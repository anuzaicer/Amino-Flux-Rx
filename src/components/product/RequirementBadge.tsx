import { FlaskConical, ShoppingBag, Stethoscope } from "lucide-react";

export type RequirementKey = "direct" | "lab" | "lab_provider" | "provider";

export type Requirement = {
  key: RequirementKey;
  /** Short customer-facing state used on badges. */
  label: string;
  /** Plain-English explanation of why this is required. */
  why: string;
  icon: typeof FlaskConical;
};

/**
 * Maps the existing product flags (labs / telehealth) onto the four
 * customer-friendly requirement states. Purely presentational — the
 * underlying eligibility rules are unchanged.
 */
export function getRequirement(lab?: boolean, telehealth?: boolean): Requirement {
  if (lab && telehealth)
    return {
      key: "lab_provider",
      label: "Lab + provider review required",
      why: "This treatment needs recent blood work and a visit with a licensed provider, so they can confirm it is safe and appropriate for you before it is approved.",
      icon: Stethoscope,
    };
  if (lab)
    return {
      key: "lab",
      label: "Lab work required",
      why: "This treatment requires recent lab work so a licensed provider can review whether it is appropriate for you before approval.",
      icon: FlaskConical,
    };
  if (telehealth)
    return {
      key: "provider",
      label: "Provider review required",
      why: "A licensed provider needs to review your health information — by video or phone — before this can be prescribed.",
      icon: Stethoscope,
    };
  return {
    key: "direct",
    label: "Order directly",
    why: "No lab work or provider visit is needed. You can add this to your cart and check out.",
    icon: ShoppingBag,
  };
}

type BadgeProps = {
  lab?: boolean;
  telehealth?: boolean;
  accent: string;
  /** "dark" sits on the coloured page canvas, "light" on white cards. */
  tone?: "dark" | "light";
  className?: string;
};

/** One consistent, non-interactive requirement status used across product surfaces. */
export function RequirementBadge({
  lab,
  telehealth,
  accent,
  tone = "dark",
  className = "",
}: BadgeProps) {
  const req = getRequirement(lab, telehealth);
  const Icon = req.icon;
  const styles =
    tone === "dark"
      ? "text-white/85"
      : "text-slate-600";
  const iconColor = req.key === "direct" ? undefined : accent;

  return (
    <span
      title={req.why}
      className={`inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold ${styles} ${className}`}
    >
      <Icon
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
        style={iconColor ? { color: iconColor } : undefined}
      />
      {req.label}
    </span>
  );
}

/** Fuller explanation card used above the fold on product pages. */
export function RequirementCard({
  lab,
  telehealth,
  accent,
}: {
  lab?: boolean;
  telehealth?: boolean;
  accent: string;
}) {
  const req = getRequirement(lab, telehealth);
  const Icon = req.icon;
  return (
    <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/70">
        What you need before you can order
      </p>
      <div className="mt-2.5 flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
          style={{ backgroundColor: accent }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-white">{req.label}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-white/80">{req.why}</p>
        </div>
      </div>
    </div>
  );
}

export default RequirementBadge;
