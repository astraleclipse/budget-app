import { describe, expect, it, vi } from 'vitest';
import { formatCurrency, formatDate, formatMonth, formatPercent, getCurrentMonth, getCurrentPeriod, getCurrentYear, formatPeriod } from './formatters';

describe('formatters', () => {
  it('formats currency values', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats date and month labels', () => {
    expect(formatDate('2026-07-20')).toBe('Jul 20, 2026');
    expect(formatMonth('2026-07')).toBe('July 2026');
    expect(formatPeriod('2026-07')).toBe('July 2026');
    expect(formatPeriod('2026')).toBe('2026');
  });

  it('formats percent and current period helpers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
    expect(formatPercent(12.6)).toBe('13%');
    expect(getCurrentMonth()).toBe('2026-07');
    expect(getCurrentYear()).toBe('2026');
    expect(getCurrentPeriod('monthly')).toBe('2026-07');
    expect(getCurrentPeriod('yearly')).toBe('2026');
    vi.useRealTimers();
  });
});
