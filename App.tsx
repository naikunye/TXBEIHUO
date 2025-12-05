
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
  CloudUpload,
  Settings,
  Database,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  Hourglass,
  Sparkles,
  Bot,
  Megaphone,
  Compass,
  Wand2,
  FileJson
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
import { AiChatModal } from './components/AiChatModal'; 
import { MarketingModal } from './components/MarketingModal'; 
import { MarketingDashboard } from './components/MarketingDashboard';
import { DataBackupModal } from './components/DataBackupModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast'; // Import Toast
import { analyzeInventory, generateAdStrategy, generateSelectionStrategy, generateMarketingContent } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

type ViewState = 'overview' | 'inventory' | 'analytics' | 'calculator' | 'logistics' | 'marketing';

function App() {
  // --- Cloud & Workspace State ---
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    const savedId = localStorage.getItem('tanxing_current_workspace');
    return savedId;
  });
  
  // Realtime Connection Status: 'disconnected' | 'connecting' | 'connected'
  const [syncStatus, setSyncStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Data State ---
  const [records, setRecords] = useState<ReplenishmentRecord[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ReplenishmentRecord | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analysisTitle, setAnalysisTitle] = useState<string>('供应链 AI 诊断报告');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('overview'); 

  // --- AI Chat State ---
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // --- Marketing Modal State ---
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [marketingContent, setMarketingContent] = useState<string | null>(null);
  const [marketingProduct, setMarketingProduct] = useState('');

  // --- Backup Modal State ---
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Planning' | 'Shipped' | 'Arrived'>('All');

  // --- Toast State ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Storage Effects ---

  // 1. Load Data
  useEffect(() => {
    const loadData = async () => {
        if (workspaceId && isSupabaseConfigured()) {
            setSyncStatus('connecting');
            // --- Supabase Cloud Load ---
            try {
                const { data, error } = await supabase
                    .from('replenishment_data')
                    .select('json_content')
                    .eq('workspace_id', workspaceId);

                if (error) {
                    console.error("Supabase load error:", error);
                    setSyncStatus('disconnected');
                    addToast(`无法加载云端数据: ${error.message}`, 'error');
                } else if (data) {
                    const cloudRecords = data.map(row => row.json_content as ReplenishmentRecord);
                    cloudRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    setRecords(cloudRecords);
                    // Don't set 'connected' here, wait for subscription
                }
            } catch (err) {
                console.error("Connection failed:", err);
                setSyncStatus('disconnected');
                addToast("连接云端数据库失败，请检查网络", 'error');
            }
        } else {
            // --- Local Storage Load ---
            await new Promise(r => setTimeout(r, 200)); 
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
    };

    loadData();
  }, [workspaceId]);

  // 2. Real-time Subscription (Robust Version)
  useEffect(() => {
    // Only subscribe if we are in a valid workspace
    if (!workspaceId || !isSupabaseConfigured()) {
        setSyncStatus('disconnected');
        return;
    }

    const channel = supabase
      .channel('table-db-changes') 
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'replenishment_data',
        },
        (payload) => {
           console.log("Realtime Event:", payload);

           // Filter client-side
           if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
               const newRecord = payload.new;
               // Check if this record belongs to our workspace
               if (newRecord.workspace_id !== workspaceId) return;

               const content = newRecord.json_content as ReplenishmentRecord;
               if (content && content.id) {
                   setRecords(prev => {
                       const exists = prev.some(r => r.id === content.id);
                       if (exists) {
                           return prev.map(r => r.id === content.id ? content : r);
                       } else {
                           const newList = [content, ...prev];
                           return newList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                       }
                   });
                   // Only notify for remote updates (optional, might be too noisy if self-triggered)
                   // addToast("数据已同步更新", 'info');
               }
           } else if (payload.eventType === 'DELETE') {
               const deletedId = payload.old.id;
               if (deletedId) {
                   setRecords(prev => {
                       const exists = prev.some(r => r.id === deletedId);
                       if (exists) {
                           return prev.filter(r => r.id !== deletedId);
                       }
                       return prev;
                   });
               }
           }
        }
      )
      .subscribe((status) => {
          console.log(`Subscription Status: ${status}`);
          if (status === 'SUBSCRIBED') {
             setSyncStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
             setSyncStatus('disconnected');
             addToast("实时同步连接中断", 'warning');
          }
      });

    return () => {
      supabase.removeChannel(channel);
      setSyncStatus('disconnected');
    };
  }, [workspaceId]);


  // 3. Save Data (LocalStorage Backup)
  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem('tanxing_records', JSON.stringify(records));
  }, [records, isDataLoaded]);

  // 4. Persist Workspace Selection
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

  // Handle Create or Update
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

    // 1. Optimistic Update
    setRecords(prev => {
        if (editingRecord) {
            return prev.map(r => r.id === editingRecord.id ? finalRecord : r);
        } else {
            return [finalRecord, ...prev];
        }
    });

    closeModal();
    addToast(editingRecord ? "产品更新成功" : "新产品已添加", 'success');

    // 2. Cloud Persistence
    if (workspaceId && isSupabaseConfigured()) {
        try {
            const { error } = await supabase
                .from('replenishment_data')
                .upsert({ 
                    id: finalRecord.id, 
                    workspace_id: workspaceId, 
                    json_content: finalRecord 
                });

            if (error) throw error;
        } catch (err: any) {
            console.error("Supabase save error:", err);
            addToast("⚠️ 保存到云端失败，请检查网络", 'error');
        }
    }
  };
  
  // Handle Delete
  const handleDeleteRecord = async (id: string) => {
      if(!window.confirm("确定要删除这条记录吗？")) return;

      // 1. Optimistic Delete
      setRecords(prev => prev.filter(r => r.id !== id));
      addToast("记录已删除", 'info');
      
      // 2. Cloud Delete
      if (workspaceId && isSupabaseConfigured()) {
          try {
              const { error } = await supabase
                  .from('replenishment_data')
                  .delete()
                  .eq('id', id); // We delete by ID, RLS (if enabled) or workspace logic handled by App
                  
              if (error) throw error;
          } catch(err) {
              console.error("Delete failed", err);
              addToast("⚠️ 云端删除失败，请稍后重试", 'warning');
          }
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

  // --- Handlers for Data Import ---
  const handleImportData = (newRecords: ReplenishmentRecord[]) => {
      setRecords(newRecords);
      addToast(`成功导入 ${newRecords.length} 条数据`, 'success');
  };

  // --- Strategy Handlers ---
  const handleSmartAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setAnalysisTitle('供应链 AI 诊断报告');
    const recordsToAnalyze = filteredRecords.length > 0 ? filteredRecords : records;
    const targetRecords = currentView === 'inventory' ? recordsToAnalyze : records;

    const result = await analyzeInventory(targetRecords);
    const cleanResult = result.replace(/^```html/, '').replace(/```$/, '');
    setAiAnalysis(cleanResult);
    setIsAnalyzing(false);
    
    if (currentView !== 'inventory') {
        setCurrentView('inventory');
    }
    
    // Check if result contains error class
    if (result.includes("border-red-200") || result.includes("border-amber-200")) {
        addToast("AI 分析服务遇到问题", 'warning');
    } else {
        addToast("AI 诊断报告生成完毕", 'success');
    }
  };

  const handleAdStrategy = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setAnalysisTitle('TikTok 广告投放策略');
    const recordsToAnalyze = filteredRecords.length > 0 ? filteredRecords : records;
    const targetRecords = currentView === 'inventory' ? recordsToAnalyze : records;

    const result = await generateAdStrategy(targetRecords);
    const cleanResult = result.replace(/^```html/, '').replace(/```$/, '');
    setAiAnalysis(cleanResult);
    setIsAnalyzing(false);

    if (currentView !== 'inventory') {
        setCurrentView('inventory');
    }
    
    if (result.includes("border-red-200") || result.includes("border-amber-200")) {
        addToast("AI 服务暂时不可用", 'warning');
    }
  };

  const handleSelectionStrategy = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setAnalysisTitle('美区选品策略报告');
    const recordsToAnalyze = filteredRecords.length > 0 ? filteredRecords : records;
    const targetRecords = currentView === 'inventory' ? recordsToAnalyze : records;

    const result = await generateSelectionStrategy(targetRecords);
    const cleanResult = result.replace(/^```html/, '').replace(/```$/, '');
    setAiAnalysis(cleanResult);
    setIsAnalyzing(false);

    if (currentView !== 'inventory') {
        setCurrentView('inventory');
    }
    
    if (result.includes("border-red-200") || result.includes("border-amber-200")) {
         addToast("AI 服务暂时不可用", 'warning');
    }
  };

  // --- New Marketing Handler (Wrapped) ---
  const handleGenerateMarketing = async (record: ReplenishmentRecord) => {
      setMarketingProduct(record.productName);
      setMarketingContent(null);
      setMarketingModalOpen(true);
      
      const content = await generateMarketingContent(record);
      const cleanContent = content.replace(/^```html/, '').replace(/```$/, '');
      setMarketingContent(cleanContent);
      
      if (content.includes("border-red-200") || content.includes("border-amber-200")) {
         addToast("内容生成失败", 'error');
      }
  };

  // Wrapper for table click event
  const handleTableMarketingClick = (e: React.MouseEvent, record: ReplenishmentRecord) => {
      e.stopPropagation();
      handleGenerateMarketing(record);
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Product', 'SKU', 'Lifecycle', 'Qty', 'DOS', 'Method', 'Unit Cost(CNY)', 'Sales Price(USD)', 'Total Cost(USD)', 'Profit(USD)', 'Margin(%)', 'ROI(%)', 'Status'];
    const rows = filteredRecords.map(r => {
      const m = calculateMetrics(r);
      return [
        r.date,
        `"${r.productName.replace(/"/g, '""')}"`,
        r.sku,
        r.lifecycle || 'New',
        r.quantity,
        m.daysOfSupply.toFixed(1),
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
    addToast("CSV 报表已下载", 'success');
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

  const getLifecycleBadge = (status: string | undefined) => {
    const s = status || 'New';
    switch (s) {
        case 'New': return { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: '🌱', label: '新品' };
        case 'Growth': return { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: '🚀', label: '成长' };
        case 'Stable': return { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: '⚖️', label: '稳定' };
        case 'Clearance': return { color: 'bg-red-50 text-red-600 border-red-100', icon: '📉', label: '清仓' };
        default: return { color: 'bg-gray-50 text-gray-500', icon: '?', label: s };
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
      case 'marketing':
        return <MarketingDashboard records={records} onGenerate={handleGenerateMarketing} />;
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
                          <div className={`p-2 rounded-lg ${
                              analysisTitle.includes('TikTok') ? 'bg-pink-100' : 
                              analysisTitle.includes('选品') ? 'bg-orange-100' :
                              'bg-purple-100'
                          }`}>
                            {analysisTitle.includes('TikTok') ? (
                                <Megaphone className="text-pink-600 h-5 w-5" />
                            ) : analysisTitle.includes('选品') ? (
                                <Compass className="text-orange-600 h-5 w-5" />
                            ) : (
                                <BrainCircuit className="text-purple-600 h-5 w-5" />
                            )}
                          </div>
                          <h3 className="font-bold text-lg text-gray-800">{analysisTitle}</h3>
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
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU / 阶段</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">产品信息</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">物流 (Vol & Wgt)</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">库存状态 (DOS)</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">销售表现</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRecords.map((record) => {
                          const m = calculateMetrics(record);
                          const lifecycle = getLifecycleBadge(record.lifecycle);
                          return (
                            <tr 
                                key={record.id} 
                                className="hover:bg-blue-50/50 transition-colors group cursor-pointer relative"
                            >
                              <td className="px-6 py-4 whitespace-nowrap" onClick={() => openEditModal(record)}>
                                <div className="text-sm text-gray-900 font-bold flex items-center gap-2">
                                    <span className="font-mono">{record.sku}</span>
                                    <Edit className="w-3 h-3 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                                <div className="mt-2 flex flex-col items-start gap-1.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${lifecycle.color}`}>
                                    {lifecycle.icon} {lifecycle.label}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(record.status)}`}>
                                    {getStatusLabel(record.status)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap" onClick={() => openEditModal(record)}>
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
                                    <div className="text-xs text-gray-400 mt-0.5">{record.date}</div>
                                    <div className="inline-flex items-center gap-2 mt-1.5 bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">
                                       <span>Qty: {record.quantity}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap" onClick={() => openEditModal(record)}>
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
                              <td className="px-6 py-4 whitespace-nowrap" onClick={() => openEditModal(record)}>
                                <div className="space-y-1">
                                  {m.stockStatus !== 'Unknown' ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            {m.stockStatus === 'Critical' && <AlertTriangle size={14} className="text-red-500" />}
                                            {m.stockStatus === 'Low' && <Hourglass size={14} className="text-yellow-500" />}
                                            {m.stockStatus === 'Healthy' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                            {m.stockStatus === 'Overstock' && <AlertTriangle size={14} className="text-orange-500" />}
                                            
                                            <span className={`text-xs font-bold ${
                                                m.stockStatus === 'Critical' ? 'text-red-600' :
                                                m.stockStatus === 'Low' ? 'text-yellow-700' :
                                                m.stockStatus === 'Overstock' ? 'text-orange-600' :
                                                'text-green-600'
                                            }`}>
                                                {m.daysOfSupply.toFixed(0)} 天周转
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            日销: {record.dailySales} / 现货: {record.quantity}
                                        </div>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">待输入日销量</span>
                                  )}
                                  
                                  <div className="w-24 h-px bg-gray-100 my-1"></div>
                                  <div className="flex justify-between w-24 text-xs text-gray-500">
                                    <span>成本</span> <span className="font-mono">${m.totalCostPerUnitUSD.toFixed(1)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap" onClick={() => openEditModal(record)}>
                                <div className="text-sm font-bold text-gray-900 font-mono">${record.salesPriceUSD.toFixed(2)}</div>
                                <div className={`text-xs font-medium mt-1 inline-block px-1.5 py-0.5 rounded ${m.marginRate < 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  毛利: {m.marginRate.toFixed(1)}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex flex-col items-end gap-2">
                                    {/* Action Buttons */}
                                    <button 
                                        onClick={(e) => handleTableMarketingClick(e, record)}
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 hover:shadow-md transition-all active:scale-95"
                                        title="生成 TikTok 脚本与文案"
                                    >
                                        <Wand2 size={10} /> 生成内容
                                    </button>
                                    
                                    <div className="flex items-center gap-2">
                                        <div className={`text-xs px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${m.roi > 30 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                            ROI: {m.roi.toFixed(0)}%
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record.id); }}
                                            className="text-[10px] text-gray-300 hover:text-red-500 underline"
                                        >
                                            删除
                                        </button>
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
      case 'marketing': return 'AI 营销内容引擎';
    }
  };

  const getPageSubtitle = () => {
    switch (currentView) {
      case 'overview': return '实时监控您的跨境供应链状态';
      case 'inventory': return '管理您的发货计划、成本核算与物流状态';
      case 'analytics': return '可视化您的利润结构与物流成本分布';
      case 'calculator': return '快速测算材积重、体积与货型分析';
      case 'logistics': return 'UPS与海运实时追踪查询';
      case 'marketing': return '自动生成 TikTok 脚本、Listing 文案与直播话术';
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
             <p className="text-xs text-slate-400">智能备货系统 v3.0 AI Pro</p>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* ... existing nav buttons ... */}
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            主菜单
          </div>
          <button 
            onClick={() => setCurrentView('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Home size={20} />
            <span className="font-medium">系统总览</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <List size={20} />
            <span className="font-medium">备货清单</span>
          </button>
          
          <button 
             onClick={() => setCurrentView('analytics')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <PieChart size={20} />
            <span className="font-medium">数据分析</span>
          </button>

          {/* New AI Hub Section */}
          <div className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            AI 赋能中心
          </div>
          <button 
             onClick={() => setCurrentView('marketing')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${currentView === 'marketing' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Sparkles size={20} className={currentView === 'marketing' ? 'text-yellow-300' : 'group-hover:text-purple-400'} />
            <span className="font-medium">AI 营销中心</span>
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
          </button>
           <button 
             onClick={() => setCurrentView('logistics')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'logistics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Search size={20} />
            <span className="font-medium">物流查询</span>
          </button>
          
          <button 
             onClick={() => setIsBackupOpen(true)}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-400 hover:bg-slate-800 hover:text-white`}
          >
            <FileJson size={20} />
            <span className="font-medium">数据备份</span>
          </button>

          <button 
             onClick={() => setIsSettingsOpen(true)}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isSettingsOpen
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
             }`}
          >
            <Settings size={20} />
            <span className="font-medium">系统设置</span>
          </button>

        </nav>

        {/* AI Sidebar Button (Updated) */}
        <div className="p-4 border-t border-slate-800">
          <div 
            onClick={() => setIsAiChatOpen(true)}
            className="bg-slate-800 rounded-xl p-4 cursor-pointer hover:bg-slate-700 transition-all group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500 rounded-full mix-blend-overlay filter blur-xl opacity-20 -translate-y-10 translate-x-10 group-hover:opacity-40 transition-opacity"></div>
             
             <div className="flex items-center gap-2 mb-2">
               <div className="bg-purple-900/50 p-1.5 rounded-lg">
                  <Bot className="text-purple-400 h-5 w-5" />
               </div>
               <span className="text-xs font-bold text-purple-200">AI Copilot</span>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
               点击开启智能对话，分析库存或查询利润数据。
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 relative">
          
          {/* TOAST CONTAINER - Global Notification */}
          <ToastContainer toasts={toasts} removeToast={removeToast} />

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
                
                {/* Global Status Indicator for Cloud */}
                {workspaceId && (
                   <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      syncStatus === 'connected' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : syncStatus === 'connecting'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                        : 'bg-red-50 text-red-700 border-red-100'
                   }`}>
                      {syncStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                      <span className="hidden sm:inline">工作区: {workspaceId}</span>
                      <span className="sm:hidden">{workspaceId}</span>
                      <div className={`w-2 h-2 rounded-full ${
                          syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : syncStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      {syncStatus === 'connecting' && <span className="text-[10px]">连接中...</span>}
                      {syncStatus === 'disconnected' && <span className="text-[10px]">断开</span>}
                   </div>
                )}

                {/* Updated Button Visibility Logic */}
                {(currentView === 'inventory' || currentView === 'overview' || currentView === 'marketing') && (
                  <>
                    {/* Only show strategy buttons in Inventory/Overview to avoid clutter, or if user wants them everywhere we can remove condition */}
                    {currentView !== 'marketing' && (
                        <>
                            <button 
                            onClick={handleAdStrategy}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 bg-pink-50 text-pink-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-pink-100 transition-colors border border-pink-200 shadow-sm"
                            >
                            {isAnalyzing && analysisTitle.includes('TikTok') ? <Loader2 className="animate-spin h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                            TikTok 投放建议
                            </button>

                            <button 
                            onClick={handleSelectionStrategy}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors border border-orange-200 shadow-sm"
                            >
                            {isAnalyzing && analysisTitle.includes('选品') ? <Loader2 className="animate-spin h-4 w-4" /> : <Compass className="h-4 w-4" />}
                            美区选品策略
                            </button>
                        </>
                    )}

                    {currentView === 'inventory' && (
                        <button 
                          onClick={handleSmartAnalysis}
                          disabled={isAnalyzing}
                          className="flex items-center gap-2 bg-white text-purple-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors border border-purple-200 shadow-sm"
                        >
                          {isAnalyzing && !analysisTitle.includes('TikTok') && !analysisTitle.includes('选品') ? <Loader2 className="animate-spin h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
                          {isAnalyzing && !analysisTitle.includes('TikTok') && !analysisTitle.includes('选品') ? '正在分析...' : '智能诊断'}
                        </button>
                    )}

                    {/* Add Product only on Inventory view to avoid confusion */}
                    {currentView === 'inventory' && (
                        <button 
                          onClick={openAddModal}
                          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-bold active:scale-95 transform"
                        >
                          <Plus size={18} />
                          添加产品
                        </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* View Render */}
            {renderContent()}
            
          </div>
        </main>
      </div>
      
      {/* Cloud Connect Modal (Now acting as System Settings) */}
      <CloudConnect 
         isOpen={isSettingsOpen}
         onClose={() => setIsSettingsOpen(false)}
         currentWorkspaceId={workspaceId}
         onConnect={setWorkspaceId}
         onDisconnect={() => setWorkspaceId(null)}
         isSyncing={syncStatus === 'connecting'}
      />

      <RecordModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onSave={handleSaveRecord} 
        initialData={editingRecord}
      />
      
      {/* AI Chat Modal (Global) */}
      <AiChatModal 
         isOpen={isAiChatOpen}
         onClose={() => setIsAiChatOpen(false)}
         records={records}
      />

      {/* AI Marketing Modal (New) */}
      <MarketingModal
         isOpen={marketingModalOpen}
         onClose={() => setMarketingModalOpen(false)}
         content={marketingContent}
         productName={marketingProduct}
      />

      {/* Backup Modal */}
      <DataBackupModal
         isOpen={isBackupOpen}
         onClose={() => setIsBackupOpen(false)}
         records={records}
         onImportData={handleImportData}
      />
    </div>
  );
}

export default App;
