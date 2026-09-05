import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monadscan", url: "https://testnet.monadscan.com" },
  },
  testnet: true,
});

export const GAME_HALL_ADDRESS = (process.env.NEXT_PUBLIC_GAME_HALL_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const PLACE_GAS = 160_000n;
export const SETTLE_GAS = 180_000n;
