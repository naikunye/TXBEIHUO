
import React, { useState, useEffect } from 'react';
import { ReplenishmentRecord, Store } from '../types';
import { X, ArrowRightLeft, Copy, Store as StoreIcon, AlertCircle } from 'lucide-react';

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
  const [quantity, setQuantity] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      setTargetStoreId('');
      setQuantity('');
      setMode('transfer');
    }
  }, [isOpen]);

  if (!isOpen || !sourceRecord) return null;

  const currentStore = stores.find(s => s.id === sourceRecord.storeId);
  const availableStores = stores.filter(s => s.id !== sourceRecord.storeId);
  const maxQuantity = sourceRecord.quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStoreId) {
        alert("请选择目标店铺");
        return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
        alert("请输入有效的数量");
        return;
    }
    if (mode === 'transfer' && qty > maxQuantity) {
        alert("划拨数量不能超过当前库存！");
        return;
    }
    onConfirm(mode, targetStoreId, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ArrowRightLeft size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">库存分发</h2>
              <div className="flex items-center gap-2 text-slate-400 text-xs mt-0.5">
                  <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">{sourceRecord.sku}</span>
                  <span>当前: {currentStore?.name || '未分配'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setMode('transfer')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center ${mode === 'transfer' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
              >
                  <ArrowRightLeft size={24} />
                  <div>
                      <span className="font-bold text-sm block">划拨 (Transfer)</span>
                      <span className="text-[10px] opacity-80">库存转移，源库存减少</span>
                  </div>
              </div>

              <div 
                onClick={() => setMode('clone')}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center ${mode === 'clone' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
              >
                  <Copy size={24} />
                  <div>
                      <span className="font-bold text-sm block">分发 (Clone)</span>
                      <span className="text-[10px] opacity-80">新货分发，源库存不变</span>
                  </div>
              </div>
          </div>

          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">目标店铺</label>
                  <div className="relative">
                      <StoreIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                      <select 
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none font-medium text-gray-700"
                        value={targetStoreId}
                        onChange={(e) => setTargetStoreId(e.target.value)}
                      >
                          <option value="">选择店铺...</option>
                          {availableStores.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.platform})</option>
                          ))}
                      </select>
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                      数量 (可用: {maxQuantity})
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    max={mode === 'transfer' ? maxQuantity : undefined}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-lg font-bold text-gray-800"
                    placeholder="输入数量"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                  {mode === 'transfer' && quantity !== '' && Number(quantity) > maxQuantity && (
                      <div className="flex items-center gap-1 text-red-500 text-xs mt-2 font-medium">
                          <AlertCircle size={12} /> 数量超过当前库存
                      </div>
                  )}
              </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 mt-4"
          >
              确认{mode === 'transfer' ? '划拨' : '分发'}
          </button>

        </form>
      </div>
    </div>
  );
};
