
import React, { useState, useEffect } from 'react';
import { AppSettings, LogisticsTier } from '../types';
import { X, Settings, Save, Plus, Trash2, DollarSign, Plane, Ship } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleExchangeChange = (val: string) => {
      setFormData(prev => ({ ...prev, exchangeRate: parseFloat(val) || 7.3 }));
  };

  const handleTierChange = (type: 'air' | 'sea', index: number, field: keyof LogisticsTier, val: string) => {
      const numVal = parseFloat(val) || 0;
      setFormData(prev => {
          const list = type === 'air' ? [...prev.airTiers] : [...prev.seaTiers];
          list[index] = { ...list[index], [field]: numVal };
          return type === 'air' ? { ...prev, airTiers: list } : { ...prev, seaTiers: list };
      });
  };

  const addTier = (type: 'air' | 'sea') => {
      setFormData(prev => {
          const list = type === 'air' ? [...prev.airTiers] : [...prev.seaTiers];
          list.push({ minWeight: 0, maxWeight: 9999, price: 0 });
          return type === 'air' ? { ...prev, airTiers: list } : { ...prev, seaTiers: list };
      });
  };

  const removeTier = (type: 'air' | 'sea', index: number) => {
      setFormData(prev => {
          const list = type === 'air' ? [...prev.airTiers] : [...prev.seaTiers];
          list.splice(index, 1);
          return type === 'air' ? { ...prev, airTiers: list } : { ...prev, seaTiers: list };
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <Settings size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">全局参数配置</h2>
                    <p className="text-slate-400 text-xs">汇率与物流阶梯价管理</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
            
            {/* Exchange Rate */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-green-600"/> 实时汇率 (USD &rarr; CNY)
                </h3>
                <div className="flex items-center gap-4">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={formData.exchangeRate}
                        onChange={e => handleExchangeChange(e.target.value)}
                        className="w-32 p-2 rounded-lg border border-gray-300 font-mono font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <span className="text-sm text-gray-500">当前系统计算基准</span>
                </div>
            </div>

            {/* Air Freight Tiers */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Plane size={18} className="text-blue-600"/> 空运阶梯价 (RMB/kg)
                    </h3>
                    <button type="button" onClick={() => addTier('air')} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                        <Plus size={12}/> 添加区间
                    </button>
                </div>
                
                <div className="space-y-2">
                    {formData.airTiers.length === 0 && <p className="text-xs text-gray-400">暂无配置，请添加。</p>}
                    {formData.airTiers.map((tier, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <input type="number" placeholder="Min" value={tier.minWeight} onChange={e => handleTierChange('air', idx, 'minWeight', e.target.value)} className="w-20 p-2 text-sm border rounded" />
                            <span className="text-gray-400">-</span>
                            <input type="number" placeholder="Max" value={tier.maxWeight} onChange={e => handleTierChange('air', idx, 'maxWeight', e.target.value)} className="w-20 p-2 text-sm border rounded" />
                            <span className="text-xs text-gray-500">kg :</span>
                            <input type="number" placeholder="Price" value={tier.price} onChange={e => handleTierChange('air', idx, 'price', e.target.value)} className="w-24 p-2 text-sm border rounded font-bold text-blue-600" />
                            <span className="text-xs text-gray-500">元/kg</span>
                            <button type="button" onClick={() => removeTier('air', idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sea Freight Tiers */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Ship size={18} className="text-indigo-600"/> 海运阶梯价 (RMB/kg)
                    </h3>
                    <button type="button" onClick={() => addTier('sea')} className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1">
                        <Plus size={12}/> 添加区间
                    </button>
                </div>
                
                <div className="space-y-2">
                    {formData.seaTiers.length === 0 && <p className="text-xs text-gray-400">暂无配置，请添加。</p>}
                    {formData.seaTiers.map((tier, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <input type="number" placeholder="Min" value={tier.minWeight} onChange={e => handleTierChange('sea', idx, 'minWeight', e.target.value)} className="w-20 p-2 text-sm border rounded" />
                            <span className="text-gray-400">-</span>
                            <input type="number" placeholder="Max" value={tier.maxWeight} onChange={e => handleTierChange('sea', idx, 'maxWeight', e.target.value)} className="w-20 p-2 text-sm border rounded" />
                            <span className="text-xs text-gray-500">kg :</span>
                            <input type="number" placeholder="Price" value={tier.price} onChange={e => handleTierChange('sea', idx, 'price', e.target.value)} className="w-24 p-2 text-sm border rounded font-bold text-indigo-600" />
                            <span className="text-xs text-gray-500">元/kg</span>
                            <button type="button" onClick={() => removeTier('sea', idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>

        </form>

        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50">取消</button>
            <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-lg">保存配置</button>
        </div>

      </div>
    </div>
  );
};
