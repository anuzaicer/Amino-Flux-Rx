import { useEffect } from "react";

/**
 * One scroll gesture = one section.
 *
 * Sections are marked with `data-pager-section`. A wheel gesture at a section
 * boundary is captured and animated to the neighbouring section. Sections that
 * are taller than the viewport still scroll naturally on the inside — paging
 * only kicks in once the section's top/bottom edge is reached.
 *
 * Disabled for reduced-motion users and on touch/small screens, where native
 * momentum scrolling feels better.
 */
export function useSectionPager(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767px), (pointer: coarse)").matches) return;

    let animating = false;
    let timer: number | undefined;

    const sections = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-pager-section]"));

    const topOf = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;

    const currentIndex = () => {
      const list = sections();
      const y = window.scrollY;
      let idx = 0;
      list.forEach((el, i) => {
        if (topOf(el) <= y + 8) idx = i;
      });
      return idx;
    };

    const go = (i: number) => {
      const list = sections();
      const el = list[Math.max(0, Math.min(list.length - 1, i))];
      if (!el) return;
      animating = true;
      const target = topOf(el);
      const lenis = (
        window as unknown as { __lenis?: { scrollTo: (y: number, o?: object) => void } }
      ).__lenis;
      if (lenis) lenis.scrollTo(target, { duration: 0.9, lock: true, force: true });
      else window.scrollTo({ top: target, behavior: "smooth" });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        animating = false;
      }, 950);
    };

    const step = (dir: 1 | -1, e?: Event) => {
      const list = sections();
      const idx = currentIndex();
      const el = list[idx];
      if (!el) return;
      const top = topOf(el);
      const bottom = top + el.offsetHeight;
      const atStart = window.scrollY <= top + 8;
      const atEnd = window.scrollY + window.innerHeight >= bottom - 8;

      // Inside a tall section: let the browser scroll its contents normally.
      if (dir > 0 && !atEnd) return;
      if (dir < 0 && !atStart) return;

      e?.preventDefault();
      e?.stopPropagation();
      if (animating) return;
      go(idx + dir);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < 4) return;
      step(e.deltaY > 0 ? 1 : -1, e);
    };

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "PageDown") step(1, e);
      if (e.key === "PageUp") step(-1, e);
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
    };
  }, [enabled]);
}
