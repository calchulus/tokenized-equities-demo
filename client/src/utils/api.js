import { initDB, getDBData, saveDB, resetDB } from './mockData';

initDB();

function getDB() {
  return getDBData();
}

function persist(db) {
  saveDB(db);
}

function createToken(userId, role) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ userId, role, iat: Date.now(), exp: Date.now() + 86400000 }));
  const signature = btoa(`${header}.${payload}.demo-sig`);
  return `${header}.${payload}.${signature}`;
}

function genId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function genTxHash() {
  return '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}

function now() {
  return new Date().toISOString();
}

function simulateDelay() {
  return new Promise(r => setTimeout(r, 150 + Math.random() * 200));
}

export const api = {
  resetData: () => { resetDB(); },

  login: async (email, password) => {
    await simulateDelay();
    const db = getDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Invalid credentials');
    const token = createToken(user.id, user.role);
    const { password: _, ...safeUser } = user;
    return { token, user: safeUser };
  },

  register: async (data) => {
    await simulateDelay();
    const db = getDB();
    if (db.users.find(u => u.email === data.email)) throw new Error('Email already registered');
    const newUser = {
      id: genId('user'),
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role || 'investor',
      walletAddress: data.walletAddress || '',
      company: data.company || '',
      kycStatus: 'none',
      kycLevel: 0,
      accredited: false,
      jurisdiction: '',
      investmentLimit: 0,
      totalInvested: 0,
      createdAt: now()
    };
    db.users.push(newUser);
    persist(db);
    const token = createToken(newUser.id, newUser.role);
    const { password: _, ...safeUser } = newUser;
    return { token, user: safeUser };
  },

  getShareClasses: async () => {
    await simulateDelay();
    const db = getDB();
    return db.shareClasses.map(sc => {
      const issuer = db.users.find(u => u.id === sc.issuerId);
      return { ...sc, issuerName: issuer?.name || 'Unknown' };
    });
  },

  getShareClass: async (id) => {
    await simulateDelay();
    const db = getDB();
    const sc = db.shareClasses.find(s => s.id === id);
    if (!sc) throw new Error('Share class not found');
    const issuer = db.users.find(u => u.id === sc.issuerId);
    return { ...sc, issuerName: issuer?.name || 'Unknown' };
  },

  createShareClass: async (data) => {
    await simulateDelay();
    const db = getDB();
    const newClass = {
      id: genId('sc'),
      name: data.name,
      ticker: data.ticker,
      issuerId: data.issuerId || 'issuer-001',
      maxSupply: parseInt(data.maxSupply),
      currentSupply: 0,
      pricePerToken: parseFloat(data.pricePerToken),
      dividendBps: parseInt(data.dividendBps) || 0,
      status: 'active',
      description: data.description || '',
      createdAt: now(),
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    };
    db.shareClasses.push(newClass);
    db.auditLog.push({
      id: genId('log'),
      action: 'share_class_created',
      actorId: data.issuerId || 'issuer-001',
      details: { classId: newClass.id, name: data.name, ticker: data.ticker },
      timestamp: now()
    });
    persist(db);
    return newClass;
  },

  purchaseTokens: async (classId, amount, userId) => {
    await simulateDelay();
    const db = getDB();
    const sc = db.shareClasses.find(s => s.id === classId);
    if (!sc) throw new Error('Share class not found');

    const user = db.users.find(u => u.id === userId);
    if (!user || user.kycStatus !== 'approved') throw new Error('KYC approval required');

    const tokenAmount = parseInt(amount);
    const totalValue = tokenAmount * sc.pricePerToken;

    if (user.totalInvested + totalValue > user.investmentLimit) throw new Error('Exceeds investment limit');
    if (sc.currentSupply + tokenAmount > sc.maxSupply) throw new Error('Exceeds maximum supply');

    sc.currentSupply += tokenAmount;
    user.totalInvested += totalValue;

    const tx = {
      id: genId('tx'),
      type: 'purchase',
      investorId: userId,
      shareClassId: classId,
      amount: tokenAmount,
      pricePerToken: sc.pricePerToken,
      totalValue,
      status: 'completed',
      txHash: genTxHash(),
      createdAt: now()
    };

    db.transactions.push(tx);
    db.auditLog.push({
      id: genId('log'),
      action: 'tokens_purchased',
      actorId: userId,
      details: { classId, amount: tokenAmount, total: totalValue },
      timestamp: now()
    });

    persist(db);
    return { transaction: tx, shareClass: sc };
  },

  sellTokens: async (classId, amount, userId) => {
    await simulateDelay();
    const db = getDB();
    const sc = db.shareClasses.find(s => s.id === classId);
    if (!sc) throw new Error('Share class not found');

    const tokenAmount = parseInt(amount);
    const userBalance = db.transactions
      .filter(tx => tx.investorId === userId && tx.shareClassId === classId && tx.status === 'completed')
      .reduce((bal, tx) => bal + (tx.type === 'purchase' ? tx.amount : -tx.amount), 0);

    if (tokenAmount > userBalance) throw new Error('Insufficient token balance');

    const totalValue = tokenAmount * sc.pricePerToken;
    sc.currentSupply -= tokenAmount;

    const tx = {
      id: genId('tx'),
      type: 'sale',
      investorId: userId,
      shareClassId: classId,
      amount: tokenAmount,
      pricePerToken: sc.pricePerToken,
      totalValue,
      status: 'completed',
      txHash: genTxHash(),
      createdAt: now()
    };

    db.transactions.push(tx);
    db.auditLog.push({
      id: genId('log'),
      action: 'tokens_sold',
      actorId: userId,
      details: { classId, amount: tokenAmount, total: totalValue },
      timestamp: now()
    });

    persist(db);
    return { transaction: tx, shareClass: sc };
  },

  getKycApplications: async () => {
    await simulateDelay();
    const db = getDB();
    return db.kycApplications.map(app => {
      const user = db.users.find(u => u.id === app.userId);
      return { ...app, userName: user?.name, userEmail: user?.email };
    });
  },

  getMyKyc: async (userId) => {
    await simulateDelay();
    const db = getDB();
    return db.kycApplications.find(a => a.userId === userId) || { status: 'none' };
  },

  submitKyc: async (userId, data) => {
    await simulateDelay();
    const db = getDB();
    const existing = db.kycApplications.find(a => a.userId === userId && a.status === 'pending');
    if (existing) throw new Error('Application already pending');

    const application = {
      id: genId('kyc'),
      userId,
      status: 'pending',
      submittedAt: now(),
      reviewedAt: null,
      kycLevel: 0,
      documents: data.documents || [],
      jurisdiction: data.jurisdiction || '',
      accreditationProof: data.accreditationProof || false
    };

    db.kycApplications.push(application);
    db.auditLog.push({
      id: genId('log'),
      action: 'kyc_submitted',
      actorId: userId,
      details: { applicationId: application.id },
      timestamp: now()
    });

    persist(db);
    return application;
  },

  approveKyc: async (id, data) => {
    await simulateDelay();
    const db = getDB();
    const app = db.kycApplications.find(a => a.id === id);
    if (!app) throw new Error('Application not found');

    app.status = 'approved';
    app.reviewedAt = now();
    app.kycLevel = data.kycLevel || 1;

    const user = db.users.find(u => u.id === app.userId);
    if (user) {
      user.kycStatus = 'approved';
      user.kycLevel = app.kycLevel;
      user.accredited = app.kycLevel >= 3;
      user.investmentLimit = data.investmentLimit || 100000;
      user.jurisdiction = app.jurisdiction || 'US';
    }

    db.auditLog.push({
      id: genId('log'),
      action: 'kyc_approved',
      actorId: 'admin-001',
      details: { applicationId: app.id, userId: app.userId, level: app.kycLevel },
      timestamp: now()
    });

    persist(db);
    return app;
  },

  rejectKyc: async (id, data) => {
    await simulateDelay();
    const db = getDB();
    const app = db.kycApplications.find(a => a.id === id);
    if (!app) throw new Error('Application not found');

    app.status = 'rejected';
    app.reviewedAt = now();
    app.rejectionReason = data.reason || '';

    db.auditLog.push({
      id: genId('log'),
      action: 'kyc_rejected',
      actorId: 'admin-001',
      details: { applicationId: app.id, userId: app.userId, reason: data.reason },
      timestamp: now()
    });

    persist(db);
    return app;
  },

  getPortfolio: async (userId) => {
    await simulateDelay();
    const db = getDB();

    const holdings = db.shareClasses.map(sc => {
      const balance = db.transactions
        .filter(tx => tx.investorId === userId && tx.shareClassId === sc.id && tx.status === 'completed')
        .reduce((bal, tx) => bal + (tx.type === 'purchase' ? tx.amount : -tx.amount), 0);

      const invested = db.transactions
        .filter(tx => tx.investorId === userId && tx.shareClassId === sc.id && tx.type === 'purchase' && tx.status === 'completed')
        .reduce((sum, tx) => sum + tx.totalValue, 0);

      const currentValue = balance * sc.pricePerToken;
      const returnPct = invested > 0 ? ((currentValue - invested) / invested * 100) : 0;

      return {
        shareClassId: sc.id,
        name: sc.name,
        ticker: sc.ticker,
        balance,
        avgCost: balance > 0 ? invested / balance : 0,
        currentPrice: sc.pricePerToken,
        currentValue,
        invested,
        returnPct,
        dividendYield: sc.dividendBps / 100
      };
    }).filter(h => h.balance > 0);

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.invested, 0);
    const totalReturn = totalValue - totalInvested;

    return {
      holdings,
      summary: {
        totalValue,
        totalInvested,
        totalReturn,
        returnPct: totalInvested > 0 ? (totalReturn / totalInvested * 100) : 0,
        holdingsCount: holdings.length,
        dividendYield: holdings.length > 0
          ? holdings.reduce((sum, h) => sum + h.dividendYield, 0) / holdings.length
          : 0
      }
    };
  },

  getTransactions: async (userId, params = {}) => {
    await simulateDelay();
    const db = getDB();
    let txs = db.transactions.filter(tx => tx.investorId === userId);
    if (params.shareClassId) txs = txs.filter(tx => tx.shareClassId === params.shareClassId);
    if (params.type) txs = txs.filter(tx => tx.type === params.type);

    return txs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(params.limit) || 50)
      .map(tx => {
        const sc = db.shareClasses.find(s => s.id === tx.shareClassId);
        return { ...tx, shareClassName: sc?.name, shareClassTicker: sc?.ticker };
      });
  },

  getAdminDashboard: async () => {
    await simulateDelay();
    const db = getDB();

    const totalInvestors = db.users.filter(u => u.role === 'investor').length;
    const approvedInvestors = db.users.filter(u => u.role === 'investor' && u.kycStatus === 'approved').length;
    const pendingKyc = db.kycApplications.filter(a => a.status === 'pending').length;
    const totalTokensSold = db.shareClasses.reduce((sum, sc) => sum + sc.currentSupply, 0);
    const totalMarketCap = db.shareClasses.reduce((sum, sc) => sum + (sc.currentSupply * sc.pricePerToken), 0);
    const totalRaised = db.transactions
      .filter(tx => tx.type === 'purchase' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.totalValue, 0);

    const recentTx = db.transactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(tx => {
        const user = db.users.find(u => u.id === tx.investorId);
        const sc = db.shareClasses.find(s => s.id === tx.shareClassId);
        return { ...tx, investorName: user?.name, shareClassName: sc?.name };
      });

    return {
      stats: {
        totalInvestors,
        approvedInvestors,
        pendingKyc,
        totalShareClasses: db.shareClasses.length,
        totalTokensSold,
        totalMarketCap,
        totalRaised,
        totalTransactions: db.transactions.length
      },
      recentTransactions: recentTx,
      recentAuditLogs: db.auditLog
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20),
      settings: db.settings
    };
  },

  getUsers: async () => {
    await simulateDelay();
    const db = getDB();
    return db.users.map(({ password, ...u }) => u);
  },

  updateUser: async (id, updates) => {
    await simulateDelay();
    const db = getDB();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');
    db.users[idx] = { ...db.users[idx], ...updates };
    persist(db);
    const { password: _, ...safeUser } = db.users[idx];
    return safeUser;
  },

  getAuditLog: async (params = {}) => {
    await simulateDelay();
    const db = getDB();
    let logs = db.auditLog;
    if (params.action) logs = logs.filter(l => l.action === params.action);
    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(params.limit) || 100);
  },

  updateSettings: async (data) => {
    await simulateDelay();
    const db = getDB();
    db.settings = { ...db.settings, ...data };
    db.auditLog.push({
      id: genId('log'),
      action: 'settings_updated',
      actorId: 'admin-001',
      details: data,
      timestamp: now()
    });
    persist(db);
    return db.settings;
  },
};
