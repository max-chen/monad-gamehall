import { encodePacked, keccak256, toHex } from "viem";

export const RPS_MOVES = [
  { id: 0, label: "石头", emoji: "✊" },
  { id: 1, label: "剪刀", emoji: "✌️" },
  { id: 2, label: "布", emoji: "🖐️" },
] as const;

export function randomSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function rpsCommit(move: number, salt: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(["uint8", "bytes32"], [move, salt]));
}

export function resultText(result: number): string {
  if (result === 1) return "你赢了";
  if (result === 2) return "平局";
  return "庄家赢";
}
