import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout';
import { ProfileView } from './components/ProfileView';
import { ChatView } from './components/ChatView';
import { AdminPanel } from './components/AdminPanel';
import { AppRoute, UserProfile, ChatMessage, Report, MatchFilters, FriendRequest, ProofSubmission, ActivationCode, FeedPost } from './types';
import { nostrService } from './services/nostr';
import { Sparkles, Loader2, Zap, MessageSquare, LogIn, UserPlus, Key, Search, X, Check, Mail, Bell, MapPin, Radar, Fingerprint, AlertTriangle, UserCheck, Copy, Eye, EyeOff, Trash2, Globe, Users, User, RefreshCw, Baby, Accessibility, Filter } from 'lucide-react';
import { nip19, getPublicKey } from 'nostr-tools';

// CREDENCIAIS DO DONO
const OWNER_NSEC = "nsec1w0sc7873p9hn8j5gfg8m3w93v0rghycx5hq9sl3nan4frlac5lzsz4lc56";
const OWNER_EMAIL = "marciotalves@gmail.com";
const OWNER_PASS = "Tatiano337#";

const App: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.DISCOVER);
  const [activeUsers, setActiveUsers] = useState<Map<string, UserProfile>>(new Map());
  
  // Estado de autenticação
  const [loggedInKey, setLoggedInKey] = useState<string | null>(localStorage.getItem('agito_key')); // Hex PrivKey
  const [userPubkey, setUserPubkey] = useState<string | null>(localStorage.getItem('agito_pubkey')); // Hex PubKey
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null); // For chat/profile view
  const [isPremium, setIsPremium] = useState(false);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Login State
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAbout, setRegAbout] = useState('');
  const [generatedKeys, setGeneratedKeys] = useState<{nsec: string, npub: string, priv: string, pub: string} | null>(null);
  const [showPrivKey, setShowPrivKey] = useState(false);
  const [hasCopiedPriv, setHasCopiedPriv] = useState(false);

  // Match Logic State
  const [isScanning, setIsScanning] = useState(false); 
  const [showFilters, setShowFilters] = useState(false); 

  // Match Filters
  const [matchFilters, setMatchFilters] = useState<MatchFilters>({
    location: 'BR',
    gender: 'all',
    ageMin: 13,
    ageMax: 100
  });

  // Notifications & Friends
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Admin Data
  const [reports, setReports] = useState<Report[]>([]);
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [activationCodes, setActivationCodes] = useState<ActivationCode[]>([]);

  // Calculate Admin Pubkey
  const ADMIN_PUBKEY = useMemo(() => {
    try {
        const { data: adminHex } = nip19.decode(OWNER_NSEC);
        return getPublicKey(adminHex as string);
    } catch(e) { return ""; }
  }, []);

  // Verifica se é Admin
  const isAdmin = useMemo(() => {
    if (!loggedInKey) return false;
    try {
        const { data: adminHex } = nip19.decode(OWNER_NSEC);
        return loggedInKey === adminHex; 
    } catch (e) {
        return false;
    }
  }, [loggedInKey]);

  // Função para carregar dados de admin
  const loadAdminData = useCallback(() => {
      // 1. Carrega do LocalStorage (Cache)
      const storedReports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
      setReports(prev => {
          const map = new Map(prev.map(i => [i.id, i]));
          storedReports.forEach((i: Report) => map.set(i.id, i));
          return Array.from(map.values());
      });
      
      const storedProofs = JSON.parse(localStorage.getItem('admin_proofs') || '[]');
      setProofs(prev => {
          const map = new Map(prev.map(i => [i.id, i]));
          storedProofs.forEach((i: ProofSubmission) => map.set(i.id, i));
          return Array.from(map.values());
      });

      const storedCodes = JSON.parse(localStorage.getItem('admin_codes') || '[]');
      setActivationCodes(storedCodes);

      // 2. Se for admin, escuta a rede
      if (isAdmin && userPubkey) {
          return nostrService.subscribeToAdminSignals(userPubkey, (type, data) => {
              if (type === 'REPORT') {
                  const r = data as Report;
                  setReports(prev => {
                      if(prev.find(x => x.id === r.id)) return prev;
                      const updated = [r, ...prev];
                      localStorage.setItem('admin_reports', JSON.stringify(updated));
                      return updated;
                  });
                  // Notificação visual simples
                  alert(`⚠️ Nova Denúncia Recebida: ${r.reason}`);
              } else if (type === 'PROOF') {
                  const p = data as ProofSubmission;
                  setProofs(prev => {
                      if(prev.find(x => x.id === p.id)) return prev;
                      const updated = [p, ...prev];
                      localStorage.setItem('admin_proofs', JSON.stringify(updated));
                      return updated;
                  });
                  alert(`💰 Novo Comprovante de ${p.userName}`);
              }
          });
      }
  }, [isAdmin, userPubkey]);

  // --- INITIALIZATION ---
  useEffect(() => {
    nostrService.subscribeMetadata((profile) => {
      setActiveUsers(prev => new Map(prev).set(profile.pubkey, profile));
      if (profile.pubkey === userPubkey) {
        setUserProfile(profile);
      }
    });

    if (userPubkey) {
      nostrService.fetchProfile(userPubkey);
      refreshNotifications();
      const mockFeed: FeedPost[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `post-${i}`,
        pubkey: 'anyone',
        content: `Postagem simulada na rede Nostr #${i + 1}. O sistema está online e descentralizado!`,
        created_at: Math.floor(Date.now() / 1000) - i * 3600,
        user: { pubkey: 'anyone', name: 'Usuário Nostr', picture: `https://picsum.photos/seed/${i}/50` }
      }));
      setFeed(mockFeed);
      
      const premiumStatus = localStorage.getItem(`premium_${userPubkey}`);
      if (premiumStatus === 'true') setIsPremium(true);
      
      if (isAdmin) {
          const unsub = loadAdminData();
          return () => { if(unsub) unsub(); }
      }
    }
  }, [userPubkey, isAdmin, loadAdminData]);

  // Refresh periodic notifications
  useEffect(() => {
      if (!userPubkey) return;
      const interval = setInterval(() => {
          refreshNotifications();
      }, 3000); 
      return () => clearInterval(interval);
  }, [userPubkey]);

  const refreshNotifications = () => {
      if (!userPubkey) return;
      const reqs = nostrService.getFriendRequests(userPubkey);
      setFriendRequests(reqs);
  };

  // --- ACTIONS ---

  const handleLogin = async () => {
    setIsLoginLoading(true);
    setLoginError('');
    
    if (loginInput.trim() === OWNER_EMAIL) {
        if (passwordInput.trim() === OWNER_PASS) {
            const result = nostrService.processLogin(OWNER_NSEC);
            if (result && result.privkey) {
                completeLogin(result.privkey, result.pubkey);
            } else {
                setLoginError("Erro interno na chave do administrador.");
            }
        } else {
            setLoginError("Senha incorreta para este e-mail.");
        }
        setIsLoginLoading(false);
        return;
    }

    await new Promise(r => setTimeout(r, 800));
    
    const result = nostrService.processLogin(loginInput);
    if (result) {
      if (result.privkey) {
        completeLogin(result.privkey, result.pubkey);
      } else {
         setLoginError("Por favor, insira sua chave privada (nsec) para acesso total.");
      }
    } else {
      setLoginError("Chave inválida. Use nsec, npub ou hex.");
    }
    setIsLoginLoading(false);
  };

  const completeLogin = (privkey: string, pubkey: string) => {
      localStorage.setItem('agito_key', privkey);
      localStorage.setItem('agito_pubkey', pubkey);
      setLoggedInKey(privkey);
      setUserPubkey(pubkey);
      nostrService.fetchProfile(pubkey);
      if (privkey === nip19.decode(OWNER_NSEC).data) {
          loadAdminData();
      }
  };

  const handleRegisterSubmit = async () => {
    if (!regName.trim()) {
        alert("Por favor, escolha um nome de exibição.");
        return;
    }
    const { privkey, pubkey } = nostrService.generateNewIdentity();
    await nostrService.publishMetadata(privkey, {
        name: regName,
        display_name: regName,
        about: regAbout,
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pubkey}`,
        location: 'BR',
        age: 18 
    });
    setGeneratedKeys({
        priv: privkey,
        pub: pubkey,
        nsec: nip19.nsecEncode(privkey),
        npub: nip19.npubEncode(pubkey)
    });
  };

  const handleConfirmBackup = () => {
      if (!generatedKeys) return;
      if (!hasCopiedPriv) {
          alert("Por segurança, copie sua chave privada (nsec) antes de continuar.");
          return;
      }
      completeLogin(generatedKeys.priv, generatedKeys.pub);
      setGeneratedKeys(null);
      setRegName('');
      setRegAbout('');
      setHasCopiedPriv(false);
  };

  const handleLogout = () => {
      localStorage.removeItem('agito_key');
      localStorage.removeItem('agito_pubkey');
      setLoggedInKey(null);
      setUserPubkey(null);
      setUserProfile(null);
      setActiveRoute(AppRoute.DISCOVER);
      setLoginInput('');
      setPasswordInput('');
      setReports([]);
      setProofs([]);
  };

  const handleClearAllChats = () => {
      if (confirm("Tem certeza que deseja limpar todo o histórico de conversas deste dispositivo?")) {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
              if (key.includes('chat_history') || key.includes('messages_') || key.startsWith('chat_')) {
                  localStorage.removeItem(key);
              }
          });
          alert("Histórico de conversas limpo!");
          setActiveRoute(AppRoute.DISCOVER);
          setTimeout(() => setActiveRoute(AppRoute.CHAT), 100);
      }
  };

  const handleSendFriendRequest = (code?: string) => {
    const targetCode = code;
    if (!targetCode || !targetCode.trim() || !userPubkey) return;
    try {
        let pubkey = targetCode.trim();
        if (pubkey.startsWith('npub')) {
            const { data } = nip19.decode(pubkey);
            pubkey = data as string;
        }
        if (pubkey === userPubkey) {
            alert("Você não pode adicionar a si mesmo.");
            return;
        }
        nostrService.sendFriendRequest(userPubkey, pubkey);
        alert(`Convite enviado para o usuário!`);
    } catch (e) {
        alert("Código inválido. Certifique-se de usar um npub ou hex válido.");
    }
  };

  // --- ADMIN LOGIC ---
  const handleGenerateCode = () => {
      const codeStr = `AGITO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const newCode: ActivationCode = {
          code: codeStr,
          generatedBy: userPubkey!,
          createdAt: Date.now(),
          status: 'active'
      };
      const newCodes = [...activationCodes, newCode];
      setActivationCodes(newCodes);
      localStorage.setItem('admin_codes', JSON.stringify(newCodes));
      return codeStr;
  };

  const handleRedeemCode = (code: string): boolean => {
      const allCodes: ActivationCode[] = JSON.parse(localStorage.getItem('admin_codes') || '[]');
      const foundIndex = allCodes.findIndex(c => c.code === code && c.status === 'active');
      
      if (foundIndex !== -1) {
          allCodes[foundIndex].status = 'used';
          allCodes[foundIndex].redeemedBy = userPubkey!;
          allCodes[foundIndex].redeemedAt = Date.now();
          localStorage.setItem('admin_codes', JSON.stringify(allCodes));
          
          setIsPremium(true);
          localStorage.setItem(`premium_${userPubkey}`, 'true');
          return true;
      }
      return false;
  };

  // ENVIO DE COMPROVANTE VIA REDE (CORREÇÃO)
  const handleSendProof = (content: string) => {
      if (!userPubkey || !loggedInKey) return;
      const proof: ProofSubmission = {
          id: Math.random().toString(36).substring(7),
          userPubkey: userPubkey,
          userName: userProfile?.display_name || "Unknown",
          content,
          timestamp: Date.now(),
          status: 'pending'
      };
      
      try {
        // Envia para o Admin via rede
        nostrService.sendAdminSignal(loggedInKey, ADMIN_PUBKEY, 'PROOF', proof);
        alert("Comprovante criptografado e enviado para a moderação!");
        
        // Backup local para o usuário ver
        const currentProofs = JSON.parse(localStorage.getItem('my_sent_proofs') || '[]');
        localStorage.setItem('my_sent_proofs', JSON.stringify([proof, ...currentProofs]));

      } catch (e) {
          console.error(e);
          alert("Erro ao enviar via rede. Verifique sua conexão.");
      }
  };

  const handleApproveProof = (proof: ProofSubmission) => {
      if (!userPubkey) return; 

      const code = handleGenerateCode();
      const currentProofs = JSON.parse(localStorage.getItem('admin_proofs') || '[]');
      const updatedProofs = currentProofs.map((p: ProofSubmission) => p.id === proof.id ? { ...p, status: 'approved' } : p);
      setProofs(updatedProofs);
      localStorage.setItem('admin_proofs', JSON.stringify(updatedProofs));

      const messageContent = `🎉 Parabéns! Seu comprovante foi aprovado.\n\n🛡️ Este é seu Código de Apoiador: ${code}\n\nCopie e ative em seu Perfil > "Tenho um Código" para liberar o Selo VIP.`;
      
      const adminChatKey = `chat_${proof.userPubkey}`;
      const adminHistory: ChatMessage[] = JSON.parse(localStorage.getItem(adminChatKey) || '[]');
      const adminMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          senderPubkey: 'me', 
          content: messageContent,
          timestamp: Date.now(),
          type: 'text'
      };
      localStorage.setItem(adminChatKey, JSON.stringify([...adminHistory, adminMsg]));

      // Em um app real, enviaria essa msg via Nostr (DM NIP-04/17).
      // Por enquanto, simula a recepção se o usuário estiver usando o mesmo localStorage (teste local),
      // mas em produção, o usuário deve receber via DM. 
      // Para garantir que o usuário veja em teste, vamos assumir que ele checará as DMs.
      alert(`Selo gerado! Código ${code} enviado.`);

      let targetUser = activeUsers.get(proof.userPubkey);
      if (!targetUser) {
          targetUser = {
              pubkey: proof.userPubkey,
              name: proof.userName,
              display_name: proof.userName,
              picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${proof.userPubkey}`
          };
      }
      setSelectedUser(targetUser);
      setActiveRoute(AppRoute.CHAT);
  };

  // ENVIO DE DENÚNCIA VIA REDE (CORREÇÃO)
  const handleReportUser = (history: ChatMessage[], reason: string) => {
      if (!selectedUser || !userPubkey || !loggedInKey) return;
      
      const newReport: Report = {
          id: Math.random().toString(36).substring(7),
          reporterPubkey: userPubkey,
          reportedPubkey: selectedUser.pubkey,
          timestamp: Date.now(),
          chatHistory: history,
          reason: reason
      };
      
      try {
          nostrService.sendAdminSignal(loggedInKey, ADMIN_PUBKEY, 'REPORT', newReport);
          // Feedback visual já é dado pelo modal do chat
      } catch (e) {
          console.error(e);
          alert("Falha no envio da denúncia.");
      }
  };

  const handleDismissReport = (id: string) => {
      const currentReports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
      const updated = currentReports.filter((r: Report) => r.id !== id);
      setReports(updated);
      localStorage.setItem('admin_reports', JSON.stringify(updated));
  };

  // --- USER LIST (MEMOIZED) ---
  const filteredUsers = useMemo(() => {
    return Array.from(activeUsers.values()).filter((u: UserProfile) => {
      if (u.pubkey === userPubkey) return false;
      if (searchQuery && !u.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (matchFilters.location !== 'GLOBAL' && u.location !== matchFilters.location) return false;
      const uAge = u.age || 18;
      if (matchFilters.ageMax < 100) { if (uAge > matchFilters.ageMax) return false; }
      if (uAge < matchFilters.ageMin) return false;
      if (matchFilters.gender !== 'all' && u.gender !== matchFilters.gender) return false;
      return true;
    });
  }, [activeUsers, userPubkey, searchQuery, matchFilters]);

  const handleRadarScan = () => {
      setIsScanning(true);
      nostrService.fetchGlobalProfiles();
      nostrService.fetchOnlineUsers();
      
      setTimeout(() => {
          const allUsers = nostrService.getAllProfiles();
          const candidates = allUsers.filter(u => {
             if (u.pubkey === userPubkey) return false;
             if (matchFilters.location !== 'GLOBAL' && u.location !== matchFilters.location) return false;
             if (matchFilters.gender !== 'all' && u.gender !== matchFilters.gender) return false;
             const uAge = u.age || 18;
             if (matchFilters.ageMax < 100 && uAge > matchFilters.ageMax) return false;
             if (uAge < matchFilters.ageMin) return false;
             return true;
          });
          
          if (candidates.length > 0) {
              const randomUser = candidates[Math.floor(Math.random() * candidates.length)];
              setSelectedUser(randomUser);
              setIsScanning(false);
              setActiveRoute(AppRoute.CHAT);
          } else {
              setIsScanning(false);
              alert("Ninguém encontrado com esses filtros. Tente expandir para 'Global' ou 'Todos'!");
          }
      }, 3000);
  };

  // --- RENDER ---

  if (!userPubkey) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 animate-pulse pointer-events-none"></div>
        <div className="relative z-10 w-full">
            <div className="mb-8 relative inline-block">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                <Zap size={64} className="text-blue-500 relative z-10" fill="currentColor" />
            </div>
            <h1 className="text-5xl font-black italic tracking-tighter text-white mb-2 leading-none">AGITO</h1>
            <p className="text-slate-400 mb-10 text-sm font-medium max-w-[260px] mx-auto">A rede social descentralizada, sem censura e 100% criptografada.</p>

            {!isRegistering ? (
              <div className="w-full space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-1 relative">
                      <div className="absolute left-4 top-3.5 text-slate-500"><Mail size={18} /></div>
                      <input 
                        type="text" 
                        placeholder="E-mail Admin ou Chave Nostr (nsec)"
                        value={loginInput}
                        onChange={e => setLoginInput(e.target.value)}
                        className="w-full bg-transparent p-3 pl-11 text-white placeholder-slate-600 text-sm focus:outline-none"
                      />
                  </div>
                  {loginInput.includes('@') && (
                      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-1 relative animate-in fade-in">
                          <div className="absolute left-4 top-3.5 text-slate-500"><Key size={18} /></div>
                          <input 
                            type="password" 
                            placeholder="Senha de Administrador"
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            className="w-full bg-transparent p-3 pl-11 text-white placeholder-slate-600 text-sm focus:outline-none"
                          />
                      </div>
                  )}
                  {loginError && <p className="text-red-400 text-xs font-bold bg-red-900/20 py-2 rounded-lg animate-pulse">{loginError}</p>}
                  
                  <button onClick={handleLogin} disabled={isLoginLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-3xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2">
                    {isLoginLoading ? <Loader2 className="animate-spin" /> : <><LogIn size={16} /> Entrar</>}
                  </button>
                  <div className="flex items-center gap-4 py-2"><div className="h-px bg-slate-800 flex-1"></div><span className="text-[10px] text-slate-600 font-bold uppercase">Ou</span><div className="h-px bg-slate-800 flex-1"></div></div>
                  <button onClick={() => setIsRegistering(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-4 rounded-3xl uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2"><UserPlus size={16} /> Criar Nova Identidade</button>
              </div>
            ) : (
              <div className="w-full space-y-4 animate-in slide-in-from-right-5 duration-300">
                  {!generatedKeys ? (
                      <>
                        <input type="text" placeholder="Escolha seu apelido..." value={regName} onChange={e => setRegName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                        <textarea placeholder="Sua bio (opcional)..." value={regAbout} onChange={e => setRegAbout(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none h-24" />
                        <button onClick={handleRegisterSubmit} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-green-900/20">Gerar Chaves</button>
                        <button onClick={() => setIsRegistering(false)} className="text-slate-500 text-xs hover:text-white">Voltar para Login</button>
                      </>
                  ) : (
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-left relative overflow-hidden">
                          <div className="flex items-center gap-2 mb-4 text-orange-400"><AlertTriangle size={20} /><h3 className="font-black uppercase italic">Backup Obrigatório</h3></div>
                          <p className="text-xs text-slate-400 mb-4">Esta é sua chave mestra. Se perdê-la, sua conta será perdida para sempre.</p>
                          <div className="bg-black/40 p-3 rounded-xl border border-white/5 mb-4 font-mono text-[10px] break-all text-slate-300 relative">
                              <div className="blur-sm hover:blur-none transition-all duration-300 cursor-pointer" onClick={() => setShowPrivKey(true)}>{showPrivKey ? generatedKeys.nsec : "••••••••••••••••••••••••••••••••••"}</div>
                              <button onClick={() => { navigator.clipboard.writeText(generatedKeys.nsec); setHasCopiedPriv(true); }} className="absolute right-2 top-2 p-2 bg-slate-800 rounded-lg hover:bg-white text-slate-400 hover:text-black transition-colors">{hasCopiedPriv ? <Check size={14} /> : <Copy size={14} />}</button>
                          </div>
                          <button onClick={handleConfirmBackup} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${hasCopiedPriv ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>Entendi, Logar Agora</button>
                      </div>
                  )}
              </div>
            )}
        </div>
      </div>
    );
  }

  if (selectedUser && activeRoute === AppRoute.PROFILE && selectedUser.pubkey !== userPubkey) {
      return (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col max-w-md mx-auto overflow-y-auto scroll-smooth">
               <div className="relative w-full min-h-full bg-slate-950">
                   <button onClick={() => setSelectedUser(null)} className="absolute top-4 left-4 z-50 bg-black/50 p-2 rounded-full text-white backdrop-blur-md hover:bg-black/70 transition-colors"><X size={20} /></button>
                   <ProfileView profile={selectedUser} isPremium={false} onActivatePremium={() => {}} isOwnProfile={false} />
               </div>
          </div>
      );
  }

  if (activeRoute === AppRoute.CHAT && selectedUser) {
      return (
        <div className="h-screen max-w-md mx-auto overflow-hidden bg-slate-950">
            <ChatView recipient={selectedUser} onBack={() => { setActiveRoute(AppRoute.DISCOVER); setSelectedUser(null); }} isPremium={isPremium} onReport={handleReportUser} onViewProfile={(u) => { setActiveRoute(AppRoute.PROFILE); }} />
        </div>
      );
  }

  return (
    <Layout activeRoute={activeRoute} setRoute={setActiveRoute} isAdmin={isAdmin} onRefresh={() => nostrService.refreshConnections()} notificationCount={friendRequests.length} onOpenNotifications={() => setShowNotifications(true)} onAddFriend={handleSendFriendRequest} onlineCount={activeUsers.size}>
      {/* MODAL NOTIFICAÇÕES */}
      {showNotifications && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
              <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-2xl h-[400px] flex flex-col">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-black italic uppercase text-white">Notificações</h3><button onClick={() => setShowNotifications(false)}><X className="text-slate-500" /></button></div>
                  <div className="flex-1 overflow-y-auto space-y-3">
                      {friendRequests.length === 0 ? <div className="text-center text-slate-500 py-10 text-xs uppercase tracking-widest">Nada por aqui...</div> : friendRequests.map(req => (
                          <div key={req.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                              <img src={req.fromUser?.picture} className="w-10 h-10 rounded-full bg-slate-800" alt="" />
                              <div className="flex-1"><p className="text-xs font-bold text-white">{req.fromUser?.display_name || 'Alguém'}</p><p className="text-[10px] text-slate-400">Quer ser seu amigo</p></div>
                              <div className="flex gap-2"><button onClick={() => { nostrService.rejectFriendRequest(req.id, userPubkey); refreshNotifications(); }} className="p-2 bg-red-500/10 text-red-500 rounded-full"><X size={14} /></button><button onClick={() => { nostrService.acceptFriendRequest(req.id, userPubkey); refreshNotifications(); }} className="p-2 bg-green-500/10 text-green-500 rounded-full"><Check size={14} /></button></div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* ROTA: DESCOBERTA */}
      {activeRoute === AppRoute.DISCOVER && (
        <div className="flex flex-col h-full relative">
            <div className="px-4 py-3 bg-slate-950/95 border-b border-slate-900 flex justify-between items-center sticky top-0 z-30">
               <h2 className="font-black italic text-white uppercase flex items-center gap-2"><Radar className="text-blue-500" size={18} /> Radar Agito</h2>
               <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}><Filter size={18} /></button>
           </div>

           {showFilters && (
                <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 space-y-3 animate-in slide-in-from-top-2">
                     <div className="bg-slate-900 p-1 rounded-xl flex">
                         <button onClick={() => setMatchFilters(prev => ({...prev, location: 'BR'}))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${matchFilters.location === 'BR' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><MapPin size={12} /> Brasil</button>
                         <button onClick={() => setMatchFilters(prev => ({...prev, location: 'GLOBAL'}))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${matchFilters.location === 'GLOBAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Globe size={12} /> Global</button>
                    </div>
                    <div className="bg-slate-900 p-1 rounded-xl flex">
                         <button onClick={() => setMatchFilters(prev => ({...prev, gender: 'all'}))} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${matchFilters.gender === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><Users size={12} className="inline mr-1" /> Todos</button>
                         <button onClick={() => setMatchFilters(prev => ({...prev, gender: 'male'}))} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${matchFilters.gender === 'male' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Homens</button>
                         <button onClick={() => setMatchFilters(prev => ({...prev, gender: 'female'}))} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${matchFilters.gender === 'female' ? 'bg-pink-600 text-white' : 'text-slate-500'}`}>Mulheres</button>
                    </div>
                    <div className="bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Baby size={12} /> Idade Máxima:</span><span className="text-[10px] font-bold text-blue-400 uppercase">{matchFilters.ageMax === 100 ? 'Todas as idades' : `Até ${matchFilters.ageMax} anos`}</span></div>
                        <input type="range" min="13" max="100" value={matchFilters.ageMax} onChange={(e) => setMatchFilters(prev => ({...prev, ageMax: parseInt(e.target.value)}))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500" />
                    </div>
                </div>
           )}

           <div className="px-4 py-3 bg-slate-950/50">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                        Online Agora ({filteredUsers.length})
                    </h3>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {filteredUsers.map(user => (
                    <button key={user.pubkey} onClick={() => { setSelectedUser(user); setActiveRoute(AppRoute.PROFILE); }} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 hover:border-blue-500 transition-all active:scale-95 group shadow-lg">
                        <img src={user.picture} className="w-full h-full object-cover" alt={user.name} onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.pubkey}`} />
                        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 border-2 border-slate-950 rounded-full"></div>
                    </button>
                    ))}
                </div>
                {filteredUsers.length === 0 && <div className="text-center py-6 text-slate-600 text-[10px] font-mono border border-dashed border-slate-800 rounded-xl bg-slate-900/30">Ninguém encontrado com estes filtros...</div>}
           </div>

            <button onClick={handleRadarScan} disabled={isScanning} className={`fixed bottom-24 right-4 z-50 p-4 rounded-full shadow-2xl shadow-blue-600/50 hover:scale-110 active:scale-95 transition-all group ${isScanning ? 'bg-blue-500 cursor-wait' : 'bg-blue-600 text-white'}`}>
                <div className={`absolute inset-0 bg-blue-500 rounded-full opacity-0 group-hover:opacity-30 ${isScanning ? 'animate-ping' : ''}`}></div>
                {isScanning ? <Loader2 size={28} className="animate-spin text-white" /> : <Radar size={28} />}
            </button>
            
            {isScanning && (
                <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                    <Radar size={64} className="text-blue-500 animate-spin mb-4" />
                    <h3 className="text-2xl font-black italic uppercase text-white tracking-widest animate-pulse">Buscando Chat...</h3>
                    <p className="text-sm text-slate-400 mt-2">Aplicando filtros selecionados</p>
                </div>
            )}
            
            <div className="p-4 space-y-4 min-h-[500px]">
                   {feed.map(post => (
                       <article key={post.id} className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 mb-4">
                           <div className="flex gap-3">
                               <img src={post.user?.picture} className="w-10 h-10 rounded-full bg-slate-800" alt="" />
                               <div><p className="text-sm font-bold text-white">{post.user?.name}</p><p className="text-[10px] text-slate-500">{new Date(post.created_at * 1000).toLocaleString()}</p></div>
                           </div>
                           <p className="mt-3 text-sm text-slate-300 leading-relaxed">{post.content}</p>
                       </article>
                   ))}
            </div>
        </div>
      )}

      {activeRoute === AppRoute.CHAT && !selectedUser && (
          <div className="p-4">
              <div className="flex justify-between items-center mb-6 px-2"><h2 className="text-xl font-black italic uppercase text-white">Conversas</h2><button onClick={handleClearAllChats} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:bg-red-900/50 hover:text-red-500 transition-colors" title="Limpar todos os chats"><Trash2 size={18} /></button></div>
              <div className="space-y-2">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-4 opacity-50"><div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center"><MessageSquare size={20} className="text-slate-600" /></div><div><p className="text-sm font-bold text-slate-400">Nenhuma conversa ativa</p><p className="text-xs text-slate-600">Clique no Radar para um chat aleatório!</p></div></div>
              </div>
          </div>
      )}

      {activeRoute === AppRoute.PROFILE && (
        <ProfileView profile={userProfile} isPremium={isPremium} isAdmin={isAdmin} onActivatePremium={() => setIsPremium(true)} onRedeemCode={handleRedeemCode} onSendProof={handleSendProof} isOwnProfile={true} onLogout={handleLogout} />
      )}

      {activeRoute === AppRoute.ADMIN && isAdmin && (
          <AdminPanel reports={reports} proofs={proofs} onDismissReport={handleDismissReport} onGenerateCode={handleGenerateCode} onOpenChat={(pk) => { nostrService.fetchProfile(pk); const u = nostrService.getProfileSync(pk); if(u) { setSelectedUser(u); setActiveRoute(AppRoute.CHAT); } }} onApproveProof={handleApproveProof} />
      )}
    </Layout>
  );
};

export default App;