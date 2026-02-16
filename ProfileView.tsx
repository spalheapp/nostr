
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Testimonial } from '../types';
import { nostrService } from '../services/nostr';
import { Copy, CheckCircle, Zap, ShieldCheck, Heart, Smile, Shield, Plus, Check, Image as ImageIcon, Lock, Settings2, Trash2, X, Edit3, Save, Camera, Quote, MessageCircleHeart, Share2, Crown } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile | null;
  isPremium: boolean;
  onActivatePremium: () => void;
  isOwnProfile?: boolean;
}

type ReactionType = 'sexy' | 'legal' | 'confiavel' | null;

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, isPremium, onActivatePremium, isOwnProfile }) => {
  const [copied, setCopied] = useState(false);
  const [userVote, setUserVote] = useState<ReactionType>(null);
  const [counts, setCounts] = useState({ sexy: 0, legal: 0, confiavel: 0 });
  const [frameThickness, setFrameThickness] = useState(Number(localStorage.getItem(`frame_thickness_${profile?.pubkey}`) || '12'));
  const [customFrame, setCustomFrame] = useState<string | null>(localStorage.getItem(`custom_frame_${profile?.pubkey}`));
  const [showControls, setShowControls] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Edição de Perfil
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: profile?.display_name || '',
    picture: profile?.picture || '',
    about: profile?.about || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Depoimentos
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [testimonialText, setTestimonialText] = useState('');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pixKey = "0f165c92-dcd5-4a08-b3b8-48396f9de88a";

  useEffect(() => {
    if (profile) {
      const savedVote = localStorage.getItem(`vote_${profile.pubkey}`);
      if (savedVote) setUserVote(savedVote as ReactionType);
      
      const seed = parseInt(profile.pubkey.slice(0, 4), 16) || 10;
      setCounts({
        sexy: (seed % 20) + (savedVote === 'sexy' ? 1 : 0),
        legal: (seed % 50) + (savedVote === 'legal' ? 1 : 0),
        confiavel: (seed % 15) + (savedVote === 'confiavel' ? 1 : 0)
      });
      
      const savedThickness = localStorage.getItem(`frame_thickness_${profile.pubkey}`);
      if (savedThickness) setFrameThickness(Number(savedThickness));

      const savedFrame = localStorage.getItem(`custom_frame_${profile.pubkey}`);
      if (savedFrame) setCustomFrame(savedFrame);

      setEditForm({
        display_name: profile.display_name || profile.name || '',
        picture: profile.picture || '',
        about: profile.about || ''
      });

      // Carregar Depoimentos
      const loadedTestimonials = nostrService.getTestimonials(profile.pubkey);
      setTestimonials(loadedTestimonials);
    }
  }, [profile]);

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

  const handleSaveProfile = async () => {
    const privkey = localStorage.getItem('agito_key');
    if (!privkey || !profile) return;

    setIsSaving(true);
    try {
      await nostrService.publishMetadata(privkey, {
        display_name: editForm.display_name,
        name: editForm.display_name,
        picture: editForm.picture,
        about: editForm.about
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
      // Atualiza lista local
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

  const avatarUrl = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.pubkey || 'default'}`;

  return (
    <div className="flex flex-col animate-in fade-in duration-500 pb-10 bg-slate-950 min-h-full">
      <div className="px-4 py-20 flex flex-col items-center relative overflow-hidden">
        
        {/* CONTAINER DA MOLDURA */}
        <div className="relative group/avatar">
          <div 
            className="rounded-full transition-all duration-300 ease-out flex items-center justify-center overflow-hidden"
            style={{ 
              padding: isPremium ? `${frameThickness}px` : '4px',
              backgroundImage: isPremium && customFrame ? `url(${customFrame})` : (isPremium ? 'linear-gradient(45deg, #3b82f6, #a855f7, #ec4899)' : 'none'),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: isPremium ? 'transparent' : '#1e293b',
              boxShadow: 'none'
            }}
          >
            {/* Foto de Perfil fixa */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-[6px] border-slate-950 bg-slate-900 overflow-hidden relative z-10 shrink-0 shadow-inner">
              <img 
                src={avatarUrl} 
                className="w-full h-full object-cover" 
                alt="Avatar" 
                onError={e => e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.pubkey}`} 
              />
              {isEditing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all">
                  <Camera size={32} className="text-white" />
                </div>
              )}
            </div>
            
            {isPremium && !customFrame && (
              <div className="absolute inset-0 animate-spin-slow opacity-30 bg-inherit pointer-events-none"></div>
            )}
          </div>

          {/* Botão de Edição (Se for o próprio perfil) */}
          {isOwnProfile && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute -top-2 -right-2 bg-slate-900 border border-white/10 p-3 rounded-full text-blue-400 shadow-xl hover:scale-110 active:scale-95 transition-all z-40"
            >
              <Edit3 size={20} />
            </button>
          )}

          {/* BOTÃO "+" NO CANTO (Exclusivo Premium E DONO DO PERFIL) */}
          {isOwnProfile && isPremium && !isEditing && (
            <div className="absolute bottom-4 right-4 z-30">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className={`w-12 h-12 rounded-full border-4 border-slate-950 shadow-2xl flex items-center justify-center transition-all active:scale-90 ${showMenu ? 'bg-red-600 rotate-45 text-white' : 'bg-blue-600 text-white'}`}
              >
                <Plus size={24} strokeWidth={4} />
              </button>

              {showMenu && (
                <div className="absolute bottom-16 right-0 w-52 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2 flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-200">
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400">
                    <ImageIcon size={16} /> Moldura Galeria
                  </button>
                  <button onClick={() => { setShowControls(true); setShowMenu(false); }} className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300">
                    <Settings2 size={16} /> Ajustar Espessura
                  </button>
                  <div className="h-px bg-white/5 my-1 mx-2"></div>
                  <button onClick={() => { setCustomFrame(null); localStorage.removeItem(`custom_frame_${profile?.pubkey}`); setShowMenu(false); }} className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500">
                    <Trash2 size={16} /> Resetar Moldura
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFrameUpload} accept="image/*" className="hidden" />

        {/* INFO PERFIL */}
        <div className="mt-14 text-center w-full">
          <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white leading-none mb-4 break-words px-4">
            {profile?.display_name || profile?.name || "Desconhecido"}
          </h2>
          
          <div className="flex flex-col items-center gap-4">
            {/* BADGE DE IDENTIDADE REAL / ADMIN */}
            {isPremium && isOwnProfile ? (
                 <div className="flex items-center justify-center gap-2 bg-yellow-500/10 px-5 py-2.5 rounded-full border border-yellow-500/20 mx-auto w-fit">
                    <Crown size={12} className="text-yellow-500" />
                    <p className="text-yellow-400 text-[10px] font-black tracking-[0.3em] uppercase italic">DONO VERIFICADO</p>
                 </div>
            ) : (
                <div className="flex items-center justify-center gap-2 bg-blue-500/10 px-5 py-2.5 rounded-full border border-blue-500/20 mx-auto w-fit">
                   <Lock size={12} className="text-blue-500" />
                   <p className="text-blue-400 text-[10px] font-black tracking-[0.3em] uppercase italic">IDENTIDADE REAL NOSTR</p>
                </div>
            )}

            <div className="flex gap-2">
                {/* BOTÃO ENVIAR DEPOIMENTO (VISÍVEL APENAS SE NÃO FOR O PRÓPRIO PERFIL) */}
                {!isOwnProfile && !isEditing && (
                  <button 
                    onClick={() => setShowTestimonialModal(true)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-400 px-6 py-3 rounded-2xl border border-slate-700 hover:border-blue-500 transition-all active:scale-95 group shadow-lg"
                  >
                    <Quote size={16} className="group-hover:fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Enviar Depoimento</span>
                  </button>
                )}
            </div>
          </div>
        </div>

        {/* MODAL DE DEPOIMENTO */}
        {showTestimonialModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
             <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-2xl">
                <button 
                  onClick={() => setShowTestimonialModal(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                  <X size={24} />
                </button>
                
                <h3 className="text-xl font-black italic uppercase text-white mb-6 flex items-center gap-2">
                  <MessageCircleHeart className="text-rose-500" />
                  Escrever Depoimento
                </h3>
                
                <textarea 
                  value={testimonialText}
                  onChange={(e) => setTestimonialText(e.target.value)}
                  placeholder={`O que você acha do(a) ${profile?.display_name}? Escreva algo marcante...`}
                  className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none mb-6"
                />

                <button 
                  onClick={handleSendTestimonial}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                >
                  Publicar no Mural
                </button>
             </div>
          </div>
        )}

        {/* REAÇÕES (ORKUT STYLE) */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          <button onClick={() => {}} className="flex items-center gap-3 px-6 py-4 rounded-full border border-white/5 bg-slate-900/50 text-rose-500 hover:border-rose-500/30 transition-all active:scale-95">
            <Heart size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sexy ({counts.sexy})</span>
          </button>
          <button onClick={() => {}} className="flex items-center gap-3 px-6 py-4 rounded-full border border-white/5 bg-slate-900/50 text-yellow-500 hover:border-yellow-500/30 transition-all active:scale-95">
            <Smile size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Legal ({counts.legal})</span>
          </button>
          <button onClick={() => {}} className="flex items-center gap-3 px-6 py-4 rounded-full border border-white/5 bg-slate-900/50 text-blue-500 hover:border-blue-500/30 transition-all active:scale-95">
            <Shield size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Confiavel ({counts.confiavel})</span>
          </button>
        </div>

        <p className="mt-16 px-12 text-slate-500 text-center text-[15px] font-medium italic opacity-80 leading-relaxed max-w-sm mb-12">
          "{profile?.about || "Navegando de forma soberana na rede descentralizada Nostr."}"
        </p>
        
        {/* MURAL DE DEPOIMENTOS */}
        {testimonials.length > 0 && (
          <div className="w-full max-w-md mt-4 mb-16 animate-in slide-in-from-bottom-10">
             <div className="flex items-center gap-3 mb-6 px-4">
                <Quote className="text-blue-500" size={20} />
                <h3 className="text-lg font-black uppercase italic tracking-widest text-slate-300">Mural de Depoimentos</h3>
                <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-full">{testimonials.length}</span>
             </div>
             
             <div className="space-y-4 px-2">
                {testimonials.map((t) => (
                  <div key={t.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl relative">
                     <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                           <img src={t.authorPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.fromPubkey}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{t.authorName}</span>
                              <span className="text-[8px] text-slate-600 font-mono">{new Date(t.timestamp).toLocaleDateString()}</span>
                           </div>
                           <p className="text-sm text-slate-300 italic leading-relaxed">"{t.content}"</p>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO DE PERFIL */}
        {isEditing && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col p-6">
             <div className="flex items-center justify-between mb-10">
                <button onClick={() => setIsEditing(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={28} />
                </button>
                <h2 className="text-xl font-black italic uppercase tracking-widest">Editar Identidade</h2>
                <button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="bg-blue-600 text-white font-black px-6 py-2 rounded-full uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  {isSaving ? "Salvando..." : <><Save size={14} /> Salvar</>}
                </button>
             </div>

             <div className="space-y-8 max-w-sm mx-auto w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nome de Exibição</label>
                  <input 
                    type="text" 
                    value={editForm.display_name}
                    onChange={e => setEditForm({...editForm, display_name: e.target.value})}
                    placeholder="Seu nome real ou nick"
                    className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">URL da Foto de Perfil</label>
                  <input 
                    type="url" 
                    value={editForm.picture}
                    onChange={e => setEditForm({...editForm, picture: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-6 py-4 text-blue-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Sua Biografia (Onda)</label>
                  <textarea 
                    value={editForm.about}
                    onChange={e => setEditForm({...editForm, about: e.target.value})}
                    placeholder="Conte um pouco sobre você..."
                    rows={4}
                    className="w-full bg-slate-900 border border-slate-800 rounded-[2rem] px-6 py-5 text-slate-300 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-6 border-t border-slate-900">
                  <div className="flex items-center gap-3 text-slate-600">
                    <ShieldCheck size={16} />
                    <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">As alterações serão assinadas e propagadas para os servidores Nostr vinculados.</p>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* SLIDER DE AJUSTE ESPESSURA */}
        {showControls && (
          <div className="fixed inset-x-6 bottom-24 bg-slate-900/98 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] z-50 animate-in slide-in-from-bottom-10 max-w-sm mx-auto shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
             <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">Impacto Visual</span>
                  <span className="text-3xl font-black italic text-white tracking-tighter">{frameThickness}PX</span>
                </div>
                <button onClick={() => setShowControls(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={28} />
                </button>
             </div>
             
             <input 
              type="range" 
              min="0" 
              max="200" 
              value={frameThickness} 
              onChange={e => { 
                const val = Number(e.target.value);
                setFrameThickness(val); 
                if (profile) localStorage.setItem(`frame_thickness_${profile.pubkey}`, val.toString()); 
              }}
              className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500 mb-10"
             />
             
             <button 
              onClick={() => setShowControls(false)} 
              className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all"
             >
               Aplicar Design
             </button>
          </div>
        )}

        {/* PROMOÇÃO PREMIUM (APARECE NO FINAL) */}
        {!isPremium && (
          <div className="mt-8 w-full max-w-sm bg-gradient-to-br from-blue-600/30 via-slate-900/50 to-slate-900/80 border border-blue-500/30 p-10 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
              <Zap size={150} />
            </div>
            <Zap className="mx-auto mb-6 text-blue-500" size={40} />
            <h3 className="text-2xl font-black uppercase italic mb-3 text-white">Libere o Agito Pro</h3>
            <p className="text-sm text-slate-400 mb-10 font-medium italic">Molduras infinitas da galeria e ajustes gigantes de até 200px!</p>
            
            <div className="bg-black/40 p-6 rounded-3xl border border-white/5 mb-8">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Chave Pix de Ativação</p>
              <button onClick={copyPix} className="text-xs font-mono text-blue-400 break-all select-all flex items-center justify-center gap-2">
                {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? "COPIADO!" : "Copiar Chave"}
              </button>
            </div>

            <button onClick={onActivatePremium} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-sm shadow-xl shadow-blue-600/30 active:scale-95 transition-all">
              Ativar Agito Pro - R$ 3,00
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
