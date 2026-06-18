const express = require('express');
const { loadDB, saveDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const db = loadDB();
  const applications = db.kycApplications.map(app => {
    const user = db.users.find(u => u.id === app.userId);
    return { ...app, userName: user?.name, userEmail: user?.email };
  });
  res.json(applications);
});

router.get('/mine', authMiddleware, (req, res) => {
  const db = loadDB();
  const app = db.kycApplications.find(a => a.userId === req.user.id);
  res.json(app || { status: 'none' });
});

router.post('/submit', authMiddleware, roleMiddleware('investor'), (req, res) => {
  const { documents, jurisdiction, accreditationProof } = req.body;
  const db = loadDB();

  const existing = db.kycApplications.find(a => a.userId === req.user.id && a.status === 'pending');
  if (existing) {
    return res.status(400).json({ error: 'Application already pending' });
  }

  const application = {
    id: `kyc-${uuidv4().slice(0, 8)}`,
    userId: req.user.id,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    kycLevel: 0,
    documents: documents || [],
    jurisdiction: jurisdiction || '',
    accreditationProof: accreditationProof || false
  };

  db.kycApplications.push(application);
  db.auditLog.push({
    id: `log-${uuidv4().slice(0, 8)}`,
    action: 'kyc_submitted',
    actorId: req.user.id,
    details: { applicationId: application.id },
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  res.status(201).json(application);
});

router.post('/:id/approve', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { kycLevel, investmentLimit } = req.body;
  const db = loadDB();

  const app = db.kycApplications.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  app.status = 'approved';
  app.reviewedAt = new Date().toISOString();
  app.kycLevel = kycLevel || 1;

  const user = db.users.find(u => u.id === app.userId);
  if (user) {
    user.kycStatus = 'approved';
    user.kycLevel = app.kycLevel;
    user.accredited = app.kycLevel >= 3;
    user.investmentLimit = investmentLimit || 100000;
    user.jurisdiction = app.jurisdiction || 'US';
  }

  db.auditLog.push({
    id: `log-${uuidv4().slice(0, 8)}`,
    action: 'kyc_approved',
    actorId: req.user.id,
    details: { applicationId: app.id, userId: app.userId, level: app.kycLevel },
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  res.json(app);
});

router.post('/:id/reject', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { reason } = req.body;
  const db = loadDB();

  const app = db.kycApplications.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  app.status = 'rejected';
  app.reviewedAt = new Date().toISOString();
  app.rejectionReason = reason || '';

  db.auditLog.push({
    id: `log-${uuidv4().slice(0, 8)}`,
    action: 'kyc_rejected',
    actorId: req.user.id,
    details: { applicationId: app.id, userId: app.userId, reason },
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  res.json(app);
});

module.exports = router;
