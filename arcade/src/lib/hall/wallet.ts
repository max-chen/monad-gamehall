import {
  createPublicClient,
  defineChain,
  http,
  parseEther,
  formatEther,
  isAddress,
  toHex,
  encodeFunctionData,
  decodeFunctionResult,
  type Address,
  type Hex,
} from "viem";
import { CHAIN_ID, GAME_HALL_ADDRESS, RPC } from "./chain";
import { PACK_MON } from "./rules";

const PACK = parseEther(String(PACK_MON));
const GAS_RESERVE = parseEther("0.01");
const CHAIN_HEX = "0x279f" as const;
const STALL = GAME_HALL_ADDRESS as Address;

const stallAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const monadTestnet = defineChain({
  id: CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } },
});

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  providers?: Eip1193[];
};

export class FaucetNeededError extends Error {
  faucet = true as const;
  constructor() {
    super("钱包里 MON 不够换一把弹珠。先去水龙头领测试币。");
    this.name = "FaucetNeededError";
  }
}

const NO_WALLET = "这一页没有真钱包。请安装 MetaMask，用浏览器打开本页，并切换到 Monad 测试网。";

export function getEthereum(): Eip1193 | undefined {
  if (typeof window === "undefined") return undefined;
  const injected = (window as unknown as { ethereum?: Eip1193 }).ethereum;
  if (!injected) return undefined;
  const many = injected.providers;
  if (Array.isArray(many) && many.length > 0) {
    return many.find((p) => p.isMetaMask) ?? many[0];
  }
  return injected;
}

export function explainWalletError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/open_metamask_install_page/i.test(msg)) return NO_WALLET;
  if (/reject|denied|4001/i.test(msg)) return "钱包里点了取消。";
  return msg || "链上这步没走通。";
}

function chipsKey(account: string) {
  return `hall:chips:${account.toLowerCase()}`;
}

function readChips(key: string): number {
  if (typeof localStorage === "undefined") return 0;
  const n = Number(localStorage.getItem(chipsKey(key)));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export function loadChips(account?: string | null): number {
  const guest = readChips("local");
  if (!account) return guest;
  return Math.max(guest, readChips(account));
}

export function saveChips(chips: number, account?: string | null) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(chipsKey("local"), String(chips));
  if (account) localStorage.setItem(chipsKey(account), String(chips));
}

function backedKey(account: string) {
  return `hall:backed:${account.toLowerCase()}`;
}

function readBacked(key: string): number {
  if (typeof localStorage === "undefined") return 0;
  const n = Number(localStorage.getItem(backedKey(key)));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export function loadBacked(account?: string | null): number {
  const guest = readBacked("local");
  if (!account) return guest;
  return Math.max(guest, readBacked(account));
}

export function saveBacked(backed: number, account?: string | null) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(backedKey("local"), String(backed));
  if (account) localStorage.setItem(backedKey(account), String(backed));
}

const GIFT_FLAG = "hall:gift:local";

export function hasClaimedGift(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(GIFT_FLAG) === "1";
}

export function markGiftClaimed() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(GIFT_FLAG, "1");
}

function rpc() {
  return createPublicClient({ chain: monadTestnet, transport: http(RPC) });
}

function assertNotInstallPrompt(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  if (/open_metamask_install_page/i.test(text)) throw new Error(NO_WALLET);
}

function asAccounts(raw: unknown): Address[] {
  assertNotInstallPrompt(raw);
  const list = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : [];
  return list.filter((a): a is Address => typeof a === "string" && isAddress(a));
}

function requireEth(): Eip1193 {
  const eth = getEthereum();
  if (!eth) throw new Error(NO_WALLET);
  return eth;
}

export async function connectWallet(): Promise<Address> {
  const eth = requireEth();
  const account = asAccounts(await eth.request({ method: "eth_requestAccounts" }))[0];
  if (!account) throw new Error(NO_WALLET);
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (e: unknown) {
    assertNotInstallPrompt(e);
    const code = (e as { code?: number }).code;
    if (code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_HEX,
            chainName: "Monad Testnet",
            nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
            rpcUrls: [RPC],
            blockExplorerUrls: ["https://testnet.monadscan.com"],
          },
        ],
      });
    } else if (code === 4001) {
      throw e;
    }
  }
  return account;
}

export async function peekAccounts(): Promise<Address | null> {
  const eth = getEthereum();
  if (!eth) return null;
  try {
    return asAccounts(await eth.request({ method: "eth_accounts" }))[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchWalletMon(account: Address): Promise<number> {
  const bal = await rpc().getBalance({ address: account });
  return Math.round(Number(formatEther(bal)) * 100) / 100;
}

async function sendTx(
  account: Address,
  tx: { to: Address; value?: bigint; data?: Hex },
): Promise<Hex> {
  const eth = requireEth();
  const client = rpc();
  const nonce = await client.getTransactionCount({ address: account });
  const gas = await client.estimateGas({
    account,
    to: tx.to,
    value: tx.value,
    data: tx.data,
  });
  const gasPrice = await client.getGasPrice();
  const params: Record<string, string> = {
    from: account,
    to: tx.to,
    gas: toHex(gas + gas / 5n),
    gasPrice: toHex(gasPrice),
    nonce: toHex(nonce),
    chainId: CHAIN_HEX,
  };
  if (tx.value != null && tx.value > 0n) params.value = toHex(tx.value);
  if (tx.data) params.data = tx.data;
  const hash = await eth.request({
    method: "eth_sendTransaction",
    params: [params],
  });
  assertNotInstallPrompt(hash);
  if (typeof hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    throw new Error(NO_WALLET);
  }
  return hash as Hex;
}

/** 用户地址的 MON 转到摊主地址，换同等数量弹珠。 */
export async function payStall(account: Address): Promise<number> {
  const bal = await rpc().getBalance({ address: account });
  if (bal < PACK + GAS_RESERVE) throw new FaucetNeededError();
  const hash = await sendTx(account, { to: STALL, value: PACK });
  await rpc().waitForTransactionReceipt({ hash });
  return PACK_MON;
}

async function stallOwner(): Promise<Address> {
  const data = encodeFunctionData({ abi: stallAbi, functionName: "owner" });
  const raw = await rpc().call({ to: STALL, data });
  return decodeFunctionResult({
    abi: stallAbi,
    functionName: "owner",
    data: raw.data ?? "0x",
  }) as Address;
}

/** 弹珠还给摊主后，从摊主地址把等额 MON 转回用户。 */
export async function refundFromStall(account: Address, marbles: number): Promise<void> {
  if (marbles <= 0) throw new Error("没有可退的弹珠。");
  const amount = parseEther(marbles.toFixed(2));
  const pot = await rpc().getBalance({ address: STALL });
  if (amount > pot) throw new Error("糖罐里的 MON 不够兑这些弹珠。");
  const owner = await stallOwner();
  if (owner.toLowerCase() !== account.toLowerCase()) {
    throw new Error("糖罐打款只有摊主钱包能签。弹珠先留着，换老板钱包再退。");
  }
  const data = encodeFunctionData({
    abi: stallAbi,
    functionName: "withdraw",
    args: [account, amount],
  });
  const hash = await sendTx(account, { to: STALL, data });
  await rpc().waitForTransactionReceipt({ hash });
}
