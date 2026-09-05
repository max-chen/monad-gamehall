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
      <circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text
        x="50"
        y="34"
        textAnchor="middle"
        fill="currentColor"
        fontSize="20"
        fontFamily='"ZCOOL KuaiLe", Nunito, sans-serif'
      >
        字
      </text>
      <rect x="40" y="43" width="20" height="20" rx="1.2" fill="currentColor" fillOpacity="0.88" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
