import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const Web3Context = createContext(null);

const ETH_MAINNET = '0x1';
const ETH_SEPOLIA = '0xaa36a7';
const SUPPORTED_CHAINS = {
  [ETH_MAINNET]: { name: 'Ethereum Mainnet', currency: 'ETH', explorer: 'https://etherscan.io' },
  [ETH_SEPOLIA]: { name: 'Sepolia Testnet', currency: 'ETH', explorer: 'https://sepolia.etherscan.io' },
};

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const getEthereum = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    return null;
  }, []);

  const updateBalance = useCallback(async (addr) => {
    const eth = getEthereum();
    if (!eth || !addr) return;
    try {
      const bal = await eth.request({ method: 'eth_getBalance', params: [addr, 'latest'] });
      setBalance((parseInt(bal, 16) / 1e18).toFixed(4));
    } catch (e) {
      console.error('Failed to fetch balance:', e);
    }
  }, [getEthereum]);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return null;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const chain = await eth.request({ method: 'eth_chainId' });
      setAccount(accounts[0]);
      setChainId(chain);
      await updateBalance(accounts[0]);
      return accounts[0];
    } catch (e) {
      if (e.code === 4001) {
        setError('Connection rejected. Please approve the MetaMask request.');
      } else {
        setError('Failed to connect wallet: ' + e.message);
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [getEthereum, updateBalance]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setBalance('0');
    setError(null);
  }, []);

  const switchNetwork = useCallback(async (targetChainId) => {
    const eth = getEthereum();
    if (!eth || !account) return;

    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (e) {
      if (e.code === 4902) {
        try {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetChainId,
              chainName: SUPPORTED_CHAINS[targetChainId]?.name || 'Unknown Network',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.infura.io/v3/'],
              blockExplorerUrls: [SUPPORTED_CHAINS[targetChainId]?.explorer || ''],
            }],
          });
        } catch (addErr) {
          setError('Failed to add network: ' + addErr.message);
        }
      } else {
        setError('Failed to switch network: ' + e.message);
      }
    }
  }, [getEthereum, account]);

  const signMessage = useCallback(async (message) => {
    const eth = getEthereum();
    if (!eth || !account) {
      setError('Wallet not connected');
      return null;
    }

    try {
      const signature = await eth.request({
        method: 'personal_sign',
        params: [message, account],
      });
      return signature;
    } catch (e) {
      if (e.code === 4001) {
        setError('Signature rejected');
      } else {
        setError('Failed to sign: ' + e.message);
      }
      return null;
    }
  }, [getEthereum, account]);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        updateBalance(accounts[0]);
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId);
      if (account) updateBalance(account);
    };

    eth.on('accountsChanged', handleAccountsChanged);
    eth.on('chainChanged', handleChainChanged);

    // Auto-reconnect if previously connected
    eth.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        eth.request({ method: 'eth_chainId' }).then(setChainId);
        updateBalance(accounts[0]);
      }
    }).catch(() => {});

    return () => {
      eth.removeListener('accountsChanged', handleAccountsChanged);
      eth.removeListener('chainChanged', handleChainChanged);
    };
  }, [getEthereum, account, disconnect, updateBalance]);

  const chainInfo = chainId ? SUPPORTED_CHAINS[chainId] : null;

  return (
    <Web3Context.Provider value={{
      account,
      chainId,
      chainInfo,
      balance,
      isConnecting,
      error,
      isConnected: !!account,
      connect,
      disconnect,
      switchNetwork,
      signMessage,
      supportedChains: SUPPORTED_CHAINS,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error('useWeb3 must be used within Web3Provider');
  return ctx;
}
