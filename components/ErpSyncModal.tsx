
import React, { useState, useEffect, useMemo } from 'react';
import { ReplenishmentRecord } from '../types';
import { X, Check, Database, Link as LinkIcon, Lock, ClipboardPaste, FileText, Save, ArrowRight, PlusCircle, AlertTriangle } from 'lucide-react';

interface ErpSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
  onUpdateRecords: (updatedRecords: ReplenishmentRecord[]) => void;
}

type SyncType = 'inventory' | 'sales';

export const ErpSyncModal: React.FC<ErpSyncModalProps> = ({ isOpen, onClose, records, onUpdateRecords }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'api'>('import');
  const [syncType, setSyncType] = useState<SyncType>('inventory');
  
  // Import State
  const [pasteData, setPasteData] = useState('');

  // API State
  const [appId, setAppId] = useState(() => localStorage.getItem('lx_app_id') || '');
  const [token, setToken] = useState(() => localStorage.getItem('lx_token') || ''); 
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem('lx_proxy_url') || ''); 

  // Persist API config
  useEffect(() => { localStorage.setItem('lx_app_id', appId); }, [appId]);
  useEffect(() => { localStorage.setItem('lx_token', token); }, [token]);
  useEffect(() => { localStorage.setItem('lx_proxy_url', proxyUrl); }, [proxyUrl]);

  // --- Core Logic: Parse Paste Data (Refactored to useMemo) ---
  const parsedItems = useMemo(() => {
      if (!pasteData.trim()) {
          return [];
      }

      const lines = pasteData.trim().split('\n');
      const results: {sku: string, oldVal: number, newVal: number, name: string, status: 'match' | 'new' | 'error'}[] = [];

      lines.forEach(line => {
          // Normalize line: replace tabs/commas with spaces, remove extra spaces
          const cleanLine = line.replace(/,/g, '').replace(/\t/g, ' ').trim();
          if (!cleanLine) return;

          // Split by space
          const parts = cleanLine.split(/\s+/);
          
          // Intelligent Parsing Logic:
          // Pattern 1: SKU Quantity (Length 2) -> "MA-001 100"
          // Pattern 2: SKU Name Name Name Quantity (Length > 2) -> "MA-001 Mad Acid Gel 100"
          
          if (parts.length >= 2) {
              // Try to find the number part (quantity). Usually the last item.
              let qtyIndex = -1;
              let newVal = 0;

              // Check if the last item is a number
              const lastItem = parseFloat(parts[parts.length - 1]);
              if (!isNaN(lastItem)) {
                  qtyIndex = parts.length - 1;
                  newVal = lastItem;
              } else {
                  // Fallback: try to find any number in the line (risky but helpful)
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
                  
                  // Extract Name: Everything between SKU and Quantity
                  let extractedName = '';
                  if (qtyIndex > 1) {
                      extractedName = parts.slice(1, qtyIndex).join(' ');
                  } else {
                      // If just SKU + Qty, use SKU as temp name
                      extractedName = rawSku;
                  }

                  // Find matching record
                  const match = records.find(r => 
                      (r.sku || '').toLowerCase().trim() === rawSku.toLowerCase().trim() ||
                      (r.productName || '').toLowerCase().includes(rawSku.toLowerCase()) // Fallback loose match
                  );

                  if (match) {
                      results.push({
                          sku: match.sku, // Use matched system SKU
                          name: match.productName,
                          oldVal: syncType === 'inventory' ? match.quantity : match.dailySales,
                          newVal: newVal,
                          status: 'match'
                      });
                  } else {
                      // Unmatched -> Mark as 'new' for potential creation
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

  // Conditional return moved AFTER hooks
  if (!isOpen) return null;

  const handleApply = () => {
      const updates = [...records];
      const newRecords: ReplenishmentRecord[] = [];
      let updateCount = 0;
      let createCount = 0;

      parsedItems.forEach(item => {
          if (item.status === 'match') {
              // Update existing
              const recordIndex = updates.findIndex(r => r.sku === item.sku);
              if (recordIndex !== -1) {
                  if (syncType === 'inventory') {
                      updates[recordIndex].quantity = item.newVal;
                      // Update cartons logic roughly
                      const perBox = updates[recordIndex].itemsPerBox || 1;
                      updates[recordIndex].totalCartons = Math.ceil(item.newVal / perBox);
                  } else {
                      updates[recordIndex].dailySales = item.newVal;
                  }
                  updateCount++;
              }
          } else if (item.status === 'new') {
              // Create new record
              const newRecord: ReplenishmentRecord = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  date: new Date().toISOString().split('T')[0],
                  sku: item.sku,
                  productName: item.name || item.sku, // Fallback name
                  quantity: syncType === 'inventory' ? item.newVal : 0,
                  dailySales: syncType === 'sales' ? item.newVal : 0,
                  status: 'Planning',
                  lifecycle: 'New',
                  
                  // Defaults that need filling later
                  unitPriceCNY: 0,
                  unitWeightKg: 0,
                  boxLengthCm: 0,
                  boxWidthCm: 0,
                  boxHeightCm: 0,
                  itemsPerBox: 1,
                  totalCartons: Math.ceil(item.newVal),
                  shippingMethod: 'Air',
                  shippingUnitPriceCNY: 0,
                  materialCostCNY: 0,
                  customsFeeCNY: 0,
                  portFeeCNY: 0,
                  salesPriceUSD: 0,
                  lastMileCostUSD: 0,
                  adCostUSD: 0,
                  platformFeeRate: 2,
                  affiliateCommissionRate: 0,
                  additionalFixedFeeUSD: 0,
                  returnRate: 0,
                  warehouse: 'Default Warehouse',
              };
              newRecords.push(newRecord);
              createCount++;
          }
      });

      // Merge arrays
      const finalRecords = [...newRecords, ...updates];
      onUpdateRecords(finalRecords);

      let msg = '';
      if (updateCount > 0) msg += `更新了 ${updateCount} 个现有产品。`;
      if (createCount > 0) msg += ` 新建了 ${createCount} 个产品档案。`;
      alert(msg || "没有产生任何变化");
      
      onClose();
      setPasteData('');
  };

  const handleClear = () => {
      setPasteData('');
  };

  const matchCount = parsedItems.filter(i => i.status === 'match').length;
  const newCount = parsedItems.filter(i => i.status === 'new').length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg"><Database size={24} className="text-white" /></div>
                <div>
                    <h2 className="text-xl font-bold">批量数据处理 (Import & Update)</h2>
                    <p className="text-slate-400 text-xs">自动匹配现有商品，自动创建新商品</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={24} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
            <button 
                onClick={() => setActiveTab('import')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'import' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <ClipboardPaste size={18} /> Excel 粘贴导入 (推荐)
            </button>
            <button 
                onClick={() => setActiveTab('api')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'api' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                <LinkIcon size={18} /> 领星 API 对接 (高级)
            </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
            
            {activeTab === 'import' && (
                <div className="flex-1 flex flex-col md:flex-row h-full">
                    {/* Left: Input Area */}
                    <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col p-4 bg-gray-50">
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. 数据类型</label>
                            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                                <button onClick={() => setSyncType('inventory')} className={`flex-1 py-2 text-xs font-bold rounded ${syncType === 'inventory' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>库存数量</button>
                                <button onClick={() => setSyncType('sales')} className={`flex-1 py-2 text-xs font-bold rounded ${syncType === 'sales' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>日均销量</button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. 粘贴数据</label>
                            <div className="mb-2 text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100">
                                支持格式：<br/>
                                <span className="font-mono text-gray-600">SKU 数量</span> (如: A01 100)<br/>
                                <span className="font-mono text-gray-600">SKU 名称 数量</span> (如: A01 手机壳 100)
                            </div>
                            <textarea 
                                className="flex-1 w-full p-3 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-inner"
                                placeholder={`在此粘贴 Excel 列...\n\nMA-001  150\nCP-Q1M  20\nNEW-001 新产品名称 50`}
                                value={pasteData}
                                onChange={e => setPasteData(e.target.value)}
                            ></textarea>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-gray-400">已识别 {parsedItems.length} 行</span>
                                <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500">清空</button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Preview Area */}
                    <div className="flex-1 flex flex-col p-0 overflow-hidden">
                        <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <FileText size={18} className="text-blue-500"/> 识别结果
                            </h3>
                            <div className="text-xs space-x-3 flex">
                                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">匹配: {matchCount}</span>
                                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">新增: {newCount}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50">
                            {parsedItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                    <ClipboardPaste size={48} className="mb-2" />
                                    <p className="text-sm">请在左侧粘贴数据以预览结果</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {parsedItems.map((item, idx) => (
                                        <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${item.status === 'match' ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${item.status === 'match' ? 'bg-green-100 text-green-700' : 'bg-blue-200 text-blue-700'}`}>
                                                    {item.status === 'match' ? <Check size={14}/> : <PlusCircle size={14}/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-800 text-sm">{item.sku}</span>
                                                        {item.status === 'new' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded font-bold">新建档案</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[200px]" title={item.name}>{item.name}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {item.status === 'match' && (
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-gray-400">原值</div>
                                                        <div className="text-sm font-mono text-gray-500">{item.oldVal}</div>
                                                    </div>
                                                )}
                                                {item.status === 'match' && <ArrowRight size={14} className="text-gray-300" />}
                                                <div className="text-right">
                                                    <div className="text-[10px] text-blue-500 font-bold">{item.status === 'new' ? '初始值' : '新值'}</div>
                                                    <div className="text-lg font-mono font-bold text-blue-600">{item.newVal}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div className="p-4 bg-white border-t border-gray-200">
                             {newCount > 0 && (
                                 <div className="mb-3 flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded-lg text-xs">
                                     <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                     <div>
                                         <strong>将创建 {newCount} 个新产品档案。</strong>
                                         <p className="opacity-80 mt-1">创建后，请记得在列表中完善产品的重量、尺寸和成本信息，否则利润计算不准确。</p>
                                     </div>
                                 </div>
                             )}
                             
                             <button 
                                onClick={handleApply}
                                disabled={parsedItems.length === 0}
                                className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                                    parsedItems.length === 0 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                             >
                                 <Save size={18} />
                                 {matchCount > 0 && newCount === 0 && `更新 ${matchCount} 条数据`}
                                 {matchCount === 0 && newCount > 0 && `一键创建 ${newCount} 个新产品`}
                                 {matchCount > 0 && newCount > 0 && `更新 ${matchCount} 条并创建 ${newCount} 条`}
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'api' && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                    <div className="bg-orange-50 p-4 rounded-full">
                        <Lock size={48} className="text-orange-400" />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h3 className="text-xl font-bold text-gray-800">为什么无法直接同步？</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            领星 (Lingxing) 的 API 接口出于安全考虑，禁止浏览器直接访问 (CORS 限制)。
                            要实现全自动同步，您需要搭建一个后端代理服务器。
                        </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl text-left w-full max-w-md border border-gray-200">
                        <h4 className="font-bold text-sm text-gray-700 mb-2">解决方案：</h4>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                            <li>使用上方的 <strong>“Excel 粘贴导入”</strong> 功能 (最快，推荐)。</li>
                            <li>如果您有技术团队，请部署一个 Nginx 反向代理，并将地址填入下方。</li>
                        </ul>
                    </div>

                    <div className="w-full max-w-md">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 text-left">代理服务器地址 (Proxy URL)</label>
                        <input 
                            type="text" 
                            value={proxyUrl}
                            onChange={e => setProxyUrl(e.target.value)}
                            placeholder="https://api.your-company.com/lx-proxy"
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                        />
                        <button className="w-full mt-3 bg-gray-200 text-gray-500 font-bold py-3 rounded-lg cursor-not-allowed" disabled>
                            检测连接 (暂不可用)
                        </button>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
