
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { ReplenishmentRecord } from '../types';
import { askAiAssistant } from '../services/geminiService';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose, records }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
        id: 'welcome',
        role: 'model',
        content: '你好！我是探行供应链 AI 助手。我可以帮您分析库存、查询利润或提供补货建议。请问有什么可以帮您？',
        timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        // Convert internal message format to simple history for API
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        
        const responseText = await askAiAssistant(userMsg.content, records, history);
        
        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
    } catch (error) {
        const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: "抱歉，我现在遇到一点连接问题，请稍后再试。",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  const clearHistory = () => {
      setMessages([{
        id: 'welcome',
        role: 'model',
        content: '对话已重置。您可以随时向我提问关于当前库存的问题。',
        timestamp: new Date()
      }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end sm:items-end pointer-events-none">
       {/* Backdrop only on mobile */}
       <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] sm:hidden pointer-events-auto" onClick={onClose}></div>

       {/* Chat Window */}
       <div className="bg-white w-full h-full sm:w-[400px] sm:h-[600px] sm:mr-6 sm:mb-6 sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto border border-gray-200 animate-slide-up overflow-hidden">
          
          {/* Header */}
          <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
             <div className="flex items-center gap-3">
                 <div className="bg-purple-600 p-2 rounded-lg relative">
                    <Bot size={20} className="text-white" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                 </div>
                 <div>
                    <h3 className="font-bold text-sm">探行 AI Copilot</h3>
                    <p className="text-[10px] text-slate-400">基于实时库存数据</p>
                 </div>
             </div>
             <div className="flex items-center gap-1">
                 <button onClick={clearHistory} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors" title="清空记录">
                    <Trash2 size={16} />
                 </button>
                 <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
             </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
              {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                              {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                          </div>
                          
                          {/* Bubble */}
                          <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                          }`}>
                              {msg.content}
                          </div>
                      </div>
                  </div>
              ))}
              {isLoading && (
                  <div className="flex justify-start">
                      <div className="flex gap-2 max-w-[85%]">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-1">
                              <Bot size={16} />
                          </div>
                          <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                              <Loader2 size={14} className="animate-spin text-purple-500" />
                              <span className="text-xs text-gray-400">思考中...</span>
                          </div>
                      </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSend} className="relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="问点什么... 例如: 哪个产品利润最高?"
                    className="w-full pl-4 pr-12 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 text-sm text-black placeholder-gray-500 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors shadow-md"
                  >
                      <Send size={16} />
                  </button>
              </form>
          </div>

       </div>
    </div>
  );
};
