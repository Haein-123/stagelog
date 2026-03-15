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

  // 🔍 네이버 검색 API
  const searchPerformance = async () => {
    if (!formData.performance) return alert('검색할 공연명을 입력해주세요!');
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(formData.performance)}`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const cleanTitle = item.title.replace(/<[^>]*>?/gm, '');
        setFormData({ ...formData, performance: cleanTitle, image_url: item.thumbnail });
      } else { alert('검색 결과가 없습니다.'); }
    } catch (e) { alert('검색 중 오류가 발생했습니다.'); }
  };

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

  const handleSave = async () => {
    if (!formData.performance) return alert('공연명을 입력해주세요!');
    const payload = { ...formData };
    try {
      if (editingId) { await supabase.from('logs').update(payload).eq('id', editingId); }
      else { await supabase.from('logs').insert([payload]); }
      setShowModal(false); setEditingId(null); fetchLogs();
      setFormData({ performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐', date: new Date().toISOString().split('T')[0], time: '19:30', device: 'PC', is_success: '성공', image_url: '' });
    } catch (err: any) { alert('저장 실패: ' + err.message); }
  };

  const openEditModal = (log: any) => {
    setEditingId(log.id);
    setFormData({ ...log });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('logs').delete().eq('id', id);
    fetchLogs();
  };

  const insight = useMemo(() => {
    if (logs.length === 0) return { successRate: 0, mvpCasting: '-', alertMsg: "첫 기록을 남겨보세요!" };
    const upcoming = logs.filter(l => l.is_success === '티켓팅예정').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let alertMsg = "즐거운 관극 생활 되세요! 🎭";
    if (upcoming.length > 0) alertMsg = `🔥 [D-DAY] ${upcoming[0].performance} 티켓팅 준비!`;
    const successLogs = logs.filter(l => l.is_success === '성공');
    const totalTries = logs.filter(l => l.is_success !== '티켓팅예정').length;
    return { successRate: totalTries > 0 ? Math.round((successLogs.length / totalTries) * 100) : 0, alertMsg };
  }, [logs]);

  const timeOptions = ["14:00", "14:30", "15:00", "18:00", "18:30", "19:00", "19:30", "20:00"];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-10 text-slate-900 font-sans">
      {/* 🔔 상단 알림바 */}
      <div className="max-w-5xl mx-auto mb-6 bg-white border-2 border-indigo-100 rounded-2xl p-5 flex items-center gap-4">
        <div className="bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">SL</div>
        <p className="text-indigo-900 text-sm font-black">{insight.alertMsg}</p>
      </div>

      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center">
        <h1 className="text-4xl font-[1000] italic uppercase italic tracking-tighter">Stage<span className="text-indigo-600">Log</span></h1>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase">Log Result</button>
      </header>
      
      <main className="max-w-5xl mx-auto space-y-10">
        {/* 📊 대시보드 */}
        <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl grid grid-cols-2 gap-10">
          <div><p className="text-slate-500 text-[10px] font-black uppercase mb-2">Main Casting</p><p className="text-2xl font-black truncate"># {logs[0]?.casting || '-'}</p></div>
          <div><p className="text-indigo-400 text-[10px] font-black uppercase mb-2">Win Rate</p><p className="text-4xl font-[1000] text-indigo-400">{insight.successRate}%</p></div>
        </section>

        {/* 📋 로그 리스트 (삭제/수정 버튼 포함) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {logs.map((log) => (
            <div key={log.id} className="group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
              <div className="h-44 bg-slate-50 relative">
                {log.image_url && <img src={log.image_url} className="w-full h-full object-cover" />}
                <span className="absolute top-4 left-4 text-[9px] font-black px-3 py-1.5 rounded-full bg-indigo-600 text-white uppercase">{log.is_success}</span>
              </div>
              <div className="p-7">
                <p className="text-indigo-600 font-black text-[10px] uppercase mb-1">{log.casting}</p>
                <h4 className="text-xl font-black mb-4 truncate">{log.performance}</h4>
                <div className="flex justify-between items-center pt-5 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400">{log.date} <span className="text-slate-900 ml-1">{log.time}</span></div>
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
              
              <div className="flex gap-2">
                <input type="text" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="공연명 검색" value={formData.performance} onChange={e => setFormData({...formData, performance: e.target.value})} />
                <button onClick={searchPerformance} className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-xs">검색</button>
              </div>

              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="배우" value={formData.casting} onChange={e => setFormData({...formData, casting: e.target.value})} />
              
              {/* 📸 [복구] 이미지 업로드 UI */}
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center relative group">
                <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">시야 사진 업로드</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-[10px] w-full" />
                {formData.image_url && <div className="mt-2 text-emerald-500 font-black text-[10px]">✅ 사진 등록됨</div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <select className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}>
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="flex-1 py-5 bg-slate-50 rounded-2xl font-black text-xs text-slate-300">CANCEL</button>
              <button onClick={handleSave} disabled={uploading} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Save Log</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}