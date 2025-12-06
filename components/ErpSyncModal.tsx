
import React, { useState } from 'react';
import { ReplenishmentRecord } from '../types';
import { fetchLingxingInventory, fetchLingxingSales, calculateInventoryDiff, calculateSalesDiff } from '../services/lingxingService';
import { X, RefreshCw, ArrowRight, Check, AlertCircle, Database, Link as LinkIcon, Lock, TrendingUp, Package } from 'lucide-react';

interface ErpSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
  onUpdateRecords: (updatedRecords: ReplenishmentRecord[]) => void;
}

type SyncType = 'inventory' | 'sales';

export const ErpSyncModal: React.FC<ErpSyncModalProps> = ({ isOpen, onClose, records, onUpdateRecords }) => {
  const [step, setStep] = useState<'config' | 'result'>('config');
  const [syncType, setSyncType] = useState<SyncType>('inventory');
  
  // Config State
  const [appId, setAppId] = useState('lx_demo_app_id');
  const [token, setToken] = useState('lx_demo_token_123'); 
  const [proxyUrl, setProxyUrl] = useState(''); // Optional proxy for real calls
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Diff State
  const [diffs, setDiffs] = useState<{
        recordId: string; 
        sku: string; 
        productName: string;
        localVal: number; 
        erpVal: number; 
        diff: number 
    }[]>([]);
  const [selectedDiffIds, setSelectedDiffIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleConnect = async () => {
      setIsLoading(true);
      try {
          let calculatedDiffs: typeof diffs = [];

          if (syncType === 'inventory') {
              const erpData = await fetchLingxingInventory(appId, token, records, proxyUrl);
              calculatedDiffs = calculateInventoryDiff(records, erpData);
          } else {
              // Sales Sync
              const erpData = await fetchLingxingSales(appId, token, records, 30, proxyUrl);
              calculatedDiffs = calculateSalesDiff(records, erpData);
          }
          
          setDiffs(calculatedDiffs);
          setSelectedDiffIds(new Set(calculatedDiffs.map(d => d.recordId))); // Select all by default
          setStep('result');
      } catch (error: any) {
          alert(`连接领星 OMS 失败: ${error.message}`);
      } finally {
          setIsLoading(false);
      }
  };

  const toggleSelect = (id: string) => {
      const next = new Set(selectedDiffIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedDiffIds(next);
  };

  const handleSyncConfirm = () => {
      // Create a brand new array to ensure React detects the state change
      const updatedRecords = records.map(r => {
          if (selectedDiffIds.has(r.id)) {
              const diffItem = diffs.find(d => d.recordId === r.id);
              if (diffItem) {
                  if (syncType === 'inventory') {
                      const newQty = Number(diffItem.erpVal); // Force Number
                      
                      // Also recalculate totalCartons to keep consistency
                      const safeItemsPerBox = r.itemsPerBox > 0 ? r.itemsPerBox : 1;
                      const newTotalCartons = Math.ceil(newQty / safeItemsPerBox);

                      return { 
                          ...r, 
                          quantity: newQty,
                          totalCartons: newTotalCartons
                      };
                  } else {
                      return { 
                          ...r, 
                          dailySales: Number(diffItem.erpVal) // Force Number
                      };
                  }
              }
          }
          return r;
      });
      
      onUpdateRecords(updatedRecords);
      // alert(`成功同步 ${selectedDiffIds.size} 条${syncType === 'inventory' ? '库存' : '销量'}数据！`);
      onClose();
      setStep('config');
  };

  // Fixed styles for inputs to ensure visibility
  const inputStyle = "w-full p-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm placeholder-gray-400";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col relative max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#1890ff] p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <RefreshCw size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">领星 OMS 数据同步</h2>
                    <p className="text-blue-100 text-xs">Lingxing Open API Integration</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            
            {/* Step 1: Config */}
            {step === 'config' && (
                <div className="space-y-6">
                    {/* Sync Type Tabs */}
                    <div className="flex p-1 bg-gray-200 rounded-xl">
                        <button 
                            onClick={() => setSyncType('inventory')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${syncType === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Package size={18} />
                            FBA 库存同步 (Stock)
                        </button>
                        <button 
                            onClick={() => setSyncType('sales')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${syncType === 'sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <TrendingUp size={18} />
                            30天日均销量 (Sales)
                        </button>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-blue-800">
                            <p className="font-bold mb-1">如何获取密钥？</p>
                            <p className="opacity-90 leading-relaxed">
                                请点击领星 OMS 系统<strong>顶部导航栏</strong>的 <span className="bg-white px-1 rounded font-bold text-blue-700">API信息</span> 按钮。<br/>
                                或者前往：<span className="font-medium">系统设置 {'>'} 开发者对接 {'>'} Open API</span> 查看。
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
                            <Lock size={18} className="text-gray-400"/> 
                            API 授权配置
                        </h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App Key (App ID)</label>
                            <input 
                                type="text" 
                                value={appId} 
                                onChange={e => setAppId(e.target.value)}
                                className={inputStyle}
                                placeholder="在此粘贴领星的 App Key"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App Secret</label>
                            <input 
                                type="password" 
                                value={token} 
                                onChange={e => setToken(e.target.value)}
                                className={inputStyle}
                                placeholder="在此粘贴领星的 App Secret"
                            />
                        </div>
                        
                        {/* Advanced: Proxy Config */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase">私有代理服务地址 (可选 / Advanced)</label>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 rounded">真实对接必填</span>
                            </div>
                            <input 
                                type="text" 
                                value={proxyUrl} 
                                onChange={e => setProxyUrl(e.target.value)}
                                className={`${inputStyle} text-xs font-normal border-dashed bg-gray-50 focus:bg-white`}
                                placeholder="https://api.your-company.com/lingxing-proxy (留空则使用演示数据)"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleConnect}
                        disabled={isLoading}
                        className="w-full bg-[#1890ff] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="animate-spin" size={20} />
                                正在从领星 OMS 拉取数据...
                            </>
                        ) : (
                            <>
                                <LinkIcon size={20} />
                                立即连接并比对差异
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Step 2: Result & Diff */}
            {step === 'result' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">
                                {syncType === 'inventory' ? '库存' : '销量'}差异比对
                            </h3>
                            <p className="text-xs text-gray-400">Syncing: {syncType === 'inventory' ? 'Quantity' : 'Daily Sales'}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                            发现 {diffs.length} 个差异项
                        </span>
                    </div>

                    {diffs.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                            <Check className="mx-auto text-green-500 mb-2" size={40} />
                            <p className="text-gray-600 font-medium">太棒了！本地数据与 OMS 完全一致。</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm text-left relative">
                                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 w-10">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedDiffIds.size === diffs.length}
                                                onChange={() => {
                                                    if(selectedDiffIds.size === diffs.length) setSelectedDiffIds(new Set());
                                                    else setSelectedDiffIds(new Set(diffs.map(d => d.recordId)));
                                                }}
                                            />
                                        </th>
                                        <th className="p-3 font-medium">产品 SKU</th>
                                        <th className="p-3 font-medium text-right">本地{syncType==='inventory'?'库存':'日销'}</th>
                                        <th className="p-3 font-medium text-center"></th>
                                        <th className="p-3 font-medium text-blue-600">OMS 数据</th>
                                        <th className="p-3 font-medium text-right">差异</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {diffs.map(diff => (
                                        <tr key={diff.recordId} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedDiffIds.has(diff.recordId)}
                                                    onChange={() => toggleSelect(diff.recordId)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-gray-800">{diff.sku}</div>
                                                <div className="text-xs text-gray-400 truncate max-w-[150px]">{diff.productName}</div>
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-500">{diff.localVal}</td>
                                            <td className="p-3 text-center text-gray-300"><ArrowRight size={16} /></td>
                                            <td className="p-3 font-mono font-bold text-blue-600">{diff.erpVal}</td>
                                            <td className="p-3 text-right">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${diff.diff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {diff.diff > 0 ? '+' : ''}{diff.diff.toFixed(syncType === 'sales' ? 1 : 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button 
                            onClick={() => setStep('config')}
                            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50"
                        >
                            上一步
                        </button>
                        <button 
                            onClick={handleSyncConfirm}
                            disabled={selectedDiffIds.size === 0}
                            className="flex-[2] bg-[#1890ff] hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                        >
                            确认更新 ({selectedDiffIds.size})
                        </button>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
