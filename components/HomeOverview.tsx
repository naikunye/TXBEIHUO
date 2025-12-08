
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
  ArrowUpRight
} from 'lucide-react';
import { EXCHANGE_RATE } from '../constants';
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
        return { title: '资金投入趋势 (RMB)', data: sortedData, color: '#3b82f6' };
    } else if (chartType === 'pie') {
         const sortedData = records.map(r => ({
             label: r.sku,
             fullLabel: r.productName,
             value: (r.quantity * r.unitPriceCNY) + calculateMetrics(r).firstLegCostCNY
         })).sort((a, b) => b.value - a.value).slice(0, 6);
         return { title: 'SKU 资金占比 Top 6', data: sortedData, color: '#8b5cf6' };
    } else {
         const sortedData = records.map(r => ({
             label: r.sku,
             fullLabel: r.productName,
             value: calculateMetrics(r).estimatedProfitUSD * r.quantity
         })).sort((a, b) => b.value - a.value).slice(0, 8);
         return { title: '单品预估净利 Top 8 (USD)', data: sortedData, color: '#10b981' };
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
                    className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-lg relative overflow-hidden transition-all duration-700 ease-out opacity-90 group-hover:opacity-100 group-hover:scale-105 shadow-lg shadow-emerald-500/10"
                    style={{ height: `${Math.max((d.value / maxVal) * 100, 5)}%` }}
                  >
                     <div className="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </div>
                  {/* Floating Tooltip */}
                  <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[11px] px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-20 shadow-xl pointer-events-none translate-y-2 group-hover:translate-y-0">
                    <span className="font-bold block text-emerald-300 mb-0.5">{d.fullLabel}</span>
                    <span className="font-mono text-white">${Math.round(d.value).toLocaleString()}</span>
                  </div>
                  {/* Darker Label */}
                  <span className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center group-hover:text-slate-800 transition-colors">{d.label}</span>
               </div>
           ))}
           {data.length === 0 && <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">暂无数据</div>}
        </div>
     );
  };

  const renderLineChart = () => {
    const { data } = chartVisualizationData;
    if (data.length < 2) return <div className="h-48 flex items-center justify-center text-slate-500 text-sm font-medium">需要至少两条数据记录以显示趋势</div>;
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
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                    </linearGradient>
                </defs>
                {/* Area Fill */}
                <path d={`${points} L ${width-padding},${height} L ${padding},${height} Z`} fill="url(#lineGradient)" />
                {/* Line Stroke - Darker Blue */}
                <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
                {/* Interactive Points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
                    return (
                        <g key={i} className="group">
                           <circle cx={x} cy={y} r="3" fill="#2563eb" stroke="white" strokeWidth="2" className="transition-all duration-300 group-hover:r-5 cursor-pointer" />
                           <foreignObject x={x - 60} y={y - 70} width="120" height="60" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                               <div className="bg-slate-900 text-white text-[11px] px-3 py-2 rounded-xl text-center mx-auto w-fit shadow-xl border border-white/10">
                                  <div className="text-slate-200 mb-0.5 font-semibold">{d.fullLabel}</div>
                                  <div className="font-bold font-mono text-blue-300">¥{Math.round(d.value).toLocaleString()}</div>
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
          
          {/* A. AI Command Center (Large Card) */}
          <div className="md:col-span-3 lg:col-span-2 row-span-1 glass-card-dark rounded-3xl p-8 relative overflow-hidden group border-indigo-500/20 shadow-indigo-900/20 shadow-2xl">
              {/* Animated Background Blobs */}
              <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[150%] bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
              <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[150%] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="flex items-center gap-2 mb-2">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                              <h3 className="text-xs font-black text-indigo-200 uppercase tracking-widest">AI Command Center</h3>
                          </div>
                          <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight">战略情报局</h2>
                          <p className="text-slate-300 text-sm mt-3 max-w-md font-medium leading-relaxed">
                              基于全量数据的实时经营诊断，为您提供精准的行动建议与风险预警。
                          </p>
                      </div>
                      <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg">
                          <BrainCircuit className="text-indigo-200" size={32} />
                      </div>
                  </div>

                  <div className="mt-8">
                      {!briefing ? (
                          <button 
                            onClick={handleGenerateBriefing}
                            disabled={isBriefingLoading}
                            className="bg-white text-slate-900 px-6 py-3.5 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 hover:bg-indigo-50 shadow-lg hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
                          >
                              {isBriefingLoading ? <Loader2 className="animate-spin text-indigo-600" size={18} /> : <Sparkles size={18} className="text-indigo-600"/>}
                              {isBriefingLoading ? '正在深入分析...' : '生成今日简报'}
                          </button>
                      ) : (
                          <div className="bg-slate-950/60 backdrop-blur-xl rounded-xl p-6 border border-white/10 animate-fade-in max-h-60 overflow-y-auto custom-scrollbar shadow-inner">
                              <div 
                                className="prose prose-invert prose-sm max-w-none text-slate-100 leading-relaxed font-medium"
                                dangerouslySetInnerHTML={{ __html: briefing }} 
                              />
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* B. KPI Card: Profit (Highlighted) */}
          <div className="glass-panel p-6 rounded-3xl shadow-glass hover:shadow-glass-hover flex flex-col justify-between group border-l-4 border-l-emerald-500 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-between items-start">
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                      <TrendingUp size={24} />
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">USD</span>
              </div>
              <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">预估净利润 (Net Profit)</p>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
                      ${data.totalProfitUSD.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </h3>
                  <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[70%]"></div>
                  </div>
              </div>
          </div>

          {/* C. KPI Card: Investment */}
          <div className="glass-panel p-6 rounded-3xl shadow-glass hover:shadow-glass-hover flex flex-col justify-between group border-l-4 border-l-blue-500 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-between items-start">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                      <Wallet size={24} />
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">CNY</span>
              </div>
              <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">总投入资金 (Invest)</p>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                      ¥{(data.totalInvestCNY / 10000).toFixed(2)}<span className="text-lg text-slate-400 font-bold ml-1">w</span>
                  </h3>
              </div>
          </div>

          {/* D. KPI Card: ROI */}
          <div className="glass-panel p-6 rounded-3xl shadow-glass hover:shadow-glass-hover flex flex-col justify-between group border-l-4 border-l-purple-500 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-between items-start">
                  <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                      <Layers size={24} />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                      <ArrowUpRight size={14} />
                      {data.overallROI.toFixed(0)}%
                  </div>
              </div>
              <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">综合回报率 (ROI)</p>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-purple-600 transition-colors">
                      {data.overallROI.toFixed(1)}%
                  </h3>
              </div>
          </div>

          {/* E. KPI Card: Logistics */}
          <div className="glass-panel p-6 rounded-3xl shadow-glass hover:shadow-glass-hover flex flex-col justify-between group border-l-4 border-l-orange-500 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex justify-between items-start">
                  <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                      <Package size={24} />
                  </div>
                  <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-100"></span>
                      <span className="h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-indigo-100"></span>
                  </div>
              </div>
              <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">物流总重 (Total Weight)</p>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">
                      {data.totalWeight.toFixed(0)} <span className="text-lg text-slate-400 font-bold ml-1">kg</span>
                  </h3>
              </div>
          </div>
      </div>

      {/* 2. Main Chart Section (Glass Card) */}
      <div className="glass-panel p-8 rounded-3xl shadow-glass border border-white/60 relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-3xl opacity-60 -z-10 -translate-y-1/2 translate-x-1/2"></div>

         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
             <div>
                <h4 className="font-extrabold text-slate-800 flex items-center gap-3 text-xl">
                   {chartType === 'bar' && <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm"><BarChart3 size={20} /></div>}
                   {chartType === 'line' && <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shadow-sm"><LineChart size={20} /></div>}
                   {chartType === 'pie' && <div className="p-2.5 bg-purple-100 rounded-xl text-purple-600 shadow-sm"><PieChartIcon size={20} /></div>}
                   {chartVisualizationData.title}
                </h4>
                <p className="text-xs text-slate-500 mt-2 ml-[3.25rem] font-bold tracking-wide uppercase opacity-70">
                   VISUAL DATA ANALYTICS &bull; 实时数据可视化
                </p>
             </div>
             
             {/* Chart Type Selector */}
             <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                 <button onClick={() => setChartType('bar')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${chartType === 'bar' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>利润排行</button>
                 <button onClick={() => setChartType('line')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${chartType === 'line' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>资金趋势</button>
                 <button onClick={() => setChartType('pie')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${chartType === 'pie' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>成本分布</button>
             </div>
         </div>
         
         {/* Chart Render Area */}
         <div className="animate-fade-in px-2">
             {chartType === 'bar' && renderBarChart()}
             {chartType === 'line' && renderLineChart()}
             {chartType === 'pie' && (
                 <div className="flex flex-col md:flex-row items-center justify-around h-48 gap-8">
                    {/* Simplified Pie Visual for elegance */}
                    <div className="relative w-40 h-40">
                        <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90 drop-shadow-xl">
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
                                
                                const pathData = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];
                                
                                return <path d={pathData} fill={colors[i%colors.length]} stroke="white" strokeWidth="0.05" key={i} className="hover:opacity-80 transition-opacity cursor-pointer"/>
                            })}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-xs font-extrabold text-slate-600 bg-white/90 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-sm">Distribution</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {chartVisualizationData.data.map((d,i) => {
                             const colors = ['bg-purple-500', 'bg-purple-400', 'bg-purple-300', 'bg-purple-200', 'bg-purple-100', 'bg-slate-200'];
                             return (
                                <div key={i} className="flex items-center gap-3 text-xs">
                                    <div className={`w-3 h-3 rounded-full ${colors[i%colors.length]} shadow-sm border border-white`}></div>
                                    <span className="text-slate-700 font-bold">{d.label}</span>
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
        
        {/* Logistics Cost Structure */}
        <div className="glass-panel p-6 rounded-3xl shadow-glass hover:shadow-glass-hover flex flex-col hover:-translate-y-1 transition-all duration-300">
          <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600 border border-blue-100"><Ship size={18}/></div>
            物流成本结构
          </h4>
          <div className="flex-1 flex items-center justify-center relative">
             <div className="relative w-48 h-48 group">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-xl transition-transform duration-700 group-hover:scale-105">
                  <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                  <path className="text-indigo-500" strokeDasharray={`${seaPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <path className="text-sky-400" strokeDasharray={`${airPct}, 100`} strokeDashoffset={`-${seaPct}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Total Cost</span>
                   <span className="text-2xl font-black text-slate-800 tracking-tight">{(totalLogisticsCost/1000).toFixed(1)}k</span>
                   <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded mt-1">CNY</span>
                </div>
             </div>
          </div>
          <div className="mt-6 flex justify-center gap-6">
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm ring-2 ring-indigo-100"></span>
                <span className="text-xs font-bold text-slate-600">海运 {seaPct.toFixed(0)}%</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400 shadow-sm ring-2 ring-sky-100"></span>
                <span className="text-xs font-bold text-slate-600">空运 {airPct.toFixed(0)}%</span>
             </div>
          </div>
        </div>

        {/* Status Pipeline / Store Leaderboard */}
        <div className="glass-panel p-6 rounded-3xl shadow-glass hover:shadow-glass-hover border border-white/50 lg:col-span-2 hover:-translate-y-1 transition-all duration-300">
           <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600 border border-purple-100">
                    {currentStoreId === 'all' ? <StoreIcon size={18}/> : <Activity size={18}/>}
                </div>
                {currentStoreId === 'all' ? '店铺利润贡献排行' : '备货状态分布'}
              </h4>
              <button onClick={onNavigateToList} className="text-xs text-blue-600 hover:text-white font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-xl transition-all shadow-sm">
                查看详情 <ArrowRight size={14} />
              </button>
           </div>
           
           {currentStoreId === 'all' ? (
                <div className="space-y-3">
                    {data.storeRanking.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white/70 rounded-2xl border border-white hover:border-blue-200 hover:bg-white transition-all shadow-sm group">
                             <div className="flex items-center gap-4">
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md ${s.color} ring-2 ring-white/50`}>
                                     {idx + 1}
                                 </div>
                                 <span className="font-bold text-slate-800">{s.name}</span>
                             </div>
                             <div className="text-right">
                                 <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">${s.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                                 <div className="w-32 bg-slate-100 h-1.5 rounded-full mt-1.5 ml-auto overflow-hidden">
                                     <div className={`h-full rounded-full ${s.color}`} style={{ width: '100%' }}></div> 
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
           ) : (
                <div className="grid grid-cols-3 gap-4 h-40">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 flex flex-col justify-between border border-amber-100/50 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <span className="text-amber-900 font-extrabold text-xs uppercase tracking-wider bg-white/60 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">Planning</span>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl font-black text-amber-900">{data.statusCounts.Planning}</span>
                        </div>
                        <Activity className="absolute right-[-10px] bottom-[-10px] text-amber-500 opacity-20 group-hover:scale-110 transition-transform duration-500" size={80} />
                    </div>
                    <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-5 flex flex-col justify-between border border-sky-100/50 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <span className="text-sky-900 font-extrabold text-xs uppercase tracking-wider bg-white/60 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">Shipping</span>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl font-black text-sky-900">{data.statusCounts.Shipped}</span>
                        </div>
                        <Ship className="absolute right-[-10px] bottom-[-10px] text-sky-500 opacity-20 group-hover:scale-110 transition-transform duration-500" size={80} />
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 flex flex-col justify-between border border-emerald-100/50 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <span className="text-emerald-900 font-extrabold text-xs uppercase tracking-wider bg-white/60 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">Arrived</span>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl font-black text-emerald-900">{data.statusCounts.Arrived}</span>
                        </div>
                        <Package className="absolute right-[-10px] bottom-[-10px] text-emerald-500 opacity-20 group-hover:scale-110 transition-transform duration-500" size={80} />
                    </div>
                </div>
           )}

           {/* Top Products Mini List */}
           <div className="mt-6 pt-4 border-t border-slate-200/50">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-500"/> Top Performers
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {data.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-white/60 rounded-xl hover:bg-white hover:shadow-md transition-all border border-slate-100 group cursor-pointer">
                       <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm ${i===0 ? 'bg-gradient-to-br from-amber-400 to-orange-400 text-white' : 'bg-slate-200 text-slate-600'}`}>
                             {i + 1}
                          </span>
                          <div className="truncate">
                             <div className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{p.name}</div>
                             <div className="text-[11px] text-slate-500 font-bold font-mono">{p.sku}</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-xs font-bold text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded-md">${p.profit.toFixed(0)}</div>
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
