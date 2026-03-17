import type { Category, TransactionType } from '../types';
import { loadLearnedRules } from './learnedRules';

export interface CsvRow {
  date: string;       // original date string
  account: string;
  description: string;
  credit: number;
  debit: number;
}

export interface StagedTransaction {
  id: string;
  date: string;        // ISO yyyy-MM-dd
  description: string;
  amount: number;
  type: TransactionType;
  category: string;    // category id
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  originalDescription: string;
  account: string;
}

// Parse DD/MM/YYYY to yyyy-MM-dd
function parseDate(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Skip header
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with quoted fields
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
      current += char;
    }
    fields.push(current.trim());

    if (fields.length < 5) continue;

    const credit = parseFloat(fields[3]) || 0;
    const debit = parseFloat(fields[4]) || 0;

    rows.push({
      date: fields[0],
      account: fields[1],
      description: fields[2],
      credit,
      debit,
    });
  }
  return rows;
}

// Keywords that indicate an internal transfer between own accounts (not real income/expense)
const INTERNAL_TRANSFER_KEYWORDS = [
  'internal transfer',
  'everyday round up',
  'savings maximiser',
  'round up',
  'initial deposit',
  'from orange everyday',
  'to orange everyday',
  'transfer from',
  'transfer to',
  'from savings',
  'to savings',
  'holiday funds -',
  'bills -',
  'gifts -',
  'emergency fund',
];

// Rule-based categorization keywords
const CATEGORY_RULES: Record<string, { keywords: string[]; type: 'income' | 'expense' }> = {
  'salary':        { keywords: ['salary', 'salaries', 'salary deposit', 'wages'], type: 'income' },
  'rent':          { keywords: ['home loan', 'homeloan', 'rent '], type: 'expense' },
  'debt':          { keywords: ['brighte', 'afterpay', 'zip pay', 'zippay', 'humm ', 'buy now pay', 'bnpl', 'loan repay', 'personal loan'], type: 'expense' },
  'insurance':     { keywords: ['insurance', 'insure', 'allianz', 'bupa', 'medibank', 'nib ', 'hbf ', 'aami', 'nrma', 'racv', 'rac ', 'youi', 'strata'], type: 'expense' },
  'groceries':     { keywords: ['woolworths', 'coles', 'aldi', 'iga ', 'foodland', 'bread temptation', 'bakery'], type: 'expense' },
  'dining':        { keywords: ['uber   *eats', 'ubereats', 'menulog', 'doordash', 'mcdonald', 'kfc ', 'subway', 'hungry jack', 'pizza', 'cafe', 'restaurant', 'st louis', 'para hills community club'], type: 'expense' },
  'transport':     { keywords: ['metrocard', 'metro card', 'fuel', 'petrol', 'bp ', 'shell ', 'caltex', 'ampol', 'uber trip'], type: 'expense' },
  'utilities':     { keywords: ['electricity', 'gas bill', 'water bill', 'lumo', 'agl ', 'origin energy', 'sa water', 'internode', 'internet', 'nbn', 'bpay bill payment'], type: 'expense' },
  'entertainment': { keywords: ['netflix', 'spotify', 'disney', 'stan ', 'tatts', 'lotto', 'dan murphy', 'bws ', 'liquor', 'cinema', 'ticketek'], type: 'expense' },
  'subscriptions': { keywords: ['subscription', 'apple.com', 'google storage', 'amazon prime', 'chatgpt', 'monthly fee'], type: 'expense' },
  'healthcare':    { keywords: ['pharmacy', 'chemist', 'doctor', 'medical', 'health', 'dental', 'hospital', 'pathology'], type: 'expense' },
  'shopping':      { keywords: ['amazon', 'ebay', 'kmart', 'target', 'big w', 'bunnings', 'officeworks', 'jb hi-fi', 'cocacolaepp'], type: 'expense' },
  'education':     { keywords: ['education', 'university', 'school', 'tafe', 'course', 'udemy'], type: 'expense' },
  'other-income':  { keywords: ['cashback', 'refund', 'rebate', 'loan cashback'], type: 'income' },
};

export function categorizeTransaction(description: string, credit: number, debit: number, _categories: Category[], cleanedDescription?: string): { categoryId: string; confidence: 'high' | 'medium' | 'low' | 'unknown'; type: TransactionType } {
  const descLower = description.toLowerCase();

  // --- Check LEARNED RULES first (highest priority) ---
  if (cleanedDescription) {
    const learnedRules = loadLearnedRules();
    const learned = learnedRules.get(cleanedDescription.toLowerCase().trim());
    if (learned) {
      return { categoryId: learned.categoryId, confidence: 'high', type: learned.type };
    }
  }

  // --- Check for internal transfers ---
  for (const keyword of INTERNAL_TRANSFER_KEYWORDS) {
    if (descLower.includes(keyword)) {
      return { categoryId: 'internal-transfer', confidence: 'high', type: 'transfer' };
    }
  }

  // Child support
  if (descLower.includes('child support')) {
    return { categoryId: 'child-support', confidence: 'high', type: 'expense' };
  }

  // Check rule-based keywords
  for (const [catId, rule] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of rule.keywords) {
      if (descLower.includes(keyword)) {
        return { categoryId: catId, confidence: 'high', type: rule.type };
      }
    }
  }

  // Fallback: if credit > 0, it's likely income but uncertain
  if (credit > 0 && debit === 0) {
    return { categoryId: 'other-income', confidence: 'low', type: 'income' };
  }

  return { categoryId: 'other-expense', confidence: 'unknown', type: 'expense' };
}

export function processImportedCsv(text: string, categories: Category[]): StagedTransaction[] {
  const rows = parseCsv(text);
  const staged: StagedTransaction[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const amount = row.credit > 0 ? row.credit : Math.abs(row.debit);

    if (amount === 0) continue;

    const cleanedDesc = row.description.split(' - ')[0].trim();
    const { categoryId, confidence, type } = categorizeTransaction(row.description, row.credit, row.debit, categories, cleanedDesc);

    staged.push({
      id: `csv-${i}-${Date.now()}`,
      date: parseDate(row.date),
      description: cleanedDesc,
      amount,
      type,
      category: categoryId,
      confidence,
      originalDescription: row.description,
      account: row.account,
    });
  }

  return staged;
}
