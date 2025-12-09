
import React, { useState, useEffect } from 'react';
import { ReplenishmentRecord } from '../types';
import { 
    Wand2, Package, Video, Sparkles, Target, Users, LayoutTemplate, 
    Instagram, Mail, ShoppingBag, MessageSquare, ChevronDown, Rocket, Zap
} from 'lucide-react';

interface MarketingDashboardProps {
  records: ReplenishmentRecord[];
  onGenerate: (record: ReplenishmentRecord) => void;
}

const TOOLS = [
    { id: 'strategy', name: '全案营销策划', desc: '生成 4 周完整的营销战役日历与节奏规划', icon: Target, color: 'bg-purple-500', category: 'Strategy' },
    { id: 'tiktok_script', name: 'TikTok 爆款脚本', desc: 'HOOK-BODY-CTA 黄金公式生成分镜脚本', icon: Video, color: 'bg-black', category: 'Social' },
    { id: 'amazon_listing', name: 'Amazon Listing', desc: 'SEO 标题与五点描述深度优化', icon: ShoppingBag, color: 'bg-orange-500', category: 'Marketplace' },
    { id: 'ig_caption', name: 'Instagram 种草', desc: '生成高互动贴文文案与热门标签', icon: Instagram, color: 'bg-pink-600', category: 'Social' },
    { id: 'email_drip', name: '邮件营销 (EDM)', desc: '高转化率的营销邮件序列', icon: Mail, color: 'bg-blue-600', category: 'Social' },
    { id: 'influencer_outreach', name: '红人开发助手', desc: '撰写高回复率的建联私信与 Brief', icon: Users, color: 'bg-red-500', category: 'Influencer' },
    { id: 'visual_prompt', name: '视觉创意导演', desc: 'Midjourney/SD 提示词生成器', icon: Sparkles, color: 'bg-indigo-600', category: 'Creative' },
    { id: 'voc_mining', name: '舆情痛点挖掘', desc: '分析竞品评论，提炼核心卖点', icon: MessageSquare, color: 'bg-amber-500', category: 'Strategy' }
];

export const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ records, onGenerate }) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
      if (records.length > 0 && !selectedRecordId) setSelectedRecordId(records[0].id);
  }, [records]);

  const handleRunTool = (tool: typeof TOOLS[0]) => {
      const record = records.find(r => r.id === selectedRecordId);
      if (!record) return alert("请先选择一个产品作为营销对象");
      onGenerate(record); // Opens the modal
  };

  const categories = ['All', 'Strategy', 'Social', 'Marketplace', 'Creative'];
  const filteredTools = activeCategory === 'All' ? TOOLS : TOOLS.filter(t => t.category === activeCategory);

  return (
    <div className="animate-fade-in pb-20 space-y-8">
      {/* Context Bar */}
      <div className="bg-slate-900 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-full h-full bg-grid-pattern opacity-10 pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
              <h2 className="text-3xl font-black text-white flex items-center gap-3 text-glow">
                  <Zap className="text-yellow-400 fill-yellow-400" /> AI 营销工坊 (Marketing Studio)
              </h2>
              <p className="text-slate-400 text-sm mt-2 font-medium">选择产品，启动对应的 AI 营销 Agent。</p>
          </div>

          <div className="relative z-10 w-full md:w-auto bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10 flex flex-col gap-1 shadow-lg">
              <label className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Context (当前对象)</label>
              <div className="relative">
                  <select 
                    value={selectedRecordId} 
                    onChange={(e) => setSelectedRecordId(e.target.value)}
                    className="appearance-none bg-slate-800 text-white font-bold text-sm px-4 py-3 pr-10 rounded-xl outline-none hover:bg-slate-700 transition-colors w-full md:w-72 border border-slate-600 focus:border-purple-500"
                  >
                      {records.map(r => <option key={r.id} value={r.id}>{r.sku} - {r.productName}</option>)}
                      {records.length === 0 && <option value="">暂无产品</option>}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
          </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${activeCategory === cat ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'}`}>
                  {cat}
              </button>
          ))}
      </div>

      {/* Tools Grid (Bento) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTools.map((tool) => (
              <div key={tool.id} onClick={() => handleRunTool(tool)} className="group bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-3xl p-6 transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm flex flex-col justify-between h-56 hover:-translate-y-2 hover:shadow-2xl">
                  <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${tool.color}`}></div>
                  <div>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${tool.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <tool.icon size={28} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{tool.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">{tool.desc}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-white transition-colors">
                      <span className="uppercase tracking-wider opacity-70 group-hover:opacity-100">{tool.category}</span>
                      <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
                          Run <Rocket size={10} />
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {/* Quick Access */}
      <div className="mt-12 pt-8 border-t border-white/10">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Package className="text-blue-400" /> 产品快速通道</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.slice(0, 6).map(record => (
                  <div key={record.id} onClick={() => { setSelectedRecordId(record.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${selectedRecordId === record.id ? 'bg-indigo-900/20 border-indigo-500/50 shadow-glow-purple' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                          {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-400"/>}
                      </div>
                      <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{record.productName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{record.sku}</div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}
