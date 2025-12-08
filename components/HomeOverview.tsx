
import React, { useMemo, useState } from 'react';
import { ReplenishmentRecord, Store } from '../types';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import { 
  TrendingUp, 
  Wallet, 
  Ship, 
  Plane, 
  Package, 
  AlertCircle, 
  ArrowRight, 
  Activity,
  Layers,
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  ChevronDown,
  Store as StoreIcon,
  HelpCircle,
  Sparkles,
  Loader2,
  Box,
  BrainCircuit,
  ArrowUpRight,
  Cpu,
  Target
} from 'lucide-react';
import { generateDailyBriefing } from '../services/geminiService';

interface HomeOverviewProps {
  records: ReplenishmentRecord[];
  stores: Store[];
  onNavigateToList: () => void;
  currentStoreId: string;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({ records, stores, onNavigateToList, currentStoreId }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  
  // Briefing State
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Aggregation Logic
  const data = useMemo(() => {
    let totalInvestCNY = 0; 
    let totalRevenueUSD = 0;
    let totalProfitUSD = 0;
    let totalCostUSD = 0; 
    let totalWeight = 0;
    let airCostCNY = 0;
    let seaCostCNY = 0;
    
    const statusCounts = { Planning: 0, Shipped: 0, Arrived: 0 };
    const topProducts: { name: string; profit: number; roi: number; sku: string }[] = [];
    const storeProfitMap: Record<string, number> = {};

    records.forEach(r => {
      const m = calculateMetrics(r);
      totalInvestCNY += (r.quantity * r.unitPriceCNY) + m.firstLegCostCNY;
      totalRevenueUSD += (r.salesPriceUSD * r.quantity);
      const itemTotalProfit = m.estimatedProfitUSD * r.quantity;
      const itemTotalCost = m.totalCostPerUnitUSD * r.quantity;
      totalProfitUSD += itemTotalProfit;
      totalCostUSD += itemTotalCost;
      totalWeight += m.totalWeightKg;
      if (r.shippingMethod === 'Air') airCostCNY += m.firstLegCostCNY;
      else seaCostCNY += m.firstLegCostCNY;
      statusCounts[r.status]++;
      topProducts.push({ name: r.productName, sku: r.sku, profit: itemTotalProfit, roi: m.roi });
      const ids = r.storeIds && r.storeIds.length > 0 ? r.storeIds : (r.storeId ? [r.storeId] : ['unknown']);
      ids.forEach(sId => { storeProfitMap[sId] = (storeProfitMap[sId] || 0) + itemTotalProfit; });
    });

    topProducts.sort((a, b) => b.profit - a.profit);
    const overallROI = totalCostUSD > 0 ? (totalProfitUSD / totalCostUSD) * 100 : 0;
    
    const storeRanking = Object.entries(storeProfitMap)
        .map(([id, profit]) => {
            const store = stores.find(s => s.id === id);
            return {
                name: store ? store.name : (id === 'unknown' ? '未分配' : '未知'),
                profit,
                color: store ? store.color : 'bg-gray-400'
            };
        })
        .sort((a, b) => b.profit - a.profit);

    return { totalInvestCNY, totalProfitUSD, totalCostUSD, totalWeight, overallROI, airCostCNY, seaCostCNY, statusCounts, topProducts: topProducts.slice(0, 4), storeRanking };
  }, [records, stores]);

  // Dynamic Chart Data
  const chartVisualizationData = useMemo(() => {
    if (chartType === 'line') {
        const dateMap = new Map<string, number>();
        records.forEach(r => {
             const m = calculateMetrics(r);
             const val = (r.quantity * r.unitPriceCNY) + m.firstLegCostCNY;
             dateMap.set(r.date, (dateMap.get(r.date) || 0) + val);
        });
        const sortedData = Array.from(dateMap.entries())
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([date, value]) => ({ label: date.substring(5), fullLabel: date, value }));
        return { title: '资金投入趋势 (CNY)', data: sortedData, color: '#3b82f6' };
    } else if (chartType === 'pie') {
         const sortedData = records.map(r => ({
             label: r.sku,
             fullLabel: r.productName,
             value: (r.quantity * r.unitPriceCNY) + calculateMetrics(r).firstLegCostCNY
         })).sort((a, b) => b.value - a.value).slice(0, 6);
         return { title: '成本分布 Top 6', data: sortedData, color: '#8b5cf6' };
    } else {
         const sortedData = records.map(r => ({
             label: r.sku,
             fullLabel: r.productName,
             value: calculateMetrics(r).estimatedProfitUSD * r.quantity
         })).sort((a, b) => b.value - a.value).slice(0, 8);
         return { title: '净利润领跑 (USD)', data: sortedData, color: '#10b981' };
    }
  }, [records, chartType]);

