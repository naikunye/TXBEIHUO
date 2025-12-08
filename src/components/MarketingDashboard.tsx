
import React from 'react';
import { ReplenishmentRecord } from '../types';
import { Wand2, Package, Tag, Video, Sparkles, Mic, Target, Users } from 'lucide-react';

interface MarketingDashboardProps {
  records: ReplenishmentRecord[];
  onGenerate: (record: ReplenishmentRecord) => void;
}

export const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ records, onGenerate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in pb-10">
      {/* Header Banner for Context */}
      <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-10 text-white shadow-xl mb-4 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 opacity-20 rounded-full -translate-y-1/2 translate-x-1/3 blur-[100px] group-hover:bg-purple-500 transition-colors duration-1000"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div>
                 <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase text-indigo-200 border border-white/10">Marketing OS 2.0</span>
                 </div>
                 <h2 className="text-3xl font-black mb-3 flex items-center gap-3 text-glow">
                    <Sparkles className="text-yellow-400" size={28} />
                    AI 全案营销指挥部
                 </h2>
                 <p className="text-indigo-100 max-w-xl text-sm leading-relaxed opacity-90">
                    不止是文案生成。为您提供从 <strong>4周战役规划</strong>、<strong>多渠道内容矩阵</strong> (TikTok/Amazon/Ins) 到 <strong>红人建联开发</strong> 的一站式 AI 解决方案。
                 </p>
             </div>
             <div className="flex gap-4">
                 <div className="text-center">
                     <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-2 mx-auto backdrop-blur-md border border-white/10">
                         <Target className="text-cyan-300"/>
                     </div>
                     <span className="text-[10px] font-bold opacity-70">全案策划</span>
                 </div>
                 <div className="text-center">
                     <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-2 mx-auto backdrop-blur-md border border-white/10">
                         <Users className="text-orange-300"/>
                     </div>
                     <span className="text-[10px] font-bold opacity-70">红人开发</span>
                 </div>
                 <div className="text-center">
                     <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-2 mx-auto backdrop-blur-md border border-white/10">
                         <Video className="text-pink-300"/>
                     </div>
                     <span className="text-[10px] font-bold opacity-70">内容矩阵</span>
                 </div>
             </div>
         </div>
      </div>

      {records.map(record => (
        <div key={record.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all group relative flex flex-col justify-between h-full">
            <div>
                <div className="flex items-start justify-between mb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                            {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-gray-300" size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 line-clamp-1 text-lg group-hover:text-indigo-600 transition-colors" title={record.productName}>{record.productName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{record.sku}</span>
                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                     record.lifecycle === 'New' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                     record.lifecycle === 'Growth' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                     record.lifecycle === 'Stable' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                     'bg-red-50 text-red-600 border-red-100'
                                 }`}>
                                     {record.lifecycle === 'New' ? '新品期' : record.lifecycle === 'Growth' ? '爆品期' : record.lifecycle === 'Stable' ? '稳定期' : '清仓期'}
                                 </span>
                            </div>
                        </div>
                     </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-6">
                     <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2 border border-transparent group-hover:border-gray-200 transition-colors">
                         <div className="bg-white p-1.5 rounded-md text-gray-400 shadow-sm"><Tag size={12} /></div>
                         <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400">售价</span>
                            <span className="text-xs font-bold text-gray-700">${record.salesPriceUSD}</span>
                         </div>
                     </div>
                     <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2 border border-transparent group-hover:border-gray-200 transition-colors">
                         <div className="bg-white p-1.5 rounded-md text-pink-400 shadow-sm"><Video size={12} /></div>
                         <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400">佣金</span>
                            <span className="text-xs font-bold text-pink-600">{record.affiliateCommissionRate}%</span>
                         </div>
                     </div>
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); onGenerate(record); }}
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 group/btn"
            >
                <Wand2 size={18} className="group-hover/btn:rotate-12 transition-transform" />
                进入营销指挥部
            </button>
        </div>
      ))}
      
      {records.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无产品数据，请先在“备货清单”中添加产品。</p>
          </div>
      )}
    </div>
  );
}
