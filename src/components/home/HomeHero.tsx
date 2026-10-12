import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useGender, GENDER_THEME } from "@/components/gender/GenderContext";
import heroPortraitMen from "@/assets/hero-portrait-men.jpg";
import heroPortraitWomen from "@/assets/hero-portrait.jpg";

export function HomeHero() {
  const { theme } = useGender();
  const t = GENDER_THEME[theme];
  const portrait = theme === "men" ? heroPortraitMen : heroPortraitWomen;

  return (
    <section
      id="top"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: t.bg }}
    >
      {/* ---- Full-bleed portrait ---- */}
      <motion.div
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0"
      >
        <img
          src={portrait}
          alt={
            theme === "men"
              ? "Healthy man on a personalized Amino Flux Rx wellness program"
              : "Healthy woman on a personalized Amino Flux Rx wellness program"
          }
          className="h-full w-full object-cover object-[50%_28%] mix-blend-luminosity opacity-[0.92]"
          draggable={false}
        />
        <div className="absolute inset-0 mix-blend-color" style={{ backgroundColor: t.bg }} />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${t.bg}, ${t.bg}73, ${t.bg}B3)`,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background: `linear-gradient(to top, ${t.bgHover}D9, transparent)`,
          }}
        />
      </motion.div>

      {/* ---- Copy ---- */}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-6 pt-8 lg:pt-12">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl font-display text-3xl font-semibold leading-[1.06] tracking-tight text-white sm:text-4xl xl:text-5xl"
        >
          Connecting you
          <br />
          to better
          <br />
          health
        </motion.h1>

        <motion.a
          href="#products"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="group mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/45 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:brightness-110"
          style={{ ["--tw-border-opacity" as string]: 1 }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = t.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
        >
          Find My Treatment
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </motion.a>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-auto max-w-sm self-end pb-3 text-right text-lg font-bold leading-snug text-white sm:text-xl"
        >
          Your journey to a healthier you starts today.
        </motion.p>
      </div>

      {/* ---- Oversized wordmark ---- */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full shrink-0 overflow-hidden pb-3"
      >
        <div className="flex w-full select-none items-end justify-center gap-[1.2vw] font-display leading-[1] tracking-[-0.04em] text-white">
          <span className="text-[8vw] font-semibold">AMINO FLUX</span>
          <span className="pb-[0.5vw] text-[2.4vw] font-semibold text-white/85">Rx</span>
        </div>
      </motion.div>
    </section>
  );
}
