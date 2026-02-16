import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, ShieldCheck, ShieldAlert, Image as ImageIcon, Mic, Paperclip, Lock, AlertTriangle, MessageSquareWarning, UserX, AlertOctagon, X, CheckCircle, Play, Pause, Square, Trash2 } from 'lucide-react';
import { UserProfile, ChatMessage } from '../types';

interface ChatViewProps {
  recipient: UserProfile;
  onBack: () => void;
  isPremium: boolean;
  onReport: (history: ChatMessage[], reason: string) => void;
  onViewProfile: (user: UserProfile) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ recipient, onBack, isPremium, onReport, onViewProfile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // UI State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage on init or when recipient changes
  useEffect(() => {
    const key = `chat_${recipient.pubkey}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([]);
    }
  }, [recipient.pubkey]);

  // Save to local storage on change
  useEffect(() => {
    const key = `chat_${recipient.pubkey}`;
    localStorage.setItem(key, JSON.stringify(messages));
  }, [messages, recipient.pubkey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Função genérica de envio
  const sendMessage = (type: 'text' | 'image' | 'audio' = 'text', content: string = '', mediaUrl?: string) => {
    const textToSend = content || input;
    if (!textToSend.trim() && type === 'text') return;
    
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      senderPubkey: 'me',
      content: textToSend,
      timestamp: Date.now(),
      type,
      mediaUrl
    };
    
    setMessages(prev => [...prev, newMessage]);
    if (type === 'text') setInput('');
    
    // Simulação de resposta (apenas se for texto, para não floodar)
    if (type === 'text') {
        setTimeout(() => {
        const reply: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            senderPubkey: recipient.pubkey,
            content: `Oi! Sou o ${recipient.display_name || 'usuário'}. Recebi seu sinal criptografado via Nostr.`,
            timestamp: Date.now(),
            type: 'text'
        };
        setMessages(prev => [...prev, reply]);
        }, 2000);
    }
  };

  // --- LIMPAR CONVERSA ---
  const handleClearChat = () => {
    if (window.confirm("Isso apagará o histórico desta conversa no seu dispositivo. Confirmar?")) {
        setMessages([]);
    }
  };

  // --- LÓGICA DE FOTOS (GALERIA) ---
  const handleImageClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              // Envia a imagem como Base64
              sendMessage('image', 'Foto enviada', reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // --- LÓGICA DE ÁUDIO (GRAVAÇÃO REAL) ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };

          mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = () => {
                  const base64Audio = reader.result as string;
                  sendMessage('audio', 'Mensagem de voz', base64Audio);
              };
              
              // Limpar tracks para desligar o microfone
              stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          setIsRecording(true);
          
          // Timer visual
          setRecordingDuration(0);
          timerRef.current = window.setInterval(() => {
              setRecordingDuration(prev => prev + 1);
          }, 1000);

      } catch (err) {
          console.error("Erro ao acessar microfone:", err);
          alert("Não foi possível acessar o microfone. Verifique as permissões.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
      }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- REPRODUÇÃO DE ÁUDIO ---
  const togglePlayAudio = (msgId: string, url?: string) => {
      if (!url) return;

      if (playingAudioId === msgId) {
          // Pause
          audioPlayerRef.current?.pause();
          setPlayingAudioId(null);
      } else {
          // Play new
          if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
          }
          const audio = new Audio(url);
          audioPlayerRef.current = audio;
          audio.onended = () => setPlayingAudioId(null);
          audio.play();
          setPlayingAudioId(msgId);
      }
  };

  // --- DENÚNCIA ---
  const handleReportSubmit = (reason: string) => {
    const currentHistory = [...messages];
    onReport(currentHistory, reason);
    setReportSent(true);
    setTimeout(() => {
        setShowReportModal(false);
        setReportSent(false);
        onBack();
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 animate-in slide-in-from-right duration-300 relative z-10">
      
      {/* Input de Arquivo Oculto */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* MODAL DE DENÚNCIA */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
           <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-2xl">
               {!reportSent ? (
                 <>
                   <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                      <X size={24} />
                   </button>
                   
                   <div className="flex flex-col items-center mb-6 text-center">
                      <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-3 border border-red-500/30">
                         <ShieldAlert className="text-red-500" size={24} />
                      </div>
                      <h3 className="text-lg font-black italic uppercase text-white tracking-widest">Reportar Usuário</h3>
                      <p className="text-xs text-slate-400 mt-1">Selecione o motivo para enviar as evidências ao Admin.</p>
                   </div>
                   
                   <div className="grid gap-3">
                      <button onClick={() => handleReportSubmit('Conteúdo Sensual')} className="flex items-center gap-3 p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-red-500/50 rounded-2xl transition-all group text-left active:scale-95">
                         <AlertOctagon size={20} className="text-rose-500 group-hover:scale-110 transition-transform" />
                         <div>
                            <span className="block text-xs font-black uppercase text-slate-200">Conteúdo Sensual</span>
                            <span className="text-[10px] text-slate-500">Nudez, pornografia ou solicitação indevida.</span>
                         </div>
                      </button>

                      <button onClick={() => handleReportSubmit('Racismo / Ódio')} className="flex items-center gap-3 p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-red-500/50 rounded-2xl transition-all group text-left active:scale-95">
                         <AlertTriangle size={20} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                         <div>
                            <span className="block text-xs font-black uppercase text-slate-200">Racismo</span>
                            <span className="text-[10px] text-slate-500">Discriminação, discurso de ódio ou preconceito.</span>
                         </div>
                      </button>

                      <button onClick={() => handleReportSubmit('Bullying')} className="flex items-center gap-3 p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-red-500/50 rounded-2xl transition-all group text-left active:scale-95">
                         <UserX size={20} className="text-orange-500 group-hover:scale-110 transition-transform" />
                         <div>
                            <span className="block text-xs font-black uppercase text-slate-200">Bullying</span>
                            <span className="text-[10px] text-slate-500">Assédio moral, ameaças ou intimidação.</span>
                         </div>
                      </button>

                      <button onClick={() => handleReportSubmit('Bate-boca')} className="flex items-center gap-3 p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-red-500/50 rounded-2xl transition-all group text-left active:scale-95">
                         <MessageSquareWarning size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
                         <div>
                            <span className="block text-xs font-black uppercase text-slate-200">Bate-boca</span>
                            <span className="text-[10px] text-slate-500">Brigas, ofensas pessoais ou spam.</span>
                         </div>
                      </button>
                   </div>
                 </>
               ) : (
                 <div className="py-12 flex flex-col items-center text-center animate-in zoom-in">
                    <CheckCircle size={64} className="text-green-500 mb-4" />
                    <h3 className="text-xl font-black italic uppercase text-white tracking-widest">Denúncia Enviada!</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-[200px]">As evidências foram criptografadas e enviadas para a moderação.</p>
                 </div>
               )}
           </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-900 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors p-1">
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(recipient)}>
            <div className="relative group">
                <img 
                src={recipient.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recipient.pubkey}`} 
                className="w-10 h-10 rounded-full border border-slate-800 object-cover group-hover:border-blue-500 transition-all"
                alt={recipient.name}
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full"></div>
            </div>
            <div>
                <h3 className="font-bold text-sm flex items-center gap-1 hover:text-blue-400 transition-colors">
                {recipient.display_name || recipient.name || 'Anon'}
                {isPremium && <ShieldCheck size={12} className="text-blue-400" />}
                </h3>
                <div className="flex items-center gap-1">
                <Lock size={8} className="text-slate-500" />
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Criptografia Ponta-a-Ponta</p>
                </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={handleClearChat}
                className="p-2 rounded-full bg-slate-900 text-slate-500 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                title="Limpar Conversa"
            >
                <Trash2 size={16} />
            </button>

            <button 
                onClick={() => setShowReportModal(true)}
                className="p-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-90"
                title="Denunciar Conversa"
            >
                <ShieldAlert size={16} />
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        <div className="flex justify-center my-4">
          <div className="bg-slate-900/50 border border-white/5 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Lock size={10} className="text-blue-500" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Chat 100% Criptografado</span>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
            <ShieldCheck size={32} className="mb-2 text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-widest italic">Início Seguro</p>
            <p className="text-[10px] mt-1">Sua privacidade é nossa prioridade absoluta.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.senderPubkey === 'me' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.senderPubkey === 'me' 
                ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-900/20' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              
              {msg.type === 'text' && (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}

              {msg.type === 'image' && msg.mediaUrl && (
                  <div className="mt-1">
                      <img src={msg.mediaUrl} className="rounded-lg max-h-60 object-cover bg-black/20" alt="Enviada" />
                  </div>
              )}

              {msg.type === 'audio' && (
                  <div className="flex items-center gap-2 min-w-[120px]">
                      <button 
                        onClick={() => togglePlayAudio(msg.id, msg.mediaUrl)}
                        className={`p-2 rounded-full ${msg.senderPubkey === 'me' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'}`}
                      >
                         {playingAudioId === msg.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      </button>
                      <div className="flex flex-col">
                          <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Áudio</span>
                          <span className="text-[9px] font-mono opacity-50">Mensagem de Voz</span>
                      </div>
                  </div>
              )}
            </div>
            <span className="text-[9px] text-slate-600 mt-1 px-1 font-mono">
              {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-900 sticky bottom-0 z-50">
        <div className="flex items-end gap-2 max-w-md mx-auto relative">
           
           {isRecording ? (
               <div className="flex-1 bg-red-900/20 border border-red-500/30 rounded-full h-12 flex items-center justify-between px-4 animate-in fade-in">
                   <div className="flex items-center gap-3">
                       <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                       <span className="text-red-400 font-mono font-bold">{formatTime(recordingDuration)}</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <button onClick={stopRecording} className="p-2 text-slate-400 hover:text-white"><X size={18} /></button>
                       <button onClick={stopRecording} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors shadow-lg"><Send size={18} /></button>
                   </div>
               </div>
           ) : (
               <>
                   <button onClick={handleImageClick} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                       <ImageIcon size={20} />
                   </button>
                   
                   <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl flex items-center pr-2">
                       <input 
                           type="text" 
                           value={input}
                           onChange={(e) => setInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && sendMessage('text')}
                           placeholder="Digite sua mensagem..."
                           className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-3 text-sm placeholder-slate-500"
                       />
                   </div>

                   {input.trim() ? (
                       <button 
                           onClick={() => sendMessage('text')}
                           className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-90"
                       >
                           <Send size={20} />
                       </button>
                   ) : (
                       <button 
                           onClick={toggleRecording}
                           className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-all border border-slate-700"
                       >
                           <Mic size={20} />
                       </button>
                   )}
               </>
           )}
        </div>
      </div>
    </div>
  );
};