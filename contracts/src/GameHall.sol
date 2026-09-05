// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GameHall
/// @notice Monad 链上游戏厅：掷硬币、剪刀石头布（玩家 vs 庄家）
/// @dev 下注与结算至少隔 1 个区块，用 block.prevrandao 做庄家结果，避免同笔交易内被预测。
contract GameHall is Ownable, Pausable, ReentrancyGuard {
    uint16 public constant HOUSE_FEE_BPS = 200; // 2%
    uint16 public constant BPS = 10_000;

    enum GameType {
        CoinFlip,
        RPS
    }

    enum Status {
        None,
        Pending,
        Settled,
        Expired
    }

    struct Game {
        address player;
        GameType gameType;
        Status status;
        uint8 playerChoice; // Coin: 0反 1正; RPS: 0石头 1剪刀 2布
        uint8 houseChoice;
        uint8 result; // 0输 1赢 2平
        uint256 bet;
        uint256 payout;
        uint64 lockBlock;
        bytes32 commit;
    }

    uint256 public minBet;
    uint256 public maxBet;
    uint64 public settleDelayBlocks;
    uint64 public expireBlocks;
    uint256 public nextGameId;
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public lastGameId;

    event ConfigUpdated(uint256 minBet, uint256 maxBet, uint64 settleDelayBlocks, uint64 expireBlocks);
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event GamePlaced(uint256 indexed id, address indexed player, GameType gameType, uint256 bet);
    event GameSettled(
        uint256 indexed id,
        address indexed player,
        uint8 playerChoice,
        uint8 houseChoice,
        uint8 result,
        uint256 payout
    );
    event GameExpired(uint256 indexed id, address indexed player, uint256 bet);

    error InvalidChoice();
    error InvalidBet();
    error BankrollTooLow();
    error GameNotFound();
    error NotPending();
    error TooEarly();
    error NotPlayer();
    error BadCommit();
    error NotExpired();
    error TransferFailed();

    constructor(address owner_) Ownable(owner_) {
        minBet = 0.01 ether;
        maxBet = 10 ether;
        settleDelayBlocks = 1;
        expireBlocks = 300;
        emit ConfigUpdated(minBet, maxBet, settleDelayBlocks, expireBlocks);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function setConfig(uint256 minBet_, uint256 maxBet_, uint64 settleDelayBlocks_, uint64 expireBlocks_)
        external
        onlyOwner
    {
        require(minBet_ > 0 && minBet_ <= maxBet_, "bad range");
        require(expireBlocks_ > settleDelayBlocks_, "bad delay");
        minBet = minBet_;
        maxBet = maxBet_;
        settleDelayBlocks = settleDelayBlocks_;
        expireBlocks = expireBlocks_;
        emit ConfigUpdated(minBet_, maxBet_, settleDelayBlocks_, expireBlocks_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0) || amount == 0 || amount > address(this).balance) revert TransferFailed();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, amount);
    }

    /// @notice 赢局赔率：2 * bet * (1 - 2%) = 1.96 * bet
    function winPayout(uint256 bet) public pure returns (uint256) {
        return (bet * (2 * uint256(BPS) - HOUSE_FEE_BPS)) / BPS;
    }

    function placeCoinFlip(uint8 side) external payable whenNotPaused nonReentrant returns (uint256 id) {
        if (side > 1) revert InvalidChoice();
        _validateBet(msg.value);
        id = _openGame(GameType.CoinFlip, side, bytes32(0), msg.value);
    }

    /// @param commit keccak256(abi.encodePacked(uint8 move, bytes32 salt))，move: 0石头 1剪刀 2布
    function placeRPS(bytes32 commit) external payable whenNotPaused nonReentrant returns (uint256 id) {
        if (commit == bytes32(0)) revert BadCommit();
        _validateBet(msg.value);
        id = _openGame(GameType.RPS, 0, commit, msg.value);
    }

    function settleCoinFlip(uint256 id) external nonReentrant {
        Game storage g = games[id];
        if (g.player == address(0)) revert GameNotFound();
        if (g.gameType != GameType.CoinFlip) revert GameNotFound();
        if (g.status != Status.Pending) revert NotPending();
        if (block.number < uint256(g.lockBlock) + settleDelayBlocks) revert TooEarly();

        uint8 house = uint8(_entropy(id) % 2);
        g.houseChoice = house;
        uint8 res = g.playerChoice == house ? 1 : 0;
        _payout(id, g, res);
    }

    function revealRPS(uint256 id, uint8 move, bytes32 salt) external nonReentrant {
        Game storage g = games[id];
        if (g.player == address(0)) revert GameNotFound();
        if (g.gameType != GameType.RPS) revert GameNotFound();
        if (g.status != Status.Pending) revert NotPending();
        if (msg.sender != g.player) revert NotPlayer();
        if (block.number < uint256(g.lockBlock) + settleDelayBlocks) revert TooEarly();
        if (move > 2) revert InvalidChoice();
        if (keccak256(abi.encodePacked(move, salt)) != g.commit) revert BadCommit();

        g.playerChoice = move;
        uint8 house = uint8(_entropy(id) % 3);
        g.houseChoice = house;
        uint8 res;
        if (move == house) {
            res = 2;
        } else if ((move == 0 && house == 1) || (move == 1 && house == 2) || (move == 2 && house == 0)) {
            res = 1;
        } else {
            res = 0;
        }
        _payout(id, g, res);
    }

    /// @notice 超时未揭晓的猜拳，庄家收走赌注
    function expireRPS(uint256 id) external nonReentrant {
        Game storage g = games[id];
        if (g.player == address(0)) revert GameNotFound();
        if (g.gameType != GameType.RPS) revert GameNotFound();
        if (g.status != Status.Pending) revert NotPending();
        if (block.number < uint256(g.lockBlock) + expireBlocks) revert NotExpired();
        g.status = Status.Expired;
        emit GameExpired(id, g.player, g.bet);
    }

    function getGame(uint256 id) external view returns (Game memory) {
        return games[id];
    }

    function houseBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function _validateBet(uint256 bet) internal view {
        if (bet < minBet || bet > maxBet) revert InvalidBet();
        if (address(this).balance < winPayout(bet)) revert BankrollTooLow();
    }

    function _openGame(GameType t, uint8 choice, bytes32 commit, uint256 bet) internal returns (uint256 id) {
        id = ++nextGameId;
        games[id] = Game({
            player: msg.sender,
            gameType: t,
            status: Status.Pending,
            playerChoice: choice,
            houseChoice: 0,
            result: 0,
            bet: bet,
            payout: 0,
            lockBlock: uint64(block.number),
            commit: commit
        });
        lastGameId[msg.sender] = id;
        emit GamePlaced(id, msg.sender, t, bet);
    }

    function _entropy(uint256 id) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.prevrandao, block.number, id, address(this))));
    }

    function _payout(uint256 id, Game storage g, uint8 res) internal {
        g.result = res;
        g.status = Status.Settled;
        uint256 pay = 0;
        if (res == 1) {
            pay = winPayout(g.bet);
        } else if (res == 2) {
            pay = g.bet;
        }
        g.payout = pay;
        if (pay > 0) {
            (bool ok,) = payable(g.player).call{value: pay}("");
            if (!ok) revert TransferFailed();
        }
        emit GameSettled(id, g.player, g.playerChoice, g.houseChoice, res, pay);
    }
}
