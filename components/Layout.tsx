import React, { useState } from 'react';
import { Sparkles, MessageSquare, User, Zap, ShieldAlert, RefreshCw, Bell, UserPlus, Search } from 'lucide-react';
import { AppRoute } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeRoute: AppRoute;
  setRoute: (route: AppRoute) => void;
  isAdmin?: boolean;
  onRefresh?: () => void;
  notificationCount?: number;
  onOpenNotifications?: () => void;
  onAddFriend?: (code: string) => void;
  onlineCount?: number;
}

const NavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${
      active 
        ? 'text-blue-400 font-bold' 
        : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] uppercase tracking-tighter">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeRoute, 
  setRoute, 
  isAdmin, 
  onRefresh, 
  notificationCount = 0, 
  onOpenNotifications,
  onAddFriend,
  onlineCount 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [friendCode, setFriendCode] = useState('');

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleAddFriendSubmit = () => {
    if (onAddFriend && friendCode.trim()) {
      onAddFriend(friendCode);
      setFriendCode('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-950 border-x border-slate-900 shadow-2xl overflow-hidden relative">
      {/* Top Header */}
      <header className="px-3 py-3 border-b border-slate-900 flex items-center justify-between bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 gap-2">
        
        {/* Logo / Refresh */}
        <button 
          onClick={handleRefreshClick}
          className="flex-shrink-0 active:opacity-70 transition-opacity"
        >
          <div className={`w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 transition-transform duration-700 ${isRefreshing ? 'rotate-180 scale-110' : ''}`}>
             {isRefreshing ? <RefreshCw size={20} className="text-white animate-spin" /> : <Zap size={20} fill="white" className="text-white" />}
          </div>
        </button>

        {/* Friend Code Input (Novo Espaço Solicitado) */}
        <div className="flex-1 relative group">
           <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
              <UserPlus size={14} />
           </div>
           <input 
             type="text"
             value={friendCode}
             onChange={(e) => setFriendCode(e.target.value)}
             placeholder="Cole o código Nostr (npub)..."
             className="w-full bg-slate-900/50 border border-slate-800 focus:border-blue-500/50 rounded-full py-2.5 pl-9 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none transition-all focus:bg-slate-900"
             onKeyDown={(e) => e.key === 'Enter' && handleAddFriendSubmit()}
           />
           {friendCode.trim() && (
             <button 
               onClick={handleAddFriendSubmit}
               className="absolute inset-y-1 right-1 bg-blue-600 text-white rounded-full px-3 flex items-center justify-center hover:bg-blue-500 transition-colors"
             >
               <span className="text-[9px] font-black uppercase">Add</span>
             </button>
           )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
           <button 
             onClick={onOpenNotifications}
             className="relative p-2.5 bg-slate-900 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-800"
           >
             <Bell size={18} />
             {notificationCount > 0 && (
               <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse"></span>
             )}
           </button>
           
           <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold text-blue-400">{onlineCount || 0}</span>
           </div>
        </div>
      </header>

      {/* Main Content Scrollable Area */}
      <main className="flex-1 overflow-y-auto pb-20 scroll-smooth flex flex-col">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 flex px-2 py-1 z-50">
        <NavItem icon={Sparkles} label="Agitar" active={activeRoute === AppRoute.DISCOVER} onClick={() => setRoute(AppRoute.DISCOVER)} />
        <NavItem icon={MessageSquare} label="Chats" active={activeRoute === AppRoute.CHAT} onClick={() => setRoute(AppRoute.CHAT)} />
        <NavItem icon={User} label="Perfil" active={activeRoute === AppRoute.PROFILE} onClick={() => setRoute(AppRoute.PROFILE)} />
        {isAdmin && (
          <NavItem icon={ShieldAlert} label="Painel" active={activeRoute === AppRoute.ADMIN} onClick={() => setRoute(AppRoute.ADMIN)} />
        )}
      </nav>
    </div>
  );
};