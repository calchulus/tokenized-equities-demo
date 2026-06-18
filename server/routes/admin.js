const express = require('express');
const { loadDB, saveDB } = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/dashboard', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const db = loadDB();

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

  const recentLogs = db.auditLog
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  res.json({
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
    recentAuditLogs: recentLogs,
    settings: db.settings
  });
});

router.get('/users', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const db = loadDB();
  const users = db.users.map(({ password, ...u }) => u);
  res.json(users);
});

router.put('/users/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const { password, ...updates } = req.body;
  db.users[idx] = { ...db.users[idx], ...updates };
  saveDB(db);

  const { password: _, ...safeUser } = db.users[idx];
  res.json(safeUser);
});

router.get('/audit', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const db = loadDB();
  const { action, limit = 100 } = req.query;

  let logs = db.auditLog;
  if (action) logs = logs.filter(l => l.action === action);

  logs = logs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit));

  res.json(logs);
});

router.put('/settings', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const db = loadDB();
  db.settings = { ...db.settings, ...req.body };
  db.auditLog.push({
    id: `log-${Date.now()}`,
    action: 'settings_updated',
    actorId: req.user.id,
    details: req.body,
    timestamp: new Date().toISOString()
  });
  saveDB(db);
  res.json(db.settings);
});

module.exports = router;
