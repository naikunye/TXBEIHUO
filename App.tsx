
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Plus, Ship, Plane, DollarSign, TrendingUp, Package, BrainCircuit, Loader2, PieChart, List, Menu, ChevronRight, Edit, Box, Calculator, Search, Container, Truck, X, Download, Save, Home, Filter, CloudUpload, Settings, Database, Wifi, WifiOff, Zap, AlertTriangle, Hourglass, Sparkles, Bot, Megaphone, Compass, Wand2, FileJson, Store as StoreIcon, ChevronDown, ArrowRightLeft, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronsLeft, ChevronsRight, UserCircle, Command, CopyPlus, MoreHorizontal, Trash2, Printer, CalendarClock, RefreshCw, Clock, ExternalLink, Target, CheckSquare, Square, FileText, Factory, ShoppingCart, ArrowRight, ArrowUpRight, Warehouse, ShoppingBag, Wallet, Sliders, Kanban as KanbanIcon, LayoutGrid, Moon, Sun, Maximize2, Minimize2, PlayCircle, StopCircle, Gauge, Activity, Cpu, Globe, CalendarDays, Beaker, MapPin, Cloud
} from 'lucide-react';
import { ReplenishmentRecord, Store, CalculatedMetrics, PurchaseOrder, AppSettings, InventoryLog, FinanceTransaction, Supplier } from './types';
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
import { FinanceCenter } from './components/FinanceCenter'; 
import { SupplierManager } from './components/SupplierManager';
import { InventoryKanban } from './components/InventoryKanban'; 
import { SupplyChainCalendar } from './components/SupplyChainCalendar';
import { ProductRDLab } from './components/ProductRDLab';
import { GeoSalesCommand } from './components/GeoSalesCommand';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast'; 
import { analyzeInventory, analyzeLogisticsChannels, generateFinancialReport } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { fetchLingxingInventory, fetchLingxingSales } from './services/lingxingService';
import { fetchMiaoshouInventory, fetchMiaoshouSales } from './services/miaoshouService';
import { DataBackupModal } from './components/DataBackupModal'; 

type ViewState = 'overview' | 'inventory' | 'analytics' | 'calculator' | 'logistics' | 'marketing' | 'purchasing' | 'wms' | 'finance' | 'suppliers' | 'calendar' | 'rd_lab' | 'geo_command';
type EnrichedRecord = ReplenishmentRecord & { metrics: CalculatedMetrics };

const safeParse = (key: string, fallback: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        return fallback;
    }
};

