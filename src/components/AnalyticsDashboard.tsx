
import React, { useMemo, useState } from 'react';
import { ReplenishmentRecord } from '../types';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import { TrendingUp, Activity, Package, Zap, LineChart, BarChart2, AlertTriangle, PieChart, BrainCircuit, DollarSign, Layers } from 'lucide-react';

interface AnalyticsDashboardProps {
  records: ReplenishmentRecord[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ records }) => {
  const [structureMode, setStructureMode] = useState<'count' | 'capital'>('count');

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

  // Aggregates for Lifecycle & Structure
  const structureStats = useMemo(() => {
      const stats = {
          New: { count: 0, capital: 0 },
          Growth: { count: 0, capital: 0 },
          Stable: { count: 0, capital: 0 },
          Clearance: { count: 0, capital: 0 }
      };
      
      records.forEach(r => {
          const stage = r.lifecycle || 'New';
          const m = calculateMetrics(r);
          // Capital = Product Cost + Logistics Cost
          const capital = (r.quantity * r.unitPriceCNY) + m.firstLegCostCNY;
          
          if (stats[stage]) {
              stats[stage].count += 1;
              stats[stage].capital += capital;
          }
      });
      return stats;
  }, [records]);

  const lifecycleCounts = {
      New: structureStats.New.count,
      Growth: structureStats.Growth.count,
      Stable: structureStats.Stable.count,
      Clearance: structureStats.Clearance.count
  };
  const totalRecords = records.length;

  // --- Predictive Stock Data ---
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

  // --- Structure Chart Helper ---
  const renderStructureChart = () => {
      const data = [
          { id: 'New', label: '新品推广', value: structureMode === 'count' ? structureStats.New.count : structureStats.New.capital, color: '#3b82f6', subColor: '#1d4ed8' },
          { id: 'Growth', label: '高速增长', value: structureMode === 'count' ? structureStats.Growth.count : structureStats.Growth.capital, color: '#10b981', subColor: '#047857' },
          { id: 'Stable', label: '稳定热卖', value: structureMode === 'count' ? structureStats.Stable.count : structureStats.Stable.capital, color: '#6366f1', subColor: '#4338ca' },
          { id: 'Clearance', label: '清仓处理', value: structureMode === 'count' ? structureStats.Clearance.count : structureStats.Clearance.capital, color: '#ef4444', subColor: '#b91c1c' },
      ].filter(d => d.value > 0);

      const total = data.reduce((a, b) => a + b.value, 0);
      let cumulativeAngle = 0;

      // Analysis Text
      const maxItem = data.reduce((prev, current) => (prev.value > current.value) ? prev : current, data[0] || {id: 'None', label: '无数据', value: 0, color: ''});
      let analysisText = "";
      if (maxItem.id === 'New') analysisText = "新品占比最高，需密切关注流量转化与推广预算。";
      else if (maxItem.id === 'Growth') analysisText = "增长期产品为主，供应链需备足弹药防止断货。";
      else if (maxItem.id === 'Stable') analysisText = "结构健康，现金流稳定，可考虑拓展新产品线。";
      else if (maxItem.id === 'Clearance') analysisText = "⚠️ 滞销库存占比过高，建议加大促销力度回笼资金。";

      return (
          <div className="flex flex-col md:flex-row items-center gap-8 h-full">
              {/* Donut Chart */}
              <div className="relative w-48 h-48 flex-shrink-0 group">
                  <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90 overflow-visible">
                      {data.map((d, i) => {
                          const startAngle = cumulativeAngle;
                          const sliceAngle = (d.value / total) * Math.PI * 2;
                          cumulativeAngle += sliceAngle;

                          const x1 = Math.cos(startAngle);
                          const y1 = Math.sin(startAngle);
                          const x2 = Math.cos(startAngle + sliceAngle);
                          const y2 = Math.sin(startAngle + sliceAngle);
                          
                          const largeArc = sliceAngle > Math.PI ? 1 : 0;
                          
                          // Donut Hole logic (Inner radius 0.65)
                          const rIn = 0.65;
                          const x1_in = rIn * Math.cos(startAngle + sliceAngle);
                          const y1_in = rIn * Math.sin(startAngle + sliceAngle);
                          const x2_in = rIn * Math.cos(startAngle);
                          const y2_in = rIn * Math.sin(startAngle);

                          const pathData = `
                            M ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} 
                            L ${x1_in} ${y1_in} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x2_in} ${y2_in} Z
                          `;

                          return (
                              <g key={d.id} className="hover:opacity-90 transition-opacity cursor-pointer">
                                <path 
                                    d={pathData} 
                                    fill={d.color} 
                                    stroke="#0f172a" 
                                    strokeWidth="0.02" 
                                    className="chart-pie-slice transition-transform duration-300 hover:scale-105 origin-center"
                                />
                              </g>
                          );
                      })}
                  </svg>
                  {/* Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TOTAL</span>
                      <span className="text-xl font-black text-white font-mono">
                          {structureMode === 'count' ? total : `¥${(total/10000).toFixed(1)}w`}
                      </span>
                  </div>
              </div>

              {/* Legend & Stats */}
              <div className="flex-1 w-full">
                  <div className="mb-4 pb-4 border-b border-white/10">
                      <div className="text-xs text-cyan-400 font-bold mb-1 flex items-center gap-1">
                          <BrainCircuit size={12} /> AI 结构诊断
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                          {data.length > 0 ? analysisText : "暂无数据可分析"}
                      </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      {data.map(d => (
                          <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                              <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shadow-[0_0_5px]" style={{ backgroundColor: d.color, boxShadow: `0 0 5px ${d.color}` }}></div>
                                  <span className="text-xs text-slate-400 font-bold">{d.label}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-white">
                                  {structureMode === 'count' ? d.value : `¥${(d.value/1000).toFixed(1)}k`}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

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

  // --- NEW: Unit Economics Breakdown Chart ---
  const renderUnitEconomics = () => {
      // Focus on active products with sales
      const items = records
          .filter(r => r.lifecycle !== 'Clearance')
          .slice(0, 5); // Top 5

      return (
          <div className="space-y-6">
              {items.map(r => {
                  const m = calculateMetrics(r);
                  // Breakdown Components
                  const c_product = m.productCostUSD;
                  const c_firstLeg = m.singleHeadHaulCostUSD;
                  const c_lastMile = r.lastMileCostUSD;
                  const c_commission = m.platformFeeUSD + m.affiliateCommissionUSD + (r.additionalFixedFeeUSD || 0);
                  const c_ads = r.adCostUSD;
                  
                  const totalCost = c_product + c_firstLeg + c_lastMile + c_commission + c_ads;
                  
                  // Calculate percentages for bar width
                  const total = Math.max(totalCost, 0.01);
                  const p_product = (c_product / total) * 100;
                  const p_firstLeg = (c_firstLeg / total) * 100;
                  const p_lastMile = (c_lastMile / total) * 100;
                  const p_commission = (c_commission / total) * 100;
                  const p_ads = (c_ads / total) * 100;

                  return (
                      <div key={r.id} className="group">
                          <div className="flex justify-between items-end mb-2">
                              <div>
                                  <div className="font-bold text-white text-sm">{r.productName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.sku}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-xs text-slate-400">总成本</div>
                                  <div className="text-sm font-bold font-mono text-slate-200">${totalCost.toFixed(2)}</div>
                              </div>
                          </div>
                          
                          {/* Stacked Bar */}
                          <div className="h-6 w-full rounded-lg overflow-hidden flex bg-slate-800 relative shadow-inner">
                              {/* Product (Blue) */}
                              <div style={{width: `${p_product}%`}} className="h-full bg-blue-500 hover:bg-blue-400 transition-colors flex items-center justify-center group/seg relative cursor-pointer">
                                  {p_product > 10 && <span className="text-[9px] text-white font-bold">货</span>}
                                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/seg:opacity-100 whitespace-nowrap pointer-events-none z-10 border border-white/10 shadow-lg">
                                      货值: ${c_product.toFixed(2)} ({p_product.toFixed(0)}%)
                                  </div>
                              </div>
                              {/* First Leg (Orange) */}
                              <div style={{width: `${p_firstLeg}%`}} className="h-full bg-orange-500 hover:bg-orange-400 transition-colors flex items-center justify-center group/seg relative cursor-pointer">
                                  {p_firstLeg > 8 && <span className="text-[9px] text-white font-bold">头</span>}
                                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/seg:opacity-100 whitespace-nowrap pointer-events-none z-10 border border-white/10 shadow-lg">
                                      头程: ${c_firstLeg.toFixed(2)} ({p_firstLeg.toFixed(0)}%)
                                  </div>
                              </div>
                              {/* Last Mile (Purple) */}
                              <div style={{width: `${p_lastMile}%`}} className="h-full bg-purple-500 hover:bg-purple-400 transition-colors flex items-center justify-center group/seg relative cursor-pointer">
                                  {p_lastMile > 8 && <span className="text-[9px] text-white font-bold">尾</span>}
                                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/seg:opacity-100 whitespace-nowrap pointer-events-none z-10 border border-white/10 shadow-lg">
                                      尾程: ${c_lastMile.toFixed(2)} ({p_lastMile.toFixed(0)}%)
                                  </div>
                              </div>
                              {/* Commission (Pink) */}
                              <div style={{width: `${p_commission}%`}} className="h-full bg-pink-500 hover:bg-pink-400 transition-colors flex items-center justify-center group/seg relative cursor-pointer">
                                  {p_commission > 8 && <span className="text-[9px] text-white font-bold">佣</span>}
                                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/seg:opacity-100 whitespace-nowrap pointer-events-none z-10 border border-white/10 shadow-lg">
                                      佣金: ${c_commission.toFixed(2)} ({p_commission.toFixed(0)}%)
                                  </div>
                              </div>
                              {/* Ads (Grey) */}
                              <div style={{width: `${p_ads}%`}} className="h-full bg-slate-500 hover:bg-slate-400 transition-colors flex items-center justify-center group/seg relative cursor-pointer">
                                  {p_ads > 8 && <span className="text-[9px] text-white font-bold">广</span>}
                                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/seg:opacity-100 whitespace-nowrap pointer-events-none z-10 border border-white/10 shadow-lg">
                                      广告: ${c_ads.toFixed(2)} ({p_ads.toFixed(0)}%)
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 justify-center mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> 货值 (Product)
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> 头程 (Freight)
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> 尾程 (Delivery)
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div> 平台/达人佣金
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-500"></div> 广告 (Ads)
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ... (Lifecycle & Structure Charts remain the same) ... */}
          {/* 1. Lifecycle HUD (Left) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]"></div>
             <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 text-glow">
                <Zap className="text-cyan-400 h-5 w-5" />
                产品生命周期矩阵 (Lifecycle Matrix)
              </h3>
              <div className="grid grid-cols-4 gap-4">
                  {['New', 'Growth', 'Stable', 'Clearance'].map((stage) => {
                      const count = lifecycleCounts[stage as keyof typeof lifecycleCounts] || 0;
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
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest truncate">{label.split('(')[0]}</span>
                                  <span className="text-xs">{icon}</span>
                              </div>
                              <div className="flex items-end gap-2 mt-1">
                                  <span className="text-2xl lg:text-3xl font-black text-white font-mono group-hover:scale-110 transition-transform origin-left">{count}</span>
                                  <span className="text-[10px] text-slate-500 mb-1 font-mono hidden xl:inline">SKUs</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                                  <div className={`h-full rounded-full ${colorClass} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                              </div>
                          </div>
                      )
                  })}
              </div>
          </div>

          {/* 2. Inventory Structure Hologram (Right) */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden bg-slate-900/50">
              <div className="flex justify-between items-start mb-4 relative z-10">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 text-glow">
                    <PieChart className="text-pink-400 h-5 w-5" />
                    库存结构透视
                  </h3>
                  
                  {/* Mode Toggle */}
                  <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                      <button 
                        onClick={() => setStructureMode('count')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${structureMode === 'count' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                      >
                          数量
                      </button>
                      <button 
                        onClick={() => setStructureMode('capital')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${structureMode === 'capital' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                      >
                          资金
                      </button>
                  </div>
              </div>
              
              <div className="h-48 relative z-10">
                  {renderStructureChart()}
              </div>
          </div>
      </div>

      {/* 3. Predictive Chart (Sci-Fi) */}
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
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-[10%] w-full animate-scan pointer-events-none"></div>
              {renderPredictiveChart()}
          </div>
      </div>

      {/* 4. NEW: Cost Structure Breakdown (Restored & Fixed Dark Mode) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 text-glow">
                  <DollarSign className="text-blue-400 h-5 w-5" />
                  $ TikTok 成本结构拆解 (Unit Economics)
              </h3>
              <div className="text-xs text-slate-400 border border-white/10 px-2 py-1 rounded bg-white/5">
                  Top Products
              </div>
          </div>
          {renderUnitEconomics()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 5. Profit Landscape */}
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

        {/* 6. Logistics Hologram */}
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
