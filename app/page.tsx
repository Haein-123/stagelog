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
    // 🛡️ 수정 포인트: 시간 데이터가 없는 기존 데이터를 위해 정렬 방식을 안전하게 변경!
    const { data } = await supabase
      .from('logs')
      .select('*')
      .order('date', { ascending: false }); // 일단 날짜로만 정렬 (시간은 나중에 옵션)
    
    if (data) setLogs(data);
  }

  const insight = useMemo(() => {
    if (logs.length === 0) return { bestDevice: '-', mvpCasting: '-', successRate: 0, alertMsg: "첫 기록을 남기고 전략을 세워보세요!" };
    
    const upcoming = logs
      .filter(l => l.is_success === '티켓팅예정' && new Date(l.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let alertMsg = "오늘도 즐거운 관극 생활 되세요! 🎭";
    if (upcoming.length > 0) {
      const targetDate = new Date(upcoming[0].date);
      const diffTime = targetDate.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      alertMsg = `🔥 [D-${diffDays}] ${upcoming[0].performance} 티켓팅 준비!`;
    }

    const successLogs = logs.filter(l => l.is_success === '성공');
    const totalTries = logs.filter(l => l.is_success !== '티켓팅예정').length;
    const successRate = totalTries > 0 ? Math.round((successLogs.length / totalTries) * 100) : 0;
    
    const castCounts: any = {};
    logs.forEach(l => { if(l.casting) castCounts[l.casting] = (castCounts[l.casting] || 0) + 1; });
    const mvpCasting = Object.keys(castCounts).length > 0 ? Object.keys(castCounts).reduce((a, b) => castCounts[a] > castCounts[b] ? a : b) : '-';

    return { successRate, mvpCasting, alertMsg };
  }, [logs]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('views').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('views').getPublicUrl(fileName);
      setFormData({ ...formData, image_url: data.publicUrl });
      alert('이미지 업로드 성공!');
    } catch (error: any) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (log: any) => {
    setEditingId(log.id);
    setFormData({
      performance: log.performance || '',
      casting: log.casting || '',
      seat: log.seat || '',
      rating: log.rating || '⭐⭐⭐⭐⭐',
      date: log.date || new Date().toISOString().split('T')[0],
      time: log.time || '19:30',
      device: log.device || 'PC',
      is_success: log.is_success || '성공',
      image_url: log.image_url || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.performance) return alert('공연명을 입력해주세요!');
    let error;
    if (editingId) {
      const result = await supabase.from('logs').update(formData).eq('id', editingId);
      error = result.error;
    } else {
      const result = await supabase.from('logs').insert([formData]);
      error = result.error;
    }
    if (!error) {
      closeModal();
      fetchLogs();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ 
      performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐', 
      date: new Date().toISOString().split('T')[0], time: '19:30',
      device: 'PC', is_success: '성공', image_url: '' 
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('기록을 삭제하시겠어요?')) return;
    const { error } = await supabase.from('logs').delete().eq('id', id);
    if (!error) fetchLogs();
  };

  const timeOptions = ["14:00", "14:30", "15:00", "18:00", "18:30", "19:00", "19:30", "20:00"];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-white border-2 border-indigo-100 rounded-[1.5rem] p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-200">✨</div>
          <p className="text-indigo-900 text-sm font-[900] tracking-tight">{insight.alertMsg}</p>
        </div>
      </div>

      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-[1000] text-slate-900 tracking-tighter italic uppercase leading-none">
            Stage<span className="text-indigo-600">Log</span>
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2 ml-1">Archive Recovered Edition</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl text-sm uppercase">LOG RESULT</button>
      </header>
      
      <main className="max-w-5xl mx-auto space-y-10">
        <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-10">
          <div><p className="text-slate-500 text-[10px] font-black uppercase mb-2 tracking-widest">Main Casting</p><p className="text-2xl font-black truncate"># {insight.mvpCasting}</p></div>
          <div><p className="text-indigo-400 text-[10px] font-black uppercase mb-2 tracking-widest">Total Win Rate</p><p className="text-4xl font-[1000] text-indigo-400">{insight.successRate}%</p></div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {logs.map((log) => (
            <div key={log.id} className={`group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl transition-all duration-500 relative ${log.is_success === '실패' ? 'opacity-70' : ''} ${log.is_success === '티켓팅예정' ? 'border-2 border-dashed border-indigo-200 bg-indigo-50/30' : ''}`}>
              <div className="h-44 bg-slate-50 overflow-hidden relative">
                {log.image_url ? (
                  <img src={log.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-200 font-black italic text-[10px] uppercase gap-2 px-6 text-center">
                    <span>{log.is_success === '티켓팅예정' ? '📌 티켓팅 대기' : 'Archive Entry'}</span>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-full shadow-sm ${log.is_success === '성공' ? 'bg-emerald-500 text-white' : log.is_success === '실패' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>
                    {log.is_success}
                  </span>
                </div>
              </div>
              <div className="p-7">
                <p className="text-indigo-600 font-black text-[10px] mb-1 uppercase tracking-tighter">{log.casting || 'UNKNOWN'}</p>
                <h4 className="text-xl font-black text-slate-800 mb-4 truncate">{log.performance}</h4>
                <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{log.date} {log.time || ''}</span>
                    <span className="text-[10px] font-black text-slate-800 truncate max-w-[120px]">{log.is_success === '성공' ? log.seat : (log.is_success === '티켓팅예정' ? 'UPCOMING' : 'FAILED')}</span>
                  </div>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => openEditModal(log)} className="text-indigo-500 text-[10px] font-black uppercase">Edit</button>
                    <button onClick={() => handleDelete(log.id)} className="text-rose-500 text-[10px] font-black uppercase">Del</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-black mb-8 text-slate-800 tracking-tighter italic uppercase">Update Log</h3>
            
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
              {['성공', '실패', '티켓팅예정'].map((status) => (
                <button key={status} onClick={() => setFormData({...formData, is_success: status})} className={`flex-1 py-4 rounded-xl font-black text-[10px] transition-all ${formData.is_success === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{status === '티켓팅예정' ? 'UPCOMING' : status.toUpperCase()}</button>
              ))}
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" placeholder="공연명" value={formData.performance} onChange={(e) => setFormData({...formData, performance: e.target.value})} />
                <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" placeholder="배우" value={formData.casting} onChange={(e) => setFormData({...formData, casting: e.target.value})} />
              </div>
              <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" placeholder="좌석 상세 또는 메모" value={formData.seat} onChange={(e) => setFormData({...formData, seat: e.target.value})} />
              <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center relative">
                <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Image Source</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-[10px] w-full" />
                {formData.image_url && <div className="mt-2 text-emerald-500 font-black text-[10px]">✅ ATTACHED</div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Date</label>
                  <input type="date" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-tighter">Time Dropdown</label>
                  <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})}>
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-10">
              <button onClick={closeModal} className="flex-1 py-5 bg-slate-50 text-slate-300 rounded-[1.5rem] font-black text-xs uppercase">Cancel</button>
              <button onClick={handleSave} disabled={uploading} className={`flex-1 py-5 text-white rounded-[1.5rem] font-black shadow-xl transition-all text-xs uppercase ${formData.is_success === '성공' ? 'bg-emerald-600' : formData.is_success === '실패' ? 'bg-rose-500' : 'bg-indigo-600'}`}>
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}