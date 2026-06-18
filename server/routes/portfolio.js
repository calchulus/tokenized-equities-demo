const express = require('express');
const { loadDB } = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('investor'), (req, res) => {
  const db = loadDB();
  const userId = req.user.id;

  const holdings = db.shareClasses.map(sc => {
    const balance = db.transactions
      .filter(tx => tx.investorId === userId && tx.shareClassId === sc.id && tx.status === 'completed')
      .reduce((bal, tx) => {
        if (tx.type === 'purchase') return bal + tx.amount;
        if (tx.type === 'sale') return bal - tx.amount;
        return bal;
      }, 0);

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
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested * 100) : 0;

  res.json({
    holdings,
    summary: {
      totalValue,
      totalInvested,
      totalReturn,
      returnPct,
      holdingsCount: holdings.length,
      dividendYield: holdings.length > 0
        ? holdings.reduce((sum, h) => sum + h.dividendYield, 0) / holdings.length
        : 0
    }
  });
});

router.get('/transactions', authMiddleware, (req, res) => {
  const db = loadDB();
  const userId = req.user.id;
  const { shareClassId, type, limit = 50 } = req.query;

  let txs = db.transactions.filter(tx => tx.investorId === userId);

  if (shareClassId) txs = txs.filter(tx => tx.shareClassId === shareClassId);
  if (type) txs = txs.filter(tx => tx.type === type);

  txs = txs
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, parseInt(limit))
    .map(tx => {
      const sc = db.shareClasses.find(s => s.id === tx.shareClassId);
      return { ...tx, shareClassName: sc?.name, shareClassTicker: sc?.ticker };
    });

  res.json(txs);
});

module.exports = router;
