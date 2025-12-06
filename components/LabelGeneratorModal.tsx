
import React, { useState, useRef } from 'react';
import { ReplenishmentRecord } from '../types';
import { X, Printer, Box, QrCode, ArrowLeft, ArrowRight } from 'lucide-react';

interface LabelGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ReplenishmentRecord | null;
}

export const LabelGeneratorModal: React.FC<LabelGeneratorModalProps> = ({ isOpen, onClose, record }) => {
  const [startBox, setStartBox] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !record) return null;

  const totalBoxes = record.totalCartons || 1;
  // Calculate gross weight per box (approx)
  const singleBoxWeight = record.unitWeightKg * (record.itemsPerBox || 1);
  const shipmentId = `PO-${record.date.replace(/-/g, '')}-${record.id.substring(0, 4).toUpperCase()}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React state/events
    }
  };

  // Generate an array of box numbers based on total cartons
  const boxes = Array.from({ length: totalBoxes }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <Printer size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">箱唛生成器 (Label Generator)</h2>
                    <p className="text-slate-400 text-xs">生成标准外箱标签 | 适用于 FBA / TikTok Shop / 海外仓</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/50"
                >
                    <Printer size={18} /> 立即打印
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar Controls */}
            <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto hidden md:block">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Box size={18} className="text-blue-600"/> 货物信息
                </h3>
                
                <div className="space-y-4 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-xs text-gray-400 block mb-1">SKU</span>
                        <span className="font-mono font-bold text-gray-800 break-words">{record.sku}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <span className="text-xs text-gray-400 block mb-1">总箱数</span>
                            <span className="font-bold text-gray-800">{totalBoxes} 箱</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <span className="text-xs text-gray-400 block mb-1">单箱重</span>
                            <span className="font-bold text-gray-800">{singleBoxWeight.toFixed(2)} kg</span>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-xs text-gray-400 block mb-1">箱规 (cm)</span>
                        <span className="font-mono text-gray-800">
                            {record.boxLengthCm || 0} x {record.boxWidthCm || 0} x {record.boxHeightCm || 0}
                        </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-xs text-gray-400 block mb-1">目的仓库</span>
                        <span className="font-bold text-gray-800 break-words">{record.warehouse || 'N/A'}</span>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-lg text-xs leading-relaxed border border-blue-100">
                        <strong>打印提示：</strong><br/>
                        建议使用 100x100mm 热敏纸打印。<br/>
                        打印时请在浏览器设置中取消“页眉和页脚”，并将边距设为“无”。
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-gray-200 p-8 overflow-y-auto flex justify-center">
                <div ref={printRef} className="print-area space-y-8">
                    <style>{`
                        @media print {
                            @page { margin: 0; size: 100mm 100mm; }
                            body { background: white; -webkit-print-color-adjust: exact; }
                            .print-area { padding: 0; margin: 0; display: block; }
                            .label-page { page-break-after: always; margin: 0; width: 100mm; height: 100mm; border: none !important; }
                        }
                    `}</style>

                    {boxes.map((boxNum) => (
                        <div 
                            key={boxNum} 
                            className="label-page bg-white w-[100mm] h-[100mm] border-2 border-dashed border-gray-300 mx-auto relative flex flex-col p-4 shadow-xl box-border"
                            style={{ width: '378px', height: '378px' }} // Approx 100mm @ 96dpi for screen preview
                        >
                            {/* Label Header */}
                            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                                <div>
                                    <h1 className="text-xl font-bold uppercase tracking-wider">Ship To:</h1>
                                    <p className="text-sm font-bold leading-tight max-w-[200px]">{record.warehouse || 'FBA WAREHOUSE'}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-sm font-bold text-gray-500">FBA / TikTok</h2>
                                    <p className="text-xs font-mono">{record.date}</p>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Shipment ID</p>
                                        <p className="text-sm font-mono font-bold">{shipmentId}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Box Weight</p>
                                        <p className="text-lg font-bold">{singleBoxWeight.toFixed(2)} KG</p>
                                    </div>
                                </div>

                                <div className="border-2 border-black p-2 my-1 text-center">
                                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">SKU / Product Name</p>
                                    <p className="text-lg font-bold leading-tight mb-1">{record.sku}</p>
                                    <p className="text-xs text-gray-800 line-clamp-1">{record.productName}</p>
                                </div>

                                <div className="flex-1 flex items-center justify-between gap-4">
                                    <div className="flex-1 text-center">
                                        {/* Simulated QR Code Visual */}
                                        <div className="w-24 h-24 bg-white border-4 border-black mx-auto p-1 flex flex-wrap content-center justify-center gap-0.5">
                                            {Array.from({length: 36}).map((_, i) => (
                                                <div key={i} className={`w-3 h-3 ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`}></div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-mono mt-1">{record.sku}-{boxNum}</p>
                                    </div>
                                    
                                    <div className="flex flex-col items-center justify-center border-4 border-black w-24 h-24 rounded-lg">
                                        <span className="text-xs font-bold uppercase">Box</span>
                                        <span className="text-4xl font-extrabold leading-none">{boxNum}</span>
                                        <span className="text-xs font-bold uppercase border-t-2 border-black w-full text-center mt-1 pt-1">of {totalBoxes}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t-2 border-black pt-2 mt-2 flex justify-between items-center">
                                <span className="font-bold text-lg border-2 border-black px-2 py-0.5 rounded">Made in China</span>
                                <span className="text-[10px] font-mono">Tanxing Smart Supply Chain</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
