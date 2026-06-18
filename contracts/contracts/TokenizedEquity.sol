// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract TokenizedEquity is ERC20, AccessControl, Pausable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    struct ShareClass {
        string name;
        string ticker;
        uint256 totalSupply;
        uint256 maxSupply;
        uint256 pricePerToken;
        bool active;
        uint256 createdAt;
        uint256 dividendBps;
    }

    struct Investor {
        bool approved;
        uint256 kycLevel;
        uint256 investmentLimit;
        uint256 totalInvested;
        string jurisdiction;
        uint64 accreditedExpiry;
    }

    mapping(uint256 => ShareClass) public shareClasses;
    mapping(address => Investor) public investors;
    mapping(address => bool) public isAccredited;
    mapping(uint256 => mapping(address => uint256)) public classBalance;
    mapping(address => uint256) public pendingDividends;

    uint256 public shareClassCount;
    uint256 public totalInvestors;
    uint256 public totalFundsRaised;

    event ShareClassCreated(uint256 indexed id, string name, string ticker, uint256 maxSupply, uint256 price);
    event InvestorApproved(address indexed investor, uint256 kycLevel, string jurisdiction);
    event TokensPurchased(address indexed investor, uint256 classId, uint256 amount, uint256 cost);
    event TokensSold(address indexed investor, uint256 classId, uint256 amount, uint256 revenue);
    event DividendsDistributed(uint256 classId, uint256 totalAmount);
    event DividendsClaimed(address indexed investor, uint256 amount);

    constructor() ERC20("Tokenized Equity Platform", "TEP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
    }

    function createShareClass(
        string memory _name,
        string memory _ticker,
        uint256 _maxSupply,
        uint256 _pricePerToken,
        uint256 _dividendBps
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256) {
        require(_maxSupply > 0, "Max supply must be > 0");
        require(_pricePerToken > 0, "Price must be > 0");

        uint256 classId = shareClassCount++;
        shareClasses[classId] = ShareClass({
            name: _name,
            ticker: _ticker,
            totalSupply: 0,
            maxSupply: _maxSupply,
            pricePerToken: _pricePerToken,
            active: true,
            createdAt: block.timestamp,
            dividendBps: _dividendBps
        });

        emit ShareClassCreated(classId, _name, _ticker, _maxSupply, _pricePerToken);
        return classId;
    }

    function approveInvestor(
        address _investor,
        uint256 _kycLevel,
        string memory _jurisdiction,
        uint256 _investmentLimit
    ) external onlyRole(COMPLIANCE_ROLE) {
        investors[_investor] = Investor({
            approved: true,
            kycLevel: _kycLevel,
            investmentLimit: _investmentLimit,
            totalInvested: 0,
            jurisdiction: _jurisdiction,
            accreditedExpiry: 0
        });

        if (_kycLevel >= 3) {
            isAccredited[_investor] = true;
        }

        totalInvestors++;
        emit InvestorApproved(_investor, _kycLevel, _jurisdiction);
    }

    function purchaseTokens(
        uint256 _classId,
        uint256 _tokenAmount
    ) external payable whenNotPaused {
        require(investors[msg.sender].approved, "KYC required");
        require(shareClasses[_classId].active, "Share class inactive");
        require(_tokenAmount > 0, "Amount must be > 0");

        ShareClass storage sc = shareClasses[_classId];
        require(sc.totalSupply + _tokenAmount <= sc.maxSupply, "Exceeds max supply");

        uint256 totalCost = _tokenAmount * sc.pricePerToken;
        require(msg.value >= totalCost, "Insufficient payment");

        Investor storage inv = investors[msg.sender];
        require(inv.totalInvested + totalCost <= inv.investmentLimit, "Exceeds investment limit");

        sc.totalSupply += _tokenAmount;
        inv.totalInvested += totalCost;
        totalFundsRaised += totalCost;
        classBalance[_classId][msg.sender] += _tokenAmount;

        _mint(msg.sender, _tokenAmount * 10**decimals());

        if (msg.value > totalCost) {
            (bool sent, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(sent, "Refund failed");
        }

        emit TokensPurchased(msg.sender, _classId, _tokenAmount, totalCost);
    }

    function sellTokens(
        uint256 _classId,
        uint256 _tokenAmount
    ) external whenNotPaused {
        require(_tokenAmount > 0, "Amount must be > 0");
        require(classBalance[_classId][msg.sender] >= _tokenAmount, "Insufficient balance");

        ShareClass storage sc = shareClasses[_classId];
        require(sc.active, "Share class inactive");

        uint256 totalRevenue = _tokenAmount * sc.pricePerToken;
        classBalance[_classId][msg.sender] -= _tokenAmount;
        sc.totalSupply -= _tokenAmount;

        _burn(msg.sender, _tokenAmount * 10**decimals());

        (bool sent, ) = msg.sender.call{value: totalRevenue}("");
        require(sent, "Payment failed");

        emit TokensSold(msg.sender, _classId, _tokenAmount, totalRevenue);
    }

    function claimDividends(uint256 _classId) external {
        uint256 amount = pendingDividends[msg.sender];
        require(amount > 0, "No dividends");

        pendingDividends[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Transfer failed");

        emit DividendsClaimed(msg.sender, amount);
    }

    function getShareClass(uint256 _classId) external view returns (ShareClass memory) {
        return shareClasses[_classId];
    }

    function getInvestor(address _investor) external view returns (Investor memory) {
        return investors[_investor];
    }

    function getBalance(uint256 _classId, address _investor) external view returns (uint256) {
        return classBalance[_classId][_investor];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    receive() external payable {}
}
