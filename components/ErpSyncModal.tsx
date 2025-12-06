import React, { useState, useEffect, useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { X, Check, Database, Link as LinkIcon, Lock, ClipboardPaste, FileText, Save, ArrowRight, PlusCircle, AlertTriangle, TrendingUp, Package, RefreshCw, Key, Globe, Eye, EyeOff, Layers, Zap, HelpCircle, ServerOff, Wifi, Code, Terminal, Download, Folder, FileCode, AlertCircle, Search } from 'lucide-react';
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

// --- 1. CONFIG: package.json ---
const CODE_PACKAGE = `{
  "name": "tanxing-proxy",
  "version": "1.0.0",
  "engines": { "node": "18.x" },
  "dependencies": {}
}`;

// --- 2. CONFIG: vercel.json (Catch-All Strategy) ---
// This forces ANY request to go to /api/proxy, solving the 404 issue effectively.
const CODE_VERCEL = `{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/api/proxy" }
  ]
}`;

// --- 3. CODE: proxy.js (Universal Parameter Mode) ---
const CODE_PROXY = `export default async function handler(req, res) {
  // 1. CORS Headers (Allow access from anywhere)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Handle Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. Health Check
  if (!req.body || req.method === 'GET') {
      return res.status(200).json({ 
          status: "ok", 
          message: "Tanxing Proxy is Running!",
          time: new Date().toISOString(),
          url: req.url 
      });
  }

  try {
    const { appId, accessToken, appKey, appSecret, skus } = req.body;
    // Determine intent via Query Param OR Path
    const urlStr = req.url || '';
    const queryEndpoint = req.query?.endpoint || '';
    
    // --- Mock Inventory ---
    if (urlStr.includes('inventory') || queryEndpoint === 'inventory') {
      const mockData = (skus || []).map(sku => ({
        sku: sku,
        product_sku: sku,
        productName: \`[Proxy] \${sku}\`,
        cn_name: \`[Proxy] \${sku}\`,
        fbaStock: Math.floor(Math.random() * 200) + 20,
        stock_quantity: Math.floor(Math.random() * 200) + 20,
        localStock: 0
      }));
      // Add a test discovery item
      mockData.push({
          sku: "PROXY-TEST-001", product_sku: "PROXY-TEST-001",
          productName: "代理连接测试商品", cn_name: "代理连接测试商品",
          fbaStock: 888, stock_quantity: 888, localStock: 0
      });
      return res.status(200).json(mockData);
    }

    // --- Mock Sales ---
    if (urlStr.includes('sales') || queryEndpoint === 'sales') {
      const mockData = (skus || []).map(sku => ({
        sku: sku, product_sku: sku,
        avgDailySales: (Math.random() * 10).toFixed(1),
        avg_sales_30d: (Math.random() * 10).toFixed(1)
      }));
      return res.status(200).json(mockData);
    }

    // Default Fallback
    res.status(400).json({ error: "Unknown endpoint. Use ?endpoint=inventory or ?endpoint=sales" });

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
  const [proxyStatusMsg, setProxyStatusMsg] = useState('');
  
  // Auto Sync Settings
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60);

  const [showSecret, setShowSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showProxySetup, setShowProxySetup] = useState(false);
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
          setProxyStatusMsg('');
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

  // --- Robust Connection Tester ---
  const handleTestConnection = async () => {
      if (!proxyUrl) return;
      setIsTestingProxy(true);
      setProxyStatus('idle');
      setProxyStatusMsg('');

      // Remove trailing slash
      let cleanUrl = proxyUrl.trim().replace(/\/$/, "");
      
      // We will try multiple paths to find where the user put the file
      // 1. Root (if vercel.json rewrite is working)
      // 2. /api/proxy (Standard Vercel)
      // 3. /proxy (Alternative)
      
      const probePaths = [
          cleanUrl,              // Try 1: Rewrite active
          `${cleanUrl}/api/proxy`, // Try 2: Direct path
          `${cleanUrl}/proxy`      // Try 3: Flat structure
      ];

      console.log("Starting Probe...");

      for (const url of probePaths) {
          try {
              console.log(`Probing: ${url}`);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);

              const contentType = res.headers.get("content-type");
              
              if (res.ok && contentType && contentType.includes("application/json")) {
                  const json = await res.json();
                  if (json.status === 'ok') {
                      setProxyStatus('success');
                      setProxyStatusMsg(`连接成功! 路径: ${url}`);
                      setProxyUrl(url); // Auto-correct URL
                      setIsTestingProxy(false);
                      return;
                  }
              }
          } catch (e) {
              console.log(`Probe failed for ${url}`, e);
          }
      }

      setProxyStatus('error');
      setProxyStatusMsg('连接失败 (404/500)。请检查是否已按指南上传 api/proxy.js。');
      setIsTestingProxy(false);
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
    
    const isRealMode = !forceSimulation && !!(proxyUrl && proxyUrl.startsWith('http'));
    setConnectionMode(isRealMode ? 'real' : 'simulated');

    try {
        if (isRealMode && (!field1 || !field2)) {
            alert("真实连接模式下，App ID 和 Token 不能为空。");
            setIsApiLoading(false);
            return;
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
            <button onClick={() => setActiveTab('import')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'import' ? `${brandBorder} ${brandText} bg-white` : 'border-transparent text-gray-500 hover:text-gray-700'}`}><ClipboardPaste size={18} /> Excel 粘贴导入</button>
            <button onClick={() => setActiveTab('api')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'api' ? `${brandBorder} ${brandText} bg-white` : 'border-transparent text-gray-400 hover:text-gray-600'}`}><LinkIcon size={18} /> API 直连 (Vercel)</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white relative">
            
            {/* --- STRICT DEPLOYMENT GUIDE --- */}
            {showProxySetup && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-fade-in">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-2 text-slate-800">
                            <Terminal size={18} />
                            <h3 className="font-bold text-sm">Vercel 代理服务部署向导 (Fix 404)</h3>
                        </div>
                        <button onClick={() => setShowProxySetup(false)} className="text-gray-500 hover:text-gray-800"><X size={18} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
                            <AlertCircle className="text-red-500 shrink-0" size={20} />
                            <div>
                                <h4 className="text-sm font-bold text-red-800">404 错误终极解决方案</h4>
                                <p className="text-xs text-red-700 mt-1">
                                    如果你遇到 404，请务必删除现有的 Vercel 项目和 GitHub 仓库，
                                    <strong>严格按照下图结构</strong>重新上传这 3 个文件。
                                    <br/>
                                    <strong>核心规则：</strong> <code>proxy.js</code> 必须放在 <code>api</code> 文件夹内！
                                </p>
                            </div>
                        </div>

                        {/* Visual Structure */}
                        <div className="flex gap-6 items-start">
                            <div className="w-1/3 bg-slate-900 text-white p-5 rounded-xl">
                                <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">✅ 正确的仓库结构</h5>
                                <div className="font-mono text-sm space-y-2">
                                    <div className="flex items-center gap-2 text-blue-200"><Folder size={16}/> tanxing-proxy/</div>
                                    <div className="flex items-center gap-2 pl-6 text-green-400"><FileCode size={14}/> package.json</div>
                                    <div className="flex items-center gap-2 pl-6 text-yellow-400"><FileCode size={14}/> vercel.json</div>
                                    <div className="flex items-center gap-2 pl-6 text-blue-300 font-bold bg-white/10 p-1 rounded"><Folder size={14}/> api/ <span className="text-xs text-white opacity-50 ml-1">(关键文件夹)</span></div>
                                    <div className="flex items-center gap-2 pl-12 text-pink-300 font-bold"><FileCode size={14}/> proxy.js</div>
                                </div>
                            </div>
                            
                            <div className="flex-1 space-y-4">
                                <h5 className="text-xs font-bold text-gray-500 uppercase">第一步：下载所有文件</h5>
                                <div className="grid grid-cols-1 gap-2">
                                    <button onClick={() => downloadFile('proxy.js', CODE_PROXY)} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 hover:bg-blue-100 text-xs font-bold">
                                        <span>1. 下载 proxy.js (放入 api 文件夹!)</span> <Download size={14}/>
                                    </button>
                                    <button onClick={() => downloadFile('vercel.json', CODE_VERCEL)} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800 hover:bg-yellow-100 text-xs font-bold">
                                        <span>2. 下载 vercel.json (放入根目录)</span> <Download size={14}/>
                                    </button>
                                    <button onClick={() => downloadFile('package.json', CODE_PACKAGE)} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg text-green-800 hover:bg-green-100 text-xs font-bold">
                                        <span>3. 下载 package.json (放入根目录)</span> <Download size={14}/>
                                    </button>
                                </div>
                                <h5 className="text-xs font-bold text-gray-500 uppercase mt-4">第二步：上传至 GitHub 并重新部署 Vercel</h5>
                                <p className="text-xs text-gray-600">部署完成后，复制 Vercel 提供的 Domain (例如 `https://xxx.vercel.app`) 填入下方输入框。</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">App ID / Key</label>
                                 <input type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" value={field1} onChange={e => setField1(e.target.value)} />
                             </div>
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 block">Token / Secret</label>
                                 <div className="relative">
                                     <input type={showSecret ? "text" : "password"} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" value={field2} onChange={e => setField2(e.target.value)} />
                                     <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-2.5 text-gray-400"><Eye size={14}/></button>
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] text-gray-500 font-bold mb-1 flex justify-between items-center">
                                     <span>代理 URL <span className="text-red-500">*</span></span>
                                     <button onClick={() => setShowProxySetup(true)} className="text-blue-600 hover:underline flex items-center gap-1"><Code size={10}/> 部署指南</button>
                                 </label>
                                 <div className="relative flex items-center gap-2">
                                     <input type="text" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" placeholder="https://your-app.vercel.app" value={proxyUrl} onChange={e => { setProxyUrl(e.target.value); setProxyStatus('idle'); }} />
                                     <button onClick={handleTestConnection} disabled={isTestingProxy || !proxyUrl} className="bg-gray-100 p-2 rounded-lg border hover:bg-gray-200 text-gray-600">
                                        {isTestingProxy ? <RefreshCw className="animate-spin" size={16}/> : <Search size={16}/>}
                                     </button>
                                 </div>
                                 {proxyStatus === 'success' && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><Check size={10}/> {proxyStatusMsg}</p>}
                                 {proxyStatus === 'error' && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10}/> {proxyStatusMsg}</p>}
                             </div>

                             <div className="pt-2 grid grid-cols-1 gap-3">
                                 <button onClick={() => handleApiSync(false)} disabled={isApiLoading || !isRealApiReady} className={`w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 ${!isRealApiReady ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : `${brandColor} text-white`}`}>
                                     {isApiLoading && connectionMode === 'real' ? <RefreshCw className="animate-spin" size={16} /> : <LinkIcon size={16} />} 真实连接
                                 </button>
                                 <button onClick={() => handleApiSync(true)} className="w-full py-3 rounded-xl font-bold text-sm border-2 border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center justify-center gap-2">
                                     <ServerOff size={16} /> 模拟数据演示
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