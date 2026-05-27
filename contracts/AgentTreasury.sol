// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title AgentTreasury - AI Agent Treasury Management
/// @notice Manages treasury funds, agent allocations, and automated operations
/// @dev Integrates with ERC-8004 identity and ERC-8183 jobs on ARC Network
contract AgentTreasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // TYPES
    // ============================================

    struct Agent {
        uint256 agentId;         // ERC-8004 token ID
        address owner;           // Agent owner
        string name;             // Agent name
        string agentType;        // treasury, payment, arbitrage, liquidity, billing
        uint256 budget;          // Allocated budget in USDC
        uint256 spent;           // Total spent
        uint256 reputation;      // Reputation score (0-100)
        bool active;             // Is agent active
        uint256 createdAt;       // Registration timestamp
    }

    struct ScheduledPayment {
        uint256 id;
        address recipient;
        uint256 amount;
        uint256 interval;        // Seconds between payments (0 = one-time)
        uint256 nextExecution;   // When to execute next
        uint256 totalExecutions; // How many times executed
        uint256 maxExecutions;   // Max executions (0 = unlimited)
        string label;            // Payment description
        bool active;
        address agentId;         // Which agent executes this
    }

    struct TreasuryAllocation {
        uint256 totalBalance;
        uint256 allocatedToAgents;
        uint256 reservedForPayments;
        uint256 available;
    }

    // ============================================
    // STATE
    // ============================================

    IERC20 public immutable usdc;

    // Agents
    mapping(uint256 => Agent) public agents;           // agentId => Agent
    mapping(address => uint256[]) public ownerAgents;  // owner => agentIds
    uint256 public agentCount;

    // Scheduled Payments
    mapping(uint256 => ScheduledPayment) public scheduledPayments;
    uint256 public paymentCount;
    mapping(address => uint256[]) public agentPayments; // agent => paymentIds

    // Treasury
    uint256 public totalDeposited;
    uint256 public totalSpent;

    // ============================================
    // EVENTS
    // ============================================

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, string agentType);
    event AgentBudgetUpdated(uint256 indexed agentId, uint256 oldBudget, uint256 newBudget);
    event AgentDeactivated(uint256 indexed agentId);
    event PaymentScheduled(uint256 indexed paymentId, address indexed recipient, uint256 amount, string label);
    event PaymentExecuted(uint256 indexed paymentId, address indexed recipient, uint256 amount);
    event PaymentCancelled(uint256 indexed paymentId);
    event TreasuryDeposit(address indexed depositor, uint256 amount);
    event TreasuryWithdrawal(address indexed to, uint256 amount);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // ============================================
    // TREASURY MANAGEMENT
    // ============================================

    /// @notice Deposit USDC into treasury
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;
        emit TreasuryDeposit(msg.sender, amount);
    }

    /// @notice Withdraw USDC from treasury (owner only)
    function withdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be > 0");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");
        
        totalSpent += amount;
        usdc.safeTransfer(to, amount);
        emit TreasuryWithdrawal(to, amount);
    }

    /// @notice Get treasury balance and allocation info
    function getTreasuryInfo() external view returns (TreasuryAllocation memory) {
        uint256 balance = usdc.balanceOf(address(this));
        uint256 allocated = _totalAllocated();
        
        return TreasuryAllocation({
            totalBalance: balance,
            allocatedToAgents: allocated,
            reservedForPayments: _totalReserved(),
            available: balance > allocated ? balance - allocated : 0
        });
    }

    // ============================================
    // AGENT MANAGEMENT
    // ============================================

    /// @notice Register a new AI agent
    function registerAgent(
        uint256 erc8004TokenId,
        string calldata name,
        string calldata agentType,
        uint256 budget
    ) external nonReentrant returns (uint256) {
        require(erc8004TokenId > 0, "Invalid ERC-8004 token ID");
        require(bytes(name).length > 0, "Name required");
        require(budget > 0, "Budget must be > 0");
        require(usdc.balanceOf(address(this)) >= budget, "Insufficient treasury balance");

        uint256 agentId = ++agentCount;
        
        agents[agentId] = Agent({
            agentId: erc8004TokenId,
            owner: msg.sender,
            name: name,
            agentType: agentType,
            budget: budget,
            spent: 0,
            reputation: 50, // Start at 50
            active: true,
            createdAt: block.timestamp
        });

        ownerAgents[msg.sender].push(agentId);
        
        emit AgentRegistered(agentId, msg.sender, name, agentType);
        return agentId;
    }

    /// @notice Update agent budget
    function updateAgentBudget(uint256 agentId, uint256 newBudget) external onlyOwner {
        Agent storage agent = agents[agentId];
        require(agent.owner != address(0), "Agent not found");
        
        uint256 oldBudget = agent.budget;
        agent.budget = newBudget;
        
        emit AgentBudgetUpdated(agentId, oldBudget, newBudget);
    }

    /// @notice Deactivate an agent
    function deactivateAgent(uint256 agentId) external {
        Agent storage agent = agents[agentId];
        require(agent.owner == msg.sender || msg.sender == owner(), "Not authorized");
        
        agent.active = false;
        emit AgentDeactivated(agentId);
    }

    /// @notice Update agent reputation (called by oracle/validator)
    function updateReputation(uint256 agentId, uint256 newScore) external onlyOwner {
        require(newScore <= 100, "Score must be <= 100");
        agents[agentId].reputation = newScore;
    }

    /// @notice Get agent details
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }

    /// @notice Get all agents for an owner
    function getOwnerAgents(address owner) external view returns (uint256[] memory) {
        return ownerAgents[owner];
    }

    // ============================================
    // PAYMENT SCHEDULING
    // ============================================

    /// @notice Schedule a recurring payment
    function schedulePayment(
        address recipient,
        uint256 amount,
        uint256 interval,
        uint256 maxExecutions,
        string calldata label,
        uint256 agentId
    ) external returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(agents[agentId].active, "Agent not active");
        require(
            agents[agentId].owner == msg.sender || msg.sender == owner(),
            "Not authorized"
        );

        uint256 paymentId = ++paymentCount;
        
        scheduledPayments[paymentId] = ScheduledPayment({
            id: paymentId,
            recipient: recipient,
            amount: amount,
            interval: interval,
            nextExecution: block.timestamp + (interval > 0 ? interval : 0),
            totalExecutions: 0,
            maxExecutions: maxExecutions,
            label: label,
            active: true,
            agentId: msg.sender
        });

        agentPayments[msg.sender].push(paymentId);
        
        emit PaymentScheduled(paymentId, recipient, amount, label);
        return paymentId;
    }

    /// @notice Execute a scheduled payment
    function executePayment(uint256 paymentId) external nonReentrant {
        ScheduledPayment storage payment = scheduledPayments[paymentId];
        require(payment.active, "Payment not active");
        require(block.timestamp >= payment.nextExecution, "Not ready");
        require(
            payment.maxExecutions == 0 || payment.totalExecutions < payment.maxExecutions,
            "Max executions reached"
        );
        require(usdc.balanceOf(address(this)) >= payment.amount, "Insufficient balance");

        // Execute payment
        usdc.safeTransfer(payment.recipient, payment.amount);
        
        // Update state
        payment.totalExecutions++;
        payment.nextExecution = block.timestamp + payment.interval;
        totalSpent += payment.amount;

        emit PaymentExecuted(paymentId, payment.recipient, payment.amount);
    }

    /// @notice Cancel a scheduled payment
    function cancelPayment(uint256 paymentId) external {
        ScheduledPayment storage payment = scheduledPayments[paymentId];
        require(
            payment.agentId == msg.sender || msg.sender == owner(),
            "Not authorized"
        );
        
        payment.active = false;
        emit PaymentCancelled(paymentId);
    }

    /// @notice Get payment details
    function getPayment(uint256 paymentId) external view returns (ScheduledPayment memory) {
        return scheduledPayments[paymentId];
    }

    /// @notice Get all payments for an agent
    function getAgentPayments(address agentOwner) external view returns (uint256[] memory) {
        return agentPayments[agentOwner];
    }

    // ============================================
    // INTERNAL
    // ============================================

    function _totalAllocated() internal view returns (uint256 total) {
        for (uint256 i = 1; i <= agentCount; i++) {
            if (agents[i].active) {
                total += agents[i].budget;
            }
        }
    }

    function _totalReserved() internal view returns (uint256 total) {
        for (uint256 i = 1; i <= paymentCount; i++) {
            if (scheduledPayments[i].active) {
                total += scheduledPayments[i].amount;
            }
        }
    }
}
