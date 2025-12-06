
import React, { useState, useEffect } from 'react';
import { ReplenishmentRecord, Store } from '../types';
import { X, ArrowRightLeft, Copy, AlertCircle, Store as StoreIcon, ArrowRight } from 'lucide-react';

interface DistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRecord: ReplenishmentRecord | null;
  stores: Store[];
  onConfirm: (mode: 'transfer' | 'clone', targetStoreId: string, quantity: number) => void;
}

export const DistributeModal: React.FC<DistributeModalProps> = ({
  isOpen,
  onClose,
  sourceRecord,
  stores,
  onConfirm
}) => {
  const [mode, setMode] = useState<'transfer' | 'clone'>('transfer');
  const [targetStoreId, setTargetStoreId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);

  // Reset state when opening
  useEffect(() => {
    if (isOpen && sourceRecord) {
      setQuantity(0);
      // Default to the first store that ISN'T the current one
      const otherStore = stores.find(s => s.id !== sourceRecord.storeId);
      setTargetStoreId(otherStore ? otherStore.id : '');
    }
  }, [isOpen, sourceRecord, stores]);

  if (!isOpen || !sourceRecord) return null;

  const currentStore = stores.find(s => s.id === sourceRecord.storeId);
  const targetStore = stores.find(s => s.id === targetStoreId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStoreId || quantity <= 0) return;
    if (mode === 'transfer' && quantity > sourceRecord.quantity) {
        alert("划拨数量不能超过当前库存！");
        return;
    }
    onConfirm(mode, targetStoreId, quantity);
    onClose();
  };

  const maxTransfer = sourceRecord.quantity;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ArrowRightLeft size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">库存分发中心</h2>
              <p className="text-slate-400 text-xs">SKU: {sourceRecord.sku}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* 1. Select Target Store */}
          <div>
             <label className="block text-sm font-bold text-gray-700 mb-2">目标店铺 (To)</label>
             <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${currentStore?.color || 'bg-gray-400'}`}></span>
                    <span className="max-w-[80px] truncate">{currentStore?.name || '未分配'}</span>
                </div>
                <ArrowRight size={16} className="text-gray-400" />
                <div className="flex-1">
                    <select 
                        value={targetStoreId} 
                        onChange={e => setTargetStoreId(e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 outline-none font-bold"
                        required
                    >
                        <option value="" disabled>选择店铺...</option>
                        {stores
                            .filter(s => s.id !== sourceRecord.storeId)
                            .map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.platform})</option>
                        ))}
                    </select>
                </div>
             </div>
             {stores.length < 2 && (
                 <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                     <AlertCircle size={12}/> 请先在左侧菜单"店铺管理"中添加其他店铺
                 </p>
             )}
          </div>

          {/* 2. Mode Selection */}
          <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setMode('transfer')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${mode === 'transfer' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                  <div className="flex justify-between items-start mb-2">
                      <ArrowRightLeft size={20} className={mode === 'transfer' ? 'text-blue-600' : 'text-gray-400'} />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mode === 'transfer' ? 'border-blue-600' : 'border-gray-300'}`}>
                          {mode === 'transfer' && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                      </div>
                  </div>
                  <h4 className={`font-bold text-sm ${mode === 'transfer' ? 'text-blue-800' : 'text-gray-700'}`}>划拨库存</h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                      从当前批次中分出库存给新店铺。
                      <br/>
                      <span className="text-orange-500 font-medium">当前库存会减少。</span>
                  </p>
              </div>

              <div 
                onClick={() => setMode('clone')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${mode === 'clone' ? 'border-purple-500 bg-purple-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                  <div className="flex justify-between items-start mb-2">
                      <Copy size={20} className={mode === 'clone' ? 'text-purple-600' : 'text-gray-400'} />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mode === 'clone' ? 'border-purple-600' : 'border-gray-300'}`}>
                          {mode === 'clone' && <div className="w-2 h-2 bg-purple-600 rounded-full"></div>}
                      </div>
                  </div>
                  <h4 className={`font-bold text-sm ${mode === 'clone' ? 'text-purple-800' : 'text-gray-700'}`}>仅复制信息</h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                      为新店铺创建同款产品的全新采购单。
                      <br/>
                      <span className="text-green-600 font-medium">当前库存不变。</span>
                  </p>
              </div>
          </div>

          {/* 3. Quantity Input */}
          <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                  {mode === 'transfer' ? '划拨数量 (Transfer Qty)' : '新采购数量 (New Qty)'}
              </label>
              <div className="relative">
                  <input 
                    type="number" 
                    value={quantity || ''} 
                    onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-slate-200 outline-none text-lg font-bold font-mono"
                    placeholder="0"
                    min="1"
                    max={mode === 'transfer' ? maxTransfer : undefined}
                  />
                  {mode === 'transfer' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          / 可用 {maxTransfer}
                      </div>
                  )}
              </div>
          </div>

          <button 
            type="submit"
            disabled={!targetStoreId || quantity <= 0 || (mode === 'transfer' && quantity > maxTransfer)}
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
              确认{mode === 'transfer' ? '划拨' : '复制'}
          </button>

        </form>
      </div>
    </div>
  );
};
