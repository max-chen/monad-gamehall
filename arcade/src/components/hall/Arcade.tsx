import { useEffect, useState } from "react";
import { ArrowLeftRight, ExternalLink, Gift, Wallet } from "lucide-react";
import { CoinFlip } from "./CoinFlip";
import { Rps } from "./Rps";
import { useHall } from "@/lib/hall/store";
import { EXPLORER, FAUCET, GAME_HALL_ADDRESS, fetchHouseBalance } from "@/lib/hall/chain";
import {
  FaucetNeededError,
  connectWallet,
  explainWalletError,
  fetchWalletMon,
  hasClaimedGift,
  loadBacked,
  loadChips,
  markGiftClaimed,
  payStall,
  peekAccounts,
  refundFromStall,
} from "@/lib/hall/wallet";
import { COIN_LABEL, GIFT_MARBLES, HOUSE_MARBLES, PACK_MON, RPS_LABEL, formatAmt, outcomeCopy, roundAmt, type RpsMove } from "@/lib/hall/rules";
import { cn } from "@/lib/cn";
import type { Address } from "viem";

export function Arcade() {
  const chips = useHall((s) => s.chips);
  const backed = useHall((s) => s.backed);
  const houseWon = useHall((s) => s.houseWon);
  const houseLost = useHall((s) => s.houseLost);
  const rounds = useHall((s) => s.rounds);
  const account = useHall((s) => s.account);
  const setChips = useHall((s) => s.setChips);
  const setBacked = useHall((s) => s.setBacked);
  const setAccount = useHall((s) => s.setAccount);
  const [pot, setPot] = useState<number | null>(null);
  const [potErr, setPotErr] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [chipKey, setChipKey] = useState(0);
  const [walletMon, setWalletMon] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [stallErr, setStallErr] = useState("");
  const [gifted, setGifted] = useState(false);

  useEffect(() => {
    setChips(loadChips(null));
    setBacked(loadBacked(null));
    setGifted(hasClaimedGift());
  }, [setChips, setBacked]);

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

  useEffect(() => {
    let alive = true;
    void peekAccounts().then(async (addr) => {
      if (!alive || !addr) return;
      setAccount(addr);
      try {
        const [mon, marbles] = await Promise.all([fetchWalletMon(addr), Promise.resolve(loadChips(addr))]);
        if (!alive) return;
        setWalletMon(mon);
        setChips(Math.max(marbles, useHall.getState().chips));
        setBacked(loadBacked(addr));
        setGifted(hasClaimedGift());
      } catch {
        /* wallet RPC 偶发失败就等用户再点 */
      }
    });
    return () => {
      alive = false;
    };
  }, [setChips, setAccount]);

  function onFeel(kind: "win" | "lose") {
    setChipKey((k) => k + 1);
    if (kind === "lose") {
      setShaking(false);
      requestAnimationFrame(() => setShaking(true));
    }
  }

  async function withAccount(): Promise<Address> {
    const addr = account ?? (await connectWallet());
    setAccount(addr);
    return addr;
  }

  async function refresh(addr: Address) {
    const [mon, marbles] = await Promise.all([fetchWalletMon(addr), Promise.resolve(loadChips(addr))]);
    setWalletMon(mon);
    setChips(Math.max(marbles, useHall.getState().chips));
    setBacked(loadBacked(addr));
    setGifted(hasClaimedGift());
    setChipKey((k) => k + 1);
  }

  async function onConnect() {
    setStallErr("");
    setBusy("连钱包");
    try {
      const addr = await connectWallet();
      setAccount(addr);
      await refresh(addr);
    } catch (e) {
      setStallErr(explainWalletError(e));
    } finally {
      setBusy("");
    }
  }

  function onClaimGift() {
    setStallErr("");
    if (hasClaimedGift()) {
      setGifted(true);
      setStallErr("见面礼已经领过了。");
      return;
    }
    if (HOUSE_MARBLES - chips < GIFT_MARBLES) {
      setStallErr("摊主弹珠不够送了。");
      return;
    }
    const next = roundAmt(chips + GIFT_MARBLES);
    setChips(next);
    markGiftClaimed();
    setGifted(true);
    setChipKey((k) => k + 1);
  }

  async function onRefill() {
    setStallErr("");
    const stock = Math.max(0, HOUSE_MARBLES - chips);
    if (stock < PACK_MON) {
      setStallErr("摊主弹珠换完了。");
      return;
    }
    setBusy("换弹珠");
    try {
      const addr = await withAccount();
      const paid = await payStall(addr);
      const next = roundAmt(chips + paid);
      setChips(next);
      setBacked(roundAmt(backed + paid));
      setWalletMon(await fetchWalletMon(addr));
      setChipKey((k) => k + 1);
      void fetchHouseBalance().then((v) => {
        if (v !== null) {
          setPotErr(false);
          setPot(v);
        }
      });
    } catch (e) {
      if (e instanceof FaucetNeededError) {
        setStallErr(e.message);
        window.open(FAUCET, "_blank", "noreferrer");
      } else {
        setStallErr(explainWalletError(e));
      }
    } finally {
      setBusy("");
    }
  }

  async function onCashOut() {
    setStallErr("");
    if (backed <= 0) {
      setStallErr("见面礼不能兑 MON。只有用 MON 换来的弹珠才能退。");
      return;
    }
    setBusy("退珠");
    try {
      const addr = await withAccount();
      const amt = Math.min(backed, chips);
      await refundFromStall(addr, amt);
      setChips(roundAmt(chips - amt));
      setBacked(0);
      setWalletMon(await fetchWalletMon(addr));
      setChipKey((k) => k + 1);
      void fetchHouseBalance().then((v) => {
        if (v !== null) {
          setPotErr(false);
          setPot(v);
        }
      });
    } catch (e) {
      setStallErr(explainWalletError(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <p className="stamp text-xs">课间十分钟</p>
        <h1 className="mt-4 font-display text-5xl tracking-wide sm:text-6xl">童年游戏厅</h1>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article
          className={cn("sticker purse-you flex flex-col p-5", shaking && "hall-shake")}
          onAnimationEnd={(e) => {
            if (e.animationName === "hall-shake") setShaking(false);
          }}
        >
          <p className="purse-tag">你的口袋</p>
          <h2 className="mt-3 font-display text-2xl">课间弹珠</h2>
          <p className="mt-1 text-sm text-muted">见面礼只能玩，不能兑 MON。花 MON 换来的弹珠才能退回成 MON。</p>
          <p key={chipKey} className={cn("mt-4 font-display text-4xl tabular-nums", chipKey > 0 && "chip-pop")}>
            {formatAmt(chips)}
            <span className="ml-2 text-base text-muted">弹珠</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            可兑 MON {formatAmt(backed)}
            {account
              ? ` · 钱包 ${walletMon === null ? "…" : formatAmt(walletMon)} MON · ${shortAddr(account)}`
              : " · 还没连钱包"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!account ? (
              <button
                type="button"
                onClick={() => void onConnect()}
                disabled={Boolean(busy)}
                className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl bg-fg px-3 text-sm text-ink disabled:opacity-40"
              >
                <Wallet className="size-4" />
                {busy === "连钱包" ? "连着…" : "连钱包"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void onCashOut()}
              disabled={Boolean(busy) || backed <= 0}
              className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-fg/20 px-3 text-sm disabled:opacity-40"
            >
              <ArrowLeftRight className="size-4" />
              {busy === "退珠" ? "退着…" : "退回弹珠 · 兑 MON"}
            </button>
          </div>
          {stallErr ? <p className="mt-3 text-sm text-accent">{stallErr}</p> : null}
        </article>

        <article className="sticker purse-house flex flex-col p-5">
          <p className="purse-tag purse-tag-house">摊主柜子</p>
          <h2 className="mt-3 font-display text-2xl">弹珠账</h2>
          <p className="mt-1 text-sm text-muted">你赢从库存扣。你输回库存、记摊主赢。换珠时 MON 打进摊主地址。</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted">总弹珠</p>
              <p className="font-display text-2xl tabular-nums">{HOUSE_MARBLES}</p>
            </div>
            <div>
              <p className="text-xs text-muted">弹珠库存</p>
              <p className="font-display text-2xl tabular-nums">{formatAmt(Math.max(0, HOUSE_MARBLES - chips))}</p>
            </div>
            <div>
              <p className="text-xs text-muted">摊主赢</p>
              <p className="font-display text-2xl tabular-nums text-accent">{formatAmt(houseWon)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">摊主输</p>
              <p className="font-display text-2xl tabular-nums">{formatAmt(houseLost)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            糖罐 {pot === null ? (potErr ? "—" : "…") : formatAmt(pot)} MON · {shortAddr(GAME_HALL_ADDRESS)}
          </p>
          <a
            href={EXPLORER}
            target="_blank"
            rel="noreferrer"
            className="pressable mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-fg px-3 text-sm text-ink"
          >
            打开糖罐
            <ExternalLink className="size-4" />
          </a>
        </article>
      </section>

      <aside className="sticker mb-8 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-xl">弹珠铺</p>
          <p className="mt-1 max-w-xl text-sm text-muted">
            摊主先送 {GIFT_MARBLES} 颗，点领取就进口袋，不用钱包。见面礼不能兑 MON；用 MON 换来的才能退。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!gifted ? (
            <button
              type="button"
              onClick={onClaimGift}
              disabled={Boolean(busy)}
              className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm text-ink disabled:opacity-40"
            >
              <Gift className="size-4" />
              {`找摊主领取 · ${GIFT_MARBLES} 弹珠`}
            </button>
          ) : (
            <p className="self-center text-xs text-muted">见面礼已领</p>
          )}
          <a
            href={FAUCET}
            target="_blank"
            rel="noreferrer"
            className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-fg/20 px-4 text-sm"
          >
            领测试 MON
            <ExternalLink className="size-4" />
          </a>
          <button
            type="button"
            onClick={() => void onRefill()}
            disabled={Boolean(busy)}
            className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl bg-fg px-4 text-sm text-ink disabled:opacity-40"
          >
            {busy === "换弹珠" ? "转着…" : `用 MON 换弹珠 · ${PACK_MON}`}
          </button>
        </div>
      </aside>

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

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
