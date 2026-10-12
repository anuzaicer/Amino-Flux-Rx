import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Stethoscope,
  PackageCheck,
  ArrowRight,
  Video,
  CalendarCheck,
  ClipboardList,
  Truck,
  Mail,
  Plus,
  FlaskConical,
  Activity,
  Scale,
  Sparkles,
  HeartPulse,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Syringe,
  Pill,
  Star,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useGender } from "@/components/gender/GenderContext";
import { RequirementBadge } from "@/components/product/RequirementBadge";

import { catalogFor, GROUP_LABEL, type CatalogGroup, type CatalogProduct } from "@/data/catalog";
import pGlp1 from "@/assets/p-glp1.jpg";
import pLabpanel from "@/assets/p-labpanel.jpg";
import pMaleComprehensive from "@/assets/p-male-comprehensive.png";

import pTrtSkincare from "@/assets/p-trt-skincare.jpg";
import cLab from "@/assets/c-lab.jpg";
import cVitamins from "@/assets/c-vitamins.jpg";
import cInjectables from "@/assets/c-injectables.jpg";
import cWeight from "@/assets/c-weight.jpg";
import imgMenDoctor from "@/assets/doctor-men.jpg";
import imgWomenDoctor from "@/assets/doctor-women.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

/* Card palette rules:
   - Blue sections (page canvas) → GREEN cards (#5C9330)
   - Green sections (BestSellers / Solutions) → BLUE cards (#2173D1)
   - All text is white.
*/
const GREEN_CARD = "bg-[#5C9330] border border-white/20 text-white";
const BLUE_CARD = "bg-[#2173D1] border border-white/20 text-white";

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
      <span className="font-mono text-[12px] uppercase tracking-[0.28em] text-white/80">
        {eyebrow}
      </span>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
        {title}
      </h2>
      {sub && <p className="mt-4 text-white/80">{sub}</p>}
    </motion.div>
  );
}

