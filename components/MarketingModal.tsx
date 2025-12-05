
import React from 'react';
import { X, Copy, Wand2, Video, FileText, Mic } from 'lucide-react';

interface MarketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null;
  productName: string;
}

export const MarketingModal: React.FC<MarketingModalProps> = ({ isOpen, onClose, content, productName }) => {
  if (!isOpen) return null;

  const handleCopy = () => {
      // Create a temporary element to copy text content (stripping HTML tags for simple copy if needed, 
      // or just copy raw text. Here we try to copy the visible text)
      if (content) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        navigator.clipboard.writeText(tempDiv.innerText);
        alert('内容已复制到剪贴板');
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Wand2 size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">AI 营销内容引擎</h2>
                    <p className="text-indigo-100 text-sm opacity-90">为 {productName} 生成的专属内容</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/90" title="复制全部内容">
                    <Copy size={20} />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
            {content ? (
                <div 
                    className="prose max-w-none marketing-content-wrapper"
                    dangerouslySetInnerHTML={{ __html: content }} 
                />
            ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <Wand2 size={48} className="mb-4 animate-pulse text-indigo-300" />
                    <p>正在施展 AI 魔法...</p>
                </div>
            )}
        </div>
        
        {/* Footer Hints */}
        <div className="bg-white border-t border-gray-100 p-4 flex justify-around text-xs text-gray-500 shrink-0">
             <div className="flex items-center gap-2">
                 <Video size={14} className="text-indigo-500"/>
                 <span>TikTok 脚本</span>
             </div>
             <div className="flex items-center gap-2">
                 <FileText size={14} className="text-purple-500"/>
                 <span>SEO Listing</span>
             </div>
             <div className="flex items-center gap-2">
                 <Mic size={14} className="text-pink-500"/>
                 <span>直播话术</span>
             </div>
        </div>

      </div>
    </div>
  );
};
