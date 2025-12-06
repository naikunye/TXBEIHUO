
import React, { useState, useEffect } from 'react';
import { ReplenishmentRecord } from '../types';
import { fetchLingxingInventory, fetchLingxingSales, calculateInventoryDiff, calculateSalesDiff, resetMockErpData, updateMockErpItem, bulkImportRealData } from '../services/lingxingService';
import { X, RefreshCw, ArrowRight, Check, AlertCircle, Database, Link as LinkIcon, Lock, TrendingUp, Package, Trash2, Edit2, Save, UploadCloud, ClipboardPaste } from 'lucide-react';

interface ErpSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
  onUpdateRecords: (updatedRecords: ReplenishmentRecord[]) => void;
}

type SyncType = 'inventory' | 'sales';

export const ErpSyncModal: React.FC<ErpSyncModalProps> = ({ isOpen, onClose, records, onUpdateRecords }) => {
  const [step, setStep] = useState<'config' | 'import' | 'result'>('config');
  const [syncType, setSyncType] = useState<SyncType>('inventory');
  
  // Config State
  const [appId, setAppId] = useState('');
  const [token, setToken] = useState(''); 
  const [proxyUrl, setProxyUrl] = useState(''); 
  
  // Import State
  const [pasteData, setPasteData] = useState('');

  // Load saved config ONCE on mount/open
  useEffect(() => {
      if (isOpen) {
          setAppId(localStorage.getItem('lx_app_id') || '');
          setToken(localStorage.getItem('lx_token') || '');
          setProxyUrl(localStorage.getItem('lx_proxy_url') || '');
      }
  }, [isOpen]);

  const [isLoading, setIsLoading] = useState(false);
  const [diffs, setDiffs] = useState<any[]>([]);
  const [selectedDiffIds, setSelectedDiffIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  if (!isOpen) return null;

  const isSimulation = !proxyUrl || !proxyUrl.startsWith('http');

  // Save config when clicking Connect
  const saveConfig = () => {
      localStorage.setItem('lx_app_id', appId);
      localStorage.setItem('lx_token', token);
      localStorage.setItem('lx_proxy_url', proxyUrl);
  };

  const handleConnect = async () => {
      saveConfig();
      setIsLoading(true);
      setEditingId(null);
      try {
          if (!isSimulation && (!appId || !token)) {
              throw new Error("请填写完整的 App Key 和 App Secret");
          }

          let calculatedDiffs: typeof diffs = [];

          if (syncType === 'inventory') {
              const erpData = await fetchLingxingInventory(appId, token, records, proxyUrl);
              calculatedDiffs = calculateInventoryDiff(records, erpData);
          } else {
              const erpData = await fetchLingxingSales(appId, token, records, 30, proxyUrl);
              calculatedDiffs = calculateSalesDiff(records, erpData);
          }
          
          setDiffs(calculatedDiffs);
          setSelectedDiffIds(new Set(calculatedDiffs.map(d => d.recordId)));
          setStep('result');
      } catch (error: any) {
          alert(`连接失败: ${error.message}`);
      } finally {
          setIsLoading(false);
      }
  };

  const handleBulkImport = () => {
      if (!pasteData.trim()) return;
      
      const lines = pasteData.trim().split('\n');
      const parsed: { sku: string; qty: number }[] = [];
      
      lines.forEach(line => {
          // Supports "SKU, Qty" or "SKU \t Qty" or "SKU Qty"
          const parts = line.replace(/,/g, ' ').split(/[\t\s]+/).filter(Boolean);
          if (parts.length >= 2) {
              const sku = parts[0];
              const qty = parseFloat(parts[parts.length-1]); // Assume last part is number
              if (!isNaN(qty)) {
                  parsed.push({ sku, qty });
              }
          }
      });

      if (parsed.length > 0) {
          const count = bulkImportRealData(parsed);
          alert(`成功导入 ${count} 条真实数据！\n系统现在将使用这些数据进行比对。`);
          setPasteData('');
          // Auto proceed to connect logic (which uses the newly saved mock DB)
          handleConnect();
      } else {
          alert("未能识别有效数据。请确保格式为：SKU 数量 (每行一条)");
      }
  };

  const handleResetSimulation = () => {
      if(window.confirm("确定要重置所有数据吗？\n这将清除所有手动导入或模拟的数据。")) {
          resetMockErpData();
          alert("数据已重置。");
          setStep('config');
      }
  };

  const startEdit = (diff: any) => {
      if (!isSimulation) return;
      setEditingId(diff.recordId);
      setEditValue(diff.erpVal.toString());
  };

  const saveEdit = (diff: any) => {
      const newVal = parseFloat(editValue);
      if (!isNaN(newVal)) {
          updateMockErpItem(diff.sku, syncType === 'inventory' ? 'stock' : 'sales', newVal);
          setDiffs(prev => prev.map(d => {
              if (d.recordId === diff.recordId) {
                  return { ...d, erpVal: newVal, diff: newVal - d.localVal };
              }
              return d;
          }));
      }
      setEditingId(null);
  };

  const toggleSelect = (id: string) => {
      const next = new Set(selectedDiffIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedDiffIds(next);
  };

  const handleSyncConfirm = () => {
      const updatedRecords = records.map(r => {
          if (selectedDiffIds.has(r.id)) {
              const diffItem = diffs.find(d => d.recordId === r.id);
              if (diffItem) {
                  if (syncType === 'inventory') {
                      const newQty = Number(diffItem.erpVal);
                      const safeItemsPerBox = r.itemsPerBox > 0 ? r.itemsPerBox : 1;
                      const newTotalCartons = Math.ceil(newQty / safeItemsPerBox);
                      return { ...r, quantity: newQty, totalCartons: newTotalCartons };
                  } else {
                      return { ...r, dailySales: Number(diffItem.erpVal) };
                  }
              }
          }
          return r;
      });
      onUpdateRecords(updatedRecords);
      onClose();
      setStep('config');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col relative max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#1890ff] p-5 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg"><RefreshCw size={24} className="text-white" /></div>
                <div>
                    <h2 className="text-xl font-bold">库存/销量同步</h2>
                    <p className="text-blue-100 text-xs">Lingxing Open API / Import Tool</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X size={24} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            
            {/* Step 1: Config */}
            {step === 'config' && (
                <div className="space-y-6">
                    <div className="flex p-1 bg-gray-200 rounded-xl">
                        <button onClick={() => setSyncType('inventory')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${syncType === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><Package size={18} /> 同步库存 (Stock)</button>
                        <button onClick={() => setSyncType('sales')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${syncType === 'sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><TrendingUp size={18} /> 同步日销 (Sales)</button>
                    </div>

                    <div className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
                            <Lock size={18} className="text-gray-400"/> API 连接配置
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App ID</label>
                                <input type="text" value={appId} onChange={e => setAppId(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="领星 App ID" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App Secret</label>
                                <input type="password" value={token} onChange={e => setToken(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="领星 Secret" />
                            </div>
                        </div>
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">代理地址 (Proxy URL)</label>
                            <input type="text" value={proxyUrl} onChange={e => setProxyUrl(e.target.value)} className="w-full p-2.5 border border-dashed border-gray-300 bg-gray-50 rounded-lg text-xs" placeholder="https://api.your-domain.com/proxy (留空则为离线模式)" />
                        </div>
                    </div>

                    {isSimulation && (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                                <div className="text-sm text-orange-800">
                                    <p className="font-bold">未配置代理服务器 (Offline Mode)</p>
                                    <p className="opacity-90 text-xs mt-1">由于浏览器安全限制，无法直接连接领星。您可以使用“数据导入”功能，将领星导出的 Excel/CSV 数据粘贴进来，实现离线精准同步。</p>
                                </div>
                            </div>
                            <button onClick={() => setStep('import')} className="bg-white border border-orange-200 text-orange-700 font-bold py-2 rounded-lg text-sm hover:bg-orange-100 transition-colors flex items-center justify-center gap-2">
                                <ClipboardPaste size={16} /> 粘贴导入真实数据 (Bulk Import)
                            </button>
                        </div>
                    )}

                    <button onClick={handleConnect} disabled={isLoading} className={`w-full font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-white ${isSimulation ? 'bg-slate-800 hover:bg-slate-900' : 'bg-[#1890ff] hover:bg-blue-600'}`}>
                        {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <LinkIcon size={20} />}
                        {isSimulation ? '开始比对 (使用导入/模拟数据)' : '连接 API 获取数据'}
                    </button>
                    {isSimulation && <button onClick={handleResetSimulation} className="w-full text-xs text-gray-400 hover:text-red-500 py-2">清除所有缓存数据</button>}
                </div>
            )}

            {/* Step 1.5: Import */}
            {step === 'import' && (
                <div className="space-y-4 h-full flex flex-col">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <UploadCloud size={20} className="text-blue-600"/> 导入真实数据
                    </h3>
                    <p className="text-xs text-gray-500">请从 Excel 复制两列：SKU 和 数量 (Quantity)，然后粘贴到下方。</p>
                    <textarea 
                        className="flex-1 w-full p-4 border border-gray-300 rounded-xl font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder={`Example:\nSKU001 100\nSKU002 50\n...`}
                        value={pasteData}
                        onChange={e => setPasteData(e.target.value)}
                    ></textarea>
                    <div className="flex gap-3">
                        <button onClick={() => setStep('config')} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-600">取消</button>
                        <button onClick={handleBulkImport} className="flex-[2] bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700">确认导入</button>
                    </div>
                </div>
            )}

            {/* Step 2: Result (Existing Logic) */}
            {step === 'result' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">{syncType === 'inventory' ? '库存' : '销量'}差异比对</h3>
                            <p className="text-xs text-gray-400">{isSimulation ? '(Based on Imported/Mock Data)' : '(Live API Data)'}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">发现 {diffs.length} 个差异</span>
                    </div>

                    {diffs.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                            <Check className="mx-auto text-green-500 mb-2" size={40} />
                            <p className="text-gray-600 font-medium">数据完全一致！</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm text-left relative">
                                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 w-10"><input type="checkbox" checked={selectedDiffIds.size === diffs.length} onChange={() => setSelectedDiffIds(selectedDiffIds.size === diffs.length ? new Set() : new Set(diffs.map(d => d.recordId)))} /></th>
                                        <th className="p-3 font-medium">SKU</th>
                                        <th className="p-3 font-medium text-right">本地</th>
                                        <th className="p-3"></th>
                                        <th className="p-3 font-medium text-blue-600">ERP 数据</th>
                                        <th className="p-3 font-medium text-right">差异</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {diffs.map(diff => (
                                        <tr key={diff.recordId} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-3"><input type="checkbox" checked={selectedDiffIds.has(diff.recordId)} onChange={() => toggleSelect(diff.recordId)} /></td>
                                            <td className="p-3"><div className="font-bold text-gray-800">{diff.sku}</div><div className="text-xs text-gray-400 truncate max-w-[120px]">{diff.productName}</div></td>
                                            <td className="p-3 text-right font-mono text-gray-500">{diff.localVal}</td>
                                            <td className="p-3 text-center text-gray-300"><ArrowRight size={16} /></td>
                                            <td className="p-3 font-mono font-bold text-blue-600 relative">
                                                {editingId === diff.recordId ? (
                                                    <div className="flex items-center gap-1 absolute left-2 top-2 z-20">
                                                        <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-20 p-1 border border-blue-400 rounded text-sm shadow-lg outline-none" autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(diff)} />
                                                        <button onClick={() => saveEdit(diff)} className="bg-green-500 text-white p-1 rounded"><Check size={14}/></button>
                                                    </div>
                                                ) : (
                                                    <div className={`flex items-center gap-2 ${isSimulation ? 'cursor-pointer hover:bg-blue-50 px-2 py-1 rounded -ml-2' : ''}`} onClick={() => startEdit(diff)} title="点击修改">{diff.erpVal} {isSimulation && <Edit2 size={10} className="opacity-0 group-hover:opacity-50" />}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right"><span className={`px-2 py-0.5 rounded text-xs font-bold ${diff.diff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{diff.diff > 0 ? '+' : ''}{diff.diff}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button onClick={() => setStep('config')} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50">上一步</button>
                        <button onClick={handleSyncConfirm} disabled={selectedDiffIds.size === 0} className="flex-[2] bg-[#1890ff] hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50">确认更新 ({selectedDiffIds.size})</button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
