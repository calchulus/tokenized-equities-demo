const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function getDefaultDB() {
  return {
    users: [
      {
        id: 'admin-001',
        email: 'admin@tokenize.demo',
        password: 'admin123',
        role: 'admin',
        name: 'Platform Admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 'issuer-001',
        email: 'issuer@acme.com',
        password: 'issuer123',
        role: 'issuer',
        name: 'Acme Corp Finance',
        company: 'Acme Corp',
        createdAt: new Date().toISOString()
      },
      {
        id: 'investor-001',
        email: 'investor@example.com',
        password: 'investor123',
        role: 'investor',
        name: 'Jane Smith',
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        kycStatus: 'approved',
        kycLevel: 3,
        accredited: true,
        jurisdiction: 'US',
        investmentLimit: 1000000,
        totalInvested: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'investor-002',
        email: 'bob@example.com',
        password: 'investor123',
        role: 'investor',
        name: 'Bob Johnson',
        walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        kycStatus: 'pending',
        kycLevel: 0,
        accredited: false,
        jurisdiction: 'UK',
        investmentLimit: 0,
        totalInvested: 0,
        createdAt: new Date().toISOString()
      }
    ],
    shareClasses: [
      {
        id: 'sc-001',
        name: 'Acme Corp Common Stock',
        ticker: 'ACME',
        issuerId: 'issuer-001',
        maxSupply: 1000000,
        currentSupply: 150000,
        pricePerToken: 25.00,
        dividendBps: 250,
        status: 'active',
        description: 'Common equity tokens representing shares in Acme Corp. SEC-registered under April 2026 regulatory framework.',
        createdAt: '2026-05-01T00:00:00.000Z',
        contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
      },
      {
        id: 'sc-002',
        name: 'Acme Corp Series B Preferred',
        ticker: 'ACME-B',
        issuerId: 'issuer-001',
        maxSupply: 500000,
        currentSupply: 0,
        pricePerToken: 50.00,
        dividendBps: 500,
        status: 'active',
        description: 'Series B preferred equity tokens with 5% dividend yield. Available to accredited investors only.',
        createdAt: '2026-05-15T00:00:00.000Z',
        contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
      },
      {
        id: 'sc-003',
        name: 'TechVenture Growth Fund',
        ticker: 'TVGF',
        issuerId: 'issuer-001',
        maxSupply: 2000000,
        currentSupply: 420000,
        pricePerToken: 10.00,
        dividendBps: 100,
        status: 'active',
        description: 'Diversified growth fund token. Minimum investment $500. Open to all KYC-approved investors.',
        createdAt: '2026-06-01T00:00:00.000Z',
        contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
      }
    ],
    transactions: [
      {
        id: 'tx-001',
        type: 'purchase',
        investorId: 'investor-001',
        shareClassId: 'sc-001',
        amount: 100000,
        pricePerToken: 25.00,
        totalValue: 2500000,
        status: 'completed',
        txHash: '0xabc123...',
        createdAt: '2026-05-10T14:30:00.000Z'
      },
      {
        id: 'tx-002',
        type: 'purchase',
        investorId: 'investor-001',
        shareClassId: 'sc-001',
        amount: 50000,
        pricePerToken: 25.00,
        totalValue: 1250000,
        status: 'completed',
        txHash: '0xdef456...',
        createdAt: '2026-05-20T09:15:00.000Z'
      }
    ],
    kycApplications: [
      {
        id: 'kyc-001',
        userId: 'investor-001',
        status: 'approved',
        submittedAt: '2026-04-20T10:00:00.000Z',
        reviewedAt: '2026-04-22T14:00:00.000Z',
        kycLevel: 3,
        documents: ['passport', 'proof_of_address', 'accreditation_letter']
      },
      {
        id: 'kyc-002',
        userId: 'investor-002',
        status: 'pending',
        submittedAt: '2026-06-15T08:00:00.000Z',
        reviewedAt: null,
        kycLevel: 0,
        documents: ['passport']
      }
    ],
    auditLog: [
      {
        id: 'log-001',
        action: 'share_class_created',
        actorId: 'issuer-001',
        details: { classId: 'sc-001', name: 'Acme Corp Common Stock' },
        timestamp: '2026-05-01T00:00:00.000Z'
      },
      {
        id: 'log-002',
        action: 'kyc_approved',
        actorId: 'admin-001',
        details: { userId: 'investor-001', level: 3 },
        timestamp: '2026-04-22T14:00:00.000Z'
      },
      {
        id: 'log-003',
        action: 'tokens_purchased',
        actorId: 'investor-001',
        details: { classId: 'sc-001', amount: 100000, total: 2500000 },
        timestamp: '2026-05-10T14:30:00.000Z'
      }
    ],
    settings: {
      platformName: 'EquityChain',
      registrationOpen: true,
      minInvestment: 100,
      maxInvestmentPerUser: 5000000,
      defaultKycLevel: 1,
      supportedJurisdictions: ['US', 'UK', 'EU', 'SG', 'JP', 'AU'],
      complianceMode: 'strict'
    }
  };
}

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load DB, using defaults:', e.message);
  }
  return getDefaultDB();
}

function saveDB(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { loadDB, saveDB, getDefaultDB };
