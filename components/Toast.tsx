
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const styles = {
    success: 'bg-white border-l-4 border-green-500 text-gray-800 shadow-lg shadow-green-100',
    error: 'bg-white border-l-4 border-red-500 text-gray-800 shadow-lg shadow-red-100',
    info: 'bg-white border-l-4 border-blue-500 text-gray-800 shadow-lg shadow-blue-100',
    warning: 'bg-white border-l-4 border-amber-500 text-gray-800 shadow-lg shadow-amber-100',
  };

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />,
    warning: <AlertTriangle size={20} className="text-amber-500" />,
  };

  return (
    <div 
        className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-lg flex items-start gap-3 transform transition-all animate-slide-in-right ${styles[toast.type]}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 text-sm font-medium leading-5">
        {toast.message}
      </div>
      <button 
        onClick={onRemove} 
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};
