"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { GAME_HALL_ADDRESS, PLACE_GAS, SETTLE_GAS } from "@/lib/chain";
import { gameHallAbi } from "@/lib/gameHallAbi";
import { RPS_MOVES, randomSalt, resultText, rpsCommit } from "@/lib/rps";

export function RpsPanel() {
  const { address, isConnected } = useAccount();
  const [move, setMove] = useState(0);
  const [bet, setBet] = useState("0.05");
  const [gameId, setGameId] = useState<bigint | null>(null);
  const [step, setStep] = useState<"idle" | "placing" | "reveal" | "done">("idle");
  const { writeContractAsync } = useWriteContract();

  const game = useReadContract({
    address: GAME_HALL_ADDRESS,
    abi: gameHallAbi,
    functionName: "getGame",
    args: gameId ? [gameId] : undefined,
    query: { enabled: gameId !== null, refetchInterval: 1200 },
  });

  async function play() {
    if (!isConnected || !address) return;
    setStep("placing");
    try {
      const salt = randomSalt();
      const commit = rpsCommit(move, salt);
      const hash = await writeContractAsync({
        address: GAME_HALL_ADDRESS,
        abi: gameHallAbi,
        functionName: "placeRPS",
        args: [commit],
        value: parseEther(bet),
        gas: PLACE_GAS,
      });
      void hash;
      const { createPublicClient, http } = await import("viem");
      const { monadTestnet } = await import("@/lib/chain");
      const client = createPublicClient({ chain: monadTestnet, transport: http() });
      let id = 0n;
      for (let i = 0; i < 20; i++) {
        id = (await client.readContract({
          address: GAME_HALL_ADDRESS,
          abi: gameHallAbi,
          functionName: "lastGameId",
          args: [address],
        })) as bigint;
        if (id > 0n) break;
        await new Promise((r) => setTimeout(r, 400));
      }
      if (id === 0n) throw new Error("读取局号超时");
      setGameId(id);
      setStep("reveal");
      await new Promise((r) => setTimeout(r, 1200));
      await writeContractAsync({
        address: GAME_HALL_ADDRESS,
        abi: gameHallAbi,
        functionName: "revealRPS",
        args: [id, move, salt],
        gas: SETTLE_GAS,
      });
      setStep("done");
    } catch (e) {
      console.error(e);
      setStep("idle");
      alert(e instanceof Error ? e.message : "交易失败");
    }
  }

  const g = game.data as
    | {
        playerChoice: number;
        houseChoice: number;
        result: number;
        payout: bigint;
        status: number;
      }
    | undefined;

  return (
    <div className="hall-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black">剪刀石头布</h2>
        <span className="text-xs text-[#9b97b0]">提交-揭晓，防抢跑</span>
      </div>
      <p className="mb-5 text-sm text-[#9b97b0]">
        先提交招式哈希，隔一个区块再揭晓。庄家招式来自结算区块的随机数。平局退本金。
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {RPS_MOVES.map((m) => (
          <button
            key={m.id}
            className={`pick rounded-2xl py-6 text-center ${move === m.id ? "active" : ""}`}
            onClick={() => setMove(m.id)}
          >
            <div className="text-3xl">{m.emoji}</div>
            <div className="mt-2 text-sm">{m.label}</div>
          </button>
        ))}
      </div>
      <label className="mb-2 block text-xs text-[#9b97b0]">下注金额（MON）</label>
      <input
        className="mb-4 w-full rounded-xl border border-[#2a2a3d] bg-[#0d0d14] px-4 py-3 outline-none"
        value={bet}
        onChange={(e) => setBet(e.target.value)}
      />
      <button
        className="w-full rounded-xl bg-[#a78bfa] py-3 font-bold text-black disabled:opacity-50"
        onClick={play}
        disabled={!isConnected || step === "placing" || step === "reveal"}
      >
        {step === "placing" ? "提交中..." : step === "reveal" ? "揭晓中..." : "出招"}
      </button>
      {gameId !== null && (
        <div className="mt-5 rounded-xl border border-[#2a2a3d] p-4 text-sm">
          <div>局号 #{gameId.toString()}</div>
          {g && g.status === 2 && (
            <div className="mt-2 text-lg font-bold">
              你：{RPS_MOVES[g.playerChoice]?.emoji} ／ 庄：{RPS_MOVES[g.houseChoice]?.emoji}
              <div className="mt-1 text-[#c6f25b]">{resultText(g.result)}</div>
              <div className="text-xs text-[#9b97b0]">赔付 {formatEther(g.payout)} MON</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
