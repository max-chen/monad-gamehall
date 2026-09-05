// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title MarbleTeller
/// @notice 摊主兑珠铺：MON 1:1 换成弹珠；输掉的弹珠打进糖罐。
contract MarbleTeller {
    address public constant HOUSE = 0xF2f68B3C960ee48A63cA49264564e076d5d63a70;

    event Bought(address indexed player, uint256 amount, uint256 balance);
    event Cashed(address indexed player, uint256 amount);
    event Forfeited(address indexed player, uint256 amount, uint256 balance);

    mapping(address => uint256) public marbles;

    function buy() external payable {
        require(msg.value > 0, "no MON");
        marbles[msg.sender] += msg.value;
        emit Bought(msg.sender, msg.value, marbles[msg.sender]);
    }

    function forfeit(uint256 amount) external {
        require(amount > 0, "no amount");
        uint256 held = marbles[msg.sender];
        require(held >= amount, "not enough");
        marbles[msg.sender] = held - amount;
        (bool ok,) = payable(HOUSE).call{value: amount}("");
        require(ok, "house fail");
        emit Forfeited(msg.sender, amount, marbles[msg.sender]);
    }

    function cashOut() external {
        uint256 held = marbles[msg.sender];
        require(held > 0, "no marbles");
        marbles[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: held}("");
        require(ok, "send fail");
        emit Cashed(msg.sender, held);
    }
}
