import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar, type NavTab } from './components/Navbar';
import { Chat } from './pages/Chat';
import { Evaluation } from './pages/Evaluation';
import { History } from './pages/History';
import type { VerificationHistoryItem } from './types';


export default function App() {
  const [tab, setTab] = useState<NavTab>('demo');
  const [activeStudioConfig, setActiveStudioConfig] = useState<{
    query?: string;
    answer?: string;
    model?: string;
    presetKey?: string;
  } | null>(null);

  const handleInspectHistoryItem = (item: VerificationHistoryItem) => {
    setActiveStudioConfig({
      query: item.query,
      answer: item.llmAnswer,
      model: item.model.toLowerCase().replace(/\s+/g, '-'),
      presetKey: item.presetKey,
    });
    setTab('demo');
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-[#08090C] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 tech-grid-canvas">
        <Navbar activeTab={tab} onSelectTab={setTab} />

        <main className="flex-1">
          {tab === 'demo' && (
            <Chat
              key={activeStudioConfig ? `${activeStudioConfig.query}-${activeStudioConfig.model}` : 'default'}
              initialQuery={activeStudioConfig?.query}
              initialAnswer={activeStudioConfig?.answer}
              initialModel={activeStudioConfig?.model}
              initialPresetKey={activeStudioConfig?.presetKey}
            />
          )}
          {tab === 'eval' && <Evaluation />}
          {tab === 'history' && <History onLoadRun={handleInspectHistoryItem} />}
        </main>

        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/75 dark:bg-[#08090C]/80 backdrop-blur-md py-4 mt-auto transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
            VeriTrace &bull; Hallucination Detection &amp; Verification Middleware &bull; Member 2 Frontend
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}