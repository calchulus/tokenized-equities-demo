const { formatCurrency, formatNumber, formatPercent, formatDate, formatDateTime, truncateAddress } = require('./helpers');

describe('formatCurrency', () => {
  test('formats billions', () => {
    expect(formatCurrency(1500000000)).toBe('$1.50B');
  });

  test('formats millions', () => {
    expect(formatCurrency(2500000)).toBe('$2.50M');
  });

  test('formats thousands', () => {
    expect(formatCurrency(2500)).toBe('$2.50K');
  });

  test('formats decimals', () => {
    expect(formatCurrency(25.50)).toBe('$25.50');
  });

  test('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatNumber', () => {
  test('formats billions', () => {
    expect(formatNumber(1500000000)).toBe('1.50B');
  });

  test('formats millions', () => {
    expect(formatNumber(2500000)).toBe('2.50M');
  });

  test('formats thousands', () => {
    expect(formatNumber(2500)).toBe('2.5K');
  });

  test('formats small numbers', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatPercent', () => {
  test('formats positive', () => {
    expect(formatPercent(5.25)).toBe('+5.25%');
  });

  test('formats negative', () => {
    expect(formatPercent(-3.14)).toBe('-3.14%');
  });

  test('formats zero', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

describe('truncateAddress', () => {
  test('truncates long address', () => {
    expect(truncateAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')).toBe('0x7099...79C8');
  });

  test('handles empty string', () => {
    expect(truncateAddress('')).toBe('');
  });

  test('handles null', () => {
    expect(truncateAddress(null)).toBe('');
  });
});

describe('formatDate', () => {
  test('formats valid date', () => {
    const result = formatDate('2026-05-10T14:30:00.000Z');
    expect(result).toMatch(/May/);
    expect(result).toMatch(/10/);
    expect(result).toMatch(/2026/);
  });

  test('returns dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });
});

describe('formatDateTime', () => {
  test('formats valid datetime', () => {
    const result = formatDateTime('2026-05-10T14:30:00.000Z');
    expect(result).toMatch(/May/);
    expect(result).toMatch(/2026/);
  });

  test('returns dash for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});
