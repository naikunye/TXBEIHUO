import React, { useState, useEffect, useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { X, Check, Database, Link as LinkIcon, ClipboardPaste, FileText, Save, ArrowRight, PlusCircle, AlertTriangle, TrendingUp, Package, RefreshCw, Layers, Zap, HelpCircle, ServerOff, Search, ExternalLink } from 'lucide-react';
import { fetchLingxingInventory, fetchLingxingSales } from '../services/lingxingService';
import { fetchMiaoshouInventory, fetchMiaoshouSales } from '../services/miaoshouService';

interface ErpSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
  onUpdateRecords: (updatedRecords: ReplenishmentRecord[]) => void;
  currentStoreId?: string; 
}

type SyncType = 'inventory' | 'sales';
type ErpPlatform = 'lingxing' | 'miaoshou';
type SyncItem = { sku: string; oldVal: number; newVal: number; name: string; status: 'match' | 'new' | 'error' };

export const ErpSyncModal: React.FC<ErpSyncModalProps> = ({ isOpen, onClose, records, onUpdateRecords, currentStoreId }) => {
  const [platform, setPlatform] = useState<ErpPlatform>('lingxing');
  
  // DEFAULT TO 'import' TO AVOID VERCEL ISSUES
  const [activeTab, setActiveTab] = useState<'import' | 'api'>('import');
  
  const [syncType, setSyncType] = useState<SyncType>('inventory');
  
  // Import State
  const [pasteData, setPasteData] = useState('');

  // API State
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState(''); 
  const [proxyUrl, setProxyUrl] = useState(''); 
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiResults, setApiResults] = useState<SyncItem[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  // Load Config
  useEffect(() => {
      if (isOpen) {
          loadConfig(platform);
          setPasteData('');
          setApiResults([]);
          setIsApiLoading(false);
      }
  }, [isOpen, platform]);

  const loadConfig = (p: ErpPlatform) => {
      const prefix = p === 'lingxing' ? 'lx' : 'ms';
      setField1(localStorage.getItem(`${prefix}_app_id`) || '');
      setField2(localStorage.getItem(`${prefix}_token`) || '');
      setProxyUrl(localStorage.getItem(`${prefix}_proxy_url`) || '');
  };

  const saveConfig = () => {
      const prefix = platform === 'lingxing' ? 'lx' : 'ms';
      localStorage.setItem(`${prefix}_app_id`, field1);
      localStorage.setItem(`${prefix}_token`, field2);
      localStorage.setItem(`${prefix}_proxy_url`, proxyUrl);
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
                      (r.sku || '').trim().toLowerCase() === rawSku.trim().toLowerCase() ||
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

  // --- Logic 2: API Fetch (Graceful Fallback) ---
  const handleApiSync = async (forceSimulation = false) => {
    saveConfig(); 
    setIsApiLoading(true);
    setApiResults([]);
    
    // Always prefer simulation if forceSimulation is true, otherwise check proxy URL
    const effectiveProxyUrl = forceSimulation ? undefined : proxyUrl;

    try {
        let fetchedItems: SyncItem[] = [];

        // Generic Fetch Wrapper
        const fetcher = async () => {
            if (platform === 'lingxing') {
                if (syncType === 'inventory') return await fetchLingxingInventory(field1, field2, records, effectiveProxyUrl);
                else return await fetchLingxingSales(field1, field2, records, 30, effectiveProxyUrl);
            } else {
                if (syncType === 'inventory') return await fetchMiaoshouInventory(field1, field2, records, effectiveProxyUrl);
                else return await fetchMiaoshouSales(field1, field2, records, 30, effectiveProxyUrl);
            }
        };

        const data = await fetcher();
        
        // Map Result
        fetchedItems = (data as any[]).map(item => {
            const itemSku = item.sku || item.product_sku || '';
            const match = records.find(r => (r.sku || '').trim().toLowerCase() === itemSku.trim().toLowerCase());
            
            let newVal = 0;
            if (platform === 'lingxing') {
                newVal = syncType === 'inventory' ? item.fbaStock : item.avgDailySales;
            } else {
                newVal = syncType === 'inventory' ? item.stock_quantity : item.avg_sales_30d;
            }

            return {
                sku: match ? match.sku : itemSku, 
                name: match?.productName || item.productName || item.cn_name || itemSku,
                oldVal: match ? (syncType === 'inventory' ? match.quantity : match.dailySales) : 0,
                newVal: newVal,
                status: match ? 'match' : 'new'
            };
        });
        
        setApiResults(fetchedItems);

    } catch (e: any) {
        console.error(e);
        // Auto fallback to simulation if real connection fails
        if (!forceSimulation && window.confirm(`连接失败 (${e.message})。是否切换到「演示模式」生成模拟数据？`)) {
            handleApiSync(true);
        }
    } finally {
        setIsApiLoading(false);
    }
  };

  const displayItems = activeTab === 'import' ? parsedPasteItems : apiResults;
  const matchCount = displayItems.filter(i => i.status === 'match').length;
  const newCount = displayItems.filter(i => i.status === 'new').length;

  const isSales = syncType === 'sales';
  const isLingxing = platform === 'lingxing';
  const brandColor = isLingxing ? 'bg-blue-600' : 'bg-orange-600';
  const brandText = isLingxing ? 'text-blue-600' : 'text-orange-600';
  const brandBorder = isLingxing ? 'border-blue-600' : 'border-orange-600';
  const brandLightBg = isLingxing ? 'bg-blue-50' : 'bg-orange-50';
  const typeColor = isSales ? 'text-green-600' : brandText;

  const handleApply = () => {
      saveConfig();
      const changesMap = new Map<string, SyncItem>();
      const newRecords: ReplenishmentRecord[] = [];

      displayItems.forEach(item => {
          if (!item.sku) return; 
          const key = item.sku.trim().toLowerCase();
          if (item.status === 'match') {
              changesMap.set(key, item);
          } else if (item.status === 'new') {
              newRecords.push({
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
              });
          }
      });

      const updatedRecords = records.map(record => {
          const sku = record.sku ? record.sku.trim().toLowerCase() : '';
          const change = changesMap.get(sku);
          if (change) {
              return {
                  ...record,
                  quantity: syncType === 'inventory' ? change.newVal : record.quantity,
                  dailySales: syncType === 'sales' ? change.newVal : record.dailySales,
                  totalCartons: syncType === 'inventory' 
                      ? Math.ceil(change.newVal / (record.itemsPerBox > 0 ? record.itemsPerBox : 1)) 
                      : record.totalCartons
              };
          }
          return record; 
      });

      onUpdateRecords([...newRecords, ...updatedRecords]);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
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
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 z-10">
                <button onClick={() => setPlatform('lingxing')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${isLingxing ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><Layers size={12}/> 领星</button>
                <button onClick={() => setPlatform('miaoshou')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${!isLingxing ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><Zap size={12}/> 秒手</button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white z-10 ml-4"><X size={24} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
            <button onClick={() => setActiveTab('import')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'import' ? `${brandBorder} ${brandText} bg-white` : 'border-transparent text-gray-500 hover:text-gray-700'}`}><ClipboardPaste size={18} /> Excel 粘贴导入 (推荐)</button>
            <button onClick={() => setActiveTab('api')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'api' ? `${brandBorder} ${brandText} bg-white` : 'border-transparent text-gray-400 hover:text-gray-600'}`}><LinkIcon size={18} /> API 直连 (需要部署)</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white relative">
            
            {/* Left Panel Inputs */}
            <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col p-5 bg-gray-50 overflow-y-auto">
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. 同步目标</label>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => { setSyncType('inventory'); setApiResults([]); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${!isSales ? `${brandLightBg} ${brandBorder} ${brandText} shadow-sm ring-1` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                            <div className={`p-2 rounded-lg ${!isSales ? (isLingxing ? 'bg-blue-200' : 'bg-orange-200') : 'bg-gray-200'}`}><Package size={18}/></div>
                            <div><div className="font-bold text-sm">更新库存数量</div></div>
                            {!isSales && <Check size={16} className={`ml-auto ${brandText}`}/>}
                        </button>
                        <button onClick={() => { setSyncType('sales'); setApiResults([]); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${isSales ? 'bg-green-50 border-green-200 text-green-800 shadow-sm ring-1 ring-green-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                            <div className={`p-2 rounded-lg ${isSales ? 'bg-green-200' : 'bg-gray-200'}`}><TrendingUp size={18}/></div>
                            <div><div className="font-bold text-sm">更新销量 (日均)</div></div>
                            {isSales && <Check size={16} className="ml-auto text-green-600"/>}
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between items-center">
                        <span>2. 数据来源</span>
                        {activeTab === 'api' && <button onClick={() => setShowGuide(!showGuide)} className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline"><HelpCircle size={10} /> 帮助</button>}
                    </label>
                    
                    {activeTab === 'import' ? (
                        <div className="flex-1 flex flex-col">
                            <textarea className="flex-1 w-full p-3 border rounded-xl text-xs font-mono outline-none resize-none shadow-inner focus:ring-2 border-gray-300" placeholder={`SKU      Value\nMA-001   150...`} value={pasteData} onChange={e => setPasteData(e.target.value)}></textarea>
                            <p className="text-[10px] text-gray-400 mt-2">提示：直接从 ERP 导出的 Excel 复制并粘贴两列数据 (SKU, 数量) 即可。</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">App ID / Key</label>
                                 <input type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" value={field1} onChange={e => setField1(e.target.value)} />
                             </div>
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">Token / Secret</label>
                                 <input type="password" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" value={field2} onChange={e => setField2(e.target.value)} />
                             </div>
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 flex justify-between items-center">
                                     <span>代理 URL</span>
                                 </label>
                                 <input type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" placeholder="https://..." value={proxyUrl} onChange={e => setProxyUrl(e.target.value)} />
                             </div>

                             <div className="pt-2 grid grid-cols-1 gap-3">
                                 <button onClick={() => handleApiSync(false)} disabled={isApiLoading} className={`w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 ${brandColor} text-white`}>
                                     {isApiLoading ? <RefreshCw className="animate-spin" size={16} /> : <LinkIcon size={16} />} 连接同步
                                 </button>
                                 <button onClick={() => handleApiSync(true)} className="w-full py-3 rounded-xl font-bold text-sm border-2 border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center justify-center gap-2">
                                     <ServerOff size={16} /> 演示模式 (Mock)
                                 </button>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Preview */}
            <div className="flex-1 flex flex-col p-0 overflow-hidden relative">
                <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                    <h3 className={`font-bold text-gray-800 flex items-center gap-2 ${typeColor}`}><FileText size={18}/> 预览结果</h3>
                    <div className="text-xs space-x-3 flex">
                        <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">匹配: {matchCount}</span>
                        <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">新增: {newCount}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50/50">
                    {displayItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                            <Database size={48} className="mb-2" />
                            <p className="text-sm">暂无数据</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {displayItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border bg-white border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${item.status === 'match' ? 'bg-green-100 text-green-700' : 'bg-blue-200 text-blue-700'}`}>{item.status === 'match' ? <Check size={14}/> : <PlusCircle size={14}/>}</div>
                                        <div>
                                            <div className="font-bold text-gray-800 text-sm">{item.sku}</div>
                                            <div className="text-xs text-gray-500 truncate w-32">{item.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-mono font-bold ${typeColor}`}>{item.newVal}</div>
                                        {item.status === 'match' && <div className="text-[10px] text-gray-400 line-through">{item.oldVal}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-white border-t border-gray-200 z-20">
                     <button onClick={handleApply} disabled={displayItems.length === 0} className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${displayItems.length === 0 ? 'bg-gray-100 text-gray-400' : `${brandColor} text-white`}`}>
                         <Save size={18} /> 确认同步
                     </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};