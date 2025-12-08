
import React, { useState, useEffect } from 'react';
import { Truck, Search, ExternalLink, MapPin, CheckCircle, AlertTriangle, ArrowRight, History, Trash2, Settings, RefreshCw, Globe, Key, AlertCircle, LayoutTemplate, Package } from 'lucide-react';

// --- Types ---
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
    carrier: string; // e.g., ups, fedex
    status: TrackingStatus;
    latestEvent: string;
    lastUpdated: string;
    history: TrackingEvent[];
}

// --- 17TRACK API Helpers ---
const API_BASE = "https://api.17track.net/track/v2.2/gettrackinfo";

// Helper to guess carrier from number pattern (for offline/initial view)
const detectCarrier = (num: string): string => {
    const n = num.toUpperCase();
    if (n.startsWith('1Z')) return 'UPS';
    if (/^\d{12}$/.test(n) || /^\d{15}$/.test(n)) return 'FedEx';
    if (n.startsWith('9')) return 'USPS'; // Simplified
    return 'Auto-Detect';
};

export const LogisticsTools: React.FC = () => {
  // State
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<TrackingRecord[]>(() => {
      try {
          const saved = localStorage.getItem('tanxing_tracking_history');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });
  const [activeRecord, setActiveRecord] = useState<TrackingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Config State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('17track_token') || '');
  const [viewMode, setViewMode] = useState<'native' | 'web'>('native'); // native = API timeline, web = iframe

  // Persistence
  useEffect(() => {
      localStorage.setItem('tanxing_tracking_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
      localStorage.setItem('17track_token', apiKey);
  }, [apiKey]);

  // --- API Logic ---
  const fetchRealTracking = async (number: string): Promise<TrackingRecord> => {
      if (!apiKey) {
          throw new Error("请先点击右上角设置，配置 17TRACK Token");
      }

      try {
          const res = await fetch(API_BASE, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  '17token': apiKey
              },
              body: JSON.stringify([{ number: number }])
          });

          if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`API 请求失败: ${res.status} ${errorText}`);
          }

          const data = await res.json();
          if (data.code !== 0) {
              throw new Error(`17TRACK Error: ${data.message || 'Unknown error'}`);
          }

          const trackInfo = data.data.accepted?.[0]?.track;
          if (!trackInfo) {
              // Check rejected
              const rejected = data.data.rejected?.[0];
              if (rejected) throw new Error(`查询被拒绝: ${rejected.error?.message || '未知原因'}`);
              throw new Error("未找到该单号信息");
          }

          // Map 17Track Status (0:NotFound, 10:Transit, 20:Expired, 30:Delivered, 35:Undelivered, 40:Exception, 50:InfoReceived)
          let status: TrackingStatus = 'Pending';
          const s = trackInfo.z0?.e; // Event status
          if (s === 10) status = 'InTransit';
          else if (s === 30) status = 'Delivered';
          else if (s === 40) status = 'Exception';
          else if (s === 50) status = 'InfoReceived';
          else if (s === 20) status = 'Expired';

          // Map Events
          const events: TrackingEvent[] = (trackInfo.z1 || []).map((e: any) => ({
              date: e.a, // timestamp
              description: e.z, // content
              location: e.c + (e.d ? `, ${e.d}` : ''), // location
              stage: e.e // stage code
          }));

          return {
              id: number,
              trackingNumber: number,
              carrier: trackInfo.b || detectCarrier(number), // Carrier code or fallback
              status,
              latestEvent: events[0]?.description || '暂无轨迹详情',
              lastUpdated: new Date().toISOString(),
              history: events
          };

      } catch (err: any) {
          console.error(err);
          // If CORS error, it's hard to catch specifically in JS, but usually throws TypeError
          if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
              throw new Error("网络请求失败 (可能是 CORS 跨域限制)。请尝试使用代理插件或在服务端请求。");
          }
          throw err;
      }
  };

  // --- Handlers ---
  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!query.trim()) return;

      const num = query.trim();

      // 1. Check if already exists
      const existing = history.find(h => h.trackingNumber === num);
      
      // 2. Decide: Use existing or refresh?
      // If we have API key, let's try to refresh it to get latest data
      if (apiKey) {
          await executeFetch(num);
      } else {
          // No API key -> Just add a placeholder record for "Web View" mode
          if (!existing) {
              const placeholder: TrackingRecord = {
                  id: num,
                  trackingNumber: num,
                  carrier: detectCarrier(num),
                  status: 'Pending',
                  latestEvent: '请切换至网页模式查看',
                  lastUpdated: new Date().toISOString(),
                  history: []
              };
              setHistory(prev => [placeholder, ...prev]);
              setActiveRecord(placeholder);
              // Auto switch to web mode if no API key
              setViewMode('web');
          } else {
              setActiveRecord(existing);
          }
          setQuery('');
      }
  };

  const executeFetch = async (num: string) => {
      setIsLoading(true);
      try {
          const record = await fetchRealTracking(num);
          setHistory(prev => {
              const filtered = prev.filter(h => h.trackingNumber !== num);
              return [record, ...filtered];
          });
          setActiveRecord(record);
          setQuery('');
          setViewMode('native'); // Auto switch to native if success
      } catch (err: any) {
          alert(err.message);
          // Fallback logic could go here if needed
      } finally {
          setIsLoading(false);
      }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newHistory = history.filter(h => h.id !== id);
      setHistory(newHistory);
      if (activeRecord?.id === id) setActiveRecord(null);
  };

  const getStatusConfig = (status: TrackingStatus) => {
      switch (status) {
          case 'Delivered': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle size={14}/>, label: '已签收' };
          case 'Exception': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle size={14}/>, label: '异常' };
          case 'InTransit': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Truck size={14}/>, label: '运输中' };
          case 'InfoReceived': return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: <MapPin size={14}/>, label: '已揽收' };
          default: return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: <AlertCircle size={14}/>, label: '待查询' };
      }
  };

  // Helper to check if it's UPS
  const isUPS = (record: TrackingRecord | null) => {
      if (!record) return false;
      const c = record.carrier.toLowerCase();
      const n = record.trackingNumber.toUpperCase();
      return c.includes('ups') || n.startsWith('1Z');
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-fade-in relative">
      
      {/* Settings Modal (Inline) */}
      {showSettings && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 rounded-3xl flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white shadow-2xl border border-gray-200 rounded-2xl p-8 w-full max-w-md">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Settings size={24} className="text-slate-600" /> API 配置
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">17TRACK Token</label>
                          <div className="relative">
                              <Key className="absolute left-3 top-3 text-gray-400" size={18} />
                              <input 
                                type="password" 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="输入 API Token"
                              />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                              需要去 <a href="https://api.17track.net/" target="_blank" className="text-blue-600 underline">17TRACK</a> 注册开发者账号获取 Token。
                              <br/>若无 Token，请使用“网页嵌入模式”或 UPS 官网跳转。
                          </p>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowSettings(false)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">
                              保存并返回
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* LEFT PANEL: History & Input */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4 shrink-0 h-full">
          
          {/* Search Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Truck className="text-blue-600" size={20} />
                      物流追踪
                  </h3>
                  <button onClick={() => setShowSettings(true)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                      <Settings size={16} />
                  </button>
              </div>
              <form onSubmit={handleSearch} className="relative">
                  <input 
                      type="text" 
                      placeholder="输入运单号 (1Z...)" 
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono text-sm uppercase font-bold text-slate-800"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                  />
                  <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                  <button 
                    type="submit" 
                    disabled={isLoading || !query}
                    className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                      {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                  </button>
              </form>
          </div>

          {/* History List */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                      <History size={12} /> 历史记录 ({history.length})
                  </span>
                  {history.length > 0 && (
                      <button onClick={() => setHistory([])} className="text-[10px] text-red-400 hover:text-red-600 transition-colors">清空</button>
                  )}
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                  {history.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-sm">
                          <Truck size={32} className="mb-2 opacity-20" />
                          <p>暂无查询记录</p>
                      </div>
                  ) : (
                      history.map(record => {
                          const conf = getStatusConfig(record.status);
                          const isActive = activeRecord?.id === record.id;
                          const isUpsRecord = isUPS(record);
                          
                          return (
                              <div 
                                key={record.id}
                                onClick={() => setActiveRecord(record)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all group relative ${isActive ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'}`}
                              >
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="font-mono font-bold text-gray-800 text-sm">{record.trackingNumber}</span>
                                      <span className={`text-[10px] font-bold uppercase ${isUpsRecord ? 'text-[#B07C00] bg-[#FFB500]/20 px-1.5 rounded' : 'text-gray-400'}`}>
                                          {record.carrier}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold border ${conf.color} ${conf.bg} ${conf.border}`}>
                                          {conf.icon}
                                          {conf.label}
                                      </span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 truncate">{record.latestEvent}</p>
                                  
                                  <button 
                                    onClick={(e) => handleDelete(record.id, e)}
                                    className="absolute right-2 bottom-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          );
                      })
                  )}
              </div>
          </div>
      </div>

      {/* RIGHT PANEL: Detail View */}
      <div className="flex-1 bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden flex flex-col relative">
          {activeRecord ? (
              <>
                  {/* Detail Header */}
                  <div className="p-6 bg-slate-900 text-white shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                          <h2 className="text-2xl font-mono font-bold tracking-tight flex items-center gap-3">
                              {activeRecord.trackingNumber}
                              <button onClick={() => executeFetch(activeRecord.trackingNumber)} className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors" title="刷新状态">
                                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                              </button>
                          </h2>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              <span className="bg-white/10 px-2 py-0.5 rounded text-slate-300 uppercase font-bold">{activeRecord.carrier}</span>
                              <span>更新于: {new Date(activeRecord.lastUpdated).toLocaleString()}</span>
                          </div>
                      </div>
                      
                      {/* Mode Toggle */}
                      <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                          <button 
                            onClick={() => setViewMode('native')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'native' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                          >
                              <LayoutTemplate size={14}/> 原生视图
                          </button>
                          <button 
                            onClick={() => setViewMode('web')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'web' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                          >
                              <Globe size={14}/> 网页嵌入
                          </button>
                      </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-hidden relative bg-gray-50">
                      
                      {viewMode === 'native' ? (
                          <div className="h-full overflow-y-auto custom-scrollbar p-8">
                              {activeRecord.history.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                      <div className="bg-white p-6 rounded-full mb-4 shadow-sm">
                                          <AlertCircle size={32} className="text-orange-400" />
                                      </div>
                                      <p className="font-bold text-gray-600">暂无原生轨迹详情</p>
                                      <p className="text-xs mt-2 max-w-xs text-center text-gray-500">
                                          可能原因：未配置 API Token，或 API 未返回数据。
                                          <br/>请切换到“网页嵌入”模式或点击下方官网按钮。
                                      </p>
                                      {!apiKey && (
                                          <button onClick={() => setShowSettings(true)} className="mt-4 text-blue-600 text-xs font-bold underline hover:text-blue-800">
                                              去配置 Token
                                          </button>
                                      )}
                                  </div>
                              ) : (
                                  <div className="max-w-3xl mx-auto space-y-0">
                                      {activeRecord.history.map((event, idx) => {
                                          const isFirst = idx === 0;
                                          const isLast = idx === activeRecord.history.length - 1;
                                          return (
                                              <div key={idx} className="flex gap-6 group">
                                                  {/* Time Column */}
                                                  <div className="w-32 text-right pt-1 shrink-0">
                                                      <div className={`text-sm font-bold ${isFirst ? 'text-gray-900' : 'text-gray-500'}`}>
                                                          {new Date(event.date).toLocaleDateString()}
                                                      </div>
                                                      <div className="text-xs text-gray-400 font-mono">
                                                          {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                      </div>
                                                  </div>

                                                  {/* Timeline Line */}
                                                  <div className="relative flex flex-col items-center">
                                                      <div className={`w-4 h-4 rounded-full border-4 z-10 box-content transition-all ${
                                                          isFirst 
                                                            ? (activeRecord.status === 'Delivered' ? 'bg-white border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]' : 'bg-white border-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.2)]') 
                                                            : 'bg-gray-300 border-white'
                                                      }`}></div>
                                                      {!isLast && <div className="flex-1 w-0.5 bg-gray-200 my-1 group-hover:bg-blue-100 transition-colors"></div>}
                                                  </div>

                                                  {/* Content Card */}
                                                  <div className={`pb-8 flex-1 ${isFirst ? 'opacity-100' : 'opacity-80'}`}>
                                                      <div className={`p-5 rounded-2xl border transition-all ${isFirst ? 'bg-white border-blue-100 shadow-md' : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm'}`}>
                                                          <div className={`font-bold text-sm mb-1 ${isFirst ? 'text-gray-900' : 'text-gray-700'}`}>{event.description}</div>
                                                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                                              <MapPin size={12} /> {event.location}
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      ) : (
                          // Web View (Iframe)
                          <div className="w-full h-full bg-white relative">
                              <iframe 
                                  src={isUPS(activeRecord) 
                                    ? `https://www.ups.com/track?loc=zh_CN&tracknum=${activeRecord.trackingNumber}` 
                                    : `https://t.17track.net/zh-cn#nums=${activeRecord.trackingNumber}`}
                                  className="w-full h-full border-0"
                                  title="Tracking View"
                                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                              />
                              {/* Overlay tip for iframe blocks */}
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs pointer-events-none opacity-80 hover:opacity-100 transition-opacity text-center shadow-lg">
                                  如果是空白页面，请点击下方“官网查询”
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0">
                      <span className="text-xs text-gray-400">
                          Data Source: {viewMode === 'native' ? '17TRACK API' : 'Web Embed'}
                      </span>
                      
                      <div className="flex gap-2">
                          {/* UPS Specific Button */}
                          {isUPS(activeRecord) && (
                              <button 
                                onClick={() => window.open(`https://www.ups.com/track?loc=zh_CN&tracknum=${activeRecord.trackingNumber}`, '_blank')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#FFB500] hover:bg-[#E5A300] text-black rounded-xl text-xs font-bold transition-colors shadow-sm"
                              >
                                  <ExternalLink size={14} /> UPS 中国官网
                              </button>
                          )}

                          <button 
                            onClick={() => window.open(`https://t.17track.net/zh-cn#nums=${activeRecord.trackingNumber}`, '_blank')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                          >
                              <Globe size={14} /> 17Track 通用查询
                          </button>
                      </div>
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                      <Truck size={40} className="text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-600">准备就绪</h3>
                  <p className="text-sm mt-2 max-w-xs text-center">
                      在左侧输入单号，自动识别 UPS / FedEx / USPS 等
                  </p>
                  <div className="mt-8 flex gap-3 opacity-60">
                      <span className="px-3 py-1.5 bg-[#FFB500]/10 text-[#B07C00] rounded-lg text-xs font-bold border border-[#FFB500]/20 shadow-sm">UPS</span>
                      <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100 shadow-sm">FedEx</span>
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 shadow-sm">USPS</span>
                  </div>
              </div>
          )}
      </div>

    </div>
  );
};
