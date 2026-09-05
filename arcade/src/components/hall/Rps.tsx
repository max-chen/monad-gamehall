import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { useHall } from "@/lib/hall/store";
import { sfxClash, sfxLose, sfxWin, playDelay } from "@/lib/hall/sfx";
import {
  MIN_BET,
  RPS_LABEL,
  type Round,
  type RpsMove,
  clampBet,
  formatAmt,
  outcomeCopy,
} from "@/lib/hall/rules";
import { BetRow } from "./CoinFlip";
import { Hand } from "./Hands";

const MOVES: RpsMove[] = [0, 1, 2];

const SPARKS: { x: string; y: string }[] = [
  { x: "28px", y: "-36px" },
  { x: "-24px", y: "-32px" },
  { x: "36px", y: "8px" },
  { x: "-34px", y: "14px" },
  { x: "8px", y: "34px" },
  { x: "-12px", y: "38px" },
];

export function Rps({ onFeel }: { onFeel?: (kind: "win" | "lose") => void }) {
  const chips = useHall((s) => s.chips);
  const roll = useHall((s) => s.rollRpsMove);
  const commit = useHall((s) => s.commitRound);
  const [move, setMove] = useState<RpsMove>(0);
  const [bet, setBet] = useState(0.05);
  const [phase, setPhase] = useState<"idle" | "clash" | "reveal">("idle");
  const [clashKey, setClashKey] = useState(0);
  const [last, setLast] = useState<Round | null>(null);
  const [err, setErr] = useState("");

  async function go() {
    if (phase === "clash") return;
    setErr("");
    const rolled = roll(move, clampBet(bet, chips));
    if ("error" in rolled) {
      setErr(rolled.error);
      return;
    }
    sfxClash();
    setClashKey((k) => k + 1);
    setPhase("clash");
    await playDelay(1100);
    const res = commit(rolled);
    if ("error" in res) {
      setErr(res.error);
      setPhase("idle");
      return;
    }
    setLast(res);
    setPhase("reveal");
    if (res.outcome === "win") {
      sfxWin();
      onFeel?.("win");
    } else if (res.outcome === "lose") {
      sfxLose();
      onFeel?.("lose");
    }
  }

  const busy = phase === "clash";
  const playerPose = phase === "clash" ? "pump" : move;
  const housePose = phase === "reveal" && last ? (last.house as RpsMove) : "pump";
  const playerMotion = phase === "clash" ? "pump" : phase === "reveal" ? "reveal" : "idle";
  const houseMotion = phase === "clash" ? "pump" : phase === "reveal" ? "reveal" : "idle";

  return (
    <article className="sticker flex flex-col p-5 pt-7">
      <span className="washi washi-alt" aria-hidden />
      <header className="mb-4 flex items-end justify-between gap-3">
        <h2 className="font-display text-3xl tracking-wide">剪刀石头布</h2>
        <p className="text-xs text-muted">平手退弹珠</p>
      </header>
      <p className="mb-4 text-sm text-muted">先出手。两只拳头拍三下，再亮招。</p>

      <div className="rps-arena relative mb-4">
        <div
          key={`l${clashKey}`}
          className={cn("rps-hand rps-hand-you", phase === "clash" && "clash-left", phase === "reveal" && "reveal")}
        >
          <Hand pose={playerPose} motion={playerMotion} />
          <span className="text-xs text-muted">你</span>
        </div>
        <span className="font-display text-lg text-muted">对</span>
        <div
          key={`r${clashKey}`}
          className={cn("rps-hand rps-hand-house", phase === "clash" && "clash-right", phase === "reveal" && "reveal")}
        >
          <Hand pose={housePose} mirror motion={houseMotion} />
          <span className="text-xs text-muted">摊主</span>
        </div>
        {phase === "clash"
          ? SPARKS.map((s, i) => (
              <span
                key={i}
                className="spark"
                style={{ "--dx": s.x, "--dy": s.y } as CSSProperties}
              />
            ))
          : null}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {MOVES.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setMove(id)}
            disabled={busy}
            className={cn(
              "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 text-sm transition-colors disabled:opacity-40",
              move === id ? "border-accent bg-accent/10 text-fg" : "border-fg/15 bg-bg text-muted",
            )}
          >
            <Hand pose={id} size="sm" />
            {RPS_LABEL[id]}
          </button>
        ))}
      </div>

      <BetRow bet={bet} chips={chips} onChange={setBet} />

      <button
        type="button"
        onClick={go}
        disabled={busy || chips < MIN_BET}
        className="pressable mt-4 min-h-12 rounded-xl bg-fg px-4 font-display text-xl text-ink disabled:opacity-40"
      >
        {busy ? "石头剪刀布…" : "出招"}
      </button>

      <p className="status-slot" aria-live="polite">
        {err ? (
          err
        ) : last && phase === "reveal" ? (
          <>
            你 {RPS_LABEL[last.player as RpsMove]} · 摊 {RPS_LABEL[last.house as RpsMove]} ·{" "}
            <span className="font-display text-accent">{outcomeCopy(last.outcome)}</span>
            {last.payout > 0 ? <span className="ml-2 font-display font-extrabold">+{formatAmt(last.payout)}</span> : null}
          </>
        ) : (
          <span className="text-muted">{busy ? "石头剪刀布…" : "先出手，再拍桌子"}</span>
        )}
      </p>
    </article>
  );
}
