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

type HallState = {
  chips: number;
  nextId: number;
  rounds: Round[];
  playCoinFlip: (side: CoinSide, bet: number) => Round | { error: string };
  playRpsMove: (move: RpsMove, bet: number) => Round | { error: string };
  resetBank: () => void;
};

function applyRound(state: HallState, draft: Omit<Round, "id">): HallState | { error: string } {
  const bet = clampBet(draft.bet, state.chips);
  if (state.chips < bet) return { error: "弹珠不够啦，点右上角再发一把。" };
  const round: Round = { ...draft, bet, id: state.nextId };
  const chips = Math.round((state.chips - bet + round.payout) * 1e6) / 1e6;
  return {
    ...state,
    chips,
    nextId: state.nextId + 1,
    rounds: [round, ...state.rounds].slice(0, 20),
  };
}

export const useHall = create<HallState>()((set, get) => ({
  chips: START_CHIPS,
  nextId: 1,
  rounds: [],
  playCoinFlip: (side, bet) => {
    const result = applyRound(get(), playCoin(side, bet));
    if ("error" in result) return result;
    set(result);
    return result.rounds[0]!;
  },
  playRpsMove: (move, bet) => {
    const result = applyRound(get(), playRps(move, bet));
    if ("error" in result) return result;
    set(result);
    return result.rounds[0]!;
  },
  resetBank: () => set({ chips: START_CHIPS, nextId: 1, rounds: [] }),
}));
