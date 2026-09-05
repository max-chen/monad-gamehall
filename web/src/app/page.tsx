"use client";

import { formatEther } from "viem/utils";
import { useReadContract } from "wagmi";
import { ConnectBar } from "@/components/ConnectBar";
import { CoinFlipPanel } from "@/components/CoinFlipPanel";
import { RpsPanel } from "@/components/RpsPanel";
import { GAME_HALL_ADDRESS } from "@/lib/chain";
import { gameHallAbi } from "@/lib/gameHallAbi";

export default function Home() {
  const configured = GAME_HALL_ADDRESS !== "0x0000000000000000000000000000000000000000";
  const bank = useReadContract({
    address: GAME_HALL_ADDRESS,
    abi: gameHallAbi,
    functionName: "houseBalance",
    query: { enabled: configured, refetchInterval: 4000 },
  });
  const minBet = useReadContract({
    address: GAME_HALL_ADDRESS,
    abi: gameHallAbi,
    functionName: "minBet",
    query: { enabled: configured },
  });
  const maxBet = useReadContract({
    address: GAME_HALL_ADDRESS,
    abi: gameHallAbi,
    functionName: "maxBet",
    query: { enabled: configured },
  });

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.3em] text-[#a78bfa]">MONAD TESTNET</p>
          <h1 className="mt-1 text-4xl font-black">链上游戏厅</h1>
          <p className="mt-2 text-sm text-[#9b97b0]">两个小游戏，下注与开奖都在链上完成。</p>
        </div>
        <ConnectBar />
      </header>

      {!configured && (
        <div className="mb-6 rounded-2xl border border-[#ff6b8a]/40 bg-[#2a1018] p-4 text-sm">
          还没填合约地址。部署后把地址写入 web/.env.local 的 NEXT_PUBLIC_GAME_HALL_ADDRESS。
        </div>
      )}

      <section className="mb-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="庄家资金池" value={bank.data !== undefined ? `${formatEther(bank.data as bigint)} MON` : "—"} />
        <Stat label="最小下注" value={minBet.data !== undefined ? `${formatEther(minBet.data as bigint)} MON` : "—"} />
        <Stat label="最大下注" value={maxBet.data !== undefined ? `${formatEther(maxBet.data as bigint)} MON` : "—"} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <CoinFlipPanel />
        <RpsPanel />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hall-card px-4 py-4">
      <div className="text-xs text-[#9b97b0]">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
