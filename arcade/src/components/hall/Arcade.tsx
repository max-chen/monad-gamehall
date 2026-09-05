import { useEffect, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { CoinFlip } from "./CoinFlip";
import { Rps } from "./Rps";
import { useHall } from "@/lib/hall/store";
import { EXPLORER, fetchHouseBalance } from "@/lib/hall/chain";
import { COIN_LABEL, RPS_LABEL, outcomeCopy, type RpsMove } from "@/lib/hall/rules";
import { cn } from "@/lib/cn";

export function Arcade() {
  const chips = useHall((s) => s.chips);
  const rounds = useHall((s) => s.rounds);
  const resetBank = useHall((s) => s.resetBank);
  const [pot, setPot] = useState<number | null>(null);
  const [potErr, setPotErr] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [chipKey, setChipKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetchHouseBalance().then((v) => {
        if (!alive) return;
        if (v === null) setPotErr(true);
        else {
          setPotErr(false);
          setPot(v);
        }
      });
    };
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  function onFeel(kind: "win" | "lose") {
    setChipKey((k) => k + 1);
    if (kind === "lose") {
      setShaking(false);
      requestAnimationFrame(() => setShaking(true));
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="stamp text-xs">课间十分钟</p>
          <h1 className="mt-4 font-display text-5xl tracking-wide sm:text-6xl">童年游戏厅</h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            作文簿上开的两张台：掷硬币、剪刀石头布。弹珠先玩，规则跟链上一样。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn("sticker px-4 py-3", shaking && "hall-shake")}
            onAnimationEnd={(e) => {
              if (e.animationName === "hall-shake") setShaking(false);
            }}
          >
            <p className="text-xs text-muted">弹珠币</p>
            <p className={cn("font-display text-3xl tabular-nums", chipKey > 0 && "chip-pop")} key={chipKey}>
              {chips.toFixed(3)}
            </p>
          </div>
          <button
            type="button"
            onClick={resetBank}
            className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-dashed border-fg/20 px-3 text-sm text-muted"
          >
            <RotateCcw className="size-4" />
            再发一把
          </button>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="糖罐奖池"
          value={pot === null ? (potErr ? "暂时看不见" : "数糖中") : `${pot.toFixed(3)} MON`}
        />
        <Stat label="一颗弹珠 / 一把梭" value="0.01 / 0.5" />
        <Stat
          label="链上小卖部"
          value={
            <a href={EXPLORER} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
              看柜子
            </a>
          }
        />
      </section>

      <section className="grid items-start gap-5 md:grid-cols-2">
        <CoinFlip onFeel={onFeel} />
        <Rps onFeel={onFeel} />
      </section>

      {rounds.length > 0 ? (
        <section className="sticker mt-8 p-2">
          <h2 className="px-3 pt-2 font-display text-xl">作业本 · 最近对局</h2>
          <ul>
            {rounds.slice(0, 8).map((r, i) => (
              <li
                key={r.id}
                className={cn(
                  "flex items-center justify-between gap-3 border-t border-dashed border-fg/15 px-3 py-3 text-sm first:border-t-0",
                  i === 0 && "history-enter",
                )}
              >
                <span className="text-muted">
                  第{r.id}局 {r.game === "coin" ? "硬币" : "猜拳"} · 你{" "}
                  {r.game === "coin" ? COIN_LABEL[r.player as 0 | 1] : RPS_LABEL[r.player as RpsMove]}
                </span>
                <span className={r.outcome === "win" ? "font-display text-accent" : "text-muted"}>
                  {outcomeCopy(r.outcome)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="sticker px-4 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 min-h-7 font-display text-xl tabular-nums">{value}</p>
    </div>
  );
}
