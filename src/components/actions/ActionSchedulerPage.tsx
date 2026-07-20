import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { useBudget } from '../../context/BudgetContext';
import type { ScheduledAction } from '../../types';
import Modal from '../ui/Modal';
import { buildSystemAlerts } from '../../utils/alerts';

interface ActionFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (action: ScheduledAction) => void;
  edit: ScheduledAction | null;
}

function ActionForm({ open, onClose, onSave, edit }: ActionFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(edit?.title ?? '');
    setDescription(edit?.description ?? '');
    setDueDate(edit?.dueDate ?? new Date().toISOString().split('T')[0]);
  }, [open, edit]);

  const inputCls = 'w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    const now = new Date().toISOString();
    onSave({
      id: edit?.id ?? uuidv4(),
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate,
      completed: edit?.completed ?? false,
      snoozedUntil: edit?.snoozedUntil,
      source: edit?.source ?? 'manual',
      createdAt: edit?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Action' : 'Add Action'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Description (optional)</label>
          <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Due date</label>
          <input className={inputCls} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium text-sm transition-colors">
            Cancel
          </button>
          <button type="submit" className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm shadow-indigo-500/25">
            {edit ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ActionSchedulerPage() {
  const { state, dispatch } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ScheduledAction | null>(null);

  const actions = state.scheduledActions ?? [];
  const activeAlerts = useMemo(() => buildSystemAlerts(state), [state]);
  const today = new Date().toISOString().split('T')[0];

  const visibleActions = useMemo(() => {
    const now = today;
    return [...actions].filter(a => !a.snoozedUntil || a.snoozedUntil <= now).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [actions, today]);

  const openActions = visibleActions.filter(a => !a.completed);
  const completedActions = visibleActions.filter(a => a.completed);

  const saveAction = (action: ScheduledAction) => {
    if (editing) dispatch({ type: 'UPDATE_SCHEDULED_ACTION', payload: action });
    else dispatch({ type: 'ADD_SCHEDULED_ACTION', payload: action });
    setEditing(null);
  };

  const createFromAlert = (alertTitle: string, message: string, linkHash?: string) => {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const now = new Date().toISOString();
    dispatch({
      type: 'ADD_SCHEDULED_ACTION',
      payload: {
        id: uuidv4(),
        title: alertTitle,
        description: linkHash ? `${message} (${linkHash})` : message,
        dueDate: due.toISOString().split('T')[0],
        completed: false,
        source: 'alert',
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  const sectionCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10';

  return (
    <div className="space-y-8">
      <div className={sectionCls}>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Action Scheduler</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Plan actions with due dates and keep recommendations executable.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-colors"
          >
            Add Action
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Open actions ({openActions.length})</h3>
            {openActions.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No open actions.</p>
            ) : (
              <div className="space-y-2.5">
                {openActions.map(action => (
                  <div key={action.id} className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{action.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        action.dueDate < today
                          ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
                          : action.dueDate === today
                            ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {action.dueDate < today ? 'Overdue' : action.dueDate === today ? 'Due today' : 'Upcoming'}
                      </span>
                    </div>
                    {action.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{action.description}</p>}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Due {format(parseISO(action.dueDate), 'MMM d, yyyy')}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => dispatch({ type: 'TOGGLE_SCHEDULED_ACTION', payload: action.id })}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        Mark done
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'SNOOZE_SCHEDULED_ACTION', payload: { id: action.id, until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] } })}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        Snooze 1 day
                      </button>
                      <button
                        onClick={() => { setEditing(action); setShowForm(true); }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'DELETE_SCHEDULED_ACTION', payload: action.id })}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Completed ({completedActions.length})</h3>
            {completedActions.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No completed actions yet.</p>
            ) : (
              <div className="space-y-2.5">
                {completedActions.slice(0, 8).map(action => (
                  <div key={action.id} className="rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5 p-3.5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{action.title}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Completed · Due {format(parseISO(action.dueDate), 'MMM d, yyyy')}</p>
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_SCHEDULED_ACTION', payload: action.id })}
                      className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Mark open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-4">Suggested from active alerts</h3>
        {activeAlerts.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No active alerts to convert into actions right now.</p>
        ) : (
          <div className="space-y-2.5">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{alert.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{alert.message}</p>
                </div>
                <button
                  onClick={() => createFromAlert(alert.title, alert.message, alert.linkHash)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Add action
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ActionForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveAction}
        edit={editing}
      />
    </div>
  );
}
