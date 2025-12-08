
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  RefreshCw,
  Clock,
  ExternalLink,
  Target,
  CheckSquare,
  Square,
  FileText,
  Factory,
  ShoppingCart,
  ArrowRight,
  Warehouse,
  ShoppingBag,
  Wallet // New Icon for Finance
} from 'lucide-react';
import { ReplenishmentRecord, Store, CalculatedMetrics, PurchaseOrder, AppSettings, InventoryLog, FinanceTransaction } from './types';
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
import { StoreManagerModal } from './components/StoreManagerModal';
import { DistributeModal } from './components/DistributeModal'; 
import { CommandPalette } from './components/CommandPalette'; 
import { ConfirmDialog } from './components/ConfirmDialog';
import { RecycleBinModal } from './components/RecycleBinModal';
import { LabelGeneratorModal } from './components/LabelGeneratorModal'; 
import { RestockPlanModal } from './components/RestockPlanModal'; 
import { ErpSyncModal } from './components/ErpSyncModal'; 
import { PurchaseOrderModal } from './components/PurchaseOrderModal';
import { PurchaseOrderManager } from './components/PurchaseOrderManager';
import { SettingsModal } from './components/SettingsModal';
import { InventoryWMS } from './components/InventoryWMS';
import { FinanceCenter } from './components/FinanceCenter'; // NEW IMPORT
import { ToastContainer, ToastMessage, ToastType } from './components/Toast'; 
import { analyzeInventory, generateAdStrategy, generateSelectionStrategy, generateMarketingContent, analyzeLogisticsChannels, generateFinancialReport } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { fetchLingxingInventory, fetchLingxingSales } from './services/lingxingService';
import { fetchMiaoshouInventory, fetchMiaoshouSales } from './services/miaoshouService';
import { DataBackupModal } from './components/DataBackupModal'; 

type ViewState = 'overview' | 'inventory' | 'analytics' | 'calculator' | 'logistics' | 'marketing' | 'purchasing' | 'wms' | 'finance';

// Extended type for sorting
type EnrichedRecord = ReplenishmentRecord & { metrics: CalculatedMetrics };

