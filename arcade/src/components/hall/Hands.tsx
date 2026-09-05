import type { RpsMove } from "@/lib/hall/rules";
import { cn } from "@/lib/cn";

type Pose = RpsMove | "pump";

export function Hand({
  pose,
  mirror,
  motion,
  size = "lg",
}: {
  pose: Pose;
  mirror?: boolean;
  motion?: "idle" | "pump" | "reveal";
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={cn(
        "hand-wrap inline-grid place-items-center",
        size === "lg" ? "size-20" : "size-12",
        motion === "pump" && "hand-pump",
        motion === "idle" && "hand-idle",
        motion === "reveal" && "hand-pop",
        mirror && "hand-mirror",
      )}
      aria-hidden
    >
      {pose === 1 ? <ScissorsSvg /> : pose === 2 ? <PaperSvg /> : <FistSvg />}
    </span>
  );
}

function FistSvg() {
  return (
    <svg viewBox="0 0 80 80" className="hand-svg" fill="currentColor" stroke="currentColor">
      <path
        d="M22 70c1-10 8-16 18-17h8c10 1 17 7 18 17"
        fillOpacity="0.2"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="20" y="30" width="44" height="30" rx="14" fillOpacity="0.22" strokeWidth="3" />
      <circle cx="28" cy="31" r="7" fillOpacity="0.28" strokeWidth="3" />
      <circle cx="40" cy="28" r="7" fillOpacity="0.28" strokeWidth="3" />
      <circle cx="52" cy="31" r="7" fillOpacity="0.28" strokeWidth="3" />
      <ellipse cx="22" cy="48" rx="8" ry="11" fillOpacity="0.3" strokeWidth="3" />
    </svg>
  );
}

function ScissorsSvg() {
  return (
    <svg viewBox="0 0 80 80" className="hand-svg" fill="currentColor" stroke="currentColor">
      <ellipse cx="40" cy="56" rx="18" ry="14" fillOpacity="0.22" strokeWidth="3" />
      <rect className="finger-a" x="26" y="12" width="11" height="40" rx="5.5" fillOpacity="0.28" strokeWidth="3" />
      <rect className="finger-b" x="43" y="10" width="11" height="42" rx="5.5" fillOpacity="0.28" strokeWidth="3" />
      <path d="M22 58c-2 6 2 12 10 12" fill="none" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="22" cy="50" rx="7" ry="9" fillOpacity="0.3" strokeWidth="3" />
    </svg>
  );
}

function PaperSvg() {
  return (
    <svg viewBox="0 0 80 80" className="hand-svg" fill="currentColor" stroke="currentColor">
      <ellipse cx="40" cy="58" rx="20" ry="13" fillOpacity="0.22" strokeWidth="3" />
      <rect className="finger-p" x="14" y="16" width="9" height="38" rx="4.5" fillOpacity="0.26" strokeWidth="3" />
      <rect className="finger-p" x="26" y="10" width="9" height="44" rx="4.5" fillOpacity="0.28" strokeWidth="3" />
      <rect className="finger-p" x="38" y="8" width="9" height="46" rx="4.5" fillOpacity="0.3" strokeWidth="3" />
      <rect className="finger-p" x="50" y="12" width="9" height="42" rx="4.5" fillOpacity="0.26" strokeWidth="3" />
      <rect className="finger-p" x="61" y="22" width="8" height="30" rx="4" fillOpacity="0.24" strokeWidth="3" />
    </svg>
  );
}
