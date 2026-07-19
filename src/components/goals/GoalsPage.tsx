import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { differenceInCalendarMonths, format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useBudget } from '../../context/BudgetContext';
import type { SavingsGoal } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import ProgressBar from '../ui/ProgressBar';
import Modal from '../ui/Modal';

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (goal: SavingsGoal) => void;
  editGoal: SavingsGoal | null;
  categories: { id: string; name: string; icon: string }[];
}

function GoalForm({ open, onClose, onSave, editGoal, categories }: GoalFormProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContributionTarget, setMonthlyContributionTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedCategoryId, setLinkedCategoryId] = useState('');
  const [notes, setNotes] = useState('');

  useMemo(() => {
    if (!open) return;
    setName(editGoal?.name ?? '');
    setTargetAmount(editGoal ? String(editGoal.targetAmount) : '');
    setCurrentAmount(editGoal ? String(editGoal.currentAmount) : '0');
    setMonthlyContributionTarget(editGoal ? String(editGoal.monthlyContributionTarget) : '');
    setTargetDate(editGoal?.targetDate ?? '');
    setLinkedCategoryId(editGoal?.linkedCategoryId ?? '');
    setNotes(editGoal?.notes ?? '');
  }, [open, editGoal]);

  const inputCls = 'w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(targetAmount);
    const parsedCurrent = parseFloat(currentAmount);
    const parsedMonthly = parseFloat(monthlyContributionTarget);
    if (!name.trim() || isNaN(parsedTarget) || parsedTarget <= 0 || isNaN(parsedCurrent) || parsedCurrent < 0 || isNaN(parsedMonthly) || parsedMonthly <= 0) {
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: editGoal?.id ?? uuidv4(),
      name: name.trim(),
      targetAmount: parsedTarget,
      currentAmount: parsedCurrent,
      targetDate: targetDate || undefined,
      monthlyContributionTarget: parsedMonthly,
      linkedCategoryId: linkedCategoryId || undefined,
      notes: notes.trim() || undefined,
      createdAt: editGoal?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editGoal ? 'Edit Savings Goal' : 'Add Savings Goal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Goal name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Target amount</label>
            <input className={inputCls} type="number" min="0.01" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Current saved</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Monthly target</label>
            <input className={inputCls} type="number" min="0.01" step="0.01" value={monthlyContributionTarget} onChange={e => setMonthlyContributionTarget(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Target date (optional)</label>
            <input className={inputCls} type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Linked category (optional)</label>
          <select className={inputCls} value={linkedCategoryId} onChange={e => setLinkedCategoryId(e.target.value)}>
            <option value="">None</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium text-sm transition-colors">
            Cancel
          </button>
          <button type="submit" className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm shadow-indigo-500/25">
            {editGoal ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function GoalsPage() {
  const { state, dispatch } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributionGoalId, setContributionGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const goals = state.savingsGoals ?? [];
  const categories = state.categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }));
  const catMap = new Map(state.categories.map(c => [c.id, c]));

  const totals = useMemo(() => {
    const target = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const saved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const monthly = goals.reduce((sum, g) => sum + g.monthlyContributionTarget, 0);
    return { target, saved, monthly, remaining: Math.max(0, target - saved) };
  }, [goals]);

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => (a.targetDate ?? '9999-99-99').localeCompare(b.targetDate ?? '9999-99-99')),
    [goals]
  );

  const saveGoal = (goal: SavingsGoal) => {
    if (editing) {
      dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: goal });
    } else {
      dispatch({ type: 'ADD_SAVINGS_GOAL', payload: goal });
    }
    setEditing(null);
  };

  const addContribution = () => {
    if (!contributionGoalId) return;
    const parsed = parseFloat(contributionAmount);
    if (isNaN(parsed) || parsed <= 0) return;
    dispatch({ type: 'ADD_GOAL_CONTRIBUTION', payload: { goalId: contributionGoalId, amount: parsed } });
    setContributionGoalId(null);
    setContributionAmount('');
  };

  const sectionCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10';

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Total Goal Target</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(totals.target)}</p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Currently Saved</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totals.saved)}</p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Remaining</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(totals.remaining)}</p>
        </div>
        <div className={sectionCls}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Monthly Contribution Target</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(totals.monthly)}</p>
        </div>
      </div>

      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Savings Goals &amp; Sinking Funds</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Track progress and keep monthly contributions on target.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors"
          >
            Add Goal
          </button>
        </div>

        {sortedGoals.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No savings goals yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create goals for emergency fund, travel, or major purchases.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedGoals.map(goal => {
              const linkedCat = goal.linkedCategoryId ? catMap.get(goal.linkedCategoryId) : undefined;
              const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
              const monthsLeftFromTarget = goal.targetDate
                ? Math.max(0, differenceInCalendarMonths(parseISO(goal.targetDate), new Date()) + 1)
                : null;
              const projectedMonths = goal.monthlyContributionTarget > 0
                ? Math.ceil(remaining / goal.monthlyContributionTarget)
                : null;
              const atRisk =
                monthsLeftFromTarget !== null &&
                projectedMonths !== null &&
                projectedMonths > monthsLeftFromTarget &&
                isBefore(startOfDay(new Date()), parseISO(goal.targetDate!));

              return (
                <div key={goal.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{goal.name}</p>
                        {linkedCat && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                            {linkedCat.icon} {linkedCat.name}
                          </span>
                        )}
                        {atRisk && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold">
                            Behind target
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {goal.targetDate ? `Target date: ${format(parseISO(goal.targetDate), 'MMM d, yyyy')}` : 'No target date'}
                        {' · '}
                        Monthly target {formatCurrency(goal.monthlyContributionTarget)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(goal.currentAmount)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">of {formatCurrency(goal.targetAmount)}</p>
                    </div>
                  </div>

                  <ProgressBar percent={progress} className="mt-3" />

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{progress.toFixed(1)}% complete</span>
                    <span>Remaining {formatCurrency(remaining)}</span>
                    {projectedMonths !== null && <span>Est. {projectedMonths} month{projectedMonths === 1 ? '' : 's'} to finish</span>}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/40">
                    <button
                      onClick={() => {
                        setContributionGoalId(goal.id);
                        setContributionAmount(goal.monthlyContributionTarget > 0 ? String(goal.monthlyContributionTarget) : '');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      Add contribution
                    </button>
                    <button
                      onClick={() => { setEditing(goal); setShowForm(true); }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: goal.id })}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GoalForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveGoal}
        editGoal={editing}
        categories={categories}
      />

      <Modal open={!!contributionGoalId} onClose={() => setContributionGoalId(null)} title="Add Contribution">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={contributionAmount}
              onChange={e => setContributionAmount(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setContributionGoalId(null)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addContribution}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm shadow-indigo-500/25"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
