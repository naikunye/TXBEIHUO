import React, { useState } from 'react';
import { Cloud, CloudLightning, CloudOff, Users, CheckCircle2, Loader2, LogOut, Database, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface CloudConnectProps {
  currentWorkspaceId: string | null;
  onConnect: (workspaceId: string) => void;
  onDisconnect: () => void;
  isSyncing: boolean;
}

export const CloudConnect: React.FC<CloudConnectProps> = ({ 
  currentWorkspaceId, 
  onConnect, 
  onDisconnect, 
  isSyncing 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputId, setInputId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId.trim()) return;
    
    setIsLoading(true);
    setErrorMsg(null);

    try {
        // 1. 尝试连接 Supabase 进行一次轻量级查询，验证配置是否正确
        // 我们查询不存在的 ID 也没关系，主要是看是否报错（如 401, URL 错误等）
        const { error } = await supabase
            .from('replenishment_data')
            .select('id')
            .limit(1);

        if (error) {
            // 如果是 "relation does not exist" (42P01)，说明连接成功但表不存在，这通常是可以接受的（因为upsert会自动报错或我们需要提示用户建表）
            // 但为了严谨，我们提示用户检查。
            // 如果是网络错误或认证错误，抛出异常。
            if (error.code === '42P01') {
                 throw new Error("连接成功，但数据库表 'replenishment_data' 不存在。请在 Supabase SQL Editor 中运行建表脚本。");
            } else if (error.code === 'PGRST301' || error.message.includes('JWT')) {
                 throw new Error("认证失败。请检查 lib/supabaseClient.ts 中的 URL 和 Anon Key。");
            } else {
                 // 其他错误，暂且视为连接有问题，或者表权限问题
                 console.warn("Supabase check warning:", error);
            }
        }

        // 2. 连接成功
        onConnect(inputId);
        setIsOpen(false);
        setInputId('');
    } catch (err: any) {
        console.error("Connection failed:", err);
        // 如果是 URL 格式错误，supabase-js 通常会抛出 error
        let msg = err.message || "连接失败";
        if (msg.includes('Invalid URL')) {
            msg = "无效的 Supabase URL，请检查配置文件。";
        }
        setErrorMsg(msg);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('确定要退出当前云端工作区吗？退出后将切换回本地个人数据。')) {
      onDisconnect();
      setIsOpen(false);
    }
  };

  if (currentWorkspaceId) {
    return (
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium shadow-sm ${
            isSyncing 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {isSyncing ? (
             <CloudLightning size={14} className="animate-pulse" />
          ) : (
             <Cloud size={14} />
          )}
          <span>{currentWorkspaceId}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
        </button>

        {isOpen && (
           <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-20 animate-in fade-in slide-in-from-top-2 p-4">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
                    <div className="bg-emerald-100 p-2 rounded-full">
                        <Database size={16} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Supabase Workspace</p>
                        <p className="font-bold text-gray-800 text-sm truncate w-40">{currentWorkspaceId}</p>
                    </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>同步状态</span>
                        {isSyncing ? <span className="text-blue-500 font-medium">同步中...</span> : <span className="text-emerald-500 font-medium">已连接</span>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>数据表</span>
                        <span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-mono text-[10px]">replenishment_data</span>
                    </div>
                </div>

                <button 
                    onClick={handleDisconnect}
                    className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 p-2 rounded-lg text-sm transition-colors"
                >
                    <LogOut size={14} />
                    断开连接
                </button>
            </div>
           </>
        )}
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
      >
        <CloudOff size={16} />
        <span>未连接云端</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-slate-900 p-6 text-white text-center">
                  <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                      <Database size={24} className="text-emerald-300" />
                  </div>
                  <h3 className="text-lg font-bold">连接 Supabase 云端</h3>
                  <p className="text-slate-400 text-xs mt-1">输入 Workspace ID 以同步团队数据</p>
              </div>
              
              <form onSubmit={handleConnect} className="p-6 space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Workspace ID (团队/项目标识)</label>
                      <div className="relative">
                          <Users className="absolute left-3 top-2.5 text-gray-400" size={16} />
                          <input 
                              type="text" 
                              required
                              value={inputId}
                              onChange={(e) => setInputId(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                              placeholder="例如: tanxing-team-01"
                          />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">此 ID 用于在数据库中区分不同团队的数据。</p>
                  </div>
                  
                  {errorMsg && (
                      <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex gap-2 items-start">
                          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-red-600 leading-tight">
                              {errorMsg}
                              <br/>
                              <span className="opacity-70 mt-1 block">请检查 lib/supabaseClient.ts 配置。</span>
                          </div>
                      </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                      {isLoading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            正在验证链接...
                          </>
                      ) : (
                          <>
                            验证并连接
                            <CheckCircle2 size={18} />
                          </>
                      )}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-gray-400 text-xs hover:text-gray-600 mt-2"
                  >
                      取消
                  </button>
              </form>
           </div>
        </div>
      )}
    </>
  );
};