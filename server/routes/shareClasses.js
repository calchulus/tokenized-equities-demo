const express = require('express');
const { loadDB, saveDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', (req, res) => {
  const db = loadDB();
  const classes = db.shareClasses.map(sc => {
    const issuer = db.users.find(u => u.id === sc.issuerId);
    return { ...sc, issuerName: issuer?.name || 'Unknown' };
  });
  res.json(classes);
});

router.get('/:id', (req, res) => {
  const db = loadDB();
  const sc = db.shareClasses.find(s => s.id === req.params.id);
  if (!sc) return res.status(404).json({ error: 'Share class not found' });

  const issuer = db.users.find(u => u.id === sc.issuerId);
  const holders = db.transactions
    .filter(tx => tx.shareClassId === sc.id && tx.status === 'completed')
    .reduce((acc, tx) => {
      if (tx.type === 'purchase') acc[tx.investorId] = (acc[tx.investorId] || 0) + tx.amount;
      if (tx.type === 'sale') acc[tx.investorId] = (acc[tx.investorId] || 0) - tx.amount;
      return acc;
    }, {});

  res.json({ ...sc, issuerName: issuer?.name || 'Unknown', holders });
});

router.post('/', authMiddleware, roleMiddleware('admin', 'issuer'), (req, res) => {
  const { name, ticker, maxSupply, pricePerToken, dividendBps, description } = req.body;
  const db = loadDB();

  const newClass = {
    id: `sc-${uuidv4().slice(0, 8)}`,
    name,
    ticker,
    issuerId: req.user.id,
    maxSupply: parseInt(maxSupply),
    currentSupply: 0,
    pricePerToken: parseFloat(pricePerToken),
    dividendBps: parseInt(dividendBps) || 0,
    status: 'active',
    description: description || '',
    createdAt: new Date().toISOString(),
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
  };

  db.shareClasses.push(newClass);
  db.auditLog.push({
    id: `log-${uuidv4().slice(0, 8)}`,
    action: 'share_class_created',
    actorId: req.user.id,
    details: { classId: newClass.id, name, ticker },
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  res.status(201).json(newClass);
});

router.put('/:id', authMiddleware, roleMiddleware('admin', 'issuer'), (req, res) => {
  const db = loadDB();
  const idx = db.shareClasses.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Share class not found' });

  const updates = req.body;
  db.shareClasses[idx] = { ...db.shareClasses[idx], ...updates };
  saveDB(db);
  res.json(db.shareClasses[idx]);
});

router.post('/:id/purchase', authMiddleware, roleMiddleware('investor'), (req, res) => {
  const { amount } = req.body;
  const db = loadDB();
  const sc = db.shareClasses.find(s => s.id === req.params.id);
  if (!sc) return res.status(404).json({ error: 'Share class not found' });

  const user = db.users.find(u => u.id === req.user.id);
  if (user.kycStatus !== 'approved') {
    return res.status(403).json({ error: 'KYC approval required' });
  }

  const tokenAmount = parseInt(amount);
  const totalValue = tokenAmount * sc.pricePerToken;

  if (user.totalInvested + totalValue > user.investmentLimit) {
    return res.status(400).json({ error: 'Exceeds investment limit' });
  }

  if (sc.currentSupply + tokenAmount > sc.maxSupply) {
    return res.status(400).json({ error: 'Exceeds maximum supply' });
  }

  sc.currentSupply += tokenAmount;
  user.totalInvested += totalValue;

  const tx = {
    id: `tx-${uuidv4().slice(0, 8)}`,
    type: 'purchase',
    investorId: user.id,
    shareClassId: sc.id,
    amount: tokenAmount,
    pricePerToken: sc.pricePerToken,
    totalValue,
    status: 'completed',
    txHash: `0x${uuidv4().replace(/-/g, '').slice(0, 64)}`,
    createdAt: new Date().toISOString()
  };

  db.transactions.push(tx);
  db.auditLog.push({
    id: `log-${uuidv4().slice(0, 8)}`,
    action: 'tokens_purchased',
    actorId: user.id,
    details: { classId: sc.id, amount: tokenAmount, total: totalValue },
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  res.json({ transaction: tx, shareClass: sc });
});

router.post('/:id/sell', authMiddleware, roleMiddleware('investor'), (req, res) => {
  const { amount } = req.body;
  const db = loadDB();
  const sc = db.shareClasses.find(s => s.id === req.params.id);
  if (!sc) return res.status(404).json({ error: 'Share class not found' });

  const user = db.users.find(u => u.id === req.user.id);
  const tokenAmount = parseInt(amount);

  const userBalance = db.transactions
    .filter(tx => tx.investorId === user.id && tx.shareClassId === sc.id && tx.status === 'completed')
    .reduce((bal, tx) => {
      if (tx.type === 'purchase') return bal + tx.amount;
      if (tx.type === 'sale') return bal - tx.amount;
      return bal;
    }, 0);

  if (tokenAmount > userBalance) {
    return res.status(400).json({ error: 'Insufficient token balance' });
  }

  const totalValue = tokenAmount * sc.pricePerToken;
  sc.currentSupply -= tokenAmount;

  const tx = {
    id: `tx-${uuidv4().slice(0, 8)}`,
    type: 'sale',
    investorId: user.id,
    shareClassId: sc.id,
    amount: tokenAmount,
    pricePerToken: sc.pricePerToken,
    totalValue,
    status: 'completed',
    txHash: `0x${uuidv4().replace(/-/g, '').slice(0, 64)}`,
    createdAt: new Date().toISOString()
  };

  db.transactions.push(tx);
  db.auditLog.push({
    id: `log-${uuidv4().slice(0, 8)}`,
    action: 'tokens_sold',
    actorId: user.id,
    details: { classId: sc.id, amount: tokenAmount, total: totalValue },
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  res.json({ transaction: tx, shareClass: sc });
});

module.exports = router;
