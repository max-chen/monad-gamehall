export const GAME_HALL_ADDRESS = "0xF2f68B3C960ee48A63cA49264564e076d5d63a70";
export const EXPLORER = `https://testnet.monadscan.com/address/${GAME_HALL_ADDRESS}`;
export const RPC = "https://testnet-rpc.monad.xyz";

export async function fetchHouseBalance(): Promise<number | null> {
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [GAME_HALL_ADDRESS, "latest"],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string };
    if (!json.result) return null;
    return Number(BigInt(json.result)) / 1e18;
  } catch {
    return null;
  }
}
