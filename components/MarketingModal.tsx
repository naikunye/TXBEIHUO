
import React, { useState, useEffect } from 'react';
import { X, Copy, Wand2, Video, FileText, Mic, Image as ImageIcon, MessageSquare, Loader2, Play } from 'lucide-react';
import { ReplenishmentRecord } from '../types';
import { generateVisualDirectives, analyzeReviewSentiment } from '../services/geminiService';

interface MarketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null; // The initial Copy content
  productName: string;
  record?: ReplenishmentRecord | null; // Now accepts full record for advanced features
}

type Tab = 'copy' | 'visuals' | 'insights';

export const MarketingModal: React.FC<MarketingModalProps> = ({ isOpen, onClose, content, productName, record }) => {
  const [activeTab, setActiveTab] = useState<Tab>('copy');
  
  // Visuals State
  const [visualContent, setVisualContent] = useState<string | null>(null);
  const [isVisualLoading, setIsVisualLoading] = useState(false);

  // Insights State
  const [reviewInput, setReviewInput] = useState('');
  const [insightContent, setInsightContent] = useState<string | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  // Initial Content Sync
  const [localCopyContent, setLocalCopyContent] = useState<string | null>(null);

  useEffect(() => {
      if (isOpen) {
          setLocalCopyContent(content);
          setActiveTab('copy');
          // Reset other tabs
          setVisualContent(null);
          setInsightContent(null);
          setReviewInput('');
      }
  }, [isOpen, content]);

  if (!isOpen) return null;

  const handleCopy = (text: string | null) => {
      if (text) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        navigator.clipboard.writeText(tempDiv.innerText);
        alert('内容已复制到剪贴板');
      }
  };

  const handleGenerateVisuals = async () => {
      if (!record) return;
      setIsVisualLoading(true);
      const res = await generateVisualDirectives(record);
      setVisualContent(res);
      setIsVisualLoading(false);
  };

  const handleAnalyzeReviews = async () => {
      if (!reviewInput.trim()) {
          alert("请先粘贴竞品评论");
          return;
      }
      setIsInsightLoading(true);
      const res = await analyzeReviewSentiment(reviewInput, productName);
      setInsightContent(res);
      setIsInsightLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-5 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                    <Wand2 size={24} className="text-purple-300" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-wide">AI 营销指挥中心</h2>
                    <p className="text-indigo-200 text-xs opacity-90">{productName}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
            <button 
                onClick={() => setActiveTab('copy')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'copy' ? 'border-purple-600 text-purple-600 bg-purple-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            >
                <FileText size={16} /> 文案生成 (Copy)
            </button>
            <button 
                onClick={() => setActiveTab('visuals')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'visuals' ? 'border-pink-600 text-pink-600 bg-pink-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            >
                <ImageIcon size={16} /> 视觉导演 (Visuals)
            </button>
            <button 
                onClick={() => setActiveTab('insights')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'insights' ? 'border-amber-600 text-amber-600 bg-amber-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            >
                <MessageSquare size={16} /> 舆情洞察 (VOC)
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-gray-50">
            
            {/* Tab 1: Copy */}
            {activeTab === 'copy' && (
                <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                    {localCopyContent ? (
                        <div 
                            className="prose max-w-none marketing-content-wrapper"
                            dangerouslySetInnerHTML={{ __html: localCopyContent }} 
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Wand2 size={48} className="mb-4 animate-pulse text-indigo-300" />
                            <p>正在生成文案...</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Visuals */}
            {activeTab === 'visuals' && (
                <div className="h-full overflow-y-auto p-8 custom-scrollbar bg-gray-900 text-white">
                    {!visualContent ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <ImageIcon size={64} className="mb-6 text-pink-500 opacity-50" />
                            <h3 className="text-xl font-bold mb-2">AI 视觉创意导演</h3>
                            <p className="text-gray-400 text-sm max-w-md text-center mb-8">
                                基于产品特性，生成适用于 Midjourney / Stable Diffusion 的专业提示词 (Prompts)。
                                <br/>包含生活场景图、白底电商图及创意概念图。
                            </p>
                            <button 
                                onClick={handleGenerateVisuals}
                                disabled={isVisualLoading}
                                className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-pink-900/50"
                            >
                                {isVisualLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                                {isVisualLoading ? '构思画面中...' : '生成视觉提示词'}
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                                <h3 className="text-xl font-bold text-pink-400">视觉创意方案</h3>
                                <button onClick={() => setVisualContent(null)} className="text-xs text-gray-500 hover:text-white underline">重新生成</button>
                            </div>
                            <div 
                                className="prose max-w-none prose-invert marketing-content-wrapper"
                                dangerouslySetInnerHTML={{ __html: visualContent }} 
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Insights (VOC) */}
            {activeTab === 'insights' && (
                <div className="h-full flex flex-col">
                    {!insightContent ? (
                        <div className="flex-1 p-8 flex flex-col items-center justify-center bg-amber-50/30">
                            <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
                                <div className="text-center mb-6">
                                    <div className="inline-flex bg-amber-100 p-3 rounded-full text-amber-600 mb-3">
                                        <MessageSquare size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">竞品舆情分析 (VOC)</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        粘贴竞品评论 (Reviews)，AI 将自动挖掘用户痛点与机会点。
                                    </p>
                                </div>
                                <textarea 
                                    className="w-full h-40 p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none mb-4"
                                    placeholder="请在此粘贴 5-10 条有代表性的竞品评论..."
                                    value={reviewInput}
                                    onChange={(e) => setReviewInput(e.target.value)}
                                ></textarea>
                                <button 
                                    onClick={handleAnalyzeReviews}
                                    disabled={isInsightLoading || !reviewInput.trim()}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-100"
                                >
                                    {isInsightLoading ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                                    {isInsightLoading ? '正在分析舆情...' : '开始挖掘痛点'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                             <div className="max-w-3xl mx-auto">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                                    <h3 className="text-xl font-bold text-amber-700">VOC 洞察报告</h3>
                                    <button onClick={() => setInsightContent(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">分析新数据</button>
                                </div>
                                <div 
                                    className="prose max-w-none marketing-content-wrapper"
                                    dangerouslySetInnerHTML={{ __html: insightContent }} 
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
        
        {/* Footer Actions (Context Aware) */}
        <div className="bg-white border-t border-gray-100 p-4 flex justify-between items-center text-xs text-gray-500 shrink-0">
             <div className="flex items-center gap-4">
                 {activeTab === 'copy' && <span className="flex items-center gap-1"><Video size={12}/> TikTok 脚本</span>}
                 {activeTab === 'visuals' && <span className="flex items-center gap-1"><ImageIcon size={12}/> Midjourney / SD</span>}
                 {activeTab === 'insights' && <span className="flex items-center gap-1"><MessageSquare size={12}/> 痛点挖掘</span>}
             </div>
             
             <button 
                onClick={() => {
                    if (activeTab === 'copy') handleCopy(localCopyContent);
                    if (activeTab === 'visuals') handleCopy(visualContent);
                    if (activeTab === 'insights') handleCopy(insightContent);
                }} 
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
            >
                <Copy size={16} /> 复制当前内容
            </button>
        </div>

      </div>
    </div>
  );
};
