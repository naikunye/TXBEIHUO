
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ArrowRight, 
  Home, 
  List, 
  PieChart, 
  Calculator, 
  Sparkles, 
  Settings, 
  Plus, 
  Box,
  FileText
} from 'lucide-react';
import { ReplenishmentRecord } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
  onNavigate: (view: any) => void;
  onOpenRecord: (record: ReplenishmentRecord) => void;
  onAction: (action: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  records, 
  onNavigate, 
  onOpenRecord,
  onAction
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Define Groups
  const navigationItems = [
    { id: 'nav-home', label: '前往系统总览 (Dashboard)', icon: <Home size={16}/>, action: () => onNavigate('overview') },
    { id: 'nav-list', label: '前往备货清单 (Inventory)', icon: <List size={16}/>, action: () => onNavigate('inventory') },
    { id: 'nav-analytics', label: '前往数据分析 (Analytics)', icon: <PieChart size={16}/>, action: () => onNavigate('analytics') },
    { id: 'nav-marketing', label: 'AI 营销中心 (Marketing)', icon: <Sparkles size={16}/>, action: () => onNavigate('marketing') },
    { id: 'nav-calc', label: '打开工具箱 (Tools)', icon: <Calculator size={16}/>, action: () => onNavigate('calculator') },
  ];

  const actionItems = [
    { id: 'act-add', label: '新建备货计划 (Add Product)', icon: <Plus size={16}/>, action: () => onAction('add_product') },
    { id: 'act-settings', label: '打开系统设置 (Settings)', icon: <Settings size={16}/>, action: () => onAction('open_settings') },
  ];

  // Filter Logic
  const filteredNav = navigationItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));
  const filteredActions = actionItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));
  const filteredRecords = records.filter(r => 
    r.productName.toLowerCase().includes(query.toLowerCase()) || 
    r.sku.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5); // Limit to 5 products

  const allItems = [
    ...filteredNav.map(i => ({ type: 'nav', ...i })),
    ...filteredActions.map(i => ({ type: 'action', ...i })),
    ...filteredRecords.map(r => ({ type: 'record', id: r.id, label: r.productName, subLabel: r.sku, icon: <Box size={16}/>, data: r }))
  ];

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = allItems[selectedIndex];
        if (selected) {
          if (selected.type === 'record') {
            onOpenRecord((selected as any).data);
          } else {
            (selected as any).action();
          }
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allItems, selectedIndex, onClose, onOpenRecord]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-gray-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[60vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center p-4 border-b border-gray-100">
          <Search className="text-gray-400 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-lg outline-none placeholder-gray-400 text-gray-800"
            placeholder="输入命令或搜索产品..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <div className="hidden sm:flex items-center gap-1">
             <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-sans text-gray-500">esc</kbd>
          </div>
        </div>

        <div className="overflow-y-auto p-2" ref={listRef}>
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">未找到相关结果</div>
          ) : (
            <div className="space-y-1">
               {/* Sections headers could be added here if we wanted to visually separate groups explicitly, 
                   but a flat list often feels faster for command palettes. */}
               
               {allItems.map((item, idx) => (
                 <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                        if (item.type === 'record') onOpenRecord((item as any).data);
                        else (item as any).action();
                        onClose();
                    }}
                    className={`flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                      idx === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                 >
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${idx === selectedIndex ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            {item.icon}
                        </div>
                        <div>
                            <div className={`text-sm font-medium ${idx === selectedIndex ? 'text-blue-900' : 'text-gray-700'}`}>
                                {item.label}
                            </div>
                            {(item as any).subLabel && (
                                <div className={`text-xs ${idx === selectedIndex ? 'text-blue-400' : 'text-gray-400'}`}>
                                    SKU: {(item as any).subLabel}
                                </div>
                            )}
                        </div>
                    </div>
                    {idx === selectedIndex && <ArrowRight size={16} className="text-blue-400 animate-pulse"/>}
                 </div>
               ))}
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
            <div className="flex gap-3">
                <span><strong className="font-medium text-gray-500">↑↓</strong> 选择</span>
                <span><strong className="font-medium text-gray-500">↵</strong> 确认</span>
            </div>
            <span>探行科技智能系统</span>
        </div>
      </div>
    </div>
  );
};
