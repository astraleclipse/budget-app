import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 px-10 lg:px-14 py-6 bg-white/70 dark:bg-[#0B1120]/70 backdrop-blur-2xl border-b border-slate-100 dark:border-slate-800/40">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
      <div className="ml-auto">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-400 dark:text-slate-500 transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
