
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
  HelpCircle
} from 'lucide-react';
import { EXCHANGE_RATE } from '../constants';

interface HomeOverviewProps {
  records: ReplenishmentRecord[];
  stores: Store[];
  onNavigateToList: () => void;
  currentStoreId: string;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({ records, stores, onNavigateToList, currentStoreId }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // Aggregation Logic
  const data = useMemo(() => {
    let totalInvestCNY = 0; // Pure Inventory + First Leg (Cash Outflow)
    let totalRevenueUSD = 0;
    let totalProfitUSD = 0;
    let totalCostUSD = 0; // Comprehensive Cost (Inv + Ship + Fee + Ad)
    let totalWeight = 0;
    let airCostCNY = 0;
    let seaCostCNY = 0;
    
    const statusCounts = { Planning: 0, Shipped: 0, Arrived: 0 };
    const topProducts: { name: string; profit: number; roi: number; sku: string }[] = [];
    const storeProfitMap: Record<string, number> = {};

    records.forEach(r => {
      const m = calculateMetrics(r);
      
      // Cash Flow Investment (RMB)
      totalInvestCNY += (r.quantity * r.unitPriceCNY) + m.firstLegCostCNY;
      
      // Financial Totals (USD)
      totalRevenueUSD += (r.salesPriceUSD * r.quantity);
      const itemTotalProfit = m.estimatedProfitUSD * r.quantity;
      const itemTotalCost = m.totalCostPerUnitUSD * r.quantity;
      
      totalProfitUSD += itemTotalProfit;
      totalCostUSD += itemTotalCost;

      totalWeight += m.totalWeightKg;

      if (r.shippingMethod === 'Air') airCostCNY += m.firstLegCostCNY;
      else seaCostCNY += m.firstLegCostCNY;

      statusCounts[r.status]++;

      topProducts.push({
        name: r.productName,
        sku: r.sku,
        profit: itemTotalProfit,
        roi: m.roi
      });

      // Aggregate for Store Profit Chart
      // Support multiple storeIds
      const ids = r.storeIds && r.storeIds.length > 0 ? r.storeIds : (r.storeId ? [r.storeId] : ['unknown']);
      
      ids.forEach(sId => {
          storeProfitMap[sId] = (storeProfitMap[sId] || 0) + itemTotalProfit;
      });
    });

    // Sort Top Products
    topProducts.sort((a, b) => b.profit - a.profit);

    // Comprehensive ROI (Profit / Total Cost)
    // Note: totalCostUSD includes Product, Shipping, Ads, Fees, Last Mile.
    const overallROI = totalCostUSD > 0 ? (totalProfitUSD / totalCostUSD) * 100 : 0;
    
    // Store Ranking Data
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

    return {
      totalInvestCNY,
      totalProfitUSD,
      totalCostUSD, // Export total cost for ROI breakdown
      totalWeight,
      overallROI,
      airCostCNY,
      seaCostCNY,
      statusCounts,
      topProducts: topProducts.slice(0, 4),
      storeRanking
    };
  }, [records, stores]);

  // Dynamic Chart Data Preparation
  const chartVisualizationData = useMemo(() => {
    if (chartType === 'line') {
        // Line Chart: Investment Trend over Time (Date sorted)
        const dateMap = new Map<string, number>();
        records.forEach(r => {
             const m = calculateMetrics(r);
             const val = (r.quantity * r.unitPriceCNY) + m.firstLegCostCNY;
             dateMap.set(r.date, (dateMap.get(r.date) || 0) + val);
        });
        const sortedData = Array.from(dateMap.entries())
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([date, value]) => ({ label: date.substring(5), fullLabel: date, value }));
        
        return { 
            title: '资金投入趋势 (RMB)', 
            data: sortedData,
            color: '#3b82f6' // blue
        };
    } else if (chartType === 'pie') {
        // Pie Chart: Cost Distribution by Product
         const sortedData = records.map(r => ({
             label: r.sku,
             fullLabel: r.productName,
             value: (r.quantity * r.unitPriceCNY) + calculateMetrics(r).firstLegCostCNY
         })).sort((a, b) => b.value - a.value).slice(0, 6);
         
         return {
             title: 'SKU 资金占比 Top 6 (RMB)',
             data: sortedData,
             color: '#8b5cf6' // violet
         };
    } else {
         // Bar Chart: Profit by Product
         const sortedData = records.map(r => ({
             label: r.sku,
             fullLabel: r.productName,
             value: calculateMetrics(r).estimatedProfitUSD * r.quantity
         })).sort((a, b) => b.value - a.value).slice(0, 8);

         return {
             title: '单品预估总净利 Top 8 (USD)',
             data: sortedData,
             color: '#10b981' // emerald
         };
    }
  }, [records, chartType]);

