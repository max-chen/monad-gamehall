export const START_CHIPS = 2;
export const MIN_BET = 0.01;
export const MAX_BET = 0.5;
export const WIN_MULT = 1.98;
export const BET_PRESETS = [0.01, 0.05, 0.1, 0.25] as const;

export type CoinSide = 0 | 1;
export type RpsMove = 0 | 1 | 2;
export type Outcome = "lose" | "win" | "draw";
export type GameKind = "coin" | "rps";

export const COIN_LABEL = ["字", "花"] as const;
export const RPS_LABEL = ["石头", "剪刀", "布"] as const;

export type Round = {
  id: number;
  game: GameKind;
  bet: number;
  payout: number;
  outcome: Outcome;
  player: number;
  house: number;
  at: number;
};

function roll(mod: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % mod;
}

export function winPayout(bet: number): number {
  return Math.round(bet * WIN_MULT * 1e6) / 1e6;
}

export function clampBet(bet: number, chips: number): number {
  const v = Number.isFinite(bet) ? bet : MIN_BET;
  return Math.min(MAX_BET, Math.max(MIN_BET, Math.min(v, chips)));
}

export function playCoin(side: CoinSide, bet: number): Omit<Round, "id"> {
  const house = roll(2) as CoinSide;
  const outcome: Outcome = side === house ? "win" : "lose";
  const payout = outcome === "win" ? winPayout(bet) : 0;
  return { game: "coin", bet, payout, outcome, player: side, house, at: Date.now() };
}

export function playRps(move: RpsMove, bet: number): Omit<Round, "id"> {
  const house = roll(3) as RpsMove;
  let outcome: Outcome;
  if (move === house) outcome = "draw";
  else if ((move === 0 && house === 1) || (move === 1 && house === 2) || (move === 2 && house === 0))
    outcome = "win";
  else outcome = "lose";
  const payout = outcome === "win" ? winPayout(bet) : outcome === "draw" ? bet : 0;
  return { game: "rps", bet, payout, outcome, player: move, house, at: Date.now() };
}

export function outcomeCopy(outcome: Outcome): string {
  if (outcome === "win") return "赢啦";
  if (outcome === "draw") return "平手，弹珠还给你";
  return "再来一把";
}
