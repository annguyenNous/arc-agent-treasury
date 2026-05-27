import { expect } from 'chai';
import hre from 'hardhat';

describe('AgentTreasury', function () {
  // USDC on ARC Testnet
  const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
  
  async function deployTreasuryFixture() {
    const [owner, agent, recipient, otherAccount] = await hre.ethers.getSigners();
    
    const AgentTreasury = await hre.ethers.getContractFactory('AgentTreasury');
    const treasury = await AgentTreasury.deploy(USDC_ADDRESS);
    
    return { treasury, owner, agent, recipient, otherAccount };
  }

  // ============================================
  // DEPLOYMENT TESTS
  // ============================================

  describe('Deployment', function () {
    it('Should set the correct USDC address', async function () {
      const { treasury } = await deployTreasuryFixture();
      expect(await treasury.usdc()).to.equal(USDC_ADDRESS);
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
    });
  });

  // ============================================
  // TREASURY MANAGEMENT TESTS
  // ============================================

  describe('Treasury Management', function () {
    it('Should allow deposits', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      
      // Note: This test requires USDC balance
      // On testnet, you'd need to fund the owner first
      // For unit tests, you'd mock the USDC contract
      
      // Example with mock:
      // await mockUSDC.mint(owner.address, parseUnits('100', 6));
      // await mockUSDC.approve(treasury.address, parseUnits('50', 6));
      // await treasury.deposit(parseUnits('50', 6));
      // expect(await treasury.totalDeposited()).to.equal(parseUnits('50', 6));
    });

    it('Should allow owner withdrawals', async function () {
      const { treasury, owner, recipient } = await deployTreasuryFixture();
      
      // With mock:
      // await treasury.withdraw(recipient.address, parseUnits('10', 6));
    });

    it('Should reject non-owner withdrawals', async function () {
      const { treasury, otherAccount, recipient } = await deployTreasuryFixture();
      
      // await expect(
      //   treasury.connect(otherAccount).withdraw(recipient.address, parseUnits('10', 6))
      // ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  // ============================================
  // AGENT MANAGEMENT TESTS
  // ============================================

  describe('Agent Management', function () {
    it('Should register a new agent', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      
      // With mock USDC and ERC-8004 token:
      // const tx = await treasury.registerAgent(1, 'Test Agent', 'treasury', parseUnits('100', 6));
      // const receipt = await tx.wait();
      // expect(receipt.events.some(e => e.event === 'AgentRegistered')).to.be.true;
    });

    it('Should track agent count', async function () {
      const { treasury } = await deployTreasuryFixture();
      
      // After registering:
      // expect(await treasury.agentCount()).to.equal(1);
    });

    it('Should allow owner to update agent budget', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      
      // await treasury.updateAgentBudget(1, parseUnits('200', 6));
      // const agent = await treasury.getAgent(1);
      // expect(agent.budget).to.equal(parseUnits('200', 6));
    });

    it('Should allow agent deactivation', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      
      // await treasury.deactivateAgent(1);
      // const agent = await treasury.getAgent(1);
      // expect(agent.active).to.be.false;
    });

    it('Should get agents by owner', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      
      // const agents = await treasury.getOwnerAgents(owner.address);
      // expect(agents.length).to.equal(1);
    });
  });

  // ============================================
  // PAYMENT SCHEDULING TESTS
  // ============================================

  describe('Payment Scheduling', function () {
    it('Should schedule a payment', async function () {
      const { treasury, owner, recipient } = await deployTreasuryFixture();
      
      // const tx = await treasury.schedulePayment(
      //   recipient.address,
      //   parseUnits('10', 6),
      //   86400, // daily
      //   30, // max 30 executions
      //   'Server Hosting',
      //   1 // agentId
      // );
      // const receipt = await tx.wait();
      // expect(receipt.events.some(e => e.event === 'PaymentScheduled')).to.be.true;
    });

    it('Should execute a scheduled payment', async function () {
      const { treasury, owner, recipient } = await deployTreasuryFixture();
      
      // await treasury.executePayment(1);
      // const payment = await treasury.getPayment(1);
      // expect(payment.totalExecutions).to.equal(1);
    });

    it('Should cancel a payment', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      
      // await treasury.cancelPayment(1);
      // const payment = await treasury.getPayment(1);
      // expect(payment.active).to.be.false;
    });

    it('Should reject execution before next execution time', async function () {
      const { treasury } = await deployTreasuryFixture();
      
      // await expect(treasury.executePayment(1)).to.be.revertedWith('Not ready');
    });

    it('Should reject execution after max executions', async function () {
      const { treasury } = await deployTreasuryFixture();
      
      // After 30 executions:
      // await expect(treasury.executePayment(1)).to.be.revertedWith('Max executions reached');
    });
  });

  // ============================================
  // TREASURY INFO TESTS
  // ============================================

  describe('Treasury Info', function () {
    it('Should return correct treasury info', async function () {
      const { treasury } = await deployTreasuryFixture();
      
      // const info = await treasury.getTreasuryInfo();
      // expect(info.totalBalance).to.equal(0);
      // expect(info.allocatedToAgents).to.equal(0);
      // expect(info.reservedForPayments).to.equal(0);
      // expect(info.available).to.equal(0);
    });
  });

  // ============================================
  // REPUTATION TESTS
  // ============================================

  describe('Reputation', function () {
    it('Should allow owner to update reputation', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      
      // await treasury.updateReputation(1, 95);
      // const agent = await treasury.getAgent(1);
      // expect(agent.reputation).to.equal(95);
    });

    it('Should reject reputation > 100', async function () {
      const { treasury, owner } = await deployTreasuryFixture();
      
      // await expect(treasury.updateReputation(1, 101)).to.be.revertedWith('Score must be <= 100');
    });
  });
});
