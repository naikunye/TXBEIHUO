
import React from 'react';
import { ReplenishmentRecord } from '../types';
import { Wand2, Package, Tag, Video, Sparkles, Mic } from 'lucide-react';

interface MarketingDashboardProps {
  records: ReplenishmentRecord[];
  onGenerate: (record: ReplenishmentRecord) => void;
}

export const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ records, onGenerate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in pb-10">
      {/* Header Banner for Context */}
      <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg mb-4 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
         <div className="relative z-10">
             <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="text-yellow-300" />
                AI 营销内容工坊
             </h2>
             <p className="text-indigo-100 max-w-2xl">
                基于您的商品特性（生命周期、利润点、受众），自动生成 TikTok 短视频脚本、SEO 标题、五点描述及直播话术。
                <br/>让 AI 帮您完成 90% 的文案工作。
             </p>
         </div>
      </div>

      {records.map(record => (
        <div key={record.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all group relative">
            <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-gray-300" size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 line-clamp-1 text-lg" title={record.productName}>{record.productName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{record.sku}</span>
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                 record.lifecycle === 'New' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                 record.lifecycle === 'Growth' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                 record.lifecycle === 'Stable' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                 'bg-red-50 text-red-600 border-red-100'
                             }`}>
                                 {record.lifecycle === 'New' ? '新品' : record.lifecycle === 'Growth' ? '爆品' : record.lifecycle === 'Stable' ? '稳定' : '清仓'}
                             </span>
                        </div>
                    </div>
                 </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-6">
                 <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2">
                     <div className="bg-white p-1.5 rounded-md text-gray-400 shadow-sm"><Tag size={12} /></div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">售价</span>
                        <span className="text-xs font-bold text-gray-700">${record.salesPriceUSD}</span>
                     </div>
                 </div>
                 <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2">
                     <div className="bg-white p-1.5 rounded-md text-pink-400 shadow-sm"><Video size={12} /></div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">达人佣金</span>
                        <span className="text-xs font-bold text-pink-600">{record.affiliateCommissionRate}%</span>
                     </div>
                 </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); onGenerate(record); }}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 group-hover:from-indigo-500 group-hover:to-purple-500"
            >
                <Wand2 size={18} className="animate-pulse" />
                一键生成营销内容
            </button>
            
            <div className="mt-3 flex justify-center gap-4 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><Video size={10}/> 脚本</span>
                <span className="flex items-center gap-1"><Tag size={10}/> SEO</span>
                <span className="flex items-center gap-1"><Mic size={10}/> 口播</span>
            </div>
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
