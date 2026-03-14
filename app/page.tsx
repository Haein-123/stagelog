'use client';

import { useState, useEffect } from 'react';
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
    try {
      const { data, error } = await supabase.from('logs').select('*').order('date', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (e) { console.error(e); }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileName = `${Date.now()}_${file.name}`;
      await supabase.storage.from('views').upload(fileName, file);
      const { data } = supabase.storage.from('views').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
      alert('이미지 업로드 완료');
    } catch (error: any) { alert('이미지 오류: ' + error.message); } finally { setUploading(false); }
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
    if (!formData.performance) {
      alert('공연명을 입력해주세요!');
      return;
    }

    try {
      // 🛡️ 중요: DB 컬럼명과 100% 일치하는 객체 생성
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

      if (editingId) {
        const { error } = await supabase.from('logs').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('logs').insert([payload]);
        if (error) throw error;
      }

      closeModal();
      await fetchLogs();
    } catch (error: any) {
      alert('저장 중 오류 발생: ' + error.message);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐', date: new Date().toISOString().split('T')[0], time: '19:30', device: 'PC', is_success: '성공', image_url: '' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제할까요?')) return;
    await supabase.from('logs').delete().eq('id', id);
    fetchLogs();
  };

  const timeOptions = ["14:00", "14:30", "15:00", "18:00", "18:30", "19:00", "19:30", "20:00"];

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-10 text-slate-900">
      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center">
        <h1 className="text-3xl font-black italic uppercase">Stage<span className="text-indigo-600">Log</span></h1>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">LOG RESULT</button>
      </header>
      
      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {logs.map((log) => (
          <div key={log.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-40 bg-slate-100">
              {log.image_url && <img src={log.image_url} className="w-full h-full object-cover" />}
            </div>
            <div className="p-5">
              <p className="text-indigo-600 font-bold text-xs mb-1">{log.casting || 'Unknown'}</p>
              <h4 className="text-lg font-bold mb-3 truncate">{log.performance}</h4>
              <div className="flex justify-between items-end pt-4 border-t border-slate-50">
                <div className="text-[11px] text-slate-500 font-medium">
                  <div>{log.date} <span className="text-indigo-600 font-bold">{log.time}</span></div>
                  <div className="text-slate-900 font-bold mt-1">{log.is_success === '성공' ? log.seat : log.is_success}</div>
                </div>
                <div className="flex gap-2 text-[11px] font-bold">
                  <button onClick={() => openEditModal(log)} className="text-indigo-600">EDIT</button>
                  <button onClick={() => handleDelete(log.id)} className="text-rose-500">DEL</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-black mb-6 uppercase">{editingId ? 'Edit Log' : 'New Log'}</h3>
            <div className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['성공', '실패', '티켓팅예정'].map(s => (
                  <button key={s} onClick={() => setFormData({...formData, is_success: s})} className={`flex-1 py-2 rounded-lg text-[11px] font-bold ${formData.is_success === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
              <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" placeholder="공연명" value={formData.performance} onChange={e => setFormData({...formData, performance: e.target.value})} />
              <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" placeholder="배우" value={formData.casting} onChange={e => setFormData({...formData, casting: e.target.value})} />
              <input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" placeholder="좌석/메모" value={formData.seat} onChange={e => setFormData({...formData, seat: e.target.value})} />
              <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="p-3 bg-slate-50 rounded-xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <select className="p-3 bg-slate-50 rounded-xl font-bold text-sm" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}>
                  {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={closeModal} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-sm">CANCEL</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">SAVE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}