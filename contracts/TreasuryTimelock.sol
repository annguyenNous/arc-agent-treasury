// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title TreasuryTimelock - Timelock for AgentTreasury owner operations
/// @notice Adds time-delayed execution for sensitive treasury operations
/// @dev Deploy this, transfer AgentTreasury ownership to this contract,
///      then governance multisig/DAO controls this timelock
contract TreasuryTimelock is TimelockController {
    /// @param minDelay Minimum delay in seconds before execution (e.g., 3600 = 1 hour)
    /// @param proposers Addresses allowed to propose operations
    /// @param executors Addresses allowed to execute operations (address(0) = anyone)
    /// @param admin Optional admin address (set to address(0) to renounce)
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}

    /// @notice Required override for TimelockController
    function _execute(uint256 id, address target, bytes calldata data) internal override {
        (bool success, ) = target.call(data);
        require(success, "Timelock: underlying transaction reverted");
    }

    /// @notice Required override for TimelockController
    function _beforeCall(uint256 id, address target, bytes calldata data) internal override {}

    /// @notice Required override for TimelockController
    function _afterCall(uint256 id, address target, bytes calldata data) internal override {}
}
