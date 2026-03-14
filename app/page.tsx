'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐',
    date: new Date().toISOString().split('T')[0],
    time: '19:30', device: 'PC', is_success: '성공', image_url: '' 
  });

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    const { data } = await supabase.from('logs').select('*').order('date', { ascending: false });
    if (data) setLogs(data);
  }

  const insight = useMemo(() => {
    if (logs.length === 0) return { successRate: 0, alertMsg: "첫 기록을 남겨보세요!" };
    const upcoming = logs.filter(l => l.is_success === '티켓팅예정').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let alertMsg = "즐거운 관극 생활 되세요! 🎭";
    if (upcoming.length > 0) alertMsg = `🔥 [티켓팅 예정] ${upcoming[0].performance} (${upcoming[0].time})`;
    const successLogs = logs.filter(l => l.is_success === '성공');
    const totalTries = logs.filter(l => l.is_success !== '티켓팅예정').length;
    return { successRate: totalTries > 0 ? Math.round((successLogs.length / totalTries) * 100) : 0, alertMsg };
  }, [logs]);

  const handleSave = async () => {
    if (!formData.performance) return alert('공연명을 입력해주세요!');

    // 전송할 데이터 객체
    const payload = {
      performance: formData.performance,
      casting: formData.casting,
      seat: formData.seat,
      date: formData.date,
      time: formData.time, // 👈 Supabase에 'time' 컬럼이 있어야 작동합니다!
      is_success: formData.is_success,
      image_url: formData.image_url
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('logs').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('logs').insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingId(null);
      fetchLogs();
    } catch (err: any) {
      alert('저장 실패: ' + err.message + '\n\n※ Supabase Table Editor에서 time 컬럼을 추가했는지 확인해주세요!');
    }
  };

  const openEditModal = (log: any) => {
    setEditingId(log.id);
    setFormData({
      performance: log.performance || '',
      casting: log.casting || '',
      seat: log.seat || '',
      rating: log.rating || '⭐⭐⭐⭐⭐',
      date: log.date || '',
      time: log.time || '19:30',
      device: log.device || 'PC',
      is_success: log.is_success || '성공',
      image_url: log.image_url || ''
    });
    setShowModal(true);
  };

  const timeOptions = ["14:00", "14:30", "15:00", "18:00", "18:30", "19:00", "19:30", "20:00"];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto mb-6 bg-white border-2 border-indigo-100 rounded-2xl p-5 flex items-center gap-4">
        <div className="bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs">✨</div>
        <p className="text-indigo-900 text-sm font-bold">{insight.alertMsg}</p>
      </div>

      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center">
        <h1 className="text-3xl font-black italic uppercase">Stage<span className="text-indigo-600">Log</span></h1>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm">LOG RESULT</button>
      </header>
      
      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {logs.map((log) => (
          <div key={log.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden group">
            <div className="h-40 bg-slate-100 relative">
              {log.image_url && <img src={log.image_url} className="w-full h-full object-cover" />}
              <span className="absolute top-3 left-3 text-[9px] font-black px-2 py-1 bg-indigo-600 text-white rounded-md">{log.is_success}</span>
            </div>
            <div className="p-6">
              <p className="text-indigo-600 font-bold text-[10px] mb-1 uppercase">{log.casting}</p>
              <h4 className="text-lg font-bold mb-4 truncate">{log.performance}</h4>
              <div className="flex justify-between items-end pt-4 border-t border-slate-50">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  {log.date} <span className="text-slate-900 ml-1">{log.time}</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => openEditModal(log)} className="text-indigo-500 font-black text-[10px]">EDIT</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black mb-6 uppercase text-slate-800">Update Log</h3>
            <div className="space-y-4">
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="공연명" value={formData.performance} onChange={e => setFormData({...formData, performance: e.target.value})} />
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="배우" value={formData.casting} onChange={e => setFormData({...formData, casting: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}>
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['성공', '실패', '티켓팅예정'].map(s => (
                  <button key={s} onClick={() => setFormData({...formData, is_success: s})} className={`flex-1 py-2 rounded-lg text-[10px] font-black ${formData.is_success === s ? 'bg-white text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-50 rounded-2xl font-black text-xs text-slate-300">CANCEL</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs">SAVE LOG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}