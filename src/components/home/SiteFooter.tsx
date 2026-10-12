import logoAsset from "@/assets/amino-flux-logo-footer.png.asset.json";
import liveBetterAsset from "@/assets/live-better.png.asset.json";
import footerBg from "@/assets/footer-hex-bg.jpg";
import { Link } from "@tanstack/react-router";
import { useGender } from "@/components/gender/GenderContext";

type FooterLink = { label: string; to?: string; hash?: string };

/** Only real destinations are clickable — everything else renders as a plain label. */
const GROUPS: { h: string; l: FooterLink[] }[] = [
  {
    h: "Shop",
    l: [
      { label: "Lab Panels", to: "/lab-testing" },
      { label: "Weight Loss", to: "/category/weight" },
      { label: "Hormone Therapy", to: "/category/hormones" },
      { label: "Dermatology", to: "/category/skin" },
      { label: "Bundles", to: "/category/bundles" },
    ],
  },
  {
    h: "Care",
    l: [
      { label: "How It Works", to: "/how-it-works" },
      { label: "Book a Consultation", to: "/account" },
      { label: "Treatment Plans", to: "/account" },
      { label: "Refills", to: "/account" },
    ],
  },
  {
    h: "Company",
    l: [
      { label: "About" },
      { label: "Careers" },
      { label: "Press" },
      { label: "Partners" },
      { label: "Contact" },
    ],
  },
  {
    h: "Support",
    l: [
      { label: "Your Orders", to: "/account" },
      { label: "Help Center" },
      { label: "Shipping & Returns" },
      { label: "Billing" },
    ],
  },
  {
    h: "Legal",
    l: [
      { label: "Privacy Policy" },
      { label: "Terms of Service" },
      { label: "Telehealth Consent" },
      { label: "HIPAA Notice" },
      { label: "Accessibility" },
    ],
  },
];

export function SiteFooter() {
  const { theme } = useGender();
  // Match the site's gender accent, just a shade darker — not a separate dark navy.
  const bg = theme === "women" ? "#41791F" : "#1A5EA9";
  return (
    <footer
      style={{ backgroundColor: bg }}
      className="relative overflow-hidden border-t border-white/10 pt-12 transition-colors duration-500 sm:pt-16 lg:pt-20"
    >
      <img
        src={footerBg}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={1920}
        height={640}
        style={
          theme === "women" ? { filter: "hue-rotate(-105deg) saturate(1.15)" } : undefined
        }
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-screen"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `linear-gradient(to right, ${bg}, ${bg}B3, transparent)` }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 sm:pb-12">
        <div className="grid gap-9 lg:grid-cols-[1.2fr_3fr] lg:gap-12">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={logoAsset.url}
                alt="Amino Flux Rx logo"
                width={160}
                height={160}
                className="h-32 w-32 object-contain sm:h-[160px] sm:w-[160px]"
              />
            </div>

            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-white">
              Physician-directed telehealth for metabolic health, hormones, and longevity. Licensed
              in all 50 states.
            </p>
            <img
              src={liveBetterAsset.url}
              alt="Live Better"
              width={794}
              height={444}
              loading="lazy"
              className="mt-5 h-auto w-44 object-contain brightness-0 invert-[1] drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] sm:w-52"
            />
            <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.22em] text-white">
              Support · 1-800-555-0142
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {GROUPS.map((g) => (
              <div key={g.h}>
                <div className="font-mono text-[12px] uppercase tracking-[0.28em] text-white">
                  {g.h}
                </div>
                <ul className="mt-4 space-y-2 text-[14px] text-white">
                  {g.l.map((x) =>
                    x.to ? (
                      <li key={x.label}>
                        <Link
                          to={x.to}
                          className="inline-block py-0.5 font-medium transition hover:text-white hover:underline"
                        >
                          {x.label}
                        </Link>
                      </li>
                    ) : (
                      <li key={x.label} className="py-0.5 text-white">
                        {x.label}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 rounded-xl border border-white/20 bg-black/25 p-4 text-[13px] leading-relaxed text-white sm:mt-14 sm:rounded-2xl sm:p-5">
          Medical disclaimer: Content on this site is for informational purposes only and is not a
          substitute for professional medical advice, diagnosis, or treatment. Prescription products
          are dispensed only after evaluation by a licensed provider. Individual results vary.
        </p>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/20 pt-6 text-xs text-white md:flex-row">
          <span>© 2026 Amino Flux Health. All rights reserved.</span>
          <span className="font-mono">HIPAA compliant · LegitScript certified</span>
        </div>
      </div>
    </footer>
  );
}
