import { useEffect, useState } from 'react';
import { checkBackendHealth } from '../services/api';
import type { BackendHealth } from '../types';

interface NavbarProps {
  activeTab: 'demo' | 'eval';
  onSelectTab: (tab: 'demo' | 'eval') => void;
}

export const Navbar = ({ activeTab, onSelectTab }: NavbarProps) => {
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

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            V
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base">VeriTrace</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                AI Middleware
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Hallucination Detection & Claim Verification
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => onSelectTab('demo')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'demo'
                ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Verification Demo
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('eval')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'eval'
                ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Evaluation Metrics
          </button>
        </nav>

        {/* Connectivity Status Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 border-l border-slate-200 pl-4">
          <span
            className={`w-2 h-2 rounded-full ${
              isChecking
                ? 'bg-slate-300 animate-pulse'
                : health?.status === 'healthy'
                  ? 'bg-emerald-500'
                  : 'bg-amber-400'
            }`}
            aria-hidden="true"
          />
          <span className="text-[11px]">
            {isChecking
              ? 'Checking status...'
              : health?.status === 'healthy'
                ? 'Backend Connected'
                : 'Demo Mode (Offline)'}
          </span>
        </div>
      </div>
    </header>
  );
};
