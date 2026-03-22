'use client';
import { useState, useEffect } from 'react';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  // 비밀번호 — 여기서 바꾸면 돼요!
  const PASSWORD = 'stagelog2026';

  useEffect(() => {
    const saved = sessionStorage.getItem('sl_unlocked');
    if (saved === 'true') setIsUnlocked(true);
    setChecking(false);
  }, []);

  const handleSubmit = () => {
    if (input === PASSWORD) {
      sessionStorage.setItem('sl_unlocked', 'true');
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setInput('');
    }
  };

  if (checking) return null;
  if (isUnlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-12 w-full max-w-sm text-center">
        {/* 로고 */}
        <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-lg rotate-3 mx-auto mb-6">SL</div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-1">
          Stage<span className="text-indigo-600">Log</span>
        </h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-10">
          Musical Archive Project
        </p>

        {/* 비밀번호 입력 */}
        <div className="space-y-4">
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className={`w-full p-4 rounded-2xl font-bold text-sm outline-none text-center tracking-widest transition-all ${
              error
                ? 'bg-rose-50 border-2 border-rose-200 placeholder:text-rose-300'
                : 'bg-slate-50 border-2 border-transparent focus:border-indigo-200'
            }`}
          />
          {error && (
            <p className="text-rose-400 font-black text-[11px]">
              비밀번호가 틀렸어요 🔐
            </p>
          )}
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95"
          >
            입장하기
          </button>
        </div>
      </div>
    </div>
  );
}