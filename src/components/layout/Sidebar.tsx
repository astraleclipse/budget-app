interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { id: 'transactions', label: 'Transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'budgets', label: 'Budgets', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'advisor', label: 'AI Advisor', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { id: 'import', label: 'Import CSV', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function Sidebar({ currentPage, onNavigate, onClose }: SidebarProps) {
  return (
    <aside className="flex flex-col h-full bg-white dark:bg-[#0a0f1e] border-r border-slate-200/60 dark:border-slate-800/50">
      {/* Logo area */}
      <div className="flex items-center gap-3.5 px-7 py-7 border-b border-slate-100 dark:border-slate-800/50">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>B</span>
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Budget Manager</h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-600 font-medium mt-0.5">Personal Finance</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-5 py-8 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); onClose?.(); }}
              className={`relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-indigo-500 dark:bg-indigo-400" />
              )}
              <svg className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-7 py-5 border-t border-slate-100 dark:border-slate-800/50">
        <p className="text-[11px] text-slate-300 dark:text-slate-700 text-center font-medium">
          Budget Manager v1.0
        </p>
      </div>
    </aside>
  );
}
