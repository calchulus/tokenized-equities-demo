const express = require('express');
const { loadDB, saveDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

function createToken(userId, role) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, role, iat: Date.now(), exp: Date.now() + 86400000 })).toString('base64url');
  const signature = Buffer.from(`${header}.${payload}.demo-sig`).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = createToken(user.id, user.role);
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.post('/register', (req, res) => {
  const { email, password, name, role = 'investor', walletAddress, company } = req.body;
  const db = loadDB();

  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const newUser = {
    id: `user-${uuidv4().slice(0, 8)}`,
    email,
    password,
    name,
    role,
    walletAddress: walletAddress || '',
    company: company || '',
    kycStatus: 'none',
    kycLevel: 0,
    accredited: false,
    jurisdiction: '',
    investmentLimit: 0,
    totalInvested: 0,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDB(db);

  const token = createToken(newUser.id, newUser.role);
  const { password: _, ...safeUser } = newUser;
  res.json({ token, user: safeUser });
});

module.exports = router;
