import { format, parseISO } from 'date-fns';

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return format(new Date(Number(year), Number(month) - 1), 'MMMM yyyy');
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getCurrentYear(): string {
  return format(new Date(), 'yyyy');
}

export function getCurrentPeriod(mode: 'monthly' | 'yearly'): string {
  return mode === 'yearly' ? getCurrentYear() : getCurrentMonth();
}

export function formatPeriod(period: string): string {
  if (period.length === 4) return period; // "2026"
  return formatMonth(period); // "February 2026"
}
