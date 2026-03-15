'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  
  const initialForm = {
    performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐',
    date: new Date().toISOString().split('T')[0],
    time: '19:30', device: 'PC', is_success: '성공', image_url: '' 
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => { fetchLogs(); }, []);
  async function fetchLogs() {
    const { data } = await supabase.from('logs').select('*').order('date', { ascending: false });
    if (data) setLogs(data);
  }

  // 📊 대시보드 통계 & 알림 로직
  const insight = useMemo(() => {
    if (logs.length === 0) return { successRate: 0, mvpCasting: '-', alertMsg: "첫 기록을 남겨보세요! 🎭" };
    const upcoming = logs
      .filter(l => l.is_success === '티켓팅예정')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let alertMsg = "즐거운 관극 생활 되세요! ✨";
    if (upcoming.length > 0) alertMsg = `🔥 [D-DAY] ${upcoming[0].performance} (${upcoming[0].date}) 티켓팅 준비!`;
    const successLogs = logs.filter(l => l.is_success === '성공');
    const totalTries = logs.filter(l => l.is_success !== '티켓팅예정').length;
    const successRate = totalTries > 0 ? Math.round((successLogs.length / totalTries) * 100) : 0;
    const castCounts: any = {};
    logs.forEach(l => { if(l.casting) castCounts[l.casting] = (castCounts[l.casting] || 0) + 1; });
    const mvpCasting = Object.keys(castCounts).length > 0 
      ? Object.keys(castCounts).reduce((a, b) => castCounts[a] > castCounts[b] ? a : b) 
      : '-';
    return { successRate, mvpCasting, alertMsg };
  }, [logs]);

  // 🔍 네이버 검색 (제목 깔끔하게 수정)
  const searchPerformance = async () => {
    const keyword = formData.performance.trim();
    if (!keyword) return alert('공연명을 입력해주세요!');
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      if (data.items?.length > 0) {
        setFormData({ ...formData, performance: keyword, image_url: data.items[0].thumbnail });
        alert(`'${keyword}' 포스터를 찾았습니다!`);
      } else { alert('검색 결과가 없습니다.'); }
    } catch (e) { alert('오류 발생!'); }
  };

  const handleSave = async () => {
    if (!formData.performance) return alert('공연명을 입력하세요!');
    try {
      if (editingId) { await supabase.from('logs').update(formData).eq('id', editingId); }
      else { await supabase.from('logs').insert([formData]); }
      setShowModal(false); setEditingId(null); setFormData(initialForm); fetchLogs();
    } catch (err: any) { alert(err.message); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileName = `${Date.now()}_${file.name}`;
      await supabase.storage.from('views').upload(fileName, file);
      const { data } = supabase.storage.from('views').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
      alert('사진 업로드 성공!');
    } catch (e: any) { alert(e.message); } finally { setUploading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-6 md:p-12 text-slate-900 font-sans tracking-tight">
      {/* 🔔 알림바 */}
      <div className="max-w-5xl mx-auto mb-8 bg-white border border-indigo-50 rounded-3xl p-5 flex items-center gap-5 shadow-sm">
        <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm rotate-3">SL</div>
        <p className="text-indigo-900 text-sm font-black italic">{insight.alertMsg}</p>
      </div>

      <header className="max-w-5xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">Stage<span className="text-indigo-600">Log</span></h1>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.3em]">Musical Archive Project</p>
        </div>
        <button onClick={() => {setEditingId(null); setFormData(initialForm); setShowModal(true);}} className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase shadow-2xl hover:bg-indigo-600 transition-all active:scale-95">New Log</button>
      </header>
      
      <main className="max-w-5xl mx-auto space-y-12">
        {/* 📊 통계 섹션 (간격 수정 완료!) */}
        <section className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl flex justify-between items-center border border-slate-800">
          <div className="space-y-2">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Main Casting</p>
            <p className="text-3xl font-black text-indigo-100 flex items-center gap-2">
              <span className="text-indigo-500 text-xl">#</span> {insight.mvpCasting}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Win Rate</p>
            <p className="text-6xl font-[1000] text-indigo-400 tabular-nums">
              {insight.successRate}<span className="text-2xl ml-1 opacity-50">%</span>
            </p>
          </div>
        </section>

        {/* 📋 로그 리스트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-24">
          {logs.map((log) => (
            <div key={log.id} className="group bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden relative hover:shadow-2xl transition-all duration-500">
              <div onClick={() => {setSelectedLog(log); setShowView(true);}} className="cursor-pointer">
                <div className="h-52 bg-slate-50 relative overflow-hidden">
                  {log.image_url && <img src={log.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                  <div className="absolute top-5 left-5">
                    <span className={`text-[9px] font-black px-4 py-2 rounded-full shadow-lg uppercase ${log.is_success === '성공' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900'}`}>{log.is_success}</span>
                  </div>
                </div>
                <div className="p-8 pb-4">
                  <p className="text-indigo-600 font-black text-[10px] uppercase mb-2 tracking-widest">{log.casting || '캐스팅 정보 없음'}</p>
                  <h4 className="text-2xl font-black mb-1 truncate leading-tight">{log.performance}</h4>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{log.date} <span className="mx-1">•</span> {log.time}</p>
                </div>
              </div>
              <div className="px-8 py-6 flex justify-end gap-5 border-t border-slate-50/50">
                <button onClick={() => {setFormData(log); setEditingId(log.id); setShowModal(true);}} className="text-slate-300 hover:text-indigo-500 font-black text-[10px] transition-colors">EDIT</button>
                <button onClick={async () => {if(confirm('정말 삭제할까요?')){await supabase.from('logs').delete().eq('id', log.id); fetchLogs();}}} className="text-slate-300 hover:text-rose-400 font-black text-[10px] transition-colors">DEL</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 📖 상세 보기 모달 */}
      {showView && selectedLog && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-2xl relative">
            <div className="h-72 w-full bg-slate-100">
              {selectedLog.image_url && <img src={selectedLog.image_url} className="w-full h-full object-cover" />}
            </div>
            <div className="p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-indigo-600 font-black text-xs uppercase mb-2 tracking-widest">{selectedLog.casting}</p>
                  <h2 className="text-3xl font-[1000] leading-tight">{selectedLog.performance}</h2>
                </div>
                <span className="text-[10px] font-black px-4 py-2 rounded-full bg-slate-100 uppercase">{selectedLog.is_success}</span>
              </div>
              <div className="space-y-4 mb-10 text-sm">
                <div className="flex justify-between border-b pb-3 border-slate-50"><span className="text-slate-400 font-bold uppercase text-[10px]">Date & Time</span><span className="font-black">{selectedLog.date} {selectedLog.time}</span></div>
                <div className="flex justify-between border-b pb-3 border-slate-50"><span className="text-slate-400 font-bold uppercase text-[10px]">Seat info</span><span className="font-black text-right">{selectedLog.seat || '정보 없음'}</span></div>
                <div className="flex justify-between border-b pb-3 border-slate-50"><span className="text-slate-400 font-bold uppercase text-[10px]">Rating</span><span className="font-black text-indigo-600">{selectedLog.rating}</span></div>
              </div>
              <button onClick={() => setShowView(false)} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em]">Close Log</button>
            </div>
          </div>
        </div>
      )}

      {/* ✍️ 작성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black mb-8 italic uppercase text-slate-800">{editingId ? 'Edit Log' : 'New Record'}</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="text" onKeyDown={(e) => e.key === 'Enter' && searchPerformance()} className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="공연명 검색 (Enter)" value={formData.performance || ''} onChange={e => setFormData({...formData, performance: e.target.value})} />
                <button onClick={searchPerformance} className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-xs uppercase">Search</button>
              </div>
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="배우" value={formData.casting || ''} onChange={e => setFormData({...formData, casting: e.target.value})} />
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="좌석 상세" value={formData.seat || ''} onChange={e => setFormData({...formData, seat: e.target.value})} />
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center relative">
                <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">시야 사진 업로드</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-[10px] w-full" />
                {formData.image_url && <div className="mt-2 text-emerald-500 font-black text-[10px]">✅ PHOTO READY</div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                <select className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={formData.time || '19:30'} onChange={e => setFormData({...formData, time: e.target.value})}>
                  {["14:00", "14:30", "15:00", "18:00", "18:30", "19:00", "19:30", "20:00"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['성공', '실패', '티켓팅예정'].map(s => (
                  <button key={s} onClick={() => setFormData({...formData, is_success: s})} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${formData.is_success === s ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-50 rounded-2xl font-black text-xs text-slate-300 uppercase">Cancel</button>
              <button onClick={handleSave} disabled={uploading} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl">{editingId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}