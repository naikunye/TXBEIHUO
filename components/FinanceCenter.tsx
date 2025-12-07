
import React, { useState, useMemo } from 'react';
import { FinanceTransaction, FinanceCategory, PurchaseOrder, AppSettings } from '../types';
import { formatCurrency } from '../utils/calculations';
import { generateFinancialReport } from '../services/geminiService';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  PieChart, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  DollarSign,
  Landmark,
  CreditCard,
  Briefcase,
  Truck,
  Trash2,
  X,
  Package,
  Sparkles,
  Activity,
  Loader2,
  Target,
  Bot
} from 'lucide-react';

interface FinanceCenterProps {
  transactions: FinanceTransaction[];
  purchaseOrders: PurchaseOrder[]; 
  onAddTransaction: (t: FinanceTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  settings: AppSettings;
}

const CATEGORY_LABELS: Record<string, string> = {
    'Revenue': '营业收入',
    'COGS': '采购成本',
    'Logistics': '物流运费',
    'Marketing': '营销推广',
    'Rent': '房租水电',
    'Salary': '人力成本',
    'Software': '软件服务',
    'Other': '其他杂项'
};

const MANUAL_CATEGORIES: FinanceCategory[] = ['Revenue', 'Marketing', 'Logistics', 'Rent', 'Salary', 'Software', 'Other'];

export const FinanceCenter: React.FC<FinanceCenterProps> = ({ 
  transactions, 
  purchaseOrders, 
  onAddTransaction, 
  onDeleteTransaction,
  settings
}) => {
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Ledger'>('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // AI State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Form State
  const [form, setForm] = useState<Partial<FinanceTransaction>>({
      type: 'Expense',
      currency: 'CNY',
      date: new Date().toISOString().split('T')[0]
  });

  // --- 1. Data Processing Engine ---
  const combinedTransactions = useMemo(() => {
      // Auto-generate COGS from POs (Only "Shipped" or "Arrived" implies cost incurred usually, or "Ordered" depending on accounting principle. Using Ordered for cash flow view)
      const poTransactions: FinanceTransaction[] = purchaseOrders
          .filter(po => po.status !== 'Cancelled' && po.status !== 'Draft')
          .map(po => ({
              id: `PO-${po.id}`,
              date: po.date,
              type: 'Expense',
              category: 'COGS',
              amount: po.totalAmountCNY,
              currency: 'CNY',
              description: `采购单: ${po.poNumber} (${po.productName})`,
              isSystemGenerated: true,
              referenceId: po.id
          }));

      return [...transactions, ...poTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, purchaseOrders]);

  // Current Month Data
  const currentMonthData = useMemo(() => {
      return combinedTransactions.filter(t => t.date.startsWith(filterMonth));
  }, [combinedTransactions, filterMonth]);

  // Previous Month Data (for MoM calculation)
  const prevMonthData = useMemo(() => {
      const d = new Date(filterMonth + "-01");
      d.setMonth(d.getMonth() - 1);
      const prevMonthStr = d.toISOString().slice(0, 7);
      return combinedTransactions.filter(t => t.date.startsWith(prevMonthStr));
  }, [combinedTransactions, filterMonth]);

  // Financial Metrics Calculator
  const calculateFinancials = (data: FinanceTransaction[]) => {
      let revenue = 0;
      let cogs = 0; // Cost of Goods Sold
      let opex = 0; // Operating Expenses
      const breakdown: Record<string, number> = {};

      data.forEach(t => {
          const amountCNY = t.currency === 'USD' ? t.amount * settings.exchangeRate : t.amount;
          
          if (t.type === 'Income') {
              revenue += amountCNY;
          } else {
              breakdown[t.category] = (breakdown[t.category] || 0) + amountCNY;
              if (t.category === 'COGS' || t.category === 'Logistics') {
                  cogs += amountCNY; // Group Logistics into COGS for Gross Margin usually, or separate. Let's keep Logistics in COGS for E-commerce Gross Profit view.
              } else {
                  opex += amountCNY;
              }
          }
      });

      const grossProfit = revenue - cogs;
      const netProfit = revenue - cogs - opex;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return { revenue, cogs, opex, grossProfit, netProfit, grossMargin, netMargin, breakdown, totalExpense: cogs + opex };
  };

  const currentStats = calculateFinancials(currentMonthData);
  const prevStats = calculateFinancials(prevMonthData);

  // Trend Helpers
  const getTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
  };

  // Trend Chart Data (Last 6 Months)
  const trendChartData = useMemo(() => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const mStr = d.toISOString().slice(0, 7);
          const data = combinedTransactions.filter(t => t.date.startsWith(mStr));
          const stats = calculateFinancials(data);
          months.push({ month: mStr.slice(5), ...stats });
      }
      return months;
  }, [combinedTransactions, settings.exchangeRate]);

  // --- Handlers ---
  const handleAiAnalysis = async () => {
      setIsAiAnalyzing(true);
      
      const context = {
          revenue: currentStats.revenue,
          cogs: currentStats.cogs,
          opex: currentStats.opex,
          netProfit: currentStats.netProfit,
          netMargin: currentStats.netMargin,
          breakdown: currentStats.breakdown,
          trend: trendChartData.map(t => ({ month: t.month, revenue: t.revenue, profit: t.netProfit }))
      };

      const res = await generateFinancialReport([], context);
      
      setAiReport(res); 
      setIsAiAnalyzing(false);
  };

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.amount || !form.category) return;
      onAddTransaction({
          id: Date.now().toString(),
          date: form.date || new Date().toISOString().split('T')[0],
          type: form.type as 'Income' | 'Expense',
          category: form.category as FinanceCategory,
          amount: Number(form.amount),
          currency: form.currency as 'CNY' | 'USD',
          description: form.description || '',
          isSystemGenerated: false
      });
      setIsModalOpen(false);
      setForm({ type: 'Expense', currency: 'CNY', date: new Date().toISOString().split('T')[0], amount: '' as any, description: '' });
  };

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'Revenue': return <TrendingUp size={16} />;
          case 'COGS': return <Package size={16} />;
          case 'Logistics': return <Truck size={16} />;
          case 'Salary': return <Briefcase size={16} />;
          case 'Rent': return <Landmark size={16} />;
          default: return <CreditCard size={16} />;
      }
  };

  // --- Render Chart (SVG) ---
  const renderTrendChart = () => {
      const height = 160;
      const width = 600;
      const padding = 20;
      const maxVal = Math.max(...trendChartData.map(d => Math.max(d.revenue, d.totalExpense)), 1000);
      
      const getX = (i: number) => (i / (trendChartData.length - 1)) * (width - 2 * padding) + padding;
      const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

      const pointsRev = trendChartData.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
      const pointsExp = trendChartData.map((d, i) => `${getX(i)},${getY(d.totalExpense)}`).join(' ');
      const pointsNet = trendChartData.map((d, i) => `${getX(i)},${getY(Math.max(0, d.netProfit))}`).join(' '); // Clip negative for simple line

      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              {/* Grid */}
              <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e5e7eb" />
              <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#f3f4f6" strokeDasharray="4"/>
              
              {/* Lines */}
              <polyline points={pointsRev} fill="none" stroke="#10b981" strokeWidth="2" />
              <polyline points={pointsExp} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4"/>
              
              {/* Areas/Dots */}
              {trendChartData.map((d, i) => (
                  <g key={i} className="group">
                      <circle cx={getX(i)} cy={getY(d.revenue)} r="3" fill="#10b981" />
                      <circle cx={getX(i)} cy={getY(d.totalExpense)} r="3" fill="#ef4444" />
                      
                      {/* Tooltip */}
                      <foreignObject x={getX(i)-40} y={0} width="80" height="100%" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="h-full flex items-center justify-center">
                              <div className="bg-slate-800 text-white text-[10px] p-2 rounded shadow-xl">
                                  <div className="font-bold mb-1">{d.month}</div>
                                  <div className="text-green-400">收: ¥{(d.revenue/1000).toFixed(1)}k</div>
                                  <div className="text-red-400">支: ¥{(d.totalExpense/1000).toFixed(1)}k</div>
                                  <div className="border-t border-slate-600 mt-1 pt-1">净: ¥{(d.netProfit/1000).toFixed(1)}k</div>
                              </div>
                          </div>
                      </foreignObject>
                      
                      <text x={getX(i)} y={height} dy="15" textAnchor="middle" fontSize="10" fill="#9ca3af">{d.month}</text>
                  </g>
              ))}
          </svg>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        {/* 1. Header & Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-5 rounded-2xl border border-gray-200 shadow-sm gap-4">
            <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Wallet className="text-slate-900" size={24} />
                    财务指挥中心
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">FinOps v2.0</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    全维度经营分析 | 利润 = 营收 - (采购 + 物流 + 运营)
                </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {/* AI CFO Button */}
                <button 
                    onClick={handleAiAnalysis}
                    disabled={isAiAnalyzing}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-purple-200 transition-all active:scale-95"
                >
                    {isAiAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {isAiAnalyzing ? 'AI 审计中...' : 'AI 财务诊断'}
                </button>

                <div className="h-8 w-px bg-gray-200 hidden lg:block"></div>

                <div className="flex items-center bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                    <Calendar size={16} className="text-gray-400 mr-2" />
                    <input 
                        type="month" 
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                    />
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('Dashboard')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'Dashboard' ? 'bg-white shadow text-slate-900' : 'text-gray-500 hover:text-gray-700'}`}>经营报表</button>
                    <button onClick={() => setActiveTab('Ledger')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'Ledger' ? 'bg-white shadow text-slate-900' : 'text-gray-500 hover:text-gray-700'}`}>流水明细</button>
                </div>
                
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl shadow-lg transition-all active:scale-95">
                    <Plus size={20} />
                </button>
            </div>
        </div>

        {activeTab === 'Dashboard' ? (
            <div className="space-y-6">
                
                {/* 2. AI Insight Card (Conditional) */}
                {aiReport && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100 shadow-sm relative overflow-hidden animate-slide-up">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles size={100} className="text-purple-600"/>
                        </div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <h3 className="font-bold text-purple-900 flex items-center gap-2">
                                <Bot className="text-purple-600" size={20}/>
                                AI 首席财务官洞察
                            </h3>
                            <button onClick={() => setAiReport(null)} className="text-purple-400 hover:text-purple-600"><X size={16}/></button>
                        </div>
                        <div className="prose prose-sm max-w-none text-purple-800 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: aiReport }}></div>
                    </div>
                )}

                {/* 3. KPI Metrics Grid (MoM Enhanced) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Revenue */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">总营收 (Revenue)</span>
                            <div className={`p-1.5 rounded-lg ${currentStats.revenue >= prevStats.revenue ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {currentStats.revenue >= prevStats.revenue ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">¥{formatCurrency(currentStats.revenue, 'CNY').replace('¥','')}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className={currentStats.revenue >= prevStats.revenue ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                {getTrend(currentStats.revenue, prevStats.revenue).toFixed(1)}%
                            </span>
                            <span className="text-gray-400">环比上月</span>
                        </div>
                    </div>

                    {/* Gross Profit */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">毛利润 (Gross)</span>
                            <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {currentStats.grossMargin.toFixed(1)}%
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">¥{formatCurrency(currentStats.grossProfit, 'CNY').replace('¥','')}</h3>
                        <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{width: `${Math.max(0, currentStats.grossMargin)}%`}}></div>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">目标毛利: 40%</div>
                    </div>

                    {/* Net Profit */}
                    <div className={`p-5 rounded-2xl border shadow-sm text-white ${currentStats.netProfit >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-red-600 border-red-700'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold opacity-60 uppercase tracking-wider">净利润 (Net)</span>
                            <Wallet size={18} className="opacity-80"/>
                        </div>
                        <h3 className="text-2xl font-bold">
                            {currentStats.netProfit > 0 ? '+' : ''}¥{formatCurrency(currentStats.netProfit, 'CNY').replace('¥','')}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded font-mono">
                                净利率: {currentStats.netMargin.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Opex Ratio */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">运营支出 (OPEX)</span>
                            <Activity size={18} className="text-orange-500"/>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">¥{formatCurrency(currentStats.opex, 'CNY').replace('¥','')}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            占营收比: 
                            <span className="text-orange-600 font-bold">
                                {currentStats.revenue > 0 ? ((currentStats.opex / currentStats.revenue)*100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Trend Analysis & P&L Structure */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left: 6-Month Trend */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <BarChart3 className="text-blue-600" size={18} />
                                资金趋势 (近6个月)
                            </h4>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 营收</div>
                                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 支出</div>
                            </div>
                        </div>
                        <div className="h-48 w-full">
                            {renderTrendChart()}
                        </div>
                    </div>

                    {/* Right: Cost Breakdown Donut */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-6">
                            <PieChart className="text-purple-600" size={18} />
                            本月支出结构
                        </h4>
                        <div className="flex-1 flex items-center justify-center gap-6">
                            {/* CSS Conic Gradient Donut */}
                            <div className="relative w-40 h-40 rounded-full flex-shrink-0" 
                                style={{ 
                                    background: `conic-gradient(
                                        #3b82f6 0% ${((currentStats.breakdown['COGS']||0)/currentStats.totalExpense)*100}%, 
                                        #f59e0b ${((currentStats.breakdown['COGS']||0)/currentStats.totalExpense)*100}% ${((currentStats.breakdown['COGS']||0)/currentStats.totalExpense)*100 + ((currentStats.breakdown['Logistics']||0)/currentStats.totalExpense)*100}%, 
                                        #ef4444 ${((currentStats.breakdown['COGS']||0)/currentStats.totalExpense)*100 + ((currentStats.breakdown['Logistics']||0)/currentStats.totalExpense)*100}% 100%
                                    )` 
                                }}>
                                <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
                                    <span className="text-xs text-gray-400">Total Exp</span>
                                    <span className="font-bold text-gray-900">¥{(currentStats.totalExpense/1000).toFixed(0)}k</span>
                                </div>
                            </div>
                            <div className="text-xs space-y-2">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> 采购 {(currentStats.breakdown['COGS']||0).toLocaleString()}</div>
                                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> 物流 {(currentStats.breakdown['Logistics']||0).toLocaleString()}</div>
                                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full"></span> 运营 {(currentStats.opex).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Health Check Banner */}
                {currentStats.netMargin < 10 && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-sm text-red-800 animate-pulse">
                        <Target size={18} />
                        <strong>预警：</strong> 本月净利率 ({currentStats.netMargin.toFixed(1)}%) 低于健康水平 (10%)，建议检查 {currentStats.breakdown['Marketing'] > currentStats.breakdown['Logistics'] ? '广告投放效率' : '头程物流成本'}。
                    </div>
                )}

            </div>
        ) : (
            // Ledger View (Compact & Clean)
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                            <tr>
                                <th className="p-4">日期</th>
                                <th className="p-4">收支科目</th>
                                <th className="p-4">摘要 / 关联单据</th>
                                <th className="p-4 text-right">金额</th>
                                <th className="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentMonthData.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-mono text-gray-600">{t.date}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${t.type === 'Income' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {getCategoryIcon(t.category)}
                                            {CATEGORY_LABELS[t.category] || t.category}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-800">
                                        {t.description}
                                        {t.isSystemGenerated && <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100">自动</span>}
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-gray-900'}`}>
                                        {t.type === 'Income' ? '+' : '-'} {formatCurrency(t.amount, t.currency)}
                                    </td>
                                    <td className="p-4 text-right">
                                        {!t.isSystemGenerated && (
                                            <button onClick={() => onDeleteTransaction(t.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {currentMonthData.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">暂无记录</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Add Modal (Standardized) */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                        <h3 className="font-bold">记一笔 (New Transaction)</h3>
                        <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
                    </div>
                    <form onSubmit={handleAdd} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">类型</label>
                                <select className="w-full p-2.5 rounded-lg border bg-white text-gray-900 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                                    <option value="Expense">支出 (Expense)</option>
                                    <option value="Income">收入 (Income)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">日期</label>
                                <input type="date" className="w-full p-2.5 rounded-lg border bg-white text-gray-900 text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">金额</label>
                            <div className="flex gap-2">
                                <select className="w-24 p-2.5 rounded-lg border bg-gray-50 text-gray-900 text-sm" value={form.currency} onChange={e => setForm({...form, currency: e.target.value as any})}>
                                    <option value="CNY">CNY</option>
                                    <option value="USD">USD</option>
                                </select>
                                <input required type="number" step="0.01" className="flex-1 p-2.5 rounded-lg border bg-white text-gray-900 text-sm font-bold" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">科目</label>
                            <div className="grid grid-cols-3 gap-2">
                                {MANUAL_CATEGORIES.map(cat => (
                                    <button key={cat} type="button" onClick={() => setForm({...form, category: cat})} className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${form.category === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                        {CATEGORY_LABELS[cat] || cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">备注</label>
                            <input type="text" className="w-full p-2.5 rounded-lg border bg-white text-gray-900 text-sm" placeholder="说明..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                        </div>
                        <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 shadow-lg mt-2">
                            确认保存
                        </button>
                    </form>
                </div>
            </div>
        )}

    </div>
  );
};
