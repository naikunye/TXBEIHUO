
import React, { useState, useEffect } from 'react';
import { X, Copy, Wand2, Video, LayoutTemplate, Users, Image as ImageIcon, MessageSquare, Loader2, Play, Calendar, ShoppingBag, Instagram, Mail, Sparkles, Target, Megaphone, TrendingUp } from 'lucide-react';
import { ReplenishmentRecord } from '../types';
import { 
    generateVisualDirectives, 
    analyzeReviewSentiment, 
    generateCampaignStrategy, 
    generateChannelContent, 
    generateInfluencerBrief,
    generateSelectionStrategy
} from '../services/geminiService';

interface MarketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null; 
  productName: string;
  record?: ReplenishmentRecord | null;
  initialTab?: string;
  initialChannel?: string;
  records?: ReplenishmentRecord[];
}

type Tab = 'strategy' | 'channels' | 'influencer' | 'visuals' | 'insights' | 'selection';
type ChannelType = 'TikTok' | 'Amazon' | 'Instagram' | 'Email';

export const MarketingModal: React.FC<MarketingModalProps> = ({ 
    isOpen, 
    onClose, 
    content, // Legacy content prop, used as fallback for 'channels' tab
    productName, 
    record,
    initialTab,
    initialChannel,
    records
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('channels');
  const [activeChannel, setActiveChannel] = useState<ChannelType>('TikTok');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string | null>>({});
  const [reviewInput, setReviewInput] = useState('');

  // Initial Data Sync
  useEffect(() => {
      if (isOpen) {
          // If we passed in legacy 'content' (from App.tsx generation), put it in the cache for TikTok
          if (content) {
              setResults(prev => ({ ...prev, 'channel-TikTok': content }));
          }
          setActiveTab((initialTab as Tab) || 'channels');
          setActiveChannel((initialChannel as ChannelType) || 'TikTok');
          setReviewInput('');
      }
  }, [isOpen, content, initialTab, initialChannel]);

  if (!isOpen || !record) return null;

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

  const handleGenerateStrategy = () => runAiTask('strategy', () => generateCampaignStrategy(record));
  const handleGenerateChannel = () => runAiTask(`channel-${activeChannel}`, () => generateChannelContent(record, activeChannel));
  const handleGenerateInfluencer = () => runAiTask('influencer', () => generateInfluencerBrief(record));
  const handleGenerateVisuals = () => runAiTask('visuals', () => generateVisualDirectives(record));
  const handleGenerateSelection = () => runAiTask('selection', () => generateSelectionStrategy(records || [record]));
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

  const renderContent = (key: string, emptyIcon: any, emptyTitle: string, emptyDesc: string, btnAction: any, btnText: string) => {
      if (!results[key]) {
          return (
              <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500">
                      {emptyIcon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">{emptyTitle}</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-8">{emptyDesc}</p>
                  <button onClick={btnAction} disabled={loading[key]} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto disabled:opacity-50">
                      {loading[key] ? <Loader2 className="animate-spin"/> : <Sparkles />}
                      {loading[key] ? 'Generating...' : btnText}
                  </button>
              </div>
          );
      }
      return (
          <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                  <button onClick={btnAction} className="text-xs text-indigo-600 hover:underline">重新生成</button>
                  <button onClick={() => handleCopy(key)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><Copy size={12}/> 复制</button>
              </div>
              <div className="prose max-w-none bg-white p-8 rounded-2xl shadow-sm border border-slate-100 marketing-content-wrapper" dangerouslySetInnerHTML={{ __html: results[key] || '' }} />
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex overflow-hidden border border-slate-200">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3 text-white mb-1">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg"><Megaphone size={20} /></div>
                    <span className="font-bold text-lg">营销工坊</span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Marketing OS v3.0</p>
            </div>
            <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="font-bold text-white truncate">{record.productName}</div>
                <div className="text-xs text-slate-500 font-mono">{record.sku}</div>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {[
                    { id: 'strategy', icon: Target, label: '全案策划' },
                    { id: 'channels', icon: LayoutTemplate, label: '渠道内容' },
                    { id: 'influencer', icon: Users, label: '达人建联' },
                    { id: 'visuals', icon: ImageIcon, label: '视觉创意' },
                    { id: 'insights', icon: MessageSquare, label: '舆情洞察' },
                    { id: 'selection', icon: TrendingUp, label: '选品增长' },
                ].map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}>
                        <item.icon size={18} /> {item.label}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-white/10"><button onClick={onClose} className="w-full flex justify-center gap-2 text-slate-400 hover:text-white py-2"><X size={16} /> 关闭</button></div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white shrink-0">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {activeTab === 'strategy' && '营销战役规划'}
                    {activeTab === 'channels' && '多渠道内容矩阵'}
                    {activeTab === 'influencer' && '红人营销开发'}
                    {activeTab === 'visuals' && '视觉创意导演'}
                    {activeTab === 'insights' && '消费者舆情分析'}
                    {activeTab === 'selection' && '选品与增长策略'}
                </h2>
                {activeTab === 'channels' && (
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {[{id: 'TikTok', icon: Video}, {id: 'Amazon', icon: ShoppingBag}, {id: 'Instagram', icon: Instagram}, {id: 'Email', icon: Mail}].map(c => (
                            <button key={c.id} onClick={() => setActiveChannel(c.id as any)} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${activeChannel === c.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <c.icon size={14}/> {c.id}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50/50">
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'strategy' && renderContent('strategy', <Target size={40}/>, '制定 4 周营销战役', 'AI 将根据产品生命周期，为您规划从预热、爆发到长尾的完整营销节奏。', handleGenerateStrategy, '生成全案计划')}
                    
                    {activeTab === 'channels' && renderContent(`channel-${activeChannel}`, <LayoutTemplate size={40}/>, `生成 ${activeChannel} 内容`, '生成针对特定渠道优化的文案、脚本或邮件。', handleGenerateChannel, '开始生成')}
                    
                    {activeTab === 'influencer' && renderContent('influencer', <Users size={40}/>, '红人建联开发', '自动生成专业的合作开发信 (Outreach DM) 以及创作简报。', handleGenerateInfluencer, '生成开发信 & 简报')}
                    
                    {activeTab === 'visuals' && renderContent('visuals', <ImageIcon size={40}/>, 'AI 视觉创意导演', '生成适用于 Midjourney / SD 的高质量提示词。', handleGenerateVisuals, '生成视觉提示词')}
                    
                    {activeTab === 'selection' && renderContent('selection', <TrendingUp size={40}/>, 'AI 选品与增长策略', '深度分析现有爆品基因 (DNA)，结合美国市场趋势，推荐高潜力关联品类。', handleGenerateSelection, '生成增长报告')}

                    {activeTab === 'insights' && (
                        !results['insights'] ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-10">
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600"><MessageSquare size={32} /></div>
                                <h3 className="text-xl font-bold text-slate-800 mb-6">竞品舆情分析 (VOC)</h3>
                                <div className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <textarea className="w-full h-32 p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-200 outline-none resize-none mb-4 bg-slate-50" placeholder="请粘贴 5-10 条竞品评论..." value={reviewInput} onChange={(e) => setReviewInput(e.target.value)}></textarea>
                                    <button onClick={handleAnalyzeReviews} disabled={loading['insights'] || !reviewInput.trim()} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                        {loading['insights'] ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                                        {loading['insights'] ? '分析中...' : '开始挖掘痛点'}
                                    </button>
                                </div>
                            </div>
                        ) : renderContent('insights', null, '', '', handleAnalyzeReviews, '')
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
