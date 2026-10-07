import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Chat } from './pages/Chat';
import { Evaluation } from './pages/Evaluation';

export default function App() {
  const [tab, setTab] = useState<'demo' | 'eval'>('demo');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar activeTab={tab} onSelectTab={setTab} />

      <main className="flex-1">
        {tab === 'demo' ? <Chat /> : <Evaluation />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-400">
          VeriTrace &bull; Hallucination Detection &amp; Verification Middleware &bull; Member 2 Frontend
        </div>
      </footer>
    </div>
  );
}