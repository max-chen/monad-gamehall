import { useState } from "react";
import { cn } from "@/lib/cn";
import { useHall } from "@/lib/hall/store";
import { sfxLose, sfxToss, sfxWin, playDelay } from "@/lib/hall/sfx";
import {
  BET_PRESETS,
  COIN_LABEL,
  MIN_BET,
  type CoinSide,
  type Round,
  clampBet,
  formatAmt,
  outcomeCopy,
} from "@/lib/hall/rules";
import { Coin3D, CoinThumb } from "./Coin";

export function CoinFlip({ onFeel }: { onFeel?: (kind: "win" | "lose") => void }) {
  const chips = useHall((s) => s.chips);
  const roll = useHall((s) => s.rollCoinFlip);
  const commit = useHall((s) => s.commitRound);
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
    const rolled = roll(side, clampBet(bet, chips));
    if ("error" in rolled) {
      setErr(rolled.error);
      return;
    }
    sfxToss();
    setLand(rolled.house as CoinSide);
    setTossKey((k) => k + 1);
    setSpinning(true);
    await playDelay(1400);
    const res = commit(rolled);
    if ("error" in res) {
      setErr(res.error);
      setSpinning(false);
      return;
    }
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

  return (
    <article className="sticker flex flex-col p-5 pt-7">
      <span className="washi" aria-hidden />
      <header className="mb-4 flex items-end justify-between gap-3">
        <h2 className="font-display text-3xl tracking-wide">掷硬币</h2>
        <p className="text-xs text-muted">赢了拿 1.96 倍</p>
      </header>
      <p className="mb-4 text-sm text-muted">选花还是选字。抛起来转，落地才算。</p>

      <div className="coin-scene relative mb-3">
        <Coin3D key={tossKey} spinning={spinning} land={land} />
        <button
          type="button"
          onClick={go}
          disabled={spinning || chips < MIN_BET}
          className="coin-hit"
          aria-label={spinning ? "抛起来了" : "投掷硬币"}
        />
        {last && !spinning && last.payout > 0 ? (
          <p className="float-payout pointer-events-none absolute bottom-0 font-display text-sm text-accent">+{formatAmt(last.payout)}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={go}
        disabled={spinning || chips < MIN_BET}
        className="pressable mb-4 min-h-12 rounded-xl bg-accent px-4 font-display text-xl text-ink disabled:opacity-40"
      >
        {spinning ? "抛起来了…" : "投掷"}
      </button>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <SideBtn active={side === 1} onClick={() => setSide(1)} side={1} label="花 · 正面" />
        <SideBtn active={side === 0} onClick={() => setSide(0)} side={0} label="字 · 反面" />
      </div>

      <BetRow bet={bet} chips={chips} onChange={setBet} />

      <p className="status-slot" aria-live="polite">
        {err ? err : last && !spinning ? (
          <>
            你 {COIN_LABEL[last.player as CoinSide]} · 摊 {COIN_LABEL[last.house as CoinSide]} ·{" "}
            <span className="font-display text-accent">{outcomeCopy(last.outcome)}</span>
            <span className="ml-2 tabular-nums">
              {last.outcome === "win" ? `+${formatAmt(last.payout)}` : `−${formatAmt(last.bet)}`}
            </span>
          </>
        ) : (
          <span className="text-muted">{spinning ? "抛起来了…" : "点硬币，抛一下"}</span>
        )}
      </p>
    </article>
  );
}

function SideBtn({
  active,
  onClick,
  side,
  label,
}: {
  active: boolean;
  onClick: () => void;
  side: CoinSide;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 flex-row items-center justify-center gap-2 rounded-xl border-2 text-sm font-medium transition-colors",
        active ? "border-accent bg-accent/10 text-fg" : "border-fg/15 bg-bg text-muted",
      )}
    >
      <CoinThumb side={side} />
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
      <div className="bet-grid">
        {BET_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            disabled={chips < p}
            aria-pressed={bet === p}
            className="bet-chip"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
