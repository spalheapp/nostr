import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Testimonial } from '../types';
import { nostrService } from '../services/nostr';
import { nip19 } from 'nostr-tools';
import { Copy, CheckCircle, Zap, ShieldCheck, Heart, Smile, Shield, Plus, Image as ImageIcon, Lock, Settings2, Trash2, X, Edit3, Save, Camera, Quote, MessageCircleHeart, Crown, LogOut, QrCode, Star, Send, Upload, MapPin, Check } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile | null;
  isPremium: boolean;
  isAdmin?: boolean;
  onActivatePremium: () => void;
  onRedeemCode?: (code: string) => boolean;
  onSendProof?: (content: string) => void;
  isOwnProfile?: boolean;
  onLogout?: () => void;
}

type ReactionType = 'sexy' | 'legal' | 'confiavel' | null;

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, isPremium, isAdmin, onActivatePremium, onRedeemCode, onSendProof, isOwnProfile, onLogout }) => {
  const [copied, setCopied] = useState(false);
  const [userVote, setUserVote] = useState<ReactionType>(null);
  const [counts, setCounts] = useState({ sexy: 0, legal: 0, confiavel: 0 });
  const [frameThickness, setFrameThickness] = useState(12);
  const [customFrame, setCustomFrame] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [publicCode, setPublicCode] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [showActivationInput, setShowActivationInput] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Edição de Perfil
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: profile?.display_name || '',
    picture: profile?.picture || '',
    about: profile?.about || '',
    age: profile?.age?.toString() || '',
    gender: profile?.gender || 'male',
    location: profile?.location || 'BR'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Depoimentos
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [testimonialText, setTestimonialText] = useState('');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  
  const frameInputRef = useRef<HTMLInputElement>(null);
  const pixKey = "0f165c92-dcd5-4a08-b3b8-48396f9de88a";

  useEffect(() => {
    if (profile) {
      try {
        if(profile.pubkey) {
           const npub = nip19.npubEncode(profile.pubkey);
           setPublicCode(npub);
        }
      } catch (e) {
        setPublicCode(profile.pubkey);
      }

      const savedVote = localStorage.getItem(`vote_${profile.pubkey}`);
      if (savedVote) setUserVote(savedVote as ReactionType);
      
      setCounts({
        sexy: savedVote === 'sexy' ? 1 : 0,
        legal: savedVote === 'legal' ? 1 : 0,
        confiavel: savedVote === 'confiavel' ? 1 : 0
      });
      
      const savedThickness = localStorage.getItem(`frame_thickness_${profile.pubkey}`);
      if (savedThickness) setFrameThickness(Number(savedThickness));
      
      const savedFrame = localStorage.getItem(`custom_frame_${profile.pubkey}`);
      if (savedFrame) setCustomFrame(savedFrame);

      setEditForm({
        display_name: profile.display_name || profile.name || '',
        picture: profile.picture || '',
        about: profile.about || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || 'male',
        location: profile.location || 'BR'
      });

      const loadedTestimonials = nostrService.getTestimonials(profile.pubkey);
      setTestimonials(loadedTestimonials);
    }
  }, [profile]);

  const handleVote = (type: ReactionType) => {
     if (!type) return;
     if (userVote === type) {
         setUserVote(null);
         setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
         localStorage.removeItem(`vote_${profile?.pubkey}`);
     } else {
         if (userVote) {
             setCounts(prev => ({ ...prev, [userVote]: Math.max(0, prev[userVote] - 1) }));
         }
         setUserVote(type);
         setCounts(prev => ({ ...prev, [type]: prev[type] + 1 }));
         localStorage.setItem(`vote_${profile?.pubkey}`, type);
     }
  };

  const handleFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512; canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const scale = Math.max(512 / img.width, 512 / img.height);
            ctx.drawImage(img, (512 - img.width * scale) / 2, (512 - img.height * scale) / 2, img.width * scale, img.height * scale);
            const base64 = canvas.toDataURL('image/jpeg', 0.6);
            setCustomFrame(base64);
            localStorage.setItem(`custom_frame_${profile.pubkey}`, base64);
            setShowMenu(false);
            setShowControls(true);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsCompressing(true);
          const reader = new FileReader();
          reader.onloadend = () => {
             const img = new Image();
             img.onload = () => {
                 const canvas = document.createElement('canvas');
                 const maxWidth = 800; // Resize to ensure it fits in LocalStorage
                 const scale = maxWidth / img.width;
                 const width = img.width > maxWidth ? maxWidth : img.width;
                 const height = img.width > maxWidth ? img.height * scale : img.height;
                 
                 canvas.width = width;
                 canvas.height = height;
                 
                 const ctx = canvas.getContext('2d');
                 if(ctx) {
                     ctx.drawImage(img, 0, 0, width, height);
                     // Compress quality to 0.7
                     const base64 = canvas.toDataURL('image/jpeg', 0.7);
                     setProofImage(base64);
                     setIsCompressing(false);
                 }
             };
             img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveProfile = async () => {
    const privkey = localStorage.getItem('agito_key');
    if (!privkey || !profile) return;

    setIsSaving(true);
    try {
      await nostrService.publishMetadata(privkey, {
        display_name: editForm.display_name,
        name: editForm.display_name,
        picture: editForm.picture,
        about: editForm.about,
        age: parseInt(editForm.age) || 18,
        gender: editForm.gender as 'male' | 'female',
        location: editForm.location as 'BR' | 'GLOBAL'
      });
      setIsEditing(false);
    } catch (e) {
      alert("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestimonial = async () => {
    const privkey = localStorage.getItem('agito_key');
    if (!privkey || !profile || !testimonialText.trim()) return;

    try {
      await nostrService.publishTestimonial(privkey, profile.pubkey, testimonialText);
      setTestimonialText('');
      setShowTestimonialModal(false);
      const updated = nostrService.getTestimonials(profile.pubkey);
      setTestimonials(updated);
      alert("Depoimento enviado com sucesso!");
    } catch (e) {
      alert("Erro ao enviar depoimento.");
    }
  };

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyNpub = () => {
    navigator.clipboard.writeText(publicCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const submitProof = () => {
      if(onSendProof && proofImage) {
          onSendProof(proofImage);
          setProofImage(null);
          setShowProofModal(false);
      } else {
          alert("Por favor, selecione uma imagem.");
      }
  };

  const validateCode = () => {
      if (!onRedeemCode) return;
      const success = onRedeemCode(activationCode.toUpperCase().trim());
      if (success) {
          setShowActivationInput(false);
          alert("Código Validado! Você agora possui o Selo de Apoiador.");
      } else {
          alert("Código inválido ou já utilizado.");
      }
  };

  const avatarUrl = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.pubkey || 'default'}`;

  const renderBadge = () => {
      if (isOwnProfile && isAdmin) {
          return (
             <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 px-6 py-2.5 rounded-full border border-yellow-500/20 mx-auto w-fit shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                <Crown size={12} className="text-yellow-500" fill="currentColor" />
                <p className="text-yellow-500 text-[10px] font-black tracking-[0.3em] uppercase italic">DONO DA REDE</p>
             </div>
          );
      }
      if (isOwnProfile && isPremium) {
          return (
             <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500/10 to-rose-500/10 px-6 py-2.5 rounded-full border border-pink-500/20 mx-auto w-fit shadow-[0_0_20px_rgba(236,72,153,0.15)]">
                <Star size={12} className="text-pink-500" fill="currentColor" />
                <p className="text-pink-400 text-[10px] font-black tracking-[0.3em] uppercase italic">APOIADOR VIP</p>
             </div>
          );
      }
      return (
         <div className="flex items-center justify-center gap-2 bg-blue-500/10 px-5 py-2.5 rounded-full border border-blue-500/20 mx-auto w-fit">
            <Lock size={12} className="text-blue-500" />
            <p className="text-blue-400 text-[10px] font-black tracking-[0.3em] uppercase italic">IDENTIDADE REAL NOSTR</p>
         </div>
      );
  };

  const framePadding = isPremium ? frameThickness : 5; 
  
  const frameBackground = isPremium 
      ? (customFrame ? `url(${customFrame})` : 'linear-gradient(45deg, #3b82f6, #a855f7, #ec4899)') 
      : 'linear-gradient(180deg, #475569, #1e293b)'; 

  return (
    <div className="flex flex-col animate-in fade-in duration-500 pb-10 bg-slate-950 min-h-full">
      <div className="px-4 py-20 flex flex-col items-center relative">
        
        {isOwnProfile && onLogout && (
           <button onClick={onLogout} className="absolute top-4 right-4 bg-red-500/10 text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all border border-red-500/20 z-50" title="Sair da Conta">
              <LogOut size={20} />
           </button>
        )}

        {/* CONTAINER DA MOLDURA */}
        <div className="relative group/avatar">
          <div 
            className="rounded-full transition-all duration-300 ease-out flex items-center justify-center shadow-2xl relative"
            style={{ 
              padding: `${framePadding}px`,
              backgroundImage: frameBackground,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: isPremium ? '0 10px 40px -10px rgba(59, 130, 246, 0.5)' : 'none'
            }}
          >
            {/* Foto de Perfil */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-[4px] border-slate-950 bg-slate-900 overflow-hidden relative z-10 shrink-0 shadow-inner">
              <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" onError={e => e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.pubkey}`} />
              {isEditing && (<div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all"><Camera size={32} className="text-white" /></div>)}
            </div>
            
            {/* Animação para moldura padrão premium */}
            {isPremium && !customFrame && (
                <div className="absolute inset-0 rounded-full animate-spin-slow opacity-30 bg-inherit pointer-events-none" style={{ mixBlendMode: 'overlay' }}></div>
            )}
          </div>

          {isOwnProfile && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="absolute -top-2 -right-2 bg-slate-900 border border-white/10 p-3 rounded-full text-blue-400 shadow-xl hover:scale-110 active:scale-95 transition-all z-40"><Edit3 size={20} /></button>
          )}

          {/* Botão de Menu para Moldura (Sempre visível se Premium e Dono) */}
          {isOwnProfile && isPremium && !isEditing && (
            <div className="absolute bottom-4 right-4 z-50">
              <button 
                onClick={() => setShowMenu(!showMenu)} 
                className={`w-12 h-12 rounded-full border-4 border-slate-950 shadow-2xl flex items-center justify-center transition-all active:scale-90 ${showMenu ? 'bg-red-600 rotate-45 text-white' : 'bg-blue-600 text-white'}`}
              >
                <Plus size={24} strokeWidth={4} />
              </button>
              
              {showMenu && (
                <div className="absolute bottom-16 right-0 w-52 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2 flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-200 z-50">
                  <button onClick={() => frameInputRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400"><ImageIcon size={16} /> Moldura Galeria</button>
                  <button onClick={() => { setShowControls(true); setShowMenu(false); }} className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300"><Settings2 size={16} /> Ajustar Espessura</button>
                  <div className="h-px bg-white/5 my-1 mx-2"></div>
                  <button onClick={() => { setCustomFrame(null); localStorage.removeItem(`custom_frame_${profile?.pubkey}`); setShowMenu(false); }} className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500"><Trash2 size={16} /> Resetar Moldura</button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Input escondido para upload de arquivo */}
        <input type="file" ref={frameInputRef} onChange={handleFrameUpload} accept="image/*" className="hidden" />

        <div className="mt-14 text-center w-full">
          <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white leading-none mb-2 break-words px-4">{profile?.display_name || profile?.name || "Desconhecido"}</h2>
          
          <div className="flex justify-center items-center gap-2 mb-4">
              {profile?.age && (
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">{profile.age} Anos</span>
              )}
              {profile?.gender && (
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">{profile.gender === 'male' ? 'H' : 'M'}</span>
              )}
              {profile?.location && (
                  <span className="bg-blue-900/40 text-blue-300 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">{profile.location}</span>
              )}
          </div>

          <button onClick={copyNpub} className="mx-auto mb-4 flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-500 hover:text-blue-400 hover:border-blue-500/30 transition-all active:scale-95 max-w-[200px]"><QrCode size={10} /><span className="text-[9px] font-mono truncate">{publicCode}</span>{codeCopied ? <CheckCircle size={10} className="text-green-500" /> : <Copy size={10} />}</button>
          
          <div className="flex flex-col items-center gap-4">
            {renderBadge()}
            <div className="flex gap-2">
                {!isOwnProfile && !isEditing && (
                  <button onClick={() => setShowTestimonialModal(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-400 px-6 py-3 rounded-2xl border border-slate-700 hover:border-blue-500 transition-all active:scale-95 group shadow-lg"><Quote size={16} className="group-hover:fill-current" /><span className="text-[10px] font-black uppercase tracking-widest">Enviar Depoimento</span></button>
                )}
            </div>
          </div>
        </div>

        {/* REAÇÕES */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          <button onClick={() => handleVote('sexy')} className={`flex items-center gap-3 px-6 py-4 rounded-full border border-white/5 transition-all active:scale-95 ${userVote === 'sexy' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-900/50 text-rose-500 hover:border-rose-500/30'}`}><Heart size={20} fill={userVote === 'sexy' ? "currentColor" : "none"} /><span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sexy ({counts.sexy})</span></button>
          <button onClick={() => handleVote('legal')} className={`flex items-center gap-3 px-6 py-4 rounded-full border border-white/5 transition-all active:scale-95 ${userVote === 'legal' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-900/50 text-yellow-500 hover:border-yellow-500/30'}`}><Smile size={20} fill={userVote === 'legal' ? "currentColor" : "none"} /><span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Legal ({counts.legal})</span></button>
          <button onClick={() => handleVote('confiavel')} className={`flex items-center gap-3 px-6 py-4 rounded-full border border-white/5 transition-all active:scale-95 ${userVote === 'confiavel' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-900/50 text-blue-500 hover:border-blue-500/30'}`}><Shield size={20} fill={userVote === 'confiavel' ? "currentColor" : "none"} /><span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Confiavel ({counts.confiavel})</span></button>
        </div>

        <p className="mt-16 px-12 text-slate-500 text-center text-[15px] font-medium italic opacity-80 leading-relaxed max-w-sm mb-12">"{profile?.about || "Navegando de forma soberana na rede descentralizada Nostr."}"</p>
        
        {/* MODAL EDIÇÃO */}
        {isEditing && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col p-6 overflow-y-auto">
             <div className="flex items-center justify-between mb-6"><button onClick={() => setIsEditing(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={28} /></button><h2 className="text-xl font-black italic uppercase tracking-widest">Editar Identidade</h2><button onClick={handleSaveProfile} disabled={isSaving} className="bg-blue-600 text-white font-black px-6 py-2 rounded-full uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-blue-600/30 flex items-center gap-2">{isSaving ? "Salvando..." : <><Save size={14} /> Salvar</>}</button></div>
             
             <div className="space-y-6 max-w-sm mx-auto w-full pb-20">
                {/* DADOS DE MATCH */}
                <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-4 space-y-4">
                    <h3 className="text-blue-400 text-xs font-black uppercase tracking-widest flex items-center gap-2"><MapPin size={14} /> Dados de Encontros</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Idade</label>
                            <input type="number" value={editForm.age} onChange={e => setEditForm({...editForm, age: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Local</label>
                            <select value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                                <option value="BR">Brasil</option>
                                <option value="GLOBAL">Global</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gênero</label>
                        <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                            <option value="male">Masculino</option>
                            <option value="female">Feminino</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nome de Exibição</label><input type="text" value={editForm.display_name} onChange={e => setEditForm({...editForm, display_name: e.target.value})} placeholder="Seu nome real ou nick" className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">URL da Foto de Perfil</label><input type="url" value={editForm.picture} onChange={e => setEditForm({...editForm, picture: e.target.value})} placeholder="https://..." className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-6 py-4 text-blue-400 focus:outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Sua Biografia (Onda)</label><textarea value={editForm.about} onChange={e => setEditForm({...editForm, about: e.target.value})} placeholder="Conte um pouco sobre você..." rows={4} className="w-full bg-slate-900 border border-slate-800 rounded-[2rem] px-6 py-5 text-slate-300 focus:outline-none resize-none" /></div>
                
                <div className="pt-6 border-t border-slate-900"><div className="flex items-center gap-3 text-slate-600"><ShieldCheck size={16} /><p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">As alterações serão assinadas e propagadas para os servidores Nostr vinculados.</p></div></div>
             </div>
          </div>
        )}

        {/* SLIDER DE AJUSTE ESPESSURA */}
        {showControls && (
          <div className="fixed inset-x-6 bottom-24 bg-slate-900/98 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] z-50 animate-in slide-in-from-bottom-10 max-w-sm mx-auto shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
             <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col"><span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">Impacto Visual</span><span className="text-3xl font-black italic text-white tracking-tighter">{frameThickness}PX</span></div><button onClick={() => setShowControls(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={28} /></button>
             </div>
             <input type="range" min="0" max="200" value={frameThickness} onChange={e => { const val = Number(e.target.value); setFrameThickness(val); if (profile) localStorage.setItem(`frame_thickness_${profile.pubkey}`, val.toString()); }} className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500 mb-10" />
             <button onClick={() => setShowControls(false)} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all">Aplicar Design</button>
          </div>
        )}
        
        {/* ÁREA DE APOIO E CÓDIGOS */}
        {!isEditing && isOwnProfile && (
            <div className="mt-8 w-full max-w-sm flex flex-col gap-4">
                
                {/* BOTÃO TENHO UM CÓDIGO */}
                {!isPremium && !showActivationInput && (
                    <button onClick={() => setShowActivationInput(true)} className="w-full border border-dashed border-slate-700 hover:border-blue-500 text-slate-500 hover:text-blue-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Tenho um Código VIP
                    </button>
                )}

                {showActivationInput && (
                    <div className="bg-slate-900 border border-blue-500/50 p-4 rounded-2xl animate-in zoom-in">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Inserir Código de Ativação</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={activationCode} 
                                onChange={e => setActivationCode(e.target.value)} 
                                placeholder="AGITO-XXXXXX"
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white text-sm uppercase font-mono focus:outline-none focus:border-blue-500"
                            />
                            <button onClick={validateCode} className="bg-blue-600 text-white px-4 rounded-xl font-bold"><Check size={16} /></button>
                        </div>
                    </div>
                )}

                {/* PROMOÇÃO PREMIUM */}
                {!isPremium && (
                    <div className="bg-gradient-to-br from-blue-600/30 via-slate-900/50 to-slate-900/80 border border-blue-500/30 p-8 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Zap size={150} /></div>
                        <Zap className="mx-auto mb-4 text-blue-500" size={32} />
                        <h3 className="text-xl font-black uppercase italic mb-2 text-white">Seja um Apoiador</h3>
                        <p className="text-xs text-slate-400 mb-6 font-medium italic px-4">Ajude a manter a rede viva, ganhe selo VIP e molduras exclusivas!</p>
                        
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-6">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Chave Pix de Apoio (R$ 5,00)</p>
                            <button onClick={copyPix} className="text-[10px] font-mono text-blue-400 break-all select-all flex items-center justify-center gap-2 hover:text-white transition-colors">{copied ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}{copied ? "COPIADO!" : pixKey}</button>
                        </div>

                        <button onClick={() => setShowProofModal(true)} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-green-600/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                           <Upload size={14} /> Enviar Comprovante
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* MODAL DE ENVIO DE COMPROVANTE */}
        {showProofModal && (
            <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
                 <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-2xl">
                     <button onClick={() => setShowProofModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>
                     <h3 className="text-lg font-black italic uppercase text-white mb-1">Enviar Comprovante</h3>
                     <p className="text-xs text-slate-400 mb-6">O Admin analisará seu apoio e liberará seu selo.</p>
                     
                     <div 
                        onClick={() => proofInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800/50 rounded-2xl h-40 flex flex-col items-center justify-center cursor-pointer transition-all mb-6 overflow-hidden relative"
                     >
                         {isCompressing ? (
                             <div className="flex flex-col items-center">
                                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                                 <span className="text-xs text-slate-500">Comprimindo imagem...</span>
                             </div>
                         ) : proofImage ? (
                             proofImage.startsWith('data:video') ? (
                                <video src={proofImage} className="w-full h-full object-cover" controls />
                             ) : (
                                <img src={proofImage} className="w-full h-full object-cover" alt="Preview" />
                             )
                         ) : (
                             <>
                                <Upload size={32} className="text-slate-500 mb-2" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Toque para selecionar</span>
                             </>
                         )}
                     </div>
                     <input type="file" ref={proofInputRef} onChange={handleProofUpload} accept="image/*,video/*" className="hidden" />

                     <button onClick={submitProof} disabled={isCompressing} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-blue-500 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                        <Send size={14} /> Enviar para Análise
                     </button>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};