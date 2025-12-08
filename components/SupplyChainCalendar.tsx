
import React, { useState, useMemo } from 'react';
import { ReplenishmentRecord, PurchaseOrder } from '../types';
import { calculateMetrics } from '../utils/calculations';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Truck, Package, Clock } from 'lucide-react';

interface SupplyChainCalendarProps {
  records: ReplenishmentRecord[];
  purchaseOrders: PurchaseOrder[];
}

export const SupplyChainCalendar: React.FC<SupplyChainCalendarProps> = ({ records, purchaseOrders }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Helper Functions ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // --- Data Processing ---
  const events = useMemo(() => {
    const eventMap: Record<string, { type: 'stockout' | 'arrival' | 'holiday', title: string, sku?: string, color: string }[]> = {};

    const addEvent = (dateStr: string, event: any) => {
        if (!eventMap[dateStr]) eventMap[dateStr] = [];
        eventMap[dateStr].push(event);
    };

    const today = new Date();
    
    // 1. Stockout Predictions
    records.forEach(r => {
        if (r.dailySales > 0 && r.quantity > 0) {
            const daysLeft = r.quantity / r.dailySales;
            if (daysLeft < 90) { // Only care about next 3 months
                const stockoutDate = new Date(today);
                stockoutDate.setDate(today.getDate() + Math.ceil(daysLeft));
                const dateStr = stockoutDate.toISOString().split('T')[0];
                addEvent(dateStr, {
                    type: 'stockout',
                    title: `${r.sku} 预计断货`,
                    sku: r.sku,
                    color: 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                });
            }
        }
    });

    // 2. Incoming Shipments (PO)
    purchaseOrders.forEach(po => {
        if (['Ordered', 'Production', 'Shipped', 'PartiallyArrived'].includes(po.status)) {
            // Rough estimation logic if no expected date
            let targetDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null;
            
            if (!targetDate) {
                // Estimate based on status
                targetDate = new Date(po.date);
                if (po.status === 'Ordered') targetDate.setDate(targetDate.getDate() + 30); // Default Lead Time
                if (po.status === 'Production') targetDate.setDate(targetDate.getDate() + 15);
                if (po.status === 'Shipped') targetDate.setDate(targetDate.getDate() + 7);
            }
            
            const dateStr = targetDate.toISOString().split('T')[0];
            addEvent(dateStr, {
                type: 'arrival',
                title: `PO 到货: ${po.sku}`,
                sku: po.sku,
                color: 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
            });
        }
    });

    return eventMap;
  }, [records, purchaseOrders]);

  // --- Render Calendar Grid ---
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0 = Sunday

    const days = [];
    
    // Padding for empty cells before 1st of month
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-32 bg-slate-900/30 border border-white/5 rounded-xl m-1 opacity-50"></div>);
    }

    // Actual Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = events[dateStr] || [];
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

        days.push(
            <div key={day} className={`h-32 bg-slate-800/40 border ${isToday ? 'border-cyan-500/50 bg-cyan-900/10' : 'border-white/5'} rounded-xl m-1 p-2 flex flex-col group hover:border-white/20 transition-colors relative overflow-hidden`}>
                {isToday && <div className="absolute top-0 right-0 p-1 bg-cyan-500 text-[10px] text-black font-bold rounded-bl-lg">TODAY</div>}
                <span className={`text-sm font-bold font-mono mb-2 ${isToday ? 'text-cyan-400' : 'text-slate-400'}`}>{day}</span>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                    {dayEvents.map((evt, idx) => (
                        <div key={idx} className="flex items-center gap-2 group/evt cursor-pointer">
                            <div className={`w-2 h-2 rounded-full ${evt.color} shrink-0`}></div>
                            <span className={`text-[10px] truncate ${evt.type === 'stockout' ? 'text-red-300' : 'text-emerald-300'} font-medium`}>
                                {evt.title}
                            </span>
                            
                            {/* Hover Tooltip */}
                            <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/evt:block min-w-[150px]">
                                <div className="bg-slate-900 text-white text-xs p-2 rounded-lg border border-white/10 shadow-xl backdrop-blur-md">
                                    <div className="font-bold mb-1 flex items-center gap-1">
                                        {evt.type === 'stockout' ? <AlertTriangle size={12} className="text-red-500"/> : <Truck size={12} className="text-emerald-500"/>}
                                        {evt.type === 'stockout' ? '库存预警' : '预计到货'}
                                    </div>
                                    <div>{evt.title}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return days;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        {/* Header Control */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-grid-pattern relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-50"></div>
            
            <div className="flex items-center gap-4 z-10">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <Calendar className="text-cyan-400" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white text-glow tracking-tight">供应链全景日历</h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">Timeline & Stock Prediction Engine</p>
                </div>
            </div>

            <div className="flex items-center gap-6 z-10">
                <div className="flex items-center gap-2 text-xs font-bold bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></div> <span className="text-red-300">预计断货</span></div>
                    <div className="w-px h-3 bg-white/10"></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div> <span className="text-emerald-300">预计到货</span></div>
                </div>

                <div className="flex items-center bg-slate-900 rounded-xl border border-white/10 p-1">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={18}/></button>
                    <span className="px-4 font-mono font-bold text-white w-32 text-center">
                        {currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}
                    </span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={18}/></button>
                </div>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
            {/* Week Headers */}
            <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest py-2">
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Days Grid */}
            <div className="grid grid-cols-7">
                {renderCalendar()}
            </div>
        </div>
    </div>
  );
};
