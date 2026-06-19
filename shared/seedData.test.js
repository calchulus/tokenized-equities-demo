const SEED_DATA = require('../../shared/seedData');

describe('Seed Data', () => {
  test('has users array with 4 users', () => {
    expect(Array.isArray(SEED_DATA.users)).toBe(true);
    expect(SEED_DATA.users).toHaveLength(4);
  });

  test('has admin, issuer, and investor roles', () => {
    const roles = SEED_DATA.users.map(u => u.role);
    expect(roles).toContain('admin');
    expect(roles).toContain('issuer');
    expect(roles).toContain('investor');
  });

  test('has share classes array with 3 classes', () => {
    expect(Array.isArray(SEED_DATA.shareClasses)).toBe(true);
    expect(SEED_DATA.shareClasses).toHaveLength(3);
  });

  test('share classes have required fields', () => {
    SEED_DATA.shareClasses.forEach(sc => {
      expect(sc).toHaveProperty('id');
      expect(sc).toHaveProperty('name');
      expect(sc).toHaveProperty('ticker');
      expect(sc).toHaveProperty('maxSupply');
      expect(sc).toHaveProperty('pricePerToken');
      expect(sc).toHaveProperty('status', 'active');
    });
  });

  test('has transactions', () => {
    expect(Array.isArray(SEED_DATA.transactions)).toBe(true);
    expect(SEED_DATA.transactions.length).toBeGreaterThan(0);
  });

  test('transactions reference valid share classes', () => {
    const classIds = SEED_DATA.shareClasses.map(sc => sc.id);
    SEED_DATA.transactions.forEach(tx => {
      expect(classIds).toContain(tx.shareClassId);
    });
  });

  test('has KYC applications', () => {
    expect(Array.isArray(SEED_DATA.kycApplications)).toBe(true);
    expect(SEED_DATA.kycApplications).toHaveLength(2);
  });

  test('has audit log', () => {
    expect(Array.isArray(SEED_DATA.auditLog)).toBe(true);
    expect(SEED_DATA.auditLog.length).toBeGreaterThan(0);
  });

  test('has settings object', () => {
    expect(SEED_DATA.settings).toHaveProperty('platformName', 'EquityChain');
    expect(SEED_DATA.settings).toHaveProperty('complianceMode', 'strict');
    expect(Array.isArray(SEED_DATA.settings.supportedJurisdictions)).toBe(true);
  });

  test('can be deep cloned without mutation', () => {
    const original = JSON.stringify(SEED_DATA);
    const clone = JSON.parse(JSON.stringify(SEED_DATA));
    clone.users.push({ id: 'test' });
    expect(JSON.stringify(SEED_DATA)).toBe(original);
  });
});
