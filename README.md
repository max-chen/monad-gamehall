# Monad 链上游戏厅

两个小游戏，都在 Monad 测试网（chainId `10143`）上结算：

1. **掷硬币**：选正面 / 反面，下注后隔 1 个区块开奖。
2. **剪刀石头布**：先提交招式哈希，再揭晓。平局退本金。

赢局赔付 `1.98 × 下注`（从 2 倍里抽 2%）。庄家资金池用合约余额支付。

## 目录

```
contracts/   Foundry 合约
web/         Next.js + Wagmi 前端
```

## 合约

```bash
cd contracts
forge test
```

部署到 Monad 测试网（用你自己的私钥，不要发给任何人）：

```bash
cd contracts
forge script script/DeployGameHall.s.sol:DeployGameHall \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --private-key $PRIVATE_KEY
```

部署后给合约转一些 MON 做资金池，否则会报 `BankrollTooLow`。

水龙头：https://faucet.monad.xyz

## 前端

```bash
cd web
cp .env.example .env.local
# 填入已部署的合约地址
npm install
npm run dev
```

钱包网络：

- RPC：`https://testnet-rpc.monad.xyz`
- Chain ID：`10143`
- 符号：`MON`
- 浏览器：https://testnet.monadscan.com

## 规则

| 游戏 | 玩家操作 | 庄家结果 | 结算 |
| --- | --- | --- | --- |
| 掷硬币 | `placeCoinFlip(0或1)` | `prevrandao % 2` | 任何人可 `settleCoinFlip` |
| 猜拳 | `placeRPS(commit)` → `revealRPS` | `prevrandao % 3` | 仅玩家揭晓；超时可 `expireRPS` |

石头=0，剪刀=1，布=2。commit = `keccak256(abi.encodePacked(move, salt))`。
