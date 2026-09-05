"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/chain";

export function ConnectBar() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];

  if (!isConnected) {
    return (
      <button
        className="rounded-full bg-[#a78bfa] px-5 py-2 text-sm font-semibold text-black"
        onClick={() => injected && connect({ connector: injected })}
        disabled={isPending || !injected}
      >
        {isPending ? "连接中..." : "连接钱包"}
      </button>
    );
  }

  const short = `${address?.slice(0, 6)}...${address?.slice(-4)}`;
  const wrong = chainId !== monadTestnet.id;

  return (
    <div className="flex items-center gap-3">
      {wrong && (
        <button
          className="rounded-full bg-[#ff6b8a] px-4 py-2 text-sm font-semibold text-black"
          onClick={() => switchChain({ chainId: monadTestnet.id })}
        >
          切换到 Monad 测试网
        </button>
      )}
      <span className="rounded-full border border-[#2a2a3d] px-3 py-1 text-xs text-[#9b97b0]">
        {short}
      </span>
      <button className="text-xs text-[#9b97b0] underline" onClick={() => disconnect()}>
        断开
      </button>
    </div>
  );
}
