import { create } from "zustand";
import type { Address } from "viem";
import {
  type CoinSide,
  type Round,
  type RpsMove,
  clampBet,
  playCoin,
  playRps,
  roundAmt,
} from "./rules";
import { saveBacked, saveChips } from "./wallet";

type Draft = Omit<Round, "id">;

type HallState = {
  chips: number;
  backed: number;
  houseWon: number;
  houseLost: number;
  nextId: number;
  rounds: Round[];
  account: Address | null;
  setChips: (chips: number) => void;
  setBacked: (backed: number) => void;
  setAccount: (account: Address | null) => void;
  rollCoinFlip: (side: CoinSide, bet: number) => Draft | { error: string };
  rollRpsMove: (move: RpsMove, bet: number) => Draft | { error: string };
  commitRound: (draft: Draft) => Round | { error: string };
};

function canBet(chips: number, bet: number): { bet: number } | { error: string } {
  const next = clampBet(bet, chips);
  if (chips < next) return { error: "弹珠不够啦，去弹珠铺用 MON 换。" };
  return { bet: next };
}

export const useHall = create<HallState>()((set, get) => ({
  chips: 0,
  backed: 0,
  houseWon: 0,
  houseLost: 0,
  nextId: 1,
  rounds: [],
  account: null,
  setChips: (chips) => {
    const next = roundAmt(chips);
    const backed = roundAmt(Math.min(get().backed, next));
    saveChips(next, get().account);
    saveBacked(backed, get().account);
    set({ chips: next, backed });
  },
  setBacked: (backed) => {
    const next = roundAmt(Math.max(0, Math.min(backed, get().chips)));
    saveBacked(next, get().account);
    set({ backed: next });
  },
  setAccount: (account) => set({ account }),
  rollCoinFlip: (side, bet) => {
    const gate = canBet(get().chips, bet);
    if ("error" in gate) return gate;
    return playCoin(side, gate.bet);
  },
  rollRpsMove: (move, bet) => {
    const gate = canBet(get().chips, bet);
    if ("error" in gate) return gate;
    return playRps(move, gate.bet);
  },
  commitRound: (draft) => {
    const gate = canBet(get().chips, draft.bet);
    if ("error" in gate) return gate;
    const round: Round = { ...draft, bet: gate.bet, id: get().nextId };
    const chips = roundAmt(get().chips - round.bet + round.payout);
    const profit = roundAmt(round.payout - round.bet);
    let houseWon = get().houseWon;
    let houseLost = get().houseLost;
    if (round.outcome === "lose") houseWon = roundAmt(houseWon + round.bet);
    if (round.outcome === "win" && profit > 0) houseLost = roundAmt(houseLost + profit);
    const backed = roundAmt(Math.min(get().backed, chips));
    set({
      chips,
      backed,
      houseWon,
      houseLost,
      nextId: round.id + 1,
      rounds: [round, ...get().rounds].slice(0, 20),
    });
    saveChips(chips, get().account);
    saveBacked(backed, get().account);
    return round;
  },
}));
