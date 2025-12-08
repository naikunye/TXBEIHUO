
import React, { useState, useMemo } from 'react';
import { ReplenishmentRecord, InventoryLog, WarehouseType, TransactionType } from '../types';
import { Package, ArrowRightLeft, History, Warehouse, PlusCircle, MinusCircle, MapPin, Truck, Box, Layers, Globe, Activity } from 'lucide-react';

interface InventoryWMSProps {
  records: ReplenishmentRecord[];
  logs: InventoryLog[];
  onAddLog: (log: InventoryLog) => void;
}

export const InventoryWMS: React.FC<InventoryWMSProps> = ({ records, logs, onAddLog }) => {
  const [selectedSku, setSelectedSku] = useState<string>('All');
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
      sku: '',
      from: 'CN_Local' as WarehouseType,
      to: 'US_West' as WarehouseType,
      qty: 0,
      note: ''
  });

  // --- Derived State: Calculate Real-time Stock per Warehouse ---
  const warehouseStock = useMemo(() => {
      const stockMap: Record<string, Record<WarehouseType, number>> = {};
      
      // Initialize with 0
      records.forEach(r => {
          stockMap[r.sku] = { CN_Local: 0, US_West: 0, US_East: 0, FBA_US: 0, Transit: 0 };
      });

      // Replay logs to calculate current state
      logs.forEach(log => {
          if (!stockMap[log.sku]) stockMap[log.sku] = { CN_Local: 0, US_West: 0, US_East: 0, FBA_US: 0, Transit: 0 };
          stockMap[log.sku][log.warehouse] += log.quantityChange;
      });

      // Special Case: Distribute existing 'ReplenishmentRecord.quantity' if no logs exist yet
      records.forEach(r => {
          const totalLogged = Object.values(stockMap[r.sku]).reduce((a,b) => a+b, 0);
          if (totalLogged === 0 && r.quantity > 0) {
              stockMap[r.sku].US_West = r.quantity; // Default migration
          }
      });

      return stockMap;
  }, [records, logs]);

  const filteredLogs = logs.filter(l => selectedSku === 'All' || l.sku === selectedSku).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Aggregate total stock for map visualization
  const totals = useMemo(() => {
      const t = { CN: 0, US_West: 0, US_East: 0, Transit: 0 };
      (Object.values(warehouseStock) as Record<WarehouseType, number>[]).forEach(stock => {
          t.CN += stock.CN_Local;
          t.US_West += stock.US_West;
          t.US_East += stock.US_East + stock.FBA_US;
          t.Transit += stock.Transit;
      });
      return t;
  }, [warehouseStock]);

  const handleTransfer = (e: React.FormEvent) => {
      e.preventDefault();
      if(!transferForm.sku || transferForm.qty <= 0) return;

      const baseLog = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          sku: transferForm.sku,
          referenceId: `TR-${Date.now().toString().slice(-6)}`,
          note: transferForm.note
      };

      // 1. Deduct from Source
      onAddLog({
          ...baseLog,
          id: `${baseLog.id}-OUT`,
          warehouse: transferForm.from,
          type: 'Transfer',
          quantityChange: -transferForm.qty
      });

      // 2. Add to Destination
      onAddLog({
          ...baseLog,
          id: `${baseLog.id}-IN`,
          warehouse: transferForm.to,
          type: 'Transfer',
          quantityChange: transferForm.qty
      });

      setShowTransferModal(false);
      setTransferForm({ ...transferForm, qty: 0, note: '' });
  };

  // --- World Map Visual (SVG) ---
  const WorldMapInventory = () => {
      return (
          <div className="relative w-full h-[280px] bg-slate-900 rounded-3xl border border-white/5 overflow-hidden group mb-6 shadow-glass">
              {/* Grid Background */}
              <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-purple-900/10"></div>
              
              {/* Map Title */}
              <div className="absolute top-4 left-6 z-10">
                  <h3 className="text-white font-bold flex items-center gap-2 text-glow text-lg">
                      <Globe size={18} className="text-cyan-400 animate-spin-slow" />
                      全球物流态势图 (Global Logistics)
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[10px] text-slate-400 font-mono">LIVE TRACKING SYSTEM ONLINE</span>
                  </div>
              </div>

              {/* Simplified Map SVG */}
              <svg viewBox="0 0 800 300" className="w-full h-full opacity-80">
                  <defs>
                      <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                          <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                      <filter id="glow">
                          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                          <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                      </filter>
                  </defs>

                  {/* Connecting Lines (Curved) */}
                  <path d="M180,140 Q400,60 620,130" fill="none" stroke="url(#pathGradient)" strokeWidth="2" strokeDasharray="5,5" className="animate-dash" />
                  <path d="M180,140 Q400,220 680,150" fill="none" stroke="url(#pathGradient)" strokeWidth="1" strokeDasharray="5,5" opacity="0.5" className="animate-dash-slow" />

                  {/* Nodes */}
                  
                  {/* CN Node */}
                  <g className="group cursor-pointer">
                      <circle cx="180" cy="140" r="6" fill="#3b82f6" className="animate-ping opacity-75" />
                      <circle cx="180" cy="140" r="4" fill="#1d4ed8" />
                      <text x="180" y="170" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">CN Center</text>
                      <rect x="140" y="100" width="80" height="24" rx="4" fill="#1e3a8a" opacity="0.8" />
                      <text x="180" y="116" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" className="font-mono">{totals.CN.toLocaleString()}</text>
                  </g>

                  {/* Transit Node (Middle) */}
                  <g>
                      <rect x="370" y="110" width="60" height="30" rx="4" fill="#0f172a" stroke="#eab308" strokeWidth="1" opacity="0.9" />
                      <text x="400" y="122" textAnchor="middle" fill="#eab308" fontSize="8" fontWeight="bold" className="uppercase">Transit</text>
                      <text x="400" y="135" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" className="font-mono">{totals.Transit.toLocaleString()}</text>
                      <Truck x="392" y="90" size={16} className="text-yellow-500 animate-bounce" />
                  </g>

                  {/* US West Node */}
                  <g className="group cursor-pointer">
                      <circle cx="620" cy="130" r="6" fill="#8b5cf6" className="animate-pulse" />
                      <circle cx="620" cy="130" r="4" fill="#6d28d9" />
                      <text x="620" y="160" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="bold">US West (LA)</text>
                      <rect x="580" y="90" width="80" height="24" rx="4" fill="#4c1d95" opacity="0.8" />
                      <text x="620" y="106" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" className="font-mono">{totals.US_West.toLocaleString()}</text>
                  </g>

                  {/* US East Node */}
                  <g className="group cursor-pointer">
                      <circle cx="680" cy="150" r="6" fill="#ec4899" className="animate-pulse" />
                      <circle cx="680" cy="150" r="4" fill="#be185d" />
                      <text x="720" y="155" textAnchor="start" fill="#fbcfe8" fontSize="10" fontWeight="bold">US East (NY)</text>
                      <rect x="680" y="170" width="80" height="24" rx="4" fill="#831843" opacity="0.8" />
                      <text x="720" y="186" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" className="font-mono">{totals.US_East.toLocaleString()}</text>
                  </g>
              </svg>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* REPLACED: Header Stats Cards with Visual Map */}
        <WorldMapInventory />

        <div className="flex flex-col lg:flex-row gap-6 h-[650px]">
            
            {/* Left: Inventory Matrix */}
            <div className="flex-1 glass-panel rounded-3xl border border-white/10 flex flex-col overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50"></div>
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-white flex items-center gap-2 text-glow">
                        <Activity size={18} className="text-cyan-400"/> 库存矩阵明细 (SKU Matrix)
                    </h3>
                    <button 
                        onClick={() => setShowTransferModal(true)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-glow-cyan flex items-center gap-2"
                    >
                        <ArrowRightLeft size={14} /> 调拨库存
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md text-xs text-slate-400 uppercase font-bold tracking-wider border-b border-white/10">
                            <tr>
                                <th className="p-4 pl-6">SKU / 产品名称</th>
                                <th className="p-4 text-center text-blue-400">国内仓</th>
                                <th className="p-4 text-center text-yellow-400">在途</th>
                                <th className="p-4 text-center text-purple-400">美西</th>
                                <th className="p-4 text-center text-indigo-400">美东</th>
                                <th className="p-4 text-center text-orange-400">FBA</th>
                                <th className="p-4 text-right pr-6 text-white">总计</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                            {records.map(r => {
                                const stock = warehouseStock[r.sku];
                                const total = Object.values(stock).reduce((a: number, b: number) => a+b, 0);
                                const isSelected = selectedSku === r.sku;
                                return (
                                    <tr 
                                        key={r.id} 
                                        onClick={() => setSelectedSku(r.sku)}
                                        className={`hover:bg-white/5 transition-all cursor-pointer group ${isSelected ? 'bg-white/10' : ''}`}
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-white group-hover:text-cyan-400 transition-colors font-mono">{r.sku}</div>
                                            <div className="text-xs text-slate-500 truncate w-32">{r.productName}</div>
                                        </td>
                                        <td className="p-4 text-center font-mono font-bold group-hover:text-white">{stock.CN_Local || '-'}</td>
                                        <td className="p-4 text-center font-mono font-bold group-hover:text-white">{stock.Transit || '-'}</td>
                                        <td className="p-4 text-center font-mono font-bold text-purple-300 group-hover:text-white">{stock.US_West || '-'}</td>
                                        <td className="p-4 text-center font-mono font-bold group-hover:text-white">{stock.US_East || '-'}</td>
                                        <td className="p-4 text-center font-mono font-bold group-hover:text-white">{stock.FBA_US || '-'}</td>
                                        <td className="p-4 text-right pr-6 font-bold text-white font-mono">{total}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right: Transaction Log */}
            <div className="w-full lg:w-96 glass-panel rounded-3xl border border-white/10 flex flex-col overflow-hidden bg-slate-900/50">
                <div className="p-5 border-b border-white/10 bg-white/5">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <History size={18} className="text-orange-400"/> 
                        {selectedSku === 'All' ? '最近流水动态' : `${selectedSku} 变动记录`}
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <Layers size={32} className="mb-2 opacity-20"/>
                            <p className="text-xs">暂无流水记录</p>
                        </div>
                    ) : (
                        filteredLogs.map(log => (
                            <div key={log.id} className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors flex justify-between items-center group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${
                                            log.type === 'Inbound' ? 'bg-green-900/30 text-green-400 border-green-800' :
                                            log.type === 'Outbound' ? 'bg-red-900/30 text-red-400 border-red-800' :
                                            log.type === 'Transfer' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                            'bg-slate-700 text-slate-300 border-slate-600'
                                        }`}>{log.type === 'Inbound' ? '入库' : log.type === 'Outbound' ? '出库' : log.type === 'Transfer' ? '调拨' : log.type}</span>
                                        <span className="font-bold text-xs text-slate-300">{log.warehouse}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 font-mono">{new Date(log.date).toLocaleString()}</div>
                                    {log.sku !== selectedSku && <div className="text-[10px] text-cyan-500 font-mono mt-0.5 font-bold">{log.sku}</div>}
                                </div>
                                <div className={`font-mono font-bold text-lg ${log.quantityChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Transfer Modal Overlay */}
        {showTransferModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-slate-900 rounded-2xl shadow-2xl border border-white/10 w-full max-w-md p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                    <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                        <ArrowRightLeft className="text-cyan-400"/> 内部库存调拨
                    </h3>
                    <form onSubmit={handleTransfer} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">选择产品 SKU</label>
                            <select 
                                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
                                value={transferForm.sku}
                                onChange={e => setTransferForm({...transferForm, sku: e.target.value})}
                                required
                            >
                                <option value="">请选择...</option>
                                {records.map(r => <option key={r.sku} value={r.sku}>{r.sku} - {r.productName}</option>)}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">调出仓库 (From)</label>
                                <select 
                                    className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-red-500 transition-colors"
                                    value={transferForm.from}
                                    onChange={e => setTransferForm({...transferForm, from: e.target.value as WarehouseType})}
                                >
                                    <option value="CN_Local">国内中心仓</option>
                                    <option value="US_West">美西仓</option>
                                    <option value="US_East">美东仓</option>
                                    <option value="Transit">在途</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">调入仓库 (To)</label>
                                <select 
                                    className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-green-500 transition-colors"
                                    value={transferForm.to}
                                    onChange={e => setTransferForm({...transferForm, to: e.target.value as WarehouseType})}
                                >
                                    <option value="US_West">美西仓</option>
                                    <option value="US_East">美东仓</option>
                                    <option value="FBA_US">Amazon FBA</option>
                                    <option value="Transit">在途</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">调拨数量</label>
                            <input 
                                type="number" 
                                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-bold font-mono focus:border-cyan-500 outline-none"
                                value={transferForm.qty}
                                onChange={e => setTransferForm({...transferForm, qty: parseInt(e.target.value) || 0})}
                                required
                                min="1"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">备注</label>
                            <input 
                                type="text" 
                                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500 outline-none"
                                placeholder="如: PO-20231027 补货"
                                value={transferForm.note}
                                onChange={e => setTransferForm({...transferForm, note: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors">取消</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-glow-cyan transition-all">确认调拨</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

    </div>
  );
};
