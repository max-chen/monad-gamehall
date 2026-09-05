import { useState, type CSSProperties } from "react";
import { FileText, Hexagon, HelpCircle, Scissors } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHall } from "@/lib/hall/store";
import { sfxClash, sfxLose, sfxWin, waitMs } from "@/lib/hall/sfx";
import {
  MIN_BET,
  RPS_LABEL,
  type Round,
  type RpsMove,
  clampBet,
  outcomeCopy,
} from "@/lib/hall/rules";
import { BetRow } from "./CoinFlip";

const MOVES: { id: RpsMove; icon: typeof Hexagon }[] = [
  { id: 0, icon: Hexagon },
  { id: 1, icon: Scissors },
  { id: 2, icon: FileText },
];

const SPARKS: { x: string; y: string }[] = [
  { x: "28px", y: "-36px" },
  { x: "-24px", y: "-32px" },
  { x: "36px", y: "8px" },
  { x: "-34px", y: "14px" },
  { x: "8px", y: "34px" },
  { x: "-12px", y: "38px" },
];

function MoveIcon({ id, className }: { id: RpsMove | null; className?: string }) {
  if (id === null) return <HelpCircle className={className} strokeWidth={1.75} />;
  const Icon = MOVES[id]!.icon;
  return <Icon className={className} strokeWidth={1.75} />;
}

export function Rps({ onFeel }: { onFeel?: (kind: "win" | "lose") => void }) {
  const chips = useHall((s) => s.chips);
  const play = useHall((s) => s.playRpsMove);
  const [move, setMove] = useState<RpsMove>(0);
  const [bet, setBet] = useState(0.05);
  const [phase, setPhase] = useState<"idle" | "clash" | "reveal">("idle");
  const [clashKey, setClashKey] = useState(0);
  const [last, setLast] = useState<Round | null>(null);
  const [err, setErr] = useState("");

  async function go() {
    if (phase === "clash") return;
    setErr("");
    const res = play(move, clampBet(bet, chips));
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    sfxClash();
    setLast(null);
    setClashKey((k) => k + 1);
    setPhase("clash");
    await waitMs(850);
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
  const houseId = phase === "reveal" && last ? (last.house as RpsMove) : null;

  return (
    <article className="sticker sticker-tilt-r flex flex-col p-5 pt-7">
      <span className="washi washi-alt" aria-hidden />
      <header className="mb-4 flex items-end justify-between gap-3">
        <h2 className="font-display text-3xl tracking-wide">剪刀石头布</h2>
        <p className="text-xs text-muted">平手退弹珠</p>
      </header>
      <p className="mb-4 text-sm text-muted">先出手。拍一下桌子，再看对方出什么。</p>

      <div className="rps-arena relative mb-4">
        <div
          key={`l${clashKey}`}
          className={cn("rps-hand", phase === "clash" && "clash-left", phase === "reveal" && "reveal")}
        >
          <MoveIcon id={move} className="size-8 text-fg" />
          <span className="mt-1 text-xs text-muted">你</span>
        </div>
        <span className="font-display text-lg text-muted">对</span>
        <div
          key={`r${clashKey}`}
          className={cn("rps-hand", phase === "clash" && "clash-right", phase === "reveal" && "reveal")}
        >
          <MoveIcon id={houseId} className="size-8 text-accent" />
          <span className="mt-1 text-xs text-muted">摊主</span>
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
        {MOVES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMove(m.id)}
              disabled={busy}
              className={cn(
                "pressable flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border-2 text-sm disabled:opacity-40",
                move === m.id ? "border-accent bg-accent/10 text-fg" : "border-dashed border-fg/15 bg-bg text-muted",
              )}
            >
              <Icon className="size-6" strokeWidth={1.75} />
              {RPS_LABEL[m.id]}
            </button>
          );
        })}
      </div>

      <BetRow bet={bet} chips={chips} onChange={setBet} />

      <button
        type="button"
        onClick={go}
        disabled={busy || chips < MIN_BET}
        className="pressable mt-4 min-h-12 rounded-xl bg-fg px-4 font-display text-xl text-ink disabled:opacity-40"
      >
        {busy ? "对撞中…" : "出招"}
      </button>

      {err ? <p className="mt-3 text-sm text-muted">{err}</p> : null}
      {last && phase === "reveal" ? (
        <p className="mt-3 text-sm">
          你 {RPS_LABEL[last.player as RpsMove]} · 摊 {RPS_LABEL[last.house as RpsMove]} ·{" "}
          <span className="font-display text-accent">{outcomeCopy(last.outcome)}</span>
          {last.payout > 0 ? (
            <span className="float-payout ml-2 font-display font-extrabold">+{last.payout}</span>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}
