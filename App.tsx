
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
  FileJson,
  Store as StoreIcon,
  ChevronDown,
  ArrowRightLeft,
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  ChevronLeft, 
  ChevronsLeft,
  ChevronsRight,
  UserCircle,
  Command,
  CopyPlus,
  MoreHorizontal,
  Trash2,
  Printer,
  CalendarClock,
  RefreshCw // Import new icon
} from 'lucide-react';
import { ReplenishmentRecord, Store, CalculatedMetrics } from './types';
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
import { StoreManagerModal } from './components/StoreManagerModal';
import { DistributeModal } from './components/DistributeModal'; 
import { CommandPalette } from './components/CommandPalette'; 
import { ConfirmDialog } from './components/ConfirmDialog';
import { RecycleBinModal } from './components/RecycleBinModal';
import { LabelGeneratorModal } from './components/LabelGeneratorModal'; 
import { RestockPlanModal } from './components/RestockPlanModal'; 
import { ErpSyncModal } from './components/ErpSyncModal'; // Import
import { ToastContainer, ToastMessage, ToastType } from './components/Toast'; 
import { analyzeInventory, generateAdStrategy, generateSelectionStrategy, generateMarketingContent, analyzeLogisticsChannels } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

type ViewState = 'overview' | 'inventory' | 'analytics' | 'calculator' | 'logistics' | 'marketing';

// Extended type for sorting
type EnrichedRecord = ReplenishmentRecord & { metrics: CalculatedMetrics };

