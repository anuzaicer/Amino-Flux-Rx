import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FlaskConical, ClipboardList, Video, Truck, ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { PRODUCTS, ProductTitle, type Product } from "@/components/home/Sections";
import { useGender } from "@/components/gender/GenderContext";
import { BloodPanels, QuestNotice } from "@/components/labs/BloodPanels";

export const Route = createFileRoute("/lab-testing")({
  head: () => ({
    meta: [
      { title: "Lab Testing Required Treatments | Amino Flux Rx" },
      {
        name: "description",
        content:
          "Treatments and panels that require lab testing before ordering. See how testing, telehealth review, and prescribing work at Amino Flux Rx.",
      },
      { property: "og:title", content: "Lab Testing Required Treatments | Amino Flux Rx" },
      {
        property: "og:description",
        content:
          "Lab work first, then a telehealth visit with a licensed provider, then your prescription ships.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LabTestingPage,
});

const STEPS = [
  {
    icon: ClipboardList,
    t: "Step 1 - Order your lab panel",
    d: "Pick the panel tied to your treatment and complete a short intake.",
  },
  {
    icon: FlaskConical,
    t: "Step 2 - Book Quest & get your blood work done",
    d: "Schedule an appointment at Quest Diagnostics for your blood draw. Results usually return in 2 to 5 days.",
  },
  {
    icon: Video,
    t: "Step 3 - Meet your provider",
    d: "A licensed clinician reviews your labs with you over telehealth.",
  },
  {
    icon: Truck,
    t: "Step 4 - Treatment ships",
    d: "If appropriate, your prescription is sent to your door from a US pharmacy.",
  },
];

type Group = {
  id: string;
  title: string;
  plain: string;
  why: string;
  match: (p: Product) => boolean;
};

const GROUPS: Group[] = [
  {
    id: "blood-tests",
    title: "1. Blood tests (lab panels)",
    plain: "Start here. These are the blood tests themselves. Nothing is prescribed at this stage.",
    why: "Pick the panel that matches what you want to treat. Not sure? Choose the comprehensive panel.",
    match: (p) => /lab panel/i.test(p.n),
  },
  {
    id: "hormone-therapy",
    title: "2. Hormone therapy",
    plain: "Treatments that adjust your hormones, such as testosterone or estradiol.",
    why: "Your hormone levels must be measured first so your provider can dose you safely.",
    match: (p) =>
      /testosterone cypionate|vitality|estradiol|thyroid balance|perimenopause/i.test(p.n),
  },
  {
    id: "weight-management",
    title: "3. Weight management (GLP-1)",
    plain: "Semaglutide and tirzepatide style programs for medical weight loss.",
    why: "Labs confirm your metabolic, kidney, and liver markers before a GLP-1 is prescribed.",
    match: (p) => /glp-1|tirzepatide/i.test(p.n),
  },
];

function groupFor(p: Product) {
  return GROUPS.find((g) => g.match(p));
}

function LabTestingPage() {
  const { theme } = useGender();
  const who = theme;
  const labItems = PRODUCTS.filter((p) => p.lab && p.cat === who);
  const grouped = GROUPS.map((g) => ({ g, items: labItems.filter((p) => groupFor(p) === g) }));
  const other = labItems.filter((p) => !groupFor(p));
  const sections = [
    ...grouped,
    ...(other.length
      ? [
          {
            g: {
              id: "other-care",
              title: `${GROUPS.length + 1}. Other treatments`,
              plain: "Additional provider-managed treatments that still need recent bloodwork.",
              why: "Your provider checks your results before confirming a protocol.",
            } as Group,
            items: other,
          },
        ]
      : []),
  ].filter((s) => s.items.length > 0);

  return (
    <div className="relative min-h-screen bg-clinical-canvas text-clinical-ink">
      <SiteHeader />
      <main>
        <div className="relative">
          <div
            className="text-white"
            style={{ backgroundColor: who === "women" ? "#5C9330" : "#2173D1" }}
          >
            {/* How it works rail */}
            <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 pb-6">
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to home
                </Link>
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="mt-6 block font-mono text-[15px] uppercase tracking-[0.3em] text-white/80"
              >
                Lab testing required · How it works
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
                className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-4xl xl:text-5xl"
              >
                Treatments that require lab testing before ordering
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mt-4 max-w-2xl text-base text-white/85"
              >
                A lab panel is a simple blood draw that measures the markers tied to your treatment.
                Get tested, meet your provider over telehealth, then your prescription ships if
                appropriate.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-7 grid gap-3 min-[390px]:grid-cols-2 md:mt-8 md:grid-cols-4 md:gap-4"
              >
                {STEPS.map((s, i) => (
                  <div
                    key={s.t}
                    className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-sm sm:p-5 md:rounded-3xl md:p-6"
                  >
                    <span className="absolute right-4 top-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/55">
                      0{i + 1}
                    </span>
                    <s.icon className="h-6 w-6" />
                    <h2 className="mt-4 font-display text-base font-semibold leading-tight">
                      {s.t}
                    </h2>
                    <p className="mt-2 text-sm text-white/85">{s.d}</p>
                  </div>
                ))}
              </motion.div>
            </section>

            {/* Section 2.1 - Categories based on gender */}
            <section className="relative z-10 mx-auto max-w-7xl px-4 pb-8 sm:px-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">
                Categories
              </span>
              <p className="mt-2 text-sm font-semibold text-white/85">
                {who === "men" ? "Men's categories" : "Women's categories"} · jump to one
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {sections.map(({ g, items }) => (
                  <a
                    key={g.id}
                    href={`#${g.id}`}
                    className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25"
                  >
                    {g.title} ({items.length})
                  </a>
                ))}
              </div>
            </section>
          </div>

          <div className="bg-clinical-canvas py-14 text-clinical-ink sm:py-16">
            <QuestNotice />

            <BloodPanels />

            {sections.map(({ g, items }) => (
              <section
                key={g.id}
                id={g.id}
                className="relative z-10 mx-auto max-w-7xl scroll-mt-28 px-4 pb-14 sm:px-6 sm:pb-16"
              >
                <h2 className="font-display text-2xl font-semibold md:text-3xl">{g.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-clinical-copy">{g.plain}</p>
                <p className="mt-1 max-w-2xl text-sm text-clinical-copy">
                  <span className="font-semibold text-clinical-ink">Why labs first:</span> {g.why}
                </p>
                <p className="mt-2 text-xs text-clinical-copy">{items.length} options</p>

                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <div
                      key={`${p.cat}-${p.n}`}
                      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] sm:rounded-3xl"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4F7EE] sm:h-40 sm:aspect-auto">
                        <img
                          src={p.img}
                          alt={p.n}
                          loading="lazy"
                          width={512}
                          height={512}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col p-4 text-left sm:p-5">
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.3em] ${
                            who === "women" ? "text-[#5C9330]" : "text-[#2173D1]"
                          }`}
                        >
                          {p.tag}
                        </span>
                        <ProductTitle p={p} className="mt-2" />
                        <p className="mt-1.5 text-xs text-[#0F1E33]/70">{p.d}</p>
                        <span
                          className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[15px] font-semibold uppercase tracking-[0.15em] ${
                            who === "women"
                              ? "bg-[#5C9330]/10 text-[#5C9330]"
                              : "bg-[#2173D1]/10 text-[#2173D1]"
                          }`}
                        >
                          <FlaskConical className="h-3 w-3" /> Lab testing required
                        </span>
                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-base font-bold text-[#0F1E33]">{p.p}</span>
                          <span className="text-xs text-[#0F1E33]/60">★ {p.r}</span>
                        </div>
                        <a
                          href="/#consultation"
                          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white transition ${
                            who === "women"
                              ? "bg-[#5C9330] hover:bg-[#5F9A2E]"
                              : "bg-[#2173D1] hover:bg-[#1A5BB5]"
                          }`}
                        >
                          Start lab testing
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="relative z-10 mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
              <p className="max-w-3xl text-xs text-clinical-copy">
                Lab testing does not guarantee a prescription. All treatment decisions are made by a
                licensed provider after reviewing your results and medical history.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
