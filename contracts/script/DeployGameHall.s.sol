// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {GameHall} from "../src/GameHall.sol";

contract DeployGameHall is Script {
    function run() external {
        address deployer = msg.sender;
        vm.startBroadcast();
        GameHall hall = new GameHall(deployer);
        vm.stopBroadcast();
        console.log("GameHall deployed:", address(hall));
        console.log("owner:", deployer);
    }
}
