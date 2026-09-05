import { useState, type ReactNode } from "react";
import { Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHall } from "@/lib/hall/store";
import { sfxLose, sfxToss, sfxWin, waitMs } from "@/lib/hall/sfx";
import {
  BET_PRESETS,
  COIN_LABEL,
  MIN_BET,
  type CoinSide,
  type Round,
  clampBet,
  outcomeCopy,
} from "@/lib/hall/rules";

export function CoinFlip({ onFeel }: { onFeel?: (kind: "win" | "lose") => void }) {
  const chips = useHall((s) => s.chips);
  const play = useHall((s) => s.playCoinFlip);
  const [side, setSide] = useState<CoinSide>(1);
  const [bet, setBet] = useState(0.05);
  const [spinning, setSpinning] = useState(false);
  const [tossKey, setTossKey] = useState(0);
  const [land, setLand] = useState<CoinSide | null>(null);
  const [last, setLast] = useState<Round | null>(null);
  const [err, setErr] = useState("");

  async function go() {
    if (spinning) return;
    setErr("");
    const res = play(side, clampBet(bet, chips));
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    sfxToss();
    setLast(null);
    setLand(res.house as CoinSide);
    setTossKey((k) => k + 1);
    setSpinning(true);
    await waitMs(1400);
    setLast(res);
    setSpinning(false);
    if (res.outcome === "win") {
      sfxWin();
      onFeel?.("win");
    } else {
      sfxLose();
      onFeel?.("lose");
    }
  }

  const face = land;

  return (
    <article className="sticker sticker-tilt-l flex flex-col p-5 pt-7">
      <span className="washi" aria-hidden />
      <header className="mb-4 flex items-end justify-between gap-3">
        <h2 className="font-display text-3xl tracking-wide">掷硬币</h2>
        <p className="text-xs text-muted">赢了拿 1.98 倍</p>
      </header>
      <p className="mb-4 text-sm text-muted">选花还是选字。抛起来转，落地才算。</p>

      <div className="coin-scene relative mb-2">
        <div
          key={tossKey}
          className={cn(
            "coin3d",
            spinning && land === 1 && "land-heads",
            spinning && land === 0 && "land-tails",
          )}
          style={
            !spinning && face !== null
              ? { transform: face === 1 ? "rotateY(1800deg)" : "rotateY(1980deg)" }
              : undefined
          }
          aria-hidden
        >
          <div className="coin-face coin-face-front">花</div>
          <div className="coin-face coin-face-back">字</div>
        </div>
        {last && !spinning && last.payout > 0 ? (
          <p className="float-payout absolute bottom-0 font-display text-sm text-accent">+{last.payout}</p>
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <SideBtn active={side === 1} onClick={() => setSide(1)} icon={<CircleDot className="size-5" />} label="花 · 正面" />
        <SideBtn active={side === 0} onClick={() => setSide(0)} icon={<Circle className="size-5" />} label="字 · 反面" />
      </div>

      <BetRow bet={bet} chips={chips} onChange={setBet} />

      <button
        type="button"
        onClick={go}
        disabled={spinning || chips < MIN_BET}
        className="pressable mt-4 min-h-12 rounded-xl bg-accent px-4 font-display text-xl text-ink disabled:opacity-40"
      >
        {spinning ? "抛起来了…" : "投掷"}
      </button>

      {err ? <p className="mt-3 text-sm text-muted">{err}</p> : null}
      {last && !spinning ? (
        <p className="mt-3 text-sm">
          你 {COIN_LABEL[last.player as CoinSide]} · 摊 {COIN_LABEL[last.house as CoinSide]} ·{" "}
          <span className="font-display text-accent">{outcomeCopy(last.outcome)}</span>
        </p>
      ) : null}
    </article>
  );
}

function SideBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "pressable flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm font-medium",
        active ? "border-accent bg-accent/10 text-fg" : "border-fg/15 bg-bg text-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function BetRow({
  bet,
  chips,
  onChange,
}: {
  bet: number;
  chips: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted">押几颗弹珠</p>
      <div className="flex flex-wrap gap-2">
        {BET_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            disabled={chips < p}
            className={cn(
              "pressable min-h-11 rounded-xl border-2 px-3 text-sm disabled:opacity-40",
              bet === p ? "border-accent bg-accent text-ink" : "border-dashed border-fg/15 bg-bg text-fg",
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