  // Chart Helpers
  const totalLogisticsCost = data.airCostCNY + data.seaCostCNY;
  const airPct = totalLogisticsCost > 0 ? (data.airCostCNY / totalLogisticsCost) * 100 : 0;
  const seaPct = totalLogisticsCost > 0 ? (data.seaCostCNY / totalLogisticsCost) * 100 : 0;

  // --- Simple SVG Components ---
  const renderBarChart = () => {
     const { data, color } = chartVisualizationData;
     const maxVal = Math.max(...data.map(d => d.value), 1);
     return (
        <div className="flex justify-between h-48 gap-2 pt-4">
           {data.map((d, i) => (
               <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className="w-full bg-gray-100 rounded-t-md relative overflow-hidden flex items-end flex-1">
                     <div 
                        className="w-full rounded-t-md transition-all duration-700 ease-out opacity-80 group-hover:opacity-100"
                        style={{ height: `${Math.max((d.value / maxVal) * 100, 1)}%`, backgroundColor: color }}
                     ></div>
                     {/* Tooltip */}
                     <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                        {d.fullLabel}: {Math.round(d.value).toLocaleString()}
                     </div>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2 truncate w-full text-center h-4">{d.label}</span>
               </div>
           ))}
           {data.length === 0 && <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">暂无数据</div>}
        </div>
     );
  };

  const renderLineChart = () => {
    const { data, color } = chartVisualizationData;
    if (data.length < 2) return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">需要至少两条数据记录以显示趋势</div>;

    const maxVal = Math.max(...data.map(d => d.value));
    const width = 1000;
    const height = 200;
    const padding = 20;
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="h-48 w-full relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f3f4f6" strokeWidth="2" />
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="5,5" />
                
                {/* Line */}
                <polyline 
                    points={points} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="drop-shadow-md"
                />
                
                {/* Dots */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
                    return (
                        <g key={i} className="group">
                           <circle cx={x} cy={y} r="6" fill="white" stroke={color} strokeWidth="3" className="transition-all group-hover:r-8 cursor-pointer" />
                           <foreignObject x={x - 50} y={y - 50} width="100" height="40" className="opacity-0 group-hover:opacity-100 transition-opacity overflow-visible">
                               <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded text-center mx-auto w-fit whitespace-nowrap shadow-lg">
                                  {d.fullLabel}: {Math.round(d.value)}
                                </div>
                           </foreignObject>
                           <text x={x} y={height} dy="15" textAnchor="middle" fontSize="24" fill="#9ca3af">{d.label}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
  };

  const renderPieChart = () => {
      const { data } = chartVisualizationData;
      const total = data.reduce((acc, curr) => acc + curr.value, 0);
      let cumulativePercent = 0;
      const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];

      return (
          <div className="flex flex-col md:flex-row items-center justify-around h-48 gap-8">
              {/* SVG Pie */}
              <div className="relative w-40 h-40 flex-shrink-0">
                 <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
                     {data.map((d, i) => {
                         const startPercent = cumulativePercent;
                         const slicePercent = d.value / total;
                         cumulativePercent += slicePercent;
                         
                         // Calculate coordinates
                         const startX = Math.cos(2 * Math.PI * startPercent);
                         const startY = Math.sin(2 * Math.PI * startPercent);
                         const endX = Math.cos(2 * Math.PI * cumulativePercent);
                         const endY = Math.sin(2 * Math.PI * cumulativePercent);
                         
                         // If slice is > 50%, take the long way around
                         const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                         
                         const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                         
                         return (
                             <path 
                                key={i} 
                                d={pathData} 
                                fill={colors[i % colors.length]} 
                                stroke="white" 
                                strokeWidth="0.02" 
                                className="hover:opacity-90 transition-opacity cursor-pointer"
                             >
                                <title>{d.fullLabel}: {Math.round(d.value)} ({(slicePercent*100).toFixed(1)}%)</title>
                             </path>
                         );
                     })}
                 </svg>
              </div>
              
              {/* Legend */}
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {data.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></span>
                          <span className="text-gray-600 truncate flex-1" title={d.fullLabel}>{d.label}</span>
                          <span className="font-mono font-medium text-gray-800">{Math.round((d.value/total)*100)}%</span>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 1. Hero KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Investment */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
             <Wallet size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium mb-1">总投入资金 (CNY)</p>
            <h3 className="text-3xl font-bold tracking-tight">¥{data.totalInvestCNY.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-xs text-blue-200 bg-blue-800/30 w-fit px-2 py-1 rounded-lg">
              <Activity size={14} />
              <span>资金周转中</span>
            </div>
          </div>
        </div>

        {/* Expected Profit */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative group hover:border-emerald-200 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">预估总净利 (USD)</p>
              <h3 className="text-3xl font-bold text-emerald-600">${data.totalProfitUSD.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
               <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400">
             包含扣除头程、尾程及广告后的净收益
          </div>
        </div>

        {/* ROI Breakdown Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative hover:border-purple-200 transition-colors flex flex-col justify-between">
           <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1 mb-1">
                  <p className="text-gray-500 text-sm font-medium">综合 ROI</p>
                  <div className="group relative">
                      <HelpCircle size={12} className="text-gray-300 cursor-pointer" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-slate-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                          公式: 总利润 / 总成本 (包含物流/佣金/广告)
                      </div>
                  </div>
              </div>
              <h3 className="text-3xl font-bold text-purple-600">{data.overallROI.toFixed(1)}%</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
               <Layers size={24} />
            </div>
          </div>
          
          {/* New Structure Breakdown */}
          <div className="mt-3 bg-purple-50 rounded-lg p-2 flex items-center justify-between text-xs">
              <div className="flex flex-col">
                  <span className="text-[10px] text-purple-400 font-bold uppercase">总净利 (Profit)</span>
                  <span className="font-bold text-purple-700">${data.totalProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="text-purple-300 font-light text-lg">/</div>
              <div className="flex flex-col text-right">
                  <span className="text-[10px] text-purple-400 font-bold uppercase">总成本 (Total Cost)</span>
                  <span className="font-bold text-purple-700">${data.totalCostUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
          </div>
        </div>

        {/* Total Weight */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative hover:border-orange-200 transition-colors">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">物流总重量</p>
              <h3 className="text-3xl font-bold text-orange-600">{data.totalWeight.toFixed(0)} <span className="text-lg text-gray-400">kg</span></h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
               <Package size={24} />
            </div>
          </div>
          <div className="mt-4 flex gap-3 text-xs">
             <span className="flex items-center gap-1 text-gray-500"><Plane size={12}/> {airPct.toFixed(0)}%</span>
             <span className="flex items-center gap-1 text-gray-500"><Ship size={12}/> {seaPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* 2. New Dynamic Chart Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
             <div>
                <h4 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                   {chartType === 'bar' && <BarChart3 className="text-emerald-500" size={20} />}
                   {chartType === 'line' && <LineChart className="text-blue-500" size={20} />}
                   {chartType === 'pie' && <PieChartIcon className="text-violet-500" size={20} />}
                   {chartVisualizationData.title}
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                   {chartType === 'bar' && "展示表现最好的产品利润排行，建议重点关注前三名。"}
                   {chartType === 'line' && "根据时间轴展示资金流出情况，辅助现金流管理。"}
                   {chartType === 'pie' && "分析库存资金积压情况，优化SKU资金配置。"}
                </p>
             </div>
             
             {/* Chart Type Selector */}
             <div className="relative">
                 <select 
                    value={chartType} 
                    onChange={(e) => setChartType(e.target.value as any)}
                    className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                 >
                     <option value="bar">柱状图 (Profit Analysis)</option>
                     <option value="line">折线图 (Investment Trend)</option>
                     <option value="pie">饼图 (Cost Distribution)</option>
                 </select>
                 <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
             </div>
         </div>
         
         {/* Chart Render Area */}
         <div className="animate-fade-in">
             {chartType === 'bar' && renderBarChart()}
             {chartType === 'line' && renderLineChart()}
             {chartType === 'pie' && renderPieChart()}
         </div>
      </div>

      {/* 3. Middle Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Logistics Cost Structure (Donut) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Ship className="text-blue-500" size={18}/>
            物流成本结构
          </h4>
          <div className="flex-1 flex items-center justify-center relative">
             {/* Simple CSS/SVG Pie Chart */}
             <div className="relative w-48 h-48">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {/* Background Circle */}
                  <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                  {/* Sea Segment */}
                  <path className="text-indigo-500" strokeDasharray={`${seaPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                  {/* Air Segment (offset by Sea pct) */}
                  <path className="text-sky-400" strokeDasharray={`${airPct}, 100`} strokeDashoffset={`-${seaPct}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-xs text-gray-400">总运费(CNY)</span>
                   <span className="text-lg font-bold text-gray-800">{(totalLogisticsCost/1000).toFixed(1)}k</span>
                </div>
             </div>
          </div>
          <div className="mt-6 flex justify-center gap-6">
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                <span className="text-sm text-gray-600">海运 {seaPct.toFixed(0)}%</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                <span className="text-sm text-gray-600">空运 {airPct.toFixed(0)}%</span>
             </div>
          </div>
        </div>

        {/* Status Pipeline / Store Leaderboard */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 lg:col-span-2">
           <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                {currentStoreId === 'all' ? <StoreIcon className="text-purple-500" size={18}/> : <Activity className="text-purple-500" size={18}/>}
                {currentStoreId === 'all' ? '店铺利润贡献排行' : '备货状态分布'}
              </h4>
              <button onClick={onNavigateToList} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                查看详情 <ArrowRight size={12} />
              </button>
           </div>
           
           {currentStoreId === 'all' ? (
                // Store Ranking View
                <div className="space-y-4">
                    {data.storeRanking.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                             <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${s.color}`}>
                                     {idx + 1}
                                 </div>
                                 <span className="font-bold text-gray-700">{s.name}</span>
                             </div>
                             <div className="text-right">
                                 <div className="text-sm font-bold text-gray-900">${s.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                                 <div className="text-[10px] text-gray-400">Total Profit</div>
                             </div>
                        </div>
                    ))}
                    {data.storeRanking.length === 0 && <div className="text-gray-400 text-sm text-center py-4">暂无店铺数据</div>}
                </div>
           ) : (
                // Status Pipeline View
                <div className="grid grid-cols-3 gap-4 h-40">
                    <div className="bg-yellow-50 rounded-xl p-4 flex flex-col justify-between border border-yellow-100 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                            <Activity size={60} />
                        </div>
                        <span className="text-yellow-800 font-medium text-sm">计划中</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-yellow-900">{data.statusCounts.Planning}</span>
                            <span className="text-xs text-yellow-700 mb-1">单</span>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-4 flex flex-col justify-between border border-blue-100 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                            <Ship size={60} />
                        </div>
                        <span className="text-blue-800 font-medium text-sm">运输中</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-blue-900">{data.statusCounts.Shipped}</span>
                            <span className="text-xs text-blue-700 mb-1">单</span>
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4 flex flex-col justify-between border border-green-100 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                            <Package size={60} />
                        </div>
                        <span className="text-green-800 font-medium text-sm">已入库</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-green-900">{data.statusCounts.Arrived}</span>
                            <span className="text-xs text-green-700 mb-1">单</span>
                        </div>
                    </div>
                </div>
           )}

           {/* Profit Leaderboard (Product Level) */}
           <div className="mt-6 pt-6 border-t border-gray-100">
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {currentStoreId === 'all' ? '全局爆品 TOP 4' : '本店爆品 TOP 4'}
              </h5>
              <div className="space-y-3">
                 {data.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                       <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${i===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                             {i + 1}
                          </span>
                          <div>
                             <div className="text-sm font-medium text-gray-800">{p.name}</div>
                             <div className="text-[10px] text-gray-400 font-mono">{p.sku}</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-sm font-bold text-gray-800">${p.profit.toFixed(0)}</div>
                          <div className="text-[10px] text-emerald-600 font-medium">ROI: {p.roi.toFixed(0)}%</div>
                       </div>
                    </div>
                 ))}
                 {data.topProducts.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-2">暂无数据</div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
