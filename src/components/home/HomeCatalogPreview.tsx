import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import imgLab from "@/assets/c-lab.jpg";
import imgWeight from "@/assets/c-weight.jpg";
import imgInjectables from "@/assets/c-injectables.jpg";
import imgVitamins from "@/assets/c-vitamins.jpg";
import imgPeptides from "@/assets/p-peptides.jpg";
import imgSkin from "@/assets/p-trt-skincare.jpg";
import imgLifestyle from "@/assets/hero-lifestyle.jpg";
import imgMen from "@/assets/hero-portrait-men.jpg";
import {
  FlaskConical,
  Scale,
  Activity,
  Syringe,
  HeartPulse,
  Sparkles,
  Pill,
  PackageCheck,
} from "lucide-react";
import { useGender } from "@/components/gender/GenderContext";
import { GROUP_LABEL, catalogFor, type CatalogGroup } from "@/data/catalog";

const GROUP_ICON: Record<CatalogGroup, typeof FlaskConical> = {
  labs: FlaskConical,
  weight: Scale,
  hormones: Activity,
  peptides: Syringe,
  intimacy: HeartPulse,
  ed: HeartPulse,
  skin: Sparkles,
  vitamins: Pill,
  bundles: PackageCheck,
};

const GROUP_IMAGE: Record<CatalogGroup, string> = {
  labs: imgLab,
  weight: imgWeight,
  hormones: imgInjectables,
  peptides: imgPeptides,
  intimacy: imgLifestyle,
  ed: imgMen,
  skin: imgSkin,
  vitamins: imgVitamins,
  bundles: imgLab,
};

const ORDER: CatalogGroup[] = [
  "labs",
  "weight",
  "hormones",
  "peptides",
  "intimacy",
  "ed",
  "skin",
  "vitamins",
];

/**
 * Homepage catalog styled after the Medikale "our Services" section:
 * badge eyebrow, large centered title, and photo cards with a floating
 * accent icon circle overlapping the image and a "View More" link.
 * Cards are bigger and shown in a snap slider with prev/next arrows.
 */
