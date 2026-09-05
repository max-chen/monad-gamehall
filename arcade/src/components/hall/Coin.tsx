import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { CoinSide } from "@/lib/hall/rules";

const LAYERS = Array.from({ length: 14 }, (_, i) => i);

export function Coin3D({
  spinning,
  land,
}: {
  spinning: boolean;
  land: CoinSide | null;
}) {
  const rest =
    land === 0
      ? "rotateY(1980deg) rotateX(12deg)"
      : land === 1
        ? "rotateY(1800deg) rotateX(12deg)"
        : "rotateY(-28deg) rotateX(12deg)";

  return (
    <div
      className={cn(
        "coin3d",
        spinning && land === 1 && "land-heads",
        spinning && land === 0 && "land-tails",
      )}
      style={!spinning ? { transform: rest } : undefined}
      aria-hidden
    >
      <div className="coin-face coin-face-front">
        <span className="coin-mill" />
        <span className="coin-plate">
          <FlowerMark />
        </span>
      </div>
      {LAYERS.map((i) => (
        <span
          key={i}
          className="coin-layer"
          style={{ transform: `translateZ(${(i - 6.5) * 1.1}px)` } as CSSProperties}
        />
      ))}
      <div className="coin-face coin-face-back">
        <span className="coin-mill" />
        <span className="coin-plate coin-plate-tails">
          <WordMark />
        </span>
      </div>
    </div>
  );
}

export function CoinThumb({ side }: { side: CoinSide }) {
  return (
    <span className={cn("coin-thumb", side === 0 && "coin-thumb-tails")} aria-hidden>
      <span className="coin-mill" />
      <span className="coin-plate">{side === 1 ? <FlowerMark /> : <WordMark />}</span>
    </span>
  );
}

function FlowerMark() {
  return (
    <svg viewBox="0 0 100 100" className="coin-mark">
      <circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 4" />
      <g transform="translate(50 50)">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse
            key={deg}
            transform={`rotate(${deg})`}
            cx="0"
            cy="-12"
            rx="8.5"
            ry="15"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="2.3"
          />
        ))}
        <circle r="7.5" fill="currentColor" fillOpacity="0.32" stroke="currentColor" strokeWidth="2.3" />
      </g>
    </svg>
  );
}

function WordMark() {
  return (
    <svg viewBox="0 0 100 100" className="coin-mark">
      <circle cx="50" cy="50" r="37.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="50" cy="50" r="32.8" fill="none" stroke="currentColor" strokeWidth="1.15" />
      <circle
        cx="50"
        cy="50"
        r="30.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeDasharray="1.6 2.8"
        opacity="0.55"
      />

      <g fill="currentColor" opacity="0.55">
        <circle cx="19.5" cy="50" r="1.7" />
        <circle cx="80.5" cy="50" r="1.7" />
      </g>

      <g transform="translate(50 50)">
        <rect
          x="-10"
          y="-10"
          width="20"
          height="20"
          rx="0.4"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="2.4"
        />
        <rect x="-6.8" y="-6.8" width="13.6" height="13.6" rx="0.2" fill="none" stroke="currentColor" strokeWidth="1.15" />
        <path
          d="M-10 6.5 V-10 H6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.28"
          strokeLinecap="square"
        />
      </g>

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M50 13.5 V19" />
        <path d="M32 22.5 H68" />
        <path d="M34.5 22.5 V27.5" />
        <path d="M65.5 22.5 V27.5" />
        <path d="M37 30.5 H63" />
        <path d="M50 30.5 V37.5" />
        <path d="M39.5 35.5 H60.5" />
      </g>

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.8"
      >
        <path d="M34 78.5 Q50 85 66 78.5" />
        <path d="M38 82.2 Q50 87 62 82.2" />
      </g>
    </svg>
  );
}