// Helper for Safe JSON Parsing
const safeParse = (key: string, fallback: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Error parsing ${key}`, e);
        return fallback;
    }
};

function App() {
  // --- Cloud & Workspace State ---
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => localStorage.getItem('tanxing_current_workspace'));
  
  const [syncStatus, setSyncStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false); 

  // --- Store Management State ---
  const [stores, setStores] = useState<Store[]>(() => safeParse('tanxing_stores', []));
  const [activeStoreId, setActiveStoreId] = useState<string>('all');
  const [isStoreManagerOpen, setIsStoreManagerOpen] = useState(false);

  // --- Global Settings State ---
  const [appSettings, setAppSettings] = useState<AppSettings>(() => safeParse('tanxing_app_settings', { 
      exchangeRate: 7.3, 
      airTiers: [{ minWeight: 0, maxWeight: 9999, price: 65 }], 
      seaTiers: [{ minWeight: 0, maxWeight: 9999, price: 12 }] 
  }));
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  // --- Data State ---
  const [records, setRecords] = useState<ReplenishmentRecord[]>(() => safeParse('tanxing_records', MOCK_DATA_INITIAL));
  
  // --- Purchase Orders State ---
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => safeParse('tanxing_purchase_orders', []));

  // --- Inventory Logs State (WMS) ---
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => safeParse('tanxing_inventory_logs', []));

  // --- NEW: Finance Transactions State ---
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>(() => safeParse('tanxing_finance_transactions', []));

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastErpSync, setLastErpSync] = useState<Date | null>(null);
  const [isAutoSyncActive, setIsAutoSyncActive] = useState(true); 

  // --- ERP Table State (Sorting & Pagination) ---
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // --- Selection State ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  const [isErpSyncOpen, setIsErpSyncOpen] = useState(false); 
  
  // --- Purchase Order Modal State (Generator) ---
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poRecord, setPORecord] = useState<ReplenishmentRecord | null>(null);

  // --- Backup Modal State ---
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // --- Delete Confirmation & Trash State ---
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);

  // --- Command Palette State ---
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analysisTitle, setAnalysisTitle] = useState<string>('供应链 AI 诊断报告');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('inventory'); 

  // --- AI Chat State ---
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // --- Marketing Modal State ---
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [marketingContent, setMarketingContent] = useState<string | null>(null);
  const [marketingRecord, setMarketingRecord] = useState<ReplenishmentRecord | null>(null); 

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Planning' | 'Shipped' | 'Arrived'>('All');

  // --- Toast State ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Refs for auto-sync intervals
  const autoSyncRef = useRef<number | null>(null);

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

  // --- Finance Handlers ---
  const handleAddTransaction = (t: FinanceTransaction) => {
      setFinanceTransactions(prev => {
          const newList = [t, ...prev];
          localStorage.setItem('tanxing_finance_transactions', JSON.stringify(newList));
          return newList;
      });
      addToast('记账成功', 'success');
  };

  const handleDeleteTransaction = (id: string) => {
      setFinanceTransactions(prev => {
          const newList = prev.filter(t => t.id !== id);
          localStorage.setItem('tanxing_finance_transactions', JSON.stringify(newList));
          return newList;
      });
      addToast('记录已删除', 'info');
  };

  // --- Save Handlers ---
  const handleSaveSettings = (newSettings: AppSettings) => {
      setAppSettings(newSettings);
      localStorage.setItem('tanxing_app_settings', JSON.stringify(newSettings));
      addToast("全局配置已保存", "success");
  };

  const handleUpdatePO = (updatedPO: PurchaseOrder) => {
      setPurchaseOrders(prevOrders => {
          const newList = prevOrders.map(o => o.id === updatedPO.id ? updatedPO : o);
          try { localStorage.setItem('tanxing_purchase_orders', JSON.stringify(newList)); } catch(e){}
          return newList;
      });
      addToast("采购单状态已更新", "success");
  };

  const handleDeletePO = (id: string) => {
      setPurchaseOrders(prevOrders => {
          const newList = prevOrders.filter(o => o.id !== id);
          try { localStorage.setItem('tanxing_purchase_orders', JSON.stringify(newList)); } catch(e){}
          return newList;
      });
      addToast("采购单已删除", "info");
  };

  const handleCreatePO = (newPO: PurchaseOrder) => {
      setPurchaseOrders(prevOrders => {
          const newList = [...prevOrders, newPO];
          try { localStorage.setItem('tanxing_purchase_orders', JSON.stringify(newList)); } catch(e){}
          return newList;
      });
      addToast("采购单已创建", "success");
      setCurrentView('purchasing'); 
  };

  const handleReceiveStockFromPO = (po: PurchaseOrder) => {
      // 1. Update PO
      setPurchaseOrders(prevOrders => {
          const updatedList = prevOrders.map(o => 
              o.id === po.id ? { ...o, status: 'Arrived' as const } : o
          );
          localStorage.setItem('tanxing_purchase_orders', JSON.stringify(updatedList));
          return updatedList;
      });

      // 2. Add to Inventory Log (New WMS Logic)
      const newLog: InventoryLog = {
          id: `LOG-${Date.now()}`,
          date: new Date().toISOString(),
          sku: po.sku,
          warehouse: 'CN_Local', // Default receiving warehouse
          type: 'Inbound',
          quantityChange: po.quantity,
          referenceId: po.poNumber,
          note: 'PO Auto Receive'
      };
      
      handleAddInventoryLog(newLog); // Reuse common handler

      setTimeout(() => addToast(`入库成功：${po.productName} 库存 +${po.quantity}`, "success"), 0);
  };

  // --- NEW: Add Inventory Log (Centralized Stock Update Logic) ---
  const handleAddInventoryLog = (log: InventoryLog) => {
      // 1. Add Log
      setInventoryLogs(prev => {
          const newList = [log, ...prev];
          localStorage.setItem('tanxing_inventory_logs', JSON.stringify(newList));
          return newList;
      });

      // 2. Update Master Record Total Quantity
      setRecords(prev => {
          const targetIndex = prev.findIndex(r => r.sku === log.sku);
          if (targetIndex !== -1) {
              const record = prev[targetIndex];
              const newQty = (record.quantity || 0) + log.quantityChange;
              const updatedRecord = { ...record, quantity: newQty };
              const newList = [...prev];
              newList[targetIndex] = updatedRecord;
              
              localStorage.setItem('tanxing_records', JSON.stringify(newList));
              syncItemToCloud(updatedRecord);
              return newList;
          }
          return prev;
      });
  };
  
  const handleAddBatchLogs = (logs: InventoryLog[]) => {
      // Batch update logic for performance
      setInventoryLogs(prev => {
          const newList = [...logs, ...prev];
          localStorage.setItem('tanxing_inventory_logs', JSON.stringify(newList));
          return newList;
      });

      // Recalculate totals for affected SKUs
      setRecords(prev => {
          const newList = [...prev];
          let changed = false;
          
          logs.forEach(log => {
              const idx = newList.findIndex(r => r.sku === log.sku);
              if (idx !== -1) {
                  newList[idx] = { 
                      ...newList[idx], 
                      quantity: (newList[idx].quantity || 0) + log.quantityChange 
                  };
                  syncItemToCloud(newList[idx]);
                  changed = true;
              }
          });
          
          if(changed) localStorage.setItem('tanxing_records', JSON.stringify(newList));
          return changed ? newList : prev;
      });
      addToast(`已批量处理 ${logs.length} 条库存流水`, "success");
  };

  const handleAiAction = (type: string, data: any) => {
      if (type === 'create_po') {
          const newPO: PurchaseOrder = {
              id: Date.now().toString(),
              poNumber: `PO-AI-${Date.now().toString().slice(-4)}`,
              date: new Date().toISOString().split('T')[0],
              sku: data.sku,
              productName: records.find(r => r.sku === data.sku)?.productName || data.sku,
              quantity: data.quantity || 100,
              unitPriceCNY: records.find(r => r.sku === data.sku)?.unitPriceCNY || 0,
              totalAmountCNY: (records.find(r => r.sku === data.sku)?.unitPriceCNY || 0) * (data.quantity || 100),
              status: 'Draft'
          };
          handleCreatePO(newPO);
          addToast("AI 已为您创建采购草稿单", "success");
      }
  };

  // --- Derived State: Active & Deleted Records ---
  const activeRecords = useMemo(() => {
    let filtered = records.filter(r => !r.isDeleted);
    
    // Multi-store filter support
    if (activeStoreId !== 'all') {
      filtered = filtered.filter(r => {
         const ids = r.storeIds || (r.storeId ? [r.storeId] : []);
         return ids.includes(activeStoreId);
      });
    }
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(r => 
            r.productName.toLowerCase().includes(q) || 
            r.sku.toLowerCase().includes(q)
        );
    }
    if (statusFilter !== 'All') {
        filtered = filtered.filter(r => r.status === statusFilter);
    }
    return filtered;
  }, [records, activeStoreId, searchQuery, statusFilter]);

  const deletedRecords = useMemo(() => records.filter(r => r.isDeleted), [records]);

  // --- Derived State: Sorted Records for Table ---
  const sortedRecords = useMemo(() => {
    if (!sortConfig) return activeRecords;
    
    const sorted = [...activeRecords].sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof ReplenishmentRecord];
        let valB: any = b[sortConfig.key as keyof ReplenishmentRecord];
        
        const metricsA = calculateMetrics(a, appSettings);
        const metricsB = calculateMetrics(b, appSettings);

        if (sortConfig.key === 'profit') {
            valA = metricsA.estimatedProfitUSD;
            valB = metricsB.estimatedProfitUSD;
        } else if (sortConfig.key === 'daysOfSupply') {
            valA = metricsA.daysOfSupply;
            valB = metricsB.daysOfSupply;
        } else if (sortConfig.key === 'quantity') {
            valA = a.quantity;
            valB = b.quantity;
        } else if (sortConfig.key === 'totalInvestment') {
            valA = (a.quantity * a.unitPriceCNY) + metricsA.firstLegCostCNY;
            valB = (b.quantity * b.unitPriceCNY) + metricsB.firstLegCostCNY;
        } else if (sortConfig.key === 'sku') {
            valA = a.sku;
            valB = b.sku;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
  }, [activeRecords, sortConfig, appSettings]);

  // --- Handlers ---
  const handleAddStore = (newStore: Omit<Store, 'id'>) => {
    const store: Store = { ...newStore, id: Date.now().toString() };
    const updated = [...stores, store];
    setStores(updated);
    localStorage.setItem('tanxing_stores', JSON.stringify(updated));
    addToast('店铺添加成功', 'success');
  };

  const handleDeleteStore = (id: string) => {
    const updated = stores.filter(s => s.id !== id);
    setStores(updated);
    localStorage.setItem('tanxing_stores', JSON.stringify(updated));
    if (activeStoreId === id) setActiveStoreId('all');
    addToast('店铺已删除', 'info');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSaveRecord = async (recordData: Omit<ReplenishmentRecord, 'id'>) => {
    const newRecord: ReplenishmentRecord = {
      ...recordData,
      id: editingRecord ? editingRecord.id : Date.now().toString(),
      isDeleted: false
    };

    let updatedRecords: ReplenishmentRecord[];
    if (editingRecord) {
      updatedRecords = records.map(r => r.id === newRecord.id ? newRecord : r);
      addToast("记录已更新", "success");
    } else {
      updatedRecords = [...records, newRecord];
      addToast("新记录已添加", "success");
    }
    
    setRecords(updatedRecords);
    localStorage.setItem('tanxing_records', JSON.stringify(updatedRecords));
    await syncItemToCloud(newRecord);
  };
  
  const confirmSoftDelete = async () => {
    if (deleteConfirm.id) {
        const updatedRecords = records.map(r => 
            r.id === deleteConfirm.id 
            ? { ...r, isDeleted: true, deletedAt: new Date().toISOString() } 
            : r
        );
        setRecords(updatedRecords);
        localStorage.setItem('tanxing_records', JSON.stringify(updatedRecords));
        if (selectedIds.has(deleteConfirm.id)) {
            const newSet = new Set(selectedIds);
            newSet.delete(deleteConfirm.id);
            setSelectedIds(newSet);
        }
        const record = updatedRecords.find(r => r.id === deleteConfirm.id);
        if (record) await syncItemToCloud(record);
        addToast("已移入回收站", "info");
        setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleRestoreRecord = async (id: string) => {
      const updatedRecords = records.map(r => 
          r.id === id ? { ...r, isDeleted: false, deletedAt: undefined } : r
      );
      setRecords(updatedRecords);
      localStorage.setItem('tanxing_records', JSON.stringify(updatedRecords));
      const record = updatedRecords.find(r => r.id === id);
      if (record) await syncItemToCloud(record);
      addToast("记录已恢复", "success");
  };

  const handleHardDeleteRecord = async (id: string) => {
      const updatedRecords = records.filter(r => r.id !== id);
      setRecords(updatedRecords);
      localStorage.setItem('tanxing_records', JSON.stringify(updatedRecords));
      await deleteItemFromCloud(id);
      addToast("记录已永久删除", "warning");
  };

  const handleErpUpdate = (updatedList: ReplenishmentRecord[]) => {
      setRecords(updatedList);
      localStorage.setItem('tanxing_records', JSON.stringify(updatedList));
      updatedList.forEach(r => syncItemToCloud(r));
      addToast("ERP 数据同步成功", "success");
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === activeRecords.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(activeRecords.map(r => r.id)));
      }
  };

  const runAiTask = async (taskName: string, taskFunction: () => Promise<string>) => {
      if (activeRecords.length === 0) {
          addToast("没有可分析的数据", "warning");
          return;
      }
      setIsAnalyzing(true);
      setAnalysisTitle(taskName);
      setAiAnalysis(null);
      try {
          const result = await taskFunction();
          setAiAnalysis(result);
      } catch (e) {
          addToast("AI 分析失败，请重试", "error");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleSmartAnalysis = () => runAiTask("供应链 AI 诊断报告", () => analyzeInventory(activeRecords));
  const handleLogisticsAnalysis = () => runAiTask("物流渠道优选报告", () => analyzeLogisticsChannels(activeRecords));
  const handleTikTokStrategy = () => runAiTask("TikTok 投放建议", () => generateAdStrategy(activeRecords));
  const handleSelectionStrategy = () => runAiTask("美区选品与增长策略", () => generateSelectionStrategy(activeRecords));
  const handleFinancialReport = () => runAiTask("供应链财务损益分析", () => generateFinancialReport(activeRecords));
  
  const handleMarketingGenerate = async (record: ReplenishmentRecord) => {
      setMarketingRecord(record); 
      setMarketingContent(null);
      setMarketingModalOpen(true);
      const content = await generateMarketingContent(record);
      setMarketingContent(content);
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
          storeId: targetStoreId, // Keep for backward compat
          storeIds: [targetStoreId], // NEW: Explicitly set single store for distributed item
          quantity: quantity,
          totalCartons: newTotalCartons,
          manualTotalWeightKg: manualWeightRatio,
          status: distributeSourceRecord.status,
          date: mode === 'clone' ? new Date().toISOString().split('T')[0] : distributeSourceRecord.date
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
          localStorage.setItem('tanxing_records', JSON.stringify(list));
          return list;
      });

      await syncItemToCloud(newRecord);
      if (updatedSourceRecord) await syncItemToCloud(updatedSourceRecord);
      addToast('操作成功', 'success');
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // --- Render Content ---
  const renderContent = () => {
      switch (currentView) {
          case 'overview':
              return <HomeOverview records={activeRecords} stores={stores} currentStoreId={activeStoreId} onNavigateToList={() => setCurrentView('inventory')} />;
          case 'analytics':
              return <AnalyticsDashboard records={activeRecords} />;
          case 'marketing':
              return <MarketingDashboard records={activeRecords} onGenerate={handleMarketingGenerate} />;
          case 'calculator':
              return <CalculatorTool />;
          case 'logistics':
              return <LogisticsTools />;
          case 'wms':
              return <InventoryWMS records={records} logs={inventoryLogs} onAddLog={handleAddInventoryLog} />;
          case 'finance':
              return (
                  <FinanceCenter 
                      transactions={financeTransactions}
                      purchaseOrders={purchaseOrders}
                      onAddTransaction={handleAddTransaction}
                      onDeleteTransaction={handleDeleteTransaction}
                      settings={appSettings}
                  />
              );
          case 'purchasing':
              return (
                <div className="flex flex-col gap-4">
                    {purchaseOrders.length === 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                    <ShoppingCart size={20} />
                                </div>
                                <div className="text-sm text-blue-800">
                                    <span className="font-bold block">尚未创建采购单</span>
                                    请前往“备货清单”选择商品，点击“采购”按钮创建第一笔订单。
                                </div>
                            </div>
                            <button 
                                onClick={() => setCurrentView('inventory')} 
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                去备货 <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                    <PurchaseOrderManager 
                        orders={purchaseOrders} 
                        onUpdateOrder={handleUpdatePO} 
                        onDeleteOrder={handleDeletePO} 
                        onReceiveStock={handleReceiveStockFromPO} 
                    />
                </div>
              );
          case 'inventory':
          default:
              const startIndex = (currentPage - 1) * itemsPerPage;
              const paginatedRecords = sortedRecords.slice(startIndex, startIndex + itemsPerPage);

              return (
                <div className="space-y-4 animate-fade-in pb-20">
                    {/* Top Toolbar */}
                    <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="relative group w-full xl:w-96">
                             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                             <input 
                                type="text" 
                                placeholder="搜索产品名称或 SKU..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-full transition-all text-sm"
                             />
                        </div>
                        <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
                             <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                 <Filter size={14} className="text-gray-500"/>
                                 <span className="text-xs text-gray-500 font-medium">状态:</span>
                                 <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
                                 >
                                     <option value="All">全部 (All)</option>
                                     <option value="Planning">计划中</option>
                                     <option value="Shipped">运输中</option>
                                     <option value="Arrived">已入库</option>
                                 </select>
                             </div>
                        </div>
                    </div>

                    {/* AI Analysis Result */}
                    {aiAnalysis && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 relative overflow-hidden animate-slide-up">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Sparkles className="text-purple-500" size={20} />
                                    {analysisTitle}
                                </h3>
                                <button onClick={() => setAiAnalysis(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                            </div>
                            <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: aiAnalysis }} />
                        </div>
                    )}

                    {/* Table Container */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <List size={16} className="text-gray-400"/>
                                    库存清单
                                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{activeRecords.length}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-green-100/50 text-green-700 px-2 py-1 rounded-md border border-green-200 text-[10px] font-bold">
                                    <Clock size={10} />
                                    Auto: ON
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsErpSyncOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm">
                                    <RefreshCw size={12} /> ERP 同步
                                </button>
                                <button onClick={() => setIsRestockPlanOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm">
                                    <CalendarClock size={12} /> {selectedIds.size > 0 ? `补货规划 (${selectedIds.size})` : '智能补货规划'}
                                </button>
                                <button onClick={() => setIsBackupModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm" title="导出数据">
                                    <Download size={12} /> 导出
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 pl-6 w-12">
                                            <button onClick={toggleSelectAll} className="flex items-center text-gray-400 hover:text-blue-500">
                                                {selectedIds.size > 0 && selectedIds.size === activeRecords.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                            </button>
                                        </th>
                                        <th onClick={() => requestSort('sku')} className="p-4 pl-0 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 w-[180px]">
                                            <div className="flex items-center gap-1">SKU / 阶段 {sortConfig?.key === 'sku' && <ChevronDown size={12} />}</div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">产品信息 / 供应商</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">物流 (Live Tracking)</th>
                                        <th onClick={() => requestSort('totalInvestment')} className="p-4 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                                            <div className="flex items-center gap-1">资金投入 (TOTAL) {sortConfig?.key === 'totalInvestment' && <ChevronDown size={12} />}</div>
                                        </th>
                                        <th onClick={() => requestSort('daysOfSupply')} className="p-4 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                                            <div className="flex items-center gap-1">库存数量 (STOCK) {sortConfig?.key === 'daysOfSupply' && <ChevronDown size={12} />}</div>
                                        </th>
                                        <th onClick={() => requestSort('profit')} className="p-4 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
                                            <div className="flex items-center gap-1">销售表现 {sortConfig?.key === 'profit' && <ChevronDown size={12} />}</div>
                                        </th>
                                        <th className="p-4 pr-6 text-xs font-bold text-gray-500 uppercase text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-gray-400">
                                                <Package size={48} className="mx-auto mb-3 opacity-20" />
                                                <p>暂无符合条件的记录</p>
                                                <button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className="mt-4 text-blue-600 font-bold text-sm hover:underline">
                                                    立即添加
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedRecords.map((record) => {
                                            const metrics = calculateMetrics(record, appSettings);
                                            const totalInvestment = (record.quantity * record.unitPriceCNY) + metrics.firstLegCostCNY;
                                            
                                            let lifecycleClass = 'bg-gray-100 text-gray-500';
                                            let lifecycleIcon = null;
                                            if (record.lifecycle === 'New') { lifecycleClass = 'bg-blue-50 text-blue-600 border-blue-100'; lifecycleIcon = '🌱 新品'; }
                                            else if (record.lifecycle === 'Growth') { lifecycleClass = 'bg-emerald-50 text-emerald-600 border-emerald-100'; lifecycleIcon = '🚀 爆品'; }
                                            else if (record.lifecycle === 'Stable') { lifecycleClass = 'bg-indigo-50 text-indigo-600 border-indigo-100'; lifecycleIcon = '⚖️ 稳定'; }
                                            else if (record.lifecycle === 'Clearance') { lifecycleClass = 'bg-red-50 text-red-600 border-red-100'; lifecycleIcon = '📉 清仓'; }

                                            const isUrgent = metrics.daysOfSupply < 15;
                                            const isRecommended = metrics.daysOfSupply >= 15 && metrics.daysOfSupply < 30;
                                            const isSelected = selectedIds.has(record.id);

                                            return (
                                                <tr key={record.id} className={`hover:bg-blue-50/20 transition-colors group ${isSelected ? 'bg-blue-50/40' : ''}`}>
                                                    <td className="p-4 pl-6 align-top">
                                                        <button onClick={() => toggleSelection(record.id)} className="text-gray-300 hover:text-blue-500 pt-1">
                                                            {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 pl-0 align-top">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                                                                <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                                                {record.sku}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${lifecycleClass} font-medium flex items-center gap-1`}>
                                                                    {lifecycleIcon}
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                                                    record.status === 'Planning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                    record.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                    'bg-green-50 text-green-700 border-green-200'
                                                                }`}>
                                                                    {record.status === 'Planning' ? '计划中' : record.status === 'Shipped' ? '运输中' : '已入库'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex items-start gap-3">
                                                            <div 
                                                                className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 cursor-pointer"
                                                                onClick={() => { setEditingRecord(record); setIsModalOpen(true); }}
                                                            >
                                                                {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 text-gray-300"/>}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-800 line-clamp-1 max-w-[150px]" title={record.productName}>{record.productName}</div>
                                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{record.date}</div>
                                                                {record.supplierName && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1 bg-gray-100 px-1.5 py-0.5 rounded w-fit">
                                                                        <Factory size={10} />
                                                                        <span className="truncate max-w-[100px]">{record.supplierName}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1">
                                                            {record.shippingMethod === 'Air' ? <Plane size={12} className="text-blue-500"/> : <Ship size={12} className="text-indigo-500"/>}
                                                            <span className={record.shippingMethod === 'Air' ? 'text-blue-600' : 'text-indigo-600'}>
                                                                {record.shippingMethod === 'Air' ? '空运' : '海运'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">
                                                            {record.totalCartons}箱 | {metrics.totalWeightKg.toFixed(1)}kg
                                                        </div>
                                                        {record.status === 'Shipped' && record.trackingNumber && (
                                                            <div className="mt-1">
                                                                <a 
                                                                    href={`https://www.17track.net/zh-cn/track?nums=${record.trackingNumber}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit"
                                                                >
                                                                    <Truck size={10} />
                                                                    {record.carrier || 'Track'}: {record.trackingNumber.slice(0, 8)}...
                                                                </a>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="font-bold text-sm text-slate-800">
                                                            {formatCurrency(totalInvestment, 'CNY')}
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                                货: {formatCurrency(record.quantity * record.unitPriceCNY, 'CNY')}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                                                运: {formatCurrency(metrics.firstLegCostCNY, 'CNY')}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-lg font-bold text-gray-800">{record.quantity} <span className="text-xs font-normal text-gray-400">pcs</span></div>
                                                            {record.dailySales > 0 && (
                                                                <div className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 rounded">
                                                                    {metrics.daysOfSupply.toFixed(0)}天
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-between items-center mt-1 pr-4">
                                                            <span className="text-[10px] text-gray-400">日销: {record.dailySales}</span>
                                                            {isUrgent && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1 rounded">急需补货</span>}
                                                            {isRecommended && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1 rounded">建议备货</span>}
                                                        </div>
                                                        {record.dailySales > 0 && (
                                                            <div className="w-full bg-gray-100 h-1 rounded-full mt-1.5 max-w-[100px]">
                                                                <div 
                                                                    className={`h-1 rounded-full ${isUrgent ? 'bg-red-500' : isRecommended ? 'bg-orange-400' : 'bg-green-500'}`}
                                                                    style={{ width: `${Math.min(metrics.daysOfSupply, 90)}%` }}
                                                                ></div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="font-bold text-sm text-gray-800">${record.salesPriceUSD}</div>
                                                        <div className="text-[10px] font-bold text-green-600 mt-1 flex items-center gap-1">
                                                            <TrendingUp size={10} />
                                                            毛利: {metrics.marginRate.toFixed(1)}%
                                                        </div>
                                                        <div className="text-[10px] text-red-400 mt-0.5">
                                                            毛利: ${metrics.estimatedProfitUSD.toFixed(2)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 pr-6 align-top text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={() => { setPORecord(record); setIsPOModalOpen(true); }}
                                                                className="px-3 py-1.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 hover:border-orange-300 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                                                                title="生成 PO / 议价邮件"
                                                            >
                                                                <FileText size={14} />
                                                                采购
                                                            </button>
                                                            <button 
                                                                onClick={() => { setEditingRecord(record); setIsModalOpen(true); }}
                                                                className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                                                                title="编辑详情"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { setDistributeSourceRecord(record); setIsDistributeModalOpen(true); }}
                                                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                                                title="库存分发"
                                                            >
                                                                <ArrowRightLeft size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => setDeleteConfirm({ isOpen: true, id: record.id })}
                                                                className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                                                                title="删除"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
                             <span className="text-xs text-gray-400">显示 1 到 {Math.min(activeRecords.length, itemsPerPage)} 条，共 {activeRecords.length} 条</span>
                             <div className="flex gap-2">
                                 <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"><ChevronLeft size={14}/></button>
                                 <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-200">{currentPage}</button>
                                 <button disabled={currentPage * itemsPerPage >= activeRecords.length} onClick={() => setCurrentPage(c => c + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"><ChevronRight size={14}/></button>
                             </div>
                        </div>
                    </div>
                </div>
              );
      }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
           <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="text-white h-5 w-5" /></div>
           <div><h1 className="font-bold text-lg tracking-tight">探行跨境ERP</h1><p className="text-xs text-slate-400">全链路供应链管理 v5.0</p></div>
        </div>
        
        {/* Sidebar Command Palette Trigger & Store */}
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
             <div className="bg-slate-800 rounded-lg p-2 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700" onClick={() => setIsStoreManagerOpen(true)}>
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
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">核心业务</div>
          <button onClick={() => setCurrentView('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Home size={20} /><span className="font-medium">系统总览</span></button>
          <button onClick={() => setCurrentView('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><List size={20} /><span className="font-medium">备货清单</span></button>
          
          <div className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">供应链管理</div>
          <button onClick={() => setCurrentView('purchasing')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'purchasing' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ShoppingCart size={20} /><span className="font-medium">采购管理 (PO)</span></button>
          <button onClick={() => setCurrentView('wms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'wms' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Warehouse size={20} /><span className="font-medium">库存中心 (WMS)</span></button>

          <div className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">运营与工具</div>
          <button onClick={() => setCurrentView('finance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'finance' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Wallet size={20} /><span className="font-medium">财务中心 (Finance)</span></button>
          <button onClick={() => setCurrentView('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><PieChart size={20} /><span className="font-medium">数据分析</span></button>
          <button onClick={() => setCurrentView('marketing')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${currentView === 'marketing' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Sparkles size={20} className={currentView === 'marketing' ? 'text-yellow-300' : 'group-hover:text-purple-400'} /><span className="font-medium">AI 营销中心</span></button>
          
          <button onClick={() => setCurrentView('calculator')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'calculator' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Calculator size={20} /><span className="font-medium">智能试算</span></button>
          <button onClick={() => setCurrentView('logistics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === 'logistics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Search size={20} /><span className="font-medium">物流查询</span></button>
          
          <button 
            onClick={() => setIsRecycleBinOpen(true)} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-400 hover:bg-slate-800 hover:text-red-400 group relative`}
          >
              <Trash2 size={20} />
              <span className="font-medium">回收站</span>
              {deletedRecords.length > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500"></span>
              )}
          </button>

          <button onClick={() => setIsGlobalSettingsOpen(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-400 hover:bg-slate-800 hover:text-white`}><Settings size={20} /><span className="font-medium">全局配置</span></button>
          <button onClick={() => setIsCloudConfigOpen(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isCloudConfigOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><CloudUpload size={20} /><span className="font-medium">云端连接</span></button>
        </nav>
        
        {/* Footer */}
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
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden"><div className="font-bold text-gray-800">探行跨境ERP</div><button className="text-gray-500"><Menu /></button></header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 relative">
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          <div className="max-w-[1920px] w-full mx-auto">
             {/* Header and Page Title - Matching Screenshot V4.2 */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  {currentView === 'overview' ? '系统总览' : 
                   currentView === 'inventory' ? '备货清单' :
                   currentView === 'purchasing' ? '采购管理 (ERP)' :
                   currentView === 'wms' ? '库存中心 (WMS)' :
                   currentView === 'finance' ? '财务中心 (Finance)' :
                   currentView === 'analytics' ? '数据分析' :
                   currentView === 'marketing' ? 'AI 营销中心' :
                   currentView === 'calculator' ? '智能试算' :
                   currentView === 'logistics' ? '物流查询' : '系统总览'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {currentView === 'finance' ? '企业经营收支与利润分析' : 
                     currentView === 'wms' ? '多仓库库存流水与调拨管理' : 
                     '智能化供应链管理'}
                </p>
              </div>
              
              {/* Feature Buttons from Screenshot (Only show on inventory list) */}
              {currentView === 'inventory' && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                     <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold flex items-center gap-2 border border-emerald-100 whitespace-nowrap">
                         <Wifi size={12} className="animate-pulse"/> 工作区: 001 
                         <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                     </div>
                     <button onClick={handleFinancialReport} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200 whitespace-nowrap">
                         <DollarSign size={14} /> 财务损益分析
                     </button>
                     <button onClick={handleSmartAnalysis} className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-100 whitespace-nowrap">
                         {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={14} />} 智能诊断
                     </button>
                     <button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 whitespace-nowrap ml-2">
                         <Plus size={16} /> 添加产品
                     </button>
                  </div>
              )}
            </div>
            
            {/* Render Content */}
            {renderContent()}
          </div>
        </main>
      </div>
      
      {/* Modals */}
      <CloudConnect isOpen={isCloudConfigOpen} onClose={() => setIsCloudConfigOpen(false)} currentWorkspaceId={workspaceId} onConnect={setWorkspaceId} onDisconnect={() => setWorkspaceId(null)} isSyncing={syncStatus === 'connecting'} />
      <SettingsModal isOpen={isGlobalSettingsOpen} onClose={() => setIsGlobalSettingsOpen(false)} settings={appSettings} onSave={handleSaveSettings} />
      <StoreManagerModal isOpen={isStoreManagerOpen} onClose={() => setIsStoreManagerOpen(false)} stores={stores} onAddStore={handleAddStore} onDeleteStore={handleDeleteStore} />
      <RecordModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSaveRecord} initialData={editingRecord} stores={stores} defaultStoreId={activeStoreId} />
      <ConfirmDialog isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({isOpen: false, id: null})} onConfirm={confirmSoftDelete} title="确认删除" message="您确定要将此记录移入回收站吗？您可以在7天内恢复它。" />
      <RecycleBinModal isOpen={isRecycleBinOpen} onClose={() => setIsRecycleBinOpen(false)} deletedRecords={deletedRecords} onRestore={handleRestoreRecord} onDeleteForever={handleHardDeleteRecord} />
      <LabelGeneratorModal isOpen={isLabelModalOpen} onClose={() => setIsLabelModalOpen(false)} record={labelRecord} />
      <RestockPlanModal isOpen={isRestockPlanOpen} onClose={() => setIsRestockPlanOpen(false)} records={selectedIds.size > 0 ? activeRecords.filter(r => selectedIds.has(r.id)) : activeRecords} />
      <ErpSyncModal isOpen={isErpSyncOpen} onClose={() => setIsErpSyncOpen(false)} records={records} onUpdateRecords={handleErpUpdate} currentStoreId={activeStoreId==='all'?undefined:activeStoreId} />
      <DataBackupModal isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)} records={records} onImportData={(data) => { setRecords(data); localStorage.setItem('tanxing_records', JSON.stringify(data)); }} />
      <PurchaseOrderModal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} record={poRecord} onCreateOrder={handleCreatePO} />
      <DistributeModal isOpen={isDistributeModalOpen} onClose={() => setIsDistributeModalOpen(false)} sourceRecord={distributeSourceRecord} stores={stores} onConfirm={handleDistributeConfirm} />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} records={activeRecords} onNavigate={(v) => setCurrentView(v)} onOpenRecord={(r) => { setEditingRecord(r); setIsModalOpen(true); }} onAction={()=>{}} />
      <AiChatModal isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} records={activeRecords} onAction={handleAiAction} />
      <MarketingModal isOpen={marketingModalOpen} onClose={() => setMarketingModalOpen(false)} content={marketingContent} productName={marketingRecord?.productName || ''} record={marketingRecord} />
    </div>
  );
}

export default App;
