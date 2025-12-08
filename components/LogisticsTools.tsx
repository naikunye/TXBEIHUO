
import React, { useState, useEffect } from 'react';
import { Truck, Search, ExternalLink, MapPin, CheckCircle, AlertTriangle, ArrowRight, History, Trash2, Settings, RefreshCw, Globe, Key, AlertCircle, LayoutTemplate, Package } from 'lucide-react';

type TrackingStatus = 'InfoReceived' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Exception' | 'Expired' | 'Pending';

interface TrackingEvent {
    date: string;
    description: string;
    location: string;
    stage: string;
}

interface TrackingRecord {
    id: string;
    trackingNumber: string;
    carrier: string; 
    status: TrackingStatus;
    latestEvent: string;
    lastUpdated: string;
    history: TrackingEvent[];
}

const API_BASE = "https://api.17track.net/track/v2.2/gettrackinfo";

const detectCarrier = (num: string): string => {
    const n = num.toUpperCase();
    if (n.startsWith('1Z')) return 'UPS';
    if (/^\d{12}$/.test(n) || /^\d{15}$/.test(n)) return 'FedEx';
    if (n.startsWith('9')) return 'USPS';
    return 'Auto-Detect';
};

export const LogisticsTools: React.FC = () => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<TrackingRecord[]>(() => {
      try { const saved = localStorage.getItem('tanxing_tracking_history'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [activeRecord, setActiveRecord] = useState<TrackingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('17track_token') || '');
  const [viewMode, setViewMode] = useState<'native' | 'web'>('native'); 

  useEffect(() => { localStorage.setItem('tanxing_tracking_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('17track_token', apiKey); }, [apiKey]);

  const fetchRealTracking = async (number: string): Promise<TrackingRecord> => {
      if (!apiKey) throw new Error("请先配置 17TRACK Token");
      try {
          const res = await fetch(API_BASE, {
              method: 'POST', headers: { 'Content-Type': 'application/json', '17token': apiKey },
              body: JSON.stringify([{ number: number }])
          });
          if (!res.ok) throw new Error("API Request Failed");
          const data = await res.json();
          const trackInfo = data.data.accepted?.[0]?.track;
          if (!trackInfo) throw new Error("No Data Found");

          let status: TrackingStatus = 'Pending';
          const s = trackInfo.z0?.e;
          if (s === 10) status = 'InTransit'; else if (s === 30) status = 'Delivered'; else if (s === 40) status = 'Exception'; else if (s === 50) status = 'InfoReceived';

          const events: TrackingEvent[] = (trackInfo.z1 || []).map((e: any) => ({
              date: e.a, description: e.z, location: e.c + (e.d ? `, ${e.d}` : ''), stage: e.e
          }));

          return {
              id: number, trackingNumber: number, carrier: trackInfo.b || detectCarrier(number),
              status, latestEvent: events[0]?.description || 'No Details', lastUpdated: new Date().toISOString(), history: events
          };
      } catch (err: any) { throw err; }
  };

  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!query.trim()) return;
      const num = query.trim();
      const existing = history.find(h => h.trackingNumber === num);
      
      if (apiKey) {
          setIsLoading(true);
          try {
              const record = await fetchRealTracking(num);
              setHistory(prev => [record, ...prev.filter(h => h.trackingNumber !== num)]);
              setActiveRecord(record); setQuery(''); setViewMode('native');
          } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
      } else {
          if (!existing) {
              const ph: TrackingRecord = { id: num, trackingNumber: num, carrier: detectCarrier(num), status: 'Pending', latestEvent: 'Use Web View', lastUpdated: new Date().toISOString(), history: [] };
              setHistory(prev => [ph, ...prev]); setActiveRecord(ph); setViewMode('web');
          } else { setActiveRecord(existing); }
          setQuery('');
      }
  };

  const getStatusConfig = (status: TrackingStatus) => {
      switch (status) {
          case 'Delivered': return { color: 'text-emerald-400', bg: 'bg-emerald-900/30', icon: <CheckCircle size={14}/> };
          case 'Exception': return { color: 'text-red-400', bg: 'bg-red-900/30', icon: <AlertTriangle size={14}/> };
          case 'InTransit': return { color: 'text-blue-400', bg: 'bg-blue-900/30', icon: <Truck size={14}/> };
          default: return { color: 'text-slate-400', bg: 'bg-slate-800', icon: <Package size={14}/> };
      }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-fade-in relative pb-10">
      
      {/* Settings Modal */}
      {showSettings && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-md">
                  <h3 className="text-xl font-bold text-white mb-4">API Config</h3>
                  <input type="password" className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white mb-4" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="17TRACK Token" />
                  <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold">保存</button>
              </div>
          </div>
      )}

      {/* LEFT: List */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4 shrink-0 h-full">
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-white flex items-center gap-2"><Truck className="text-cyan-400" size={20} /> 物流追踪器</h3>
                  <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-white"><Settings size={16} /></button>
              </div>
              <form onSubmit={handleSearch} className="relative">
                  <input type="text" placeholder="输入物流单号 (UPS, FedEx...)" className="w-full pl-10 pr-12 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-cyan-500 outline-none font-mono text-sm" value={query} onChange={e => setQuery(e.target.value)} />
                  <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                  <button type="submit" disabled={isLoading || !query} className="absolute right-2 top-2 p-1.5 bg-cyan-600 text-white rounded-lg disabled:opacity-50">{isLoading ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRight size={16} />}</button>
              </form>
          </div>

          <div className="flex-1 glass-panel rounded-2xl border border-white/5 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">查询历史 ({history.length})</span>
                  {history.length > 0 && <button onClick={() => setHistory([])} className="text-[10px] text-red-400 hover:text-red-300">清空</button>}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                  {history.map(record => {
                      const conf = getStatusConfig(record.status);
                      const isActive = activeRecord?.id === record.id;
                      return (
                          <div key={record.id} onClick={() => setActiveRecord(record)} className={`p-3 rounded-xl border cursor-pointer transition-all group relative ${isActive ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                              <div className="flex justify-between items-start mb-1">
                                  <span className="font-mono font-bold text-white text-sm">{record.trackingNumber}</span>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase bg-white/5 px-1.5 rounded">{record.carrier}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold ${conf.color} ${conf.bg}`}>{conf.icon}{record.status}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">{record.latestEvent}</p>
                              <button onClick={(e) => { e.stopPropagation(); setHistory(h => h.filter(x => x.id !== record.id)); }} className="absolute right-2 bottom-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

      {/* RIGHT: Detail */}
      <div className="flex-1 glass-panel rounded-3xl border border-white/5 overflow-hidden flex flex-col relative bg-slate-900">
          {activeRecord ? (
              <>
                  <div className="p-6 bg-black/40 border-b border-white/5 shrink-0 flex justify-between items-center">
                      <div>
                          <h2 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">{activeRecord.trackingNumber}</h2>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              <span className="bg-white/10 px-2 py-0.5 rounded text-cyan-400 uppercase font-bold">{activeRecord.carrier}</span>
                              <span>更新于: {new Date(activeRecord.lastUpdated).toLocaleString()}</span>
                          </div>
                      </div>
                      <div className="flex bg-slate-800 p-1 rounded-xl">
                          <button onClick={() => setViewMode('native')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'native' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>本地视图</button>
                          <button onClick={() => setViewMode('web')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'web' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>官网视图</button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-hidden relative bg-slate-950/50">
                      {viewMode === 'native' ? (
                          <div className="h-full overflow-y-auto custom-scrollbar p-8 relative">
                              <div className="absolute left-10 top-8 bottom-8 w-0.5 bg-slate-800"></div>
                              {activeRecord.history.map((event, idx) => (
                                  <div key={idx} className="flex gap-8 mb-8 relative">
                                      <div className={`w-3 h-3 rounded-full absolute left-[7px] top-1.5 z-10 ${idx===0 ? 'bg-cyan-400 shadow-glow-cyan' : 'bg-slate-700'}`}></div>
                                      <div className="pl-8 flex-1">
                                          <div className={`p-4 rounded-xl border ${idx===0 ? 'bg-cyan-900/10 border-cyan-500/30' : 'bg-slate-900/50 border-white/5'}`}>
                                              <div className="flex justify-between items-start mb-2">
                                                  <span className={`text-sm font-bold ${idx===0 ? 'text-white' : 'text-slate-400'}`}>{event.description}</span>
                                                  <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{new Date(event.date).toLocaleDateString()}</span>
                                              </div>
                                              <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10}/> {event.location}</div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <iframe src={`https://t.17track.net/zh-cn#nums=${activeRecord.trackingNumber}`} className="w-full h-full border-0 invert-[.9]" title="Web View" />
                      )}
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                  <Truck size={48} className="mb-4 opacity-20" />
                  <p className="font-mono text-sm">请选择或输入物流单号</p>
              </div>
          )}
      </div>
    </div>
  );
};
