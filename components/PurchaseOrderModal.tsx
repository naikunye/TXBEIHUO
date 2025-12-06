
import React, { useState } from 'react';
import { ReplenishmentRecord, PurchaseOrder } from '../types';
import { X, FileText, Send, Printer, Copy, Loader2, Factory, Mail, Package, CheckCircle, Save } from 'lucide-react';
import { generatePurchaseOrderEmail } from '../services/geminiService';
import { formatCurrency } from '../utils/calculations';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ReplenishmentRecord | null;
  onCreateOrder: (order: PurchaseOrder) => void; // New Prop
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ isOpen, onClose, record, onCreateOrder }) => {
  const [orderQty, setOrderQty] = useState(0);
  const [emailDraft, setEmailDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize state when record changes
  React.useEffect(() => {
      if (record) {
          // Default logic: If existing stock is low, suggest a new batch (e.g. 500 or double current)
          // For simplicity, default to 500 or user can edit.
          setOrderQty(Math.max(record.quantity, 100)); 
          setEmailDraft('');
      }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const totalAmount = orderQty * record.unitPriceCNY;

  const handleGenerateEmail = async () => {
      setIsGenerating(true);
      const draft = await generatePurchaseOrderEmail(record, orderQty);
      setEmailDraft(draft);
      setIsGenerating(false);
  };

  const handleCopyEmail = () => {
      navigator.clipboard.writeText(emailDraft);
      alert("邮件内容已复制");
  };

  const handlePrintPO = () => {
      window.print();
  };

  const handleConfirmOrder = () => {
      const newOrder: PurchaseOrder = {
          id: Date.now().toString(),
          poNumber: `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${record.sku}`,
          date: new Date().toISOString().split('T')[0],
          sku: record.sku,
          productName: record.productName,
          supplierName: record.supplierName,
          quantity: orderQty,
          unitPriceCNY: record.unitPriceCNY,
          totalAmountCNY: totalAmount,
          status: 'Ordered', // Default to Ordered when manually creating
          trackingNumber: '',
      };
      onCreateOrder(newOrder);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-lg">
                    <FileText size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">采购单生成器 (PO Generator)</h2>
                    <p className="text-slate-400 text-xs">CRM & 供应商管理</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 flex flex-col md:flex-row gap-8">
            
            {/* Left: PO Details */}
            <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">采购订单详情</h3>
                        <p className="text-xs text-gray-500">PO-{new Date().toISOString().slice(0,10).replace(/-/g,'')}-{record.sku}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-gray-500 uppercase">Supplier</div>
                        <div className="text-sm font-bold text-blue-600 flex items-center justify-end gap-1">
                            <Factory size={14}/> {record.supplierName || '未填写供应商'}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 flex-1">
                    <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            {record.imageUrl ? <img src={record.imageUrl} className="w-full h-full object-cover rounded-lg" /> : <Package className="text-gray-300"/>}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">{record.productName}</h4>
                            <p className="text-xs text-gray-500 font-mono mb-1">{record.sku}</p>
                            <p className="text-xs text-gray-500">当前单价: {formatCurrency(record.unitPriceCNY, 'CNY')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">采购数量 (Units)</label>
                            <input 
                                type="number" 
                                value={orderQty} 
                                onChange={(e) => setOrderQty(parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded p-2 text-sm font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">预计总额 (Total)</label>
                            <div className="w-full border border-transparent p-2 text-sm font-bold text-orange-600">
                                {formatCurrency(totalAmount, 'CNY')}
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handlePrintPO}
                        className="w-full py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                        <Printer size={16}/> 打印 / 下载 PDF
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                    <button 
                        onClick={handleConfirmOrder}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-base font-bold hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95"
                    >
                        <Save size={18} />
                        确认下单并保存
                    </button>
                    <p className="text-[10px] text-center text-gray-400 mt-2">
                        保存后可在“采购管理”中跟踪进度
                    </p>
                </div>
            </div>

            {/* Right: AI Email Draft */}
            <div className="flex-1 flex flex-col">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Mail size={18} className="text-purple-600" />
                            AI 议价邮件助手
                        </h3>
                        <button 
                            onClick={handleGenerateEmail}
                            disabled={isGenerating}
                            className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-1"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={12}/> : <Send size={12}/>}
                            生成草稿
                        </button>
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4 relative group overflow-hidden">
                        {emailDraft ? (
                            <textarea 
                                className="w-full h-full bg-transparent outline-none text-sm text-gray-700 resize-none font-sans leading-relaxed"
                                value={emailDraft}
                                onChange={(e) => setEmailDraft(e.target.value)}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                <p>点击“生成草稿”</p>
                                <p className="text-xs mt-1">AI 将根据采购量自动撰写商务邮件</p>
                            </div>
                        )}
                        
                        {emailDraft && (
                            <button 
                                onClick={handleCopyEmail}
                                className="absolute bottom-4 right-4 bg-white shadow-md p-2 rounded-full text-gray-600 hover:text-blue-600 transition opacity-0 group-hover:opacity-100"
                                title="复制内容"
                            >
                                <Copy size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