  const totalLogisticsCost = data.airCostCNY + data.seaCostCNY;
  const airPct = totalLogisticsCost > 0 ? (data.airCostCNY / totalLogisticsCost) * 100 : 0;
  const seaPct = totalLogisticsCost > 0 ? (data.seaCostCNY / totalLogisticsCost) * 100 : 0;

  const handleGenerateBriefing = async () => {
      setIsBriefingLoading(true);
      const res = await generateDailyBriefing(records);
      setBriefing(res);
      setIsBriefingLoading(false);
  };

  // --- Visual Components (Enhanced) ---
  const renderBarChart = () => {
     const { data } = chartVisualizationData;
     const maxVal = Math.max(...data.map(d => d.value), 1);
     return (
        <div className="flex justify-between h-48 gap-3 pt-6 items-end">
           {data.map((d, i) => (
               <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div 
                    className="w-full bg-gradient-to-t from-cyan-500 to-blue-600 rounded-t-sm relative overflow-hidden transition-all duration-700 ease-out opacity-80 group-hover:opacity-100 group-hover:scale-110 shadow-[0_0_10px_rgba(6,182,212,0.5)] chart-bar-glow"
                    style={{ height: `${Math.max((d.value / maxVal) * 100, 5)}%` }}
                  >
                     <div className="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </div>
                  {/* Floating Tooltip */}
                  <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-cyan-500/30 text-white text-[11px] px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-20 shadow-glow-cyan pointer-events-none translate-y-2 group-hover:translate-y-0 backdrop-blur-md">
                    <span className="font-bold block text-cyan-300 mb-0.5">{d.fullLabel}</span>
                    <span className="font-mono text-white text-lg">${Math.round(d.value).toLocaleString()}</span>
                  </div>
                  {/* Darker Label */}
                  <span className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center group-hover:text-cyan-400 transition-colors font-mono">{d.label}</span>
               </div>
           ))}
           {data.length === 0 && <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm font-medium">No Data Available</div>}
        </div>
     );
  };

  const renderLineChart = () => {
    const { data } = chartVisualizationData;
    if (data.length < 2) return <div className="h-48 flex items-center justify-center text-slate-500 text-sm font-medium">需要更多数据点</div>;
    const maxVal = Math.max(...data.map(d => d.value));
    const width = 1000; const height = 200; const padding = 20;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="h-48 w-full relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00f2ea" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#00f2ea" stopOpacity="0"/>
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                {/* Area Fill */}
                <path d={`${points} L ${width-padding},${height} L ${padding},${height} Z`} fill="url(#lineGradient)" />
                {/* Line Stroke - Neon Cyan */}
                <polyline points={points} fill="none" stroke="#00f2ea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                {/* Interactive Points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
                    return (
                        <g key={i} className="group">
                           <circle cx={x} cy={y} r="4" fill="#0f172a" stroke="#00f2ea" strokeWidth="2" className="transition-all duration-300 group-hover:r-6 cursor-pointer" />
                           <foreignObject x={x - 60} y={y - 70} width="120" height="60" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                               <div className="bg-slate-900/90 text-white text-[11px] px-3 py-2 rounded-xl text-center mx-auto w-fit shadow-glow-cyan border border-cyan-500/30 backdrop-blur-md">
                                  <div className="text-slate-300 mb-0.5 font-semibold font-mono">{d.fullLabel}</div>
                                  <div className="font-bold font-mono text-cyan-300 text-lg">¥{Math.round(d.value).toLocaleString()}</div>
                                </div>
                           </foreignObject>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 1. Bento Grid Layout for KPI & AI */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* A. AI Command Center (Futuristic Core) */}
          <div className="md:col-span-3 lg:col-span-2 row-span-1 glass-panel rounded-3xl p-8 relative overflow-hidden group border-cyan-500/20 shadow-glass-hover">
              {/* Animated Core Background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"></div>
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="flex items-center gap-2 mb-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-neon"></span>
                              </span>
                              <h3 className="text-[10px] font-black text-cyan-300 uppercase tracking-[0.2em] font-mono">AI Neural Core</h3>
                          </div>
                          <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight text-glow">战略情报局</h2>
                          <p className="text-slate-400 text-sm mt-3 max-w-md font-medium leading-relaxed">
                              系统状态: <span className="text-emerald-400">运行中</span>。AI 正在实时监控供应链效率与利润机会。
                          </p>
                      </div>
                      
                      {/* Animated Reactor Visual */}
                      <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full animate-spin [animation-duration:10s]"></div>
                          <div className="absolute inset-2 border-2 border-cyan-400/50 rounded-full border-t-transparent animate-spin [animation-duration:3s]"></div>
                          <BrainCircuit className="text-cyan-200 relative z-10 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" size={32} />
                      </div>
                  </div>

                  <div className="mt-8">
                      {!briefing ? (
                          <button 
                            onClick={handleGenerateBriefing}
                            disabled={isBriefingLoading}
                            className="bg-cyan-500/10 border border-cyan-500/50 text-cyan-300 px-6 py-3.5 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 hover:bg-cyan-500/20 hover:shadow-glow-cyan active:scale-95 disabled:opacity-50 group backdrop-blur-md"
                          >
                              {isBriefingLoading ? <Loader2 className="animate-spin text-cyan-300" size={18} /> : <Sparkles size={18} className="text-cyan-300 group-hover:rotate-12 transition-transform"/>}
                              {isBriefingLoading ? '正在分析神经网络数据...' : '生成今日晨报'}
                          </button>
                      ) : (
                          <div className="bg-slate-950/80 backdrop-blur-xl rounded-xl p-6 border border-white/10 animate-fade-in max-h-60 overflow-y-auto custom-scrollbar shadow-inner relative">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                              <div 
                                className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed font-medium"
                                dangerouslySetInnerHTML={{ __html: briefing }} 
                              />
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* B. KPI Card: Profit (Holographic Green) */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between group relative overflow-hidden hover:bg-emerald-900/10 transition-all duration-500 border-l-2 border-l-emerald-500/50">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start relative z-10">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20 group-hover:shadow-glow-green transition-all">
                      <TrendingUp size={24} />
                  </div>
                  <span className="bg-emerald-900/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider font-mono">USD</span>
              </div>
              <div className="relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">净利润预测 (Profit)</p>
                  <h3 className="text-3xl font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors text-glow">
                      ${data.totalProfitUSD.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </h3>
                  <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[70%] shadow-[0_0_10px_#10b981]"></div>
                  </div>
              </div>
          </div>

          {/* C. KPI Card: Investment (Holographic Blue) */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between group relative overflow-hidden hover:bg-blue-900/10 transition-all duration-500 border-l-2 border-l-blue-500/50">
              <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex justify-between items-start relative z-10">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20 group-hover:shadow-glow-blue transition-all">
                      <Wallet size={24} />
                  </div>
                  <span className="bg-blue-900/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider font-mono">CNY</span>
              </div>
              <div className="relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">总投入资金 (Invest)</p>
                  <h3 className="text-3xl font-black text-white tracking-tight text-glow">
                      ¥{(data.totalInvestCNY / 10000).toFixed(2)}<span className="text-lg text-slate-500 font-bold ml-1">w</span>
                  </h3>
              </div>
          </div>

          {/* D. KPI Card: ROI (Holographic Purple) */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between group relative overflow-hidden hover:bg-purple-900/10 transition-all duration-500 border-l-2 border-l-purple-500/50">
              <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex justify-between items-start relative z-10">
                  <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20 group-hover:shadow-glow-purple transition-all">
                      <Layers size={24} />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-purple-300 bg-purple-900/30 border border-purple-500/30 px-2 py-1 rounded-full font-mono">
                      <ArrowUpRight size={14} />
                      {data.overallROI.toFixed(0)}%
                  </div>
              </div>
              <div className="relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">投资回报率 (ROI)</p>
                  <h3 className="text-3xl font-black text-white tracking-tight group-hover:text-purple-300 transition-colors text-glow">
                      {data.overallROI.toFixed(1)}%
                  </h3>
              </div>
          </div>

          {/* E. KPI Card: Logistics (Holographic Orange) */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between group relative overflow-hidden hover:bg-orange-900/10 transition-all duration-500 border-l-2 border-l-orange-500/50">
              <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex justify-between items-start relative z-10">
                  <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400 border border-orange-500/20 group-hover:shadow-glow-orange transition-all">
                      <Package size={24} />
                  </div>
                  <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-neon"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  </div>
              </div>
              <div className="relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">物流总发货量</p>
                  <h3 className="text-3xl font-black text-white tracking-tight text-glow">
                      {data.totalWeight.toFixed(0)} <span className="text-lg text-slate-500 font-bold ml-1">kg</span>
                  </h3>
              </div>
          </div>
      </div>

      {/* 2. Main Chart Section (Glass Card with Grid Bg) */}
      <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden bg-grid-pattern">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
             <div>
                <h4 className="font-extrabold text-white flex items-center gap-3 text-xl text-glow">
                   {chartType === 'bar' && <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30"><BarChart3 size={20} /></div>}
                   {chartType === 'line' && <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 border border-cyan-500/30"><LineChart size={20} /></div>}
                   {chartType === 'pie' && <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/30"><PieChartIcon size={20} /></div>}
                   {chartVisualizationData.title}
                </h4>
                <p className="text-xs text-cyan-500 mt-2 ml-[3rem] font-bold tracking-widest uppercase opacity-70 font-mono">
                   LIVE DATA STREAMING // 实时数据流
                </p>
             </div>
             
             {/* Chart Type Selector */}
             <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/10">
                 <button onClick={() => setChartType('bar')} className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${chartType === 'bar' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glow-green' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>利润趋势</button>
                 <button onClick={() => setChartType('line')} className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${chartType === 'line' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>资金投入</button>
                 <button onClick={() => setChartType('pie')} className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${chartType === 'pie' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-glow-purple' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>成本结构</button>
             </div>
         </div>
         
         {/* Chart Render Area */}
         <div className="animate-fade-in px-2 relative z-10 min-h-[220px]">
             {chartType === 'bar' && renderBarChart()}
             {chartType === 'line' && renderLineChart()}
             {chartType === 'pie' && (
                 <div className="flex flex-col md:flex-row items-center justify-around h-48 gap-8">
                    {/* Simplified Pie Visual with Neon */}
                    <div className="relative w-40 h-40">
                        <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                            {chartVisualizationData.data.map((d, i) => {
                                const total = chartVisualizationData.data.reduce((a,c)=>a+c.value,0);
                                let accum = 0;
                                for(let j=0; j<i; j++) accum += chartVisualizationData.data[j].value;
                                const startAngle = (accum / total) * Math.PI * 2;
                                const endAngle = ((accum + d.value) / total) * Math.PI * 2;
                                
                                const x1 = Math.cos(startAngle);
                                const y1 = Math.sin(startAngle);
                                const x2 = Math.cos(endAngle);
                                const y2 = Math.sin(endAngle);
                                
                                const largeArc = (d.value / total) > 0.5 ? 1 : 0;
                                const gap = 0.05; // Gap between slices
                                
                                const pathData = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#6366f1', '#818cf8', '#a5b4fc'];
                                
                                return <path d={pathData} fill={colors[i%colors.length]} stroke="#0f172a" strokeWidth="0.05" key={i} className="hover:opacity-80 transition-opacity cursor-pointer"/>
                            })}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-extrabold text-white bg-slate-900/80 px-2 py-1 rounded backdrop-blur-md border border-white/10">COST DIST.</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {chartVisualizationData.data.map((d,i) => {
                             const colors = ['bg-purple-500', 'bg-purple-400', 'bg-purple-300', 'bg-indigo-500', 'bg-indigo-400', 'bg-indigo-300'];
                             return (
                                <div key={i} className="flex items-center gap-3 text-xs">
                                    <div className={`w-2 h-2 rounded-sm ${colors[i%colors.length]} shadow-glow-purple`}></div>
                                    <span className="text-slate-300 font-bold">{d.label}</span>
                                    <span className="text-slate-500 font-mono ml-auto">
                                        {Math.round((d.value/chartVisualizationData.data.reduce((a,c)=>a+c.value,0))*100)}%
                                    </span>
                                </div>
                             )
                        })}
                    </div>
                 </div>
             )}
         </div>
      </div>

      {/* 3. Bottom Section: Logistics & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Logistics Cost Structure (Holographic Donut) */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col hover:-translate-y-1 transition-all duration-300">
          <h4 className="font-bold text-white mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30"><Ship size={18}/></div>
            物流渠道占比
          </h4>
          <div className="flex-1 flex items-center justify-center relative">
             <div className="relative w-48 h-48 group">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-xl transition-transform duration-700 group-hover:scale-105">
                  <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path className="text-indigo-500" strokeDasharray={`${seaPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" style={{filter: 'drop-shadow(0 0 5px rgba(99,102,241,0.5))'}} />
                  <path className="text-cyan-400" strokeDasharray={`${airPct}, 100`} strokeDashoffset={`-${seaPct}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" style={{filter: 'drop-shadow(0 0 5px rgba(6,182,212,0.5))'}} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold font-mono">TOTAL COST</span>
                   <span className="text-2xl font-black text-white tracking-tight text-glow">{(totalLogisticsCost/1000).toFixed(1)}k</span>
                   <span className="text-[10px] text-cyan-400 font-bold bg-cyan-900/30 border border-cyan-500/30 px-2 py-0.5 rounded mt-1 font-mono">CNY</span>
                </div>
             </div>
          </div>
          <div className="mt-6 flex justify-center gap-6">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-glow-purple"></span>
                <span className="text-xs font-bold text-slate-300">海运 {seaPct.toFixed(0)}%</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-glow-cyan"></span>
                <span className="text-xs font-bold text-slate-300">空运 {airPct.toFixed(0)}%</span>
             </div>
          </div>
        </div>

        {/* Status Pipeline / Store Leaderboard */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 hover:-translate-y-1 transition-all duration-300">
           <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/30">
                    {currentStoreId === 'all' ? <StoreIcon size={18}/> : <Activity size={18}/>}
                </div>
                {currentStoreId === 'all' ? '店铺利润排行榜' : '供应链全链路概览'}
              </h4>
              <button onClick={onNavigateToList} className="text-xs text-cyan-400 hover:text-white font-bold flex items-center gap-1 bg-cyan-900/20 border border-cyan-500/30 hover:bg-cyan-500 hover:border-cyan-500 px-4 py-2 rounded-xl transition-all shadow-sm">
                查看详情 <ArrowRight size={14} />
              </button>
           </div>
           
           {currentStoreId === 'all' ? (
                <div className="space-y-3">
                    {data.storeRanking.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all shadow-sm group">
                             <div className="flex items-center gap-4">
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md bg-slate-700 ring-1 ring-white/10 group-hover:ring-cyan-400/50`}>
                                     {idx + 1}
                                 </div>
                                 <span className="font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{s.name}</span>
                             </div>
                             <div className="text-right">
                                 <div className="text-sm font-black text-white font-mono">${s.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                                 <div className="w-32 bg-slate-700 h-1 rounded-full mt-1.5 ml-auto overflow-hidden">
                                     <div className={`h-full rounded-full ${s.profit > 0 ? 'bg-cyan-400 shadow-[0_0_5px_#00f2ea]' : 'bg-slate-500'}`} style={{ width: '100%' }}></div> 
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
           ) : (
                <div className="grid grid-cols-3 gap-4 h-40">
                    <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-5 flex flex-col justify-between border border-amber-500/20 relative overflow-hidden group hover:shadow-glow-orange transition-shadow backdrop-blur-sm">
                        <span className="text-amber-400 font-extrabold text-xs uppercase tracking-wider bg-black/40 w-fit px-2 py-1 rounded-lg backdrop-blur-md">计划中</span>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl font-black text-white text-glow">{data.statusCounts.Planning}</span>
                        </div>
                        <Activity className="absolute right-[-10px] bottom-[-10px] text-amber-500 opacity-20 group-hover:scale-110 transition-transform duration-500" size={80} />
                    </div>
                    <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-2xl p-5 flex flex-col justify-between border border-cyan-500/20 relative overflow-hidden group hover:shadow-glow-blue transition-shadow backdrop-blur-sm">
                        <span className="text-cyan-400 font-extrabold text-xs uppercase tracking-wider bg-black/40 w-fit px-2 py-1 rounded-lg backdrop-blur-md">运输中</span>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl font-black text-white text-glow">{data.statusCounts.Shipped}</span>
                        </div>
                        <Ship className="absolute right-[-10px] bottom-[-10px] text-cyan-500 opacity-20 group-hover:scale-110 transition-transform duration-500" size={80} />
                    </div>
                    <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-2xl p-5 flex flex-col justify-between border border-emerald-500/20 relative overflow-hidden group hover:shadow-glow-green transition-shadow backdrop-blur-sm">
                        <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider bg-black/40 w-fit px-2 py-1 rounded-lg backdrop-blur-md">已入库</span>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl font-black text-white text-glow">{data.statusCounts.Arrived}</span>
                        </div>
                        <Package className="absolute right-[-10px] bottom-[-10px] text-emerald-500 opacity-20 group-hover:scale-110 transition-transform duration-500" size={80} />
                    </div>
                </div>
           )}

           {/* Top Products Mini List (Cyber Style) */}
           <div className="mt-6 pt-4 border-t border-white/5">
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 font-mono">
                  <TrendingUp size={12} className="text-emerald-400"/> 明星产品榜单 (Top Performers)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {data.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl hover:bg-white/10 hover:border-cyan-500/30 transition-all border border-transparent group cursor-pointer backdrop-blur-sm">
                       <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${i===0 ? 'bg-amber-500 text-black shadow-glow-orange' : 'bg-slate-700 text-slate-400'}`}>
                             {i + 1}
                          </span>
                          <div className="truncate">
                             <div className="text-sm font-bold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">{p.name}</div>
                             <div className="text-[10px] text-slate-500 font-bold font-mono group-hover:text-slate-400">{p.sku}</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-xs font-bold text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded-md font-mono border border-emerald-500/20">${p.profit.toFixed(0)}</div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
