'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    performance: '',
    casting: '',
    seat: '',
    rating: '⭐⭐⭐⭐⭐',
    date: new Date().toISOString().split('T')[0],
    time: '19:30',
    device: 'PC',
    is_success: '성공',
    image_url: '' 
  });

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    const { data } = await supabase
      .from('logs')
      .select('*')
      .order('date', { ascending: false });
    if (data) setLogs(data);
  }

  const insight = useMemo(() => {
    if (logs.length === 0) return { successRate: 0, mvpCasting: '-', alertMsg: "첫 기록을 남겨보세요!" };
    const upcoming = logs.filter(l => l.is_success === '티켓팅예정').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let alertMsg = "즐거운 관극 생활 되세요! 🎭";
    if (upcoming.length > 0) alertMsg = `🔥 [D-DAY 근접] ${upcoming[0].performance} 티켓팅 준비!`;
    const successLogs = logs.filter(l => l.is_success === '성공');
    const totalTries = logs.filter(l => l.is_success !== '티켓팅예정').length;
    const successRate = totalTries > 0 ? Math.round((successLogs.length / totalTries) * 100) : 0;
    return { successRate, mvpCasting: '-', alertMsg };
  }, [logs]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('views').upload(fileName, file);
      const { data } = supabase.storage.from('views').getPublicUrl(fileName);
      setFormData({ ...formData, image_url: data.publicUrl });
      alert('업로드 성공!');
    } catch (error: any) { alert(error.message); } finally { setUploading(false); }
  };

  const openEditModal = (log: any) => {
    setEditingId(log.id);
    setFormData({
      performance: log.performance || '',
      casting: log.casting || '',
      seat: log.seat || '',
      rating: log.rating || '⭐⭐⭐⭐⭐',
      date: log.date || '',
      time: log.time || '19:30', // 👈 여기가 핵심! 기존 시간을 폼에 넣어줌
      device: log.device || 'PC',
      is_success: log.is_success || '성공',
      image_url: log.image_url || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.performance) return alert('공연명을 입력해주세요!');
    
    // 🛡️ 저장 데이터에 time이 확실히 포함되도록 객체를 직접 명시
    const submitData = {
      performance: formData.performance,
      casting: formData.casting,
      seat: formData.seat,
      rating: formData.rating,
      date: formData.date,
      time: formData.time, // 👈 DB로 보낼 데이터에 시간을 꽉 잡음!
      device: formData.device,
      is_success: formData.is_success,
      image_url: formData.image_url
    };

    let error;
    if (editingId) {
      const result = await supabase.from('logs').update(submitData).eq('id', editingId);
      error = result.error;
    } else {
      const result = await supabase.from('logs').insert([submitData]);
      error = result.error;
    }
    if (!error) { closeModal(); fetchLogs(); }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐', date: new Date().toISOString().split('T')[0], time: '19:30', device: 'PC', is_success: '성공', image_url: '' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제할까요?')) return;
    await supabase.from('logs').delete().eq('id', id);
    fetchLogs();
  };

  const timeOptions = ["14:00", "14:30", "15:00", "18:00", "18:30", "19:00", "19:30", "20:00"];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-white border-2 border-indigo-100 rounded-2xl p-5 flex items-center gap-4 animate-pulse-subtle">
          <div className="bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white">✨</div>
          <p className="text-indigo-900 text-sm font-bold">{insight.alertMsg}</p>
        </div>
      </div>

      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center">
        <h1 className="text-4xl font-black italic uppercase">Stage<span className="text-indigo-600">Log</span></h1>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm">LOG RESULT</button>
      </header>
      
      <main className="max-w-5xl mx-auto space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
              <div className="h-44 bg-slate-50 relative">
                {log.image_url && <img src={log.image_url} className="w-full h-full object-cover" />}
                <div className="absolute top-4 left-4"><span className="text-[9px] font-black px-3 py-1.5 rounded-full bg-indigo-600 text-white">{log.is_success}</span></div>
              </div>
              <div className="p-7">
                <p className="text-indigo-600 font-black text-[10px] uppercase mb-1">{log.casting || 'UNKNOWN'}</p>
                <h4 className="text-xl font-black mb-4 truncate">{log.performance}</h4>
                <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                  <div className="flex flex-col">
                    {/* 🕒 화면에 시간을 확실히 뿌려줌 */}
                    <span className="text-[10px] font-bold text-slate-400">{log.date} {log.time}</span>
                    <span className="text-[10px] font-black">{log.is_success === '성공' ? log.seat : log.is_success}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(log)} className="text-indigo-500 text-[10px] font-black">EDIT</button>
                    <button onClick={() => handleDelete(log.id)} className="text-rose-400 text-[10px] font-black">DEL</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black mb-6 italic uppercase">{editingId ? 'Edit' : 'New'} Log</h3>
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              {['성공', '실패', '티켓팅예정'].map(s => (
                <button key={s} onClick={() => setFormData({...formData, is_success: s})} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${formData.is_success === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{s}</button>
              ))}
            </div>
            <div className="space-y-4">
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="공연명" value={formData.performance} onChange={e => setFormData({...formData, performance: e.target.value})} />
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="배우" value={formData.casting} onChange={e => setFormData({...formData, casting: e.target.value})} />
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="좌석/메모" value={formData.seat} onChange={e => setFormData({...formData, seat: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}>
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex space-x-4 mt-8">
              <button onClick={closeModal} className="flex-1 py-4 bg-slate-50 rounded-2xl font-black text-xs text-slate-400">CANCEL</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs">SAVE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}