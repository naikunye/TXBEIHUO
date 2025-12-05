
import React, { useRef } from 'react';
import { X, Download, Upload, FileJson, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ReplenishmentRecord } from '../types';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReplenishmentRecord[];
  onImportData: (data: ReplenishmentRecord[]) => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose, records, onImportData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
      const dataStr = JSON.stringify(records, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tanxing_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json)) {
                  const isValid = json.every(item => item.id && item.sku && item.productName);
                  if (isValid) {
                      if(window.confirm(`⚠️ 警告：导入操作将覆盖当前本地的所有数据！\n\n检测到 ${json.length} 条记录。\n确定要继续吗？`)) {
                          onImportData(json);
                          alert("导入成功！");
                          onClose();
                      }
                  } else {
                      alert("文件格式错误：JSON 内容缺少必要字段 (id, sku, productName)。");
                  }
              } else {
                  alert("文件格式错误：必须是 JSON 数组格式。");
              }
          } catch (err) {
              alert("解析 JSON 失败，请检查文件是否损坏。");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <FileJson size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">数据备份与恢复</h2>
                    <p className="text-slate-400 text-xs">JSON 格式本地导入导出</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={24} />
            </button>
        </div>

        <div className="p-8 space-y-6">
            {/* Export Card */}
            <div 
                onClick={handleExportJSON}
                className="group relative bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-full shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                        <Download size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-700">导出备份 (Export)</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            将当前 {records.length} 条记录保存为 JSON 文件
                        </p>
                    </div>
                </div>
                <div className="absolute top-4 right-4 text-indigo-200">
                    <CheckCircle2 size={40} className="opacity-20" />
                </div>
            </div>

            {/* Import Card */}
            <div 
                onClick={handleImportClick}
                className="group relative bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-6 cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-full shadow-sm text-amber-600 group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-amber-700">导入数据 (Import)</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            从 JSON 文件恢复数据 (会覆盖现有数据)
                        </p>
                    </div>
                </div>
                 <div className="absolute top-4 right-4 text-amber-200">
                    <AlertTriangle size={40} className="opacity-20" />
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json"
                    onChange={handleFileChange}
                />
            </div>
        </div>
        
        <div className="px-8 pb-8 text-center">
            <p className="text-[10px] text-gray-400">
                提示：定期导出备份是一个好习惯。导入操作不可撤销，请谨慎操作。
            </p>
        </div>

      </div>
    </div>
  );
};
