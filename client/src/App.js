import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useWeb3 } from './contexts/Web3Context';
import WalletConnect from './components/WalletConnect';
import { api } from './utils/api';
import { formatCurrency, formatNumber, formatPercent, formatDate, formatDateTime, truncateAddress } from './utils/helpers';
import {
  LayoutDashboard, Coins, ShoppingCart, Briefcase, ShieldCheck,
  Settings, LogOut, Users, FileText, TrendingUp, Plus, Search,
  ChevronRight, X, Check, AlertTriangle, Eye, Ban, Activity, Wallet,
  Database
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

function MockDataBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--warning)' }}>
        <Database size={14} />
        <span><strong>Mock Data</strong> — This demo uses simulated data stored in your browser. No real transactions occur.</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

function Sidebar() {
  const { user, logout } = useAuth();
  const { isConnected, account } = useWeb3();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isIssuer = user?.role === 'issuer' || isAdmin;
  const isInvestor = user?.role === 'investor' || isAdmin;

  const links = [
    ...(isAdmin ? [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/users', icon: Users, label: 'Users' },
      { to: '/admin/kyc', icon: ShieldCheck, label: 'KYC Review' },
      { to: '/admin/audit', icon: FileText, label: 'Audit Log' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ] : []),
    ...(isIssuer ? [
      { to: '/marketplace', icon: ShoppingCart, label: 'Marketplace' },
      { to: '/create', icon: Plus, label: 'Create Token' },
    ] : []),
    ...(isInvestor && !isAdmin ? [
      { to: '/marketplace', icon: ShoppingCart, label: 'Marketplace' },
      { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
      { to: '/kyc', icon: ShieldCheck, label: 'KYC Status' },
    ] : []),
  ];

  if (isAdmin) {
    links.splice(0, 0, { to: '/marketplace', icon: ShoppingCart, label: 'Marketplace' });
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">EC</div>
        <div>
          <h1>EquityChain</h1>
          <span>Tokenized Equities</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Navigation</div>
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              <link.icon />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <div style={{ padding: '0 12px 16px' }}>
        <div className="nav-section-title" style={{ padding: '0 12px', marginBottom: 8 }}>Wallet</div>
        <WalletConnect />
      </div>
      <div className="sidebar-user">
        <div className="user-avatar">{user?.name?.[0] || '?'}</div>
        <div className="user-info">
          <div className="name">{user?.name}</div>
          <div className="role">{user?.role}</div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

function Layout({ children, headerExtra }) {
  const { isConnected, account, balance } = useWeb3();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {isConnected && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: 'var(--success-bg)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--success)',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                <span className="font-mono">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span>{balance} ETH</span>
              </div>
            )}
            {headerExtra}
          </div>
        </div>
        <MockDataBanner />
        {children}
      </main>
    </div>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleLogin = async (email, password) => {
    try {
      setError('');
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'issuer' ? '/marketplace' : '/marketplace');
    } catch (e) {
      setError(e.message);
    }
  };

  const demoAccounts = [
    { email: 'admin@tokenize.demo', password: 'admin123', label: 'Platform Admin', role: 'admin' },
    { email: 'issuer@acme.com', password: 'issuer123', label: 'Acme Corp (Issuer)', role: 'issuer' },
    { email: 'investor@example.com', password: 'investor123', label: 'Jane Smith (Investor)', role: 'investor' },
  ];

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <div className="icon">EC</div>
          <h2>EquityChain</h2>
          <p>SEC-Compliant Tokenized Equities Platform</p>
        </div>

        <div className="alert info">
          Now compliant under April 2026 SEC regulatory framework
        </div>

        {error && <div className="alert danger">{error}</div>}

        <div className="form-group">
          <label>Email</label>
          <input type="email" id="email" placeholder="Enter your email" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" id="password" placeholder="Enter your password" />
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password);
          }}
        >
          Sign In
        </button>

        <div className="demo-accounts">
          <h4>Demo Accounts</h4>
          {demoAccounts.map(acc => (
            <button
              key={acc.email}
              className="demo-account-btn"
              onClick={() => handleLogin(acc.email, acc.password)}
            >
              <span>{acc.label}</span>
              <span className="role">{acc.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketplacePage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [toast, setToast] = useState(null);
  const { user } = useAuth();
  const { isConnected, account } = useWeb3();

  const load = useCallback(async () => {
    try {
      setClasses(await api.getShareClasses());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePurchase = async () => {
    try {
      await api.purchaseTokens(selectedClass.id, parseInt(purchaseAmount), user.id);
      setToast({ message: 'Tokens purchased successfully!', type: 'success' });
      setSelectedClass(null);
      setPurchaseAmount('');
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleSell = async () => {
    try {
      await api.sellTokens(selectedClass.id, parseInt(sellAmount), user.id);
      setToast({ message: 'Tokens sold successfully!', type: 'success' });
      setSelectedClass(null);
      setSellAmount('');
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading marketplace...</div>;

  return (
    <Layout>
      <div className="page-header">
        <h2>Token Marketplace</h2>
        <p>SEC-compliant tokenized equity offerings</p>
      </div>

      <div className="sec-banner">
        <div className="icon">
          <ShieldCheck size={24} color="white" />
        </div>
        <div>
          <h4>April 2026 SEC Regulatory Compliance</h4>
          <p>All token offerings comply with the updated SEC framework for digital asset securities. KYC/AML verification required for all investors.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Active Offerings</div>
          <div className="value">{classes.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Market Cap</div>
          <div className="value">{formatCurrency(classes.reduce((s, c) => s + c.currentSupply * c.pricePerToken, 0))}</div>
        </div>
        <div className="stat-card">
          <div className="label">Tokens Issued</div>
          <div className="value">{formatNumber(classes.reduce((s, c) => s + c.currentSupply, 0))}</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg Dividend Yield</div>
          <div className="value">{classes.length ? (classes.reduce((s, c) => s + c.dividendBps, 0) / classes.length / 100).toFixed(1) : 0}%</div>
        </div>
      </div>

      <div className="grid-3">
        {classes.map(sc => (
          <div key={sc.id} className="share-class-card" onClick={() => setSelectedClass(sc)}>
            <div className="ticker">{sc.ticker}</div>
            <h4>{sc.name}</h4>
            <div className="price">{formatCurrency(sc.pricePerToken)}</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              {sc.description?.slice(0, 100)}...
            </p>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${(sc.currentSupply / sc.maxSupply) * 100}%` }} />
            </div>
            <div className="meta">
              <span>{formatNumber(sc.currentSupply)} / {formatNumber(sc.maxSupply)}</span>
              <span>{(sc.currentSupply / sc.maxSupply * 100).toFixed(1)}% sold</span>
            </div>
          </div>
        ))}
      </div>

      {selectedClass && (
        <div className="modal-overlay" onClick={() => setSelectedClass(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{selectedClass.name}</h3>
              <button onClick={() => setSelectedClass(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Price per Token</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(selectedClass.pricePerToken)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dividend Yield</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{(selectedClass.dividendBps / 100).toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Available</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatNumber(selectedClass.maxSupply - selectedClass.currentSupply)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Contract</div>
                <div style={{ fontSize: 14, fontFamily: 'monospace' }}>{truncateAddress(selectedClass.contractAddress)}</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{selectedClass.description}</p>

            {user?.role === 'investor' && (
              <>
                {!isConnected && (
                  <div className="alert warning" style={{ marginBottom: 16 }}>
                    <Wallet size={16} /> Connect your MetaMask wallet to trade tokens on-chain
                  </div>
                )}
                {isConnected && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: 'var(--success-bg)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    marginBottom: 16,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                    <span>Wallet connected: </span>
                    <span className="font-mono" style={{ fontWeight: 600 }}>{account?.slice(0, 6)}...{account?.slice(-4)}</span>
                  </div>
                )}
                <div className="form-group">
                  <label>Buy Tokens (amount)</label>
                  <input
                    type="number"
                    value={purchaseAmount}
                    onChange={e => setPurchaseAmount(e.target.value)}
                    placeholder="Enter token amount"
                    min="1"
                  />
                </div>
                {purchaseAmount && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Total cost: <strong>{formatCurrency(parseInt(purchaseAmount || 0) * selectedClass.pricePerToken)}</strong>
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handlePurchase}
                  disabled={!purchaseAmount || !isConnected}
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
                >
                  <Wallet size={16} /> {!isConnected ? 'Connect Wallet to Buy' : 'Purchase Tokens'}
                </button>

                <div className="form-group">
                  <label>Sell Tokens (amount)</label>
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={e => setSellAmount(e.target.value)}
                    placeholder="Enter token amount to sell"
                    min="1"
                  />
                </div>
                <button
                  className="btn btn-danger"
                  onClick={handleSell}
                  disabled={!sellAmount || !isConnected}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {!isConnected ? 'Connect Wallet to Sell' : 'Sell Tokens'}
                </button>
              </>
            )}

            {user?.role !== 'investor' && (
              <div className="alert info">
                Switch to an investor account to trade tokens.
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </Layout>
  );
}

function CreateTokenPage() {
  const [form, setForm] = useState({
    name: '', ticker: '', maxSupply: '', pricePerToken: '', dividendBps: '', description: ''
  });
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createShareClass({ ...form, issuerId: user.id });
      setToast({ message: 'Share class created successfully!', type: 'success' });
      setTimeout(() => navigate('/marketplace'), 1500);
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Create Tokenized Equity</h2>
        <p>Issue a new tokenized equity offering under SEC compliance</p>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="alert info" style={{ marginBottom: 24 }}>
          Under the April 2026 SEC framework, tokenized equities are treated as registered securities. All offerings require compliance review.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Share Class Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Acme Corp Common Stock"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ticker Symbol</label>
              <input
                type="text"
                value={form.ticker}
                onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                placeholder="e.g., ACME"
                required
              />
            </div>
            <div className="form-group">
              <label>Dividend (basis points)</label>
              <input
                type="number"
                value={form.dividendBps}
                onChange={e => setForm({ ...form, dividendBps: e.target.value })}
                placeholder="e.g., 250 = 2.5%"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max Supply (tokens)</label>
              <input
                type="number"
                value={form.maxSupply}
                onChange={e => setForm({ ...form, maxSupply: e.target.value })}
                placeholder="e.g., 1000000"
                required
              />
            </div>
            <div className="form-group">
              <label>Price per Token (USD)</label>
              <input
                type="number"
                step="0.01"
                value={form.pricePerToken}
                onChange={e => setForm({ ...form, pricePerToken: e.target.value })}
                placeholder="e.g., 25.00"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the equity offering, use of proceeds, risk factors..."
              rows={4}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Create Offering
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/marketplace')}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </Layout>
  );
}

function PortfolioPage() {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    Promise.all([api.getPortfolio(user.id), api.getTransactions(user.id)])
      .then(([p, t]) => { setData(p); setTransactions(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Token', 'Amount', 'Price', 'Total', 'Status'];
    const rows = transactions.map(tx => [
      formatDate(tx.createdAt), tx.type, tx.shareClassTicker, tx.amount, tx.pricePerToken, tx.totalValue, tx.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'portfolio-transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading portfolio...</div>;
  if (!data) return <div className="empty-state"><h4>Failed to load portfolio</h4></div>;

  const { holdings, summary } = data;
  const pieData = holdings.map(h => ({ name: h.ticker, value: h.currentValue }));
  const COLORS = ['#3b82f6', '#a855f7', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

  const maxAllocation = holdings.length > 0
    ? Math.max(...holdings.map(h => (h.currentValue / summary.totalValue) * 100))
    : 0;
  const diversificationScore = holdings.length <= 1 ? 'Low' : maxAllocation > 70 ? 'Medium' : 'High';

  const performanceData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const fluctuation = 1 + (Math.sin(i * 0.4) * 0.03) + (Math.random() * 0.02 - 0.01);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(summary.totalValue * fluctuation)
    };
  });

  const dividendData = holdings.map(h => ({
    ...h,
    annualDividend: h.currentValue * (h.dividendYield / 100),
    monthlyDividend: h.currentValue * (h.dividendYield / 100) / 12
  }));

  const totalAnnualDividend = dividendData.reduce((s, h) => s + h.annualDividend, 0);

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Portfolio</h2>
          <p>Your tokenized equity holdings and performance</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
          Export CSV
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Portfolio Value</div>
          <div className="value">{formatCurrency(summary.totalValue)}</div>
          <div className={`change ${summary.totalReturn >= 0 ? 'positive' : 'negative'}`}>
            {formatPercent(summary.returnPct)} all time
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Total Invested</div>
          <div className="value">{formatCurrency(summary.totalInvested)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Unrealized P&L</div>
          <div className={`value ${summary.totalReturn >= 0 ? 'text-success' : 'text-danger'}`}>
            {summary.totalReturn >= 0 ? '+' : ''}{formatCurrency(summary.totalReturn)}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Est. Annual Dividends</div>
          <div className="value text-accent">{formatCurrency(totalAnnualDividend)}</div>
          <div className="change" style={{ color: 'var(--text-muted)' }}>
            {summary.dividendYield.toFixed(1)}% avg yield
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
        {['overview', 'performance', 'dividends'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === tab ? 'var(--accent)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Risk Metrics */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="label">Diversification</div>
              <div className="value" style={{ fontSize: 20 }}>{diversificationScore}</div>
              <div className="change" style={{ color: 'var(--text-muted)' }}>{holdings.length} positions</div>
            </div>
            <div className="stat-card">
              <div className="label">Largest Position</div>
              <div className="value" style={{ fontSize: 20 }}>
                {holdings.length > 0 ? holdings.reduce((a, b) => a.currentValue > b.currentValue ? a : b).ticker : '—'}
              </div>
              <div className="change" style={{ color: maxAllocation > 70 ? 'var(--warning)' : 'var(--text-muted)' }}>
                {maxAllocation.toFixed(1)}% of portfolio
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Total Tokens</div>
              <div className="value" style={{ fontSize: 20 }}>{formatNumber(holdings.reduce((s, h) => s + h.balance, 0))}</div>
            </div>
            <div className="stat-card">
              <div className="label">Avg Cost Basis</div>
              <div className="value" style={{ fontSize: 20 }}>
                {holdings.length > 0 ? formatCurrency(holdings.reduce((s, h) => s + h.avgCost, 0) / holdings.length) : '—'}
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Holdings Detail Cards */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Holdings</h3>
              {holdings.length === 0 ? (
                <div className="empty-state"><h4>No holdings yet</h4><p>Visit the marketplace to purchase tokens</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {holdings.map(h => {
                    const allocation = (h.currentValue / summary.totalValue) * 100;
                    const isSelected = selectedHolding?.shareClassId === h.shareClassId;
                    return (
                      <div
                        key={h.shareClassId}
                        onClick={() => setSelectedHolding(isSelected ? null : h)}
                        style={{
                          padding: 16,
                          background: isSelected ? 'var(--accent-light)' : 'var(--bg-input)',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <span className="font-bold">{h.ticker}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{h.name}</span>
                          </div>
                          <span className={h.returnPct >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 600 }}>
                            {formatPercent(h.returnPct)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                          <span>{formatNumber(h.balance)} tokens</span>
                          <span>{formatCurrency(h.currentValue)}</span>
                        </div>
                        <div className="progress-bar" style={{ marginTop: 8 }}>
                          <div className="fill" style={{ width: `${allocation}%`, background: COLORS[holdings.indexOf(h) % COLORS.length] }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          <span>{allocation.toFixed(1)}% allocation</span>
                          <span>Avg cost: {formatCurrency(h.avgCost)}</span>
                        </div>

                        {isSelected && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 13 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Cost Basis</div>
                                <div className="font-bold">{formatCurrency(h.invested)}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Current Value</div>
                                <div className="font-bold">{formatCurrency(h.currentValue)}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Unrealized P&L</div>
                                <div className={`font-bold ${h.currentValue - h.invested >= 0 ? 'text-success' : 'text-danger'}`}>
                                  {h.currentValue - h.invested >= 0 ? '+' : ''}{formatCurrency(h.currentValue - h.invested)}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Dividend Yield</div>
                                <div className="font-bold text-accent">{h.dividendYield.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Allocation Chart */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Allocation</h3>
              {holdings.length === 0 ? (
                <div className="empty-state"><h4>No data</h4></div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 12 }}>
                    {holdings.map((h, i) => (
                      <div key={h.shareClassId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                        <span>{h.ticker}</span>
                        <span className="text-muted">{((h.currentValue / summary.totalValue) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'performance' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Portfolio Performance (30 Days)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => formatCurrency(v)} tickLine={false} />
              <Tooltip
                formatter={(v) => [formatCurrency(v), 'Portfolio Value']}
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'dividends' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Dividend Income Tracker</h3>
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="label">Est. Annual Dividends</div>
              <div className="value text-accent">{formatCurrency(totalAnnualDividend)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Est. Monthly Income</div>
              <div className="value">{formatCurrency(totalAnnualDividend / 12)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Avg Yield</div>
              <div className="value">{summary.dividendYield.toFixed(1)}%</div>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Value</th>
                  <th>Yield</th>
                  <th>Annual Income</th>
                  <th>Monthly Income</th>
                </tr>
              </thead>
              <tbody>
                {dividendData.map(h => (
                  <tr key={h.shareClassId}>
                    <td className="font-bold">{h.ticker}</td>
                    <td>{formatCurrency(h.currentValue)}</td>
                    <td className="text-accent">{h.dividendYield.toFixed(1)}%</td>
                    <td className="font-bold">{formatCurrency(h.annualDividend)}</td>
                    <td>{formatCurrency(h.monthlyDividend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Transaction History</h3>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>Export</button>
        </div>
        {transactions.length === 0 ? (
          <div className="empty-state"><h4>No transactions</h4></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Token</th>
                  <th>Amount</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.createdAt)}</td>
                    <td>
                      <span className={`badge ${tx.type === 'purchase' ? 'success' : 'danger'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td>{tx.shareClassTicker}</td>
                    <td>{formatNumber(tx.amount)}</td>
                    <td>{formatCurrency(tx.pricePerToken)}</td>
                    <td className="font-bold">{formatCurrency(tx.totalValue)}</td>
                    <td><span className="badge success">{tx.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

function KycPage() {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    api.getMyKyc(user.id)
      .then(setApplication)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleSubmit = async () => {
    try {
      const app = await api.submitKyc(user.id, {
        documents: ['passport', 'proof_of_address'],
        jurisdiction: 'US',
      });
      setApplication(app);
      setToast({ message: 'KYC application submitted!', type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading KYC status...</div>;

  const statusMap = {
    none: { label: 'Not Started', color: 'info', icon: <ShieldCheck size={48} /> },
    pending: { label: 'Under Review', color: 'warning', icon: <Eye size={48} /> },
    approved: { label: 'Approved', color: 'success', icon: <Check size={48} /> },
    rejected: { label: 'Rejected', color: 'danger', icon: <Ban size={48} /> },
  };

  const status = statusMap[application?.status || 'none'];

  return (
    <Layout>
      <div className="page-header">
        <h2>KYC Verification</h2>
        <p>Complete identity verification to start trading</p>
      </div>

      <div className="card" style={{ maxWidth: 640, textAlign: 'center', padding: 48 }}>
        <div style={{ color: `var(--${status.color})`, marginBottom: 16 }}>
          {status.icon}
        </div>
        <h3 style={{ fontSize: 24, marginBottom: 8 }}>KYC Status: {status.label}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          {application?.status === 'none' && 'You need to complete KYC verification before you can invest in tokenized equities.'}
          {application?.status === 'pending' && `Submitted on ${formatDate(application.submittedAt)}. Our compliance team will review your documents within 2-3 business days.`}
          {application?.status === 'approved' && `Approved at KYC Level ${application.kycLevel}. You can now invest up to ${formatCurrency(user?.investmentLimit || 0)}.`}
          {application?.status === 'rejected' && `Reason: ${application.rejectionReason || 'Not specified'}. Please contact support.`}
        </p>

        {application?.status === 'none' && (
          <button className="btn btn-primary" onClick={handleSubmit}>
            <ShieldCheck size={16} /> Start KYC Process
          </button>
        )}

        {application?.status === 'approved' && (
          <div className="stats-grid" style={{ maxWidth: 400, margin: '0 auto' }}>
            <div className="stat-card">
              <div className="label">KYC Level</div>
              <div className="value">{application.kycLevel}</div>
            </div>
            <div className="stat-card">
              <div className="label">Investment Limit</div>
              <div className="value">{formatCurrency(user?.investmentLimit || 0)}</div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </Layout>
  );
}

function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading dashboard...</div>;
  if (!data) return <div className="empty-state"><h4>Failed to load</h4></div>;

  const { stats, recentTransactions, recentAuditLogs } = data;

  const chartData = [
    { name: 'Market Cap', value: stats.totalMarketCap },
    { name: 'Total Raised', value: stats.totalRaised },
  ];

  const txTypeData = recentTransactions.reduce((acc, tx) => {
    const existing = acc.find(d => d.name === tx.type);
    if (existing) existing.value += tx.totalValue;
    else acc.push({ name: tx.type, value: tx.totalValue });
    return acc;
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p>Platform overview and management</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Investors</div>
          <div className="value">{stats.totalInvestors}</div>
          <div className="change positive">{stats.approvedInvestors} approved</div>
        </div>
        <div className="stat-card">
          <div className="label">Share Classes</div>
          <div className="value">{stats.totalShareClasses}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Market Cap</div>
          <div className="value">{formatCurrency(stats.totalMarketCap)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Funds Raised</div>
          <div className="value">{formatCurrency(stats.totalRaised)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Transactions</div>
          <div className="value">{stats.totalTransactions}</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending KYC</div>
          <div className={`value ${stats.pendingKyc > 0 ? 'text-warning' : ''}`}>{stats.pendingKyc}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Platform Metrics</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" tickFormatter={v => formatCurrency(v)} />
              <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Recent Activity</h3>
          {recentAuditLogs.slice(0, 6).map(log => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <Activity size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>
                <span className="font-bold">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-muted" style={{ marginLeft: 8 }}>{formatDateTime(log.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Transactions</h3>
          <Link to="/admin/audit" className="btn btn-sm btn-secondary">
            View All <ChevronRight size={14} />
          </Link>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Investor</th>
                <th>Token</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(tx => (
                <tr key={tx.id}>
                  <td>{formatDateTime(tx.createdAt)}</td>
                  <td>{tx.investorName}</td>
                  <td>{tx.shareClassName}</td>
                  <td><span className={`badge ${tx.type === 'purchase' ? 'success' : 'danger'}`}>{tx.type}</span></td>
                  <td>{formatNumber(tx.amount)}</td>
                  <td className="font-bold">{formatCurrency(tx.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading users...</div>;

  return (
    <Layout>
      <div className="page-header">
        <h2>User Management</h2>
        <p>Manage platform users and permissions</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>KYC Status</th>
                <th>Accredited</th>
                <th>Invested</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="font-bold">{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'purple' : u.role === 'issuer' ? 'info' : 'success'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.kycStatus === 'approved' ? 'success' : u.kycStatus === 'pending' ? 'warning' : 'info'}`}>{u.kycStatus || 'none'}</span></td>
                  <td>{u.accredited ? '✓' : '—'}</td>
                  <td>{formatCurrency(u.totalInvested || 0)}</td>
                  <td>{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function AdminKycPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      setApplications(await api.getKycApplications());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id, level = 3) => {
    try {
      await api.approveKyc(id, { kycLevel: level, investmentLimit: level >= 3 ? 1000000 : 100000 });
      setToast({ message: 'KYC application approved', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleReject = async (id) => {
    try {
      await api.rejectKyc(id, { reason: 'Documents do not meet requirements' });
      setToast({ message: 'KYC application rejected', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading KYC applications...</div>;

  return (
    <Layout>
      <div className="page-header">
        <h2>KYC Review</h2>
        <p>Review and approve investor identity verification</p>
      </div>

      <div className="card">
        {applications.length === 0 ? (
          <div className="empty-state"><h4>No KYC applications</h4></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Documents</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td className="font-bold">{app.userName}</td>
                    <td>{app.userEmail}</td>
                    <td>
                      <span className={`badge ${app.status === 'approved' ? 'success' : app.status === 'pending' ? 'warning' : 'danger'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td>{app.documents?.length || 0} files</td>
                    <td>{formatDate(app.submittedAt)}</td>
                    <td>
                      {app.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm btn-success" onClick={() => handleApprove(app.id)}>
                            <Check size={12} /> Approve
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(app.id)}>
                            <Ban size={12} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </Layout>
  );
}

function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLog().then(setLogs).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading audit log...</div>;

  const actionColors = {
    share_class_created: 'info',
    kyc_submitted: 'warning',
    kyc_approved: 'success',
    kyc_rejected: 'danger',
    tokens_purchased: 'success',
    tokens_sold: 'danger',
    settings_updated: 'purple',
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Audit Log</h2>
        <p>Complete history of platform actions for compliance</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="font-mono" style={{ fontSize: 12 }}>{formatDateTime(log.timestamp)}</td>
                  <td>
                    <span className={`badge ${actionColors[log.action] || 'info'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{log.actorId}</td>
                  <td>
                    <pre style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.getAdminDashboard().then(d => setSettings(d.settings)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await api.updateSettings(settings);
      setToast({ message: 'Settings saved successfully', type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading settings...</div>;

  return (
    <Layout>
      <div className="page-header">
        <h2>Platform Settings</h2>
        <p>Configure platform parameters and compliance rules</p>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="form-group">
          <label>Platform Name</label>
          <input
            type="text"
            value={settings?.platformName || ''}
            onChange={e => setSettings({ ...settings, platformName: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Min Investment (USD)</label>
            <input
              type="number"
              value={settings?.minInvestment || 0}
              onChange={e => setSettings({ ...settings, minInvestment: parseInt(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Max Investment per User (USD)</label>
            <input
              type="number"
              value={settings?.maxInvestmentPerUser || 0}
              onChange={e => setSettings({ ...settings, maxInvestmentPerUser: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Compliance Mode</label>
          <select
            value={settings?.complianceMode || 'strict'}
            onChange={e => setSettings({ ...settings, complianceMode: e.target.value })}
          >
            <option value="strict">Strict (Default)</option>
            <option value="standard">Standard</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings?.registrationOpen || false}
              onChange={e => setSettings({ ...settings, registrationOpen: e.target.checked })}
            />
            Open Registration
          </label>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          Save Settings
        </button>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <div className="alert warning" style={{ marginBottom: 16 }}>
            <Database size={16} /> Demo data is stored in your browser's localStorage
          </div>
          <button
            className="btn btn-danger"
            onClick={() => {
              api.resetData();
              setToast({ message: 'Demo data reset to defaults', type: 'success' });
              api.getAdminDashboard().then(d => setSettings(d.settings));
            }}
          >
            Reset Demo Data
          </button>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </Layout>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <LoginPage />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateTokenPage /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
          <Route path="/kyc" element={<ProtectedRoute><KycPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/kyc" element={<ProtectedRoute><AdminKycPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute><AdminAuditPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
