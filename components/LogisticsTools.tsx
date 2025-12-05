import React, { useState } from 'react';
import { Truck, Search, Ship, ExternalLink, Anchor } from 'lucide-react';

export const LogisticsTools: React.FC = () => {
  const [upsTrackingNumber, setUpsTrackingNumber] = useState('');

  const handleUpsTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upsTrackingNumber) return;
    window.open(`https://www.ups.com/track?tracknum=${upsTrackingNumber}`, '_blank');
  };

  const handleWeiyunOpen = () => {
    window.open('https://www.weiyun001.com/?regionredirected=true', '_blank');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
      
      {/* UPS Tracking Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        <div className="bg-[#FFB500] p-6 text-amber-900">
           <div className="flex items-center gap-3">
              <div className="bg-amber-900/10 p-2 rounded-lg">
                 <Truck size={24} className="text-amber-900" />
              </div>
              <div>
                  <h3 className="text-xl font-extrabold tracking-tight">UPS 物流追踪</h3>
                  <p className="text-amber-800 text-sm font-medium opacity-80">中国/美国包裹实时查询</p>
              </div>
           </div>
        </div>
        
        <div className="p-6">
            <form onSubmit={handleUpsTrack} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">追踪单号 (Tracking Number)</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            className="block w-full rounded-lg border-gray-300 border bg-gray-50 text-gray-900 p-3 pl-4 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder-gray-400"
                            placeholder="1Z..."
                            value={upsTrackingNumber}
                            onChange={(e) => setUpsTrackingNumber(e.target.value)}
                        />
                        <Search className="absolute right-3 top-3.5 text-gray-400" size={18} />
                    </div>
                </div>
                <button 
                    type="submit" 
                    className="w-full bg-gray-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
                >
                    立即查询 <ExternalLink size={16} />
                </button>
            </form>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                支持查询 UPS Ground, Air, Express 等所有服务类型的包裹状态。
            </div>
        </div>
      </div>

      {/* Weiyun / Sea Freight Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        <div className="bg-[#0052CC] p-6 text-white">
           <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                 <Ship size={24} className="text-white" />
              </div>
              <div>
                  <h3 className="text-xl font-extrabold tracking-tight">维运网海运查询</h3>
                  <p className="text-blue-100 text-sm font-medium opacity-90">船期 / 提单 / 柜号查询</p>
              </div>
           </div>
        </div>
        
        <div className="p-6 flex flex-col justify-between h-[calc(100%-88px)]">
            <div className="space-y-4">
                <p className="text-gray-600 text-sm leading-relaxed">
                    维运网 (weiyun001.com) 是专业的国际海运综合服务平台，支持各大船司的实时货物追踪、船期查询及港口信息。
                </p>
                <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">船公司追踪</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">货物节点</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">ETA/ETD查询</span>
                </div>
            </div>
            
            <div className="mt-6">
                 <button 
                    onClick={handleWeiyunOpen}
                    className="w-full bg-[#0052CC] text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                >
                    <Anchor size={18} />
                    前往维运网查询
                </button>
                 <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 text-center">
                    将打开外部网站进行专业查询
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};