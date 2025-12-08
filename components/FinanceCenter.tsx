
import React, { useState, useMemo, useEffect } from 'react';
import { FinanceTransaction, FinanceCategory, PurchaseOrder, AppSettings } from '../types';
import { formatCurrency } from '../utils/calculations';
import { generateFinancialReport } from '../services/geminiService';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Filter, PieChart, BarChart3, 
  ArrowUpRight, ArrowDownRight, Calendar, DollarSign, Landmark, CreditCard, 
  Briefcase, Truck, Trash2, X, Package, Sparkles, Activity, Loader2, Bot, 
  Megaphone, ShoppingBag, ArrowRightLeft, Banknote, RefreshCw, Coins, Waves
} from 'lucide-react';

interface FinanceCenterProps {
  transactions: FinanceTransaction[];
  purchaseOrders: PurchaseOrder[]; 
  onAddTransaction: (t: FinanceTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  settings: AppSettings;
}

const CATEGORY_LABELS: Record<string, string> = {
    'Revenue': '营业收入', 'Deposit': '到账金额', 'COGS': '销售成本(COGS)',
    'ProductPurchase': '产品采购费', 'Logistics': '物流运费', 'TikTokAds': 'TikTok广告费',
    'Marketing': '营销推广', 'Rent': '房租水电', 'Salary': '人力成本',
    'Software': '软件服务', 'Withdrawal': '提现金额', 'Exchange': '货币兑换',
    'Other': '其他杂项', 'Custom': '手动录入'
};

// Split categories for linkage
const INCOME_CATEGORIES = ['Revenue', 'Deposit', 'Exchange', 'Other'];
const EXPENSE_CATEGORIES = ['ProductPurchase', 'Logistics', 'TikTokAds', 'Marketing', 'Rent', 'Salary', 'Software', 'Withdrawal', 'Other'];

// --- Sankey Component ---
const SankeyDiagram: React.FC<{
    revenue: number;
    cogs: number;
    logistics: number;
    marketing: number;
    opex: number;
    netProfit: number;
}> = ({ revenue, cogs, logistics, marketing, opex, netProfit }) => {
    
    // Normalize data for visualization if revenue is 0
    const totalFlow = Math.max(revenue, 1);
    
    // Nodes configuration
    const width = 800;
    const height = 400;
    const nodeWidth = 20;
    const padding = 50;

    // Y Positions
    const startY = 150;
    
    // Calculate heights proportional to value
    // Level 1: Revenue
    const hRev = (revenue / totalFlow) * (height - 100);
    
    // Level 2 breakdown
    const hCogs = (cogs / totalFlow) * (height - 100);
    const hLogistics = (logistics / totalFlow) * (height - 100);
    const hMarketing = (marketing / totalFlow) * (height - 100);
    const hOpex = (opex / totalFlow) * (height - 100);
    const hProfit = Math.max((netProfit / totalFlow) * (height - 100), 5); // Min height for visibility

    // Coordinates
    // Source
    const x0 = padding;
    const y0 = (height - hRev) / 2;

    // Destination X
    const x1 = width - padding - nodeWidth;

    // Destination Ys (Stacked)
    let currentY = (height - (hCogs + hLogistics + hMarketing + hOpex + hProfit + 40)) / 2; // 40 is gaps
    
    const destNodes = [
        { label: '采购成本', value: cogs, h: hCogs, color: '#f97316', y: currentY }, // Orange
        { label: '物流运费', value: logistics, h: hLogistics, color: '#3b82f6', y: currentY += hCogs + 10 }, // Blue
        { label: '营销广告', value: marketing, h: hMarketing, color: '#a855f7', y: currentY += hLogistics + 10 }, // Purple
        { label: '运营杂项', value: opex, h: hOpex, color: '#64748b', y: currentY += hMarketing + 10 }, // Slate
        { label: '净利润', value: netProfit, h: hProfit, color: '#10b981', y: currentY += hOpex + 10 }, // Emerald
    ];

    // Helper to draw bezier path
    const drawPath = (sy: number, sh: number, dy: number, dh: number, color: string) => {
        const c1x = x0 + (width / 3);
        const c2x = x1 - (width / 3);
        // Center of the band
        const sourceCenter = sy + sh/2;
        const destCenter = dy + dh/2;
        
        // We draw a thick stroke instead of a filled shape for simpler implementation
        return (
            <path 
                d={`M ${x0 + nodeWidth} ${sourceCenter} C ${c1x} ${sourceCenter}, ${c2x} ${destCenter}, ${x1} ${destCenter}`}
                stroke={color}
                strokeWidth={Math.max(dh, 2)}
                fill="none"
                opacity="0.4"
                className="hover:opacity-80 transition-opacity duration-500 cursor-pointer"
            >
                <animate 
                    attributeName="stroke-dasharray" 
                    from="0, 1000" 
                    to="1000, 0" 
                    dur="2s" 
                    fill="freeze" 
                />
            </path>
        );
    };

    return (
        <div className="w-full h-[400px] bg-slate-900 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-center shadow-inner bg-grid-pattern">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                <defs>
                    <linearGradient id="gradRev" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>

                {/* Source Node (Revenue) */}
                <g>
                    <rect x={x0} y={y0} width={nodeWidth} height={hRev} fill="url(#gradRev)" rx="4" />
                    <text x={x0} y={y0 - 10} fill="#22d3ee" fontSize="14" fontWeight="bold" className="font-mono">总营收</text>
                    <text x={x0} y={y0 + hRev + 20} fill="#94a3b8" fontSize="12" className="font-mono">¥{(revenue/1000).toFixed(1)}k</text>
                </g>

                {/* Links */}
                {(() => {
                    let sourceYOffset = y0;
                    return destNodes.map((node, i) => {
                        if (node.value <= 0) return null;
                        const linkHeight = (node.value / revenue) * hRev;
                        const path = drawPath(sourceYOffset, linkHeight, node.y, node.h, node.color);
                        sourceYOffset += linkHeight;
                        return <g key={i}>{path}</g>;
                    });
                })()}

                {/* Destination Nodes */}
                {destNodes.map((node, i) => {
                    if (node.value <= 0) return null;
                    return (
                        <g key={i}>
                            <rect x={x1} y={node.y} width={nodeWidth} height={node.h} fill={node.color} rx="4" />
                            <text x={x1 + 30} y={node.y + node.h/2 + 5} fill={node.color} fontSize="12" fontWeight="bold" className="font-mono">
                                {node.label}
                            </text>
                            <text x={x1 + 30} y={node.y + node.h/2 + 20} fill="#64748b" fontSize="10" className="font-mono">
                                {((node.value/revenue)*100).toFixed(1)}%
                            </text>
                        </g>
                    );
                })}
            </svg>
            
            {revenue === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 bg-slate-900/80 backdrop-blur-sm">
                    暂无本月收支数据
                </div>
            )}
        </div>
    );
};


