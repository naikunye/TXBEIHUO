import React, { useState, useEffect, useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { X, Check, Database, Link as LinkIcon, Lock, ClipboardPaste, FileText, Save, ArrowRight, PlusCircle, AlertTriangle, TrendingUp, Package, RefreshCw, Key, Globe, Eye, EyeOff, Layers, Zap, Clock, Power, HelpCircle, ExternalLink, PlayCircle, ServerOff, Wifi, Code, Copy, Terminal, Download, Folder, FileCode, AlertCircle, Search } from 'lucide-react';
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

// --- Code Snippets for Guide ---
const CODE_PACKAGE = `{
  "name": "tanxing-proxy",
  "version": "1.0.0",
  "engines": { "node": "18.x" },
  "dependencies": {}
}`;

const CODE_VERCEL = `{
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/proxy" }
  ]
}`;

const CODE_PROXY = `export default async function handler(req, res) {
  // 1. 设置跨域头 (允许探行前端访问)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. 健康检查 (防止 404 误解)
  if (!req.body || req.method === 'GET') {
      return res.status(200).json({ 
          status: "ok", 
          message: "Tanxing Proxy is Running!",
          time: new Date().toISOString()
      });
  }

  try {
    const { appId, accessToken, appKey, appSecret, skus } = req.body;
    
    // ----------------------------------------
    // 这里是为了演示的模拟逻辑。
    // 真实使用时，请替换为 fetch() 调用领星/秒手接口
    // ----------------------------------------
    
    // 模拟库存返回
    if (req.url.includes('inventory')) {
      const mockData = (skus || []).map(sku => ({
        sku: sku,
        product_sku: sku, // 兼容秒手
        productName: \`[Proxy] \${sku}\`,
        cn_name: \`[Proxy] \${sku}\`,
        fbaStock: Math.floor(Math.random() * 200) + 20,
        stock_quantity: Math.floor(Math.random() * 200) + 20,
        localStock: 0
      }));
      // 模拟一个新品
      mockData.push({
          sku: "PROXY-NEW-001", product_sku: "PROXY-NEW-001",
          productName: "代理服务器发现的新品", cn_name: "代理服务器发现的新品",
          fbaStock: 999, stock_quantity: 999, localStock: 0
      });
      return res.status(200).json(mockData);
    }

    // 模拟销量返回
    if (req.url.includes('sales')) {
      const mockData = (skus || []).map(sku => ({
        sku: sku, product_sku: sku,
        avgDailySales: (Math.random() * 10).toFixed(1),
        avg_sales_30d: (Math.random() * 10).toFixed(1)
      }));
      return res.status(200).json(mockData);
    }

    res.status(404).json({ error: "Unknown endpoint" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}`;

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
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Auto Sync Settings
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60);

  const [showSecret, setShowSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showProxySetup, setShowProxySetup] = useState(false); // NEW: Show code guide
  const [apiResults, setApiResults] = useState<SyncItem[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'real' | 'simulated' | null>(null);

  // Load Config
  useEffect(() => {
      if (isOpen) {
          loadConfig(platform);
          setPasteData('');
          setApiResults([]);
          setIsApiLoading(false);
          setShowGuide(false);
          setShowProxySetup(false);
          setConnectionMode(null);
          setProxyStatus('idle');
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

  const downloadFile = (filename: string, content: string) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- Auto-Detect Proxy URL Logic ---
  const handleTestConnection = async () => {
      if (!proxyUrl) return;
      setIsTestingProxy(true);
      setProxyStatus('idle');

      let cleanUrl = proxyUrl.trim().replace(/\/$/, "");
      
      // Attempt 1: Try URL as provided
      try {
          const res = await fetch(cleanUrl);
          const json = await res.json();
          if (json.status === 'ok') {
              setProxyStatus('success');
              setIsTestingProxy(false);
              alert("✅ 连接成功！代理服务器正常运行。");
              return;
          }
      } catch (e) {
          // Ignore, try next
      }

      // Attempt 2: Try appending /api/proxy (Common mistake: user inputs root URL but file is in api/proxy.js and no rewrite)
      try {
          const altUrl = `${cleanUrl}/api/proxy`;
          const res = await fetch(altUrl);
          const json = await res.json();
          if (json.status === 'ok') {
              setProxyStatus('success');
              setProxyUrl(altUrl); // AUTO FIX THE URL
              setIsTestingProxy(false);
              alert(`✅ 连接成功！\n\n注意：您的代理服务位于 ${altUrl}。\n系统已自动为您修正了链接。`);
              return;
          }
      } catch (e) {
          // Ignore
      }

      setProxyStatus('error');
      setIsTestingProxy(false);
      alert("❌ 连接失败 (404/500)。\n\n请检查：\n1. Vercel 部署是否成功（三个绿勾）。\n2. 点击右上方「如何搭建」核对 api 文件夹结构。");
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

  // --- Logic 2: API Fetch ---
  const handleApiSync = async (forceSimulation = false) => {
    saveConfig(); 
    setIsApiLoading(true);
    setApiResults([]);
    setConnectionMode(null);
    
    // Explicitly set mode
    const isRealMode = !forceSimulation && !!(proxyUrl && proxyUrl.startsWith('http'));
    setConnectionMode(isRealMode ? 'real' : 'simulated');

    try {
        // Validation for Real Mode
        if (isRealMode) {
            if (!field1 || !field2) {
                alert("真实连接模式下，App ID 和 Token 不能为空。");
                setIsApiLoading(false);
                return;
            }
        }

        let fetchedItems: SyncItem[] = [];
        const effectiveProxyUrl = forceSimulation ? undefined : proxyUrl;

        if (platform === 'lingxing') {
            if (syncType === 'inventory') {
                const data = await fetchLingxingInventory(field1, field2, records, effectiveProxyUrl);
                fetchedItems = data.map(item => {
                    const match = records.find(r => (r.sku || '').trim().toLowerCase() === (item.sku || '').trim().toLowerCase());
                    return {
                        sku: match ? match.sku : item.sku, 
                        name: item.productName || match?.productName || item.sku,
                        oldVal: match ? match.quantity : 0,
                        newVal: item.fbaStock,
                        status: match ? 'match' : 'new'
                    };
                });
            } else {
                const data = await fetchLingxingSales(field1, field2, records, 30, effectiveProxyUrl);
                fetchedItems = data.map(item => {
                    const match = records.find(r => (r.sku || '').trim().toLowerCase() === (item.sku || '').trim().toLowerCase());
                    return {
                        sku: match ? match.sku : item.sku,
                        name: match?.productName || item.sku,
                        oldVal: match ? match.dailySales : 0,
                        newVal: item.avgDailySales,
                        status: match ? 'match' : 'new'
                    };
                });
            }
        } else {
            // Miaoshou Logic
            if (syncType === 'inventory') {
                const data = await fetchMiaoshouInventory(field1, field2, records, effectiveProxyUrl);
                fetchedItems = data.map(item => {
                    const match = records.find(r => (r.sku || '').trim().toLowerCase() === (item.product_sku || '').trim().toLowerCase());
                    return {
                        sku: match ? match.sku : item.product_sku,
                        name: item.cn_name || match?.productName || item.product_sku,
                        oldVal: match ? match.quantity : 0,
                        newVal: item.stock_quantity,
                        status: match ? 'match' : 'new'
                    };
                });
            } else {
                const data = await fetchMiaoshouSales(field1, field2, records, 30, effectiveProxyUrl);
                fetchedItems = data.map(item => {
                    const match = records.find(r => (r.sku || '').trim().toLowerCase() === (item.product_sku || '').trim().toLowerCase());
                    return {
                        sku: match ? match.sku : item.product_sku,
                        name: match?.productName || item.product_sku,
                        oldVal: match ? match.dailySales : 0,
                        newVal: item.avg_sales_30d,
                        status: match ? 'match' : 'new'
                    };
                });
            }
        }
        
        setApiResults(fetchedItems);
        
        if (isRealMode && fetchedItems.length === 0) {
            const retrySim = window.confirm("API 连接成功但未返回任何数据。\n可能是权限问题或没有对应 SKU。\n\n是否切换到「模拟数据模式」来体验功能？");
            if (retrySim) {
                handleApiSync(true); 
                return;
            }
        }

    } catch (e: any) {
        console.error(e);
        const retrySim = window.confirm(`连接失败: ${e.message}\n\n是否切换到「模拟数据模式」来演示？`);
        if (retrySim) {
            handleApiSync(true);
        }
    } finally {
        setIsApiLoading(false);
    }
  };

  const displayItems = activeTab === 'import' ? parsedPasteItems : apiResults;

  if (!isOpen) return null;

  const handleApply = () => {
      saveConfig();
      
      const changesMap = new Map<string, SyncItem>();
      const newRecords: ReplenishmentRecord[] = [];
      let updateCount = 0;
      let createCount = 0;

      displayItems.forEach(item => {
          if (!item.sku) return; 
          const key = item.sku.trim().toLowerCase();
          
          if (item.status === 'match') {
              changesMap.set(key, item);
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

      const updatedRecords = records.map(record => {
          const sku = record.sku ? record.sku.trim().toLowerCase() : '';
          const change = changesMap.get(sku);
          
          if (change) {
              updateCount++;
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

      const finalRecords = [...newRecords, ...updatedRecords];
      onUpdateRecords(finalRecords);
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

  const isRealApiReady = !!(field1 && field2 && proxyUrl && proxyUrl.startsWith('http'));

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

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white relative">
            
            {/* --- Proxy Setup Guide Overlay --- */}
            {showProxySetup && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-fade-in">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-2 text-slate-800">
                            <Terminal size={18} />
                            <h3 className="font-bold text-sm">Vercel 代理服务部署指南 (解决 404 问题)</h3>
                        </div>
                        <button onClick={() => setShowProxySetup(false)} className="text-gray-500 hover:text-gray-800">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                            <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
                            <div>
                                <h4 className="text-sm font-bold text-red-800">为什么我会看到 404 错误？</h4>
                                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                                    Vercel 404 页面表示服务器没有找到该函数。<strong>99% 的原因是文件结构错误。</strong>
                                    <br/>
                                    Vercel Serverless Function 必须放在名为 <code className="bg-red-100 px-1 rounded">api</code> 的文件夹中。
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Folder size={16} className="text-yellow-500" /> 正确的项目结构
                            </h4>
                            <div className="bg-slate-900 text-white p-4 rounded-xl font-mono text-xs leading-6">
                                <div className="flex items-center gap-2 text-slate-400"><Folder size={14}/> tanxing-proxy (根文件夹)</div>
                                <div className="flex items-center gap-2 ml-4">├── <FileCode size={14} className="text-green-400"/> package.json</div>
                                <div className="flex items-center gap-2 ml-4">├── <FileCode size={14} className="text-yellow-400"/> vercel.json</div>
                                <div className="flex items-center gap-2 ml-4 text-blue-300">└── <Folder size={14} className="text-blue-400"/> api/ <span className="text-red-400 ml-2">(⚠️ 必须新建这个文件夹)</span></div>
                                <div className="flex items-center gap-2 ml-10">└── <FileCode size={14} className="text-blue-200"/> proxy.js <span className="text-gray-500 ml-2">(文件放这里面)</span></div>
                            </div>
                        </div>

                        {/* File 1 */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-700 px-2">
                                <span>1. package.json <span className="text-gray-400">(根目录)</span></span>
                                <button onClick={() => downloadFile('package.json', CODE_PACKAGE)} className="flex items-center gap-1 text-blue-600 hover:underline border border-blue-200 px-2 py-0.5 rounded bg-blue-50"><Download size={12}/> 下载</button>
                            </div>
                            <pre className="bg-gray-100 text-gray-600 p-3 rounded-lg text-[10px] font-mono overflow-x-auto border border-gray-200">{CODE_PACKAGE}</pre>
                        </div>

                        {/* File 2 */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-700 px-2">
                                <span>2. vercel.json <span className="text-gray-400">(根目录)</span></span>
                                <button onClick={() => downloadFile('vercel.json', CODE_VERCEL)} className="flex items-center gap-1 text-blue-600 hover:underline border border-blue-200 px-2 py-0.5 rounded bg-blue-50"><Download size={12}/> 下载</button>
                            </div>
                            <pre className="bg-gray-100 text-gray-600 p-3 rounded-lg text-[10px] font-mono overflow-x-auto border border-gray-200">{CODE_VERCEL}</pre>
                        </div>

                        {/* File 3 */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-700 px-2">
                                <span>3. proxy.js <span className="text-red-600 font-bold bg-red-50 px-1 rounded">(必须放入 api 文件夹内!)</span></span>
                                <button onClick={() => downloadFile('proxy.js', CODE_PROXY)} className="flex items-center gap-1 text-blue-600 hover:underline border border-blue-200 px-2 py-0.5 rounded bg-blue-50"><Download size={12}/> 下载</button>
                            </div>
                            <pre className="bg-gray-100 text-gray-600 p-3 rounded-lg text-[10px] font-mono overflow-x-auto h-32 custom-scrollbar border border-gray-200">{CODE_PROXY}</pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Panel */}
            <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col p-5 bg-gray-50 overflow-y-auto">
                
                {/* 1. Mode Selection */}
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
                             {/* Creds Inputs */}
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">{isLingxing ? 'App ID' : 'App Key'}</label>
                                 <div className="relative">
                                     <Lock className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                     <input type="text" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 outline-none" placeholder={isLingxing ? "Enter App ID" : "Enter App Key"} value={field1} onChange={e => setField1(e.target.value)} />
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">{isLingxing ? 'Access Token' : 'App Secret'}</label>
                                 <div className="relative">
                                     <Key className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                     <input type={showSecret ? "text" : "password"} className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 outline-none" placeholder={isLingxing ? "Enter Access Token" : "Enter App Secret"} value={field2} onChange={e => setField2(e.target.value)} />
                                     <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                         {showSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
                                     </button>
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 flex justify-between items-center">
                                     <span>代理服务器 (Proxy) <span className="text-red-500">*</span></span>
                                     <button onClick={() => setShowProxySetup(true)} className="text-blue-600 hover:underline flex items-center gap-1"><Code size={10}/> 如何搭建?</button>
                                 </label>
                                 <div className="relative flex items-center gap-2">
                                     <div className="relative flex-1">
                                        <Globe className={`absolute left-3 top-2.5 ${proxyStatus === 'success' ? 'text-green-500' : proxyStatus === 'error' ? 'text-red-500' : 'text-gray-400'}`} size={14} />
                                        <input 
                                            type="text" 
                                            className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:ring-2 outline-none transition-all ${proxyStatus === 'success' ? 'border-green-300 focus:ring-green-100 bg-green-50 text-green-700' : proxyStatus === 'error' ? 'border-red-300 focus:ring-red-100 bg-red-50 text-red-700' : 'border-gray-300'}`}
                                            placeholder="https://your-app.vercel.app" 
                                            value={proxyUrl} 
                                            onChange={e => { setProxyUrl(e.target.value); setProxyStatus('idle'); }}
                                        />
                                     </div>
                                     <button 
                                        onClick={handleTestConnection}
                                        disabled={isTestingProxy || !proxyUrl}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg border border-gray-300 transition-colors disabled:opacity-50"
                                        title="自动检测并修复链接"
                                    >
                                        {isTestingProxy ? <RefreshCw className="animate-spin" size={16}/> : <Search size={16}/>}
                                    </button>
                                 </div>
                                 {proxyStatus === 'success' && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><Check size={10}/> 连接成功</p>}
                             </div>

                             {/* Split Action Buttons */}
                             <div className="pt-2 grid grid-cols-1 gap-3">
                                 {/* 1. Real Connect */}
                                 <button 
                                    onClick={() => handleApiSync(false)}
                                    disabled={isApiLoading || !isRealApiReady}
                                    className={`w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                                        !isRealApiReady 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                        : `${brandColor} ${brandColorHover} text-white`
                                    }`}
                                 >
                                     {isApiLoading && connectionMode === 'real' ? <RefreshCw className="animate-spin" size={16} /> : <LinkIcon size={16} />}
                                     {isApiLoading && connectionMode === 'real' ? '正在连接...' : `连接真实 ${isLingxing ? 'Lingxing' : 'Miaoshou'}`}
                                 </button>
                                 
                                 {/* 2. Simulation */}
                                 <button 
                                    onClick={() => handleApiSync(true)}
                                    disabled={isApiLoading && connectionMode === 'real'}
                                    className="w-full py-3 rounded-xl font-bold text-sm border-2 border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-200 transition-all flex items-center justify-center gap-2"
                                 >
                                     {isApiLoading && connectionMode === 'simulated' ? <RefreshCw className="animate-spin" size={16} /> : <PlayCircle size={16} />}
                                     使用模拟数据演示 (无需代理)
                                 </button>
                             </div>
                             
                             {!isRealApiReady && (
                                 <div className="text-[10px] text-red-500 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2">
                                     <ServerOff size={14} />
                                     未配置代理 URL，无法进行真实连接。请使用模拟演示。
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Preview & Action */}
            <div className="flex-1 flex flex-col p-0 overflow-hidden relative">
                <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <h3 className={`font-bold text-gray-800 flex items-center gap-2 ${typeColor}`}>
                            <FileText size={18}/> 
                            {activeTab === 'api' ? 'API 返回结果' : '识别预览'} 
                        </h3>
                        {connectionMode === 'simulated' && (
                            <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-bold border border-purple-200 animate-pulse">
                                模拟数据模式
                            </span>
                        )}
                        {connectionMode === 'real' && (
                            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded font-bold border border-green-200 flex items-center gap-1">
                                <Wifi size={10} /> 真实连接
                            </span>
                        )}
                    </div>
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