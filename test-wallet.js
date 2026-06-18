const { chromium } = require('playwright');

const APP_URL = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== Tokenized Equities Wallet Connection E2E Test ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Mock MetaMask - auto-connects
  await page.addInitScript(() => {
    const mockAccounts = ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8'];
    window.ethereum = {
      isMetaMask: true,
      chainId: '0x1',
      selectedAddress: mockAccounts[0],
      request: async ({ method, params }) => {
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return mockAccounts;
          case 'eth_chainId':
            return '0x1';
          case 'net_version':
            return '1';
          case 'eth_getBalance':
            return '0x1BC16D674EC80000'; // 2 ETH
          case 'personal_sign':
            return '0xmocksignature';
          case 'wallet_switchEthereumChain':
          case 'wallet_addEthereumChain':
            return null;
          default:
            throw new Error(`Unsupported: ${method}`);
        }
      },
      on: () => {},
      removeListener: () => {},
    };
  });

  const results = [];
  function log(name, passed, detail = '') {
    const s = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${s}: ${name}${detail ? ' — ' + detail : ''}`);
    results.push({ name, passed });
  }

  try {
    // TEST 1: Login
    console.log('\n--- 1. Login ---');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await sleep(1000);
    log('Login page loads', !!(await page.$('.login-card')));
    await page.screenshot({ path: '/tmp/e2e-01-login.png' });

    // Click investor demo account
    const investorBtn = await page.$('button.demo-account-btn >> text=Jane Smith');
    if (investorBtn) await investorBtn.click();
    await sleep(2500);
    log('Marketplace loads', page.url().includes('marketplace'));
    await page.screenshot({ path: '/tmp/e2e-02-marketplace.png' });

    // TEST 2: Wallet auto-connected
    console.log('\n--- 2. Wallet Connection ---');
    const headerText = await page.textContent('body');
    const walletConnected = headerText.includes('0x7099') && headerText.includes('2.0000 ETH');
    log('Wallet auto-connected via MetaMask mock', walletConnected);

    const sidebarWallet = await page.$('text=0x7099');
    log('Wallet address in sidebar', !!sidebarWallet);

    const networkBadge = await page.$('text=Ethereum');
    log('Network badge shows Ethereum', !!networkBadge);
    await page.screenshot({ path: '/tmp/e2e-03-wallet-connected.png' });

    // TEST 3: Open wallet dropdown
    console.log('\n--- 3. Wallet Dropdown ---');
    const walletBtn = await page.$('button:has-text("0x7099")');
    if (walletBtn) {
      await walletBtn.click();
      await sleep(500);
      const dropdown = await page.textContent('body');
      const hasBalance = dropdown.includes('Balance') && dropdown.includes('ETH');
      log('Wallet dropdown shows balance', hasBalance);
      const hasNetwork = dropdown.includes('Switch Network');
      log('Network switcher visible', hasNetwork);
      const hasDisconnect = dropdown.includes('Disconnect');
      log('Disconnect button visible', hasDisconnect);
      await page.screenshot({ path: '/tmp/e2e-04-wallet-dropdown.png' });
      // Close dropdown
      await page.click('body', { position: { x: 700, y: 400 } });
      await sleep(300);
    } else {
      log('Wallet button in sidebar', false);
    }

    // TEST 4: Purchase modal with wallet info
    console.log('\n--- 4. Purchase Flow ---');
    const card = await page.$('.share-class-card');
    if (card) {
      await card.click();
      await sleep(500);
      log('Modal opens', !!(await page.$('.modal')));

      const modalText = await page.textContent('.modal');
      log('Wallet address in modal', modalText.includes('0x7099'));
      log('Wallet connected indicator', modalText.includes('Wallet connected'));
      await page.screenshot({ path: '/tmp/e2e-05-modal-wallet.png' });

      // Enter amount
      const input = await page.$('.modal input[type="number"]');
      if (input) {
        await input.fill('100');
        await sleep(300);
        const costText = await page.textContent('.modal');
        log('Cost calculation', costText.includes('2.50K') || costText.includes('2,500') || costText.includes('2500'));
        await page.screenshot({ path: '/tmp/e2e-06-amount-entered.png' });

        // Click purchase
        const buyBtn = await page.$('.modal button.btn-primary');
        if (buyBtn) {
          await buyBtn.click();
          await sleep(2000);
          const toast = await page.$('.toast.success');
          log('Purchase succeeds with wallet', !!toast);
          await page.screenshot({ path: '/tmp/e2e-07-purchase-done.png' });
        }
      }
      // Close modal
      const closeBtn = await page.$('.modal-overlay');
      if (closeBtn) await closeBtn.click();
      await sleep(300);
    }

    // TEST 5: Portfolio
    console.log('\n--- 5. Portfolio ---');
    const portfolioLink = await page.$('a[href="/portfolio"]');
    if (portfolioLink) {
      await portfolioLink.click();
      await sleep(2000);
      const body = await page.textContent('body');
      log('Portfolio page loads', body.includes('Portfolio'));
      log('Holdings table visible', body.includes('ACME'));
      log('Wallet badge in header', body.includes('0x7099'));
      await page.screenshot({ path: '/tmp/e2e-08-portfolio.png' });
    }

    // TEST 6: Admin view
    console.log('\n--- 6. Admin Login ---');
    // Logout
    const logoutBtn = await page.$('button[title="Logout"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await sleep(1500);
    }
    // Login as admin
    const adminBtn = await page.$('button.demo-account-btn >> text=Platform Admin');
    if (adminBtn) {
      await adminBtn.click();
      await sleep(2500);
      const body = await page.textContent('body');
      log('Admin dashboard loads', body.includes('Admin Dashboard'));
      const walletSection = await page.$('.wallet-section, [class*="Wallet"]');
      log('Admin sees wallet section', !!walletSection || body.includes('WALLET') || body.includes('Wallet'));
      log('Admin wallet shows address', body.includes('0x7099'));
      await page.screenshot({ path: '/tmp/e2e-09-admin.png' });
    }

    // TEST 7: Create token page
    console.log('\n--- 7. Create Token ---');
    const createLink = await page.$('a[href="/create"]');
    if (createLink) {
      await createLink.click();
      await sleep(1500);
      const body = await page.textContent('body');
      log('Create token page loads', body.includes('Create Tokenized Equity'));
      log('SEC compliance notice', body.includes('April 2026'));
      log('Wallet visible in header', body.includes('0x7099'));
      await page.screenshot({ path: '/tmp/e2e-10-create.png' });
    }

    // SUMMARY
    console.log('\n=== RESULTS ===');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    if (failed > 0) {
      console.log('\nFailed:');
      results.filter(r => !r.passed).forEach(r => console.log(`  - ${r.name}`));
    }

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: '/tmp/e2e-error.png' });
  } finally {
    await browser.close();
    console.log('\nScreenshots: /tmp/e2e-*.png');
  }
}

runTests();
