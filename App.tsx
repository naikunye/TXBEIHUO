import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Ship, 
  Plane, 
  DollarSign, 
  TrendingUp, 
  Package, 
  BrainCircuit,
  Loader2,
  PieChart,
  List,
  Menu,
  ChevronRight,
  Edit,
  Box,
  Calculator,
  Search,
  Container,
  Truck,
  X,
  Download,
  Save,
  Home,
  Filter,
  CloudUpload
} from 'lucide-react';
import { ReplenishmentRecord } from './types';
import { MOCK_DATA_INITIAL } from './constants';
import { calculateMetrics, formatCurrency } from './utils/calculations';
import { StatsCard } from './components/StatsCard';
import { RecordModal } from './components/RecordModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CalculatorTool } from './components/CalculatorTool';
import { LogisticsTools } from './components/LogisticsTools';
import { HomeOverview } from './components/HomeOverview'; 
import { CloudConnect } from './components/CloudConnect'; 
import { analyzeInventory } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

type ViewState = 'overview' | 'inventory' | 'analytics' | 'calculator' | 'logistics';

function App() {
  // --- Cloud & Workspace State ---
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    // Safety check: if we have an ID but no DB config, ignore the ID and clear it
    // This prevents the "stuck on workspace ID input" loop if config was cleared
    const savedId = localStorage.getItem('tanxing_current_workspace');
    if (savedId && !isSupabaseConfigured()) {
        localStorage.removeItem('tanxing_current_workspace');
        return null;
    }
    return savedId;
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Data State ---
  const [records, setRecords] = useState<ReplenishmentRecord[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ReplenishmentRecord | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('overview'); 

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Planning' | 'Shipped' | 'Arrived'>('All');

  // --- Storage Effects ---

  // 1. Load Data (Supabase OR LocalStorage)
  useEffect(() => {
    const loadData = async () => {
        setIsSyncing(true);
        
        if (workspaceId) {
            // --- Supabase Cloud Load ---
            try {
                // Check if configured before making request to avoid errors
                if (isSupabaseConfigured()) {
                    const { data, error } = await supabase
                        .from('replenishment_data')
                        .select('json_content')
                        .eq('workspace_id', workspaceId);

                    if (error) {
                        console.error("Supabase load error:", error);
                        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
                            alert("数据库连接认证失败，请重新配置 API Key。");
                            setWorkspaceId(null);
                        }
                    } else if (data) {
                        // Extract the JSON content back to Record array
                        const cloudRecords = data.map(row => row.json_content as ReplenishmentRecord);
                        // Sort by date desc
                        cloudRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        setRecords(cloudRecords);
                    }
                } else {
                    // Fallback if config missing
                    setWorkspaceId(null);
                }
            } catch (err) {
                console.error("Connection failed:", err);
            }
        } else {
            // --- Local Storage Load ---
            await new Promise(r => setTimeout(r, 200)); // Simulate UI consistency
            const saved = localStorage.getItem('tanxing_records');
            if (saved) {
                try {
                    setRecords(JSON.parse(saved));
                } catch (e) {
                    setRecords([]);
                }
            } else {
                setRecords([...MOCK_DATA_INITIAL]);
            }
        }
        
        setIsDataLoaded(true);
        setIsSyncing(false);
    };

    loadData();
  }, [workspaceId]);

  // 2. Save Data (LocalStorage Only - Auto Backup)
  useEffect(() => {
    if (!isDataLoaded) return;
    
    // Only auto-save entire array to local storage if NOT in cloud mode
    // If in cloud mode, we trust Supabase + manual sync or atomic updates
    if (!workspaceId) {
        localStorage.setItem('tanxing_records', JSON.stringify(records));
    }
  }, [records, workspaceId, isDataLoaded]);

  // 3. Persist Workspace Selection
  useEffect(() => {
      if (workspaceId) {
          localStorage.setItem('tanxing_current_workspace', workspaceId);
      } else {
          localStorage.removeItem('tanxing_current_workspace');
      }
  }, [workspaceId]);


  // Filter Logic
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        record.productName.toLowerCase().includes(q) ||
        record.sku.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  // Handle Create or Update (Supabase Upsert or Local State Update)
  const handleSaveRecord = async (recordData: Omit<ReplenishmentRecord, 'id'>) => {
    let finalRecord: ReplenishmentRecord;

    if (editingRecord) {
        finalRecord = { ...recordData, id: editingRecord.id };
    } else {
        finalRecord = {
            ...recordData,
            id: Math.random().toString(36).substring(7),
        };
    }

    // 1. Optimistic Update (Update UI immediately)
    setRecords(prev => {
        if (editingRecord) {
            return prev.map(r => r.id === editingRecord.id ? finalRecord : r);
        } else {
            return [finalRecord, ...prev];
        }
    });

    closeModal();

    // 2. Cloud Persistence
    if (workspaceId && isSupabaseConfigured()) {
        setIsSyncing(true);
        try {
            // Use JSONB column to store flexible schema
            const { error } = await supabase
                .from('replenishment_data')
                .upsert({ 
                    id: finalRecord.id, 
                    workspace_id: workspaceId, 
                    json_content: finalRecord 
                });

            if (error) {
                console.error("Supabase save error:", error);
                // Optionally revert UI state here if critical
                alert("云端同步失败，请检查网络连接");
            }
        } catch (err) {
            console.error("Supabase error:", err);
        } finally {
            setIsSyncing(false);
        }
    }
  };

  // --- Manual Sync to Cloud (Bulk Upload) ---
  const handleManualSync = async () => {
    if (!workspaceId) {
        alert("请先连接云端工作区 (Workspace) 才能同步数据。");
        return;
    }

    if (!isSupabaseConfigured()) {
        alert("数据库未配置，请先点击右上角配置数据库。");
        return;
    }

    if(records.length === 0) {
        alert("暂无数据可同步。");
        return;
    }

    setIsSyncing(true);
    try {
        // Prepare bulk payload
        const updates = records.map(record => ({
            id: record.id,
            workspace_id: workspaceId,
            json_content: record,
        }));

        const { error } = await supabase
            .from('replenishment_data')
            .upsert(updates);

        if (error) throw error;

        alert(`成功同步 ${records.length} 条记录到云端。`);
    } catch (err: any) {
        console.error("Manual sync failed:", err);
        alert(`同步失败: ${err.message || '未知错误'}`);
    } finally {
        setIsSyncing(false);
    }
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (record: ReplenishmentRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSmartAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const recordsToAnalyze = filteredRecords.length > 0 ? filteredRecords : records;
    const result = await analyzeInventory(recordsToAnalyze);
    const cleanResult = result.replace(/^```html/, '').replace(/```$/, '');
    setAiAnalysis(cleanResult);
    setIsAnalyzing(false);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Product', 'SKU', 'Qty', 'Method', 'Unit Cost(CNY)', 'Sales Price(USD)', 'Total Cost(USD)', 'Profit(USD)', 'Margin(%)', 'ROI(%)', 'Status'];
    const rows = filteredRecords.map(r => {
      const m = calculateMetrics(r);
      return [
        r.date,
        `"${r.productName.replace(/"/g, '""')}"`,
        r.sku,
        r.quantity,
        r.shippingMethod,
        r.unitPriceCNY,
        r.salesPriceUSD,
        m.totalCostPerUnitUSD.toFixed(2),
        m.estimatedProfitUSD.toFixed(2),
        m.marginRate.toFixed(2),
        m.roi.toFixed(2),
        r.status
      ].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tanxing_replenishment_${workspaceId || 'local'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Shipped': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Arrived': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Planning': return '计划中';
      case 'Shipped': return '已发货';
      case 'Arrived': return '已到仓';
      default: return status;
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <HomeOverview records={records} onNavigateToList={() => setCurrentView('inventory')} />;
      case 'calculator':
        return <CalculatorTool />;
      case 'logistics':
        return <LogisticsTools />;
      case 'analytics':
        return <AnalyticsDashboard records={records} />;
      case 'inventory':
      default:
        return (
          <>
             {/* AI Analysis Section */}
             {aiAnalysis && (
                  <div className="mb-8 bg-white rounded-2xl p-6 border border-purple-100 shadow-md animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-2xl opacity-50 -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-purple-50">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <BrainCircuit className="text-purple-600 h-5 w-5" />
                          </div>
                          <h3 className="font-bold text-lg text-gray-800">供应链 AI 诊断报告</h3>
                        </div>
                        <button 
                          onClick={() => setAiAnalysis(null)}
                          className="p-2 hover:bg-purple-50 rounded-full text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="text-gray-600">
                         <div dangerouslySetInnerHTML={{ __html: aiAnalysis }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-fade-in">
                  <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="搜索产品名称或 SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 w-full sm:w-auto">
                      <Filter size={18} className="text-gray-500" />
                      <span className="text-sm text-gray-600 font-medium whitespace-nowrap">状态:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-transparent text-sm font-semibold text-gray-800 outline-none cursor-pointer w-full"
                      >
                        <option value="All">全部 (All)</option>
                        <option value="Planning">计划中 (Planning)</option>
                        <option value="Shipped">已发货 (Shipped)</option>
                        <option value="Arrived">已到仓 (Arrived)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* List Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <List size={18} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">当前清单 ({filteredRecords.length})</span>
                      </div>
                      <button 
                        onClick={handleExportCSV}
                        className="text-gray-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1 transition-colors px-3 py-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 hover:shadow-sm"
                      >
                         <Download size={16} />
                         导出报表 (CSV)
                      </button>
                   </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">日期 / SKU</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">产品信息</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">物流 (Vol & Wgt)</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">成本结构 (USD)</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">销售表现</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">利润与回报</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRecords.map((record) => {
                          const m = calculateMetrics(record);
                          return (
                            <tr 
                                key={record.id} 
                                onClick={() => openEditModal(record)}
                                className="hover:bg-blue-50/50 transition-colors group cursor-pointer relative"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-bold flex items-center gap-2">
                                    {record.date}
                                    <Edit className="w-3 h-3 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(record.status)}`}>
                                    {getStatusLabel(record.status)}
                                  </span>
                                  <span className="text-xs text-gray-500 truncate max-w-[120px]" title={record.warehouse}>
                                    {record.warehouse.split('/')[1] || record.warehouse}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {/* Product Image */}
                                  <div className="flex-shrink-0 h-10 w-10 mr-3">
                                    {record.imageUrl ? (
                                      <img className="h-10 w-10 rounded-lg object-cover border border-gray-100" src={record.imageUrl} alt="" />
                                    ) : (
                                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-100">
                                        <Package size={18} />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{record.productName}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{record.sku}</div>
                                    <div className="inline-flex items-center gap-2 mt-1.5 bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">
                                       <span>Qty: {record.quantity}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border mb-1.5 ${record.shippingMethod === 'Air' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                  {record.shippingMethod === 'Air' ? <Plane className="w-3 h-3 mr-1.5"/> : <Ship className="w-3 h-3 mr-1.5"/>}
                                  {record.shippingMethod === 'Air' ? '空运' : '海运'}
                                </span>
                                <div className="flex flex-col gap-1">
                                  <div className="text-xs text-gray-600 flex items-center gap-2">
                                      <Package size={12} className="text-gray-400" />
                                      <span className="font-mono">{m.totalCartons} 箱</span>
                                      <span className="text-gray-300">|</span>
                                      <span className="font-mono">{m.totalWeightKg.toFixed(1)}kg</span>
                                  </div>
                                  <div className="text-xs text-gray-600 flex items-center gap-2">
                                      <Box size={12} className="text-gray-400" />
                                      <span className="font-mono">{m.totalVolumeCbm > 0 ? `${m.totalVolumeCbm.toFixed(3)} CBM` : '-'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="space-y-1">
                                  <div className="flex justify-between w-36 text-xs text-gray-500">
                                    <span>货值</span> <span className="font-mono">${m.productCostUSD.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between w-36 text-xs text-gray-500">
                                    <span>头程</span> <span className="font-mono">${m.singleHeadHaulCostUSD.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between w-36 text-xs text-gray-500">
                                    <span>尾+广</span> <span className="font-mono">${(record.lastMileCostUSD + record.adCostUSD).toFixed(2)}</span>
                                  </div>
                                  <div className="w-36 h-px bg-gray-100 my-1"></div>
                                  <div className="flex justify-between w-36 text-xs font-bold text-gray-700">
                                    <span>Total</span> <span>${m.totalCostPerUnitUSD.toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900 font-mono">${record.salesPriceUSD.toFixed(2)}</div>
                                <div className={`text-xs font-medium mt-1 inline-block px-1.5 py-0.5 rounded ${m.marginRate < 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  毛利: {m.marginRate.toFixed(1)}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className={`text-base font-bold font-mono ${m.estimatedProfitUSD > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {m.estimatedProfitUSD > 0 ? '+' : ''}{m.estimatedProfitUSD.toFixed(2)}
                                </div>
                                <div className="flex justify-end mt-1">
                                    <div className={`text-xs px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${m.roi > 30 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                        ROI: {m.roi.toFixed(0)}%
                                    </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredRecords.length === 0 && (
                       <div className="p-16 text-center">
                         <div className="inline-flex bg-gray-50 p-4 rounded-full mb-4">
                           <Package className="h-8 w-8 text-gray-300" />
                         </div>
                         <h3 className="text-gray-900 font-medium">
                            {workspaceId ? `云端工作区 (${workspaceId}) 暂无数据` : '没有找到匹配的记录'}
                         </h3>
                         <p className="text-gray-500 text-sm mt-1">
                            {workspaceId ? '请点击右上角"添加产品"开始协作。' : '尝试调整搜索词或筛选状态。'}
                         </p>
                       </div>
                    )}
                  </div>
                </div>
          </>
        );
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'overview': return '系统总览';
      case 'inventory': return '备货清单管理';
      case 'analytics': return '经营数据分析';
      case 'calculator': return '智能运费试算';
      case 'logistics': return '物流查询中心';
    }
  };

  const getPageSubtitle = () => {
    switch (currentView) {
      case 'overview': return '实时监控您的跨境供应链状态';
      case 'inventory': return '管理您的发货计划、成本核算与物流状态';
      case 'analytics': return '可视化您的利润结构与物流成本分布';
      case 'calculator': return '快速测算材积重、体积与货型分析';
      case 'logistics': return 'UPS与海运实时追踪查询';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
           <div className="bg-blue-600 p-2 rounded-lg">
             <LayoutDashboard className="text-white h-5 w-5" />
           </div>
           <div>
             <h1 className="font-bold text-lg tracking-tight">探行科技</h1>
             <p className="text-xs text-slate-400">智能备货系统 v2.1</p>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            主菜单
          </div>
          <button 
            onClick={() => setCurrentView('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Home size={20} />
            <span className="font-medium">系统总览</span>
            {currentView === 'overview' && <ChevronRight size={16} className="ml-auto opacity-50" />}
          </button>
          
          <button 
            onClick={() => setCurrentView('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <List size={20} />
            <span className="font-medium">备货清单</span>
            {currentView === 'inventory' && <ChevronRight size={16} className="ml-auto opacity-50" />}
          </button>
          
          <button 
             onClick={() => setCurrentView('analytics')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <PieChart size={20} />
            <span className="font-medium">数据分析</span>
            {currentView === 'analytics' && <ChevronRight size={16} className="ml-auto opacity-50" />}
          </button>

          <div className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            实用工具
          </div>
          <button 
             onClick={() => setCurrentView('calculator')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'calculator' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Calculator size={20} />
            <span className="font-medium">智能试算</span>
            {currentView === 'calculator' && <ChevronRight size={16} className="ml-auto opacity-50" />}
          </button>
           <button 
             onClick={() => setCurrentView('logistics')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'logistics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Search size={20} />
            <span className="font-medium">物流查询</span>
            {currentView === 'logistics' && <ChevronRight size={16} className="ml-auto opacity-50" />}
          </button>
          
          <button 
             onClick={handleManualSync}
             disabled={isSyncing || !workspaceId}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                !workspaceId 
                  ? 'text-slate-600 cursor-not-allowed opacity-50' 
                  : 'text-emerald-400 hover:bg-slate-800 hover:text-emerald-300'
             }`}
          >
            <CloudUpload size={20} className={isSyncing ? "animate-pulse" : ""} />
            <span className="font-medium">{isSyncing ? '正在同步...' : '一键同步云端'}</span>
          </button>

        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-xl p-4">
             <div className="flex items-center gap-2 mb-2">
               <BrainCircuit className="text-purple-400 h-5 w-5" />
               <span className="text-xs font-bold text-purple-200">AI 助手已就绪</span>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed">
               点击分析按钮，让 AI 帮您优化物流成本和选品策略。
             </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Mobile Header (Visible only on small screens) */}
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden">
          <div className="font-bold text-gray-800">探行科技</div>
          <button className="text-gray-500"><Menu /></button>
        </header>

        {/* Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100">
          <div className="max-w-7xl mx-auto">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {getPageTitle()}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {getPageSubtitle()}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                
                {/* Global Tools: Cloud Connect */}
                <CloudConnect 
                   currentWorkspaceId={workspaceId}
                   onConnect={setWorkspaceId}
                   onDisconnect={() => setWorkspaceId(null)}
                   isSyncing={isSyncing}
                />

                {currentView === 'inventory' && (
                  <>
                    <button 
                      onClick={handleSmartAnalysis}
                      className="flex items-center gap-2 bg-white text-purple-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors border border-purple-200 shadow-sm"
                    >
                      {isAnalyzing ? <Loader2 className="animate-spin h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
                      {isAnalyzing ? '正在分析...' : '智能诊断'}
                    </button>
                    <button 
                      onClick={openAddModal}
                      className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-bold active:scale-95 transform"
                    >
                      <Plus size={18} />
                      添加产品
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* View Render */}
            {renderContent()}
            
          </div>
        </main>
      </div>

      <RecordModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onSave={handleSaveRecord} 
        initialData={editingRecord}
      />
    </div>
  );
}

export default App;