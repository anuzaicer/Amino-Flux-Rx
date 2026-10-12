import { motion, useScroll, useTransform } from "framer-motion";

export function Navbar() {
  const { scrollY } = useScroll();
  const blur = useTransform(scrollY, [0, 100], [6, 18]);
  const bg = useTransform(scrollY, [0, 100], ["oklch(1 0 0 / 0.02)", "oklch(0.08 0.03 270 / 0.6)"]);

  return (
    <motion.header
      style={{
        backdropFilter: useTransform(blur, (b) => `blur(${b}px) saturate(160%)`),
        backgroundColor: bg,
      }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/5"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="relative grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-[#5C9330] to-[#2173D1] shadow-[0_0_24px_-4px_#5C9330]">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="font-display text-base font-semibold tracking-[0.18em] text-white">
            AMINO·FLUX
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          <a href="#catalog" className="hover:text-white transition-colors">
            Catalog
          </a>
          <a href="#quality" className="hover:text-white transition-colors">
            Purity
          </a>
          <a href="#research" className="hover:text-white transition-colors">
            Research
          </a>
          <a href="#certificates" className="hover:text-white transition-colors">
            Certificates
          </a>
        </nav>
        <a
          href="#catalog"
          className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/10"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#2173D1] shadow-[0_0_8px_#2173D1]" />
          Researcher Access
        </a>
      </div>
    </motion.header>
  );
}
