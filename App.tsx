
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
  ArrowUpRight,
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

  // --- 1. Real-time Subscription Setup ---
  useEffect(() => {
      // Only subscribe if we have a workspace ID and Supabase is configured
      if (!workspaceId || !isSupabaseConfigured()) {
          setSyncStatus('disconnected');
          return;
      }

      setSyncStatus('connected');

      // Subscribe to changes on 'replenishment_data' table
      const channel = supabase
          .channel('realtime-replenishment')
          .on(
              'postgres_changes',
              {
                  event: '*', // Listen to INSERT, UPDATE, DELETE
                  schema: 'public',
                  table: 'replenishment_data',
                  filter: `workspace_id=eq.${workspaceId}`
              },
              (payload) => {
                  console.log('Real-time change received:', payload);
                  
                  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                      const newRecord = payload.new.json_content as ReplenishmentRecord;
                      setRecords(prev => {
                          const exists = prev.find(r => r.id === newRecord.id);
                          const updated = exists 
                              ? prev.map(r => r.id === newRecord.id ? newRecord : r)
                              : [...prev, newRecord];
                          
                          // Sync to local storage to keep offline capability
                          localStorage.setItem('tanxing_records', JSON.stringify(updated));
                          return updated;
                      });
                      addToast('数据已实时同步', 'info');
                  } else if (payload.eventType === 'DELETE') {
                      const deletedId = payload.old.id;
                      setRecords(prev => {
                          const updated = prev.filter(r => r.id !== deletedId);
                          localStorage.setItem('tanxing_records', JSON.stringify(updated));
                          return updated;
                      });
                      addToast('数据已远程删除', 'warning');
                  }
              }
          )
          .subscribe();

      // Cleanup subscription on unmount or workspace change
      return () => {
          supabase.removeChannel(channel);
      };
  }, [workspaceId]);

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
                <div className="flex flex-col gap-4 animate-fade-in">
                    {purchaseOrders.length === 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 flex items-center justify-between mb-2 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="bg-white p-3 rounded-full text-blue-600 shadow-sm">
                                    <ShoppingCart size={24} />
                                </div>
                                <div className="text-sm text-blue-900">
                                    <span className="font-bold text-lg block mb-1">尚未创建采购单</span>
                                    请前往“备货清单”选择商品，点击“采购”按钮创建第一笔订单。
                                </div>
                            </div>
                            <button 
                                onClick={() => setCurrentView('inventory')} 
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
                            >
                                去备货 <ArrowRight size={16} />
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
                <div className="space-y-6 animate-fade-in pb-20">
                    {/* Top Toolbar */}
                    <div className="glass-panel p-2 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                        <div className="relative group w-full xl:w-96">
                             <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                             <input 
                                type="text" 
                                placeholder="搜索产品名称或 SKU..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-4 py-3 bg-transparent w-full text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none"
                             />
                        </div>
                        <div className="flex items-center gap-2 w-full xl:w-auto justify-end p-2">
                             <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-xl border border-white/50 backdrop-blur-sm">
                                 <Filter size={16} className="text-slate-500"/>
                                 <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                                 >
                                     <option value="All">全部状态</option>
                                     <option value="Planning">计划中</option>
                                     <option value="Shipped">运输中</option>
                                     <option value="Arrived">已入库</option>
                                 </select>
                             </div>
                        </div>
                    </div>

                    {/* AI Analysis Result */}
                    {aiAnalysis && (
                        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/20 relative overflow-hidden animate-slide-up ring-1 ring-purple-100">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles className="text-purple-500 fill-purple-100" size={20} />
                                    {analysisTitle}
                                </h3>
                                <button onClick={() => setAiAnalysis(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-400"/></button>
                            </div>
                            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: aiAnalysis }} />
                        </div>
                    )}

                    {/* Table Container */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/40">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                    <List size={18} className="text-indigo-500"/>
                                    库存清单
                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs border border-indigo-100">{activeRecords.length}</span>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase ${syncStatus === 'connected' ? 'bg-emerald-50/50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {syncStatus === 'connected' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> : <WifiOff size={10} />}
                                    {syncStatus === 'connected' ? 'Live Sync' : 'Offline'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsErpSyncOpen(true)} className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">
                                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> ERP 同步
                                </button>
                                <button onClick={() => setIsRestockPlanOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95">
                                    <CalendarClock size={14} /> {selectedIds.size > 0 ? `补货 (${selectedIds.size})` : '智能补货'}
                                </button>
                                <button onClick={() => setIsBackupModalOpen(true)} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors" title="导出数据">
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-200 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="p-5 pl-6 w-12">
                                            <button onClick={toggleSelectAll} className="flex items-center text-slate-400 hover:text-indigo-500 transition-colors">
                                                {selectedIds.size > 0 && selectedIds.size === activeRecords.length ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                                            </button>
                                        </th>
                                        <th onClick={() => requestSort('sku')} className="p-5 pl-0 cursor-pointer hover:text-indigo-600 transition-colors w-[200px]">
                                            <div className="flex items-center gap-1">SKU / 阶段 {sortConfig?.key === 'sku' && <ChevronDown size={14} />}</div>
                                        </th>
                                        <th className="p-5">产品信息 / 供应商</th>
                                        <th className="p-5">物流 (Live)</th>
                                        <th onClick={() => requestSort('totalInvestment')} className="p-5 cursor-pointer hover:text-indigo-600 transition-colors">
                                            <div className="flex items-center gap-1">资金投入 {sortConfig?.key === 'totalInvestment' && <ChevronDown size={14} />}</div>
                                        </th>
                                        <th onClick={() => requestSort('daysOfSupply')} className="p-5 cursor-pointer hover:text-indigo-600 transition-colors">
                                            <div className="flex items-center gap-1">库存 (Stock) {sortConfig?.key === 'daysOfSupply' && <ChevronDown size={14} />}</div>
                                        </th>
                                        <th onClick={() => requestSort('profit')} className="p-5 cursor-pointer hover:text-indigo-600 transition-colors">
                                            <div className="flex items-center gap-1">销售表现 {sortConfig?.key === 'profit' && <ChevronDown size={14} />}</div>
                                        </th>
                                        <th className="p-5 pr-6 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-16 text-center text-slate-400">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                        <Package size={32} className="opacity-40" />
                                                    </div>
                                                    <p className="font-medium text-slate-500">暂无符合条件的记录</p>
                                                    <button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">
                                                        + 立即添加产品
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedRecords.map((record) => {
                                            const metrics = calculateMetrics(record, appSettings);
                                            const totalInvestment = (record.quantity * record.unitPriceCNY) + metrics.firstLegCostCNY;
                                            
                                            let lifecycleClass = 'bg-slate-100 text-slate-500 border-slate-200';
                                            let lifecycleIcon = null;
                                            if (record.lifecycle === 'New') { lifecycleClass = 'bg-blue-50 text-blue-600 border-blue-100'; lifecycleIcon = '🌱 新品'; }
                                            else if (record.lifecycle === 'Growth') { lifecycleClass = 'bg-emerald-50 text-emerald-600 border-emerald-100'; lifecycleIcon = '🚀 爆品'; }
                                            else if (record.lifecycle === 'Stable') { lifecycleClass = 'bg-indigo-50 text-indigo-600 border-indigo-100'; lifecycleIcon = '⚖️ 稳定'; }
                                            else if (record.lifecycle === 'Clearance') { lifecycleClass = 'bg-red-50 text-red-600 border-red-100'; lifecycleIcon = '📉 清仓'; }

                                            const isUrgent = metrics.daysOfSupply < 15;
                                            const isRecommended = metrics.daysOfSupply >= 15 && metrics.daysOfSupply < 30;
                                            const isSelected = selectedIds.has(record.id);

                                            return (
                                                <tr key={record.id} className={`group hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                                                    <td className="p-5 pl-6 align-top">
                                                        <button onClick={() => toggleSelection(record.id)} className="text-slate-300 hover:text-indigo-500 pt-1 transition-colors">
                                                            {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                                                        </button>
                                                    </td>
                                                    <td className="p-5 pl-0 align-top">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                                {record.sku}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded border ${lifecycleClass} font-bold flex items-center gap-1 shadow-sm`}>
                                                                    {lifecycleIcon}
                                                                </span>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold shadow-sm ${
                                                                    record.status === 'Planning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                    record.status === 'Shipped' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                                                    'bg-green-50 text-green-700 border-green-200'
                                                                }`}>
                                                                    {record.status === 'Planning' ? '计划中' : record.status === 'Shipped' ? '运输中' : '已入库'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 align-top">
                                                        <div className="flex items-start gap-4">
                                                            <div 
                                                                className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 cursor-pointer hover:shadow-md transition-all"
                                                                onClick={() => { setEditingRecord(record); setIsModalOpen(true); }}
                                                            >
                                                                {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 text-slate-300"/>}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors" title={record.productName}>{record.productName}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono mt-1">{record.date}</div>
                                                                {record.supplierName && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit border border-slate-200">
                                                                        <Factory size={10} />
                                                                        <span className="truncate max-w-[80px]">{record.supplierName}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 align-top">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                                                            <div className={`p-1 rounded ${record.shippingMethod === 'Air' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                                {record.shippingMethod === 'Air' ? <Plane size={12}/> : <Ship size={12}/>}
                                                            </div>
                                                            <span className={record.shippingMethod === 'Air' ? 'text-blue-700' : 'text-indigo-700'}>
                                                                {record.shippingMethod === 'Air' ? '空运' : '海运'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-medium pl-1">
                                                            {record.totalCartons}箱 · {metrics.totalWeightKg.toFixed(1)}kg
                                                        </div>
                                                        {record.status === 'Shipped' && record.trackingNumber && (
                                                            <div className="mt-1.5">
                                                                <a 
                                                                    href={`https://www.17track.net/zh-cn/track?nums=${record.trackingNumber}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100 w-fit transition-colors"
                                                                >
                                                                    <Truck size={10} />
                                                                    {record.carrier ? `${record.carrier}: ` : ''}{record.trackingNumber.slice(0, 8)}...
                                                                </a>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 align-top">
                                                        <div className="font-bold text-sm text-slate-800">
                                                            {formatCurrency(totalInvestment, 'CNY')}
                                                        </div>
                                                        <div className="flex flex-col gap-1 mt-1.5">
                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                                <div className="w-1 h-3 rounded-full bg-blue-400"></div>
                                                                货: {formatCurrency(record.quantity * record.unitPriceCNY, 'CNY')}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                                <div className="w-1 h-3 rounded-full bg-orange-400"></div>
                                                                运: {formatCurrency(metrics.firstLegCostCNY, 'CNY')}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 align-top">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-base font-bold text-slate-900">{record.quantity}</div>
                                                            {record.dailySales > 0 && (
                                                                <div className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                    {metrics.daysOfSupply.toFixed(0)}d
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-between items-center mt-1.5">
                                                            <span className="text-[10px] text-slate-400">日销: {record.dailySales}</span>
                                                            {isUrgent && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1"><AlertTriangle size={8}/> 补货</span>}
                                                        </div>
                                                        {record.dailySales > 0 && (
                                                            <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-500 ${isUrgent ? 'bg-red-500' : isRecommended ? 'bg-orange-400' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${Math.min(metrics.daysOfSupply, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 align-top">
                                                        <div className="font-bold text-sm text-slate-900">${record.salesPriceUSD}</div>
                                                        <div className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                                                            <TrendingUp size={10} />
                                                            {metrics.marginRate.toFixed(1)}%
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                                            Profit: ${metrics.estimatedProfitUSD.toFixed(2)}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 pr-6 align-top text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <button 
                                                                onClick={() => { setPORecord(record); setIsPOModalOpen(true); }}
                                                                className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors shadow-sm"
                                                                title="采购"
                                                            >
                                                                <ShoppingCart size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { setEditingRecord(record); setIsModalOpen(true); }}
                                                                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
                                                                title="编辑"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => setDeleteConfirm({ isOpen: true, id: record.id })}
                                                                className="p-2 bg-white border border-slate-200 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
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
                        <div className="p-4 border-t border-slate-200 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                             <span className="text-xs text-slate-400 font-medium">显示 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, activeRecords.length)} / 共 {activeRecords.length} 条</span>
                             <div className="flex gap-2">
                                 <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all"><ChevronLeft size={14}/></button>
                                 <div className="flex items-center justify-center px-3 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs shadow-md">{currentPage}</div>
                                 <button disabled={currentPage * itemsPerPage >= activeRecords.length} onClick={() => setCurrentPage(c => c + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all"><ChevronRight size={14}/></button>
                             </div>
                        </div>
                    </div>
                </div>
              );
      }
  };

  return (
    <div className="flex h-screen bg-aurora font-sans overflow-hidden text-slate-800">
      <aside className="w-72 glass-sidebar text-white flex-shrink-0 hidden md:flex flex-col z-50 shadow-2xl">
        {/* Sidebar Header */}
        <div className="p-6 flex items-center gap-3 border-b border-white/5 bg-slate-950/50">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/50 ring-1 ring-white/10">
               <LayoutDashboard className="text-white h-5 w-5" />
           </div>
           <div>
               <h1 className="font-bold text-lg tracking-tight leading-none text-white">Tanxing ERP</h1>
               <p className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide opacity-80 uppercase">Intelligent Supply Chain</p>
           </div>
        </div>
        
        {/* Sidebar Command Palette Trigger & Store */}
        <div className="px-4 pt-6">
            <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl p-3 flex items-center justify-between transition-all group backdrop-blur-sm shadow-inner"
            >
                <div className="flex items-center gap-3">
                    <Search size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                    <span className="text-xs font-medium">全局搜索 (⌘K)</span>
                </div>
                <div className="flex items-center gap-1 bg-black/30 rounded px-1.5 py-0.5 border border-white/5">
                    <Command size={10} />
                    <span className="text-[10px]">K</span>
                </div>
            </button>
        </div>

        <div className="px-4 pt-4 pb-2">
           <div className="relative">
             <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:from-slate-700 hover:to-slate-800 transition-all border border-white/5 shadow-lg group" onClick={() => setIsStoreManagerOpen(true)}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-300 group-hover:text-indigo-200 transition-colors">
                        <StoreIcon size={16} />
                    </div>
                    <span className="text-sm font-bold truncate text-slate-200 group-hover:text-white">店铺矩阵</span>
                </div>
                <div className="bg-white/10 text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-300">{stores.length}</div>
             </div>
             
             <div className="mt-3 space-y-1">
                 <button onClick={() => setActiveStoreId('all')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between group ${activeStoreId === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 border border-blue-500/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                     <span>全盘数据 (All Stores)</span>
                     {activeStoreId === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                 </button>
                 {stores.map(store => (
                     <button key={store.id} onClick={() => setActiveStoreId(store.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between group ${activeStoreId === store.id ? 'bg-white/10 text-white border border-white/5 shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${store.color} shadow-[0_0_8px_rgba(255,255,255,0.3)]`}></span>
                            <span className="truncate max-w-[120px] group-hover:translate-x-1 transition-transform">{store.name}</span>
                        </div>
                     </button>
                 ))}
             </div>
           </div>
        </div>

        <div className="px-6 py-2">
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar py-2">
          
          <div>
              <div className="px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Core Business</div>
              <div className="space-y-1">
                  <button onClick={() => setCurrentView('overview')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'overview' ? 'bg-white/10 text-white shadow-lg border border-white/5 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <Home size={18} className={currentView === 'overview' ? 'text-blue-400' : 'group-hover:text-slate-200'} />
                      <span>系统总览 Dashboard</span>
                  </button>
                  <button onClick={() => setCurrentView('inventory')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'inventory' ? 'bg-white/10 text-white shadow-lg border border-white/5 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <List size={18} className={currentView === 'inventory' ? 'text-blue-400' : 'group-hover:text-slate-200'} />
                      <span>备货清单 Inventory</span>
                  </button>
              </div>
          </div>
          
          <div>
              <div className="px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supply Chain</div>
              <div className="space-y-1">
                  <button onClick={() => setCurrentView('purchasing')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'purchasing' ? 'bg-white/10 text-white shadow-lg border border-white/5 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <ShoppingCart size={18} className={currentView === 'purchasing' ? 'text-orange-400' : 'group-hover:text-slate-200'} />
                      <span>采购管理 PO</span>
                  </button>
                  <button onClick={() => setCurrentView('wms')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'wms' ? 'bg-white/10 text-white shadow-lg border border-white/5 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <Warehouse size={18} className={currentView === 'wms' ? 'text-purple-400' : 'group-hover:text-slate-200'} />
                      <span>库存中心 WMS</span>
                  </button>
                  <button onClick={() => setCurrentView('logistics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'logistics' ? 'bg-white/10 text-white shadow-lg border border-white/5 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <Search size={18} className={currentView === 'logistics' ? 'text-blue-400' : 'group-hover:text-slate-200'} />
                      <span>物流追踪 Tracker</span>
                  </button>
              </div>
          </div>

          <div>
              <div className="px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth & Finance</div>
              <div className="space-y-1">
                  <button onClick={() => setCurrentView('finance')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'finance' ? 'bg-white/10 text-white shadow-lg border border-white/5 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <Wallet size={18} className={currentView === 'finance' ? 'text-emerald-400' : 'group-hover:text-slate-200'} />
                      <span>财务中心 Finance</span>
                  </button>
                  <button onClick={() => setCurrentView('analytics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'analytics' ? 'bg-white/10 text-white shadow-lg border border-white/5 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <PieChart size={18} className={currentView === 'analytics' ? 'text-blue-400' : 'group-hover:text-slate-200'} />
                      <span>数据分析 Analytics</span>
                  </button>
                  <button onClick={() => setCurrentView('marketing')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden ${currentView === 'marketing' ? 'text-white font-bold' : 'text-slate-400 hover:text-white'}`}>
                      {currentView === 'marketing' && <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-80 backdrop-blur-md border border-white/10"></div>}
                      {currentView !== 'marketing' && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>}
                      <Sparkles size={18} className={`relative z-10 ${currentView === 'marketing' ? 'text-yellow-300' : 'group-hover:text-purple-400'}`} />
                      <span className="relative z-10">AI 营销中心</span>
                  </button>
                  <button onClick={() => setCurrentView('calculator')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'calculator' ? 'bg-white/10 text-white shadow-lg border border-white/5 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                      <Calculator size={18} className={currentView === 'calculator' ? 'text-blue-400' : 'group-hover:text-slate-200'} />
                      <span>智能试算 Tools</span>
                  </button>
              </div>
          </div>
        </nav>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm">
            <div className="flex gap-2 mb-4">
                <button onClick={() => setIsGlobalSettingsOpen(true)} className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors gap-1 group border border-white/5">
                    <Settings size={16} className="text-slate-400 group-hover:text-white"/>
                    <span className="text-[9px] text-slate-500 group-hover:text-slate-300">Setting</span>
                </button>
                <button onClick={() => setIsCloudConfigOpen(true)} className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-colors gap-1 group border border-white/5 ${isCloudConfigOpen ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}>
                    <CloudUpload size={16} className={isCloudConfigOpen ? 'text-white' : 'text-slate-400 group-hover:text-white'}/>
                    <span className={`text-[9px] ${isCloudConfigOpen ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-300'}`}>Cloud</span>
                </button>
                <button onClick={() => setIsRecycleBinOpen(true)} className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors gap-1 group relative border border-white/5">
                    <Trash2 size={16} className="text-slate-400 group-hover:text-red-400"/>
                    <span className="text-[9px] text-slate-500 group-hover:text-red-300">Bin</span>
                    {deletedRecords.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                </button>
            </div>

            <div onClick={() => setIsAiChatOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-3 cursor-pointer hover:shadow-lg hover:shadow-purple-900/50 transition-all group relative overflow-hidden flex items-center gap-3 border border-white/10 ring-1 ring-white/10">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md"><Bot className="text-white h-4 w-4" /></div>
                <div>
                    <span className="text-xs font-bold text-white block">AI Copilot</span>
                    <span className="text-[10px] text-purple-200 block opacity-80">点击唤起助手</span>
                </div>
                <ArrowUpRight size={14} className="ml-auto text-white/50" />
            </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-40 sticky top-0 shadow-sm"><div className="font-bold text-gray-800">探行跨境ERP</div><button className="text-gray-500"><Menu /></button></header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative custom-scrollbar">
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          
          <div className="max-w-[1920px] w-full mx-auto pb-20">
             {/* Dynamic Page Header with Subtle Blur Background */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-fade-in sticky top-0 z-30 py-4 -my-4 px-2 -mx-2 bg-white/0 backdrop-blur-0 transition-all duration-300">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                  {currentView === 'overview' ? '系统总览' : 
                   currentView === 'inventory' ? '备货清单' :
                   currentView === 'purchasing' ? '采购管理' :
                   currentView === 'wms' ? '库存中心' :
                   currentView === 'finance' ? '财务中心' :
                   currentView === 'analytics' ? '数据分析' :
                   currentView === 'marketing' ? 'AI 营销中心' :
                   currentView === 'calculator' ? '智能试算' :
                   currentView === 'logistics' ? '物流查询' : '系统总览'}
                   
                   <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full hidden lg:block tracking-wide">
                       v5.0 Pro
                   </span>
                </h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                    {currentView === 'finance' ? '企业经营收支与利润全景分析' : 
                     currentView === 'wms' ? '多仓库库存流水与智能调拨管理' : 
                     currentView === 'inventory' ? '全渠道 SKU 备货与生命周期管理' :
                     '智能化供应链决策支持系统'}
                </p>
              </div>
              
              {/* Context Actions */}
              {currentView === 'inventory' && (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
                     <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border whitespace-nowrap transition-all backdrop-blur-sm ${syncStatus === 'connected' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200' : 'bg-white/80 text-slate-500 border-slate-200'}`}>
                         <div className={`w-2 h-2 rounded-full ${syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                         {syncStatus === 'connected' ? '实时同步中' : '离线模式'}
                     </div>
                     <button onClick={handleFinancialReport} className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all border border-slate-200 shadow-sm hover:shadow active:scale-95 whitespace-nowrap">
                         <DollarSign size={14} className="text-slate-400"/> 财务分析
                     </button>
                     <button onClick={handleSmartAnalysis} className="flex items-center gap-2 bg-white text-purple-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-50 transition-all border border-purple-100 shadow-sm hover:shadow-purple-100 active:scale-95 whitespace-nowrap group">
                         {isAnalyzing ? <Loader2 className="animate-spin text-purple-600" size={14}/> : <BrainCircuit size={14} className="text-purple-500 group-hover:text-purple-700"/>} 智能诊断
                     </button>
                     <button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/20 active:scale-95 whitespace-nowrap border border-transparent hover:border-slate-700">
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
