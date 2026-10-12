import { useEffect } from "react";
import Lenis from "lenis";
import { frame, cancelFrame } from "framer-motion";

export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });

    // Expose the instance so section paging can animate with the same engine.
    (window as unknown as { __lenis?: unknown }).__lenis = lenis;

    // Drive Lenis from Framer Motion's frame loop so every
    // useScroll / useTransform value updates in the same tick
    // as the actual scroll position — no jitter, no lag.
    const update = (data: { timestamp: number }) => {
      lenis.raf(data.timestamp);
    };
    frame.update(update, true);

    // Lenis emits a native-compatible 'scroll' event on window,
    // which Framer Motion's useScroll already listens to, so
    // scroll-linked progress stays perfectly in sync.

    return () => {
      cancelFrame(update);
      delete (window as unknown as { __lenis?: unknown }).__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}
