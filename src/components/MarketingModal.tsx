
import React, { useState, useEffect } from 'react';
import { X, Copy, Wand2, Video, FileText, Mic, Image as ImageIcon, MessageSquare, Loader2, Play, Calendar, Users, ShoppingBag, LayoutTemplate, Instagram, Mail, Sparkles, Target, Megaphone } from 'lucide-react';
import { ReplenishmentRecord } from '../types';
import { 
    generateVisualDirectives, 
    analyzeReviewSentiment, 
    generateCampaignStrategy, 
    generateChannelContent, 
    generateInfluencerBrief 
} from '../services/geminiService';

interface MarketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null; // Legacy content, we might not use it directly in new design but keep for compat
  productName: string;
  record?: ReplenishmentRecord | null;
  initialTab?: 'strategy' | 'channels' | 'influencer' | 'visuals' | 'insights'; // New Prop
  initialChannel?: 'TikTok' | 'Amazon' | 'Instagram' | 'Email'; // New Prop
}

type Tab = 'strategy' | 'channels' | 'influencer' | 'visuals' | 'insights';
type ChannelType = 'TikTok' | 'Amazon' | 'Instagram' | 'Email';

export const MarketingModal: React.FC<MarketingModalProps> = ({ 
    isOpen, 
    onClose, 
    productName, 
    record, 
    initialTab = 'strategy',
    initialChannel = 'TikTok' 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [activeChannel, setActiveChannel] = useState<ChannelType>(initialChannel);
  
  // Loading States
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  
  // Content States
  const [results, setResults] = useState<Record<string, string | null>>({});
  const [reviewInput, setReviewInput] = useState('');

  // Reset on open or prop change
  useEffect(() => {
      if (isOpen) {
          setActiveTab(initialTab);
          setActiveChannel(initialChannel);
          // Don't clear results to allow persistence if closed accidentally
          // setResults({}); 
          setReviewInput('');
      }
  }, [isOpen, initialTab, initialChannel]);

  if (!isOpen || !record) return null;

  // Helper to handle async calls
  const runAiTask = async (key: string, taskFn: () => Promise<string>) => {
      setLoading(prev => ({ ...prev, [key]: true }));
      try {
          const res = await taskFn();
          setResults(prev => ({ ...prev, [key]: res }));
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(prev => ({ ...prev, [key]: false }));
      }
  };

  // --- Actions ---
  const handleGenerateStrategy = () => runAiTask('strategy', () => generateCampaignStrategy(record));
  
  const handleGenerateChannel = () => runAiTask(`channel-${activeChannel}`, () => generateChannelContent(record, activeChannel));
  
  const handleGenerateInfluencer = () => runAiTask('influencer', () => generateInfluencerBrief(record));
  
  const handleGenerateVisuals = () => runAiTask('visuals', () => generateVisualDirectives(record));
  
  const handleAnalyzeReviews = () => {
      if (!reviewInput.trim()) return alert("请输入评论内容");
      runAiTask('insights', () => analyzeReviewSentiment(reviewInput, productName));
  };

  const handleCopy = (key: string) => {
      const text = results[key];
      if (text) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = text;
          navigator.clipboard.writeText(tempDiv.innerText);
          alert('内容已复制');
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex overflow-hidden border border-slate-200">
        
        {/* Sidebar Navigation */}
        <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3 text-white mb-1">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg">
                        <Megaphone size={20} />
                    </div>
                    <span className="font-bold text-lg tracking-wide">营销工坊</span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Marketing OS v3.0</p>
            </div>

            <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                    {record.imageUrl ? (
                        <img src={record.imageUrl} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                    ) : (
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center"><ShoppingBag size={16}/></div>
                    )}
                    <div className="min-w-0">
                        <div className="text-white font-bold text-sm truncate">{record.productName}</div>
                        <div className="text-xs text-slate-500 font-mono">{record.sku}</div>
                    </div>
                </div>
                <div className="flex gap-2 text-[10px]">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">{record.lifecycle}</span>
                    <span className="bg-indigo-900/50 px-2 py-0.5 rounded text-indigo-300 border border-indigo-500/30">ROI: {record.quantity > 0 ? 'High' : 'N/A'}</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <button onClick={() => setActiveTab('strategy')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'strategy' ? 'bg-indigo-600 text-white shadow-glow-purple' : 'hover:bg-white/5'}`}>
                    <Target size={18} /> 全案策划 (Strategy)
                </button>
                <button onClick={() => setActiveTab('channels')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'channels' ? 'bg-indigo-600 text-white shadow-glow-purple' : 'hover:bg-white/5'}`}>
                    <LayoutTemplate size={18} /> 多渠道内容 (Content)
                </button>
                <button onClick={() => setActiveTab('influencer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'influencer' ? 'bg-indigo-600 text-white shadow-glow-purple' : 'hover:bg-white/5'}`}>
                    <Users size={18} /> 达人建联 (Outreach)
                </button>
                <button onClick={() => setActiveTab('visuals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'visuals' ? 'bg-indigo-600 text-white shadow-glow-purple' : 'hover:bg-white/5'}`}>
                    <ImageIcon size={18} /> 视觉创意 (Visuals)
                </button>
                <button onClick={() => setActiveTab('insights')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-glow-purple' : 'hover:bg-white/5'}`}>
                    <MessageSquare size={18} /> 舆情洞察 (VOC)
                </button>
            </nav>

            <div className="p-4 border-t border-white/10">
                <button onClick={onClose} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors py-2">
                    <X size={16} /> 关闭面板
                </button>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            
            {/* Top Bar (Contextual) */}
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white shrink-0">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {activeTab === 'strategy' && <><Calendar className="text-purple-500"/> 营销战役规划</>}
                    {activeTab === 'channels' && <><LayoutTemplate className="text-blue-500"/> 多渠道内容矩阵</>}
                    {activeTab === 'influencer' && <><Users className="text-orange-500"/> 红人营销开发</>}
                    {activeTab === 'visuals' && <><ImageIcon className="text-pink-500"/> 视觉创意导演</>}
                    {activeTab === 'insights' && <><MessageSquare className="text-amber-500"/> 消费者舆情分析</>}
                </h2>
                
                {/* Channel Selector only for Channels tab */}
                {activeTab === 'channels' && (
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {[
                            {id: 'TikTok', icon: Video}, {id: 'Amazon', icon: ShoppingBag}, 
                            {id: 'Instagram', icon: Instagram}, {id: 'Email', icon: Mail}
                        ].map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setActiveChannel(c.id as any)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${activeChannel === c.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <c.icon size={14}/> {c.id}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50/50">
                
                {/* 1. STRATEGY TAB */}
                {activeTab === 'strategy' && (
                    <div className="max-w-4xl mx-auto">
                        {!results['strategy'] ? (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600">
                                    <Target size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">制定 4 周营销战役</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-8">
                                    AI 将根据产品生命周期 ({record.lifecycle})，为您规划从预热、爆发到长尾的完整营销节奏。
                                </p>
                                <button 
                                    onClick={handleGenerateStrategy} 
                                    disabled={loading['strategy']}
                                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50"
                                >
                                    {loading['strategy'] ? <Loader2 className="animate-spin"/> : <Sparkles />}
                                    {loading['strategy'] ? '正在规划战役...' : '生成全案计划'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={handleGenerateStrategy} className="text-xs text-indigo-600 hover:underline">重新生成</button>
                                    <button onClick={() => handleCopy('strategy')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><Copy size={12}/> 复制</button>
                                </div>
                                <div className="prose max-w-none bg-white p-8 rounded-2xl shadow-sm border border-slate-100 marketing-content-wrapper" dangerouslySetInnerHTML={{ __html: results['strategy'] }} />
                            </div>
                        )}
                    </div>
                )}

                {/* 2. CHANNELS TAB */}
                {activeTab === 'channels' && (
                    <div className="max-w-4xl mx-auto">
                        {!results[`channel-${activeChannel}`] ? (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                                    <LayoutTemplate size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">生成 {activeChannel} 专属内容</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-8">
                                    {activeChannel === 'TikTok' && '生成爆款短视频分镜脚本。'}
                                    {activeChannel === 'Amazon' && '优化 Listing 标题与五点描述。'}
                                    {activeChannel === 'Instagram' && '生成高互动贴文与 Hashtags。'}
                                    {activeChannel === 'Email' && '撰写高转化率的营销邮件。'}
                                </p>
                                <button 
                                    onClick={handleGenerateChannel} 
                                    disabled={loading[`channel-${activeChannel}`]}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50"
                                >
                                    {loading[`channel-${activeChannel}`] ? <Loader2 className="animate-spin"/> : <Wand2 />}
                                    开始生成
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={handleGenerateChannel} className="text-xs text-blue-600 hover:underline">重新生成</button>
                                    <button onClick={() => handleCopy(`channel-${activeChannel}`)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><Copy size={12}/> 复制</button>
                                </div>
                                <div className="prose max-w-none bg-white p-8 rounded-2xl shadow-sm border border-slate-100 marketing-content-wrapper" dangerouslySetInnerHTML={{ __html: results[`channel-${activeChannel}`] || '' }} />
                            </div>
                        )}
                    </div>
                )}

                {/* 3. INFLUENCER TAB */}
                {activeTab === 'influencer' && (
                    <div className="max-w-4xl mx-auto">
                        {!results['influencer'] ? (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
                                    <Users size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">红人建联开发</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-8">
                                    自动生成专业的合作开发信 (Outreach DM) 以及 创作简报 (Creative Brief)，提高红人回复率。
                                </p>
                                <button 
                                    onClick={handleGenerateInfluencer} 
                                    disabled={loading['influencer']}
                                    className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50"
                                >
                                    {loading['influencer'] ? <Loader2 className="animate-spin"/> : <Mail />}
                                    生成开发信 & 简报
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={handleGenerateInfluencer} className="text-xs text-orange-600 hover:underline">重新生成</button>
                                    <button onClick={() => handleCopy('influencer')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><Copy size={12}/> 复制</button>
                                </div>
                                <div className="prose max-w-none bg-white p-8 rounded-2xl shadow-sm border border-slate-100 marketing-content-wrapper" dangerouslySetInnerHTML={{ __html: results['influencer'] || '' }} />
                            </div>
                        )}
                    </div>
                )}

                {/* 4. VISUALS TAB */}
                {activeTab === 'visuals' && (
                    <div className="max-w-4xl mx-auto">
                        {!results['visuals'] ? (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-600">
                                    <ImageIcon size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">AI 视觉创意导演</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-8">
                                    生成适用于 Midjourney / Stable Diffusion 的高质量提示词 (Prompts)，包含生活场景、白底图及创意概念。
                                </p>
                                <button 
                                    onClick={handleGenerateVisuals} 
                                    disabled={loading['visuals']}
                                    className="bg-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-pink-700 transition-all shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50"
                                >
                                    {loading['visuals'] ? <Loader2 className="animate-spin"/> : <Sparkles />}
                                    生成视觉提示词
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={handleGenerateVisuals} className="text-xs text-pink-600 hover:underline">重新生成</button>
                                    <button onClick={() => handleCopy('visuals')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><Copy size={12}/> 复制</button>
                                </div>
                                <div className="prose max-w-none bg-white p-8 rounded-2xl shadow-sm border border-slate-100 marketing-content-wrapper" dangerouslySetInnerHTML={{ __html: results['visuals'] || '' }} />
                            </div>
                        )}
                    </div>
                )}

                {/* 5. INSIGHTS TAB */}
                {activeTab === 'insights' && (
                    <div className="max-w-4xl mx-auto h-full flex flex-col">
                        {!results['insights'] ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-10">
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                                    <MessageSquare size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-6">竞品舆情分析 (VOC)</h3>
                                <div className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <textarea 
                                        className="w-full h-32 p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none mb-4 bg-slate-50"
                                        placeholder="请在此粘贴 5-10 条有代表性的竞品评论..."
                                        value={reviewInput}
                                        onChange={(e) => setReviewInput(e.target.value)}
                                    ></textarea>
                                    <button 
                                        onClick={handleAnalyzeReviews}
                                        disabled={loading['insights'] || !reviewInput.trim()}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-100 disabled:opacity-50"
                                    >
                                        {loading['insights'] ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                                        {loading['insights'] ? '正在分析舆情...' : '开始挖掘痛点'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => setResults(prev => ({...prev, insights: null}))} className="text-xs text-amber-600 hover:underline">分析新数据</button>
                                    <button onClick={() => handleCopy('insights')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><Copy size={12}/> 复制</button>
                                </div>
                                <div className="prose max-w-none bg-white p-8 rounded-2xl shadow-sm border border-slate-100 marketing-content-wrapper" dangerouslySetInnerHTML={{ __html: results['insights'] || '' }} />
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};