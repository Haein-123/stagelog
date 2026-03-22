'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showWishModal, setShowWishModal] = useState(false); // 🎯 위시리스트 추가 모달
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'wishlist'>('list'); // 🎯 위시리스트 탭 추가
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [wishes, setWishes] = useState<any[]>([]); // 🎯 위시리스트 데이터
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingWishId, setEditingWishId] = useState<number | null>(null); // 🎯 위시리스트 수정용
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const initialForm = {
    performance: '', casting: '', seat: '', rating: '⭐⭐⭐⭐⭐',
    date: new Date().toISOString().split('T')[0],
    time: '19:30', device: 'PC', is_success: '성공', image_url: '',
    cost: '', sight_rating: '', venue: '', sight_link: '',
  };

  // 🎯 위시리스트 초기값
  const initialWishForm = {
    performance: '', casting: '', open_date: '', ticket_date: '',
    priority: '보통', memo: '', image_url: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [wishForm, setWishForm] = useState(initialWishForm);

  const sightOptions = [
    { value: '좋음', emoji: '👍', label: '좋음', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { value: '보통', emoji: '😐', label: '보통', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { value: '나쁨', emoji: '👎', label: '나쁨', color: 'bg-rose-50 text-rose-500 border-rose-200' },
  ];

  // 🎯 우선순위 옵션
  const priorityOptions = [
    { value: '필수', emoji: '🔥', color: 'bg-rose-50 text-rose-500 border-rose-200' },
    { value: '보통', emoji: '⭐', color: 'bg-amber-50 text-amber-500 border-amber-200' },
    { value: '여유', emoji: '🌿', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  ];

  const getSightWarning = (seat: string) => {
    if (!seat) return null;
    const zone = seat.replace(/\d+열.*/, '').trim();
    const badLogs = logs.filter(l =>
      l.sight_rating === '나쁨' && l.seat && l.seat.includes(zone) && l.id !== editingId
    );
    if (badLogs.length > 0) return `⚠️ "${zone}" 구역은 지난번 시야가 나빴어요!`;
    return null;
  };

  const ratingToNumber = (rating: string) => {
    if (!rating) return 0;
    return (rating.match(/⭐/g) || []).length;
  };

  // 🎯 D-day 계산
  const getDday = (dateStr: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-DAY';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  useEffect(() => { fetchLogs(); fetchWishes(); }, []);

  async function fetchLogs() {
    const { data } = await supabase.from('logs').select('*').order('date', { ascending: false });
    if (data) setLogs(data);
  }

  // 🎯 위시리스트 불러오기
  async function fetchWishes() {
    const { data } = await supabase.from('wishlist').select('*').order('created_at', { ascending: false });
    if (data) setWishes(data);
  }

  // 🎯 위시리스트 저장
  const handleWishSave = async () => {
    if (!wishForm.performance) return alert('공연명을 입력하세요!');
    try {
      if (editingWishId) {
        await supabase.from('wishlist').update(wishForm).eq('id', editingWishId);
      } else {
        await supabase.from('wishlist').insert([wishForm]);
      }
      setShowWishModal(false);
      setEditingWishId(null);
      setWishForm(initialWishForm);
      fetchWishes();
    } catch (err: any) { alert(err.message); }
  };

  // 🎯 위시리스트 삭제
  const handleWishDelete = async (id: number) => {
    if (!confirm('위시리스트에서 삭제할까요?')) return;
    await supabase.from('wishlist').delete().eq('id', id);
    fetchWishes();
  };

  // 🎯 위시리스트 포스터 검색
  const searchWishPerformance = async () => {
    const keyword = wishForm.performance.trim();
    if (!keyword) return alert('공연명을 입력해주세요!');
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(keyword + ' 뮤지컬 포스터')}`);
      const data = await res.json();
      if (data.items?.length > 0) {
        setWishForm({ ...wishForm, performance: keyword, image_url: data.items[0].thumbnail });
        alert(`'${keyword}' 포스터를 찾았습니다!`);
      } else { alert('검색 결과가 없습니다.'); }
    } catch (e) { alert('오류 발생!'); }
  };

  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const logsByDate: Record<string, any[]> = {};
    logs.forEach(l => {
      if (!l.date) return;
      if (!logsByDate[l.date]) logsByDate[l.date] = [];
      logsByDate[l.date].push(l);
    });
    return { year, month, firstDay, daysInMonth, logsByDate };
  }, [calendarDate, logs]);

  const selectedDateLogs = useMemo(() => {
    if (!selectedDate) return [];
    return logs.filter(l => l.date === selectedDate);
  }, [selectedDate, logs]);

  const thisMonthCount = useMemo(() => {
    const y = calendarDate.getFullYear();
    const m = String(calendarDate.getMonth() + 1).padStart(2, '0');
    return logs.filter(l => l.date && l.date.startsWith(`${y}-${m}`)).length;
  }, [calendarDate, logs]);

  const insight = useMemo(() => {
    if (logs.length === 0) return {
      successRate: 0, mvpCasting: '-', alertMsg: "첫 기록을 남겨보세요! 🎭",
      totalCost: 0, castingStats: []
    };
    const upcoming = logs.filter(l => l.is_success === '티켓팅예정').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let alertMsg = "즐거운 관극 생활 되세요! ✨";
    if (upcoming.length > 0) alertMsg = `🔥 [D-DAY] ${upcoming[0].performance} (${upcoming[0].date}) 티켓팅 준비!`;
    const successLogs = logs.filter(l => l.is_success === '성공');
    const totalTries = logs.filter(l => l.is_success !== '티켓팅예정').length;
    const successRate = totalTries > 0 ? Math.round((successLogs.length / totalTries) * 100) : 0;
    const castCounts: any = {};
    logs.forEach(l => { if(l.casting) castCounts[l.casting] = (castCounts[l.casting] || 0) + 1; });
    const mvpCasting = Object.keys(castCounts).length > 0 ? Object.keys(castCounts).reduce((a, b) => castCounts[a] > castCounts[b] ? a : b) : '-';
    const totalCost = logs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
    const castingMap: any = {};
    logs.forEach(l => {
      if (!l.casting) return;
      if (!castingMap[l.casting]) castingMap[l.casting] = { total: 0, count: 0, ratings: [], sightGood: 0, sightOk: 0, sightBad: 0, lastDate: '' };
      const c = castingMap[l.casting];
      c.total += Number(l.cost) || 0; c.count += 1;
      if (l.rating) c.ratings.push(ratingToNumber(l.rating));
      if (l.sight_rating === '좋음') c.sightGood += 1;
      if (l.sight_rating === '보통') c.sightOk += 1;
      if (l.sight_rating === '나쁨') c.sightBad += 1;
      if (!c.lastDate || l.date > c.lastDate) c.lastDate = l.date;
    });
    const castingStats = Object.entries(castingMap).map(([name, v]: any) => ({
      name, total: v.total, count: v.count,
      avgRating: v.ratings.length > 0 ? Math.round((v.ratings.reduce((a: number, b: number) => a + b, 0) / v.ratings.length) * 10) / 10 : 0,
      sightGood: v.sightGood, sightOk: v.sightOk, sightBad: v.sightBad, lastDate: v.lastDate,
    })).sort((a, b) => b.count - a.count);
    return { successRate, mvpCasting, alertMsg, totalCost, castingStats };
  }, [logs]);

  const searchPerformance = async () => {
    const keyword = formData.performance.trim();
    if (!keyword) return alert('공연명을 입력해주세요!');
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(keyword + ' 뮤지컬 포스터')}`);
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

  const sightWarning = getSightWarning(formData.seat);
  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const dayNames = ['일','월','화','수','목','금','토'];
  const today = new Date().toISOString().split('T')[0];

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
        <div className="flex items-center gap-4">
          {/* 뷰 모드 탭 */}
          <div className="flex bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
            {[
              { key: 'list', label: '목록' },
              { key: 'calendar', label: '캘린더' },
              { key: 'wishlist', label: '🎯 위시' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as any)}
                className={`px-5 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${viewMode === tab.key ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* New 버튼 - 위시 탭일 때는 위시 추가 */}
          {viewMode === 'wishlist' ? (
            <button onClick={() => { setEditingWishId(null); setWishForm(initialWishForm); setShowWishModal(true); }} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase shadow-2xl hover:bg-indigo-700 transition-all active:scale-95">+ 위시</button>
          ) : (
            <button onClick={() => { setEditingId(null); setFormData(initialForm); setShowModal(true); }} className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase shadow-2xl hover:bg-indigo-600 transition-all active:scale-95">New Log</button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-12">
        {/* 📊 통계 섹션 */}
        <section className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl border border-slate-800">
          <div className="flex justify-between items-center mb-10">
            <div className="space-y-2">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Main Casting</p>
              <p className="text-3xl font-black text-indigo-100 flex items-center gap-2"><span className="text-indigo-500 text-xl">#</span> {insight.mvpCasting}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Win Rate</p>
              <p className="text-6xl font-[1000] text-indigo-400 tabular-nums">{insight.successRate}<span className="text-2xl ml-1 opacity-50">%</span></p>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex justify-between items-center">
            <div className="space-y-2">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Total Spent</p>
              <p className="text-3xl font-black text-emerald-400 tabular-nums">{insight.totalCost > 0 ? insight.totalCost.toLocaleString('ko-KR') : '0'}<span className="text-lg ml-1 opacity-60">원</span></p>
            </div>
            {insight.castingStats.length > 0 && (
              <button onClick={() => setShowStats(true)} className="border border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-400 transition-all px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest">캐스팅 통계 보기 →</button>
            )}
            <div className="text-right space-y-2">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Avg Ticket</p>
              <p className="text-3xl font-black text-slate-300 tabular-nums">
                {logs.filter(l => l.cost > 0).length > 0 ? Math.round(insight.totalCost / logs.filter(l => l.cost > 0).length).toLocaleString('ko-KR') : '0'}
                <span className="text-lg ml-1 opacity-60">원</span>
              </p>
            </div>
          </div>
        </section>

        {/* 🎯 위시리스트 뷰 */}
        {viewMode === 'wishlist' && (
          <div className="space-y-6 pb-24">
            {wishes.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-4xl mb-4">🎯</p>
                <p className="text-slate-400 font-black text-sm">보고 싶은 공연을 추가해봐요!</p>
              </div>
            ) : (
              wishes.map(wish => {
                const ticketDday = wish.ticket_date ? getDday(wish.ticket_date) : null;
                const openDday = wish.open_date ? getDday(wish.open_date) : null;
                const priority = priorityOptions.find(p => p.value === wish.priority);
                return (
                  <div key={wish.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                    <div className="flex gap-0">
                      {/* 포스터 */}
                      <div className="w-32 flex-shrink-0 bg-slate-50">
                        {wish.image_url
                          ? <img src={wish.image_url} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-slate-200 font-black text-xs min-h-[120px]">NO IMG</div>
                        }
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            {priority && (
                              <span className={`text-[9px] font-black px-3 py-1 rounded-full border mr-2 ${priority.color}`}>
                                {priority.emoji} {wish.priority}
                              </span>
                            )}
                            <h4 className="text-xl font-black mt-2">{wish.performance}</h4>
                            {wish.casting && <p className="text-indigo-500 font-black text-[10px] uppercase tracking-widest mt-1">{wish.casting}</p>}
                          </div>
                          <div className="flex gap-3 ml-4">
                            <button onClick={() => { setWishForm(wish); setEditingWishId(wish.id); setShowWishModal(true); }} className="text-slate-300 hover:text-indigo-500 font-black text-[10px] transition-colors">EDIT</button>
                            <button onClick={() => handleWishDelete(wish.id)} className="text-slate-300 hover:text-rose-400 font-black text-[10px] transition-colors">DEL</button>
                          </div>
                        </div>

                        {/* D-day 뱃지들 */}
                        <div className="flex gap-2 flex-wrap mb-3">
                          {ticketDday && (
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${ticketDday === 'D-DAY' ? 'bg-rose-500 text-white' : ticketDday.startsWith('D-') ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              🎟 티켓팅 {ticketDday}
                            </span>
                          )}
                          {openDday && (
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${openDday === 'D-DAY' ? 'bg-rose-500 text-white' : openDday.startsWith('D-') ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                              🎭 공연 {openDday}
                            </span>
                          )}
                        </div>

                        {/* 날짜 정보 */}
                        <div className="flex gap-4 text-[10px] font-bold text-slate-400">
                          {wish.ticket_date && <span>티켓팅일 {wish.ticket_date}</span>}
                          {wish.open_date && <span>공연일 {wish.open_date}</span>}
                        </div>

                        {/* 메모 */}
                        {wish.memo && <p className="mt-2 text-[11px] text-slate-400 font-bold bg-slate-50 rounded-xl px-3 py-2">{wish.memo}</p>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 📅 캘린더 뷰 */}
        {viewMode === 'calendar' && (
          <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden pb-10">
            <div className="flex items-center justify-between px-10 pt-10 pb-6">
              <div>
                <h2 className="text-3xl font-black">{calendarDate.getFullYear()}년 <span className="text-indigo-600">{monthNames[calendarDate.getMonth()]}</span></h2>
                <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">이번 달 관극 {thisMonthCount}회</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 font-black text-slate-500 transition-all flex items-center justify-center">←</button>
                <button onClick={() => setCalendarDate(new Date())} className="px-4 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 font-black text-[10px] text-slate-500 uppercase transition-all">오늘</button>
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 font-black text-slate-500 transition-all flex items-center justify-center">→</button>
              </div>
            </div>
            <div className="grid grid-cols-7 px-6 mb-2">
              {dayNames.map((d, i) => (
                <div key={d} className={`text-center text-[10px] font-black uppercase tracking-widest py-2 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-indigo-400' : 'text-slate-300'}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 px-6 gap-1">
              {Array.from({ length: calendarData.firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-16" />)}
              {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayLogs = calendarData.logsByDate[dateStr] || [];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const dayOfWeek = (calendarData.firstDay + i) % 7;
                return (
                  <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`h-16 rounded-2xl flex flex-col items-center justify-start pt-2 gap-1 transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg scale-105' : isToday ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 cursor-pointer'}`}>
                    <span className={`text-sm font-black leading-none ${isSelected ? 'text-white' : isToday ? 'text-indigo-600' : dayOfWeek === 0 ? 'text-rose-400' : dayOfWeek === 6 ? 'text-indigo-400' : 'text-slate-700'}`}>{day}</span>
                    {dayLogs.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center px-1">
                        {dayLogs.slice(0, 3).map((log, idx) => (
                          <span key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : log.is_success === '성공' ? 'bg-indigo-500' : log.is_success === '티켓팅예정' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                        ))}
                        {dayLogs.length > 3 && <span className={`text-[8px] font-black ${isSelected ? 'text-white' : 'text-slate-400'}`}>+{dayLogs.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedDate && selectedDateLogs.length > 0 && (
              <div className="mx-6 mt-6 p-6 bg-slate-50 rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{selectedDate} 관극 기록 ({selectedDateLogs.length}건)</p>
                <div className="space-y-3">
                  {selectedDateLogs.map(log => (
                    <div key={log.id} onClick={() => { setSelectedLog(log); setShowView(true); }} className="flex items-center gap-4 bg-white rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all">
                      {log.image_url && <img src={log.image_url} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate">{log.performance}</p>
                        <p className="text-[10px] text-indigo-500 font-black truncate">{log.casting || '-'}</p>
                        {log.venue && <p className="text-[10px] text-slate-400 font-bold truncate">📍 {log.venue}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full ${log.is_success === '성공' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{log.is_success}</span>
                        {log.cost > 0 && <span className="text-[9px] font-black text-emerald-600">{Number(log.cost).toLocaleString('ko-KR')}원</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedDate && selectedDateLogs.length === 0 && (
              <div className="mx-6 mt-6 p-6 bg-slate-50 rounded-3xl text-center">
                <p className="text-slate-300 font-black text-sm">이 날은 관극 기록이 없어요</p>
              </div>
            )}
            <div className="flex items-center gap-5 px-10 mt-6">
              <p className="text-[9px] font-black text-slate-300 uppercase">범례</p>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /><span className="text-[9px] font-black text-slate-400">성공</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /><span className="text-[9px] font-black text-slate-400">티켓팅예정</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /><span className="text-[9px] font-black text-slate-400">실패</span></div>
            </div>
          </section>
        )}

        {/* 📋 목록 뷰 */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-24">
            {logs.map((log) => (
              <div key={log.id} className="group bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden relative hover:shadow-2xl transition-all duration-500">
                <div onClick={() => {setSelectedLog(log); setShowView(true);}} className="cursor-pointer">
                  <div className="h-52 bg-slate-50 relative overflow-hidden">
                    {log.image_url && <img src={log.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                    <div className="absolute top-5 left-5 flex gap-2 flex-wrap">
                      <span className={`text-[9px] font-black px-4 py-2 rounded-full shadow-lg uppercase ${log.is_success === '성공' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900'}`}>{log.is_success}</span>
                      {log.sight_rating && (
                        <span className={`text-[9px] font-black px-3 py-2 rounded-full shadow-lg border ${log.sight_rating === '좋음' ? 'bg-emerald-500 text-white border-emerald-400' : log.sight_rating === '보통' ? 'bg-amber-400 text-white border-amber-300' : 'bg-rose-500 text-white border-rose-400'}`}>
                          {log.sight_rating === '좋음' ? '👍' : log.sight_rating === '보통' ? '😐' : '👎'} {log.sight_rating}
                        </span>
                      )}
                    </div>
                    {log.cost > 0 && (
                      <div className="absolute bottom-5 right-5">
                        <span className="text-[9px] font-black px-3 py-2 rounded-full bg-slate-900/80 text-emerald-400 backdrop-blur-sm">{Number(log.cost).toLocaleString('ko-KR')}원</span>
                      </div>
                    )}
                  </div>
                  <div className="p-8 pb-4">
                    <p className="text-indigo-600 font-black text-[10px] uppercase mb-2 tracking-widest">{log.casting || '캐스팅 정보 없음'}</p>
                    <h4 className="text-2xl font-black mb-1 truncate leading-tight">{log.performance}</h4>
                    {log.venue && <p className="text-[10px] font-bold text-slate-400 mb-1 truncate">📍 {log.venue}</p>}
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
        )}
      </main>

      {/* 🎯 위시리스트 추가/수정 모달 */}
      {showWishModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black mb-8 italic uppercase text-slate-800">{editingWishId ? 'Edit Wish' : '🎯 New Wish'}</h3>
            <div className="space-y-4">
              {/* 공연명 검색 */}
              <div className="flex gap-2">
                <input type="text" onKeyDown={(e) => e.key === 'Enter' && searchWishPerformance()} className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="공연명 검색 (Enter)" value={wishForm.performance || ''} onChange={e => setWishForm({...wishForm, performance: e.target.value})} />
                <button onClick={searchWishPerformance} className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-xs uppercase">Search</button>
              </div>

              {/* 포스터 미리보기 */}
              {wishForm.image_url && (
                <div className="w-full h-40 bg-slate-50 rounded-2xl overflow-hidden">
                  <img src={wishForm.image_url} className="w-full h-full object-contain" />
                </div>
              )}

              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="보고 싶은 배우 (선택)" value={wishForm.casting || ''} onChange={e => setWishForm({...wishForm, casting: e.target.value})} />

              {/* 우선순위 */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">우선순위</p>
                <div className="flex gap-2">
                  {priorityOptions.map(opt => (
                    <button key={opt.value} onClick={() => setWishForm({...wishForm, priority: opt.value})}
                      className={`flex-1 py-3 rounded-2xl font-black text-xs border-2 transition-all ${wishForm.priority === opt.value ? opt.color + ' scale-105 shadow-md' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                      {opt.emoji} {opt.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">티켓팅일</p>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={wishForm.ticket_date || ''} onChange={e => setWishForm({...wishForm, ticket_date: e.target.value})} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">공연일</p>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={wishForm.open_date || ''} onChange={e => setWishForm({...wishForm, open_date: e.target.value})} />
                </div>
              </div>

              {/* 메모 */}
              <textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none resize-none" placeholder="메모 (선택, 예: 김선생 페어로 꼭 봐야함!)" rows={3} value={wishForm.memo || ''} onChange={e => setWishForm({...wishForm, memo: e.target.value})} />
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => { setShowWishModal(false); setEditingWishId(null); setWishForm(initialWishForm); }} className="flex-1 py-5 bg-slate-50 rounded-2xl font-black text-xs text-slate-300 uppercase">Cancel</button>
              <button onClick={handleWishSave} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">{editingWishId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 캐스팅 통계 모달 */}
      {showStats && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[70]">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-black mb-1 italic uppercase">Casting Stats</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">캐스팅별 관극 분석</p>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {insight.castingStats.map((c, i) => (
                <div key={c.name} className="bg-slate-50 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-300 bg-white w-7 h-7 rounded-full flex items-center justify-center shadow-sm">{i + 1}</span>
                      <p className="font-black text-base">{c.name}</p>
                    </div>
                    <p className="text-[10px] font-black text-slate-400">마지막 {c.lastDate}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white rounded-2xl p-3 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">관극</p><p className="font-black text-lg text-slate-900">{c.count}<span className="text-xs ml-0.5 text-slate-400">회</span></p></div>
                    <div className="bg-white rounded-2xl p-3 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">지출</p><p className="font-black text-sm text-emerald-600 tabular-nums">{c.total > 0 ? (c.total / 10000).toFixed(0) + '만' : '-'}</p></div>
                    <div className="bg-white rounded-2xl p-3 text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">평점</p><p className="font-black text-lg text-indigo-600">{c.avgRating > 0 ? c.avgRating : '-'}{c.avgRating > 0 && <span className="text-xs ml-0.5 text-slate-400">/ 5</span>}</p></div>
                  </div>
                  {(c.sightGood + c.sightOk + c.sightBad) > 0 && (
                    <div className="bg-white rounded-2xl p-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">시야 분포</p>
                      <div className="flex gap-2 flex-wrap">
                        {c.sightGood > 0 && <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600">👍 좋음 {c.sightGood}회</span>}
                        {c.sightOk > 0 && <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-amber-50 text-amber-600">😐 보통 {c.sightOk}회</span>}
                        {c.sightBad > 0 && <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-rose-50 text-rose-500">👎 나쁨 {c.sightBad}회</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
              <p className="font-black text-sm uppercase text-slate-400">Total Spent</p>
              <p className="text-2xl font-[1000] text-slate-900">{insight.totalCost.toLocaleString('ko-KR')}원</p>
            </div>
            <button onClick={() => setShowStats(false)} className="w-full mt-6 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase">Close</button>
          </div>
        </div>
      )}

      {/* 📖 상세 보기 모달 */}
      {showView && selectedLog && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-2xl relative">
            <div className="h-72 w-full bg-slate-100 flex items-center justify-center">
              {selectedLog.image_url ? <img src={selectedLog.image_url} className="w-full h-full object-contain bg-slate-100" /> : <p className="text-slate-300 text-xs font-black uppercase">No Image</p>}
            </div>
            <div className="p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-indigo-600 font-black text-xs uppercase mb-2 tracking-widest">{selectedLog.casting}</p>
                  <h2 className="text-3xl font-[1000] leading-tight">{selectedLog.performance}</h2>
                  {selectedLog.venue && <p className="text-slate-400 text-xs font-bold mt-1">📍 {selectedLog.venue}</p>}
                </div>
                <span className="text-[10px] font-black px-4 py-2 rounded-full bg-slate-100 uppercase">{selectedLog.is_success}</span>
              </div>
              <div className="space-y-4 mb-6 text-sm">
                <div className="flex justify-between border-b pb-3 border-slate-50"><span className="text-slate-400 font-bold uppercase text-[10px]">Date & Time</span><span className="font-black">{selectedLog.date} {selectedLog.time}</span></div>
                <div className="flex justify-between border-b pb-3 border-slate-50"><span className="text-slate-400 font-bold uppercase text-[10px]">Seat info</span><span className="font-black text-right">{selectedLog.seat || '정보 없음'}</span></div>
                <div className="flex justify-between border-b pb-3 border-slate-50">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Sight</span>
                  <span className={`font-black ${selectedLog.sight_rating === '좋음' ? 'text-emerald-500' : selectedLog.sight_rating === '보통' ? 'text-amber-500' : selectedLog.sight_rating === '나쁨' ? 'text-rose-500' : 'text-slate-300'}`}>
                    {selectedLog.sight_rating ? `${selectedLog.sight_rating === '좋음' ? '👍' : selectedLog.sight_rating === '보통' ? '😐' : '👎'} ${selectedLog.sight_rating}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-3 border-slate-50"><span className="text-slate-400 font-bold uppercase text-[10px]">Rating</span><span className="font-black text-indigo-600">{selectedLog.rating}</span></div>
                <div className="flex justify-between border-b pb-3 border-slate-50">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Ticket Cost</span>
                  <span className="font-black text-emerald-600">{selectedLog.cost > 0 ? `${Number(selectedLog.cost).toLocaleString('ko-KR')}원` : '-'}</span>
                </div>
              </div>
              {selectedLog.sight_link && (
                <a href={selectedLog.sight_link} target="_blank" rel="noopener noreferrer" className="w-full mb-4 py-4 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all">🔗 좌석 시야 보기</a>
              )}
              <button onClick={() => setShowView(false)} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em]">Close Log</button>
            </div>
          </div>
        </div>
      )}

      {/* ✍️ 관극 기록 작성/수정 모달 */}
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
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="공연장 (예: 블루스퀘어 마스터카드홀)" value={formData.venue || ''} onChange={e => setFormData({...formData, venue: e.target.value})} />
              <div>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" placeholder="좌석 상세 (예: 1층 A구역 5열 3번)" value={formData.seat || ''} onChange={e => setFormData({...formData, seat: e.target.value})} />
                {sightWarning && <div className="mt-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl"><p className="text-rose-500 font-black text-[11px]">{sightWarning}</p></div>}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">좌석 시야 링크</p>
                <input type="url" className="w-full p-4 bg-indigo-50 rounded-2xl font-bold text-sm outline-none placeholder:text-indigo-200" placeholder="공연장 홈페이지 좌석배치도 링크 (예: bluesquare.org)" value={formData.sight_link || ''} onChange={e => setFormData({...formData, sight_link: e.target.value})} />
                <p className="text-[10px] text-slate-300 font-bold mt-1 pl-1">💡 공연장 홈페이지 좌석배치도 URL을 넣으면 언제든 볼 수 있어요!</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">시야 평점</p>
                <div className="flex gap-2">
                  {sightOptions.map(opt => (
                    <button key={opt.value} onClick={() => setFormData({...formData, sight_rating: formData.sight_rating === opt.value ? '' : opt.value})}
                      className={`flex-1 py-3 rounded-2xl font-black text-xs border-2 transition-all ${formData.sight_rating === opt.value ? opt.color + ' scale-105 shadow-md' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input type="number" className="w-full p-4 bg-emerald-50 rounded-2xl font-bold text-sm outline-none pr-12 placeholder:text-emerald-300" placeholder="티켓 가격 (숫자만, 예: 150000)" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: e.target.value})} min="0" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-xs">원</span>
              </div>
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