function App() {
  // --- Cloud & Workspace State ---
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    const savedId = localStorage.getItem('tanxing_current_workspace');
    return savedId;
  });
  
  const [syncStatus, setSyncStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Store Management State ---
  const [stores, setStores] = useState<Store[]>(() => {
    const savedStores = localStorage.getItem('tanxing_stores');
    return savedStores ? JSON.parse(savedStores) : [];
  });
  const [activeStoreId, setActiveStoreId] = useState<string>('all');
  const [isStoreManagerOpen, setIsStoreManagerOpen] = useState(false);

  // --- Data State ---
  const [records, setRecords] = useState<ReplenishmentRecord[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastErpSync, setLastErpSync] = useState<Date | null>(null);

  // --- ERP Table State (Sorting & Pagination) ---
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ReplenishmentRecord | null>(null);
  
  // --- Distribute Modal State ---
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeSourceRecord, setDistributeSourceRecord] = useState<ReplenishmentRecord | null>(null);

  // --- Label Modal State ---
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelRecord, setLabelRecord] = useState<ReplenishmentRecord | null>(null);

  // --- Restock Plan Modal State ---
  const [isRestockPlanOpen, setIsRestockPlanOpen] = useState(false);

  // --- ERP Sync Modal State ---
  const [isErpSyncOpen, setIsErpSyncOpen] = useState(false); // NEW State

  // --- Delete Confirmation & Trash State ---
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);

  // --- Command Palette State ---
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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

  // --- Helper: Generic Cloud Sync ---
  const syncItemToCloud = async (item: ReplenishmentRecord | Store) => {
      if (workspaceId && isSupabaseConfigured()) {
        try {
            await supabase.from('replenishment_data').upsert({ 
                id: item.id, 
                workspace_id: workspaceId, 
                json_content: item 
            });
        } catch (err) { console.error('Cloud Sync Error:', err); }
      }
  };

  const deleteItemFromCloud = async (id: string) => {
      if (workspaceId && isSupabaseConfigured()) {
          try { await supabase.from('replenishment_data').delete().eq('id', id); } 
          catch(err) { console.error('Cloud Delete Error:', err); }
      }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Toggle Command Palette with Ctrl+K or Cmd+K
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            setIsCommandPaletteOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // --- Core Data Loading Function ---
  const loadData = async () => {
    if (workspaceId && isSupabaseConfigured()) {
        setSyncStatus('connecting');
        try {
            // FIX: Added limit(10000) to ensure we don't miss items if data > 1000
            const { data, error } = await supabase
                .from('replenishment_data')
                .select('json_content')
                .eq('workspace_id', workspaceId)
                .limit(10000); 

            if (error) {
                setSyncStatus('disconnected');
                addToast(`无法加载云端数据: ${error.message}`, 'error');
            } else if (data) {
                // Separate Records and Stores based on unique fields
                const rawItems = data.map(row => row.json_content);
                
                // Records have 'sku', Stores have 'platform' but no 'sku'
                const loadedRecords = rawItems.filter((item: any) => item.sku) as ReplenishmentRecord[];
                const loadedStores = rawItems.filter((item: any) => item.platform && !item.sku) as Store[];

                setRecords(loadedRecords);
                setStores(loadedStores); // Always update stores from cloud truth
                console.log('Data synced:', loadedRecords.length, 'records,', loadedStores.length, 'stores');
            }
        } catch (err) {
            setSyncStatus('disconnected');
            addToast("连接云端数据库失败，请检查网络", 'error');
        }
    } else {
        // Local fallback
        await new Promise(r => setTimeout(r, 200)); 
        const savedRecords = localStorage.getItem('tanxing_records');
        if (savedRecords) {
            try { setRecords(JSON.parse(savedRecords)); } catch (e) { setRecords([]); }
        } else {
            setRecords([...MOCK_DATA_INITIAL]);
        }
        
        const savedStores = localStorage.getItem('tanxing_stores');
        if (savedStores) {
            try { setStores(JSON.parse(savedStores)); } catch (e) { setStores([]); }
        }
    }
    setIsDataLoaded(true);
  };

  // --- Storage Effects ---
  useEffect(() => {
    loadData();
  }, [workspaceId]);

  // --- Auto Cleanup of Old Trash ---
  useEffect(() => {
      if (!isDataLoaded || records.length === 0) return;
      
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      // Identify items to purge
      const itemsToPurge = records.filter(r => 
          r.isDeleted && 
          r.deletedAt && 
          (now - new Date(r.deletedAt).getTime() > SEVEN_DAYS_MS)
      );

      if (itemsToPurge.length > 0) {
          // Perform local purge
          setRecords(prev => prev.filter(r => !itemsToPurge.some(p => p.id === r.id)));
          console.log(`Auto-purged ${itemsToPurge.length} old items.`);
          
          // Perform cloud purge if connected
          if (workspaceId && isSupabaseConfigured()) {
              itemsToPurge.forEach(async (item) => {
                  deleteItemFromCloud(item.id);
              });
          }
      }
  }, [records, isDataLoaded, workspaceId]);

  useEffect(() => {
    if (!workspaceId || !isSupabaseConfigured()) {
        setSyncStatus('disconnected');
        return;
    }
    const channel = supabase
      .channel('table-db-changes') 
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'replenishment_data' },
        (payload) => {
           if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
               const newRecord = payload.new;
               if (newRecord.workspace_id !== workspaceId) return;
               
               const content = newRecord.json_content;
               
               if (content.sku) {
                   // It's a ReplenishmentRecord
                   setRecords(prev => {
                       const exists = prev.some(r => r.id === content.id);
                       if (exists) return prev.map(r => r.id === content.id ? content : r);
                       else return [content, ...prev];
                   });
               } else if (content.platform) {
                   // It's a Store - STRICT CHECK to avoid confusion with Records
                   setStores(prev => {
                       const exists = prev.some(s => s.id === content.id);
                       if (exists) return prev.map(s => s.id === content.id ? content : s);
                       else return [...prev, content];
                   });
               }

           } else if (payload.eventType === 'DELETE') {
               const deletedId = payload.old.id;
               if (deletedId) {
                   // Try to remove from both lists (ID is unique anyway)
                   setRecords(prev => prev.filter(r => r.id !== deletedId));
                   setStores(prev => prev.filter(s => s.id !== deletedId));
               }
           }
        }
      )
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') setSyncStatus('connected');
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
             setSyncStatus('disconnected');
             addToast("实时同步连接中断", 'warning');
          }
      });
    return () => {
      supabase.removeChannel(channel);
      setSyncStatus('disconnected');
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem('tanxing_records', JSON.stringify(records));
  }, [records, isDataLoaded]);

  useEffect(() => {
      if (!isDataLoaded) return;
      localStorage.setItem('tanxing_stores', JSON.stringify(stores));
  }, [stores, isDataLoaded]); 

  useEffect(() => {
      if (workspaceId) localStorage.setItem('tanxing_current_workspace', workspaceId);
      else localStorage.removeItem('tanxing_current_workspace');
  }, [workspaceId]);


  // --- Advanced Data Processing ---
  const processedData = useMemo(() => {
    // 1. Filter
    let filtered = records.filter(record => {
      if (record.isDeleted) return false; // Hide deleted items from main view!

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        record.productName.toLowerCase().includes(q) ||
        record.sku.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
      const matchesStore = activeStoreId === 'all' || record.storeId === activeStoreId;
      return matchesSearch && matchesStatus && matchesStore;
    });

    // 2. Attach Metrics
    let enriched = filtered.map(r => ({
        ...r,
        metrics: calculateMetrics(r)
    }));

    // 3. Sort
    if (sortConfig) {
        enriched.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key.startsWith('metrics.')) {
                const metricKey = sortConfig.key.split('.')[1] as keyof CalculatedMetrics;
                aValue = a.metrics[metricKey];
                bValue = b.metrics[metricKey];
            } else {
                aValue = a[sortConfig.key as keyof ReplenishmentRecord];
                bValue = b[sortConfig.key as keyof ReplenishmentRecord];
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return enriched;
  }, [records, searchQuery, statusFilter, activeStoreId, sortConfig]);

  // Derived Deleted Records for Trash Bin
  const deletedRecords = useMemo(() => records.filter(r => r.isDeleted), [records]);

  const paginatedRecords = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  // --- Handlers ---
  
  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'desc'; 
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
          direction = 'asc';
      }
      setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
      if (sortConfig?.key !== key) return <ArrowUpDown size={12} className="text-gray-300 ml-1" />;
      return sortConfig.direction === 'asc' 
        ? <ArrowUp size={12} className="text-blue-600 ml-1" />
        : <ArrowDown size={12} className="text-blue-600 ml-1" />;
  };

  // ... (Existing CRUD handlers)
  const handleAddStore = (newStore: Omit<Store, 'id'>) => {
      const store: Store = { ...newStore, id: Date.now().toString() };
      setStores(prev => [...prev, store]);
      addToast(`店铺 "${store.name}" 已添加`, 'success');
      syncItemToCloud(store); // SYNC TO CLOUD
  };

  const handleDeleteStore = (id: string) => {
      if (window.confirm("确定删除该店铺吗？")) {
          setStores(prev => prev.filter(s => s.id !== id));
          if (activeStoreId === id) setActiveStoreId('all');
          addToast('店铺已删除', 'info');
          deleteItemFromCloud(id); // SYNC TO CLOUD
      }
  };

  const handleOpenStoreManager = () => {
      setIsStoreManagerOpen(true);
      // Force refresh data from cloud when opening manager to ensure consistency
      if (workspaceId) loadData(); 
  };

  const handleSaveRecord = async (recordData: Omit<ReplenishmentRecord, 'id'>) => {
    let finalRecord: ReplenishmentRecord;
    if (editingRecord) {
        finalRecord = { ...recordData, id: editingRecord.id };
    } else {
        // Use purely timestamp based ID for absolute safety
        finalRecord = { ...recordData, id: Date.now().toString() };
    }
    setRecords(prev => {
        if (editingRecord) return prev.map(r => r.id === editingRecord.id ? finalRecord : r);
        else return [finalRecord, ...prev];
    });
    closeModal();
    addToast(editingRecord ? "产品更新成功" : "新产品已添加", 'success');
    syncItemToCloud(finalRecord);
  };
  
  const initiateDelete = (id: string) => {
      setDeleteConfirm({ isOpen: true, id });
  };

  // NEW: Soft Delete Logic
  const confirmSoftDelete = async () => {
      const id = deleteConfirm.id;
      if (!id) return;
      
      const now = new Date().toISOString();
      const updatedRecord: Partial<ReplenishmentRecord> = { isDeleted: true, deletedAt: now };

      setRecords(prev => prev.map(r => {
          if (r.id === id) return { ...r, ...updatedRecord };
          return r;
      }));

      // Find full record to save to cloud as "Deleted"
      const recordToUpdate = records.find(r => r.id === id);
      if (recordToUpdate) {
          syncItemToCloud({ ...recordToUpdate, ...updatedRecord } as ReplenishmentRecord);
      }

      addToast("已移至回收站，7天后将自动清理", 'info');
      setDeleteConfirm({ isOpen: false, id: null });
  };

  // NEW: Restore Logic
  const handleRestoreRecord = (id: string) => {
      setRecords(prev => prev.map(r => {
          if (r.id === id) return { ...r, isDeleted: false, deletedAt: undefined };
          return r;
      }));
      
      const recordToRestore = records.find(r => r.id === id);
      if (recordToRestore) {
          syncItemToCloud({ ...recordToRestore, isDeleted: false, deletedAt: undefined } as ReplenishmentRecord);
      }
      addToast("记录已恢复", 'success');
  };

  // NEW: Hard Delete Logic
  const handleHardDeleteRecord = async (id: string) => {
      setRecords(prev => prev.filter(r => r.id !== id));
      addToast("记录已永久删除", 'error');
      
      deleteItemFromCloud(id);
  };

  const openDistributeModal = (e: React.MouseEvent, record: ReplenishmentRecord) => {
      e.stopPropagation();
      setDistributeSourceRecord(record);
      setIsDistributeModalOpen(true);
  };

  // Quick Reorder: Clones record with 'Planning' status and resets date
  // FIX: Added automatic filter switching to 'Planning' or 'All' to ensure visibility
  const handleQuickReorder = async (e: React.MouseEvent, record: ReplenishmentRecord) => {
      e.stopPropagation();
      
      const newRecordId = Date.now().toString();
      const newRecord: ReplenishmentRecord = {
          ...record,
          id: newRecordId,
          date: new Date().toISOString().split('T')[0],
          status: 'Planning',
          // Keep quantity and other settings same as last time for speed
      };
      
      setRecords(prev => [newRecord, ...prev]);
      
      // Ensure the user sees the new record by switching filter if necessary
      if (statusFilter !== 'All' && statusFilter !== 'Planning') {
          setStatusFilter('Planning');
          addToast('已切换至“计划中”视图查看新订单', 'info');
      } else {
          addToast(`已为 ${record.sku} 创建补货计划`, 'success');
      }
      
      await syncItemToCloud(newRecord);
  };

  // NEW: Open Label Modal
  const openLabelGenerator = (e: React.MouseEvent, record: ReplenishmentRecord) => {
      e.stopPropagation();
      setLabelRecord(record);
      setIsLabelModalOpen(true);
  };

  const handleDistributeConfirm = async (mode: 'transfer' | 'clone', targetStoreId: string, quantity: number) => {
      if (!distributeSourceRecord) return;
      const newRecordId = Date.now().toString();
      const itemsPerBox = distributeSourceRecord.itemsPerBox || 1;
      const newTotalCartons = Math.ceil(quantity / itemsPerBox);
      const manualWeightRatio = distributeSourceRecord.manualTotalWeightKg 
          ? (quantity / distributeSourceRecord.quantity) * distributeSourceRecord.manualTotalWeightKg 
          : undefined;

      const newRecord: ReplenishmentRecord = {
          ...distributeSourceRecord,
          id: newRecordId,
          storeId: targetStoreId,
          quantity: quantity,
          totalCartons: newTotalCartons,
          manualTotalWeightKg: manualWeightRatio,
          status: distributeSourceRecord.status 
      };

      let updatedSourceRecord: ReplenishmentRecord | null = null;
      if (mode === 'transfer') {
          const remainingQty = distributeSourceRecord.quantity - quantity;
          const remainingCartons = Math.ceil(remainingQty / itemsPerBox);
          const remainingWeight = distributeSourceRecord.manualTotalWeightKg 
               ? distributeSourceRecord.manualTotalWeightKg - (manualWeightRatio || 0)
               : undefined;
          updatedSourceRecord = { ...distributeSourceRecord, quantity: remainingQty, totalCartons: remainingCartons, manualTotalWeightKg: remainingWeight };
      }

      setRecords(prev => {
          let list = [...prev, newRecord];
          if (updatedSourceRecord) list = list.map(r => r.id === updatedSourceRecord!.id ? updatedSourceRecord! : r);
          return list;
      });

      await syncItemToCloud(newRecord);
      if (updatedSourceRecord) await syncItemToCloud(updatedSourceRecord);
      addToast('操作成功', 'success');
  };

  const openAddModal = () => { setEditingRecord(null); setIsModalOpen(true); };
  const openEditModal = (record: ReplenishmentRecord) => { setEditingRecord(record); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingRecord(null); };

  const handleImportData = (newRecords: ReplenishmentRecord[]) => {
      setRecords(newRecords);
      addToast(`成功导入 ${newRecords.length} 条数据`, 'success');
  };

  // --- ERP Sync Handler ---
  const handleErpUpdate = async (updatedRecords: ReplenishmentRecord[]) => {
      // Force new array reference to ensure React triggers re-render
      setRecords([...updatedRecords]);
      setLastErpSync(new Date()); // Update timestamp
      addToast("领星 OMS 数据同步成功！", 'success');
      
      // Batch save to cloud
      if (workspaceId && isSupabaseConfigured()) {
          // Simple loop for now, ideally batch upsert
          for(const rec of updatedRecords) {
              await syncItemToCloud(rec);
          }
      }
  };

  // --- Command Palette Handlers ---
  const handleCommandNavigate = (view: ViewState) => {
      setCurrentView(view);
  };
  
  const handleCommandAction = (action: string) => {
      if (action === 'add_product') openAddModal();
      if (action === 'open_settings') setIsSettingsOpen(true);
  };

  const handleCommandOpenRecord = (record: ReplenishmentRecord) => {
      openEditModal(record);
  };

  // ... (AI Wrappers)
  const handleSmartAnalysis = async () => {
    setIsAnalyzing(true); setAiAnalysis(null); setAnalysisTitle('供应链 AI 诊断报告');
    const result = await analyzeInventory(processedData);
    setAiAnalysis(result.replace(/^```html/, '').replace(/```$/, ''));
    setIsAnalyzing(false);
    if (currentView !== 'inventory') setCurrentView('inventory');
    addToast("AI 诊断报告生成完毕", 'success');
  };

  const handleLogisticsAnalysis = async () => {
    setIsAnalyzing(true); setAiAnalysis(null); setAnalysisTitle('头程物流渠道优选报告');
    const result = await analyzeLogisticsChannels(processedData);
    setAiAnalysis(result.replace(/^```html/, '').replace(/```$/, ''));
    setIsAnalyzing(false);
    if (currentView !== 'inventory') setCurrentView('inventory');
    addToast("物流分析报告已生成", 'success');
  };

  const handleAdStrategy = async () => {
    setIsAnalyzing(true); setAiAnalysis(null); setAnalysisTitle('TikTok 广告投放策略');
    const result = await generateAdStrategy(processedData);
    setAiAnalysis(result.replace(/^```html/, '').replace(/```$/, ''));
    setIsAnalyzing(false);
    if (currentView !== 'inventory') setCurrentView('inventory');
  };

  const handleSelectionStrategy = async () => {
    setIsAnalyzing(true); setAiAnalysis(null); setAnalysisTitle('美区选品策略报告');
    const result = await generateSelectionStrategy(processedData);
    setAiAnalysis(result.replace(/^```html/, '').replace(/```$/, ''));
    setIsAnalyzing(false);
    if (currentView !== 'inventory') setCurrentView('inventory');
  };

  const handleGenerateMarketing = async (record: ReplenishmentRecord) => {
      setMarketingProduct(record.productName); setMarketingContent(null); setMarketingModalOpen(true);
      const content = await generateMarketingContent(record);
      setMarketingContent(content.replace(/^```html/, '').replace(/```$/, ''));
  };

  const handleTableMarketingClick = (e: React.MouseEvent, record: ReplenishmentRecord) => { e.stopPropagation(); handleGenerateMarketing(record); }
  
  const handleExportCSV = () => {
    const headers = ['Date', 'Store', 'Product', 'SKU', 'Lifecycle', 'Qty', 'DOS', 'Method', 'Unit Cost(CNY)', 'Sales Price(USD)', 'Total Cost(USD)', 'Profit(USD)', 'Margin(%)', 'ROI(%)', 'Status'];
    const rows = processedData.map(r => {
      const storeName = stores.find(s => s.id === r.storeId)?.name || 'General';
      const m = r.metrics;
      return [
        r.date, `"${storeName}"`, `"${r.productName.replace(/"/g, '""')}"`, r.sku, r.lifecycle || 'New', r.quantity, m.daysOfSupply.toFixed(1), r.shippingMethod, r.unitPriceCNY, r.salesPriceUSD, m.totalCostPerUnitUSD.toFixed(2), m.estimatedProfitUSD.toFixed(2), m.marginRate.toFixed(2), m.roi.toFixed(2), r.status
      ].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `tanxing_replenishment_${workspaceId || 'local'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
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

  const getPageTitle = () => {
    switch (currentView) {
      case 'overview': return '系统总览';
      case 'inventory': return '备货清单';
      case 'analytics': return '数据分析';
      case 'marketing': return 'AI 营销中心';
      case 'calculator': return '智能试算';
      case 'logistics': return '物流查询';
      default: return '系统总览';
    }
  };

  const getPageSubtitle = () => {
    switch (currentView) {
      case 'overview': return '全局业务核心指标看板';
      case 'inventory': return '管理所有 SKU 的补货计划与状态';
      case 'analytics': return '多维度利润、成本与库存健康度分析';
      case 'marketing': return '基于商品数据的 TikTok 内容一键生成';
      case 'calculator': return '运费估算与 TikTok 定价反推工具';
      case 'logistics': return '集成 17TRACK 与船司查询入口';
      default: return '欢迎使用探行科技智能备货系统';
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'overview': return <HomeOverview records={processedData} stores={stores} currentStoreId={activeStoreId} onNavigateToList={() => setCurrentView('inventory')} />;
      case 'calculator': return <CalculatorTool />;
      case 'logistics': return <LogisticsTools />;
      case 'analytics': return <AnalyticsDashboard records={processedData} />;
      case 'marketing': return <MarketingDashboard records={processedData} onGenerate={handleGenerateMarketing} />;
      case 'inventory':
      default:
        return (
          <>
             {aiAnalysis && (
                  <div className="mb-8 bg-white rounded-2xl p-6 border border-purple-100 shadow-md animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-2xl opacity-50 -translate-y-10 translate-x-10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-purple-50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${analysisTitle.includes('TikTok') ? 'bg-pink-100' : analysisTitle.includes('选品') ? 'bg-orange-100' : analysisTitle.includes('物流') ? 'bg-cyan-100' : 'bg-purple-100'}`}>
                            {analysisTitle.includes('TikTok') ? <Megaphone className="text-pink-600 h-5 w-5" /> : analysisTitle.includes('选品') ? <Compass className="text-orange-600 h-5 w-5" /> : analysisTitle.includes('物流') ? <Container className="text-cyan-600 h-5 w-5" /> : <BrainCircuit className="text-purple-600 h-5 w-5" />}
                          </div>
                          <h3 className="font-bold text-lg text-gray-800">{analysisTitle}</h3>
                        </div>
                        <button onClick={() => setAiAnalysis(null)} className="p-2 hover:bg-purple-50 rounded-full text-gray-400 hover:text-purple-600 transition-colors"><X size={20} /></button>
                      </div>
                      <div className="text-gray-600"><div dangerouslySetInnerHTML={{ __html: aiAnalysis }} /></div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-fade-in">
                  <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder="搜索产品名称或 SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none" />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 w-full sm:w-auto">
                      <Filter size={18} className="text-gray-500" />
                      <span className="text-sm text-gray-600 font-medium whitespace-nowrap">状态:</span>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-transparent text-sm font-semibold text-gray-800 outline-none cursor-pointer w-full">
                        <option value="All">全部 (All)</option>
                        <option value="Planning">计划中 (Planning)</option>
                        <option value="Shipped">已发货 (Shipped)</option>
                        <option value="Arrived">已到仓 (Arrived)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
                   <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <List size={18} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">库存清单</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{processedData.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          {/* New ERP Sync Button with Timestamp */}
                          <div className="flex items-center gap-2">
                              {lastErpSync && (
                                  <span className="text-[10px] text-gray-400 hidden sm:inline">
                                      上次同步: {lastErpSync.toLocaleTimeString()}
                                  </span>
                              )}
                              <button 
                                onClick={() => setIsErpSyncOpen(true)}
                                className="flex items-center gap-1.5 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors shadow-sm border border-blue-200"
                              >
                                <RefreshCw size={16} /> 
                                <span className="hidden sm:inline">同步领星 ERP</span>
                                <span className="sm:hidden">ERP</span>
                              </button>
                          </div>

                          <button onClick={() => setIsRestockPlanOpen(true)} className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                             <CalendarClock size={16} className="text-emerald-400" /> 
                             <span className="hidden sm:inline">智能补货规划</span>
                             <span className="sm:hidden">补货</span>
                          </button>
                          <button onClick={handleExportCSV} className="text-gray-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1 transition-colors px-3 py-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 hover:shadow-sm">
                             <Download size={16} /> 
                             <span className="hidden sm:inline">导出</span>
                          </button>
                      </div>
                   </div>
                  
                  {/* ERP-style Data Grid */}
                  <div className="overflow-x-auto flex-grow w-full custom-scrollbar">
                    <table className="min-w-[1200px] w-full divide-y divide-gray-100 table-fixed">
                      <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th scope="col" onClick={() => handleSort('sku')} className="w-44 px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group select-none">
                              <div className="flex items-center">SKU / 阶段 {getSortIcon('sku')}</div>
                          </th>
                          <th scope="col" onClick={() => handleSort('productName')} className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group select-none">
                              <div className="flex items-center">产品信息 {getSortIcon('productName')}</div>
                          </th>
                          <th scope="col" className="w-48 px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">物流 (Vol & Wgt)</th>
                          <th scope="col" onClick={() => handleSort('metrics.firstLegCostCNY')} className="w-44 px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group select-none">
                              <div className="flex items-center">资金投入 (Total) {getSortIcon('metrics.firstLegCostCNY')}</div>
                          </th>
                          
                          {/* UPDATED HEADER: Stock Quantity */}
                          <th scope="col" onClick={() => handleSort('quantity')} className="w-48 px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group select-none">
                              <div className="flex items-center">库存数量 (Stock) {getSortIcon('quantity')}</div>
                          </th>

                          <th scope="col" onClick={() => handleSort('metrics.marginRate')} className="w-36 px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 group select-none">
                              <div className="flex items-center">销售表现 {getSortIcon('metrics.marginRate')}</div>
                          </th>
                          <th scope="col" className="w-40 px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedRecords.map((record) => {
                          const m = record.metrics;
                          const lifecycle = getLifecycleBadge(record.lifecycle);
                          const productTotalCNY = record.quantity * record.unitPriceCNY;
                          const shippingTotalCNY = m.firstLegCostCNY;
                          const totalInvestCNY = productTotalCNY + shippingTotalCNY;
                          const store = stores.find(s => s.id === record.storeId);
                          
                          // DOS Bar Calculation (Max 60 days for bar full width)
                          const dosValue = Math.min(m.daysOfSupply, 60);
                          const dosPercent = (dosValue / 60) * 100;
                          let dosColor = 'bg-green-500';
                          if (m.daysOfSupply < 15) dosColor = 'bg-red-500';
                          else if (m.daysOfSupply < 30) dosColor = 'bg-yellow-500';
                          else if (m.daysOfSupply > 90) dosColor = 'bg-blue-400';

                          return (
                            <tr key={record.id} className="hover:bg-blue-50/50 transition-colors group">
                              <td onClick={() => openEditModal(record)} className="px-4 py-3 whitespace-nowrap cursor-pointer">
                                <div className="flex items-center gap-2 mb-1">
                                    {store ? <span className={`w-2 h-2 rounded-full ${store.color}`} title={store.name}></span> : <span className="w-2 h-2 rounded-full bg-gray-300" title="未分配"></span>}
                                    <div className="text-sm text-gray-900 font-bold font-mono truncate" title={record.sku}>{record.sku}</div>
                                </div>
                                <div className="mt-1 flex flex-col items-start gap-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${lifecycle.color}`}>{lifecycle.icon} {lifecycle.label}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(record.status)}`}>{getStatusLabel(record.status)}</span>
                                </div>
                              </td>
                              <td onClick={() => openEditModal(record)} className="px-4 py-3 cursor-pointer">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 mr-3">
                                    {record.imageUrl ? <img className="h-10 w-10 rounded-lg object-cover border border-gray-100" src={record.imageUrl} alt="" /> : <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-100"><Package size={18} /></div>}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight" title={record.productName}>{record.productName}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{record.date}</div>
                                    {/* Removed small Qty badge from here */}
                                  </div>
                                </div>
                              </td>
                              <td onClick={() => openEditModal(record)} className="px-4 py-3 whitespace-nowrap cursor-pointer">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border mb-1 ${record.shippingMethod === 'Air' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                  {record.shippingMethod === 'Air' ? <Plane className="w-3 h-3 mr-1"/> : <Ship className="w-3 h-3 mr-1"/>}
                                  {record.shippingMethod === 'Air' ? '空运' : '海运'}
                                </span>
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-xs text-gray-500 font-mono">{m.totalCartons}箱 | {m.totalWeightKg.toFixed(1)}kg</div>
                                  <div className="text-xs text-gray-400 font-mono">{m.totalVolumeCbm > 0 ? `${m.totalVolumeCbm.toFixed(3)} CBM` : '-'}</div>
                                </div>
                              </td>
                              <td onClick={() => openEditModal(record)} className="px-4 py-3 whitespace-nowrap cursor-pointer">
                                  <div className="flex flex-col gap-0.5">
                                      <span className="text-sm font-bold text-blue-900 font-mono">{formatCurrency(totalInvestCNY, 'CNY')}</span>
                                      <span className="text-[10px] text-gray-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>货: {formatCurrency(productTotalCNY, 'CNY')}</span>
                                      <span className="text-[10px] text-gray-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>运: {formatCurrency(shippingTotalCNY, 'CNY')}</span>
                                  </div>
                              </td>
                              
                              {/* UPDATED COLUMN: Inventory (Stock Quantity) */}
                              <td onClick={() => openEditModal(record)} className="px-4 py-3 whitespace-nowrap cursor-pointer">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-lg font-bold text-gray-800">{record.quantity} <span className="text-xs text-gray-400 font-normal">pcs</span></span>
                                        <span className={`text-xs font-bold ${m.stockStatus === 'Critical' ? 'text-red-600' : 'text-gray-500'}`}>
                                            {m.daysOfSupply < 999 ? `${m.daysOfSupply.toFixed(0)}天` : '∞'}
                                        </span>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                        className={`h-full rounded-full ${dosColor} transition-all duration-500`} 
                                        style={{ width: `${Math.min(dosPercent, 100)}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-center mt-0.5">
                                        <span className="text-[10px] text-gray-400">日销: {record.dailySales}</span>
                                        {m.stockStatus === 'Critical' && <span className="text-[10px] text-red-500 font-medium">急需补货</span>}
                                        {m.stockStatus === 'Low' && <span className="text-[10px] text-yellow-600 font-medium">建议备货</span>}
                                        {m.stockStatus === 'Healthy' && <span className="text-[10px] text-green-600 font-medium">健康</span>}
                                    </div>
                                </div>
                              </td>

                              <td onClick={() => openEditModal(record)} className="px-4 py-3 whitespace-nowrap cursor-pointer">
                                <div className="text-sm font-bold text-gray-900 font-mono flex items-center gap-1">
                                    ${record.salesPriceUSD.toFixed(2)}
                                </div>
                                <div className={`text-[10px] font-medium mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${m.marginRate < 15 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                    {m.marginRate > 20 ? <TrendingUp size={10} /> : null}
                                    毛利: {m.marginRate.toFixed(1)}%
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button 
                                        onClick={(e) => handleTableMarketingClick(e, record)} 
                                        className="p-1.5 rounded hover:bg-purple-100 text-purple-600 transition-colors"
                                        title="AI 营销"
                                    >
                                        <Wand2 size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => openLabelGenerator(e, record)} 
                                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                                        title="打印箱唛 (本地备份)"
                                    >
                                        <Printer size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => openDistributeModal(e, record)} 
                                        className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                                        title="分发/转移"
                                    >
                                        <ArrowRightLeft size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleQuickReorder(e, record)} 
                                        className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors active:bg-green-200"
                                        title="一键补货"
                                    >
                                        <CopyPlus size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            initiateDelete(record.id); 
                                        }} 
                                        className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {paginatedRecords.length === 0 && (
                       <div className="p-16 text-center">
                         <div className="inline-flex bg-gray-50 p-4 rounded-full mb-4"><Package className="h-8 w-8 text-gray-300" /></div>
                         <h3 className="text-gray-900 font-medium">暂无数据</h3>
                         <p className="text-gray-500 text-sm mt-1">请尝试调整筛选或添加新产品。</p>
                       </div>
                    )}
                  </div>

                  {/* ERP Pagination Footer */}
                  {processedData.length > 0 && (
                      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
                          <div className="text-xs text-gray-500">
                              显示 <span className="font-medium text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> 到 <span className="font-medium text-gray-800">{Math.min(currentPage * itemsPerPage, processedData.length)}</span> 条，共 <span className="font-medium text-gray-800">{processedData.length}</span> 条
                          </div>
                          <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setCurrentPage(1)} 
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                  <ChevronsLeft size={16} />
                              </button>
                              <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                  <ChevronLeft size={16} />
                              </button>
                              
                              <div className="flex items-center gap-1">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                                    .map((p, i, arr) => (
                                      <React.Fragment key={p}>
                                          {i > 0 && arr[i-1] !== p - 1 && <span className="text-gray-400 px-1">...</span>}
                                          <button
                                              onClick={() => setCurrentPage(p)}
                                              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                                                  currentPage === p 
                                                  ? 'bg-blue-600 text-white shadow-sm' 
                                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                                              }`}
                                          >
                                              {p}
                                          </button>
                                      </React.Fragment>
                                  ))}
                              </div>

                              <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                  <ChevronRight size={16} />
                              </button>
                              <button 
                                onClick={() => setCurrentPage(totalPages)} 
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                  <ChevronsRight size={16} />
                              </button>
                          </div>
                      </div>
                  )}
                </div>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
           <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="text-white h-5 w-5" /></div>
           <div><h1 className="font-bold text-lg tracking-tight">探行科技</h1><p className="text-xs text-slate-400">智能备货系统 v4.2 (Pro)</p></div>
        </div>
        
        {/* Command Palette Trigger in Sidebar */}
        <div className="px-4 pt-4">
            <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 rounded-lg p-2 flex items-center justify-between transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <Search size={14} />
                    <span className="text-xs">搜索...</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 rounded px-1.5 py-0.5 border border-slate-700">
                    <Command size={10} />
                    <span className="text-[10px]">K</span>
                </div>
            </button>
        </div>

        <div className="px-4 pt-4 pb-2">
           <div className="relative">
             <div className="bg-slate-800 rounded-lg p-2 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700" onClick={handleOpenStoreManager}>
                <div className="flex items-center gap-2 overflow-hidden"><StoreIcon size={16} className="text-slate-400 shrink-0"/><span className="text-sm font-medium truncate">店铺管理</span></div>
                <div className="bg-slate-600 text-[10px] px-1.5 rounded">{stores.length}</div>
             </div>
             <div className="mt-2 space-y-1">
                 <button onClick={() => setActiveStoreId('all')} className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-between ${activeStoreId === 'all' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><span>全部店铺 (All)</span>{activeStoreId === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}</button>
                 {stores.map(store => (
                     <button key={store.id} onClick={() => setActiveStoreId(store.id)} className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-between ${activeStoreId === store.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                        <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${store.color}`}></span><span className="truncate max-w-[120px]">{store.name}</span></div>
                        {activeStoreId === store.id && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                     </button>
                 ))}
             </div>
           </div>
        </div>
        <div className="px-4 py-2 border-t border-slate-800 mt-2"></div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">主菜单</div>
          <button onClick={() => setCurrentView('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Home size={20} /><span className="font-medium">系统总览</span></button>
          <button onClick={() => setCurrentView('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><List size={20} /><span className="font-medium">备货清单</span></button>
          <button onClick={() => setCurrentView('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><PieChart size={20} /><span className="font-medium">数据分析</span></button>
          <div className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">AI 赋能中心</div>
          <button onClick={() => setCurrentView('marketing')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${currentView === 'marketing' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Sparkles size={20} className={currentView === 'marketing' ? 'text-yellow-300' : 'group-hover:text-purple-400'} /><span className="font-medium">AI 营销中心</span></button>
          <div className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">实用工具</div>
          <button onClick={() => setCurrentView('calculator')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'calculator' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Calculator size={20} /><span className="font-medium">智能试算</span></button>
          <button onClick={() => setCurrentView('logistics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'logistics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Search size={20} /><span className="font-medium">物流查询</span></button>
          <button onClick={() => setIsBackupOpen(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-400 hover:bg-slate-800 hover:text-white`}><FileJson size={20} /><span className="font-medium">数据备份</span></button>
          
          {/* Recycle Bin Button */}
          <button 
            onClick={() => setIsRecycleBinOpen(true)} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-400 hover:bg-slate-800 hover:text-red-400 group relative`}
          >
              <Trash2 size={20} />
              <span className="font-medium">回收站</span>
              {deletedRecords.length > 0 && (
                  <span className="absolute right-4 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {deletedRecords.length}
                  </span>
              )}
          </button>

          <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isSettingsOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Settings size={20} /><span className="font-medium">系统设置</span></button>
        </nav>
        
        {/* User Profile Section (New for ERP feel) */}
        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                    <UserCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">Admin User</p>
                    <p className="text-[10px] text-slate-500 truncate">admin@tanxing.tech</p>
                </div>
            </div>
            <div onClick={() => setIsAiChatOpen(true)} className="bg-slate-800 rounded-xl p-3 cursor-pointer hover:bg-slate-700 transition-all group relative overflow-hidden flex items-center gap-3 border border-slate-700">
                <div className="bg-purple-900/50 p-1.5 rounded-lg"><Bot className="text-purple-400 h-4 w-4" /></div>
                <div>
                    <span className="text-xs font-bold text-purple-200 block">AI Copilot</span>
                    <span className="text-[10px] text-slate-400 block">点击唤起助手</span>
                </div>
            </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden"><div className="font-bold text-gray-800">探行科技</div><button className="text-gray-500"><Menu /></button></header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 relative">
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          <div className="max-w-[1920px] w-full mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  {getPageTitle()}
                  {activeStoreId !== 'all' && (<span className="text-sm font-medium bg-slate-800 text-white px-3 py-1 rounded-full flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${stores.find(s => s.id === activeStoreId)?.color}`}></span>{stores.find(s => s.id === activeStoreId)?.name}</span>)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{getPageSubtitle()}</p>
              </div>
              <div className="flex items-center gap-3">
                {workspaceId && (<div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${syncStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : syncStatus === 'connecting' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{syncStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}<span className="hidden sm:inline">工作区: {workspaceId}</span><span className="sm:hidden">{workspaceId}</span><div className={`w-2 h-2 rounded-full ${syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : syncStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>{syncStatus === 'connecting' && <span className="text-[10px]">连接中...</span>}{syncStatus === 'disconnected' && <span className="text-[10px]">断开</span>}</div>)}
                {(currentView === 'inventory' || currentView === 'overview' || currentView === 'marketing') && (
                  <>
                    {currentView !== 'marketing' && (
                        <>
                            <button onClick={handleLogisticsAnalysis} disabled={isAnalyzing} className="flex items-center gap-2 bg-cyan-50 text-cyan-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-cyan-100 transition-colors border border-cyan-200 shadow-sm">
                                {isAnalyzing && analysisTitle.includes('物流') ? <Loader2 className="animate-spin h-4 w-4" /> : <Container className="h-4 w-4" />}
                                物流渠道分析
                            </button>
                            <button onClick={handleAdStrategy} disabled={isAnalyzing} className="flex items-center gap-2 bg-pink-50 text-pink-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-pink-100 transition-colors border border-pink-200 shadow-sm">{isAnalyzing && analysisTitle.includes('TikTok') ? <Loader2 className="animate-spin h-4 w-4" /> : <Megaphone className="h-4 w-4" />}TikTok 投放建议</button>
                            <button onClick={handleSelectionStrategy} disabled={isAnalyzing} className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors border border-orange-200 shadow-sm">{isAnalyzing && analysisTitle.includes('选品') ? <Loader2 className="animate-spin h-4 w-4" /> : <Compass className="h-4 w-4" />}美区选品策略</button>
                        </>
                    )}
                    {currentView === 'inventory' && (<button onClick={handleSmartAnalysis} disabled={isAnalyzing} className="flex items-center gap-2 bg-white text-purple-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors border border-purple-200 shadow-sm">{isAnalyzing && !analysisTitle.includes('TikTok') && !analysisTitle.includes('选品') && !analysisTitle.includes('物流') ? <Loader2 className="animate-spin h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}{isAnalyzing && !analysisTitle.includes('TikTok') && !analysisTitle.includes('选品') && !analysisTitle.includes('物流') ? '正在分析...' : '智能诊断'}</button>)}
                    {currentView === 'inventory' && (<button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-bold active:scale-95 transform"><Plus size={18} />添加产品</button>)}
                  </>
                )}
              </div>
            </div>
            {renderContent()}
          </div>
        </main>
      </div>
      <CloudConnect isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentWorkspaceId={workspaceId} onConnect={setWorkspaceId} onDisconnect={() => setWorkspaceId(null)} isSyncing={syncStatus === 'connecting'} />
      <StoreManagerModal isOpen={isStoreManagerOpen} onClose={() => setIsStoreManagerOpen(false)} stores={stores} onAddStore={handleAddStore} onDeleteStore={handleDeleteStore} />
      <RecordModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSaveRecord} initialData={editingRecord} stores={stores} defaultStoreId={activeStoreId} />
      <ConfirmDialog isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({isOpen: false, id: null})} onConfirm={confirmSoftDelete} title="确认删除产品" message="此操作会将产品移至回收站，保留7天后自动永久删除。" />
      <RecycleBinModal 
        isOpen={isRecycleBinOpen} 
        onClose={() => setIsRecycleBinOpen(false)} 
        deletedRecords={deletedRecords}
        onRestore={handleRestoreRecord}
        onDeleteForever={handleHardDeleteRecord}
      />
      
      {/* Label Generator Modal */}
      <LabelGeneratorModal 
        isOpen={isLabelModalOpen} 
        onClose={() => setIsLabelModalOpen(false)} 
        record={labelRecord} 
      />

      {/* Restock Plan Modal */}
      <RestockPlanModal 
        isOpen={isRestockPlanOpen}
        onClose={() => setIsRestockPlanOpen(false)}
        records={records}
      />

      {/* NEW: ERP Sync Modal */}
      <ErpSyncModal 
        isOpen={isErpSyncOpen}
        onClose={() => setIsErpSyncOpen(false)}
        records={records}
        onUpdateRecords={handleErpUpdate}
      />

      {/* Distribute Modal */}
      <DistributeModal isOpen={isDistributeModalOpen} onClose={() => setIsDistributeModalOpen(false)} sourceRecord={distributeSourceRecord} stores={stores} onConfirm={handleDistributeConfirm} />
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        records={records}
        onNavigate={handleCommandNavigate}
        onOpenRecord={handleCommandOpenRecord}
        onAction={handleCommandAction}
      />
      <AiChatModal isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} records={records} />
      <MarketingModal isOpen={marketingModalOpen} onClose={() => setMarketingModalOpen(false)} content={marketingContent} productName={marketingProduct} />
      <DataBackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} records={records} onImportData={handleImportData} />
    </div>
  );
}

export default App;
