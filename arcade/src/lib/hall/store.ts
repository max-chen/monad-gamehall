import { create } from "zustand";
import {
  START_CHIPS,
  type CoinSide,
  type Round,
  type RpsMove,
  clampBet,
  playCoin,
  playRps,
} from "./rules";

type Draft = Omit<Round, "id">;

type HallState = {
  chips: number;
  nextId: number;
  rounds: Round[];
  rollCoinFlip: (side: CoinSide, bet: number) => Draft | { error: string };
  rollRpsMove: (move: RpsMove, bet: number) => Draft | { error: string };
  commitRound: (draft: Draft) => Round | { error: string };
  resetBank: () => void;
};

function canBet(chips: number, bet: number): { bet: number } | { error: string } {
  const next = clampBet(bet, chips);
  if (chips < next) return { error: "弹珠不够啦，点右上角再发一把。" };
  return { bet: next };
}

export const useHall = create<HallState>()((set, get) => ({
  chips: START_CHIPS,
  nextId: 1,
  rounds: [],
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
    const chips = Math.round((get().chips - round.bet + round.payout) * 1e6) / 1e6;
    set({
      chips,
      nextId: round.id + 1,
      rounds: [round, ...get().rounds].slice(0, 20),
    });
    return round;
  },
  resetBank: () => set({ chips: START_CHIPS, nextId: 1, rounds: [] }),
}));