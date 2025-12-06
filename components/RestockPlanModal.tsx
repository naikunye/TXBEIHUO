import React, { useState, useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import { X, CalendarClock, Download, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, BrainCircuit } from 'lucide-react';

interface RestockPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
}

export const RestockPlanModal: React.FC<RestockPlanModalProps> = ({ isOpen, onClose, records }) => {
  const [baseTargetDays, setBaseTargetDays] = useState(90); // Default Goal
  const [useSmartLifecycle, setUseSmartLifecycle] = useState(true); // AI Toggle

  // Lifecycle Strategy Configuration
  const getLifecycleParams = (lifecycle: string) => {
      switch (lifecycle) {
          case 'New': return { target: 45, safety: 15, label: '新品测试 (保守)', color: 'text-blue-600 bg-blue-50' };
          case 'Growth': return { target: 90, safety: 30, label: '爆品增长 (激进)', color: 'text-emerald-600 bg-emerald-50' };
          case 'Stable': return { target: 60, safety: 20, label: '稳定热卖 (标准)', color: 'text-indigo-600 bg-indigo-50' };
          case 'Clearance': return { target: 0, safety: 0, label: '清仓 (停止补货)', color: 'text-red-600 bg-red-50' };
          default: return { target: baseTargetDays, safety: 15, label: '默认策略', color: 'text-gray-600 bg-gray-50' };
      }
  };

  // Calculation Logic
  const plan = useMemo(() => {
    return records
        .filter(r => !r.isDeleted)
        .map(r => {
            const m = calculateMetrics(r);
            const leadTime = r.leadTimeDays || 30; // Production + Ship
            
            // Determine Strategy Parameters
            let targetDays = baseTargetDays;
            let safetyStock = r.safetyStockDays || 15;
            let strategyLabel = '全局设定';
            let strategyColor = 'text-gray-500';

            if (useSmartLifecycle) {
                const params = getLifecycleParams(r.lifecycle || 'New');
                targetDays = params.target;
                safetyStock = params.safety;
                strategyLabel = params.label;
                strategyColor = params.color;
            }
            
            // Critical Formula:
            // Reorder Point (Days) = Lead Time + Safety Stock
            const reorderThresholdDays = leadTime + safetyStock;
            
            // Current Status
            const currentDays = m.daysOfSupply;
            
            // Logic: Do we need to order?
            // Yes if Current Days < Reorder Threshold AND targetDays > 0
            const isUrgent = currentDays < reorderThresholdDays && targetDays > 0;
            
            let suggestedQty = 0;
            if (isUrgent && r.dailySales > 0) {
                // Formula: Need to cover (TargetDays + LeadTime) worth of sales minus what we have
                // Simplified: Target Level = TargetStockDays * DailySales
                const targetQty = (targetDays * r.dailySales);
                suggestedQty = Math.max(0, targetQty - r.quantity);
            }

            // Estimate Capital Needed (CNY)
            const estimatedCostCNY = suggestedQty * r.unitPriceCNY;

            return {
                ...r,
                metrics: m,
                leadTime,
                reorderThresholdDays,
                isUrgent,
                suggestedQty: Math.ceil(suggestedQty),
                estimatedCostCNY,
                strategyLabel,
                strategyColor,
                appliedTargetDays: targetDays
            };
        })
        .filter(item => item.suggestedQty > 0 || (item.isUrgent && item.appliedTargetDays > 0)) // Show items needing action
        .sort((a, b) => b.isUrgent === a.isUrgent ? 0 : b.isUrgent ? 1 : -1); // Urgent first
  }, [records, baseTargetDays, useSmartLifecycle]);

  const totalCost = plan.reduce((acc, curr) => acc + curr.estimatedCostCNY, 0);
  const totalSku = plan.length;

  if (!isOpen) return null;

  const handleExportLingxing = () => {
      const headers = ['SKU', 'Product Name', 'Suggested Quantity', 'Unit Price (CNY)', 'Total Amount (CNY)', 'Strategy', 'Remark'];
      const rows = plan.map(item => [
          item.sku,
          item.productName,
          item.suggestedQty,
          item.unitPriceCNY,
          item.estimatedCostCNY.toFixed(2),
          item.strategyLabel,
          `LeadTime:${item.leadTime}d, DOS:${item.metrics.daysOfSupply.toFixed(0)}d`
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const link = document.createElement("a");
      link.href = encodeURI(csvContent);
      link.download = `lingxing_restock_plan_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <CalendarClock size={24} className="text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">智能补货规划中心</h2>
                    <p className="text-slate-400 text-xs">基于日销与供应链时效的精准采购建议</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
            </button>
        </div>

        {/* Controls & Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 shrink-0">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                
                {/* Strategy Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    
                    {/* Smart Toggle */}
                    <div 
                        onClick={() => setUseSmartLifecycle(!useSmartLifecycle)}
                        className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${useSmartLifecycle ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                    >
                        <div className={`p-2 rounded-lg ${useSmartLifecycle ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                            <BrainCircuit size={20} />
                        </div>
                        <div>
                            <div className={`font-bold text-sm ${useSmartLifecycle ? 'text-purple-800' : 'text-gray-600'}`}>
                                AI 生命周期策略
                            </div>
                            <div className="text-[10px] text-gray-500">
                                {useSmartLifecycle ? '已启用: 根据新品/爆品自动调整备货天数' : '已禁用: 使用全局统一备货天数'}
                            </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ml-2 ${useSmartLifecycle ? 'bg-purple-500' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${useSmartLifecycle ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </div>

                    {/* Manual Override (Only visible if Smart Mode is OFF) */}
                    {!useSmartLifecycle && (
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm animate-fade-in">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">全局目标天数</label>
                                <input 
                                    type="number" 
                                    value={baseTargetDays} 
                                    onChange={(e) => setBaseTargetDays(parseInt(e.target.value) || 90)}
                                    className="font-bold text-gray-900 bg-transparent w-16 outline-none border-b-2 border-gray-200 focus:border-emerald-500 text-xl py-0.5 transition-colors"
                                />
                            </div>
                            <div className="text-xs text-gray-400">Days</div>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="flex gap-8 bg-white px-6 py-3 rounded-xl border border-gray-100 shadow-sm ml-auto">
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium mb-1">建议补货 SKU</p>
                        <p className="text-2xl font-bold text-gray-800">{totalSku}</p>
                    </div>
                    <div className="w-px h-10 bg-gray-100"></div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium mb-1">预计采购金额</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCost, 'CNY')}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10 shadow-sm text-xs text-gray-500 font-semibold uppercase">
                    <tr>
                        <th className="p-4 border-b border-gray-100 pl-6">产品 / SKU</th>
                        <th className="p-4 border-b border-gray-100">当前库存 (DOS)</th>
                        <th className="p-4 border-b border-gray-100">补货策略 (Strategy)</th>
                        <th className="p-4 border-b border-gray-100 text-right">补货阈值 (Reorder Point)</th>
                        <th className="p-4 border-b border-gray-100 bg-emerald-50 text-emerald-700 text-right">建议采购量</th>
                        <th className="p-4 border-b border-gray-100 bg-emerald-50 text-emerald-700 text-right pr-6">预估金额 (CNY)</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {plan.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-16 text-center text-gray-400">
                                <div className="flex flex-col items-center justify-center">
                                    <CheckCircle2 size={64} className="mb-4 text-emerald-200" />
                                    <p className="font-bold text-gray-700 text-lg">库存非常健康</p>
                                    <p className="text-sm mt-2 text-gray-500">当前策略下暂无需要补货的产品。</p>
                                    {records.length === 0 && <p className="text-xs mt-1 text-orange-400">(未选择任何产品)</p>}
                                </div>
                            </td>
                        </tr>
                    ) : (
                        plan.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                                <td className="p-4 pl-6">
                                    <div className="font-bold text-gray-800">{item.productName}</div>
                                    <div className="text-xs text-gray-400 font-mono mt-0.5">{item.sku}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-gray-700 font-medium">{item.quantity}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.metrics.daysOfSupply < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {item.metrics.daysOfSupply.toFixed(0)} 天
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">日销: {item.dailySales}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.strategyColor} inline-flex items-center gap-1`}>
                                        {useSmartLifecycle && <BrainCircuit size={10} />}
                                        {item.strategyLabel}
                                    </span>
                                    <div className="text-[10px] text-gray-400 mt-1 pl-1">
                                        目标: {item.appliedTargetDays}天
                                    </div>
                                </td>
                                <td className="p-4 text-right font-mono text-gray-600">
                                    <div className="font-bold">{item.reorderThresholdDays} Days</div>
                                    {item.isUrgent && (
                                        <div className="flex items-center justify-end gap-1 text-[10px] text-red-500 font-bold mt-1">
                                            <AlertTriangle size={10} /> 触发补货
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 bg-emerald-50/30 border-l border-emerald-100/50 text-right">
                                    <div className="text-xl font-bold text-emerald-700 font-mono">
                                        {item.suggestedQty}
                                    </div>
                                </td>
                                <td className="p-4 bg-emerald-50/30 text-right pr-6">
                                    <div className="font-bold text-gray-800">
                                        {formatCurrency(item.estimatedCostCNY, 'CNY')}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        单价: ¥{item.unitPriceCNY}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
            >
                取消
            </button>
            <button 
                onClick={handleExportLingxing}
                disabled={plan.length === 0}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
                <Download size={18} />
                导出采购建议单 (CSV)
            </button>
        </div>

      </div>
    </div>
  );
};