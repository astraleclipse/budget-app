import { describe, expect, it, vi } from 'vitest';
import { exportData, getDefaultState, importData, loadState, saveState } from './storage';
import { budgetState, budgetLimit } from '../test/fixtures';

describe('storage service', () => {
  it('returns default state when storage is empty', () => {
    const state = loadState();
    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.settings.budgetMode).toBe('monthly');
  });

  it('saves and loads normalized state including deduplicated budget limits', () => {
    const raw = budgetState({
      budgetLimits: [
        budgetLimit('groceries', '2026-07', 300),
        budgetLimit('groceries', '2026-07', 500),
      ],
      assetAccounts: [{ id: 'a1', name: 'Cash', type: 'cash', value: 1000, createdAt: '', updatedAt: '' }],
    });
    saveState(raw);
    const loaded = loadState();
    expect(loaded.budgetLimits).toHaveLength(1);
    expect(loaded.budgetLimits[0].monthlyLimit).toBe(500);
    expect(loaded.assetAccounts).toHaveLength(1);
  });

  it('imports valid JSON backup payloads and rejects invalid payloads', () => {
    const state = budgetState();
    const imported = importData(JSON.stringify({ version: 1, data: state }));
    expect(imported?.transactions).toEqual(state.transactions);
    expect(importData('{"bad": true}')).toBeNull();
  });

  it('exports data successfully', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return { href: '', download: '', click } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });

    const ok = exportData(getDefaultState());
    expect(ok).toBe(true);
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();

    createElement.mockRestore();
  });
});
