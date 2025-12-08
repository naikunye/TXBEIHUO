
import React, { useState } from 'react';
import { ReplenishmentRecord } from '../types';
import { 
    Wand2, Package, Tag, Video, Sparkles, Mic, Target, Users, LayoutTemplate, 
    Instagram, Mail, ShoppingBag, MessageSquare, ChevronDown, Rocket, Search
} from 'lucide-react';

interface MarketingDashboardProps {
  records: ReplenishmentRecord[];
  onGenerate: (record: ReplenishmentRecord, initialTab?: string, initialChannel?: string) => void;
}

// Tool Definition Structure
const TOOLS = [
    { 
        id: 'strategy', 
        name: '全案营销策划', 
        desc: '生成 4 周完整的营销战役日历与节奏规划', 
        icon: Target, 
        color: 'bg-purple-500', 
        textColor: 'text-purple-500',
        tab: 'strategy',
        category: 'Strategy'
    },
    { 
        id: 'tiktok_script', 
        name: 'TikTok 爆款脚本', 
        desc: 'HOOK-BODY-CTA 黄金公式生成分镜脚本', 
        icon: Video, 
        color: 'bg-black', 
        textColor: 'text-gray-900',
        tab: 'channels',
        channel: 'TikTok',
        category: 'Social'
    },
    { 
        id: 'amazon_listing', 
        name: 'Amazon Listing', 
        desc: 'SEO 标题与五点描述深度优化', 
        icon: ShoppingBag, 
        color: 'bg-orange-500', 
        textColor: 'text-orange-500',
        tab: 'channels',
        channel: 'Amazon',
        category: 'Marketplace'
    },
    { 
        id: 'ig_caption', 
        name: 'Instagram 种草', 
        desc: '生成高互动贴文文案与热门标签', 
        icon: Instagram, 
        color: 'bg-pink-600', 
        textColor: 'text-pink-600',
        tab: 'channels',
        channel: 'Instagram',
        category: 'Social'
    },
    { 
        id: 'email_drip', 
        name: '邮件营销 (EDM)', 
        desc: '高转化率的营销邮件序列', 
        icon: Mail, 
        color: 'bg-blue-600', 
        textColor: 'text-blue-600',
        tab: 'channels',
        channel: 'Email',
        category: 'Social'
    },
    { 
        id: 'influencer_outreach', 
        name: '红人开发助手', 
        desc: '撰写高回复率的建联私信与 Brief', 
        icon: Users, 
        color: 'bg-red-500', 
        textColor: 'text-red-500',
        tab: 'influencer',
        category: 'Influencer'
    },
    { 
        id: 'visual_prompt', 
        name: '视觉创意导演', 
        desc: 'Midjourney/SD 提示词生成器', 
        icon: Sparkles, 
        color: 'bg-indigo-600', 
        textColor: 'text-indigo-600',
        tab: 'visuals',
        category: 'Creative'
    },
    { 
        id: 'voc_mining', 
        name: '舆情痛点挖掘', 
        desc: '分析竞品评论，提炼核心卖点', 
        icon: MessageSquare, 
        color: 'bg-amber-500', 
        textColor: 'text-amber-500',
        tab: 'insights',
        category: 'Strategy'
    }
];

export const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ records, onGenerate }) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Set default record if available
  React.useEffect(() => {
      if (records.length > 0 && !selectedRecordId) {
          setSelectedRecordId(records[0].id);
      }
  }, [records]);

  const selectedRecord = records.find(r => r.id === selectedRecordId);

  const handleRunTool = (tool: typeof TOOLS[0]) => {
      if (!selectedRecord) {
          alert("请先选择一个产品");
          return;
      }
      onGenerate(selectedRecord, tool.tab, tool.channel);
  };

  const categories = ['All', 'Strategy', 'Social', 'Marketplace', 'Creative'];
  const filteredTools = activeCategory === 'All' ? TOOLS : TOOLS.filter(t => t.category === activeCategory);

  return (
    <div className="animate-fade-in pb-10 space-y-8">
      
      {/* 1. Context Bar (Top) */}
      <div className="bg-slate-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-grid-pattern opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 text-glow">
                  <Sparkles className="text-yellow-400" />
                  AI 营销工坊 (Marketing Studio)
              </h2>
              <p className="text-slate-400 text-sm mt-1">选择产品，启动对应的 AI 营销 Agent。</p>
          </div>

          <div className="relative z-10 w-full md:w-auto bg-slate-800 p-1.5 rounded-xl border border-slate-700 flex items-center gap-3">
              <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">当前工作对象:</div>
              <div className="relative">
                  <select 
                    value={selectedRecordId} 
                    onChange={(e) => setSelectedRecordId(e.target.value)}
                    className="appearance-none bg-slate-700 text-white font-bold text-sm px-4 py-2.5 pr-10 rounded-lg outline-none hover:bg-slate-600 transition-colors w-full md:w-64 border border-slate-600 focus:border-indigo-500"
                  >
                      {records.map(r => (
                          <option key={r.id} value={r.id}>{r.sku} - {r.productName}</option>
                      ))}
                      {records.length === 0 && <option value="">暂无产品</option>}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
          </div>
      </div>

      {/* 2. Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat 
                    ? 'bg-white text-slate-900 shadow-md transform scale-105' 
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                  {cat}
              </button>
          ))}
      </div>

      {/* 3. Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTools.map((tool) => (
              <div 
                key={tool.id}
                onClick={() => handleRunTool(tool)}
                className="group bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-2xl p-6 transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm flex flex-col justify-between h-48 hover:-translate-y-1 hover:shadow-2xl"
              >
                  {/* Icon Blob */}
                  <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 ${tool.color}`}></div>
                  
                  <div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tool.color} text-white shadow-lg`}>
                          <tool.icon size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{tool.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{tool.desc}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-white transition-colors">
                      <span>立即运行</span>
                      <Rocket size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
              </div>
          ))}
      </div>

      {/* 4. Recent / Product Quick List */}
      <div className="mt-12">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Package className="text-blue-400" />
              产品快速通道
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.slice(0, 6).map(record => (
                  <div 
                    key={record.id} 
                    onClick={() => { setSelectedRecordId(record.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${selectedRecordId === record.id ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                  >
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-400"/>}
                      </div>
                      <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{record.productName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{record.sku}</div>
                      </div>
                      {selectedRecordId === record.id && <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full shadow-glow-purple"></div>}
                  </div>
              ))}
          </div>
      </div>

    </div>
  );
}
