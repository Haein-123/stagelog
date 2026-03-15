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
    if (logs.length === 0) return { successRate: 0, mvpCasting: '-', alertMsg: "첫 기록을 남기고 전략을 세워보세요!" };
    const upcoming = logs.filter(l => l.is_success === '티켓팅예정').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let alertMsg = "오늘도 평화로운 관극 생활 되세요! 🎭";
    if (upcoming.length > 0) alertMsg = `🔥 [D-DAY] ${upcoming[0].performance} (${upcoming[0].time}) 티켓팅 준비!`;
    const successLogs = logs.filter(l => l.is_success === '성공');
    const totalTries = logs.filter(l => l.is_success !== '티켓팅예정').length;
    return { successRate: totalTries > 0 ? Math.round((successLogs.length / totalTries) * 100) : 0, alertMsg };
  }, [logs]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileName = `${Date.now()}_${file.name}`;
      await supabase.storage.from('views').upload(fileName, file);
      const { data } = supabase.storage.from('views').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
      alert('이미지 업로드 완료!');
    } catch (error: any) { alert('업로드 실패: ' + error.message); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!formData.performance) return alert('공연명을 입력해주세요!');
    const payload = {
      performance: formData.performance,
      casting: formData.casting,
      seat: formData.seat,
      date: formData.date,
      time: formData.time,
      is_success: formData.is_success,
      image_url: formData.image_url,
      rating: formData.rating,
      device: formData.device
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
      setFormData({ performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐', date: new Date().toISOString().split('T')[0], time: '19:30', device: 'PC', is_success: '성공', image_url: '' });
    } catch (err: any) { alert('저장 실패: ' + err.message); }
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

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('logs').delete().eq('id', id);
    if (!error) fetchLogs();
  };

  const timeOptions = ["14:00", "14:30", "15:00", "18:00", "18:30", "19:00", "19:30", "20:00"];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-10 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto mb-6 bg-white border-2 border-indigo-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div className="bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold italic">SL</div>
        <p className="text-indigo-900 text-sm font-black">{insight.alertMsg}</p>
      </div>

      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center">
        <h1 className="text-4xl font-[1000] italic uppercase tracking-tighter">Stage<span className="text-indigo-600">Log</span></h1>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase">Log Result</button>
      </header>
      
      <main className="max-w-5xl mx-auto space-y-10">
        <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl grid grid-cols-2 gap-10">
          <div><p className="text-slate-500 text-[10px] font-black uppercase mb-2 tracking-widest">Main Casting</p><p className="text-2xl font-black truncate"># {insight.mvpCasting || '-'}</p></div>
          <div><p className="text-indigo-400 text-[10px] font-black uppercase mb-2 tracking-widest">Win Rate</p><p className="text-4xl font-[1000] text-indigo-400">{insight.successRate}%</p></div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {logs.map((log) => (
            <div key={log.id} className={`group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative ${log.is_success === '실패' ? 'opacity-75' : ''}`}>
              <div className="h-44 bg-slate-50 relative">
                {log.image_url && <img src={log.image_url} className="w-full h-full object-cover" />}
                <span className="absolute top-4 left-4 text-[9px] font-black px-3 py-1.5 rounded-full bg-indigo-600 text-white uppercase">{log.is_success}</span>
              </div>
              <div className="p-7">
                <p className="text-indigo-600 font-black text-[10px] uppercase mb-1">{log.casting}</p>
                <h4 className="text-xl font-black mb-4 truncate">{log.performance}</h4>
                <div className="flex justify-between items-center pt-5 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400">
                    <div>{log.date} <span className="text-slate-900 ml-1 font-black">{log.time}</span></div>
                    <div className="text-slate-900 font-black mt-1">{log.is_success === '성공' ? log.seat : ''}</div>
                  </div>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => openEditModal(log)} className="text-indigo-500 font-black text-[10px]">EDIT</button>
                    <button onClick={() => handleDelete(log.id)} className="text-rose-400 font-black text-[10px]">DEL</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black mb-8 italic uppercase text-slate-800">Update Log</h3>
            <div className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                {['성공', '실패', '티켓팅예정'].map(s => (
                  <button key={s} onClick={() => setFormData({...formData, is_success: s})} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${formData.is_success === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="공연명" value={formData.performance} onChange={e => setFormData({...formData, performance: e.target.value})} />
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="배우" value={formData.casting} onChange={e => setFormData({...formData, casting: e.target.value})} />
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="좌석 상세 또는 메모" value={formData.seat} onChange={e => setFormData({...formData, seat: e.target.value})} />
              
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center relative">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-[10px] w-full cursor-pointer" />
                {formData.image_url && <div className="mt-2 text-emerald-500 font-black text-[10px]">✅ IMAGE ATTACHED</div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <select className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}>
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-50 rounded-2xl font-black text-xs text-slate-300">CANCEL</button>
              <button onClick={handleSave} disabled={uploading} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Save Log</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}