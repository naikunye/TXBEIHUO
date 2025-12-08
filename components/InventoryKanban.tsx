
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

const STAGES: { id: LifecycleStage; label: string; color: string; bg: string; darkBg: string; icon: string }[] = [
    { id: 'New', label: '🌱 新品推广 (New)', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/10 dark:border-blue-800', icon: '✨' },
    { id: 'Growth', label: '🚀 高速增长 (Growth)', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-900/10 dark:border-emerald-800', icon: '🔥' },
    { id: 'Stable', label: '⚖️ 稳定热卖 (Stable)', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-900/10 dark:border-indigo-800', icon: '💎' },
    { id: 'Clearance', label: '📉 尾货清仓 (Clearance)', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50', darkBg: 'dark:bg-red-900/10 dark:border-red-800', icon: '🧹' }
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
                <div key={stage.id} className={`flex-shrink-0 w-80 flex flex-col h-full rounded-2xl border ${stage.bg} ${stage.darkBg} dark:border-opacity-50 border-opacity-60 bg-opacity-60 backdrop-blur-sm`}>
                    {/* Column Header */}
                    <div className={`p-4 rounded-t-2xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10`}>
                        <div className="flex justify-between items-center mb-1">
                            <h3 className={`font-black text-sm ${stage.color} flex items-center gap-2`}>
                                <span>{stage.icon}</span> {stage.label.split('(')[0]}
                            </h3>
                            <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
                                {items.length}
                            </span>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">潜在总利</p>
                            <p className={`text-xs font-bold font-mono ${stage.color}`}>${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>

                    {/* Cards Container */}
                    <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                        {items.map(record => {
                            const m = calculateMetrics(record);
                            const isLowStock = m.daysOfSupply < 15;
                            
                            return (
                                <div key={record.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg dark:hover:shadow-black/40 transition-all group relative animate-fade-in hover:-translate-y-1">
                                    {/* Card Content */}
                                    <div className="flex gap-3 mb-2">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-lg flex-shrink-0 overflow-hidden border border-gray-100 dark:border-slate-600">
                                            {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package className="p-2 text-gray-300 dark:text-gray-500 w-full h-full" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate" title={record.productName}>{record.productName}</h4>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onEdit(record)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"><Edit size={12}/></button>
                                                    <button onClick={() => onDelete(record.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 size={12}/></button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono bg-gray-50 dark:bg-slate-700 inline-block px-1 rounded mt-0.5">{record.sku}</p>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
                                        <div>
                                            <span className="text-gray-400 dark:text-gray-500 block">库存 (DOS)</span>
                                            <span className={`font-bold ${isLowStock ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {record.quantity} <span className="font-normal opacity-70">({m.daysOfSupply.toFixed(0)}d)</span>
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 dark:text-gray-500 block">日销</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-200">{record.dailySales} pcs</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 dark:text-gray-500 block">利润</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">${m.estimatedProfitUSD.toFixed(1)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 dark:text-gray-500 block">ROI</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{m.roi.toFixed(0)}%</span>
                                        </div>
                                    </div>

                                    {/* Warning Badge */}
                                    {isLowStock && (
                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-100 dark:border-red-900">
                                            <AlertTriangle size={10} /> 建议补货
                                        </div>
                                    )}

                                    {/* Lifecycle Controls */}
                                    <div className="absolute bottom-[-12px] left-0 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-20">
                                        <div className="flex bg-white dark:bg-slate-700 shadow-lg border border-gray-200 dark:border-slate-600 rounded-full p-1 gap-1">
                                            <button 
                                                onClick={() => moveCard(record, 'prev')} 
                                                disabled={stage.id === 'New'}
                                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors"
                                                title="降级阶段"
                                            >
                                                <ArrowLeft size={14} />
                                            </button>
                                            <div className="w-px bg-gray-200 dark:bg-slate-600 h-4 self-center"></div>
                                            <button 
                                                onClick={() => moveCard(record, 'next')} 
                                                disabled={stage.id === 'Clearance'}
                                                className="p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 disabled:opacity-30 transition-colors"
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
                            <div className="h-32 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-gray-300 dark:text-slate-600">
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