function App() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
      // 优先从 localStorage 读取，确保刷新后状态保留
      return localStorage.getItem('tanxing_current_workspace');
  });
  
  const [syncStatus, setSyncStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [clientVersion, setClientVersion] = useState(0); // 用于强制重连 Supabase
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false); 
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tanxing_theme') !== 'light'); 
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [systemTime, setSystemTime] = useState(new Date());
  const [clockZone, setClockZone] = useState<'CN' | 'US_LA' | 'US_NY'>('US_LA'); 
  const [stores, setStores] = useState<Store[]>(() => safeParse('tanxing_stores', []));
  const [activeStoreId, setActiveStoreId] = useState<string>('all');
  const [isStoreManagerOpen, setIsStoreManagerOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => safeParse('tanxing_app_settings', { 
      exchangeRate: 7.3, 
      airTiers: [{ minWeight: 0, maxWeight: 9999, price: 65 }], 
      seaTiers: [{ minWeight: 0, maxWeight: 9999, price: 12 }] 
  }));
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simulatedExchangeRate, setSimulatedExchangeRate] = useState(7.3);
  const [simulatedFreightMarkup, setSimulatedFreightMarkup] = useState(0); 
  const [records, setRecords] = useState<ReplenishmentRecord[]>(() => safeParse('tanxing_records', MOCK_DATA_INITIAL));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => safeParse('tanxing_purchase_orders', []));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => safeParse('tanxing_suppliers', []));
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => safeParse('tanxing_inventory_logs', []));
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>(() => safeParse('tanxing_finance_transactions', []));
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastErpSync, setLastErpSync] = useState<Date | null>(null);
  const [isAutoSyncActive, setIsAutoSyncActive] = useState(true); 
  const [inventoryViewMode, setInventoryViewMode] = useState<'list' | 'kanban'>('list');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = density === 'compact' ? 15 : 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ReplenishmentRecord | null>(null);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeSourceRecord, setDistributeSourceRecord] = useState<ReplenishmentRecord | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelRecord, setLabelRecord] = useState<ReplenishmentRecord | null>(null);
  const [isRestockPlanOpen, setIsRestockPlanOpen] = useState(false);
  const [isErpSyncOpen, setIsErpSyncOpen] = useState(false); 
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poRecord, setPORecord] = useState<ReplenishmentRecord | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analysisTitle, setAnalysisTitle] = useState<string>('供应链 AI 诊断报告');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('overview'); 
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [marketingContent, setMarketingContent] = useState<string | null>(null);
  const [marketingRecord, setMarketingRecord] = useState<ReplenishmentRecord | null>(null); 
  const [marketingInitialTab, setMarketingInitialTab] = useState<any>('strategy');
  const [marketingInitialChannel, setMarketingInitialChannel] = useState<any>('TikTok');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Planning' | 'Shipped' | 'Arrived'>('All');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const autoSyncRef = useRef<number | null>(null);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
      if (darkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('tanxing_theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('tanxing_theme', 'light');
      }
  }, [darkMode]);

  useEffect(() => {
      const timer = setInterval(() => setSystemTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  useEffect(() => {
      if (workspaceId) {
          localStorage.setItem('tanxing_current_workspace', workspaceId);
      }
  }, [workspaceId]);

  useEffect(() => {
      if (!isSimulationActive) {
          setSimulatedExchangeRate(appSettings.exchangeRate);
          setSimulatedFreightMarkup(0);
      }
  }, [isSimulationActive, appSettings.exchangeRate]);

  // --- Real-time Subscription Setup ---
  useEffect(() => {
      if (!workspaceId || !isSupabaseConfigured()) {
          setSyncStatus('disconnected');
          return;
      }
      
      const client = supabase;
      setSyncStatus('connecting');

      // Function to load initial data
      const loadCloudData = async () => {
          try {
              const { data, error } = await client
                  .from('replenishment_data')
                  .select('json_content')
                  .eq('workspace_id', workspaceId);
              
              if (error) throw error;
              
              if (data) {
                  const cloudRecords = data.map(row => row.json_content as ReplenishmentRecord);
                  setRecords(cloudRecords);
                  localStorage.setItem('tanxing_records', JSON.stringify(cloudRecords));
                  // console.log("Loaded cloud records:", cloudRecords.length);
              }
          } catch (e) {
              console.error("Cloud Fetch Error:", e);
              addToast("同步失败: 无法拉取云端数据", 'error');
          }
      };

      // Call initial load
      loadCloudData();
      
      const channel = client
          .channel('realtime-replenishment')
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'replenishment_data', filter: `workspace_id=eq.${workspaceId}` },
              (payload) => {
                  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                      const newRecord = payload.new.json_content as ReplenishmentRecord;
                      setRecords(prev => {
                          const exists = prev.find(r => r.id === newRecord.id);
                          const updated = exists ? prev.map(r => r.id === newRecord.id ? newRecord : r) : [...prev, newRecord];
                          localStorage.setItem('tanxing_records', JSON.stringify(updated));
                          return updated;
                      });
                      // addToast('数据已实时同步', 'info');
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
          .subscribe((status) => {
              console.log("Supabase Status:", status);
              if (status === 'SUBSCRIBED') {
                  setSyncStatus('connected');
                  addToast('云端同步已连接', 'success');
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                  setSyncStatus('disconnected');
                  if (workspaceId) addToast('云端连接断开，正在重试...', 'error');
              }
          });
          
      return () => { client.removeChannel(channel); };
  }, [workspaceId, clientVersion]);

  const syncItemToCloud = async (item: ReplenishmentRecord | Store) => {
      if (workspaceId && isSupabaseConfigured()) {
        try { await supabase.from('replenishment_data').upsert({ id: item.id, workspace_id: workspaceId, json_content: item }); } 
        catch (err) { console.error('Cloud Sync Error:', err); }
      }
  };

  const deleteItemFromCloud = async (id: string) => {
      if (workspaceId && isSupabaseConfigured()) {
          try { await supabase.from('replenishment_data').delete().eq('id', id); } 
          catch(err) { console.error('Cloud Delete Error:', err); }
      }
  };

  const handleAddTransaction = (t: FinanceTransaction) => {
      setFinanceTransactions(prev => { const n = [t, ...prev]; localStorage.setItem('tanxing_finance_transactions', JSON.stringify(n)); return n; });
      addToast('记账成功', 'success');
  };
  const handleDeleteTransaction = (id: string) => {
      setFinanceTransactions(prev => { const n = prev.filter(t => t.id !== id); localStorage.setItem('tanxing_finance_transactions', JSON.stringify(n)); return n; });
      addToast('记录已删除', 'info');
  };
  const handleAddSupplier = (s: Supplier) => { setSuppliers(prev => { const n = [...prev, s]; localStorage.setItem('tanxing_suppliers', JSON.stringify(n)); return n; }); addToast('供应商已添加', 'success'); };
  const handleUpdateSupplier = (s: Supplier) => { setSuppliers(prev => { const n = prev.map(old => old.id === s.id ? s : old); localStorage.setItem('tanxing_suppliers', JSON.stringify(n)); return n; }); addToast('供应商信息已更新', 'success'); };
  const handleDeleteSupplier = (id: string) => { setSuppliers(prev => { const n = prev.filter(s => s.id !== id); localStorage.setItem('tanxing_suppliers', JSON.stringify(n)); return n; }); addToast('供应商已删除', 'info'); };
  const handleSaveSettings = (newSettings: AppSettings) => { setAppSettings(newSettings); localStorage.setItem('tanxing_app_settings', JSON.stringify(newSettings)); addToast("全局配置已保存", "success"); };
  const handleUpdatePO = (updatedPO: PurchaseOrder) => { setPurchaseOrders(prev => { const n = prev.map(o => o.id === updatedPO.id ? updatedPO : o); try { localStorage.setItem('tanxing_purchase_orders', JSON.stringify(n)); } catch(e){} return n; }); addToast("采购单状态已更新", "success"); };
  const handleDeletePO = (id: string) => { setPurchaseOrders(prev => { const n = prev.filter(o => o.id !== id); try { localStorage.setItem('tanxing_purchase_orders', JSON.stringify(n)); } catch(e){} return n; }); addToast("采购单已删除", "info"); };
  const handleCreatePO = (newPO: PurchaseOrder) => { setPurchaseOrders(prev => { const n = [...prev, newPO]; try { localStorage.setItem('tanxing_purchase_orders', JSON.stringify(n)); } catch(e){} return n; }); addToast("采购单已创建", "success"); setCurrentView('purchasing'); };
  const handleReceiveStockFromPO = (po: PurchaseOrder) => {
      setPurchaseOrders(prev => { const n = prev.map(o => o.id === po.id ? { ...o, status: 'Arrived' as const } : o); localStorage.setItem('tanxing_purchase_orders', JSON.stringify(n)); return n; });
      const newLog: InventoryLog = { id: `LOG-${Date.now()}`, date: new Date().toISOString(), sku: po.sku, warehouse: 'CN_Local', type: 'Inbound', quantityChange: po.quantity, referenceId: po.poNumber, note: 'PO Auto Receive' };
      handleAddInventoryLog(newLog); setTimeout(() => addToast(`入库成功：${po.productName} 库存 +${po.quantity}`, "success"), 0);
  };
  const handleAddInventoryLog = (log: InventoryLog) => {
      setInventoryLogs(prev => { const n = [log, ...prev]; localStorage.setItem('tanxing_inventory_logs', JSON.stringify(n)); return n; });
      setRecords(prev => {
          const idx = prev.findIndex(r => r.sku === log.sku);
          if (idx !== -1) {
              const r = prev[idx];
              const u = { ...r, quantity: (r.quantity || 0) + log.quantityChange };
              const n = [...prev]; n[idx] = u;
              localStorage.setItem('tanxing_records', JSON.stringify(n)); syncItemToCloud(u); return n;
          }
          return prev;
      });
  };
  const handleAiAction = (type: string, data: any) => {
      if (type === 'create_po') {
          const newPO: PurchaseOrder = { id: Date.now().toString(), poNumber: `PO-AI-${Date.now().toString().slice(-4)}`, date: new Date().toISOString().split('T')[0], sku: data.sku, productName: records.find(r => r.sku === data.sku)?.productName || data.sku, quantity: data.quantity || 100, unitPriceCNY: records.find(r => r.sku === data.sku)?.unitPriceCNY || 0, totalAmountCNY: (records.find(r => r.sku === data.sku)?.unitPriceCNY || 0) * (data.quantity || 100), status: 'Draft' };
          handleCreatePO(newPO); addToast("AI 已为您创建采购草稿单", "success");
      }
  };

  const effectiveSettings = useMemo(() => {
      if (!isSimulationActive) return appSettings;
      return { ...appSettings, exchangeRate: simulatedExchangeRate, airTiers: appSettings.airTiers.map(t => ({ ...t, price: t.price * (1 + simulatedFreightMarkup/100) })), seaTiers: appSettings.seaTiers.map(t => ({ ...t, price: t.price * (1 + simulatedFreightMarkup/100) })), simulatedFreightMarkup: simulatedFreightMarkup };
  }, [appSettings, isSimulationActive, simulatedExchangeRate, simulatedFreightMarkup]);

  const activeRecords = useMemo(() => {
    let filtered = records.filter(r => !r.isDeleted);
    if (activeStoreId !== 'all') filtered = filtered.filter(r => (r.storeIds || (r.storeId ? [r.storeId] : [])).includes(activeStoreId));
    if (searchQuery) filtered = filtered.filter(r => r.productName.toLowerCase().includes(searchQuery.toLowerCase()) || r.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    if (statusFilter !== 'All') filtered = filtered.filter(r => r.status === statusFilter);
    return filtered;
  }, [records, activeStoreId, searchQuery, statusFilter]);

  const sortedRecords = useMemo(() => {
    if (!sortConfig) return activeRecords;
    const sorted = [...activeRecords].sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof ReplenishmentRecord];
        let valB: any = b[sortConfig.key as keyof ReplenishmentRecord];
        const metricsA = calculateMetrics(a, effectiveSettings);
        const metricsB = calculateMetrics(b, effectiveSettings);
        if (sortConfig.key === 'profit') { valA = metricsA.estimatedProfitUSD; valB = metricsB.estimatedProfitUSD; } 
        else if (sortConfig.key === 'daysOfSupply') { valA = metricsA.daysOfSupply; valB = metricsB.daysOfSupply; } 
        else if (sortConfig.key === 'quantity') { valA = a.quantity; valB = b.quantity; } 
        else if (sortConfig.key === 'totalInvestment') { valA = (a.quantity * a.unitPriceCNY) + metricsA.firstLegCostCNY; valB = (b.quantity * b.unitPriceCNY) + metricsB.firstLegCostCNY; } 
        else if (sortConfig.key === 'sku') { valA = a.sku; valB = b.sku; }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
  }, [activeRecords, sortConfig, effectiveSettings]);

  const deletedRecords = useMemo(() => records.filter(r => r.isDeleted), [records]);
  
  const handleMarketingGenerate = (record: ReplenishmentRecord, initialTab: string = 'strategy', initialChannel: string = 'TikTok') => {
      setMarketingRecord(record); 
      setMarketingContent(null);
      setMarketingInitialTab(initialTab);
      setMarketingInitialChannel(initialChannel);
      setMarketingModalOpen(true);
  };

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
  const handleFinancialReport = () => runAiTask("供应链财务损益分析", () => generateFinancialReport(activeRecords));
  
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
          storeIds: [targetStoreId], 
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
          case 'overview': return <HomeOverview records={activeRecords} stores={stores} currentStoreId={activeStoreId} onNavigateToList={() => setCurrentView('inventory')} />;
          case 'analytics': return <AnalyticsDashboard records={activeRecords} />;
          case 'marketing': return <MarketingDashboard records={activeRecords} onGenerate={handleMarketingGenerate} />;
          case 'calculator': return <CalculatorTool />;
          case 'logistics': return <LogisticsTools />;
          case 'wms': return <InventoryWMS records={records} logs={inventoryLogs} onAddLog={handleAddInventoryLog} />;
          case 'suppliers': return <SupplierManager suppliers={suppliers} purchaseOrders={purchaseOrders} onAddSupplier={handleAddSupplier} onUpdateSupplier={handleUpdateSupplier} onDeleteSupplier={handleDeleteSupplier} />;
          case 'finance': return <FinanceCenter transactions={financeTransactions} purchaseOrders={purchaseOrders} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} settings={appSettings} />;
          case 'calendar': return <SupplyChainCalendar records={activeRecords} purchaseOrders={purchaseOrders} />;
          case 'rd_lab': return <ProductRDLab />;
          case 'geo_command': return <GeoSalesCommand />;
          case 'purchasing': return (
                <div className="flex flex-col gap-4 animate-fade-in">
                    {purchaseOrders.length === 0 && (
                        <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20 rounded-2xl p-6 flex items-center justify-between mb-2 shadow-sm backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-500/20 p-3 rounded-full text-blue-400 shadow-glow-blue"><ShoppingCart size={24} /></div>
                                <div className="text-sm text-blue-200"><span className="font-bold text-lg block mb-1 text-white text-glow">尚未创建采购单</span>请前往“备货清单”选择商品，点击“采购”按钮创建第一笔订单。</div>
                            </div>
                            <button onClick={() => setCurrentView('inventory')} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all shadow-glow-blue active:scale-95 flex items-center gap-2">去备货 <ArrowRight size={16} /></button>
                        </div>
                    )}
                    <PurchaseOrderManager orders={purchaseOrders} onUpdateOrder={handleUpdatePO} onDeleteOrder={handleDeletePO} onReceiveStock={handleReceiveStockFromPO} />
                </div>
              );
          case 'inventory':
          default:
              const startIndex = (currentPage - 1) * itemsPerPage;
              const paginatedRecords = sortedRecords.slice(startIndex, startIndex + itemsPerPage);
              const paddingClass = density === 'compact' ? 'p-2' : 'p-5';

              return (
                <div className="space-y-6 animate-fade-in pb-20 relative">
                    <div className="glass-panel p-2 rounded-2xl shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                        <div className="relative group w-full xl:w-96">
                             <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors" size={20} />
                             <input type="text" placeholder="搜索产品名称或 SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 pr-4 py-3 bg-transparent w-full text-sm font-bold text-slate-200 placeholder-slate-500 focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-2 w-full xl:w-auto justify-end p-2">
                             <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm shadow-sm">
                                 <Filter size={16} className="text-slate-400"/>
                                 <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-transparent text-sm font-bold text-slate-200 outline-none cursor-pointer">
                                     <option value="All" className="text-black">全部状态</option>
                                     <option value="Planning" className="text-black">计划中</option>
                                     <option value="Shipped" className="text-black">运输中</option>
                                     <option value="Arrived" className="text-black">已入库</option>
                                 </select>
                             </div>
                        </div>
                    </div>

                    {aiAnalysis && (
                        <div className="bg-slate-900/90 backdrop-blur-md p-6 rounded-2xl shadow-glow-purple border border-purple-500/30 relative overflow-hidden animate-slide-up">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 text-glow"><Sparkles className="text-purple-400 animate-pulse" size={20} />{analysisTitle}</h3>
                                <button onClick={() => setAiAnalysis(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X size={20}/></button>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: aiAnalysis }} />
                        </div>
                    )}

                    {inventoryViewMode === 'kanban' ? (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="font-bold text-lg text-white flex items-center gap-2 text-glow"><KanbanIcon size={20} className="text-cyan-400" />全息看板 (Holographic View)</h3>
                                <button onClick={() => setInventoryViewMode('list')} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 shadow-sm backdrop-blur-md"><List size={14} /> 切换回列表</button>
                            </div>
                            <InventoryKanban records={activeRecords} onUpdateRecord={async (r) => { const updated = records.map(old => old.id === r.id ? r : old); setRecords(updated); localStorage.setItem('tanxing_records', JSON.stringify(updated)); await syncItemToCloud(r); }} onEdit={(r) => { setEditingRecord(r); setIsModalOpen(true); }} onDelete={(id) => setDeleteConfirm({ isOpen: true, id })} />
                        </div>
                    ) : (
                    <div className="glass-panel rounded-3xl shadow-glass overflow-hidden relative">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                        <div className="px-6 py-5 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-white"><List size={18} className="text-cyan-400"/>库存清单<span className="bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded-full text-xs border border-cyan-500/30">{activeRecords.length}</span></div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase ${syncStatus === 'connected' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{syncStatus === 'connected' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-green"></div> : <WifiOff size={10} />}{syncStatus === 'connected' ? 'Cloud Active' : 'Local Only'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')} className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold hover:text-cyan-400 transition-colors shadow-sm">{density === 'compact' ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}</button>
                                <button onClick={() => setInventoryViewMode('kanban')} className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold hover:text-cyan-400 transition-colors shadow-sm"><KanbanIcon size={14} /> 看板</button>
                                <div className="h-6 w-px bg-white/10 mx-1 hidden lg:block"></div>
                                <button onClick={() => setIsErpSyncOpen(true)} className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold hover:border-blue-500/50 hover:text-blue-400 transition-all shadow-sm"><RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500 text-slate-500 group-hover:text-blue-400" /> ERP 同步</button>
                                <button onClick={() => setIsRestockPlanOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-bold hover:bg-cyan-500 transition-all shadow-glow-cyan active:scale-95"><CalendarClock size={14} /> {selectedIds.size > 0 ? `补货 (${selectedIds.size})` : '智能补货'}</button>
                                <button onClick={() => setIsBackupModalOpen(true)} className="p-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl hover:bg-white/10 transition-colors"><Download size={16} /></button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className={`${paddingClass} pl-6 w-12`}><button onClick={toggleSelectAll} className="flex items-center text-slate-500 hover:text-cyan-400 transition-colors">{selectedIds.size > 0 && selectedIds.size === activeRecords.length ? <CheckSquare size={20} className="text-cyan-400" /> : <Square size={20} />}</button></th>
                                        <th onClick={() => requestSort('sku')} className={`${paddingClass} pl-0 cursor-pointer hover:text-cyan-400 transition-colors w-[200px]`}><div className="flex items-center gap-1">SKU / 阶段 {sortConfig?.key === 'sku' && <ChevronDown size={14} />}</div></th>
                                        <th className={paddingClass}>产品信息 / 供应商</th>
                                        <th className={paddingClass}>物流 (Live)</th>
                                        <th onClick={() => requestSort('totalInvestment')} className={`${paddingClass} cursor-pointer hover:text-cyan-400 transition-colors`}><div className="flex items-center gap-1">资金投入 {sortConfig?.key === 'totalInvestment' && <ChevronDown size={14} />}</div></th>
                                        <th onClick={() => requestSort('daysOfSupply')} className={`${paddingClass} cursor-pointer hover:text-cyan-400 transition-colors`}><div className="flex items-center gap-1">库存 (Stock) {sortConfig?.key === 'daysOfSupply' && <ChevronDown size={14} />}</div></th>
                                        <th onClick={() => requestSort('profit')} className={`${paddingClass} cursor-pointer hover:text-cyan-400 transition-colors`}><div className="flex items-center gap-1">销售表现 {sortConfig?.key === 'profit' && <ChevronDown size={14} />}</div></th>
                                        <th className={`${paddingClass} pr-6 text-right`}>操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedRecords.length === 0 ? (
                                        <tr><td colSpan={8} className="p-16 text-center text-slate-500"><div className="flex flex-col items-center"><div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10"><Package size={32} className="opacity-40" /></div><p className="font-bold text-slate-400">暂无数据</p><button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className="mt-4 text-cyan-400 font-bold text-sm hover:text-cyan-300">+ 立即添加产品</button></div></td></tr>
                                    ) : (
                                        paginatedRecords.map((record) => {
                                            const metrics = calculateMetrics(record, effectiveSettings);
                                            const totalInvestment = (record.quantity * record.unitPriceCNY) + metrics.firstLegCostCNY;
                                            let lifecycleClass = 'bg-slate-700 text-slate-300 border-slate-600';
                                            let lifecycleIcon = null;
                                            if (record.lifecycle === 'New') { lifecycleClass = 'bg-blue-900/30 text-blue-300 border-blue-800'; lifecycleIcon = '🌱 新品'; }
                                            else if (record.lifecycle === 'Growth') { lifecycleClass = 'bg-emerald-900/30 text-emerald-300 border-emerald-800'; lifecycleIcon = '🚀 爆品'; }
                                            else if (record.lifecycle === 'Stable') { lifecycleClass = 'bg-indigo-900/30 text-indigo-300 border-indigo-800'; lifecycleIcon = '⚖️ 稳定'; }
                                            else if (record.lifecycle === 'Clearance') { lifecycleClass = 'bg-red-900/30 text-red-300 border-red-800'; lifecycleIcon = '📉 清仓'; }
                                            const isUrgent = metrics.daysOfSupply < 15;
                                            const isRecommended = metrics.daysOfSupply >= 15 && metrics.daysOfSupply < 30;
                                            const isSelected = selectedIds.has(record.id);

                                            return (
                                                <tr key={record.id} className={`group hover:bg-white/5 transition-colors ${isSelected ? 'bg-indigo-900/20' : ''}`}>
                                                    <td className={`${paddingClass} pl-6 align-top`}><button onClick={() => toggleSelection(record.id)} className="text-slate-500 hover:text-cyan-400 transition-colors pt-1">{isSelected ? <CheckSquare size={20} className="text-cyan-400" /> : <Square size={20} />}</button></td>
                                                    <td className={`${paddingClass} pl-0 align-top`}><div className="flex flex-col gap-2"><div className="flex items-center gap-2 font-black text-white text-sm text-glow"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-glow-cyan"></span>{record.sku}</div><div className="flex flex-wrap gap-1.5"><span className={`text-[10px] px-2 py-0.5 rounded border ${lifecycleClass} font-bold flex items-center gap-1 shadow-sm`}>{lifecycleIcon}</span><span className={`text-[10px] px-2 py-0.5 rounded border font-bold shadow-sm ${record.status === 'Planning' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : record.status === 'Shipped' ? 'bg-sky-900/30 text-sky-400 border-sky-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}>{record.status === 'Planning' ? '计划中' : record.status === 'Shipped' ? '运输中' : '已入库'}</span></div></div></td>
                                                    <td className={`${paddingClass} align-top`}><div className="flex items-start gap-4"><div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 cursor-pointer hover:shadow-glow-blue transition-all" onClick={() => { setEditingRecord(record); setIsModalOpen(true); }}>{record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 text-slate-500"/>}</div><div className="min-w-0"><div className="text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-400 transition-colors" title={record.productName}>{record.productName}</div><div className="text-[10px] text-slate-400 font-mono mt-1 font-medium">{record.date}</div>{record.supplierName && (<div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold mt-1 bg-white/5 px-2 py-0.5 rounded w-fit border border-white/10"><Factory size={10} className="text-slate-400"/><span className="truncate max-w-[80px]">{record.supplierName}</span></div>)}</div></div></td>
                                                    <td className={`${paddingClass} align-top`}><div className="flex items-center gap-1.5 text-xs font-bold mb-1"><div className={`p-1 rounded ${record.shippingMethod === 'Air' ? 'bg-blue-900/30 text-blue-400' : 'bg-indigo-900/30 text-indigo-400'}`}>{record.shippingMethod === 'Air' ? <Plane size={12}/> : <Ship size={12}/>}</div><span className={record.shippingMethod === 'Air' ? 'text-blue-300' : 'text-indigo-300'}>{record.shippingMethod === 'Air' ? '空运' : '海运'}</span></div><div className="text-[10px] text-slate-400 font-bold pl-1">{record.totalCartons}箱 · {metrics.totalWeightKg.toFixed(1)}kg</div>{record.status === 'Shipped' && record.trackingNumber && (<div className="mt-1.5"><a href={`https://www.17track.net/zh-cn/track?nums=${record.trackingNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-800 w-fit transition-colors font-bold"><Truck size={10} />{record.carrier ? `${record.carrier}: ` : ''}{record.trackingNumber.slice(0, 8)}...</a></div>)}</td>
                                                    <td className={`${paddingClass} align-top`}><div className="font-black text-sm text-white">{formatCurrency(totalInvestment, 'CNY')}</div><div className="flex flex-col gap-1 mt-1.5"><div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium"><div className="w-1.5 h-3 rounded-full bg-blue-500"></div>货: {formatCurrency(record.quantity * record.unitPriceCNY, 'CNY')}</div><div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium"><div className="w-1.5 h-3 rounded-full bg-orange-500"></div>运: {formatCurrency(metrics.firstLegCostCNY, 'CNY')}</div></div></td>
                                                    <td className={`${paddingClass} align-top`}><div className="flex items-center gap-2"><div className="text-base font-black text-white">{record.quantity}</div>{record.dailySales > 0 && (<div className="text-[10px] font-mono font-bold text-slate-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{metrics.daysOfSupply.toFixed(0)}d</div>)}</div><div className="flex justify-between items-center mt-1.5"><span className="text-[10px] text-slate-400 font-bold">日销: {record.dailySales}</span>{isUrgent && <span className="text-[10px] font-bold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-800"><AlertTriangle size={8}/> 补货</span>}</div>{record.dailySales > 0 && (<div className="w-20 bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${isUrgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : isRecommended ? 'bg-orange-400' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} style={{ width: `${Math.min(metrics.daysOfSupply, 100)}%` }}></div></div>)}</td>
                                                    <td className={`${paddingClass} align-top`}><div className="font-black text-sm text-white">${record.salesPriceUSD}</div><div className={`text-[10px] font-bold mt-1 flex items-center gap-1 transition-colors ${metrics.estimatedProfitUSD < 0 ? 'text-red-500' : 'text-emerald-400'}`}><TrendingUp size={10} />{metrics.marginRate.toFixed(1)}%</div><div className={`text-[10px] mt-0.5 font-mono font-bold ${metrics.estimatedProfitUSD < 0 ? 'text-red-500' : 'text-slate-400'}`}>Profit: ${metrics.estimatedProfitUSD.toFixed(2)}</div></td>
                                                    <td className={`${paddingClass} pr-6 align-top text-right`}><div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><button onClick={() => { setPORecord(record); setIsPOModalOpen(true); }} className="p-2 bg-orange-900/30 text-orange-400 rounded-lg hover:bg-orange-900/50 transition-colors shadow-sm" title="采购"><ShoppingCart size={14} /></button><button onClick={() => { setEditingRecord(record); setIsModalOpen(true); }} className="p-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg hover:border-cyan-500/50 hover:text-cyan-400 transition-colors shadow-sm" title="编辑"><Edit size={14} /></button><button onClick={() => setDeleteConfirm({ isOpen: true, id: record.id })} className="p-2 bg-white/5 border border-white/10 text-slate-400 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition-colors shadow-sm" title="删除"><Trash2 size={14} /></button></div></td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm flex justify-between items-center"><span className="text-xs text-slate-400 font-bold">显示 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, activeRecords.length)} / 共 {activeRecords.length} 条</span><div className="flex gap-2"><button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm"><ChevronLeft size={14}/></button><div className="flex items-center justify-center px-3 h-8 rounded-lg bg-slate-100 text-slate-900 font-bold text-xs shadow-md">{currentPage}</div><button disabled={currentPage * itemsPerPage >= activeRecords.length} onClick={() => setCurrentPage(c => c + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm"><ChevronRight size={14}/></button></div></div>
                    </div>
                    )}

                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
                        <div className={`bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-2 transition-all duration-500 flex items-center gap-4 ${isSimulationActive ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0 pointer-events-none'}`}>
                            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-2 rounded-xl text-white shadow-lg"><BrainCircuit size={20} className="animate-pulse" /></div>
                            <div className="flex-1 flex items-center gap-6 text-white">
                                <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">模拟汇率 (Exchange Rate)</label><div className="flex items-center gap-2"><span className="font-mono font-bold text-lg text-glow">{simulatedExchangeRate.toFixed(2)}</span><input type="range" min="6.0" max="8.0" step="0.05" value={simulatedExchangeRate} onChange={(e) => setSimulatedExchangeRate(parseFloat(e.target.value))} className="w-24 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-purple-500" /></div></div>
                                <div className="h-8 w-px bg-white/10"></div>
                                <div><label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">运费涨幅 (Freight +%)</label><div className="flex items-center gap-2"><span className="font-mono font-bold text-lg text-glow">+{simulatedFreightMarkup}%</span><input type="range" min="0" max="50" step="5" value={simulatedFreightMarkup} onChange={(e) => setSimulatedFreightMarkup(parseInt(e.target.value))} className="w-24 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500" /></div></div>
                            </div>
                            <button onClick={() => setIsSimulationActive(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"><X size={18} /></button>
                        </div>
                        {!isSimulationActive && (<button onClick={() => setIsSimulationActive(true)} className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-6 py-3 rounded-full shadow-glow-purple font-bold flex items-center gap-2 hover:scale-105 transition-all text-xs border border-white/20 backdrop-blur-md"><Gauge size={16} /> 开启经营沙盘模拟</button>)}
                    </div>
                </div>
              );
      }
  };

  return (
    <div className={`flex h-screen bg-aurora bg-grid-pattern font-sans overflow-hidden text-slate-100 transition-colors duration-300`}>
      <aside className="w-72 glass-sidebar flex-shrink-0 hidden md:flex flex-col z-50 shadow-2xl relative">
        <div className="p-6 flex items-center gap-3 border-b border-white/5 bg-slate-950/30">
           <div className="bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 rounded-xl shadow-glow-blue"><div className="bg-slate-900 p-2 rounded-[10px]"><LayoutDashboard className="text-white h-5 w-5" /></div></div>
           <div><h1 className="font-black text-lg tracking-tight leading-none text-white text-glow">Tanxing.OS</h1><p className="text-[10px] text-cyan-400 mt-1 font-bold tracking-wider opacity-80 uppercase">Intelligent Core v5.0</p></div>
        </div>
        
        {/* ... (Rest of sidebar content) ... */}
        <div className="px-4 pt-6">
            <button onClick={() => setIsCommandPaletteOpen(true)} className="w-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl p-3 flex items-center justify-between transition-all group backdrop-blur-sm shadow-inner hover:shadow-glow-blue hover:border-cyan-500/30">
                <div className="flex items-center gap-3"><Search size={16} className="text-slate-400 group-hover:text-cyan-400 transition-colors" /><span className="text-xs font-bold">全局搜索 (⌘K)</span></div>
                <div className="flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5 border border-white/10"><Command size={10} /><span className="text-[10px] font-bold">K</span></div>
            </button>
        </div>

        <div className="px-4 pt-4 pb-2">
           <div className="relative">
             <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:from-slate-700 hover:to-slate-800 transition-all border border-white/10 shadow-lg group" onClick={() => setIsStoreManagerOpen(true)}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-300 group-hover:text-indigo-200 transition-colors border border-indigo-500/30"><StoreIcon size={16} /></div>
                    <span className="text-sm font-bold truncate text-slate-200 group-hover:text-white">店铺矩阵 (Matrix)</span>
                </div>
                <div className="bg-white/10 text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-300 border border-white/5">{stores.length}</div>
             </div>
             <div className="mt-3 space-y-1">
                 <button onClick={() => setActiveStoreId('all')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${activeStoreId === 'all' ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 shadow-glow-cyan' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><span>全部店铺视图 (Global)</span>{activeStoreId === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-neon"></div>}</button>
                 {stores.map(store => (<button key={store.id} onClick={() => setActiveStoreId(store.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${activeStoreId === store.id ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${store.color} shadow-[0_0_8px_rgba(255,255,255,0.4)]`}></span><span className="truncate max-w-[120px] group-hover:translate-x-1 transition-transform">{store.name}</span></div></button>))}
             </div>
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar py-2">
          
          <div>
              <div className="px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">核心业务 (Core)</div>
              <div className="space-y-1">
                  <button onClick={() => setCurrentView('overview')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'overview' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><Home size={18} className={currentView === 'overview' ? 'text-cyan-400' : 'group-hover:text-slate-200'} /><span>控制台 (Dashboard)</span></button>
                  <button onClick={() => setCurrentView('inventory')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'inventory' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><List size={18} className={currentView === 'inventory' ? 'text-cyan-400' : 'group-hover:text-slate-200'} /><span>备货清单 (Inventory)</span></button>
              </div>
          </div>

          <div>
              <div className="px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">产品与创新 (Innovation)</div>
              <div className="space-y-1">
                  <button onClick={() => setCurrentView('rd_lab')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'rd_lab' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><Beaker size={18} className={currentView === 'rd_lab' ? 'text-purple-400' : 'group-hover:text-slate-200'} /><span>新品研发 (R&D Lab)</span></button>
              </div>
          </div>
          
          <div>
              <div className="px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">供应链中心 (Supply Chain)</div>
              <div className="space-y-1">
                  <button onClick={() => setCurrentView('geo_command')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'geo_command' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><MapPin size={18} className={currentView === 'geo_command' ? 'text-red-400' : 'group-hover:text-slate-200'} /><span>地理指挥室 (Geo Ops)</span></button>
                  <button onClick={() => setCurrentView('calendar')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'calendar' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><CalendarDays size={18} className={currentView === 'calendar' ? 'text-emerald-400' : 'group-hover:text-slate-200'} /><span>供应链日历 (Calendar)</span></button>
                  <button onClick={() => setCurrentView('purchasing')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'purchasing' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><ShoppingCart size={18} className={currentView === 'purchasing' ? 'text-orange-400' : 'group-hover:text-slate-200'} /><span>采购管理 (Purchasing)</span></button>
                  <button onClick={() => setCurrentView('suppliers')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'suppliers' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><Factory size={18} className={currentView === 'suppliers' ? 'text-indigo-400' : 'group-hover:text-slate-200'} /><span>供应商 CRM</span></button>
                  <button onClick={() => setCurrentView('wms')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'wms' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><Warehouse size={18} className={currentView === 'wms' ? 'text-purple-400' : 'group-hover:text-slate-200'} /><span>库存中心 (WMS)</span></button>
                  <button onClick={() => setCurrentView('logistics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'logistics' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><Search size={18} className={currentView === 'logistics' ? 'text-blue-400' : 'group-hover:text-slate-200'} /><span>物流追踪 (Tracking)</span></button>
              </div>
          </div>

          <div>
              <div className="px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">增长与财务 (Growth)</div>
              <div className="space-y-1">
                  <button onClick={() => setCurrentView('finance')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'finance' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><Wallet size={18} className={currentView === 'finance' ? 'text-emerald-400' : 'group-hover:text-slate-200'} /><span>财务中心 (Finance)</span></button>
                  <button onClick={() => setCurrentView('analytics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'analytics' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><PieChart size={18} className={currentView === 'analytics' ? 'text-blue-400' : 'group-hover:text-slate-200'} /><span>数据分析 (Analytics)</span></button>
                  <button onClick={() => setCurrentView('marketing')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden ${currentView === 'marketing' ? 'text-white font-bold shadow-lg border border-purple-500/50' : 'text-slate-400 hover:text-white font-medium'}`}>
                      {currentView === 'marketing' && <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 to-purple-600/50 opacity-90 backdrop-blur-md"></div>}
                      {currentView !== 'marketing' && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>}
                      <Sparkles size={18} className={`relative z-10 ${currentView === 'marketing' ? 'text-yellow-300' : 'group-hover:text-purple-400'}`} />
                      <span className="relative z-10">AI 营销工坊</span>
                  </button>
                  <button onClick={() => setCurrentView('calculator')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${currentView === 'calculator' ? 'bg-white/10 text-white shadow-lg border border-white/10 font-bold backdrop-blur-md' : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'}`}><Calculator size={18} className={currentView === 'calculator' ? 'text-blue-400' : 'group-hover:text-slate-200'} /><span>智能试算 (Tools)</span></button>
              </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm">
            <div className="flex gap-2 mb-4">
                <button onClick={() => setIsGlobalSettingsOpen(true)} className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors gap-1 group border border-white/5"><Settings size={16} className="text-slate-400 group-hover:text-white"/><span className="text-[9px] text-slate-500 group-hover:text-slate-300 font-bold">Setting</span></button>
                <button onClick={() => setIsCloudConfigOpen(true)} className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-colors gap-1 group border border-white/5 ${isCloudConfigOpen ? 'bg-cyan-600/20 text-white border-cyan-500/50 shadow-glow-cyan' : 'bg-white/5 hover:bg-white/10'}`}><CloudUpload size={16} className={isCloudConfigOpen ? 'text-cyan-300' : 'text-slate-400 group-hover:text-white'}/><span className={`text-[9px] font-bold ${isCloudConfigOpen ? 'text-cyan-100' : 'text-slate-500 group-hover:text-slate-300'}`}>Cloud</span></button>
                <button onClick={() => setIsRecycleBinOpen(true)} className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors gap-1 group relative border border-white/5"><Trash2 size={16} className="text-slate-400 group-hover:text-red-400"/><span className="text-[9px] text-slate-500 group-hover:text-red-300 font-bold">Bin</span>{deletedRecords.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-neon"></span>}</button>
            </div>
            <div onClick={() => setIsAiChatOpen(true)} className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-3 cursor-pointer hover:shadow-glow-purple transition-all group relative overflow-hidden flex items-center gap-3 border border-purple-500/30 ring-1 ring-white/5">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="bg-purple-500/20 p-1.5 rounded-lg backdrop-blur-md"><Bot className="text-purple-300 h-4 w-4" /></div>
                <div><span className="text-xs font-bold text-white block">AI Copilot</span><span className="text-[10px] text-purple-300 block opacity-90 font-medium">Click to Engage</span></div>
                <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
            </div>
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center md:hidden z-40 shrink-0">
            <div className="font-bold text-white text-glow">Tanxing.OS</div>
            <button className="text-gray-300"><Menu /></button>
        </header>

        {/* --- FIXED HEADER (Absolute Overlay) --- */}
        <div className="hidden md:flex absolute top-0 left-0 right-0 flex-col md:flex-row md:items-end justify-between gap-6 px-8 py-6 bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 z-30 transition-all duration-300 shadow-sm">
            <div className="relative">
                <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-neon animate-pulse"></div><span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase opacity-80">System Online</span></div>
                <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3 text-glow">
                    {currentView === 'overview' ? 'COMMAND CENTER' : currentView === 'inventory' ? 'INVENTORY OPS' : currentView === 'purchasing' ? 'PROCUREMENT' : currentView === 'wms' ? 'WAREHOUSE WMS' : currentView === 'finance' ? 'FINANCE CORE' : currentView === 'analytics' ? 'DATA INTELLIGENCE' : currentView === 'marketing' ? 'AI MARKETING' : currentView === 'calculator' ? 'SIMULATION LAB' : currentView === 'logistics' ? 'LOGISTICS TRACKER' : currentView === 'suppliers' ? 'SUPPLIER CRM' : currentView === 'calendar' ? 'SUPPLY CHAIN TIMELINE' : currentView === 'rd_lab' ? 'R&D INNOVATION LAB' : currentView === 'geo_command' ? 'GEO STRATEGY COMMAND' : 'SYSTEM VIEW'}
                </h2>
                <div className="absolute -bottom-2 left-0 w-24 h-1 bg-cyan-500 rounded-full shadow-glow-cyan"></div>
                <div className="absolute -bottom-2 left-26 w-2 h-1 bg-white/20 rounded-full"></div>
                <div className="absolute -bottom-2 left-30 w-2 h-1 bg-white/20 rounded-full"></div>
            </div>
            <div className="flex items-center gap-6">
                {/* --- PROMINENT CLOUD INDICATOR (Always show if ID exists) --- */}
                {workspaceId && (
                    <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-500/50 px-3 py-1.5 rounded-full shadow-glow-green animate-fade-in group cursor-default" title={syncStatus === 'connected' ? "实时同步中" : "连接中..."}>
                        <div className="relative">
                            <Cloud className={`text-emerald-400 ${syncStatus !== 'connected' ? 'opacity-50' : ''}`} size={16} />
                            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-black transition-colors duration-500 ${syncStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'}`}></span>
                        </div>
                        <span className="text-xs font-bold text-emerald-300 tracking-wide uppercase">CLOUD CONNECTED</span>
                    </div>
                )}

                <div onClick={() => setClockZone(prev => { if (prev === 'CN') return 'US_LA'; if (prev === 'US_LA') return 'US_NY'; return 'CN'; })} className="hidden lg:flex flex-col items-end border-r border-white/10 pr-6 cursor-pointer group select-none transition-opacity hover:opacity-80" title="点击切换时区 (CN / US-West / US-East)">
                    <div className="flex items-center gap-2 mb-1"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${clockZone.startsWith('US') ? 'bg-blue-500/20 text-blue-400 shadow-glow-blue' : 'text-slate-600 bg-white/5'}`}>US</span><RefreshCw size={10} className="text-slate-600 group-hover:text-cyan-400 transition-colors group-hover:rotate-180 duration-500" /><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${clockZone === 'CN' ? 'bg-red-500/20 text-red-400 shadow-glow-red' : 'text-slate-600 bg-white/5'}`}>CN</span></div>
                    <span className="text-3xl font-mono font-bold text-white leading-none tracking-widest text-glow">
                        {systemTime.toLocaleTimeString('en-US', { timeZone: clockZone === 'CN' ? 'Asia/Shanghai' : clockZone === 'US_LA' ? 'America/Los_Angeles' : 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mt-1">{systemTime.toLocaleDateString('zh-CN', { timeZone: clockZone === 'CN' ? 'Asia/Shanghai' : clockZone === 'US_LA' ? 'America/Los_Angeles' : 'America/New_York', month: 'numeric', day: 'numeric', weekday: 'short' })} {clockZone === 'CN' ? 'Beijing' : clockZone === 'US_LA' ? 'Los Angeles' : 'New York'}</span>
                </div>
                {currentView === 'inventory' && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
                        <button onClick={handleFinancialReport} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10 shadow-sm whitespace-nowrap backdrop-blur-md group"><DollarSign size={14} className="text-emerald-400 group-hover:text-emerald-300"/> 财务分析</button>
                        <button onClick={handleSmartAnalysis} className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-purple-500/30 shadow-glow-purple whitespace-nowrap group">{isAnalyzing ? <Loader2 className="animate-spin text-purple-400" size={14}/> : <BrainCircuit size={14} className="text-purple-400 group-hover:text-white"/>} 智能诊断</button>
                        <button onClick={() => { setEditingRecord(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-cyan-500 text-black px-6 py-2.5 rounded-xl text-xs font-extrabold hover:bg-cyan-400 transition-all shadow-glow-cyan active:scale-95 whitespace-nowrap"><Plus size={16} strokeWidth={3} /> ADD ITEM</button>
                    </div>
                )}
            </div>
        </div>

        {/* Main Content with Top Padding - increased from pt-36 to pt-48 */}
        <main className="flex-1 overflow-y-auto h-full pt-48 p-4 sm:p-6 lg:p-8 relative custom-scrollbar">
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          <div className="max-w-[1920px] w-full mx-auto pb-20">
             {renderContent()}
          </div>
        </main>
      </div>
      
      <CloudConnect 
        isOpen={isCloudConfigOpen} 
        onClose={() => setIsCloudConfigOpen(false)} 
        currentWorkspaceId={workspaceId} 
        onConnect={setWorkspaceId} 
        onDisconnect={() => setWorkspaceId(null)} 
        isSyncing={syncStatus === 'connecting'} 
        onConfigChange={() => setClientVersion(v => v + 1)}
      />
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
      <MarketingModal isOpen={marketingModalOpen} onClose={() => setMarketingModalOpen(false)} content={marketingContent} productName={marketingRecord?.productName || ''} record={marketingRecord} initialTab={marketingInitialTab} initialChannel={marketingInitialChannel} />
    </div>
  );
}

export default App;
