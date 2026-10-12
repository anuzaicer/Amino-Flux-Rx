import { motion } from "framer-motion";

export function MolecularBackground({ density = 18 }: { density?: number }) {
  const nodes = Array.from({ length: density }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    r: Math.random() * 2 + 1.2,
    d: Math.random() * 6 + 4,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-70" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="node-g">
            <stop offset="0%" stopColor="#92C763" stopOpacity="1" />
            <stop offset="100%" stopColor="#5C9330" stopOpacity="0" />
          </radialGradient>
        </defs>
        {nodes.map((n, i) =>
          nodes
            .slice(i + 1, i + 3)
            .map((m, j) => (
              <line
                key={`${n.id}-${j}`}
                x1={n.x}
                y1={n.y}
                x2={m.x}
                y2={m.y}
                stroke="#92C763"
                strokeOpacity="0.16"
                strokeWidth="0.08"
              />
            )),
        )}
        {nodes.map((n) => (
          <motion.circle
            key={n.id}
            cx={n.x}
            cy={n.y}
            r={n.r * 0.3}
            fill="url(#node-g)"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: n.d, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
      <div className="absolute -top-40 left-1/3 h-[380px] w-[380px] rounded-full bg-[#5C9330] opacity-[0.10] blur-[140px] animate-pulse-glow" />
      <div className="absolute bottom-0 right-1/4 h-[320px] w-[320px] rounded-full bg-[#92C763] opacity-[0.10] blur-[140px] animate-pulse-glow" />
    </div>
  );
}
