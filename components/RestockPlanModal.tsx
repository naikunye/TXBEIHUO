
import React, { useState, useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import { X, CalendarClock, Download, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

interface RestockPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
}

export const RestockPlanModal: React.FC<RestockPlanModalProps> = ({ isOpen, onClose, records }) => {
  const [targetStockDays, setTargetStockDays] = useState(90); // Goal: Have 90 days of stock

  // Calculation Logic
  const plan = useMemo(() => {
    return records
        .filter(r => !r.isDeleted)
        .map(r => {
            const m = calculateMetrics(r);
            const leadTime = r.leadTimeDays || 30; // Production + Ship
            const safetyStock = r.safetyStockDays || 15;
            
            // Critical Formula:
            // Reorder Point (Days) = Lead Time + Safety Stock
            const reorderThresholdDays = leadTime + safetyStock;
            
            // Current Status
            const currentDays = m.daysOfSupply;
            
            // Logic: Do we need to order?
            // Yes if Current Days < Reorder Threshold
            const isUrgent = currentDays < reorderThresholdDays;
            
            // How much to order?
            // Order enough to reach Target Stock Days (e.g. 90 days)
            // But we must cover the deficit first.
            // Simplified: Target Level = TargetStockDays * DailySales
            // Order Qty = Target Level - Current Stock (If current stock is low)
            // More Robust: Order Qty = (TargetStockDays + LeadTime) * DailySales - CurrentStock - OnTheWay(Status=Shipped)
            // For MVP, lets assume 'records' is current stock.
            
            let suggestedQty = 0;
            if (isUrgent && r.dailySales > 0) {
                const targetQty = (targetStockDays * r.dailySales);
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
                estimatedCostCNY
            };
        })
        .filter(item => item.suggestedQty > 0) // Only show items needing action
        .sort((a, b) => b.isUrgent === a.isUrgent ? 0 : b.isUrgent ? 1 : -1); // Urgent first
  }, [records, targetStockDays]);

  const totalCost = plan.reduce((acc, curr) => acc + curr.estimatedCostCNY, 0);
  const totalSku = plan.length;

  if (!isOpen) return null;

  const handleExportLingxing = () => {
      // CSV Format compatible with generic ERP import
      // Usually: SKU, Quantity, UnitPrice
      const headers = ['SKU', 'Product Name', 'Suggested Quantity', 'Unit Price (CNY)', 'Total Amount (CNY)', 'Remark'];
      const rows = plan.map(item => [
          item.sku,
          item.productName,
          item.suggestedQty,
          item.unitPriceCNY,
          item.estimatedCostCNY.toFixed(2),
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative">
        
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
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                
                {/* Inputs */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">目标备货天数</label>
                        <input 
                            type="number" 
                            value={targetStockDays} 
                            onChange={(e) => setTargetStockDays(parseInt(e.target.value) || 90)}
                            className="font-bold text-gray-900 bg-transparent w-24 outline-none border-b-2 border-gray-200 focus:border-emerald-500 text-2xl py-1 transition-colors"
                        />
                    </div>
                    <div className="h-10 w-px bg-gray-100 mx-2"></div>
                    <div className="text-xs text-gray-500 max-w-[200px] leading-relaxed">
                        系统将计算需补货至满足未来 <strong className="text-emerald-600">{targetStockDays}</strong> 天销售的数量。
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-8">
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium mb-1">建议补货 SKU</p>
                        <p className="text-3xl font-bold text-gray-800">{totalSku}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium mb-1">预计采购金额</p>
                        <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalCost, 'CNY')}</p>
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
                        <th className="p-4 border-b border-gray-100">补货阈值 (Lead Time)</th>
                        <th className="p-4 border-b border-gray-100 bg-emerald-50 text-emerald-700">建议采购量</th>
                        <th className="p-4 border-b border-gray-100 bg-emerald-50 text-emerald-700">预估金额 (CNY)</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {plan.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-12 text-center text-gray-400">
                                <div className="flex flex-col items-center justify-center">
                                    <CheckCircle2 size={48} className="mb-3 text-emerald-200" />
                                    <p className="font-medium text-gray-600">库存非常健康</p>
                                    <p className="text-xs mt-1">当前目标下暂无需要补货的产品。</p>
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
                                    <div className="text-gray-700 font-medium">
                                        {item.reorderThresholdDays} 天
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        (备货 {item.leadTime} + 安全 {item.safetyStockDays})
                                    </div>
                                    {item.isUrgent && (
                                        <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold mt-1 bg-red-50 px-1.5 py-0.5 rounded w-fit">
                                            <AlertTriangle size={10} /> 急需补货
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 bg-emerald-50/30 border-l border-emerald-100/50">
                                    <div className="text-xl font-bold text-emerald-700 font-mono">
                                        {item.suggestedQty}
                                    </div>
                                    <div className="text-[10px] text-emerald-600/70 mt-0.5">
                                        目标: {targetStockDays}天库存
                                    </div>
                                </td>
                                <td className="p-4 bg-emerald-50/30">
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
                导出领星导入单 (CSV)
            </button>
        </div>

      </div>
    </div>
  );
};
