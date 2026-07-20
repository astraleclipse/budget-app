import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBudget } from '../../context/BudgetContext';
import { buildSystemAlerts, getSnoozeDate } from '../../utils/alerts';

export default function AlertsPage() {
  const { state, dispatch } = useBudget();
  const alerts = useMemo(() => buildSystemAlerts(state), [state]);

  const sectionCls = 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-8 lg:p-10';

  const addActionFromAlert = (title: string, description: string, linkHash?: string) => {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + 3);
    dispatch({
      type: 'ADD_SCHEDULED_ACTION',
      payload: {
        id: uuidv4(),
        title,
        description: linkHash ? `${description} (${linkHash})` : description,
        dueDate: dueDate.toISOString().split('T')[0],
        completed: false,
        source: 'alert',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className={sectionCls}>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Alerts Inbox</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Central feed for risk and attention alerts. Snooze or dismiss to manage noise.
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: 'RESTORE_ALL_ALERTS' })}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
          >
            Restore all alerts
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No active alerts</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">You’re in a stable state right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-2xl border p-5 ${
                  alert.severity === 'critical'
                    ? 'border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/8'
                    : alert.severity === 'warning'
                      ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/8'
                      : alert.severity === 'success'
                        ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/8'
                        : 'border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/8'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{alert.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{alert.message}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/30 px-2 py-1 rounded-full">
                    {alert.severity}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {alert.linkHash && (
                    <a
                      href={alert.linkHash}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                    >
                      {alert.actionLabel || 'Open'}
                    </a>
                  )}
                  <button
                    onClick={() => addActionFromAlert(alert.title, alert.message, alert.linkHash)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    Add to action scheduler
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SNOOZE_ALERT', payload: { id: alert.id, until: getSnoozeDate(1) } })}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    Snooze 1 day
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SNOOZE_ALERT', payload: { id: alert.id, until: getSnoozeDate(7) } })}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    Snooze 7 days
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'DISMISS_ALERT', payload: alert.id })}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
