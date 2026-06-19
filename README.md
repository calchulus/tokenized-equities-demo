# EquityChain — Tokenized Equities Demo

SEC-compliant tokenized equity platform demo built with React, Node.js, and Solidity. Features MetaMask wallet integration, KYC workflow, token marketplace, and portfolio tracking.

**Live Demo:** https://calchulus.github.io/tokenized-equities-demo/

## Features

- **Token Marketplace** — Browse and trade tokenized equity offerings
- **MetaMask Integration** — Connect wallet, view balance, switch networks
- **KYC/AML Workflow** — Multi-level identity verification with admin approval
- **Portfolio Dashboard** — Holdings, performance charts, dividend tracker, CSV export
- **Admin Panel** — Platform metrics, user management, audit log, settings
- **Smart Contracts** — ERC-20 tokenized equity with compliance rules (Solidity)

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tokenize.demo | admin123 |
| Issuer | issuer@acme.com | issuer123 |
| Investor | investor@example.com | investor123 |

## Quick Start

### Client (GitHub Pages demo — no server needed)

```bash
cd client
npm install
npm start
```

Opens at http://localhost:3000. Uses localStorage for all data — no backend required.

### Full Stack (with server)

```bash
# Install dependencies
npm run install:all

# Start both client and server
npm run dev
```

- Client: http://localhost:3000
- API: http://localhost:4000

### Smart Contracts

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat node  # Start local blockchain
```

## Architecture

```
tokenized-equities-demo/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.js          # All pages and routing (1,500 lines)
│   │   ├── components/     # WalletConnect
│   │   ├── contexts/       # AuthContext, Web3Context
│   │   └── utils/          # api.js (localStorage), mockData.js, helpers.js
│   └── public/             # index.html, 404.html (SPA redirect)
├── server/                 # Express API (optional, for production upgrade)
│   ├── routes/             # auth, shareClasses, kyc, portfolio, admin
│   └── config/db.js        # JSON file database
├── contracts/              # Solidity smart contracts
│   └── contracts/TokenizedEquity.sol
├── .github/workflows/      # GitHub Actions CI/CD
└── test-wallet.js          # Playwright E2E tests
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, React Router 6, Recharts, Lucide React |
| Backend | Express 4, ethers.js 6 (optional) |
| Blockchain | Solidity 0.8.20, Hardhat, OpenZeppelin |
| Testing | Playwright (E2E) |
| Deploy | GitHub Actions → GitHub Pages |

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests (requires server on port 4000, client on port 3001)
npm run test:e2e
```

22 E2E tests covering: login, wallet connection, purchase flow, portfolio, admin dashboard.

## Upgrading to Production

The demo runs entirely client-side with localStorage. To upgrade to a real backend:

1. **Start the server:** `npm run dev` (runs both client and server)
2. **Switch API layer:** Replace `client/src/utils/api.js` mock imports with fetch calls to the Express API
3. **Deploy server:** Host on Vercel, Render, or Railway
4. **Update client:** Change API base URL in `api.js` to point to your hosted server

The `server/` directory contains a fully functional Express API with:
- JWT authentication with role-based access control
- JSON file persistence (upgrade to PostgreSQL/MongoDB for production)
- RESTful routes for all features (auth, shareClasses, kyc, portfolio, admin)

The `contracts/` directory contains a production-ready Solidity contract that can be deployed to Ethereum mainnet or testnets.

## Deployment

Push to `main` branch triggers automatic deployment to GitHub Pages via GitHub Actions.

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in:

```bash
cp server/.env.example server/.env
```

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 4000) |
| `ETHEREUM_RPC` | Ethereum RPC endpoint |
| `CONTRACT_ADDRESS` | Deployed token contract address |
| `PRIVATE_KEY` | Deployer wallet private key |
| `JWT_SECRET` | JWT signing secret |

## License

MIT