export const FinanceCenter: React.FC<FinanceCenterProps> = ({ 
  transactions, purchaseOrders, onAddTransaction, onDeleteTransaction, settings
}) => {
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Flow' | 'Ledger' | 'Wallet'>('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 
  
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const [form, setForm] = useState<Partial<FinanceTransaction>>({
      type: 'Expense', currency: 'CNY', date: new Date().toISOString().split('T')[0], category: 'ProductPurchase'
  });
  const [customCategory, setCustomCategory] = useState('');

  // --- Linkage Logic: Reset category when type changes ---
  const availableCategories = useMemo(() => {
      return form.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }, [form.type]);

  // Ensure category is valid when switching types
  useEffect(() => {
      if (form.type && !availableCategories.includes(form.category as string) && form.category !== 'Custom') {
          setForm(prev => ({ ...prev, category: availableCategories[0] as any }));
      }
  }, [form.type, availableCategories]);

  // --- Data Engine ---
  const combinedTransactions = useMemo(() => {
      const poTransactions: FinanceTransaction[] = purchaseOrders
          .filter(po => po.status !== 'Cancelled' && po.status !== 'Draft')
          .map(po => ({
              id: `PO-${po.id}`, date: po.date, type: 'Expense', category: 'ProductPurchase',
              amount: po.totalAmountCNY, currency: 'CNY', description: `采购单: ${po.poNumber} (${po.productName})`,
              isSystemGenerated: true, referenceId: po.id
          }));
      return [...transactions, ...poTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, purchaseOrders]);

  const walletBalances = useMemo(() => {
      let cny = 0; let usd = 0;
      combinedTransactions.forEach(t => {
          const val = t.type === 'Income' ? t.amount : -t.amount;
          if (t.currency === 'CNY') cny += val; else usd += val;
      });
      return { cny, usd };
  }, [combinedTransactions]);

  const currentMonthData = useMemo(() => combinedTransactions.filter(t => t.date.startsWith(filterMonth)), [combinedTransactions, filterMonth]);
  
  const calculateFinancials = (data: FinanceTransaction[]) => {
      let revenue = 0; let cogs = 0; let opex = 0; 
      let logistics = 0; let marketing = 0;
      const breakdown: Record<string, number> = {};
      
      data.forEach(t => {
          const amountCNY = t.currency === 'USD' ? t.amount * settings.exchangeRate : t.amount;
          if (t.type === 'Income') {
              revenue += amountCNY;
          } else {
              breakdown[t.category] = (breakdown[t.category] || 0) + amountCNY;
              
              if (['COGS', 'ProductPurchase'].includes(t.category)) cogs += amountCNY;
              else if (t.category === 'Logistics') logistics += amountCNY;
              else if (['Marketing', 'TikTokAds'].includes(t.category)) marketing += amountCNY;
              else if (t.category !== 'Withdrawal' && t.category !== 'Exchange') opex += amountCNY; // Other OPEX
          }
      });
      const grossProfit = revenue - cogs;
      const netProfit = revenue - cogs - logistics - marketing - opex;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      
      return { revenue, cogs, logistics, marketing, opex, grossProfit, netProfit, grossMargin, breakdown, totalExpense: cogs + logistics + marketing + opex };
  };

  const currentStats = calculateFinancials(currentMonthData);

  const trendChartData = useMemo(() => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
          const d = new Date(); d.setMonth(d.getMonth() - i);
          const mStr = d.toISOString().slice(0, 7);
          const data = combinedTransactions.filter(t => t.date.startsWith(mStr));
          months.push({ month: mStr.slice(5), ...calculateFinancials(data) });
      }
      return months;
  }, [combinedTransactions, settings.exchangeRate]);

  // --- Handlers ---
  const handleAiAnalysis = async () => {
      setIsAiAnalyzing(true);
      const res = await generateFinancialReport([], {
          revenue: currentStats.revenue, cogs: currentStats.cogs, opex: currentStats.opex + currentStats.logistics + currentStats.marketing,
          netProfit: currentStats.netProfit, netMargin: currentStats.revenue > 0 ? (currentStats.netProfit/currentStats.revenue)*100 : 0,
          breakdown: currentStats.breakdown, trend: trendChartData.map(t => ({ month: t.month, revenue: t.revenue, profit: t.netProfit }))
      });
      setAiReport(res); setIsAiAnalyzing(false);
  };

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      const finalCategory = form.category === 'Custom' ? customCategory.trim() : form.category;
      if (!form.amount || !finalCategory) return;
      onAddTransaction({
          id: Date.now().toString(), date: form.date || new Date().toISOString().split('T')[0],
          type: form.type as 'Income' | 'Expense', category: finalCategory as FinanceCategory,
          amount: Number(form.amount), currency: form.currency as 'CNY' | 'USD',
          description: form.description || '', isSystemGenerated: false
      });
      setIsModalOpen(false); 
      // Reset form but keep date
      setForm(prev => ({ 
          type: 'Expense', 
          currency: 'CNY', 
          date: prev.date, 
          amount: '' as any, 
          description: '',
          category: 'ProductPurchase'
      }));
  };

  const renderTrendChart = () => {
      const height = 160; const width = 600; const padding = 20;
      const maxVal = Math.max(...trendChartData.map(d => Math.max(d.revenue, d.totalExpense)), 1000);
      const getX = (i: number) => (i / (trendChartData.length - 1)) * (width - 2 * padding) + padding;
      const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);
      const pointsRev = trendChartData.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
      const pointsExp = trendChartData.map((d, i) => `${getX(i)},${getY(d.totalExpense)}`).join(' ');

      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#334155" />
              <polyline points={pointsRev} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" style={{filter: 'drop-shadow(0 0 4px #10b981)'}} />
              <polyline points={pointsExp} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" opacity="0.8" />
              {trendChartData.map((d, i) => (
                  <g key={i} className="group">
                      <circle cx={getX(i)} cy={getY(d.revenue)} r="4" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                      <text x={getX(i)} y={height} dy="15" textAnchor="middle" fontSize="10" fill="#64748b" className="font-mono">{d.month}</text>
                  </g>
              ))}
          </svg>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        {/* Header */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2 text-glow">
                    <Wallet className="text-cyan-400" size={24} />
                    财务指挥中心 (Finance Center)
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-mono tracking-wide">
                    REALTIME P&L ANALYSIS // 实时盈亏分析系统
                </p>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleAiAnalysis}
                    disabled={isAiAnalyzing}
                    className="flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-xl text-xs font-bold border border-purple-500/30 hover:bg-purple-500/30 transition-all shadow-glow-purple"
                >
                    {isAiAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
                    AI 首席财务官洞察
                </button>

                <div className="flex items-center bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                    <Calendar size={16} className="text-slate-400 mr-2" />
                    <input 
                        type="month" 
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="bg-transparent text-sm font-bold text-white outline-none font-mono"
                    />
                </div>
                
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                    {['Dashboard', 'Flow', 'Wallet', 'Ledger'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === t ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            {t === 'Dashboard' ? '报表' : t === 'Flow' ? '流向' : t === 'Wallet' ? '钱包' : '流水'}
                        </button>
                    ))}
                </div>
                
                <button onClick={() => setIsModalOpen(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black p-2.5 rounded-xl shadow-glow-cyan transition-all active:scale-95">
                    <Plus size={20} strokeWidth={3} />
                </button>
            </div>
        </div>

        {activeTab === 'Wallet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {/* USD Wallet */}
                <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-3xl p-8 border border-emerald-500/30 shadow-glass relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-white/5 rounded-xl backdrop-blur-md border border-white/10">
                                <DollarSign size={32} className="text-emerald-400"/>
                            </div>
                            <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">美金账户 (USD)</span>
                        </div>
                        <div className="mt-8">
                            <p className="text-emerald-400/60 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</p>
                            <h3 className="text-5xl font-black text-white tracking-tight font-mono text-glow">${formatCurrency(walletBalances.usd, 'USD').replace('$','')}</h3>
                            <p className="text-xs text-slate-400 mt-2 font-mono">≈ ¥{formatCurrency(walletBalances.usd * settings.exchangeRate, 'CNY').replace('¥','')}</p>
                        </div>
                    </div>
                </div>

                {/* CNY Wallet */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 border border-indigo-500/30 shadow-glass relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-white/5 rounded-xl backdrop-blur-md border border-white/10">
                                <Coins size={32} className="text-indigo-400"/>
                            </div>
                            <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/30">人民币账户 (CNY)</span>
                        </div>
                        <div className="mt-8">
                            <p className="text-indigo-400/60 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</p>
                            <h3 className="text-5xl font-black text-white tracking-tight font-mono text-glow">¥{formatCurrency(walletBalances.cny, 'CNY').replace('¥','')}</h3>
                            <p className="text-xs text-slate-400 mt-2 font-mono">国内采购运营资金</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- Flow View (Sankey) --- */}
        {activeTab === 'Flow' && (
            <div className="animate-fade-in space-y-6">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 text-glow">
                        <Waves size={20} className="text-cyan-400" /> 资金流向桑基图 (Sankey)
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                        本月流向分析 ({filterMonth})
                    </p>
                </div>
                
                <SankeyDiagram 
                    revenue={currentStats.revenue}
                    cogs={currentStats.cogs}
                    logistics={currentStats.logistics}
                    marketing={currentStats.marketing}
                    opex={currentStats.opex}
                    netProfit={currentStats.netProfit}
                />

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[{l:'总营收', v: currentStats.revenue, c:'cyan'}, {l:'采购成本', v: currentStats.cogs, c:'orange'}, {l:'物流', v: currentStats.logistics, c:'blue'}, {l:'营销', v: currentStats.marketing, c:'purple'}, {l:'净利', v: currentStats.netProfit, c:'emerald'}].map((item,i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                            <p className={`text-[10px] uppercase font-bold text-${item.c}-400 mb-1`}>{item.l}</p>
                            <p className="text-white font-mono font-bold">¥{(item.v/1000).toFixed(1)}k</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'Dashboard' && (
            <div className="space-y-6">
                
                {/* AI Insight */}
                {aiReport && (
                    <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-purple-500/30 shadow-glow-purple relative overflow-hidden animate-slide-up">
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <h3 className="font-bold text-purple-300 flex items-center gap-2">
                                <Sparkles className="text-purple-400 animate-pulse" size={20}/>
                                AI 首席财务官洞察 (CFO Insights)
                            </h3>
                            <button onClick={() => setAiReport(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: aiReport }}></div>
                    </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-panel p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">营业收入 (Revenue)</p>
                        <h3 className="text-2xl font-black text-white font-mono">¥{formatCurrency(currentStats.revenue, 'CNY').replace('¥','')}</h3>
                        <div className="h-1 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-cyan-400 w-full shadow-[0_0_5px_#00f2ea]"></div>
                        </div>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">毛利润 (Gross Profit)</p>
                        <h3 className="text-2xl font-black text-white font-mono">¥{formatCurrency(currentStats.grossProfit, 'CNY').replace('¥','')}</h3>
                        <p className="text-xs text-emerald-400 mt-2 font-mono">毛利率: {currentStats.grossMargin.toFixed(1)}%</p>
                    </div>
                    <div className={`p-5 rounded-2xl border transition-colors ${currentStats.netProfit >= 0 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${currentStats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>净利润 (Net Profit)</p>
                        <h3 className={`text-2xl font-black font-mono ${currentStats.netProfit >= 0 ? 'text-emerald-300 text-glow' : 'text-red-300 text-glow'}`}>
                            {currentStats.netProfit > 0 ? '+' : ''}¥{formatCurrency(currentStats.netProfit, 'CNY').replace('¥','')}
                        </h3>
                    </div>
                    <div className="glass-panel p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">运营支出 (OPEX)</p>
                        <h3 className="text-2xl font-black text-white font-mono">¥{formatCurrency(currentStats.opex + currentStats.logistics + currentStats.marketing, 'CNY').replace('¥','')}</h3>
                        <p className="text-xs text-orange-400 mt-2 font-mono">占比: {currentStats.revenue > 0 ? (((currentStats.opex+currentStats.logistics+currentStats.marketing) / currentStats.revenue)*100).toFixed(1) : 0}%</p>
                    </div>
                </div>

                {/* Trend Chart Area */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-grid-pattern relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h4 className="font-bold text-white flex items-center gap-2 text-glow">
                            <BarChart3 className="text-cyan-400" size={18} />
                            近6个月现金流趋势 (Cash Flow)
                        </h4>
                        <div className="flex gap-4 text-xs font-mono">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow-green"></span> 收入</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 shadow-glow-red"></span> 支出</div>
                        </div>
                    </div>
                    <div className="h-48 w-full relative z-10">
                        {renderTrendChart()}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'Ledger' && (
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-bold font-mono text-xs uppercase">
                            <tr>
                                <th className="p-4">日期</th>
                                <th className="p-4">分类</th>
                                <th className="p-4">备注 / 关联单号</th>
                                <th className="p-4 text-right">金额</th>
                                <th className="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {currentMonthData.map(t => (
                                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-slate-300">{t.date}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${t.type === 'Income' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                                            {CATEGORY_LABELS[t.category] || t.category}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-300 text-xs">
                                        {t.description}
                                        {t.isSystemGenerated && <span className="ml-2 text-[9px] bg-blue-900/30 text-blue-400 px-1 rounded border border-blue-800">系统生成</span>}
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${t.type === 'Income' ? 'text-emerald-400' : 'text-white'}`}>
                                        {t.type === 'Income' ? '+' : '-'} {formatCurrency(t.amount, t.currency)}
                                    </td>
                                    <td className="p-4 text-right">
                                        {!t.isSystemGenerated && (
                                            <button onClick={() => onDeleteTransaction(t.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Add Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden">
                    <div className="bg-black/40 p-4 flex justify-between items-center text-white border-b border-white/5">
                        <h3 className="font-bold flex items-center gap-2"><Plus size={16} className="text-cyan-400"/> 记一笔</h3>
                        <button onClick={() => setIsModalOpen(false)} className="hover:text-cyan-400"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleAdd} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">收支类型</label>
                                <select 
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500" 
                                    value={form.type} 
                                    onChange={e => setForm({...form, type: e.target.value as any})}
                                >
                                    <option value="Expense" className="text-black">支出 (Expense)</option>
                                    <option value="Income" className="text-black">收入 (Income)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">日期</label>
                                <input type="date" className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">金额</label>
                            <div className="flex gap-2">
                                <select className="w-24 p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold" value={form.currency} onChange={e => setForm({...form, currency: e.target.value as any})}>
                                    <option value="CNY" className="text-black">CNY</option>
                                    <option value="USD" className="text-black">USD</option>
                                </select>
                                <input required type="number" step="0.01" className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg font-mono font-bold outline-none focus:border-cyan-500" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">分类</label>
                            <div className="grid grid-cols-3 gap-2">
                                {availableCategories.map(cat => (
                                    <button key={cat} type="button" onClick={() => { setForm(prev => ({...prev, category: cat as any})); if(cat !== 'Custom') setCustomCategory(''); }} className={`px-2 py-2 rounded-lg text-[10px] font-bold border transition-all ${form.category === cat ? 'bg-cyan-600 text-white border-cyan-500 shadow-glow-cyan' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>
                                        {CATEGORY_LABELS[cat]}
                                    </button>
                                ))}
                                <button type="button" onClick={() => setForm(prev => ({...prev, category: 'Custom' as any}))} className={`px-2 py-2 rounded-lg text-[10px] font-bold border transition-all ${form.category === 'Custom' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>
                                    ✍️ 手动
                                </button>
                            </div>
                            {form.category === 'Custom' && (
                                <input type="text" placeholder="输入分类名称" className="w-full mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500" value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
                            )}
                        </div>
                        <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3.5 rounded-xl shadow-glow-cyan mt-4 transition-all active:scale-95">
                            确认记账
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
