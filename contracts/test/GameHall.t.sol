// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {GameHall} from "../src/GameHall.sol";

contract GameHallTest is Test {
    GameHall internal hall;
    address internal owner = address(0xA11CE);
    address internal player = address(0xB0B);

    function setUp() public {
        hall = new GameHall(owner);
        vm.deal(owner, 100 ether);
        vm.deal(player, 100 ether);
        vm.prank(owner);
        (bool ok,) = address(hall).call{value: 50 ether}("");
        assertTrue(ok);
    }

    function testPlaceAndSettleCoinFlip() public {
        vm.prank(player);
        uint256 id = hall.placeCoinFlip{value: 1 ether}(1);
        assertEq(id, 1);

        vm.expectRevert(GameHall.TooEarly.selector);
        hall.settleCoinFlip(id);

        vm.roll(block.number + 1);
        hall.settleCoinFlip(id);

        GameHall.Game memory g = hall.getGame(id);
        assertEq(uint256(g.status), uint256(GameHall.Status.Settled));
        assertTrue(g.result <= 1);
        if (g.result == 1) {
            assertEq(g.payout, hall.winPayout(1 ether));
        } else {
            assertEq(g.payout, 0);
        }
    }

    function testRpsCommitRevealDrawOrWinOrLose() public {
        uint8 move = 0;
        bytes32 salt = keccak256("salt");
        bytes32 commit = keccak256(abi.encodePacked(move, salt));

        vm.prank(player);
        uint256 id = hall.placeRPS{value: 1 ether}(commit);

        vm.expectRevert(GameHall.TooEarly.selector);
        vm.prank(player);
        hall.revealRPS(id, move, salt);

        vm.roll(block.number + 2);
        vm.prank(player);
        hall.revealRPS(id, move, salt);

        GameHall.Game memory g = hall.getGame(id);
        assertEq(uint256(g.status), uint256(GameHall.Status.Settled));
        assertEq(g.playerChoice, move);
        assertTrue(g.houseChoice <= 2);
    }

    function testBadCommitReverts() public {
        bytes32 commit = keccak256(abi.encodePacked(uint8(0), bytes32(uint256(1))));
        vm.prank(player);
        uint256 id = hall.placeRPS{value: 1 ether}(commit);
        vm.roll(block.number + 2);
        vm.prank(player);
        vm.expectRevert(GameHall.BadCommit.selector);
        hall.revealRPS(id, 0, bytes32(uint256(2)));
    }

    function testInvalidBet() public {
        vm.prank(player);
        vm.expectRevert(GameHall.InvalidBet.selector);
        hall.placeCoinFlip{value: 0.001 ether}(0);
    }

    function testExpireRps() public {
        bytes32 commit = keccak256(abi.encodePacked(uint8(1), bytes32(uint256(9))));
        vm.prank(player);
        uint256 id = hall.placeRPS{value: 1 ether}(commit);
        vm.expectRevert(GameHall.NotExpired.selector);
        hall.expireRPS(id);
        vm.roll(block.number + 301);
        hall.expireRPS(id);
        GameHall.Game memory g = hall.getGame(id);
        assertEq(uint256(g.status), uint256(GameHall.Status.Expired));
    }

    function testWinPayout() public view {
        assertEq(hall.winPayout(100 ether), 198 ether);
    }
}
