import { useState, useEffect } from 'react';
import { BudgetProvider } from './context/BudgetContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import TransactionsPage from './components/transactions/TransactionsPage';
import BudgetsPage from './components/budgets/BudgetsPage';
import AiAdvisorPanel from './components/ai-advisor/AiAdvisorPanel';
import CsvImportPage from './components/import/CsvImportPage';
import SettingsPage from './components/settings/SettingsPage';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  budgets: 'Budgets',
  advisor: 'AI Advisor',
  import: 'Import CSV',
  settings: 'Settings',
};

function AppContent() {
  const [page, setPage] = useState(() => window.location.hash.slice(1) || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => setPage(window.location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (p: string) => {
    window.location.hash = p;
    setPage(p);
  };

  return (
    <div className="flex h-screen bg-slate-50/80 dark:bg-[#0B1120] text-gray-900 dark:text-slate-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 z-50">
            <Sidebar currentPage={page} onNavigate={navigate} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-72 shrink-0">
        <Sidebar currentPage={page} onNavigate={navigate} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={PAGE_TITLES[page] || 'Budget Manager'} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-8 lg:p-14 bg-pattern">
          {page === 'dashboard' && <Dashboard />}
          {page === 'transactions' && <TransactionsPage />}
          {page === 'budgets' && <BudgetsPage />}
          {page === 'advisor' && <AiAdvisorPanel />}
          {page === 'import' && <CsvImportPage />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BudgetProvider>
        <AppContent />
      </BudgetProvider>
    </ThemeProvider>
  );
}
