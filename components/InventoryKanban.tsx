
import React, { useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import { ArrowLeft, ArrowRight, Package, AlertTriangle, TrendingUp, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

interface InventoryKanbanProps {
  records: ReplenishmentRecord[];
  onUpdateRecord: (record: ReplenishmentRecord) => void;
  onEdit: (record: ReplenishmentRecord) => void;
  onDelete: (id: string) => void;
}

type LifecycleStage = 'New' | 'Growth' | 'Stable' | 'Clearance';

const STAGES: { id: LifecycleStage; label: string; color: string; bg: string; icon: string }[] = [
    { id: 'New', label: '🌱 新品推广 (New)', color: 'text-blue-700', bg: 'bg-blue-50', icon: '✨' },
    { id: 'Growth', label: '🚀 高速增长 (Growth)', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: '🔥' },
    { id: 'Stable', label: '⚖️ 稳定热卖 (Stable)', color: 'text-indigo-700', bg: 'bg-indigo-50', icon: '💎' },
    { id: 'Clearance', label: '📉 尾货清仓 (Clearance)', color: 'text-red-700', bg: 'bg-red-50', icon: '🧹' }
];

export const InventoryKanban: React.FC<InventoryKanbanProps> = ({ records, onUpdateRecord, onEdit, onDelete }) => {
  
  // Group records by lifecycle
  const columns = useMemo(() => {
      const grouped: Record<LifecycleStage, ReplenishmentRecord[]> = { New: [], Growth: [], Stable: [], Clearance: [] };
      records.forEach(r => {
          const stage = r.lifecycle || 'New';
          if (grouped[stage]) grouped[stage].push(r);
          else grouped['New'].push(r); // Fallback
      });
      return grouped;
  }, [records]);

  const moveCard = (record: ReplenishmentRecord, direction: 'next' | 'prev') => {
      const flow: LifecycleStage[] = ['New', 'Growth', 'Stable', 'Clearance'];
      const currentIndex = flow.indexOf(record.lifecycle || 'New');
      let newIndex = currentIndex;

      if (direction === 'next' && currentIndex < flow.length - 1) newIndex++;
      if (direction === 'prev' && currentIndex > 0) newIndex--;

      if (newIndex !== currentIndex) {
          onUpdateRecord({ ...record, lifecycle: flow[newIndex] });
      }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] overflow-x-auto pb-4 items-start">
        {STAGES.map(stage => {
            const items = columns[stage.id];
            const totalProfit = items.reduce((acc, r) => acc + calculateMetrics(r).estimatedProfitUSD * r.quantity, 0);

            return (
                <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col h-full rounded-2xl bg-gray-100/50 border border-gray-200">
                    {/* Column Header */}
                    <div className={`p-4 rounded-t-2xl border-b border-gray-200 ${stage.bg} bg-opacity-60 backdrop-blur-sm sticky top-0 z-10`}>
                        <div className="flex justify-between items-center mb-1">
                            <h3 className={`font-black text-sm ${stage.color} flex items-center gap-2`}>
                                <span>{stage.icon}</span> {stage.label.split('(')[0]}
                            </h3>
                            <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                                {items.length}
                            </span>
                        </div>
                        <div className="flex justify-between items-end">
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">潜在总利</p>
                            <p className={`text-xs font-bold font-mono ${stage.color}`}>${totalProfit.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Cards Container */}
                    <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                        {items.map(record => {
                            const m = calculateMetrics(record);
                            const isLowStock = m.daysOfSupply < 15;
                            
                            return (
                                <div key={record.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all group relative animate-fade-in">
                                    {/* Card Content */}
                                    <div className="flex gap-3 mb-2">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-100">
                                            {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package className="p-2 text-gray-300 w-full h-full" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-800 text-sm truncate" title={record.productName}>{record.productName}</h4>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onEdit(record)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><Edit size={12}/></button>
                                                    <button onClick={() => onDelete(record.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600"><Trash2 size={12}/></button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-mono bg-gray-50 inline-block px-1 rounded mt-0.5">{record.sku}</p>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                                        <div>
                                            <span className="text-gray-400 block">库存 (DOS)</span>
                                            <span className={`font-bold ${isLowStock ? 'text-red-500' : 'text-gray-700'}`}>
                                                {record.quantity} <span className="font-normal opacity-70">({m.daysOfSupply.toFixed(0)}d)</span>
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block">日销</span>
                                            <span className="font-bold text-gray-700">{record.dailySales} pcs</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block">利润</span>
                                            <span className="font-bold text-emerald-600">${m.estimatedProfitUSD.toFixed(1)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block">ROI</span>
                                            <span className="font-bold text-blue-600">{m.roi.toFixed(0)}%</span>
                                        </div>
                                    </div>

                                    {/* Warning Badge */}
                                    {isLowStock && (
                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                            <AlertTriangle size={10} /> 建议补货
                                        </div>
                                    )}

                                    {/* Lifecycle Controls */}
                                    <div className="absolute bottom-[-12px] left-0 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-20">
                                        <div className="flex bg-white shadow-lg border border-gray-200 rounded-full p-1 gap-1">
                                            <button 
                                                onClick={() => moveCard(record, 'prev')} 
                                                disabled={stage.id === 'New'}
                                                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors"
                                                title="降级阶段"
                                            >
                                                <ArrowLeft size={14} />
                                            </button>
                                            <div className="w-px bg-gray-200 h-4 self-center"></div>
                                            <button 
                                                onClick={() => moveCard(record, 'next')}
                                                disabled={stage.id === 'Clearance'}
                                                className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 disabled:opacity-30 transition-colors"
                                                title="晋升阶段"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {items.length === 0 && (
                            <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-300">
                                <span className="text-2xl opacity-20 mb-2">{stage.icon}</span>
                                <span className="text-xs">暂无产品</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
  );
};
