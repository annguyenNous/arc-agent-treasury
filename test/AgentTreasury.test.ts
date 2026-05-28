import { expect } from 'chai';
import hre from 'hardhat';
import { parseUnits } from 'ethers';

describe('AgentTreasury', function () {
  async function deployTreasuryFixture() {
    const [owner, agentOwner, recipient, otherAccount] = await hre.ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await hre.ethers.getContractFactory('MockERC20');
    const usdc = await MockERC20.deploy('Mock USDC', 'mUSDC');

    // Deploy treasury
    const AgentTreasury = await hre.ethers.getContractFactory('AgentTreasury');
    const treasury = await AgentTreasury.deploy(await usdc.getAddress());

    // Mint USDC to owner for testing
    await usdc.mint(owner.address, parseUnits('10000', 6));

    return { treasury, usdc, owner, agentOwner, recipient, otherAccount };
  }

  // ============================================
  // DEPLOYMENT TESTS
  // ============================================

  describe('Deployment', function () {
    it('Should set the correct USDC address', async function () {
      const { treasury, usdc } = await deployTreasuryFixture();
      expect(await treasury.usdc()).to.equal(await usdc.getAddress());
    });

    it('Should set the deployer as owner', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      expect(await treasury.owner()).to.equal(owner.address);
    });

    it('Should initialize with zero values', async function () {
      const { treasury } = await deployTreasuryFixture();
      expect(await treasury.agentCount()).to.equal(0);
      expect(await treasury.paymentCount()).to.equal(0);
      expect(await treasury.totalDeposited()).to.equal(0);
      expect(await treasury.totalSpent()).to.equal(0);
      expect(await treasury.totalAllocated()).to.equal(0);
      expect(await treasury.totalReserved()).to.equal(0);
    });
  });

  // ============================================
  // TREASURY MANAGEMENT TESTS
  // ============================================

  describe('Treasury Management', function () {
    it('Should allow deposits', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();
      const amount = parseUnits('100', 6);

      await usdc.approve(await treasury.getAddress(), amount);
      await treasury.deposit(amount);

      expect(await treasury.totalDeposited()).to.equal(amount);
      expect(await usdc.balanceOf(await treasury.getAddress())).to.equal(amount);
    });

    it('Should reject zero deposits', async function () {
      const { treasury } = await deployTreasuryFixture();
      await expect(treasury.deposit(0)).to.be.revertedWith('Amount must be > 0');
    });

    it('Should allow owner withdrawals', async function () {
      const { treasury, usdc, owner, recipient } = await deployTreasuryFixture();
      const amount = parseUnits('50', 6);

      // Deposit first
      await usdc.approve(await treasury.getAddress(), parseUnits('100', 6));
      await treasury.deposit(parseUnits('100', 6));

      // Withdraw
      await treasury.withdraw(recipient.address, amount);
      expect(await usdc.balanceOf(recipient.address)).to.equal(amount);
      expect(await treasury.totalSpent()).to.equal(amount);
    });

    it('Should reject non-owner withdrawals', async function () {
      const { treasury, usdc, otherAccount, recipient } = await deployTreasuryFixture();

      await expect(
        treasury.connect(otherAccount).withdraw(recipient.address, parseUnits('10', 6))
      ).to.be.reverted;
    });

    it('Should reject withdrawal to zero address', async function () {
      const { treasury } = await deployTreasuryFixture();
      await expect(
        treasury.withdraw('0x0000000000000000000000000000000000000000', parseUnits('10', 6))
      ).to.be.revertedWith('Invalid address');
    });
  });

  // ============================================
  // AGENT MANAGEMENT TESTS
  // ============================================

  describe('Agent Management', function () {
    it('Should register a new agent', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();
      const budget = parseUnits('100', 6);

      // Fund treasury
      await usdc.approve(await treasury.getAddress(), budget);
      await treasury.deposit(budget);

      // Register agent
      const tx = await treasury.registerAgent(1, 'Test Agent', 'treasury', budget);
      const receipt = await tx.wait();

      // Check agent was created
      expect(await treasury.agentCount()).to.equal(1);

      const agent = await treasury.getAgent(1);
      expect(agent.agentId).to.equal(1);
      expect(agent.owner).to.equal(owner.address);
      expect(agent.name).to.equal('Test Agent');
      expect(agent.agentType).to.equal('treasury');
      expect(agent.budget).to.equal(budget);
      expect(agent.active).to.be.true;
      expect(agent.reputation).to.equal(50);

      // Check totalAllocated updated
      expect(await treasury.totalAllocated()).to.equal(budget);
    });

    it('Should reject agent with zero budget', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();

      await usdc.approve(await treasury.getAddress(), parseUnits('100', 6));
      await treasury.deposit(parseUnits('100', 6));

      await expect(
        treasury.registerAgent(1, 'Test', 'treasury', 0)
      ).to.be.revertedWith('Budget must be > 0');
    });

    it('Should reject agent with insufficient treasury balance', async function () {
      const { treasury } = await deployTreasuryFixture();

      await expect(
        treasury.registerAgent(1, 'Test', 'treasury', parseUnits('100', 6))
      ).to.be.revertedWith('Insufficient treasury balance');
    });

    it('Should allow owner to update agent budget', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();
      const budget = parseUnits('100', 6);
      const newBudget = parseUnits('200', 6);

      await usdc.approve(await treasury.getAddress(), budget);
      await treasury.deposit(budget);
      await treasury.registerAgent(1, 'Test Agent', 'treasury', budget);

      await treasury.updateAgentBudget(1, newBudget);
      const agent = await treasury.getAgent(1);
      expect(agent.budget).to.equal(newBudget);
      expect(await treasury.totalAllocated()).to.equal(newBudget);
    });

    it('Should allow agent deactivation', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();
      const budget = parseUnits('100', 6);

      await usdc.approve(await treasury.getAddress(), budget);
      await treasury.deposit(budget);
      await treasury.registerAgent(1, 'Test Agent', 'treasury', budget);

      await treasury.deactivateAgent(1);
      const agent = await treasury.getAgent(1);
      expect(agent.active).to.be.false;
      expect(await treasury.totalAllocated()).to.equal(0);
    });

    it('Should get agents by owner', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();
      const budget = parseUnits('100', 6);

      await usdc.approve(await treasury.getAddress(), budget);
      await treasury.deposit(budget);
      await treasury.registerAgent(1, 'Agent 1', 'treasury', budget);

      const agents = await treasury.getOwnerAgents(owner.address);
      expect(agents.length).to.equal(1);
      expect(agents[0]).to.equal(1);
    });

    it('Should update reputation', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();
      const budget = parseUnits('100', 6);

      await usdc.approve(await treasury.getAddress(), budget);
      await treasury.deposit(budget);
      await treasury.registerAgent(1, 'Test Agent', 'treasury', budget);

      await treasury.updateReputation(1, 95);
      const agent = await treasury.getAgent(1);
      expect(agent.reputation).to.equal(95);
    });

    it('Should reject reputation > 100', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();
      const budget = parseUnits('100', 6);

      await usdc.approve(await treasury.getAddress(), budget);
      await treasury.deposit(budget);
      await treasury.registerAgent(1, 'Test Agent', 'treasury', budget);

      await expect(treasury.updateReputation(1, 101)).to.be.revertedWith('Score must be <= 100');
    });
  });

  // ============================================
  // PAYMENT SCHEDULING TESTS
  // ============================================

  describe('Payment Scheduling', function () {
    async function setupAgentAndPayment() {
      const fixture = await deployTreasuryFixture();
      const { treasury, usdc, owner, recipient } = fixture;
      const budget = parseUnits('500', 6);
      const paymentAmount = parseUnits('10', 6);

      // Fund treasury and register agent
      await usdc.approve(await treasury.getAddress(), budget);
      await treasury.deposit(budget);
      await treasury.registerAgent(1, 'Pay Agent', 'payment', budget);

      return { ...fixture, budget, paymentAmount };
    }

    it('Should schedule a one-time payment', async function () {
      const { treasury, owner, recipient, paymentAmount } = await setupAgentAndPayment();

      const tx = await treasury.schedulePayment(
        recipient.address,
        paymentAmount,
        0, // one-time
        1, // max 1 execution
        'Server Hosting',
        1 // agentId
      );

      expect(await treasury.paymentCount()).to.equal(1);
      expect(await treasury.totalReserved()).to.equal(paymentAmount);

      const payment = await treasury.getPayment(1);
      expect(payment.recipient).to.equal(recipient.address);
      expect(payment.amount).to.equal(paymentAmount);
      expect(payment.label).to.equal('Server Hosting');
      expect(payment.active).to.be.true;
      expect(payment.agentId).to.equal(1);
    });

    it('Should schedule a recurring payment', async function () {
      const { treasury, recipient, paymentAmount } = await setupAgentAndPayment();

      await treasury.schedulePayment(
        recipient.address,
        paymentAmount,
        86400, // daily
        30,    // max 30 executions
        'Daily Payment',
        1
      );

      const payment = await treasury.getPayment(1);
      expect(payment.interval).to.equal(86400);
      expect(payment.maxExecutions).to.equal(30);
    });

    it('Should execute a one-time payment', async function () {
      const { treasury, usdc, recipient, paymentAmount } = await setupAgentAndPayment();

      await treasury.schedulePayment(recipient.address, paymentAmount, 0, 1, 'One-time', 1);
      await treasury.executePayment(1);

      expect(await usdc.balanceOf(recipient.address)).to.equal(paymentAmount);
      expect(await treasury.totalSpent()).to.equal(paymentAmount);
      expect(await treasury.totalReserved()).to.equal(0); // Released for one-time

      const payment = await treasury.getPayment(1);
      expect(payment.totalExecutions).to.equal(1);
    });

    it('Should cancel a payment', async function () {
      const { treasury, paymentAmount } = await setupAgentAndPayment();

      await treasury.schedulePayment(
        '0x0000000000000000000000000000000000000001',
        paymentAmount,
        86400,
        30,
        'Cancel Me',
        1
      );

      expect(await treasury.totalReserved()).to.equal(paymentAmount);

      await treasury.cancelPayment(1);

      const payment = await treasury.getPayment(1);
      expect(payment.active).to.be.false;
      expect(await treasury.totalReserved()).to.equal(0);
    });

    it('Should reject execution before next execution time', async function () {
      const { treasury, recipient, paymentAmount } = await setupAgentAndPayment();

      await treasury.schedulePayment(recipient.address, paymentAmount, 86400, 30, 'Not Ready', 1);

      await expect(treasury.executePayment(1)).to.be.revertedWith('Not ready');
    });

    it('Should reject scheduling with inactive agent', async function () {
      const { treasury, recipient, paymentAmount } = await setupAgentAndPayment();

      // Deactivate agent
      await treasury.deactivateAgent(1);

      await expect(
        treasury.schedulePayment(recipient.address, paymentAmount, 0, 1, 'Fail', 1)
      ).to.be.revertedWith('Agent not active');
    });

    it('Should reject scheduling to zero address', async function () {
      const { treasury, paymentAmount } = await setupAgentAndPayment();

      await expect(
        treasury.schedulePayment('0x0000000000000000000000000000000000000000', paymentAmount, 0, 1, 'Fail', 1)
      ).to.be.revertedWith('Invalid recipient');
    });
  });

  // ============================================
  // TREASURY INFO TESTS
  // ============================================

  describe('Treasury Info', function () {
    it('Should return correct treasury info with zero balance', async function () {
      const { treasury } = await deployTreasuryFixture();
      const info = await treasury.getTreasuryInfo();
      expect(info.totalBalance).to.equal(0);
      expect(info.allocatedToAgents).to.equal(0);
      expect(info.reservedForPayments).to.equal(0);
      expect(info.available).to.equal(0);
    });

    it('Should return correct treasury info after deposits and agent registration', async function () {
      const { treasury, usdc, owner } = await deployTreasuryFixture();
      const depositAmount = parseUnits('1000', 6);
      const budget = parseUnits('300', 6);

      await usdc.approve(await treasury.getAddress(), depositAmount);
      await treasury.deposit(depositAmount);
      await treasury.registerAgent(1, 'Agent', 'treasury', budget);

      const info = await treasury.getTreasuryInfo();
      expect(info.totalBalance).to.equal(depositAmount);
      expect(info.allocatedToAgents).to.equal(budget);
      expect(info.available).to.equal(depositAmount - budget);
    });

    it('Should track totalAllocated and totalReserved correctly', async function () {
      const { treasury, usdc, owner, recipient } = await deployTreasuryFixture();
      const depositAmount = parseUnits('1000', 6);
      const budget = parseUnits('500', 6);
      const paymentAmount = parseUnits('50', 6);

      await usdc.approve(await treasury.getAddress(), depositAmount);
      await treasury.deposit(depositAmount);
      await treasury.registerAgent(1, 'Agent', 'treasury', budget);

      expect(await treasury.getTotalAllocated()).to.equal(budget);
      expect(await treasury.getTotalReserved()).to.equal(0);

      // Schedule a payment
      await treasury.schedulePayment(recipient.address, paymentAmount, 0, 1, 'Test', 1);
      expect(await treasury.getTotalReserved()).to.equal(paymentAmount);

      // Execute payment
      await treasury.executePayment(1);
      expect(await treasury.getTotalReserved()).to.equal(0);
    });
  });

  // ============================================
  // VIEW FUNCTIONS TESTS
  // ============================================

  describe('View Functions', function () {
    it('Should return correct agent count', async function () {
      const { treasury, usdc } = await deployTreasuryFixture();
      const budget = parseUnits('100', 6);

      await usdc.approve(await treasury.getAddress(), budget * 3n);
      await treasury.deposit(budget * 3n);

      expect(await treasury.getAgentCount()).to.equal(0);

      await treasury.registerAgent(1, 'Agent 1', 'treasury', budget);
      expect(await treasury.getAgentCount()).to.equal(1);

      await treasury.registerAgent(2, 'Agent 2', 'payment', budget);
      expect(await treasury.getAgentCount()).to.equal(2);
    });

    it('Should return correct payment count', async function () {
      const { treasury, usdc, recipient } = await deployTreasuryFixture();
      const budget = parseUnits('500', 6);

      await usdc.approve(await treasury.getAddress(), budget);
      await treasury.deposit(budget);
      await treasury.registerAgent(1, 'Agent', 'treasury', budget);

      expect(await treasury.getPaymentCount()).to.equal(0);

      await treasury.schedulePayment(recipient.address, parseUnits('10', 6), 0, 1, 'P1', 1);
      expect(await treasury.getPaymentCount()).to.equal(1);

      await treasury.schedulePayment(recipient.address, parseUnits('20', 6), 0, 1, 'P2', 1);
      expect(await treasury.getPaymentCount()).to.equal(2);
    });
  });
});
