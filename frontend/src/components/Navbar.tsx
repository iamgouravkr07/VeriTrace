import { useEffect, useState } from 'react';
import { Activity, BarChart3, CheckCircle2, History, Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { checkBackendHealth } from '../services/api';
import type { BackendHealth } from '../types';
import { useTheme } from '../context/ThemeContext';

export type NavTab = 'demo' | 'eval' | 'history';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navbar = ({ activeTab, onSelectTab }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    checkBackendHealth().then((res) => {
      if (isMounted) {
        setHealth(res);
        setIsChecking(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const isHealthy = health?.status === 'healthy';
  const navLinks: Array<{ id: NavTab; label: string; icon: typeof Activity }> = [
    { id: 'demo', label: 'Studio', icon: Activity },
    { id: 'eval', label: 'Benchmarks', icon: BarChart3 },
    { id: 'history', label: 'Audit History', icon: History },
  ];

  const selectTab = (tab: NavTab) => {
    onSelectTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="min-h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm" aria-hidden="true">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-950 dark:text-white">VeriTrace</span>
                <span className="hidden sm:inline text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">v0.1.0</span>
              </div>
              <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 truncate">AI observability and hallucination verification</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => selectTab(id)} aria-current={activeTab === id ? 'page' : undefined}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-medium ${isChecking ? 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400' : isHealthy ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'}`} title={isHealthy ? 'FastAPI backend is healthy' : 'Backend offline: demo presets remain available'}>
              {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className={`w-2 h-2 rounded-full ${isChecking ? 'bg-slate-400' : 'bg-amber-500'}`} />}
              <span className="hidden lg:inline">{isChecking ? 'Checking engine' : isHealthy ? 'Engine live' : 'Demo mode'}</span>
            </div>
            <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="p-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => setIsMenuOpen((open) => !open)} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} className="md:hidden p-2 rounded-md border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {isMenuOpen && <nav id="mobile-navigation" className="md:hidden border-t border-slate-200 py-2 dark:border-slate-800" aria-label="Mobile navigation">
          {navLinks.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => selectTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-left ${activeTab === id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}`}><Icon className="w-4 h-4" />{label}</button>)}
        </nav>}
      </div>
    </header>
  );
};
