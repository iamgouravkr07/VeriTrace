import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Activity,
  BarChart3,
  History,
  Sun,
  Moon,
} from 'lucide-react';
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
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    checkBackendHealth().then((res) => {
      if (isMounted) {
        setHealth(res);
        setIsChecking(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const isHealthy = health?.status === 'healthy';

  const navLinks: Array<{ id: NavTab; label: string; icon: typeof Activity }> = [
    { id: 'demo', label: 'Studio', icon: Activity },
    { id: 'eval', label: 'Benchmarks', icon: BarChart3 },
    { id: 'history', label: 'Audit History', icon: History },
  ];


  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-black text-base shadow-sm ring-2 ring-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-base font-sans">
                VeriTrace
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Observability
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              AI Safety &bull; LLM Hallucination Verification Engine
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 sm:gap-1.5" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;

            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onSelectTab(link.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Health Status & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Health Badge */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all ${
              isChecking
                ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                : isHealthy
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}
            title={
              isHealthy
                ? 'FastAPI backend active on http://localhost:8000 (/health 200 OK)'
                : 'Backend offline: Using isolated demo fallback presets'
            }
          >
            <span className="relative flex h-2 w-2">
              {isHealthy && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isChecking
                    ? 'bg-slate-300'
                    : isHealthy
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                }`}
              />
            </span>

            <span className="text-[11px] hidden lg:inline">
              {isChecking
                ? 'Probing backend...'
                : isHealthy
                  ? 'Backend Online (:8000)'
                  : 'Offline Demo Presets'}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer shadow-2xs"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform rotate-0 hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