export function HomeCatalogPreview() {
  const { theme } = useGender();
  const accent = theme === "men" ? "#2173D1" : "#5C9330";
  const accentTint = `color-mix(in oklch, ${accent} 14%, white)`;
  const items = catalogFor(theme);
  const cats = ORDER.map((key) => ({
    key,
    label: GROUP_LABEL[key].label,
    blurb: GROUP_LABEL[key].blurb,
    count: items.filter((p) => p.group === key).length,
    Icon: GROUP_ICON[key],
    image: GROUP_IMAGE[key],
  })).filter((c) => c.count > 0);

  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateScrollState = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  };

  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // step by one card width (with gap)
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section
      id="products"
      className="relative scroll-mt-24 text-clinical-ink"
      style={
        {
          "--catalog-accent": accent,
          "--catalog-accent-tint": accentTint,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-7xl px-[40px]">
        {/* Shared clip shape for category card images (objectBoundingBox so it scales) */}
        <svg width="0" height="0" aria-hidden="true" className="absolute">
          <defs>
            <clipPath id="amino-card-clip" clipPathUnits="objectBoundingBox">
              <path d="M0.83169 0.1003 C0.83169 0.15066 0.86337 0.19149 0.90245 0.19149 H0.92925 C0.96842 0.19149 1 0.23232 1 0.28268 V0.90882 C1 0.95917 0.96842 1 0.92925 1 H0.78329 C0.75724 1 0.73612 0.97285 0.73612 0.93921 C0.73612 0.90557 0.71491 0.87842 0.68895 0.87842 H0.07075 C0.03168 0.87842 0 0.83759 0 0.78723 V0.09119 C0 0.04083 0.03168 0 0.07075 0 H0.76094 C0.80001 0 0.83169 0.04083 0.83169 0.09119 V0.1003 Z" />
            </clipPath>
          </defs>
        </svg>
        {/* Badge eyebrow + large centered title */}
        <div className="mt-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-clinical-tint px-4 py-1.5 text-[13px] font-semibold text-clinical-ink shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
            Our Treatments
          </span>
          <h2 className="mx-auto mt-4 max-w-3xl font-display text-[28px] font-bold leading-tight tracking-tight text-clinical-ink sm:text-[34px] md:text-[40px]">
            What would you like to start with?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-clinical-copy">
            Pick a category to see the treatments available for {theme === "men" ? "men" : "women"}.
          </p>
        </div>

        {/* Slider controls */}
        <div className="mt-8 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            disabled={atStart}
            aria-label="Previous treatments"
            className="grid h-12 w-12 place-items-center rounded-full border border-clinical-border bg-white text-clinical-ink shadow-sm transition hover:bg-clinical-tint disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            disabled={atEnd}
            aria-label="Next treatments"
            className="grid h-12 w-12 place-items-center rounded-full border border-clinical-border bg-white text-clinical-ink shadow-sm transition hover:bg-clinical-tint disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Service cards — snap slider */}
        <div
          ref={trackRef}
          onScroll={updateScrollState}
          className="amino-scroll-hide mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        >
          {cats.map((c) => (
            <Link
              key={c.key}
              to="/category/$category"
              params={{ category: c.key }}
              data-card
              className="service-block group relative flex w-[88%] shrink-0 snap-center flex-col overflow-hidden rounded-[26px] bg-transparent transition-all duration-200 hover:-translate-y-1 sm:w-[48%] lg:w-[31.5%]"
            >
              {/* inner-box — mirrors the reference card: image-box then content-box */}
              <div className="inner-box relative flex flex-1 flex-col">
                {/* image-box: featured image + accent icon box overlapping its bottom-left */}
                <div className="image-box relative z-10 ml-[10px]">
                  {/* bg-gradient-shape: gradient layer peeking out below the clipped image */}
                  <span
                    aria-hidden="true"
                    className="bg-gradient-shape pointer-events-none absolute inset-0 z-0 translate-y-[10px] transition-transform duration-500"
                    style={{
                      clipPath: "url(#amino-card-clip)",
                      WebkitClipPath: "url(#amino-card-clip)",
                      backgroundImage: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 62%, white))`,
                    }}
                  />
                  <div
                    className="service-featured-img relative z-10 aspect-[424/329] w-full overflow-hidden"
                    style={{
                      clipPath: "url(#amino-card-clip)",
                      WebkitClipPath: "url(#amino-card-clip)",
                    }}
                  >
                    <img
                      src={c.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-10 bg-black/10"
                    />
                  </div>

                  <span
                    className={`icon-box absolute bottom-[-10px] left-[35px] z-20 flex h-[79px] w-[79px] items-center justify-center rounded-full text-center transition-colors duration-300 ${
                      theme === "women" ? "group-hover:!bg-[#1C4A28]" : "group-hover:!bg-[#09082B]"
                    }`}
                    style={{
                      backgroundColor: accent,
                      outline: "12px solid rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    <span className="service-icon grid place-items-center text-white">
                      <c.Icon className="h-9 w-9" strokeWidth={1.6} />
                    </span>
                  </span>
                </div>

                {/* Image and body share the same left inset, matching the reference's open left rail. */}
                <div
                  className="content-box relative z-0 ml-[10px] mt-[calc(-16.515%_+_4px)] flex flex-1 flex-col rounded-b-[26px] border-x border-b border-clinical-border bg-white px-[35px] pb-[40px] transition-colors duration-300 group-hover:border-transparent"
                  style={{ paddingTop: "calc(7.082% + 81px)" }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 rounded-b-[26px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      backgroundImage: `linear-gradient(180deg, ${accent} 0%, ${
                        theme === "women" ? "#0F2A14" : "#09082B"
                      } 100%)`,
                    }}
                  />
                  <h3 className="service-title text-[24px] font-semibold tracking-tight text-clinical-ink transition-colors duration-300 group-hover:text-white">
                    {c.label}
                  </h3>
                  <p className="service-details mt-3 text-[16px] leading-[1.9] text-clinical-copy transition-colors duration-300 group-hover:text-white/90">
                    {c.blurb}
                  </p>
                  <span className="btn-more mt-6 inline-flex items-center gap-2 text-[16px] font-semibold text-clinical-ink transition-colors duration-300 group-hover:text-white">
                    View More
                    <ArrowUpRight
                      className="h-4 w-4 transition-opacity duration-200 group-hover:hidden"
                      strokeWidth={2.5}
                    />
                    <ArrowRight className="hidden h-4 w-4 group-hover:inline" strokeWidth={2.5} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
          <Link
            to="/category/$category"
            params={{ category: theme }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white transition hover:brightness-110 sm:w-auto"
            style={{ backgroundColor: accent }}
          >
            Browse all treatments <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/lab-testing"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-clinical-border bg-white px-5 py-2.5 text-[15px] font-semibold text-clinical-ink transition hover:bg-clinical-tint sm:w-auto"
          >
            Order lab testing
          </Link>
        </div>
      </div>
    </section>
  );
}
