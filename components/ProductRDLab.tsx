
import React, { useState } from 'react';
import { ProductIdea, IdeaStage } from '../types';
import { Plus, X, ArrowRight, Beaker, Lightbulb, DollarSign, PenTool, Image as ImageIcon, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { analyzeProductConcept } from '../services/geminiService';

const STAGES: { id: IdeaStage; label: string; color: string; icon: any }[] = [
    { id: 'Concept', label: '灵感收集', color: 'bg-blue-500', icon: Lightbulb },
    { id: 'Sampling', label: '打样中', color: 'bg-purple-500', icon: Beaker },
    { id: 'Costing', label: '核价/议价', color: 'bg-orange-500', icon: DollarSign },
    { id: 'Approved', label: '立项投产', color: 'bg-emerald-500', icon: PenTool },
];

export const ProductRDLab: React.FC = () => {
  const [ideas, setIdeas] = useState<ProductIdea[]>(() => {
      try {
          const saved = localStorage.getItem('tanxing_product_ideas');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<Partial<ProductIdea>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const saveIdeas = (newIdeas: ProductIdea[]) => {
      setIdeas(newIdeas);
      localStorage.setItem('tanxing_product_ideas', JSON.stringify(newIdeas));
  };

  const handleAddIdea = () => {
      if (!currentIdea.name) return;
      const newIdea: ProductIdea = {
          id: currentIdea.id || Date.now().toString(),
          name: currentIdea.name,
          description: currentIdea.description || '',
          stage: currentIdea.stage || 'Concept',
          createdAt: new Date().toISOString(),
          imageUrl: currentIdea.imageUrl,
          targetPriceUSD: currentIdea.targetPriceUSD,
          estimatedCostCNY: currentIdea.estimatedCostCNY,
          aiAnalysis: currentIdea.aiAnalysis
      };
      
      if (currentIdea.id) {
          saveIdeas(ideas.map(i => i.id === newIdea.id ? newIdea : i));
      } else {
          saveIdeas([...ideas, newIdea]);
      }
      setIsModalOpen(false);
      setCurrentIdea({});
  };

  const deleteIdea = (id: string) => {
      if (confirm('确认删除此创意？')) {
          saveIdeas(ideas.filter(i => i.id !== id));
      }
  };

  const moveStage = (idea: ProductIdea, direction: 'next' | 'prev') => {
      const idx = STAGES.findIndex(s => s.id === idea.stage);
      if (idx === -1) return;
      const newIdx = direction === 'next' ? Math.min(idx + 1, STAGES.length - 1) : Math.max(idx - 1, 0);
      const newStage = STAGES[newIdx].id;
      if (newStage !== idea.stage) {
          saveIdeas(ideas.map(i => i.id === idea.id ? { ...i, stage: newStage } : i));
      }
  };

  const handleAiAnalysis = async () => {
      if (!currentIdea.description && !currentIdea.name) {
          alert("请输入产品名称或描述");
          return;
      }
      setIsAnalyzing(true);
      const res = await analyzeProductConcept(
          `Product Name: ${currentIdea.name}. Description: ${currentIdea.description}`,
          currentIdea.imageUrl
      );
      setCurrentIdea(prev => ({ ...prev, aiAnalysis: res }));
      setIsAnalyzing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setCurrentIdea(prev => ({ ...prev, imageUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in relative bg-slate-900 overflow-hidden rounded-3xl border border-white/5">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Header */}
        <div className="relative z-10 p-6 flex justify-between items-center border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
            <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3 text-glow">
                    <Beaker className="text-cyan-400" size={28} />
                    新品研发实验室 (Product R&D Lab)
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">From Zero to One // 孵化中心</p>
            </div>
            <button 
                onClick={() => { setCurrentIdea({}); setIsModalOpen(true); }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-glow-cyan flex items-center gap-2 transition-all active:scale-95"
            >
                <Plus size={18} /> 新建立项
            </button>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-6 relative z-10">
            <div className="flex gap-6 h-full min-w-[1000px]">
                {STAGES.map(stage => {
                    const items = ideas.filter(i => i.stage === stage.id);
                    const Icon = stage.icon;
                    return (
                        <div key={stage.id} className="flex-1 flex flex-col bg-slate-800/40 rounded-2xl border border-white/5 overflow-hidden">
                            <div className={`p-4 border-b border-white/5 flex justify-between items-center bg-white/5`}>
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${stage.color} bg-opacity-20 text-white`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="font-bold text-slate-200 text-sm">{stage.label}</span>
                                </div>
                                <span className="text-xs font-mono text-slate-500 bg-black/20 px-2 py-0.5 rounded">{items.length}</span>
                            </div>
                            
                            <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                                {items.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => { setCurrentIdea(item); setIsModalOpen(true); }}
                                        className="bg-slate-700/50 p-4 rounded-xl border border-white/5 hover:border-cyan-500/50 hover:bg-slate-700 transition-all cursor-pointer group relative"
                                    >
                                        <div className="flex gap-3 mb-3">
                                            <div className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Lightbulb size={20} className="text-slate-500"/>}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                                                <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                                            </div>
                                        </div>
                                        
                                        {/* Status Indicators */}
                                        <div className="flex gap-2 mb-3">
                                            {item.targetPriceUSD && <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-800 font-mono">${item.targetPriceUSD}</span>}
                                            {item.estimatedCostCNY && <span className="text-[10px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded border border-orange-800 font-mono">¥{item.estimatedCostCNY}</span>}
                                            {item.aiAnalysis && <span className="text-[10px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded border border-purple-800 flex items-center gap-1"><Sparkles size={8}/> AI Insight</span>}
                                        </div>

                                        {/* Hover Controls */}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); deleteIdea(item.id); }} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white"><Trash2 size={12}/></button>
                                        </div>

                                        {/* Move Controls */}
                                        <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveStage(item, 'prev'); }}
                                                disabled={stage.id === 'Concept'}
                                                className="text-[10px] text-slate-500 hover:text-white disabled:opacity-0"
                                            >
                                                &larr; Back
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveStage(item, 'next'); }}
                                                disabled={stage.id === 'Approved'}
                                                className="text-[10px] text-cyan-400 hover:text-white font-bold disabled:opacity-0"
                                            >
                                                Next &rarr;
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Idea Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-slate-900 rounded-2xl shadow-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <PenTool className="text-cyan-400"/> 
                            {currentIdea.id ? '编辑创意档案' : '新建产品创意'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                        {/* Left: Form */}
                        <div className="flex-1 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">产品名称 (Codename)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none"
                                    value={currentIdea.name || ''}
                                    onChange={e => setCurrentIdea({...currentIdea, name: e.target.value})}
                                    placeholder="e.g. Project Titan"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">目标售价 ($)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none font-mono"
                                        value={currentIdea.targetPriceUSD || ''}
                                        onChange={e => setCurrentIdea({...currentIdea, targetPriceUSD: parseFloat(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">预估成本 (¥)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none font-mono"
                                        value={currentIdea.estimatedCostCNY || ''}
                                        onChange={e => setCurrentIdea({...currentIdea, estimatedCostCNY: parseFloat(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">创意描述 / 痛点</label>
                                <textarea 
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none h-32 resize-none text-sm"
                                    placeholder="解决了什么问题？目标人群是谁？"
                                    value={currentIdea.description || ''}
                                    onChange={e => setCurrentIdea({...currentIdea, description: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">参考图 / 设计稿</label>
                                <div className="flex items-center gap-4">
                                    <label className="w-24 h-24 bg-slate-800 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors">
                                        {currentIdea.imageUrl ? (
                                            <img src={currentIdea.imageUrl} className="w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            <ImageIcon className="text-slate-500" />
                                        )}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                    <div className="text-xs text-slate-500">
                                        上传竞品图或草图，<br/>AI 可辅助分析材质工艺。
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: AI Analysis */}
                        <div className="flex-1 bg-black/20 rounded-xl border border-white/5 p-5 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-purple-300 flex items-center gap-2">
                                    <Sparkles size={18} /> AI 选品参谋
                                </h4>
                                <button 
                                    onClick={handleAiAnalysis}
                                    disabled={isAnalyzing}
                                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                    {isAnalyzing ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>}
                                    {isAnalyzing ? '分析中...' : '深度分析'}
                                </button>
                            </div>
                            
                            <div className="flex-1 bg-slate-950/50 rounded-lg border border-white/5 p-4 overflow-y-auto custom-scrollbar relative">
                                {currentIdea.aiAnalysis ? (
                                    <div 
                                        className="prose prose-invert prose-sm max-w-none text-slate-300"
                                        dangerouslySetInnerHTML={{ __html: currentIdea.aiAnalysis }}
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center text-sm">
                                        <Lightbulb size={32} className="mb-2 opacity-20" />
                                        <p>填写描述并上传图片后<br/>点击“深度分析”获取专业建议</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-5 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5">取消</button>
                        <button onClick={handleAddIdea} className="px-6 py-2.5 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 shadow-lg">保存档案</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
