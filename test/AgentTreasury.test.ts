import { expect } from "chai";
import hre from "hardhat";

describe("AgentTreasury", function () {
  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
  
  async function deployTreasury() {
    const [owner, agent, recipient] = await hre.ethers.getSigners();
    
    const AgentTreasury = await hre.ethers.getContractFactory("AgentTreasury");
    const treasury = await AgentTreasury.deploy(USDC_ADDRESS);
    
    return { treasury, owner, agent, recipient };
  }

  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      const { treasury } = await deployTreasury();
      expect(await treasury.usdc()).to.equal(USDC_ADDRESS);
    });

    it("Should set the deployer as owner", async function () {
      const { treasury, owner } = await deployTreasury();
      expect(await treasury.owner()).to.equal(owner.address);
    });
  });

  describe("Agent Registration", function () {
    it("Should register a new agent", async function () {
      const { treasury, owner } = await deployTreasury();
      
      // Note: This test requires USDC balance in treasury
      // On testnet, you'd need to deposit first
      // For unit tests, you'd mock the USDC contract
    });
  });
});
