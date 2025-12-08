
import React, { useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { calculateMetrics } from '../utils/calculations';
import { TrendingUp, Activity, Package, Zap, LineChart, BarChart2, AlertTriangle } from 'lucide-react';

interface AnalyticsDashboardProps {
  records: ReplenishmentRecord[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ records }) => {
  // Data Preparation
  const chartData = records.map(r => {
    const m = calculateMetrics(r);
    return {
      name: r.productName,
      sku: r.sku,
      profit: m.estimatedProfitUSD,
      revenue: r.salesPriceUSD,
      cost: m.totalCostPerUnitUSD,
      shipping: m.singleHeadHaulCostUSD,
      margin: m.marginRate
    };
  }).sort((a,b) => b.profit - a.profit).slice(0, 8); // Top 8 for chart

  // Aggregates for Logistics
  const logisticsData = records.reduce((acc, curr) => {
    const m = calculateMetrics(curr);
    const method = curr.shippingMethod;
    if (!acc[method]) acc[method] = { weight: 0, cost: 0, count: 0 };
    acc[method].weight += m.totalWeightKg;
    acc[method].cost += m.firstLegCostCNY;
    acc[method].count += 1;
    return acc;
  }, {} as Record<string, { weight: number, cost: number, count: number }>);

  // Aggregates for Lifecycle
  const lifecycleCounts = records.reduce((acc, curr) => {
      const stage = curr.lifecycle || 'New';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);
  const totalRecords = records.length;

  // --- NEW: Predictive Stock Data ---
  const predictiveData = useMemo(() => {
      const daysToProject = 30;
      const criticalSkus = records.filter(r => r.dailySales > 0 && (r.quantity / r.dailySales) < 45).slice(0, 5); 
      
      const chartPoints = Array.from({ length: daysToProject }, (_, day) => {
          const stocks: any = { day };
          criticalSkus.forEach(sku => {
              const remaining = Math.max(0, sku.quantity - (sku.dailySales * day));
              stocks[sku.sku] = remaining;
          });
          return stocks;
      });

      return { points: chartPoints, skus: criticalSkus.map(s => s.sku) };
  }, [records]);

  // Holographic Line Chart
  const renderPredictiveChart = () => {
      if(predictiveData.skus.length === 0) return <div className="text-slate-500 text-sm p-10 text-center font-mono">暂无需要预警的库存数据</div>;

      const height = 240;
      const width = 1000;
      const padding = 40;
      const maxStock = Math.max(...records.map(r => r.quantity), 100);
      
      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                  <filter id="lineGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                  </filter>
                  <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1"/>
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                  </linearGradient>
              </defs>

              {/* Grid Lines */}
              {Array.from({length: 5}).map((_, i) => (
                  <line key={i} x1={padding} y1={padding + (i * (height-2*padding)/4)} x2={width} y2={padding + (i * (height-2*padding)/4)} stroke="url(#gridGrad)" strokeWidth="1" />
              ))}
              
              {/* Threshold Line (Zero) */}
              <line x1={padding} y1={height - padding} x2={width} y2={height - padding} stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
              <text x={width} y={height - padding - 5} fill="#ef4444" fontSize="10" textAnchor="end" className="font-mono">STOCKOUT LEVEL (断货线)</text>

              {predictiveData.skus.map((sku, idx) => {
                  const colors = ['#00f2ea', '#d8b4fe', '#facc15', '#fb7185', '#34d399'];
                  const color = colors[idx % colors.length];
                  
                  const points = predictiveData.points.map((p, i) => {
                      const x = padding + (i / 29) * (width - padding);
                      const y = (height - padding) - ((p[sku] / maxStock) * (height - 2 * padding));
                      return `${x},${y}`;
                  }).join(' ');

                  return (
                      <g key={sku} className="group">
                          <polyline points={points} fill="none" stroke={color} strokeWidth="3" filter="url(#lineGlow)" className="opacity-70 group-hover:opacity-100 transition-opacity" />
                          <circle cx={padding} cy={(height - padding) - ((predictiveData.points[0][sku] / maxStock) * (height - 2 * padding))} r="4" fill={color} className="animate-pulse" />
                          <text x={padding} y={(height - padding) - ((predictiveData.points[0][sku] / maxStock) * (height - 2 * padding)) - 10} fontSize="12" fill={color} fontWeight="bold" className="font-mono shadow-black drop-shadow-md">{sku}</text>
                      </g>
                  );
              })}
          </svg>
      );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* 1. Lifecycle HUD */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]"></div>
         <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 text-glow">
            <Zap className="text-cyan-400 h-5 w-5" />
            产品生命周期矩阵 (Lifecycle Matrix)
          </h3>
          <div className="grid grid-cols-4 gap-4">
              {['New', 'Growth', 'Stable', 'Clearance'].map((stage) => {
                  const count = lifecycleCounts[stage] || 0;
                  const pct = totalRecords > 0 ? (count / totalRecords) * 100 : 0;
                  let colorClass = '';
                  let label = '';
                  let icon = '';
                  switch(stage) {
                      case 'New': colorClass = 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'; label = '新品推广 (New)'; icon='🌱'; break;
                      case 'Growth': colorClass = 'bg-emerald-500 shadow-[0_0_10px_#10b981]'; label = '高速增长 (Growth)'; icon='🚀'; break;
                      case 'Stable': colorClass = 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'; label = '稳定热卖 (Stable)'; icon='⚓'; break;
                      case 'Clearance': colorClass = 'bg-red-500 shadow-[0_0_10px_#ef4444]'; label = '尾货清仓 (Clearance)'; icon='📉'; break;
                  }

                  return (
                      <div key={stage} className="flex flex-col gap-2 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group">
                          <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{label}</span>
                              <span className="text-xs">{icon}</span>
                          </div>
                          <div className="flex items-end gap-2 mt-1">
                              <span className="text-3xl font-black text-white font-mono group-hover:scale-110 transition-transform origin-left">{count}</span>
                              <span className="text-[10px] text-slate-500 mb-1 font-mono">SKUs</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                              <div className={`h-full rounded-full ${colorClass} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                          </div>
                      </div>
                  )
              })}
          </div>
      </div>

      {/* 2. Predictive Chart (Sci-Fi) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 text-glow">
                <LineChart className="text-orange-400 h-5 w-5" />
                库存消耗预测 (Stock Burn-down)
              </h3>
              <div className="flex gap-2">
                  <span className="text-[10px] text-orange-400 border border-orange-400/30 px-2 py-1 rounded bg-orange-900/20 font-mono flex items-center gap-1">
                      <AlertTriangle size={10} /> 库存告急预警
                  </span>
              </div>
          </div>
          
          <div className="h-64 w-full bg-slate-900/50 rounded-xl border border-white/5 relative">
              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-[10%] w-full animate-scan pointer-events-none"></div>
              {renderPredictiveChart()}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 3. Profit Landscape */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 text-glow">
            <TrendingUp className="text-emerald-400 h-5 w-5" />
            净利润分析 (Net Profit Analysis)
          </h3>
          <div className="space-y-5">
            {chartData.map((item, idx) => (
              <div key={idx} className="relative group">
                <div className="flex justify-between text-sm mb-1.5 font-medium">
                  <span className="text-slate-300 w-32 truncate font-mono" title={item.name}>{item.sku}</span>
                  <div className="flex gap-4">
                     <span className="text-slate-500 text-[10px] font-mono self-end">成本: ${item.cost.toFixed(2)}</span>
                     <span className={`font-mono font-bold ${item.profit > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${item.profit.toFixed(2)}
                     </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex shadow-inner">
                   <div 
                      className="bg-slate-600 h-full opacity-50" 
                      style={{ width: `${(item.cost / (item.cost + Math.abs(item.profit))) * 100}%` }}
                   ></div>
                   <div 
                      className={`h-full transition-all duration-500 relative ${item.profit > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} 
                      style={{ width: `${(Math.abs(item.profit) / (item.cost + Math.abs(item.profit))) * 100}%` }}
                   >
                       <div className="absolute top-0 right-0 w-[1px] h-full bg-white opacity-50"></div>
                   </div>
                </div>
                <div className="flex justify-between mt-1">
                   <span className="text-[10px] text-slate-500 font-mono">毛利率: {item.margin.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Logistics Hologram */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden bg-grid-pattern">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 text-glow">
            <Package className="text-blue-400 h-5 w-5" />
            物流货量分析 (Logistics Volume)
          </h3>
          
          <div className="grid grid-cols-2 gap-4 h-full pb-4">
              {/* Air */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-5 flex flex-col justify-between relative group hover:bg-blue-900/30 transition-colors">
                  <div className="absolute top-2 right-2 text-blue-500 opacity-20 group-hover:opacity-50 transition-opacity">
                      <BarChart2 size={48} />
                  </div>
                  <div>
                      <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">空运总量 (Air)</p>
                      <p className="text-3xl font-black text-white mt-2 font-mono text-glow">{(logisticsData['Air']?.weight || 0).toFixed(0)} <span className="text-sm text-slate-500">KG</span></p>
                  </div>
                  <div className="mt-4">
                      <p className="text-[10px] text-slate-400 uppercase">平均成本 (Efficiency)</p>
                      <div className="text-blue-300 font-mono font-bold">¥{((logisticsData['Air']?.cost || 0) / (logisticsData['Air']?.weight || 1)).toFixed(1)} / kg</div>
                  </div>
              </div>

              {/* Sea */}
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-5 flex flex-col justify-between relative group hover:bg-indigo-900/30 transition-colors">
                  <div className="absolute top-2 right-2 text-indigo-500 opacity-20 group-hover:opacity-50 transition-opacity">
                      <BarChart2 size={48} />
                  </div>
                  <div>
                      <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider">海运总量 (Sea)</p>
                      <p className="text-3xl font-black text-white mt-2 font-mono text-glow">{(logisticsData['Sea']?.weight || 0).toFixed(0)} <span className="text-sm text-slate-500">KG</span></p>
                  </div>
                  <div className="mt-4">
                      <p className="text-[10px] text-slate-400 uppercase">平均成本 (Efficiency)</p>
                      <div className="text-indigo-300 font-mono font-bold">¥{((logisticsData['Sea']?.cost || 0) / (logisticsData['Sea']?.weight || 1)).toFixed(1)} / kg</div>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
