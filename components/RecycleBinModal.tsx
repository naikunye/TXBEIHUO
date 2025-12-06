
import React from 'react';
import { ReplenishmentRecord } from '../types';
import { X, Trash2, RotateCcw, Clock, AlertTriangle } from 'lucide-react';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedRecords: ReplenishmentRecord[];
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({ 
  isOpen, 
  onClose, 
  deletedRecords, 
  onRestore, 
  onDeleteForever 
}) => {
  if (!isOpen) return null;

  // Helper to calculate days remaining
  const getDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return 0;
    const deleteDate = new Date(deletedAt).getTime();
    const expiryDate = deleteDate + (7 * 24 * 60 * 60 * 1000); // 7 days
    const now = Date.now();
    const diff = expiryDate - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-lg">
                    <Trash2 size={24} className="text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">回收站 (Recycle Bin)</h2>
                    <p className="text-slate-400 text-xs">项目保留 7 天后将自动永久删除</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
            {deletedRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Trash2 size={48} className="mb-4 opacity-20" />
                    <p>回收站是空的</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {deletedRecords.map(record => {
                        const daysLeft = getDaysRemaining(record.deletedAt);
                        return (
                            <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">
                                        {record.imageUrl ? (
                                            <img src={record.imageUrl} className="w-full h-full object-cover rounded-lg opacity-60 grayscale" alt="" />
                                        ) : (
                                            <Trash2 size={20} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-700 line-clamp-1">{record.productName}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{record.sku}</span>
                                            <span className={`flex items-center gap-1 ${daysLeft <= 2 ? 'text-red-500 font-bold' : 'text-orange-500'}`}>
                                                <Clock size={12} /> {daysLeft}天后清除
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button 
                                        onClick={() => onRestore(record.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                    >
                                        <RotateCcw size={14} /> 恢复
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if(window.confirm('确定要永久销毁此记录吗？此操作无法撤销。')) {
                                                onDeleteForever(record.id);
                                            }
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                                    >
                                        <X size={14} /> 销毁
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        
        {deletedRecords.length > 0 && (
            <div className="p-4 bg-yellow-50 border-t border-yellow-100 text-yellow-800 text-xs flex items-center justify-center gap-2">
                <AlertTriangle size={14} />
                <span>提示：恢复后的商品将重新出现在"备货清单"中。</span>
            </div>
        )}

      </div>
    </div>
  );
};
