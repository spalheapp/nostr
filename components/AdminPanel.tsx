import React, { useState } from 'react';
import { Report, ProofSubmission } from '../types';
import { ShieldAlert, Eye, Calendar, UserX, MessageSquare, Image as ImageIcon, Mic, AlertTriangle, LockOpen, Ban, CheckCircle, Smartphone, Trash2, Wallet, FileText, Send, Zap, Copy, X, Check, Award, Play } from 'lucide-react';

interface AdminPanelProps {
  reports: Report[];
  proofs: ProofSubmission[];
  onDismissReport: (id: string) => void;
  onGenerateCode: () => string;
  onOpenChat: (pubkey: string) => void;
  onApproveProof: (proof: ProofSubmission) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ reports, proofs, onDismissReport, onGenerateCode, onOpenChat, onApproveProof }) => {
  const [activeTab, setActiveTab] = useState<'moderation' | 'finance'>('moderation');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [viewProofImage, setViewProofImage] = useState<ProofSubmission | null>(null);

  const handleBlockUser = (pubkey: string) => {
      setActionFeedback(`Usuário ${pubkey.slice(0, 8)}... banido da plataforma Agito.`);
      setTimeout(() => setActionFeedback(null), 3000);
      if(selectedReport) onDismissReport(selectedReport.id);
      setSelectedReport(null);
  };

  const handleDeleteContent = () => {
      setActionFeedback(`Conteúdo da conversa #${selectedReport?.id.slice(0,4)} excluído permanentemente.`);
      setTimeout(() => setActionFeedback(null), 3000);
      if(selectedReport) onDismissReport(selectedReport.id);
      setSelectedReport(null);
  };

  const isVideo = (content: string) => {
      return content && content.startsWith('data:video');
  };

  return (
    <div className="flex flex-col p-4 animate-in fade-in duration-500 h-full relative">
      
      {/* MODAL VIEW PROOF IMAGE & ACTION */}
      {viewProofImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in backdrop-blur-md">
              <button 
                className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-50"
                onClick={() => setViewProofImage(null)}
              >
                  <X size={24} />
              </button>
              
              <div className="relative max-w-full max-h-[60vh] mb-8 flex justify-center w-full">
                 {isVideo(viewProofImage.content) ? (
                    <video 
                        src={viewProofImage.content} 
                        controls 
                        className="max-w-full max-h-[60vh] rounded-xl shadow-2xl border border-white/10"
                    />
                 ) : (viewProofImage.content.startsWith('data:image') || viewProofImage.content.startsWith('http')) ? (
                     <img 
                        src={viewProofImage.content} 
                        className="max-w-full max-h-[60vh] rounded-xl shadow-2xl border border-white/10 object-contain" 
                        alt="Comprovante Full" 
                      />
                 ) : (
                     <div className="p-10 bg-slate-900 rounded-2xl border border-slate-700 text-center w-full">
                         <FileText size={48} className="mx-auto text-slate-500 mb-4" />
                         <p className="text-slate-300 max-w-md break-words mx-auto">{viewProofImage.content}</p>
                     </div>
                 )}
              </div>

              <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-2xl">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold border border-slate-700">
                          {viewProofImage.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                          <p className="text-white font-bold text-lg">{viewProofImage.userName}</p>
                          <p className="text-slate-500 text-xs font-mono">{viewProofImage.userPubkey.slice(0,16)}...</p>
                      </div>
                  </div>
                  
                  {viewProofImage.status !== 'approved' ? (
                      <button 
                        onClick={() => {
                            onApproveProof(viewProofImage);
                            setViewProofImage(null);
                        }}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 active:scale-95 transition-all"
                      >
                          <Award size={20} strokeWidth={3} /> Gerar Código & Selo
                      </button>
                  ) : (
                      <div className="w-full bg-slate-800 text-slate-500 font-black py-5 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-not-allowed">
                          <Check size={20} /> Já Aprovado
                      </div>
                  )}
                  
                  <p className="text-[10px] text-slate-500 text-center px-4 leading-relaxed">
                      Ao clicar, um Código VIP será gerado e enviado automaticamente para o chat deste usuário, liberando o selo em seu perfil.
                  </p>
              </div>
          </div>
      )}

      <div className="mb-6 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={24} />
            <h2 className="text-xl font-black tracking-tight uppercase text-white">Painel Admin</h2>
         </div>
      </div>

      <div className="flex p-1 bg-slate-900 rounded-xl mb-6 border border-slate-800">
          <button 
             onClick={() => setActiveTab('moderation')}
             className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'moderation' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
             <ShieldAlert size={14} /> Moderação
             {reports.length > 0 && <span className="bg-red-600 text-white px-1.5 rounded-full text-[9px]">{reports.length}</span>}
          </button>
          <button 
             onClick={() => setActiveTab('finance')}
             className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'finance' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
             <Wallet size={14} /> Apoiadores
             {proofs.filter(p => p.status === 'pending').length > 0 && <span className="bg-green-600 text-white px-1.5 rounded-full text-[9px]">{proofs.filter(p => p.status === 'pending').length}</span>}
          </button>
      </div>

      {actionFeedback && (
          <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl mb-4 flex items-center gap-3 animate-in slide-in-from-top-2">
              <CheckCircle className="text-green-500" size={20} />
              <p className="text-xs font-bold text-green-400 select-all">{actionFeedback}</p>
          </div>
      )}

      {activeTab === 'moderation' && (
        !selectedReport ? (
            <div className="space-y-4">
            {reports.length === 0 ? (
                <div className="py-20 text-center opacity-30 flex flex-col items-center">
                <ShieldAlert size={48} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Tudo Limpo</p>
                <p className="text-xs mt-1 text-slate-500">Nenhuma denúncia ativa na rede.</p>
                </div>
            ) : (
                reports.map(report => (
                <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-red-500/30 transition-colors cursor-pointer group" onClick={() => setSelectedReport(report)}>
                    <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={14} className="text-yellow-500" />
                            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-wider">Motivo: {report.reason}</p>
                        </div>
                        <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[9px] uppercase font-bold w-16">Acusador:</span>
                            <span className="text-blue-400 font-mono bg-blue-400/10 px-1 rounded">{report.reporterPubkey.slice(0, 12)}...</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[9px] uppercase font-bold w-16">Acusado:</span>
                            <span className="text-red-400 font-mono bg-red-400/10 px-1 rounded">{report.reportedPubkey.slice(0, 12)}...</span>
                        </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                        className="p-3 bg-red-600 text-white rounded-xl shadow-lg shadow-red-900/20 hover:scale-105 transition-all flex items-center gap-2 group-hover:bg-red-500"
                        >
                        <Eye size={16} />
                        <span className="text-[9px] font-black uppercase hidden sm:inline">Investigar</span>
                        </button>
                    </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                            <Calendar size={12} />
                            {new Date(report.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <MessageSquare size={12} />
                            {report.chatHistory.length} registros
                        </div>
                    </div>
                </div>
                ))
            )}
            </div>
        ) : (
            <div className="bg-slate-950 border border-red-500/30 rounded-[2rem] flex flex-col overflow-hidden h-[600px] shadow-2xl relative animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-red-500/20 bg-red-950/20 flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center gap-3">
                <div className="bg-red-500 p-2 rounded-xl shadow-lg shadow-red-600/20">
                    <LockOpen size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="font-black text-red-500 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                        Acesso Forense <span className="bg-red-500/20 px-1.5 py-0.5 rounded text-[8px]">ADMIN</span>
                    </h3>
                    <p className="text-[9px] text-red-400/70">Histórico completo liberado para moderação</p>
                </div>
                </div>
                <button 
                onClick={() => setSelectedReport(null)}
                className="text-[10px] text-slate-400 font-bold uppercase hover:text-white px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
                >
                Fechar Evidência
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-950/50">
                {selectedReport.chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.senderPubkey === selectedReport.reporterPubkey ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-xs border ${
                        msg.senderPubkey === selectedReport.reporterPubkey 
                        ? 'bg-blue-900/20 border-blue-500/30 text-blue-100' 
                        : 'bg-red-900/20 border-red-500/30 text-red-100'
                    }`}>
                        <div className="flex items-center gap-2 mb-1 opacity-50">
                            <span className="font-bold uppercase text-[9px]">{msg.senderPubkey === selectedReport.reporterPubkey ? 'Acusador' : 'Acusado'}</span>
                            <span className="text-[8px]">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        
                        {msg.type === 'text' && <p>{msg.content}</p>}
                        
                        {msg.type === 'image' && (
                            <img src={msg.mediaUrl} className="rounded-lg mt-1 max-w-full border border-white/10" alt="Evidência" />
                        )}

                        {msg.type === 'audio' && (
                            <div className="flex items-center gap-2 text-[10px] italic opacity-80 bg-black/20 p-2 rounded-lg">
                                <Mic size={12} /> Áudio (Gravação de voz)
                            </div>
                        )}
                    </div>
                </div>
                ))}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-3">
                <button onClick={() => handleDeleteContent()} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
                    <Trash2 size={14} /> Apagar Conteúdo
                </button>
                <button onClick={() => handleBlockUser(selectedReport.reportedPubkey)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 transition-colors">
                    <Ban size={14} /> Banir Usuário
                </button>
            </div>
            </div>
        )
      )}

      {activeTab === 'finance' && (
          <div className="space-y-4">
              {proofs.length === 0 ? (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center">
                    <Wallet size={48} className="mx-auto mb-2 text-slate-500" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Nenhum Comprovante</p>
                    <p className="text-xs mt-1 text-slate-500">Ninguém enviou comprovantes de apoio ainda.</p>
                  </div>
              ) : (
                  proofs.map(proof => (
                      <div key={proof.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                     <Zap size={20} fill="currentColor" />
                                 </div>
                                 <div>
                                     <h3 className="text-sm font-bold text-white">{proof.userName}</h3>
                                     <p className="text-[10px] text-slate-500 font-mono">{proof.userPubkey.slice(0, 16)}...</p>
                                 </div>
                              </div>
                              <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${proof.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                                  {proof.status === 'pending' ? 'Pendente' : 'Aprovado'}
                              </span>
                          </div>

                          {/* ÁREA DA FOTO DO COMPROVANTE */}
                          <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 relative group overflow-hidden">
                              {isVideo(proof.content) ? (
                                  <div className="relative">
                                      <video src={proof.content} className="w-full h-32 object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                         <button 
                                            onClick={() => setViewProofImage(proof)}
                                            className="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 text-xs font-bold uppercase transition-all hover:scale-105"
                                         >
                                             <Play size={14} /> Ver Vídeo
                                         </button>
                                     </div>
                                  </div>
                              ) : (proof.content && (proof.content.startsWith('data:image') || proof.content.startsWith('http'))) ? (
                                  <div className="relative">
                                     <img src={proof.content} className="w-full h-32 object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" alt="Preview" />
                                     <div className="absolute inset-0 flex items-center justify-center">
                                         <button 
                                            onClick={() => setViewProofImage(proof)}
                                            className="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 text-xs font-bold uppercase transition-all hover:scale-105"
                                         >
                                             <Eye size={14} /> Analisar
                                         </button>
                                     </div>
                                  </div>
                              ) : (
                                  <div className="p-4 text-center text-slate-500 italic text-xs">
                                      {proof.content ? "Formato de arquivo não suportado" : "Sem conteúdo"}
                                  </div>
                              )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                              <button 
                                onClick={() => onOpenChat(proof.userPubkey)}
                                className="bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                              >
                                  <MessageSquare size={14} /> Conversar
                              </button>
                              
                              {/* BOTÃO PRINCIPAL DE GERAR SELO */}
                              <button 
                                onClick={() => {
                                    if (proof.status !== 'approved') {
                                        if(confirm("Gerar selo e enviar código automaticamente?")) {
                                            onApproveProof(proof);
                                        }
                                    }
                                }}
                                disabled={proof.status === 'approved'}
                                className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                                    proof.status === 'approved' 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20 animate-pulse'
                                }`}
                              >
                                  {proof.status === 'approved' ? <><Check size={14} /> Já Gerado</> : <><Award size={14} /> GERAR CÓDIGO</>}
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}
    </div>
  );
};