/* ── 4. Trust Bar ─────────────────────────────────────── */
export function TrustBar() {
  const items = [
    {
      icon: Stethoscope,
      t: "Licensed Providers",
      d: "Board-certified clinicians in all 50 states",
    },
    { icon: Lock, t: "Secure & Private", d: "HIPAA-compliant intake and records" },
    { icon: Video, t: "Convenient Online Care", d: "Visits and refills without the waiting room" },
    { icon: PackageCheck, t: "Discreet Delivery", d: "Unmarked, temperature-safe packaging" },
  ];
  return (
    <section className="border-y border-white/15 bg-black/10">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <motion.div key={i.t} {...fadeUp} className="flex items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${GREEN_CARD}`}>
              <i.icon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-medium text-white">{i.t}</div>
              <div className="mt-0.5 text-xs text-white/70">{i.d}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

type CatFilter = "all" | "men" | "women";

/* ── 6. Featured / Men's Best Sellers ─────────────────── */
export type Product = {
  id: string;
  n: string;
  /** Bolded subject of the item, e.g. "Vitamin D" in "Vitamin D Lab Panel". */
  focus?: string;
  d: string;
  p: string;
  r: number;
  tag: string;
  img: string;
  cat: "men" | "women";
  group: CatalogGroup;
  /** Requires lab testing before it can be ordered. */
  lab?: boolean;
  /** Requires a provider telehealth visit before it can be prescribed. */
  telehealth?: boolean;
};

const GROUP_IMAGE: Record<CatalogGroup, string> = {
  labs: pLabpanel,
  weight: cWeight,
  hormones: pTrtSkincare,
  peptides: cInjectables,
  intimacy: pGlp1,
  ed: pGlp1,
  skin: pTrtSkincare,
  vitamins: cVitamins,
  bundles: cInjectables,
};

/** Per-product image overrides (fall back to the group image when absent). */
const PRODUCT_IMAGE: Record<string, string> = {
  "lab-male-comprehensive": pMaleComprehensive,
};

/** Stable pseudo-rating so cards stay lively without fake volatility. */
function ratingFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return Number((4.6 + (h % 4) / 10).toFixed(1));
}

function toProduct(p: CatalogProduct, cat: "men" | "women"): Product {
  return {
    id: p.id,
    n: p.name,
    d: p.description,
    p: p.price,
    r: ratingFor(p.id),
    // Shared (audience "both") products present under the care path they are
    // being browsed in — one product record, gender-aware labeling.
    tag: cat === "men" ? "Men's" : "Women's",
    img: PRODUCT_IMAGE[p.id] ?? GROUP_IMAGE[p.group],
    cat,
    group: p.group,
    lab: p.lab,
    telehealth: p.telehealth,
  };
}

/** Full imported catalog, split across the two care paths. */
export const PRODUCTS: Product[] = [
  ...catalogFor("men").map((p) => toProduct(p, "men")),
  ...catalogFor("women").map((p) => toProduct(p, "women")),
];

/* ── 6. Treatment categories for the selected care path ── */
type CategoryDef = { key: CatalogGroup; label: string; blurb: string; icon: typeof FlaskConical };

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

const CATEGORY_DEFS: CategoryDef[] = (
  [
    "labs",
    "weight",
    "hormones",
    "peptides",
    "intimacy",
    "ed",
    "skin",
    "vitamins",
    "bundles",
  ] as CatalogGroup[]
).map((key) => ({
  key,
  label: GROUP_LABEL[key].label,
  blurb: GROUP_LABEL[key].blurb,
  icon: GROUP_ICON[key],
}));

/* ── 6a. One storefront shelf per category ───────────── */
function CategoryShelf({
  cat,
  index,
  theme,
}: {
  cat: CategoryDef & { items: Product[] };
  index: number;
  theme: "men" | "women";
}) {
  const accent = theme === "men" ? "#2173D1" : "#5C9330";
  const [page, setPage] = useState(0);
  const PER_PAGE = 3;
  const pageCount = Math.max(1, Math.ceil(cat.items.length / PER_PAGE));
  const start = page * PER_PAGE;
  const items = cat.items.slice(start, start + PER_PAGE);
  return (
    <section id={`cat-${cat.key}`} className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white ring-1 ring-white/25"
              style={{ backgroundColor: accent }}
            >
              <cat.icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <span className="font-mono text-[13px] uppercase tracking-[0.22em] text-white/70">
                {String(index + 1).padStart(2, "0")} · {cat.items.length} product
                {cat.items.length === 1 ? "" : "s"}
              </span>
              <h3 className="font-display text-lg font-semibold leading-tight tracking-tight text-white md:text-xl">
                {cat.label}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)}
              disabled={pageCount <= 1}
              aria-label={`Previous ${cat.label} products`}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-[14px] font-semibold tabular-nums text-white/70">
              {page + 1}/{pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => (p + 1) % pageCount)}
              disabled={pageCount <= 1}
              aria-label={`Next ${cat.label} products`}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <Link
              to="/category/$category"
              params={{ category: cat.key }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-3 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ProductCard key={p.n} p={p} accent={accent} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* Storefront shelves only — the "Shop by category" heading/grid row was removed per request. */
export function CatalogShowcase() {
  const { theme } = useGender();
  const list = PRODUCTS.filter((p) => p.cat === theme);
  const isMen = theme === "men";
  const cats = CATEGORY_DEFS.map((c) => ({
    ...c,
    items: list.filter((p) => p.group === c.key),
  })).filter((c) => c.items.length > 0);

  return (
    <section id="products" className="relative scroll-mt-24 py-8">
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Start here — a guided entry point before the full catalog */}
        <div className="mb-10 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl md:p-8">
          <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">Start here</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/80">
            Not sure where to begin? Pick one of these three, or scroll down to browse everything.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link
              to="/category/$category"
              params={{ category: theme }}
              className="rounded-2xl px-5 py-4 text-white transition hover:brightness-110"
              style={{ backgroundColor: isMen ? "#2173D1" : "#5C9330" }}
            >
              <span className="block text-[16px] font-semibold">Browse treatments</span>
              <span className="mt-1 block text-[14px] text-white/85">
                See everything available for {isMen ? "men" : "women"}.
              </span>
            </Link>
            <Link
              to="/lab-testing"
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-white transition hover:bg-white/20"
            >
              <span className="block text-[16px] font-semibold">Order lab testing</span>
              <span className="mt-1 block text-[14px] text-white/80">
                Blood work at a Quest location near you.
              </span>
            </Link>
            <Link
              to="/how-it-works"
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-white transition hover:bg-white/20"
            >
              <span className="block text-[16px] font-semibold">See how it works</span>
              <span className="mt-1 block text-[14px] text-white/80">
                The six steps from lab to medication.
              </span>
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {cats.map((c, i) => (
            <CategoryShelf key={c.key} cat={c} index={i} theme={theme} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/category/$category"
            params={{ category: theme }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/20"
          >
            View full {isMen ? "men's" : "women's"} catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* Five-star rating row, filled to the nearest half. */
function Stars({ value, accent }: { value: number; accent: string }) {
  const pct = Math.round((value / 5) * 100);
  return (
    <span className="relative inline-flex" aria-label={`${value} out of 5 stars`}>
      <span className="flex text-white/20">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex overflow-hidden"
        style={{ width: `${pct}%`, color: accent }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="h-3.5 w-3.5 shrink-0" fill="currentColor" strokeWidth={0} />
        ))}
      </span>
    </span>
  );
}

/* Shared e-commerce product card. */
export function ProductCard({ p, accent }: { p: Product; accent: string }) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#F7F8FA] text-slate-900 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
      style={{ ["--accent" as string]: accent }}
    >
      <Link
        to="/product/$productId"
        params={{ productId: p.id }}
        search={{ from: p.group }}
        className="relative block aspect-square w-full bg-white p-4 sm:p-6"
        aria-label={`View ${p.n}`}
      >
        <img
          src={p.img}
          alt={p.n}
          loading="lazy"
          width={512}
          height={512}
          className="h-full w-full object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          {p.tag}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4 text-left">
        <ProductTitle
          p={p}
          className="text-[16px] leading-snug transition-colors group-hover:text-[var(--accent)]"
        />
        <p className="line-clamp-2 text-[14px] leading-snug text-slate-500">{p.d}</p>
        <RequirementBadge lab={p.lab} telehealth={p.telehealth} accent={accent} tone="light" />
        <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-500">Price</span>
            <p className="text-xl font-bold tracking-tight text-slate-900">{p.p}</p>
          </div>
          <Link
            to="/product/$productId"
            params={{ productId: p.id }}
            search={{ from: p.group }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[15px] font-bold text-white transition hover:brightness-110 active:scale-95"
            style={{ background: accent }}
          >
            View product <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── 6b. Single-product slider ───────────────────────── */
const PER_SLIDE = 3;

export function ProductTitle({
  p,
  className = "",
  linked = true,
}: {
  p: Product;
  className?: string;
  linked?: boolean;
}) {
  const rest = p.focus && p.n.startsWith(p.focus) ? p.n.slice(p.focus.length) : null;
  const title = (
    <h3 className={`font-display text-lg text-slate-900 ${className}`}>
      {rest !== null ? (
        <>
          <strong className="font-bold">{p.focus}</strong>
          <span className="font-medium">{rest}</span>
        </>
      ) : (
        <strong className="font-bold">{p.n}</strong>
      )}
    </h3>
  );
  if (!linked) return title;
  return (
    <Link
      to="/product/$productId"
      params={{ productId: p.id }}
      search={{ from: p.group }}
      className="block transition hover:opacity-80"
    >
      {title}
    </Link>
  );
}

export function ProductSlider({ list }: { list: Product[] }) {
  const { theme: sliderTheme } = useGender();
  const ctaGreen = sliderTheme === "men";
  const [slide, setSlide] = useState(0);
  const max = Math.max(1, Math.ceil(list.length / PER_SLIDE));
  // Reset to the first slide whenever the underlying (gender-filtered) list changes
  useEffect(() => {
    setSlide(0);
  }, [list.length, sliderTheme]);
  const go = (dir: number) => setSlide((p) => (p + dir + max) % max);
  const start = slide * PER_SLIDE;
  const items = [0, 1, 2].map((off) => list[start + off]).filter(Boolean);

  return (
    <div className="mt-14">
      <div className="relative">
        <motion.div
          key={slide}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className={`mx-auto grid gap-6 ${
            items.length === 1
              ? "max-w-md"
              : items.length === 2
                ? "max-w-3xl md:grid-cols-2"
                : "max-w-6xl md:grid-cols-3"
          }`}
        >
          {items.map((p) => (
            <div
              key={p.n}
              className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)]"
            >
              <div className="relative h-44 w-full overflow-hidden bg-[#F4F7EE]">
                <img
                  src={p.img}
                  alt={p.n}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-5 text-left">
                <span
                  className={`font-mono text-[12px] uppercase tracking-[0.28em] ${p.cat === "women" ? "text-[#5C9330]" : "text-[#2173D1]"}`}
                >
                  {p.tag}
                </span>
                <ProductTitle p={p} className="mt-2" />
                <p className="mt-1.5 text-[14px] leading-snug text-[#0F1E33]/75">{p.d}</p>
                <RequirementBadge
                  lab={p.lab}
                  telehealth={p.telehealth}
                  accent={ctaGreen ? "#5C9330" : "#2173D1"}
                  tone="light"
                  className="mt-3"
                />
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-base font-bold text-[#0F1E33]">{p.p}</span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    to="/product/$productId"
                    params={{ productId: p.id }}
                    search={{ from: p.group }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                    style={{ backgroundColor: ctaGreen ? "#5C9330" : "#2173D1" }}
                  >
                    View product <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        <div className={`mt-6 items-center justify-center gap-6 ${max > 1 ? "flex" : "hidden"}`}>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-mono text-sm text-white/80">
            {String(slide + 1).padStart(2, "0")} / {String(max).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 6c. (removed) opposite-gender care section ───────── */

/* ── Weight Management / GLP-1 ───────────────────────── */
export function WeightManagement() {
  const { theme } = useGender();
  const weightProducts = PRODUCTS.filter((p) => p.cat === theme && /GLP|Tirzepatide/i.test(p.n));
  return (
    <section id="weight-management" className="relative z-10 scroll-mt-28 py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Weight Management"
          title="Medical weight loss, guided."
          sub="GLP-1 and dual GIP/GLP-1 protocols, prescribed by a licensed provider and dosed to your labs."
        />
        <ProductSlider list={weightProducts} />
      </div>
    </section>
  );
}

/* One continuous Vanta fog canvas behind Women's care + Weight Management + Consultation. */
export function CareFlow() {
  return (
    <div className="relative overflow-hidden">
      <div className="relative z-10">
        <Consultation />
      </div>
    </div>
  );
}

/* ── 7. Solutions / Shop by Goal ──────────────────────── */
const GOALS = [
  { t: "Weight Management", d: "GLP-1 options, metabolic labs, and provider-guided support." },
  { t: "Hormone Balance", d: "Testing and clinician-managed treatment, dosed to you." },
  { t: "Men's Wellness", d: "TRT, ED, hair, and men's health support.", only: "men" as const },
  {
    t: "Women's Wellness",
    d: "Perimenopause, thyroid, libido, and supportive care.",
    only: "women" as const,
  },
  { t: "Skin & Hair", d: "Prescription dermatology and compounded topicals." },
];

export function Solutions() {
  const { theme } = useGender();
  const goals = GOALS.filter((g) => !g.only || g.only === theme);
  return (
    <section className="relative py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Solutions"
          title="Shop by goal"
          sub="Browse care paths by the goal you're working toward. Your provider builds the protocol."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g, i) => (
            <motion.a
              key={g.t}
              {...fadeUp}
              transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
              href="#products"
              className={`group relative overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-br from-[#2173D1] to-[#5C9330] p-8 shadow-lg shadow-black/10 transition hover:border-white/50 ${i === 0 ? "lg:col-span-2" : ""}`}
            >
              <div className="absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-white/30 blur-3xl" />
              <div className="relative">
                <h3 className="font-display text-2xl font-semibold text-white">{g.t}</h3>
                <p className="mt-3 max-w-sm text-sm text-white/85">{g.d}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-white">
                  Explore{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 8. How It Works ──────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    t: "Choose Your Treatment",
    d: "Browse protocols or start from a lab panel.",
    icon: ClipboardList,
  },
  {
    n: "02",
    t: "Complete Evaluation",
    d: "A short medical intake, done online in minutes.",
    icon: ShieldCheck,
  },
  {
    n: "03",
    t: "Connect With Provider",
    d: "A licensed clinician reviews and prescribes.",
    icon: Stethoscope,
  },
  {
    n: "04",
    t: "Receive Your Treatment",
    d: "Shipped discreetly from a US pharmacy.",
    icon: Truck,
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <SectionHead eyebrow="How it works" title="Four steps to treatment" />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`relative rounded-2xl ${BLUE_CARD} p-7`}
            >
              <span className="font-mono text-xs tracking-[0.3em] text-white/80">{s.n}</span>
              <s.icon className="mt-5 h-6 w-6 text-white" />
              <h3 className="mt-4 text-base font-semibold text-white">{s.t}</h3>
              <p className="mt-2 text-sm text-white/80">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 9. Provider Consultation ─────────────────────────── */
export function Consultation() {
  const { theme } = useGender();
  const isWomen = theme === "women";
  const accent = isWomen ? "#5C9330" : "#2173D1";
  const providerImg = isWomen ? imgWomenDoctor : imgMenDoctor;
  const features = [
    {
      icon: Stethoscope,
      t: "Provider-guided care",
      d: "A licensed clinician reviews your labs and builds a protocol around your goals.",
    },
    {
      icon: ShieldCheck,
      t: "Private & secure",
      d: "HIPAA-compliant intake, encrypted records, and discreet doorstep delivery.",
    },
    {
      icon: Mail,
      t: "Always supported",
      d: "Unlimited follow-up messaging between visits, so you're never on your own.",
    },
  ];
  return (
    <section id="consultation" className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <motion.div
        {...fadeUp}
        className="relative grid min-h-[690px] overflow-hidden rounded-[26px] text-white lg:grid-cols-[56%_44%]"
        style={{ backgroundColor: accent }}
      >
        <div className="relative z-10 flex items-center px-6 py-16 sm:px-10 lg:px-10 lg:py-20 xl:px-12">
          <div className="w-full max-w-[670px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/15 px-4 py-1.5 text-[13px] font-semibold text-white/85">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Why Choose Us
            </span>
            <h2 className="mt-5 max-w-xl font-display text-[34px] font-bold leading-[1.22] text-white sm:text-[40px] lg:text-[44px]">
              Reason for choosing our provider care
            </h2>
            <p className="mt-6 max-w-[560px] text-[16px] leading-[1.8] text-white/75">
              Choosing care is personal. Meet a licensed clinician who knows your labs and your
              goals — no waiting room, no obligation.
            </p>

            <ul className="relative mt-8 space-y-7 sm:mt-9">
              <span
                aria-hidden
                className="absolute bottom-[34px] left-[31px] top-[34px] w-px border-l border-dashed border-white/30"
              />
              {features.map((f) => (
                <li
                  key={f.t}
                  className="relative flex items-start gap-5 sm:items-center sm:gap-6"
                >
                  <span className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-full border-2 border-dashed border-white/40">
                    <span className="grid h-[48px] w-[48px] place-items-center rounded-full bg-white/15">
                      <f.icon className="h-6 w-6 text-white" strokeWidth={1.7} />
                    </span>
                  </span>
                  <div>
                    <h3 className="text-[18px] font-semibold leading-snug text-white">{f.t}</h3>
                    <p className="mt-1.5 max-w-[490px] text-[15px] leading-[1.75] text-white/75">
                      {f.d}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <a
              href="/account"
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-[14px] font-bold uppercase tracking-[0.18em] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.2)]"
              style={{ color: accent }}
            >
              <CalendarCheck className="h-4 w-4" /> Book a Zoom call
            </a>
          </div>
        </div>

        <div className="relative min-h-[480px] overflow-hidden lg:min-h-full">
          <img
            src={providerImg}
            alt="Licensed Amino Flux Rx provider"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
        </div>
      </motion.div>
    </section>
  );
}

/* ── 10. Promotional Banner ───────────────────────────── */
export function PromoBanner() {
  return (
    <section className="relative py-12">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          {...fadeUp}
          className={`relative overflow-hidden rounded-3xl ${GREEN_CARD} p-10 text-center md:p-16`}
        >
          <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
          <span className="relative font-mono text-[12px] uppercase tracking-[0.28em] text-white/80">
            Spring metabolic reset
          </span>
          <h2 className="relative mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold text-white md:text-5xl">
            20% off your first GLP-1 protocol
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/80">
            Includes provider evaluation, baseline metabolic panel, and your first month of
            medication, shipped free.
          </p>
          <a
            href="#products"
            className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-[#2173D1] px-7 py-3.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[#1A5BB5]"
          >
            Claim the offer <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ── 11. FAQ ──────────────────────────────────────────── */
const FAQS = [
  {
    q: "How does it work?",
    a: "Choose a treatment or lab panel, complete a short online medical evaluation, and a licensed provider reviews your case, usually within 24 hours. Approved prescriptions ship directly to you.",
  },
  {
    q: "Do I need a prescription?",
    a: "For prescription items, yes, and we handle it. Our providers write the prescription after your evaluation. Supplements and lab panels don't require one.",
  },
  {
    q: "How are consultations handled?",
    a: "Asynchronous messaging is included with every protocol. You can also book a 30-minute Zoom visit with a clinician at any point in your treatment.",
  },
  {
    q: "How does shipping work?",
    a: "Orders ship from licensed US pharmacies in unmarked, temperature-controlled packaging. Standard delivery is 2–5 business days and free over $150.",
  },
  {
    q: "Can I cancel or pause a plan?",
    a: "Yes. Manage, pause, or cancel any recurring protocol from your account with no fees and no phone calls.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHead eyebrow="FAQ" title="Questions, answered" />
        <div className={`mt-12 divide-y divide-white/15 overflow-hidden rounded-2xl ${GREEN_CARD}`}>
          {FAQS.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-medium text-white transition hover:bg-white/10"
              >
                {f.q}
                <Plus
                  className={`h-4 w-4 shrink-0 text-white transition-transform ${open === i ? "rotate-45" : ""}`}
                />
              </button>
              {open === i && (
                <p className="px-6 pb-6 text-sm leading-relaxed text-white/80">{f.a}</p>
              )}
            </div>
          ))}
        </div>
        <motion.div {...fadeUp} className="mt-8 text-center">
          <Link to="/how-it-works" className="text-sm font-semibold text-white hover:underline">
            See how it works →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ── 13. Newsletter ───────────────────────────────────── */
export function Newsletter() {
  return (
    <section id="newsletter" className="relative py-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          {...fadeUp}
          className={`grid items-center gap-8 rounded-3xl ${GREEN_CARD} p-10 md:grid-cols-2 md:p-14`}
        >
          <div>
            <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">
              Get $25 off your first order
            </h2>
            <p className="mt-3 text-sm text-white/80">
              Join the list for protocol guides, new product drops, and patient-only pricing.
            </p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="nl-email" className="sr-only">
              Email address
            </label>
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              <input
                id="nl-email"
                type="email"
                required
                placeholder="you@email.com"
                className="w-full rounded-full border border-white/25 bg-white/15 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/60 outline-none transition focus:border-white/60"
              />
            </div>
            <button className="rounded-full bg-[#2173D1] px-7 py-3.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[#1A5BB5]">
              Subscribe
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
