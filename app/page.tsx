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
    const { data } = await supabase.from('logs').select('*').order('date', { ascending: false });
    if (data) setLogs(data);
  }

  // 🔔 [복구] 상단 대시보드 및 D-Day 로직
  const insight = useMemo(() => {
    if (logs.length === 0) return { bestDevice: '-', mvpCasting: '-', successRate: 0, alertMsg: "첫 기록을 남기고 전략을 세워보세요!" };
    
    const upcoming = logs
      .filter(l => l.is_success === '티켓팅예정' && new Date(l.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let alertMsg = "오늘도 평화로운 관극 생활 되세요! 🎭";
    if (upcoming.length > 0) {
      const targetDate = new Date(upcoming[0].date);
      const diffTime = targetDate.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      alertMsg = `🔥 [D-${diffDays}] ${upcoming[0].performance} 티켓팅이 얼마 남지 않았어요!`;
    }

    const successLogs = logs.filter(l => l.is_success === '성공');
    const totalTries = logs.filter(l => l.is_success !== '티켓팅예정').length;
    const successRate = totalTries > 0 ? Math.round((successLogs.length / totalTries) * 100) : 0;
    
    const castCounts: any = {};
    logs.forEach(l => { if(l.casting) castCounts[l.casting] = (castCounts[l.casting] || 0) + 1; });
    const mvpCasting = Object.keys(castCounts).length > 0 ? Object.keys(castCounts).reduce((a, b) => castCounts[a] > castCounts[b] ? a : b) : '-';

    return { successRate, mvpCasting, alertMsg };
  }, [logs]);

  // 📸 [복구] 이미지 업로드 로직
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

  const handleSave = async () => {
    if (!formData.performance) return alert('공연명을 입력해주세요!');

    // 🛡️ [수정 완료] 시간 데이터를 포함한 전체 데이터 객체
    const payload = {
      performance: formData.performance,
      casting: formData.casting,
      seat: formData.seat,
      rating: formData.rating,
      date: formData.date,
      time: formData.time,
      device: formData.device,
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
      setFormData({ performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐', date: new Date().toISOString().split('T')[0], time: '19:30', device: 'PC', is_success: '성공', image_url: '' });
    } catch (err: any) { alert('저장 실패: ' + err.message); }
  };

  const timeOptions = ["14:00", "14:30", "15:00", "18:00", "18:30", "19:00", "19:30", "20:00"];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-10 font-sans text-slate-900">
      {/* 🔔 [복구] 상단 알림바 */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-white border-2 border-indigo-100 rounded-[1.5rem] p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-lg">✨</div>
          <p className="text-indigo-900 text-sm font-black">{insight.alertMsg}</p>
        </div>
      </div>

      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center">
        <h1 className="text-4xl font-[1000] text-slate-900 tracking-tighter italic uppercase">Stage<span className="text-indigo-600">Log</span></h1>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase">Log Result</button>
      </header>
      
      <main className="max-w-5xl mx-auto space-y-10">
        {/* 📊 [복구] 대시보드 */}
        <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-10">
          <div><p className="text-slate-500 text-[10px] font-black uppercase mb-2 tracking-widest">Main Casting</p><p className="text-2xl font-black truncate"># {insight.mvpCasting}</p></div>
          <div><p className="text-indigo-400 text-[10px] font-black uppercase mb-2 tracking-widest">Total Win Rate</p><p className="text-4xl font-[1000] text-indigo-400">{insight.successRate}%</p></div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative group">
              <div className="h-44 bg-slate-50 relative">
                {log.image_url && <img src={log.image_url} className="w-full h-full object-cover" />}
                <div className="absolute top-4 left-4"><span className="text-[9px] font-black px-3 py-1.5 rounded-full bg-indigo-600 text-white uppercase">{log.is_success}</span></div>
              </div>
              <div className="p-7">
                <p className="text-indigo-600 font-black text-[10px] mb-1 uppercase">{log.casting || 'Unknown'}</p>
                <h4 className="text-xl font-black text-slate-800 mb-4 truncate">{log.performance}</h4>
                <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                  <div className="flex flex-col text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    <span>{log.date} <span className="text-slate-900 ml-1">{log.time}</span></span>
                    <span className="text-slate-900 font-black">{log.is_success === '성공' ? log.seat : ''}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => openEditModal(log)} className="text-indigo-500 text-[10px] font-black">EDIT</button>
                    <button onClick={async () => { if(confirm('삭제할까요?')) { await supabase.from('logs').delete().eq('id', log.id); fetchLogs(); } }} className="text-rose-400 text-[10px] font-black">DEL</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-300 my-auto">
            <h3 className="text-2xl font-black mb-8 italic uppercase text-slate-800">Update Log</h3>
            <div className="space-y-5">
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                {['성공', '실패', '티켓팅예정'].map(s => (
                  <button key={s} onClick={() => setFormData({...formData, is_success: s})} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${formData.is_success === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="공연명" value={formData.performance} onChange={e => setFormData({...formData, performance: e.target.value})} />
                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="배우" value={formData.casting} onChange={e => setFormData({...formData, casting: e.target.value})} />
              </div>
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="좌석/메모" value={formData.seat} onChange={e => setFormData({...formData, seat: e.target.value})} />
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-[10px] w-full" />
                {formData.image_url && <div className="mt-2 text-emerald-500 font-black text-[10px]">✅ PHOTO READY</div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <select className="p-4 bg-slate-50 rounded-2xl font-bold text-sm appearance-none" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}>
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="flex-1 py-5 bg-slate-50 rounded-2xl font-black text-xs text-slate-300">CANCEL</button>
              <button onClick={handleSave} disabled={uploading} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs">SAVE LOG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}