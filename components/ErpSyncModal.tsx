import React, { useState, useEffect, useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { X, Check, Database, Link as LinkIcon, Lock, ClipboardPaste, FileText, Save, ArrowRight, PlusCircle, AlertTriangle, TrendingUp, Package, RefreshCw, Key, Globe, Eye, EyeOff, Layers, Zap, Clock, Power, HelpCircle, ExternalLink } from 'lucide-react';
import { fetchLingxingInventory, fetchLingxingSales } from '../services/lingxingService';
import { fetchMiaoshouInventory, fetchMiaoshouSales } from '../services/miaoshouService';

interface ErpSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
  onUpdateRecords: (updatedRecords: ReplenishmentRecord[]) => void;
  currentStoreId?: string; // New prop
}

type SyncType = 'inventory' | 'sales';
type ErpPlatform = 'lingxing' | 'miaoshou';
type SyncItem = { sku: string; oldVal: number; newVal: number; name: string; status: 'match' | 'new' | 'error' };

export const ErpSyncModal: React.FC<ErpSyncModalProps> = ({ isOpen, onClose, records, onUpdateRecords, currentStoreId }) => {
  const [platform, setPlatform] = useState<ErpPlatform>('lingxing');
  const [activeTab, setActiveTab] = useState<'import' | 'api'>('import');
  const [syncType, setSyncType] = useState<SyncType>('inventory');
  
  // Import State
  const [pasteData, setPasteData] = useState('');

  // API State
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState(''); 
  const [proxyUrl, setProxyUrl] = useState(''); 
  
  // Auto Sync Settings
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60);

  const [showSecret, setShowSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [apiResults, setApiResults] = useState<SyncItem[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);

  // Load Config
  useEffect(() => {
      if (isOpen) {
          loadConfig(platform);
          setPasteData('');
          setApiResults([]);
          setIsApiLoading(false);
          setShowGuide(false);
      }
  }, [isOpen, platform]);

  const loadConfig = (p: ErpPlatform) => {
      const prefix = p === 'lingxing' ? 'lx' : 'ms';
      setField1(localStorage.getItem(`${prefix}_app_id`) || '');
      setField2(localStorage.getItem(`${prefix}_token`) || '');
      setProxyUrl(localStorage.getItem(`${prefix}_proxy_url`) || '');
      
      const savedAutoSync = localStorage.getItem('erp_auto_sync') === 'true';
      const savedInterval = parseInt(localStorage.getItem('erp_sync_interval') || '60');
      setAutoSync(savedAutoSync);
      setSyncInterval(savedInterval);
  };

  const saveConfig = () => {
      const prefix = platform === 'lingxing' ? 'lx' : 'ms';
      localStorage.setItem(`${prefix}_app_id`, field1);
      localStorage.setItem(`${prefix}_token`, field2);
      localStorage.setItem(`${prefix}_proxy_url`, proxyUrl);
      
      localStorage.setItem('erp_active_platform', platform);
      localStorage.setItem('erp_auto_sync', autoSync.toString());
      localStorage.setItem('erp_sync_interval', syncInterval.toString());
  };

  // --- Logic 1: Parse Paste Data ---
  const parsedPasteItems = useMemo(() => {
      if (!pasteData.trim()) return [];

      const lines = pasteData.trim().split('\n');
      const results: SyncItem[] = [];

      lines.forEach(line => {
          const cleanLine = line.replace(/,/g, '').replace(/\t/g, ' ').trim();
          if (!cleanLine) return;
          const parts = cleanLine.split(/\s+/);
          
          if (parts.length >= 2) {
              let qtyIndex = -1;
              let newVal = 0;
              const lastItem = parseFloat(parts[parts.length - 1]);
              if (!isNaN(lastItem)) {
                  qtyIndex = parts.length - 1;
                  newVal = lastItem;
              } else {
                  for (let i = parts.length - 1; i >= 0; i--) {
                       const val = parseFloat(parts[i]);
                       if (!isNaN(val)) {
                           qtyIndex = i;
                           newVal = val;
                           break;
                       }
                  }
              }

              if (qtyIndex !== -1) {
                  let rawSku = parts[0]; 
                  let extractedName = qtyIndex > 1 ? parts.slice(1, qtyIndex).join(' ') : rawSku;

                  const match = records.find(r => 
                      (r.sku || '').toLowerCase().trim() === rawSku.toLowerCase().trim() ||
                      (r.productName || '').toLowerCase().includes(rawSku.toLowerCase())
                  );

                  if (match) {
                      results.push({
                          sku: match.sku, 
                          name: match.productName,
                          oldVal: syncType === 'inventory' ? match.quantity : match.dailySales,
                          newVal: newVal,
                          status: 'match'
                      });
                  } else {
                      results.push({
                          sku: rawSku,
                          name: extractedName,
                          oldVal: 0,
                          newVal: newVal,
                          status: 'new'
                      });
                  }
              }
          }
      });
      return results;
  }, [pasteData, records, syncType]);

  // --- Logic 2: API Fetch ---
  const handleApiSync = async () => {
    saveConfig(); 
    setIsApiLoading(true);
    setApiResults([]);
    
    try {
        if (!field1 || !field2) {
            if (!window.confirm("未填写完整凭证，是否使用模拟数据进行演示？")) {
                setIsApiLoading(false);
                return;
            }
        }

        let fetchedItems: SyncItem[] = [];
        
        if (platform === 'lingxing') {
            if (syncType === 'inventory') {
                const data = await fetchLingxingInventory(field1, field2, records, proxyUrl);
                fetchedItems = data.map(item => {
                    const match = records.find(r => r.sku === item.sku);
                    return {
                        sku: item.sku,
                        name: item.productName || match?.productName || item.sku,
                        oldVal: match ? match.quantity : 0,
                        newVal: item.fbaStock,
                        status: match ? 'match' : 'new'
                    };
                });
            } else {
                const data = await fetchLingxingSales(field1, field2, records, 30, proxyUrl);
                fetchedItems = data.map(item => {
                    const match = records.find(r => r.sku === item.sku);
                    return {
                        sku: item.sku,
                        name: match?.productName || item.sku,
                        oldVal: match ? match.dailySales : 0,
                        newVal: item.avgDailySales,
                        status: match ? 'match' : 'new'
                    };
                });
            }
        } else {
            if (syncType === 'inventory') {
                const data = await fetchMiaoshouInventory(field1, field2, records, proxyUrl);
                fetchedItems = data.map(item => {
                    const match = records.find(r => r.sku === item.product_sku);
                    return {
                        sku: item.product_sku,
                        name: item.cn_name || match?.productName || item.product_sku,
                        oldVal: match ? match.quantity : 0,
                        newVal: item.stock_quantity,
                        status: match ? 'match' : 'new'
                    };
                });
            } else {
                const data = await fetchMiaoshouSales(field1, field2, records, 30, proxyUrl);
                fetchedItems = data.map(item => {
                    const match = records.find(r => r.sku === item.product_sku);
                    return {
                        sku: item.product_sku,
                        name: match?.productName || item.product_sku,
                        oldVal: match ? match.dailySales : 0,
                        newVal: item.avg_sales_30d,
                        status: match ? 'match' : 'new'
                    };
                });
            }
        }
        setApiResults(fetchedItems);
    } catch (e: any) {
        alert("同步失败: " + e.message);
    } finally {
        setIsApiLoading(false);
    }
  };

  const displayItems = activeTab === 'import' ? parsedPasteItems : apiResults;

  if (!isOpen) return null;

  // --- CORE FIX: Immutable State Update Logic ---
  const handleApply = () => {
      saveConfig();
      
      const changesMap = new Map<string, SyncItem>();
      const newRecords: ReplenishmentRecord[] = [];
      let updateCount = 0;
      let createCount = 0;

      // 1. Organize changes for O(1) lookup
      displayItems.forEach(item => {
          if (item.status === 'match') {
              changesMap.set(item.sku, item);
          } else if (item.status === 'new') {
              const newRecord: ReplenishmentRecord = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  date: new Date().toISOString().split('T')[0],
                  sku: item.sku,
                  productName: item.name || item.sku,
                  quantity: syncType === 'inventory' ? item.newVal : 0,
                  dailySales: syncType === 'sales' ? item.newVal : 0,
                  status: 'Planning',
                  lifecycle: 'New',
                  unitPriceCNY: 0, unitWeightKg: 0, boxLengthCm: 0, boxWidthCm: 0, boxHeightCm: 0, itemsPerBox: 1,
                  totalCartons: syncType === 'inventory' ? Math.ceil(item.newVal) : 0,
                  shippingMethod: 'Air', shippingUnitPriceCNY: 0, materialCostCNY: 0, customsFeeCNY: 0, portFeeCNY: 0,
                  salesPriceUSD: 0, lastMileCostUSD: 0, adCostUSD: 0, platformFeeRate: 2, affiliateCommissionRate: 0, additionalFixedFeeUSD: 0, returnRate: 0,
                  warehouse: 'Default Warehouse',
                  storeId: currentStoreId || undefined, 
              };
              newRecords.push(newRecord);
              createCount++;
          }
      });

      // 2. Map existing records to NEW objects if they have changes (Immutable Update)
      const updatedRecords = records.map(record => {
          const change = changesMap.get(record.sku);
          if (change) {
              updateCount++;
              // Return a BRAND NEW object spread from the old one + overrides
              return {
                  ...record,
                  quantity: syncType === 'inventory' ? change.newVal : record.quantity,
                  dailySales: syncType === 'sales' ? change.newVal : record.dailySales,
                  // If updating inventory, auto-recalculate total cartons based on itemsPerBox
                  totalCartons: syncType === 'inventory' 
                      ? Math.ceil(change.newVal / (record.itemsPerBox || 1)) 
                      : record.totalCartons
              };
          }
          return record; // Return original reference if no change
      });

      const finalRecords = [...newRecords, ...updatedRecords];
      onUpdateRecords(finalRecords);

      let msg = '';
      if (updateCount > 0) msg += `成功更新 ${updateCount} 条${syncType === 'inventory' ? '库存' : '销量'}数据。`;
      if (createCount > 0) msg += ` 并新建 ${createCount} 个产品档案。`;
      alert(msg || "数据未发生变化");
      
      onClose();
  };

  const matchCount = displayItems.filter(i => i.status === 'match').length;
  const newCount = displayItems.filter(i => i.status === 'new').length;

  const isSales = syncType === 'sales';
  const isLingxing = platform === 'lingxing';
  const brandColor = isLingxing ? 'bg-blue-600' : 'bg-orange-600';
  const brandColorHover = isLingxing ? 'hover:bg-blue-700' : 'hover:bg-orange-700';
  const brandText = isLingxing ? 'text-blue-600' : 'text-orange-600';
  const brandBorder = isLingxing ? 'border-blue-600' : 'border-orange-600';
  const brandLightBg = isLingxing ? 'bg-blue-50' : 'bg-orange-50';
  const typeColor = isSales ? 'text-green-600' : brandText;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
            {/* Background Decor */}
            <div className={`absolute top-0 right-0 w-64 h-full ${isLingxing ? 'bg-blue-900' : 'bg-orange-900'} opacity-20 transform skew-x-12 translate-x-10`}></div>

            <div className="flex items-center gap-4 z-10">
                <div className={`p-2 rounded-lg ${isLingxing ? 'bg-blue-500' : 'bg-orange-500'} shadow-lg`}>
                    <Database size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isLingxing ? '领星 ERP 同步' : '秒手 ERP 同步'}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border border-white/20 ${isLingxing ? 'bg-blue-800' : 'bg-orange-800'}`}>
                            {isLingxing ? 'Lingxing' : 'Miaoshou'}
                        </span>
                    </h2>
                    <p className="text-slate-400 text-xs">Multi-Platform Integration Hub</p>
                </div>
            </div>
            
            {/* Platform Switcher in Header */}
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 z-10">
                <button 
                    onClick={() => setPlatform('lingxing')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${isLingxing ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Layers size={12}/> 领星
                </button>
                <button 
                    onClick={() => setPlatform('miaoshou')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${!isLingxing ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Zap size={12}/> 秒手
                </button>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white z-10 ml-4"><X size={24} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
            <button 
                onClick={() => setActiveTab('import')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'import' ? `${brandBorder} ${brandText} bg-white` : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <ClipboardPaste size={18} /> Excel 粘贴导入 (通用)
            </button>
            <button 
                onClick={() => setActiveTab('api')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'api' ? `${brandBorder} ${brandText} bg-white` : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                <LinkIcon size={18} /> API 直连 (高级)
            </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white">
            
            {/* Left Panel: Configuration & Input */}
            <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col p-5 bg-gray-50 overflow-y-auto">
                
                {/* 1. Mode Selection (Common) */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. 同步目标</label>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => { setSyncType('inventory'); setApiResults([]); }} 
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${!isSales ? `${brandLightBg} ${brandBorder} ${brandText} shadow-sm ring-1` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                        >
                            <div className={`p-2 rounded-lg ${!isSales ? (isLingxing ? 'bg-blue-200' : 'bg-orange-200') : 'bg-gray-200'}`}><Package size={18}/></div>
                            <div>
                                <div className="font-bold text-sm">更新库存数量</div>
                                <div className="text-[10px] opacity-70">Inventory Level</div>
                            </div>
                            {!isSales && <Check size={16} className={`ml-auto ${brandText}`}/>}
                        </button>
                        
                        <button 
                            onClick={() => { setSyncType('sales'); setApiResults([]); }} 
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${isSales ? 'bg-green-50 border-green-200 text-green-800 shadow-sm ring-1 ring-green-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                        >
                            <div className={`p-2 rounded-lg ${isSales ? 'bg-green-200' : 'bg-gray-200'}`}><TrendingUp size={18}/></div>
                            <div>
                                <div className="font-bold text-sm">更新销量 (日均)</div>
                                <div className="text-[10px] opacity-70">Avg. Daily Sales</div>
                            </div>
                            {isSales && <Check size={16} className="ml-auto text-green-600"/>}
                        </button>
                    </div>
                </div>

                {/* 2. Input Area */}
                <div className="flex-1 flex flex-col">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between items-center">
                        <span>2. 数据来源</span>
                        {activeTab === 'api' && (
                            <button 
                                onClick={() => setShowGuide(!showGuide)}
                                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${showGuide ? 'bg-gray-200 text-gray-700' : 'text-blue-500 hover:bg-blue-50'}`}
                            >
                                <HelpCircle size={10} />
                                {showGuide ? '隐藏指引' : '如何获取凭证?'}
                            </button>
                        )}
                    </label>
                    
                    {activeTab === 'import' ? (
                        <div className="flex-1 flex flex-col">
                            <div className={`mb-2 text-[10px] p-2 rounded border ${isSales ? 'bg-green-50 border-green-200 text-green-700' : `${brandLightBg} ${brandBorder} ${brandText}`}`}>
                                <strong>💡 操作提示:</strong><br/>
                                请从{isLingxing ? '领星' : '秒手'}报表中复制 <strong>SKU</strong> 和 <strong>{isSales ? '销量' : '库存'}</strong> 两列数据粘贴到下方。
                            </div>
                            <textarea 
                                className="flex-1 w-full p-3 border rounded-xl text-xs font-mono bg-white outline-none resize-none shadow-inner focus:ring-2 border-gray-300 transition-all"
                                style={{ '--tw-ring-color': isLingxing ? '#3b82f6' : '#ea580c' } as React.CSSProperties}
                                placeholder={`SKU      Value\nMA-001   150\nCP-Q1M   20\n...`}
                                value={pasteData}
                                onChange={e => setPasteData(e.target.value)}
                            ></textarea>
                            <div className="flex justify-end mt-2">
                                <button onClick={() => setPasteData('')} className="text-xs text-gray-400 hover:text-red-500 underline">清空</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                             {/* HELP GUIDE SECTION */}
                             {showGuide && (
                                 <div className={`text-xs p-3 rounded-lg border mb-2 leading-relaxed ${isLingxing ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-orange-50 border-orange-100 text-orange-800'}`}>
                                     <h4 className="font-bold flex items-center gap-1 mb-2">
                                         {isLingxing ? '领星对接指引' : '秒手对接指引'}
                                         <ExternalLink size={10} />
                                     </h4>
                                     {isLingxing ? (
                                         <ol className="list-decimal list-inside space-y-1 opacity-90">
                                             <li>登录领星 OMS 系统</li>
                                             <li>进入 <strong>设置 (Settings)</strong> -&gt; <strong>开发者工具 (Developer)</strong></li>
                                             <li>创建一个新的 Access Token</li>
                                             <li>复制 App ID 和 Token 到下方</li>
                                         </ol>
                                     ) : (
                                         <ol className="list-decimal list-inside space-y-1 opacity-90">
                                             <li>访问 <a href="#" className="underline font-bold">秒手开放平台 (Open Platform)</a></li>
                                             <li>注册开发者账号并创建<strong>“自研应用”</strong></li>
                                             <li>在应用详情页获取 <strong>App Key</strong> 和 <strong>App Secret</strong></li>
                                             <li>注意：需配置 IP 白名单或使用下方代理</li>
                                         </ol>
                                     )}
                                 </div>
                             )}

                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">
                                     {isLingxing ? 'App ID' : 'App Key'}
                                 </label>
                                 <div className="relative">
                                     <Lock className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                     <input 
                                        type="text" 
                                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-opacity-50 outline-none"
                                        style={{ '--tw-ring-color': isLingxing ? '#93c5fd' : '#fdba74' } as React.CSSProperties}
                                        placeholder={isLingxing ? "Enter App ID" : "Enter App Key"}
                                        value={field1}
                                        onChange={e => setField1(e.target.value)}
                                     />
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">
                                     {isLingxing ? 'Access Token' : 'App Secret'}
                                 </label>
                                 <div className="relative">
                                     <Key className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                     <input 
                                        type={showSecret ? "text" : "password"} 
                                        className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-opacity-50 outline-none"
                                        style={{ '--tw-ring-color': isLingxing ? '#93c5fd' : '#fdba74' } as React.CSSProperties}
                                        placeholder={isLingxing ? "Enter Access Token" : "Enter App Secret"}
                                        value={field2}
                                        onChange={e => setField2(e.target.value)}
                                     />
                                     <button 
                                        type="button" 
                                        onClick={() => setShowSecret(!showSecret)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                     >
                                         {showSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
                                     </button>
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">代理服务器 URL (CORS Proxy)</label>
                                 <div className="relative">
                                     <Globe className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                     <input 
                                        type="text" 
                                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-opacity-50 outline-none"
                                        style={{ '--tw-ring-color': isLingxing ? '#93c5fd' : '#fdba74' } as React.CSSProperties}
                                        placeholder="https://your-proxy.com (可选)"
                                        value={proxyUrl}
                                        onChange={e => setProxyUrl(e.target.value)}
                                     />
                                 </div>
                                 <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                                    * 浏览器安全策略限制直接调用第三方 API。<br/>
                                    * 若未配置代理，系统将使用<strong>模拟数据</strong>演示。
                                 </p>
                             </div>

                             {/* Auto Sync Settings */}
                             <div className="bg-gray-100 p-3 rounded-xl mt-4 border border-gray-200">
                                 <div className="flex items-center justify-between mb-2">
                                     <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                                         <Power size={12} className={autoSync ? 'text-green-500' : 'text-gray-400'}/> 
                                         自动化托管
                                     </span>
                                     <button 
                                        onClick={() => setAutoSync(!autoSync)}
                                        className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${autoSync ? 'bg-green-500' : 'bg-gray-300'}`}
                                     >
                                         <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${autoSync ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                     </button>
                                 </div>
                                 {autoSync && (
                                     <div className="flex items-center gap-2 animate-fade-in">
                                         <Clock size={12} className="text-gray-400" />
                                         <select 
                                            value={syncInterval}
                                            onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                                            className="text-xs bg-white border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500 flex-1"
                                         >
                                             <option value={15}>每 15 分钟 (高频)</option>
                                             <option value={30}>每 30 分钟</option>
                                             <option value={60}>每 1 小时 (推荐)</option>
                                             <option value={240}>每 4 小时</option>
                                         </select>
                                     </div>
                                 )}
                             </div>

                             <button 
                                onClick={handleApiSync}
                                disabled={isApiLoading}
                                className={`w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                                    isApiLoading 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : `${brandColor} ${brandColorHover} text-white`
                                }`}
                             >
                                 {isApiLoading ? <RefreshCw className="animate-spin" size={16} /> : <LinkIcon size={16} />}
                                 {isApiLoading ? '正在连接...' : `连接 ${isLingxing ? 'Lingxing' : 'Miaoshou'} 并获取`}
                             </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Preview & Action */}
            <div className="flex-1 flex flex-col p-0 overflow-hidden relative">
                <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                    <h3 className={`font-bold text-gray-800 flex items-center gap-2 ${typeColor}`}>
                        <FileText size={18}/> 
                        {activeTab === 'api' ? 'API 返回结果' : '识别预览'} 
                        <span className="text-gray-400 font-normal text-xs ml-1">({isSales ? '销量' : '库存'})</span>
                    </h3>
                    <div className="text-xs space-x-3 flex">
                        <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">匹配: {matchCount}</span>
                        <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">新增: {newCount}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50/50">
                    {displayItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                            {activeTab === 'import' ? <ClipboardPaste size={48} className="mb-2" /> : <Database size={48} className="mb-2" />}
                            <p className="text-sm font-medium">
                                {activeTab === 'import' ? '请在左侧粘贴数据以预览' : '请点击左侧按钮获取数据'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {displayItems.map((item, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm transition-all hover:shadow-md ${item.status === 'match' ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${item.status === 'match' ? 'bg-green-100 text-green-700' : 'bg-blue-200 text-blue-700'}`}>
                                            {item.status === 'match' ? <Check size={14}/> : <PlusCircle size={14}/>}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 text-sm">{item.sku}</span>
                                                {item.status === 'new' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded font-bold border border-blue-200">New</span>}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate max-w-[150px] md:max-w-[200px]" title={item.name}>{item.name}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        {item.status === 'match' && (
                                            <div className="text-right hidden sm:block">
                                                <div className="text-[10px] text-gray-400 uppercase font-bold">Current</div>
                                                <div className="text-sm font-mono text-gray-500 line-through decoration-gray-300">{item.oldVal}</div>
                                            </div>
                                        )}
                                        {item.status === 'match' && <ArrowRight size={14} className="text-gray-300 hidden sm:block" />}
                                        <div className="text-right min-w-[60px]">
                                            <div className={`text-[10px] font-bold uppercase ${typeColor}`}>Update</div>
                                            <div className={`text-lg font-mono font-bold ${typeColor}`}>{item.newVal}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                     {newCount > 0 && (
                         <div className="mb-3 flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded-lg text-xs border border-blue-100">
                             <AlertTriangle size={16} className="shrink-0 mt-0.5 text-blue-500" />
                             <div>
                                 <strong>将自动创建 {newCount} 个新产品档案。</strong>
                                 <p className="opacity-80 mt-1">系统会自动补全基础信息，建议同步后完善成本与物流参数。</p>
                             </div>
                         </div>
                     )}
                     
                     <button 
                        onClick={handleApply}
                        disabled={displayItems.length === 0}
                        className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.99] ${
                            displayItems.length === 0 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : `${isSales ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : `${brandColor} ${brandColorHover} shadow-blue-200`} text-white`
                        }`}
                     >
                         <Save size={18} />
                         {matchCount === 0 && newCount === 0 ? '暂无数据可更新' : 
                          `确认同步 ${matchCount + newCount} 条数据`}
                     </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};