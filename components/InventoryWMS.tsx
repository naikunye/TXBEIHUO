
import React, { useState, useMemo } from 'react';
import { ReplenishmentRecord, InventoryLog, WarehouseType, TransactionType } from '../types';
import { Package, ArrowRightLeft, History, Warehouse, PlusCircle, MinusCircle, MapPin, Truck, Box } from 'lucide-react';

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
      // This ensures backward compatibility. We assume existing stock is in US_West by default if no logs.
      records.forEach(r => {
          const totalLogged = Object.values(stockMap[r.sku]).reduce((a,b) => a+b, 0);
          if (totalLogged === 0 && r.quantity > 0) {
              stockMap[r.sku].US_West = r.quantity; // Default migration
          }
      });

      return stockMap;
  }, [records, logs]);

  const filteredLogs = logs.filter(l => selectedSku === 'All' || l.sku === selectedSku).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  const WarehouseCard = ({ type, name, icon: Icon, color }: { type: WarehouseType, name: string, icon: any, color: string }) => {
      const totalItems = (Object.values(warehouseStock) as Record<WarehouseType, number>[]).reduce((acc, curr) => acc + (curr[type] || 0), 0);
      
      return (
          <div className={`p-4 rounded-xl border ${color} bg-opacity-10 flex flex-col justify-between h-32 relative overflow-hidden group`}>
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                  <Icon size={80} />
              </div>
              <div className="flex items-center gap-2 z-10">
                  <div className={`p-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm`}>
                      <Icon size={18} className="text-gray-700"/>
                  </div>
                  <span className="font-bold text-gray-700 text-sm">{name}</span>
              </div>
              <div className="z-10">
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">库存总数</p>
                  <p className="text-2xl font-bold text-gray-800">{totalItems.toLocaleString()}</p>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <WarehouseCard type="CN_Local" name="国内中心仓" icon={Warehouse} color="bg-blue-50 border-blue-100" />
            <WarehouseCard type="Transit" name="在途库存" icon={Truck} color="bg-yellow-50 border-yellow-100" />
            <WarehouseCard type="US_West" name="美西仓 (LA)" icon={MapPin} color="bg-purple-50 border-purple-100" />
            <WarehouseCard type="US_East" name="美东仓 (NY)" icon={MapPin} color="bg-indigo-50 border-indigo-100" />
            <WarehouseCard type="FBA_US" name="Amazon FBA" icon={Box} color="bg-orange-50 border-orange-100" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
            
            {/* Left: Inventory Matrix */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Package size={18} className="text-blue-600"/> 库存分布矩阵
                    </h3>
                    <button 
                        onClick={() => setShowTransferModal(true)}
                        className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2"
                    >
                        <ArrowRightLeft size={12} /> 库存调拨
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs text-gray-500 uppercase font-semibold">
                            <tr>
                                <th className="p-4 border-b">SKU / 产品</th>
                                <th className="p-4 border-b text-center bg-blue-50/30">国内仓</th>
                                <th className="p-4 border-b text-center bg-yellow-50/30">在途</th>
                                <th className="p-4 border-b text-center bg-purple-50/30">美西</th>
                                <th className="p-4 border-b text-center bg-indigo-50/30">美东</th>
                                <th className="p-4 border-b text-center bg-orange-50/30">FBA</th>
                                <th className="p-4 border-b text-right">总计</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {records.map(r => {
                                const stock = warehouseStock[r.sku];
                                const total = Object.values(stock).reduce((a,b) => a+b, 0);
                                return (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => setSelectedSku(r.sku)}>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{r.sku}</div>
                                            <div className="text-xs text-gray-400 truncate w-32">{r.productName}</div>
                                        </td>
                                        <td className="p-4 text-center font-mono text-gray-600 bg-blue-50/10 group-hover:bg-blue-50/30">{stock.CN_Local}</td>
                                        <td className="p-4 text-center font-mono text-gray-600 bg-yellow-50/10 group-hover:bg-yellow-50/30">{stock.Transit}</td>
                                        <td className="p-4 text-center font-mono font-bold text-gray-800 bg-purple-50/10 group-hover:bg-purple-50/30">{stock.US_West}</td>
                                        <td className="p-4 text-center font-mono text-gray-600 bg-indigo-50/10 group-hover:bg-indigo-50/30">{stock.US_East}</td>
                                        <td className="p-4 text-center font-mono text-gray-600 bg-orange-50/10 group-hover:bg-orange-50/30">{stock.FBA_US}</td>
                                        <td className="p-4 text-right font-bold">{total}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right: Transaction Log */}
            <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <History size={18} className="text-orange-500"/> 
                        {selectedSku === 'All' ? '最近流水' : `${selectedSku} 流水`}
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10 text-xs">暂无流水记录</div>
                    ) : (
                        filteredLogs.map(log => (
                            <div key={log.id} className="p-3 rounded-xl border border-gray-100 bg-white shadow-sm flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-1.5 rounded border ${
                                            log.type === 'Inbound' ? 'bg-green-50 text-green-600 border-green-100' :
                                            log.type === 'Outbound' ? 'bg-red-50 text-red-600 border-red-100' :
                                            log.type === 'Transfer' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            'bg-gray-50 text-gray-600'
                                        }`}>{log.type}</span>
                                        <span className="font-bold text-xs text-gray-700">{log.warehouse}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">{new Date(log.date).toLocaleString()}</div>
                                    {log.sku !== selectedSku && <div className="text-[10px] text-gray-500 font-mono mt-0.5">{log.sku}</div>}
                                </div>
                                <div className={`font-mono font-bold ${log.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                    <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="text-blue-600"/> 内部调拨单
                    </h3>
                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">选择产品 SKU</label>
                            <select 
                                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm"
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
                                <label className="block text-xs font-bold text-gray-500 mb-1">调出仓库 (From)</label>
                                <select 
                                    className="w-full p-2.5 rounded-lg border border-gray-300 text-sm"
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
                                <label className="block text-xs font-bold text-gray-500 mb-1">调入仓库 (To)</label>
                                <select 
                                    className="w-full p-2.5 rounded-lg border border-gray-300 text-sm"
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
                            <label className="block text-xs font-bold text-gray-500 mb-1">调拨数量</label>
                            <input 
                                type="number" 
                                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm font-bold"
                                value={transferForm.qty}
                                onChange={e => setTransferForm({...transferForm, qty: parseInt(e.target.value) || 0})}
                                required
                                min="1"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">备注</label>
                            <input 
                                type="text" 
                                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm"
                                placeholder="如: PO-20231027 补货"
                                value={transferForm.note}
                                onChange={e => setTransferForm({...transferForm, note: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-bold hover:bg-gray-50">取消</button>
                            <button type="submit" className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md">确认调拨</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

    </div>
  );
};
