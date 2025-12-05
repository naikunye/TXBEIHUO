
import React, { useState } from 'react';
import { Store } from '../types';
import { X, Store as StoreIcon, Plus, Trash2 } from 'lucide-react';

interface StoreManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: Store[];
  onAddStore: (store: Omit<Store, 'id'>) => void;
  onDeleteStore: (id: string) => void;
}

export const StoreManagerModal: React.FC<StoreManagerModalProps> = ({ 
  isOpen, 
  onClose, 
  stores, 
  onAddStore, 
  onDeleteStore 
}) => {
  const [newStoreName, setNewStoreName] = useState('');
  const [newStorePlatform, setNewStorePlatform] = useState<Store['platform']>('TikTok');
  const [newStoreColor, setNewStoreColor] = useState('bg-blue-500');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStoreName.trim()) {
      onAddStore({
        name: newStoreName.trim(),
        platform: newStorePlatform,
        color: newStoreColor
      });
      setNewStoreName('');
    }
  };

  const colors = [
    { class: 'bg-blue-500', label: 'Blue' },
    { class: 'bg-pink-500', label: 'Pink' },
    { class: 'bg-purple-500', label: 'Purple' },
    { class: 'bg-emerald-500', label: 'Green' },
    { class: 'bg-orange-500', label: 'Orange' },
    { class: 'bg-gray-800', label: 'Dark' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <StoreIcon size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">店铺管理</h2>
                    <p className="text-slate-400 text-xs">配置您的多店铺矩阵</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
            </button>
        </div>

        <div className="p-6">
            
            {/* List */}
            <div className="mb-6 space-y-3 max-h-60 overflow-y-auto">
                <p className="text-xs text-gray-500 font-bold uppercase mb-2">现有店铺 ({stores.length})</p>
                {stores.map(store => (
                    <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${store.color}`}></div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">{store.name}</h4>
                                <p className="text-[10px] text-gray-400">{store.platform}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onDeleteStore(store.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {stores.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">暂无店铺，请添加</div>
                )}
            </div>

            {/* Add Form */}
            <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Plus size={16} /> 新增店铺
                </h4>
                <div className="space-y-3">
                    <input 
                        type="text" 
                        placeholder="店铺名称 (e.g. TikTok美妆店)" 
                        className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                        value={newStoreName}
                        onChange={e => setNewStoreName(e.target.value)}
                        required
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <select 
                            value={newStorePlatform}
                            onChange={e => setNewStorePlatform(e.target.value as any)}
                            className="p-2.5 rounded-lg border border-gray-300 text-sm"
                        >
                            <option value="TikTok">TikTok Shop</option>
                            <option value="Amazon">Amazon</option>
                            <option value="Temu">Temu</option>
                            <option value="Other">Other</option>
                        </select>
                        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-2">
                            {colors.map(c => (
                                <button
                                    key={c.label}
                                    type="button"
                                    onClick={() => setNewStoreColor(c.class)}
                                    className={`w-4 h-4 rounded-full ${c.class} ${newStoreColor === c.class ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                ></button>
                            ))}
                        </div>
                    </div>
                    <button className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-slate-900 transition-all">
                        确认添加
                    </button>
                </div>
            </form>

        </div>
      </div>
    </div>
  );
};
