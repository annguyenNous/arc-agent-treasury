import { expect } from 'chai';
import hre from 'hardhat';
import { parseUnits, ZeroAddress } from 'ethers';

describe('TreasuryTimelock', function () {
  async function deployTimelockFixture() {
    const [owner, proposer, executor, other] = await hre.ethers.getSigners();

    // Deploy Timelock
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [ZeroAddress]; // anyone can execute
    const admin = owner.address;

    const TreasuryTimelock = await hre.ethers.getContractFactory('TreasuryTimelock');
    const timelock = await TreasuryTimelock.deploy(minDelay, proposers, executors, admin);

    // Deploy mock USDC + Treasury for integration test
    const MockERC20 = await hre.ethers.getContractFactory('MockERC20');
    const usdc = await MockERC20.deploy('Mock USDC', 'mUSDC');

    const AgentTreasury = await hre.ethers.getContractFactory('AgentTreasury');
    const treasury = await AgentTreasury.deploy(await usdc.getAddress());

    // Mint USDC
    await usdc.mint(owner.address, parseUnits('10000', 6));

    return { timelock, treasury, usdc, owner, proposer, executor, other, minDelay };
  }

  // ============================================
  // DEPLOYMENT TESTS
  // ============================================

  describe('Deployment', function () {
    it('Should deploy with correct min delay', async function () {
      const { timelock, minDelay } = await deployTimelockFixture();
      expect(await timelock.getMinDelay()).to.equal(minDelay);
    });

    it('Should grant proposer role', async function () {
      const { timelock, proposer } = await deployTimelockFixture();
      const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
      expect(await timelock.hasRole(PROPOSER_ROLE, proposer.address)).to.be.true;
    });

    it('Should grant executor role to zero address (public execution)', async function () {
      const { timelock } = await deployTimelockFixture();
      const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
      expect(await timelock.hasRole(EXECUTOR_ROLE, ZeroAddress)).to.be.true;
    });

    it('Should grant admin role to deployer', async function () {
      const { timelock, owner } = await deployTimelockFixture();
      const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
      expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  // ============================================
  // TIMELOCK OPERATION TESTS
  // ============================================

  describe('Timelock Operations', function () {
    it('Should schedule and execute a transferOwnership call', async function () {
      const { timelock, treasury, proposer, executor, owner, minDelay } = await deployTimelockFixture();

      // Transfer treasury ownership to timelock first
      await treasury.transferOwnership(await timelock.getAddress());
      expect(await treasury.owner()).to.equal(await timelock.getAddress());

      // Schedule a call to treasury.emergencyPause() through the timelock
      const target = await treasury.getAddress();
      const value = 0;
      const data = treasury.interface.encodeFunctionData('emergencyPause');
      const predecessor = hre.ethers.ZeroHash;
      const salt = hre.ethers.ZeroHash;

      // Schedule
      await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, minDelay);

      // Try to execute immediately - should fail
      await expect(
        timelock.connect(executor).execute(target, value, data, predecessor, salt)
      ).to.be.reverted;

      // Advance time by minDelay
      await hre.network.provider.send('evm_increaseTime', [minDelay + 1]);
      await hre.network.provider.send('evm_mine');

      // Execute
      await timelock.connect(executor).execute(target, value, data, predecessor, salt);

      // Verify treasury is now paused
      expect(await treasury.paused()).to.be.true;
    });

    it('Should reject execution before delay period', async function () {
      const { timelock, treasury, proposer, executor, minDelay } = await deployTimelockFixture();

      await treasury.transferOwnership(await timelock.getAddress());

      const target = await treasury.getAddress();
      const data = treasury.interface.encodeFunctionData('emergencyPause');

      await timelock.connect(proposer).schedule(target, 0, data, hre.ethers.ZeroHash, hre.ethers.ZeroHash, minDelay);

      // Execute immediately - should fail
      await expect(
        timelock.connect(executor).execute(target, 0, data, hre.ethers.ZeroHash, hre.ethers.ZeroHash)
      ).to.be.reverted;
    });

    it('Should reject scheduling from non-proposer', async function () {
      const { timelock, treasury, other, minDelay } = await deployTimelockFixture();

      const target = await treasury.getAddress();
      const data = treasury.interface.encodeFunctionData('emergencyPause');

      await expect(
        timelock.connect(other).schedule(target, 0, data, hre.ethers.ZeroHash, hre.ethers.ZeroHash, minDelay)
      ).to.be.reverted;
    });

    it('Should allow cancelling a scheduled operation', async function () {
      const { timelock, treasury, proposer, owner } = await deployTimelockFixture();

      const target = await treasury.getAddress();
      const data = treasury.interface.encodeFunctionData('emergencyPause');

      // Get operation hash
      const salt = hre.ethers.ZeroHash;
      const predecessor = hre.ethers.ZeroHash;
      const id = await timelock.hashOperation(target, 0, data, predecessor, salt);

      // Schedule
      await timelock.connect(proposer).schedule(target, 0, data, predecessor, salt, 3600);

      // Cancel (admin can cancel)
      await timelock.connect(owner).cancel(id);

      // Advance time
      await hre.network.provider.send('evm_increaseTime', [3601]);
      await hre.network.provider.send('evm_mine');

      // Execute should fail (cancelled)
      await expect(
        timelock.execute(target, 0, data, predecessor, salt)
      ).to.be.reverted;
    });
  });

  // ============================================
  // INTEGRATION: TIMELOCK + TREASURY
  // ============================================

  describe('Integration: Timelock + AgentTreasury', function () {
    it('Should execute emergencyPause through timelock', async function () {
      const { timelock, treasury, proposer, minDelay } = await deployTimelockFixture();

      // Transfer ownership to timelock
      await treasury.transferOwnership(await timelock.getAddress());

      // Schedule emergencyPause
      const target = await treasury.getAddress();
      const data = treasury.interface.encodeFunctionData('emergencyPause');

      await timelock.connect(proposer).schedule(target, 0, data, hre.ethers.ZeroHash, hre.ethers.ZeroHash, minDelay);

      // Wait for delay
      await hre.network.provider.send('evm_increaseTime', [minDelay + 1]);
      await hre.network.provider.send('evm_mine');

      // Execute
      await timelock.connect(proposer).execute(target, 0, data, hre.ethers.ZeroHash, hre.ethers.ZeroHash);

      // Verify paused
      expect(await treasury.paused()).to.be.true;

      // Deposits should fail when paused
      const MockERC20 = await hre.ethers.getContractFactory('MockERC20');
      const usdcAddress = await treasury.usdc();
      const usdc = MockERC20.attach(usdcAddress);

      await usdc.approve(await treasury.getAddress(), parseUnits('100', 6));
      await expect(treasury.deposit(parseUnits('100', 6))).to.be.revertedWith('Pausable: paused');
    });

    it('Should execute emergencyUnpause through timelock', async function () {
      const { timelock, treasury, proposer, owner, minDelay } = await deployTimelockFixture();

      // Transfer ownership and pause
      await treasury.transferOwnership(await timelock.getAddress());

      // Schedule pause
      const target = await treasury.getAddress();
      const pauseData = treasury.interface.encodeFunctionData('emergencyPause');
      await timelock.connect(proposer).schedule(target, 0, pauseData, hre.ethers.ZeroHash, hre.ethers.ZeroHash, minDelay);
      await hre.network.provider.send('evm_increaseTime', [minDelay + 1]);
      await hre.network.provider.send('evm_mine');
      await timelock.connect(proposer).execute(target, 0, pauseData, hre.ethers.ZeroHash, hre.ethers.ZeroHash);

      expect(await treasury.paused()).to.be.true;

      // Schedule unpause
      const unpauseData = treasury.interface.encodeFunctionData('emergencyUnpause');
      await timelock.connect(proposer).schedule(target, 0, unpauseData, hre.ethers.ZeroHash, hre.ethers.ZeroHash, minDelay);
      await hre.network.provider.send('evm_increaseTime', [minDelay + 1]);
      await hre.network.provider.send('evm_mine');
      await timelock.connect(proposer).execute(target, 0, unpauseData, hre.ethers.ZeroHash, hre.ethers.ZeroHash);

      expect(await treasury.paused()).to.be.false;
    });

    it('Should prevent direct owner calls after ownership transfer', async function () {
      const { timelock, treasury, owner } = await deployTimelockFixture();

      // Transfer ownership to timelock
      await treasury.transferOwnership(await timelock.getAddress());

      // Direct owner call should fail
      await expect(treasury.emergencyPause()).to.be.reverted;
    });
  });
});
