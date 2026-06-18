import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { Wallet, ChevronDown, Copy, Check, LogOut, ExternalLink, AlertTriangle } from 'lucide-react';

function WalletConnect() {
  const { account, chainId, chainInfo, balance, isConnecting, error, isConnected, connect, disconnect, switchNetwork, supportedChains } = useWeb3();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplorerUrl = (addr) => {
    if (!chainInfo) return '#';
    return `${chainInfo.explorer}/address/${addr}`;
  };

  if (!isConnected) {
    return (
      <div>
        <button
          className="btn btn-primary"
          onClick={connect}
          disabled={isConnecting}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Wallet size={16} />
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </button>
        {error && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            maxWidth: 320,
          }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 13,
        }}
      >
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isConnected ? 'var(--success)' : 'var(--danger)',
        }} />
        <span className="font-mono">{truncateAddress(account)}</span>
        <span style={{
          fontSize: 11,
          padding: '2px 6px',
          borderRadius: 4,
          background: chainId === '0x1' ? 'var(--success-bg)' : 'var(--warning-bg)',
          color: chainId === '0x1' ? 'var(--success)' : 'var(--warning)',
          fontWeight: 600,
        }}>
          {chainInfo?.name?.split(' ')[0] || 'Unknown'}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </button>

      {showDropdown && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowDropdown(false)} />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 320,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Connected Wallet
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="font-mono" style={{ fontSize: 15, fontWeight: 600 }}>{truncateAddress(account)}</span>
                <button
                  onClick={copyAddress}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                  title="Copy address"
                >
                  {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                </button>
                <a
                  href={getExplorerUrl(account)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-muted)' }}
                  title="View on explorer"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Balance</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{balance} ETH</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Network</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: chainId === '0x1' ? 'var(--success)' : 'var(--warning)',
                }}>
                  {chainInfo?.name || `Chain ${chainId}`}
                </span>
              </div>
            </div>

            <div style={{ padding: '12px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Switch Network
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(supportedChains).map(([id, info]) => (
                  <button
                    key={id}
                    onClick={() => { switchNetwork(id); setShowDropdown(false); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: chainId === id ? 'var(--accent-light)' : 'var(--bg-input)',
                      border: `1px solid ${chainId === id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      color: chainId === id ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                    }}
                  >
                    {info.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => { disconnect(); setShowDropdown(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                <LogOut size={14} /> Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default WalletConnect;
