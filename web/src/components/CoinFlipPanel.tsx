"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem/utils";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { GAME_HALL_ADDRESS, PLACE_GAS, SETTLE_GAS } from "@/lib/chain";
import { gameHallAbi } from "@/lib/gameHallAbi";
import { resultText } from "@/lib/rps";

export function CoinFlipPanel() {
  const { address, isConnected } = useAccount();
  const [side, setSide] = useState<0 | 1>(1);
  const [bet, setBet] = useState("0.05");
  const [gameId, setGameId] = useState<bigint | null>(null);
  const [step, setStep] = useState<"idle" | "placing" | "settle" | "done">("idle");
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  const game = useReadContract({
    address: GAME_HALL_ADDRESS,
    abi: gameHallAbi,
    functionName: "getGame",
    args: gameId ? [gameId] : undefined,
    query: { enabled: gameId !== null, refetchInterval: 1200 },
  });

  async function play() {
    if (!isConnected) return;
    setStep("placing");
    try {
      const hash = await writeContractAsync({
        address: GAME_HALL_ADDRESS,
        abi: gameHallAbi,
        functionName: "placeCoinFlip",
        args: [side],
        value: parseEther(bet),
        gas: PLACE_GAS,
      });
      setTxHash(hash);
      const id = await waitLastId(address!);
      setGameId(id);
      setStep("settle");
      await new Promise((r) => setTimeout(r, 1200));
      const settleHash = await writeContractAsync({
        address: GAME_HALL_ADDRESS,
        abi: gameHallAbi,
        functionName: "settleCoinFlip",
        args: [id],
        gas: SETTLE_GAS,
      });
      setTxHash(settleHash);
      setStep("done");
    } catch (e) {
      console.error(e);
      setStep("idle");
      alert(e instanceof Error ? e.message : "交易失败");
    }
  }

  const g = game.data as
    | {
        player: `0x${string}`;
        playerChoice: number;
        houseChoice: number;
        result: number;
        bet: bigint;
        payout: bigint;
        status: number;
      }
    | undefined;

  return (
    <div className="hall-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black">掷硬币</h2>
        <span className="text-xs text-[#9b97b0]">赢了拿 1.98 倍</span>
      </div>
      <p className="mb-5 text-sm text-[#9b97b0]">
        选正反面下注。链上隔一个区块后用 prevrandao 开奖，庄家抽 2%。
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <button className={`pick rounded-2xl py-8 text-2xl ${side === 1 ? "active" : ""}`} onClick={() => setSide(1)}>
          正面
        </button>
        <button className={`pick rounded-2xl py-8 text-2xl ${side === 0 ? "active" : ""}`} onClick={() => setSide(0)}>
          反面
        </button>
      </div>
      <label className="mb-2 block text-xs text-[#9b97b0]">下注金额（MON）</label>
      <input
        className="mb-4 w-full rounded-xl border border-[#2a2a3d] bg-[#0d0d14] px-4 py-3 outline-none"
        value={bet}
        onChange={(e) => setBet(e.target.value)}
      />
      <button
        className="w-full rounded-xl bg-[#c6f25b] py-3 font-bold text-black disabled:opacity-50"
        onClick={play}
        disabled={!isConnected || step === "placing" || step === "settle"}
      >
        {step === "placing" ? "下注中..." : step === "settle" ? "开奖中..." : "投掷"}
      </button>
      {gameId !== null && (
        <div className="mt-5 rounded-xl border border-[#2a2a3d] p-4 text-sm">
          <div>局号 #{gameId.toString()}</div>
          {g && g.status === 2 && (
            <div className="mt-2 text-lg font-bold">
              你：{g.playerChoice === 1 ? "正面" : "反面"} ／ 庄：
              {g.houseChoice === 1 ? "正面" : "反面"}
              <div className="mt-1 text-[#c6f25b]">{resultText(g.result)}</div>
              <div className="text-xs text-[#9b97b0]">赔付 {formatEther(g.payout)} MON</div>
            </div>
          )}
          {receipt.isLoading && <div className="mt-2 text-xs text-[#9b97b0]">等待交易确认...</div>}
        </div>
      )}
    </div>
  );
}

async function waitLastId(player: `0x${string}`): Promise<bigint> {
  const { createPublicClient, http } = await import("viem");
  const { monadTestnet } = await import("@/lib/chain");
  const { GAME_HALL_ADDRESS } = await import("@/lib/chain");
  const { gameHallAbi } = await import("@/lib/gameHallAbi");
  const client = createPublicClient({ chain: monadTestnet, transport: http() });
  for (let i = 0; i < 20; i++) {
    const id = (await client.readContract({
      address: GAME_HALL_ADDRESS,
      abi: gameHallAbi,
      functionName: "lastGameId",
      args: [player],
    })) as bigint;
    if (id > 0n) return id;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("读取局号超时");
}
