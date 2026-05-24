/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Bot, User, X, Check, AlertCircle, 
  Sparkles, LogOut, CheckCheck, Landmark, Phone, MapPin, Building, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AGRESTE_DB } from '../services/db';
import { ChatSession, ChatMessage, Client } from '../types';

interface AgresteChatProps {
  theme: 'light' | 'dark';
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  currentUser?: string | null; // For Technician mode (e.g. "gil silva")
  currentClient?: {            // For Client mode
    id: string;
    name: string;
    responsible: string;
    phone: string;
    city: string;
    isNew: boolean;
    isGuest?: boolean;
  } | null;
  onLogoutClient?: () => void; // Client logout transition
}

export default function AgresteChat({ 
  theme, showToast, currentUser, currentClient, onLogoutClient 
}: AgresteChatProps) {
  const isClientMode = !!currentClient;
  const loggedTechUsername = currentUser?.toLowerCase() || '';

  const [sessions, setSessions] = useState<ChatSession[]>(() => AGRESTE_DB.getChats());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showBotRegisterModal, setShowBotRegisterModal] = useState(false);
  const [deleteChatConfirm, setDeleteChatConfirm] = useState<ChatSession | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync sessions reactively from database
  useEffect(() => {
    const handleSync = () => {
      const updated = AGRESTE_DB.getChats();
      setSessions(updated);
    };
    
    // Register sync subscription
    const unsubscribe = AGRESTE_DB.subscribeToRealtime(handleSync);
    
    // Auto open first chat for Tech if unselected
    if (!isClientMode) {
      const mySessions = AGRESTE_DB.getChats().filter(s => s.assignedTech === loggedTechUsername);
      if (mySessions.length > 0 && !activeSessionId) {
        setActiveSessionId(mySessions[0].id);
      }
    } else if (currentClient) {
      // In Client mode, make sure this client's session exists and is active
      const currentSessions = AGRESTE_DB.getChats();
      let mySession = currentSessions.find(s => s.id === currentClient.id);
      
      if (!mySession) {
        // Create initial session for client
        const initialMsg: ChatMessage = {
          id: `msg-${Date.now()}-1`,
          sender: 'bot',
          senderName: 'Robô Agreste',
          text: `Olá, ${currentClient.responsible}! Seja muito bem-vindo à Agreste Saúde Ambiental. 🌾\nComo podemos te ajudar hoje? Por favor, selecione uma das opções abaixo no menu de interações interactivos.`,
          timestamp: new Date().toISOString()
        };
        
        mySession = {
          id: currentClient.id,
          clientUsername: currentClient.responsible.toLowerCase().replace(/\s/g, ''),
          clientName: currentClient.name,
          clientPhone: currentClient.phone,
          clientCity: currentClient.city,
          responsibleName: currentClient.responsible,
          isNewClient: currentClient.isNew,
          status: 'bot',
          messages: [initialMsg],
          lastUpdated: new Date().toISOString()
        };
        
        const updatedSessions = [...currentSessions, mySession];
        AGRESTE_DB.saveChats(updatedSessions);
        setSessions(updatedSessions);
      }
      setActiveSessionId(mySession.id);
    }

    return () => {
      unsubscribe();
    };
  }, [isClientMode, currentClient, activeSessionId]);

  // Scroll to bottom on updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId && (isClientMode || s.assignedTech === loggedTechUsername));

  // Get active technicians list
  const userDetails = AGRESTE_DB.getUserDetails();
  const technicians = Object.values(userDetails).filter(u => u.status === 'approved');

  // Send client message flow
  const handleClientSend = (textToSend: string) => {
    if (!textToSend.trim() || !activeSession) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'client',
      senderName: activeSession.responsibleName,
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    const updatedSession = {
      ...activeSession,
      messages: [...activeSession.messages, newMsg],
      lastUpdated: new Date().toISOString()
    };

    // Trigger BOT response depending on state
    if (activeSession.status === 'bot') {
      const allChats = sessions.map(s => s.id === activeSession.id ? updatedSession : s);
      AGRESTE_DB.saveChats(allChats);
      setSessions(allChats);
      setInputText('');
      setTimeout(() => {
        handleBotAutoReply(textToSend, updatedSession);
      }, 750);
    } else if (activeSession.status === 'rating') {
      // If customer writes something while in rating state, thank them and reset status back to bot menu!
      const botResponse: ChatMessage = {
        id: `msg-rating-reset-${Date.now()}`,
        sender: 'bot',
        senderName: 'Assistente Agreste',
        text: `Obrigado por sua resposta! Retornei você ao assistente virtual da Agreste. Como posso te ajudar agora? Selecione um comando de auxílio abaixo:`,
        timestamp: new Date().toISOString()
      };
      const resetSession: ChatSession = {
        ...updatedSession,
        status: 'bot', // transition back to chatbot!
        messages: [...updatedSession.messages, botResponse],
        lastUpdated: new Date().toISOString()
      };
      const allChats = sessions.map(s => s.id === activeSession.id ? resetSession : s);
      AGRESTE_DB.saveChats(allChats);
      setSessions(allChats);
      setInputText('');
    } else {
      const allChats = sessions.map(s => s.id === activeSession.id ? updatedSession : s);
      AGRESTE_DB.saveChats(allChats);
      setSessions(allChats);
      setInputText('');
    }
  };

  // Submit client rating response
  const handleRateService = (rating: number) => {
    if (!activeSession) return;

    const rateMsg: ChatMessage = {
      id: `rate-client-${Date.now()}`,
      sender: 'client',
      senderName: activeSession.responsibleName,
      text: `Nota do suporte: ${rating}/10 ⭐`,
      timestamp: new Date().toISOString()
    };

    const sysResponse: ChatMessage = {
      id: `rate-bot-${Date.now()}`,
      sender: 'bot',
      senderName: 'Assistente Agreste',
      text: `Obrigado por avaliar o nosso atendimento técnico com nota ${rating}! 🎉 Sua opinião é muito importante para nós. \n\nRetornei você ao menu principal do chatbot da Agreste Saúde Ambiental. Como posso te ajudar hoje? Selecione um comando abaixo:`,
      timestamp: new Date().toISOString()
    };

    const updatedSession: ChatSession = {
      ...activeSession,
      status: 'bot', // transition back to chatbot!
      messages: [...activeSession.messages, rateMsg, sysResponse],
      lastUpdated: new Date().toISOString()
    };

    const allChats = sessions.map(s => s.id === activeSession.id ? updatedSession : s);
    AGRESTE_DB.saveChats(allChats);
    setSessions(allChats);
    showToast(`Obrigado pela sua avaliação de nota ${rating}!`, 'success');
  };

  // Bot auto responder decision tree
  const handleBotAutoReply = (clientText: string, currentSess: ChatSession) => {
    const q = clientText.toLowerCase().trim();
    let replyText = '';

    if (q.includes('olá') || q.includes('oi') || q.includes('bom dia') || q.includes('boa tarde')) {
      replyText = `Olá novamente! Me conta, o que você gostaria de solicitar hoje? Clique em um dos botões rápidos para que eu consiga direcionar sua demanda com agilidade.`;
    } else {
      replyText = `Compreendo. Por favor, utilize um de nossos comandos interativos abaixo para solicitar faturamento, agendar cronograma ou chamar um de nossos técnicos ambientais.`;
    }

    const botMsg: ChatMessage = {
      id: `msg-${Date.now()}-bot`,
      sender: 'bot',
      senderName: 'Assistente Agreste',
      text: replyText,
      timestamp: new Date().toISOString()
    };

    const updatedSess = {
      ...currentSess,
      messages: [...currentSess.messages, botMsg],
      lastUpdated: new Date().toISOString()
    };

    const allChats = sessions.map(s => s.id === currentSess.id ? updatedSess : s);
    AGRESTE_DB.saveChats(allChats);
    setSessions(allChats);
  };

  // Option actions clicked in bot mode
  const handleSelectOption = (option: 'schedule' | 'payment' | 'request_tech') => {
    if (!activeSession) return;

    let textSelection = '';
    let botReply = '';
    let newStatus = activeSession.status;
    let systemAppend: string | undefined = undefined;

    if (option === 'schedule') {
      textSelection = '📅 Solicitar agendamento de serviço';
      botReply = `Perfeito! Registramos sua solicitação de agendamento de laudos/cronogramas. 📋\n\nNosso setor operacional foi notificado e entrará em contato via WhatsApp para confirmar o melhor horário agronômico em sua localidade.`;
    } else if (option === 'payment') {
      textSelection = '💳 Solicitar faturamento / Boleto';
      botReply = `Entendido! Solicitação de boleto e faturamento financeiro registrada com sucesso. 💸\n\nNossa tesouraria enviará o faturamento atualizado com vencimento prorrogado diretamente para o seu número de contato nas próximas 3 horas.`;
    } else {
      textSelection = '🔧 Solicitar atenção de um técnico (Falar com Técnico)';
      botReply = `Sem problemas! Vou disponibilizar os técnicos cadastrados da Agreste Saúde Ambiental. Escolha o especialista mais próximo para assumir o seu chat:`;
      newStatus = 'tech_requested';
    }

    const clientMsg: ChatMessage = {
      id: `client-opt-${Date.now()}`,
      sender: 'client',
      senderName: activeSession.responsibleName,
      text: textSelection,
      timestamp: new Date().toISOString()
    };

    const botMsg: ChatMessage = {
      id: `bot-opt-${Date.now()}`,
      sender: 'bot',
      senderName: 'Assistente Agreste',
      text: botReply,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...activeSession.messages, clientMsg, botMsg];

    const updatedSess: ChatSession = {
      ...activeSession,
      status: newStatus,
      messages: updatedMessages,
      lastUpdated: new Date().toISOString()
    };

    const allChats = sessions.map(s => s.id === activeSession.id ? updatedSess : s);
    AGRESTE_DB.saveChats(allChats);
    setSessions(allChats);
    showToast('Solicitação processada com sucesso!', 'success');
  };

  // Select Technician to dispatch notification
  const handleSelectTechnician = (techUsername: string, techName: string) => {
    if (!activeSession) return;

    const systemMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: 'bot',
      senderName: 'Sistema',
      text: `🔔 O Técnico "${techName}" foi notificado e está assumindo o atendimento para falar com você.`,
      timestamp: new Date().toISOString(),
      isSystem: true
    };

    const updatedSess: ChatSession = {
      ...activeSession,
      status: 'tech_requested',
      assignedTech: techUsername,
      messages: [...activeSession.messages, systemMsg],
      lastUpdated: new Date().toISOString()
    };

    const allChats = sessions.map(s => s.id === activeSession.id ? updatedSess : s);
    AGRESTE_DB.saveChats(allChats);
    setSessions(allChats);
    showToast(`Técnico ${techName} notificado do chamado!`, 'success');
  };

  // Tech Sends message flow
  const handleTechSend = () => {
    if (!inputText.trim() || !activeSession || !currentUser) return;

    const newMsg: ChatMessage = {
      id: `msg-tech-${Date.now()}`,
      sender: 'technician',
      senderName: currentUser,
      text: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedSess: ChatSession = {
      ...activeSession,
      status: 'active_with_tech', // officially chatting with tech now
      assignedTech: loggedTechUsername,
      messages: [...activeSession.messages, newMsg],
      lastUpdated: new Date().toISOString()
    };

    const allChats = sessions.map(s => s.id === activeSession.id ? updatedSess : s);
    AGRESTE_DB.saveChats(allChats);
    setSessions(allChats);
    setInputText('');
  };

  // Tech assumes the chat
  const handleTechAssume = (sessionId: string) => {
    const sessToAssume = sessions.find(s => s.id === sessionId);
    if (!sessToAssume || !currentUser) return;

    const sysMsg: ChatMessage = {
      id: `sys-assume-${Date.now()}`,
      sender: 'technician',
      senderName: currentUser,
      text: `Olá! Eu sou o técnico ${currentUser}. Estou assumindo o atendimento para te dar suporte especializado agora. Como posso ajudar?`,
      timestamp: new Date().toISOString()
    };

    const updatedSess: ChatSession = {
      ...sessToAssume,
      status: 'active_with_tech',
      assignedTech: loggedTechUsername,
      messages: [...sessToAssume.messages, sysMsg],
      lastUpdated: new Date().toISOString()
    };

    const allChats = sessions.map(s => s.id === sessionId ? updatedSess : s);
    AGRESTE_DB.saveChats(allChats);
    setSessions(allChats);
    showToast('Você assumiu este chat de atendimento.', 'success');
  };

  // Tech releases chat back to Bot
  const handleTechRelease = (sessionId: string) => {
    const sessToRelease = sessions.find(s => s.id === sessionId);
    if (!sessToRelease) return;

    const sysMsg: ChatMessage = {
      id: `sys-release-${Date.now()}`,
      sender: 'bot',
      senderName: 'Sistema',
      text: `Atendimento técnico finalizado. O chat retornou para o modo de triagem do assistente virtual.`,
      timestamp: new Date().toISOString(),
      isSystem: true
    };

    const ratingPromptMsg: ChatMessage = {
      id: `sys-rating-prompt-${Date.now()}`,
      sender: 'bot',
      senderName: 'Robô Agreste',
      text: `Como foi o seu atendimento técnico? Por favor, avalie o nosso suporte selecionando uma nota de 0 a 10 no menu de avaliação abaixo:`,
      timestamp: new Date().toISOString()
    };

    const updatedSess: ChatSession = {
      ...sessToRelease,
      status: 'rating', // Change from 'bot' to 'rating' so rating selector renders
      assignedTech: undefined,
      messages: [...sessToRelease.messages, sysMsg, ratingPromptMsg],
      lastUpdated: new Date().toISOString()
    };

    const allChats = sessions.map(s => s.id === sessionId ? updatedSess : s);
    AGRESTE_DB.saveChats(allChats);
    setSessions(allChats);
    showToast('Atendimento retornado ao robô para avaliação do cliente.', 'info');
  };

  // Format date helper
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex flex-col rounded-2xl border ${
      theme === 'dark' ? 'bg-[#141414] border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-900'
    } h-[600px] overflow-hidden shadow-2xl`}>
      
      {/* ─── CLIENT CHAT PORTAL VIEW ─── */}
      {isClientMode ? (
        <>
          {/* Client Header */}
          <header className="p-4 border-b border-zinc-900/10 dark:border-zinc-900 flex items-center justify-between bg-gradient-to-r from-[#D35400]/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D35400]/20 flex items-center justify-center text-[#D35400] relative">
                <MessageSquare className="w-5 h-5 animate-pulse" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-zinc-950"></span>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-sm tracking-tight">{currentClient?.name}</h3>
                <p className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {activeSession?.status === 'active_with_tech' 
                    ? `Falando com Técnico • ${technicians.find(t=>t.username===activeSession?.assignedTech)?.name || 'Especialista'}` 
                    : 'Chatbot Assistente On-line'}
                </p>
              </div>
            </div>
            
            {onLogoutClient && (
              <button
                onClick={onLogoutClient}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 text-red-400 hover:text-white hover:bg-red-500/10 transition-colors text-xs font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair do Portal
              </button>
            )}
          </header>

          {/* Guest Registration Highlight Callout */}
          {isClientMode && (currentClient?.id.startsWith('guest-') || currentClient?.isGuest) && (
            <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow">
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Cadastro de Visitante Ativo no Bot
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5 max-w-xl">
                  Você está navegando em modo de demonstração. Complete agora o seu cadastro de parceiro para ter prioridade e ser atendido no painel de especialistas!
                </p>
              </div>
              <button
                onClick={() => setShowBotRegisterModal(true)}
                className="py-1.5 px-3.5 bg-emerald-605 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer shadow-lg shadow-emerald-500/10 shrink-0"
              >
                Cadastrar Agora
              </button>
            </div>
          )}

          {/* Client Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin flex flex-col">
            {activeSession?.messages.map((msg) => {
              const isMe = msg.sender === 'client';
              const isSys = msg.isSystem;
              
              if (isSys) {
                return (
                  <div key={msg.id} className="mx-auto bg-amber-600/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-center max-w-sm text-[10px] text-amber-500 font-medium">
                    {msg.text}
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                  {/* Name badge */}
                  <span className="text-[9px] font-bold text-zinc-500 mb-1 font-mono uppercase">
                    {isMe ? 'Você' : msg.sender === 'bot' ? 'Robô Agreste' : `Téc. ${msg.senderName}`}
                  </span>
                  {/* Bubble wrapper */}
                  <div className={`px-4 py-2.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed text-left ${
                    isMe 
                      ? 'bg-[#D35400] text-white rounded-tr-none' 
                      : theme === 'dark' 
                        ? 'bg-zinc-950 text-zinc-300 rounded-tl-none border border-zinc-900' 
                        : 'bg-zinc-100 text-zinc-800 rounded-tl-none border border-zinc-200'
                  }`}>
                    {msg.text}
                  </div>
                  {/* Timestamp */}
                  <span className="text-[8px] text-zinc-500 font-mono mt-1 pr-1">{formatTime(msg.timestamp)}</span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Special Bot Interaction Menu Block */}
          {activeSession?.status === 'bot' && (
            <div className={`p-4 border-t ${theme === 'dark' ? 'bg-zinc-950/60 border-zinc-900' : 'bg-zinc-50 border-zinc-200'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-left mb-2">Comandos Rápidos de Triagem:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {(currentClient?.id.startsWith('guest-') || currentClient?.isGuest) && (
                  <button
                    onClick={() => setShowBotRegisterModal(true)}
                    className="py-2 px-3 border border-emerald-500 hover:border-emerald-400 bg-emerald-650 bg-emerald-600 hover:bg-emerald-550 text-white text-xs text-left rounded-xl transition-all cursor-pointer font-extrabold flex items-center gap-2 shadow"
                  >
                    <span>📝</span> Realizar Cadastro Rápido pelo Bot
                  </button>
                )}
                <button
                  onClick={() => handleSelectOption('schedule')}
                  className="py-2 px-3 border border-zinc-800 hover:border-orange-500/40 bg-zinc-950 hover:bg-orange-500/10 text-xs text-left rounded-xl hover:text-orange-400 transition-all cursor-pointer font-semibold flex items-center gap-2"
                >
                  <span>📅</span> Solicitar Agendamento
                </button>
                <button
                  onClick={() => handleSelectOption('payment')}
                  className="py-2 px-3 border border-zinc-800 hover:border-orange-500/40 bg-zinc-950 hover:bg-orange-500/10 text-xs text-left rounded-xl hover:text-orange-400 transition-all cursor-pointer font-semibold flex items-center gap-2"
                >
                  <span>💳</span> Solicitar Faturamento / Boleto
                </button>
                <button
                  onClick={() => handleSelectOption('request_tech')}
                  className="py-2 px-3 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-xs text-left rounded-xl transition-all cursor-pointer font-bold flex items-center gap-2 shadow-lg shadow-orange-500/10 col-span-1"
                >
                  <span>🔧</span> Chamar Atendimento Técnico
                </button>
              </div>
            </div>
          )}

          {/* Service Rating Block */}
          {activeSession?.status === 'rating' && (
            <div className={`p-4 border-t ${theme === 'dark' ? 'bg-[#18181B] border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 text-left mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                Avalie o seu Atendimento Técnico (0 a 10):
              </p>
              <div className="flex flex-wrap justify-center gap-2 py-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleRateService(val)}
                    className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-350 hover:bg-gradient-to-r hover:from-orange-600 hover:to-orange-550 hover:text-white hover:border-orange-550 text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center select-none active:scale-90 shadow shadow-black/40"
                    id={`rate-${val}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* New / Established Client Technician Selection Row */}
          {activeSession?.status === 'tech_requested' && !activeSession.assignedTech && (
            <div className={`p-4 border-t ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-900' : 'bg-zinc-100 border-zinc-200'} text-left`}>
              <p className="text-xs font-bold text-orange-400 flex items-center gap-1.5 mb-3">
                <Sparkles className="w-4 h-4 text-orange-400 animate-spin" />
                {currentClient?.isNew 
                  ? 'Você é um novo parceiro! Selecione um técnico para se apresentar e realizar seu cadastro rápido:'
                  : 'Selecione abaixo o técnico que deseja solicitar atendimento:'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {technicians.map((tech) => (
                  <button
                    key={tech.username}
                    onClick={() => handleSelectTechnician(tech.username, tech.name)}
                    className={`p-2.5 border text-xs text-left rounded-xl transition-all cursor-pointer font-bold flex flex-col justify-between ${
                      theme === 'dark' 
                        ? 'bg-zinc-950 border-zinc-800 hover:border-[#D35400]' 
                        : 'bg-white border-zinc-200 hover:border-[#D35400] shadow-xs'
                    }`}
                  >
                    <span className="text-zinc-250 font-bold tracking-tight">{tech.name}</span>
                    <span className="text-[9px] font-medium font-mono text-zinc-500 uppercase mt-1">
                      {tech.username === 'gil silva' ? 'Engenheiro Chefe' : 'Operador Técnico'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Client Input Box (Always show unless waiting for tech assignment in a new state) */}
          {!(activeSession?.status === 'tech_requested' && !activeSession.assignedTech) && (
            <form 
              onSubmit={(e) => { e.preventDefault(); handleClientSend(inputText); }} 
              className="p-3 border-t border-zinc-900/10 dark:border-zinc-900 flex gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeSession?.status === 'active_with_tech' ? 'Mande uma mensagem para o Técnico...' : 'Digite sua dúvida em texto...'}
                className={`flex-1 py-2 px-4 rounded-xl border text-xs outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-850 text-white focus:border-[#D35400]'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                }`}
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-[#D35400] hover:bg-[#FC6B0A] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </>
      ) : (
        /* ─── TECHNICIAN LIVE DESKTOP CHAT PANEL (WORK DESK) ─── */
        <div className="flex flex-1 overflow-hidden divide-x divide-zinc-900/10 dark:divide-zinc-900 h-full">
          
          {/* List of active client threads */}
          <div className="w-1/3 flex flex-col h-full bg-zinc-950/20">
            <div className="p-4 border-b border-zinc-900/10 dark:border-zinc-900 text-left">
              <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-zinc-500">Módulos de Atendimentos</h3>
              <p className="text-[10px] text-zinc-500 mt-1">Chats ativos de clientes no bot & chamados técnicos</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/10 dark:divide-zinc-900 scrollbar-thin">
              {sessions.filter(sess => sess.assignedTech === loggedTechUsername).length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  Nenhum chat de atendimento atribuído a você ainda.
                </div>
              ) : (
                sessions
                  .filter(sess => sess.assignedTech === loggedTechUsername)
                  .sort((a,b)=> new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                  .map((sess) => {
                    const isThreadActive = sess.id === activeSessionId;
                    const isAssignedToMe = sess.assignedTech === loggedTechUsername;
                    const hasUnread = sess.status === 'tech_requested' && isAssignedToMe;

                    return (
                      <button
                        key={sess.id}
                        onClick={() => setActiveSessionId(sess.id)}
                        className={`w-full p-3.5 text-left transition-all flex flex-col gap-1 cursor-pointer ${
                          isThreadActive 
                            ? 'bg-[#D35400]/10 border-l-4 border-[#D35400]' 
                            : 'hover:bg-zinc-800/10 dark:hover:bg-zinc-800/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate max-w-[140px] text-zinc-200">{sess.clientName}</span>
                          {/* New Client indicators */}
                          {sess.isNewClient ? (
                            <span className="text-[8px] px-1 py-0.5 bg-amber-600/15 border border-amber-500/20 text-amber-500 font-bold rounded">NOVO</span>
                          ) : (
                            <span className="text-[8px] text-zinc-600 font-bold">CLIENTE</span>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-zinc-500 truncate max-w-[140px] font-mono">{sess.clientCity}</span>
                          
                          {/* Session status tags */}
                          {sess.status === 'bot' && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-sm">BOT AUTOMATO</span>
                          )}
                          {sess.status === 'tech_requested' && !sess.assignedTech && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-red-600/20 border border-red-500/10 text-red-400 font-bold animate-pulse rounded-sm">CHAMADO</span>
                          )}
                          {sess.status === 'active_with_tech' && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-emerald-600/20 text-emerald-400 font-semibold rounded-sm">
                              {sess.assignedTech === loggedTechUsername ? 'Com Você' : 'Em Chat'}
                            </span>
                          )}
                        </div>

                        {/* Phone metadata */}
                        <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{sess.clientPhone}</span>
                      </button>
                    );
                  })
              )}
            </div>
          </div>

          {/* Chat thread feed */}
          <div className="flex-1 flex flex-col h-full bg-[#111111]/10">
            {activeSession ? (
              <>
                {/* Tech Thread Header */}
                <header className="p-3.5 border-b border-zinc-900/10 dark:border-zinc-900 flex items-center justify-between bg-zinc-950/40">
                  <div className="text-left">
                    <h4 className="font-bold text-xs text-zinc-200 flex items-center gap-2">
                      {activeSession.clientName}
                      <span className="text-[9px] font-bold text-zinc-500 font-mono">({activeSession.responsibleName})</span>
                    </h4>
                    <p className="text-[9px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-zinc-650" /> {activeSession.clientPhone} • {activeSession.clientCity}
                    </p>
                  </div>

                  {/* Top Bar Action button for technician */}
                  <div className="flex items-center gap-2">
                    {activeSession.assignedTech !== loggedTechUsername ? (
                      <button
                        onClick={() => handleTechAssume(activeSession.id)}
                        className="py-1 px-3 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                      >
                        Assumir Chat
                      </button>
                    ) : (
                      <button
                        onClick={() => handleTechRelease(activeSession.id)}
                        className="py-1 px-3 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                      >
                        Devolver pro Bot
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteChatConfirm(activeSession)}
                      className="p-1.5 border border-red-500/30 text-red-400 hover:text-white hover:bg-red-600 hover:border-red-650 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Definitivamente este Chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* Tech Chat Feed scrolling list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                  {/* Highlight warning if unassigned technician call */}
                  {activeSession.status === 'tech_requested' && !activeSession.assignedTech && (
                    <div className="p-3 bg-red-600/15 border border-red-500/20 rounded-xl text-left">
                      <p className="text-[11px] font-bold text-red-400 flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        Chamado Técnico Iniciado!
                      </p>
                      <p className="text-[9px] text-zinc-400 leading-relaxed">
                        Este cliente solicitou suporte ou é um cliente novo aguardando contato técnico. Clique em <strong>"ASSUMIR CHAT"</strong> acima para atendê-lo diretamente e/ou registrar o cadastro formal se necessário.
                      </p>
                    </div>
                  )}

                  {activeSession.messages.map((msg) => {
                    const isClient = msg.sender === 'client';
                    const isSys = msg.isSystem;

                    if (isSys) {
                      return (
                        <div key={msg.id} className="mx-auto bg-amber-600/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-center max-w-sm text-[10px] text-amber-500 font-medium font-mono">
                          {msg.text}
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[80%] ${isClient ? 'self-start items-start' : 'self-end items-end'}`}>
                        {/* Name label */}
                        <span className="text-[9px] font-bold text-zinc-500 mb-1 font-mono uppercase">
                          {isClient ? activeSession.responsibleName : msg.sender === 'bot' ? 'Assistente Bot' : `Você (${msg.senderName})`}
                        </span>
                        {/* Message Text bubble */}
                        <div className={`px-4 py-2.5 rounded-2xl text-xs text-left leading-relaxed whitespace-pre-wrap ${
                          isClient 
                            ? theme === 'dark' 
                              ? 'bg-zinc-950 text-zinc-305 rounded-tl-none border border-zinc-900' 
                              : 'bg-zinc-100 text-zinc-800 rounded-tl-none border border-zinc-200'
                            : 'bg-[#D35400] text-white rounded-tr-none'
                        }`}>
                          {msg.text}
                        </div>
                        {/* Timestamp time string */}
                        <span className="text-[8px] text-zinc-500 font-mono mt-1">{formatTime(msg.timestamp)}</span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Tech Input Text Form */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleTechSend(); }}
                  className="p-3 border-t border-zinc-900/10 dark:border-zinc-900 flex gap-2 bg-zinc-950/40"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={activeSession.assignedTech === loggedTechUsername ? "Digite uma resposta de suporte..." : "Assuma o atendimento acima para responder..."}
                    disabled={activeSession.assignedTech !== loggedTechUsername}
                    className={`flex-1 py-2 px-4 rounded-xl border text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-zinc-900 text-white focus:border-[#D35400] disabled:opacity-50'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400] disabled:opacity-50'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={activeSession.assignedTech !== loggedTechUsername}
                    className="w-10 h-10 rounded-xl bg-[#D35400] hover:bg-[#FC6B0A] text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-all cursor-pointer shadow"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-500 text-xs">
                <MessageSquare className="w-12 h-12 text-zinc-700 mb-2" />
                Selecione uma sessão ou aguarde chamados de clientes.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Bot Registration Modal */}
      <AnimatePresence>
        {showBotRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBotRegisterModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl text-left ${
                theme === 'dark' ? 'bg-[#18181B] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <button 
                onClick={() => setShowBotRegisterModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold text-orange-400 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
                Cadastro Rápido pelo Assistente
              </h3>
              <p className="text-[10px] text-zinc-400 mb-4">
                Insira as informações do seu estabelecimento para enviar diretamente ao painel técnico.
              </p>

              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = fd.get('name') as string;
                const city = fd.get('city') as string;
                const resp = fd.get('responsible') as string;
                const phone = fd.get('phone') as string;

                if (!name?.trim() || !city?.trim() || !resp?.trim() || !phone?.trim()) {
                  showToast('Por favor, preencha todos os campos.', 'error');
                  return;
                }

                // 1. Create client in DB with isPendingConfirmation: true
                const newCli = AGRESTE_DB.addClient({
                  name: name.trim(),
                  city: city.trim(),
                  responsible: resp.trim(),
                  phone: phone.trim(),
                  paymentStatus: 'pendente',
                  size: 'pequeno',
                  isPendingConfirmation: true // Destaque na tela de clientes!
                });

                // 2. Add as client account
                const accounts = AGRESTE_DB.getClientChatAccounts();
                const cleanUsr = resp.toLowerCase().trim().replace(/\s/g, '');
                accounts[cleanUsr] = {
                  password: '123',
                  phone: phone.trim(),
                  name: name.trim(),
                  responsible: resp.trim(),
                  city: city.trim(),
                  isRegistered: true
                };
                AGRESTE_DB.saveClientChatAccounts(accounts);

                // 3. Update current logged client
                const loggedInfo = {
                  id: newCli.id,
                  name: name.trim(),
                  responsible: resp.trim(),
                  phone: phone.trim(),
                  city: city.trim(),
                  isNew: true
                };
                localStorage.setItem('agreste_logged_client', JSON.stringify(loggedInfo));

                // 4. Update the active session messages with welcome info!
                if (activeSession) {
                  const clientNoteMsg: ChatMessage = {
                    id: `msg-signup-sys-${Date.now()}`,
                    sender: 'client',
                    senderName: resp.trim(),
                    text: `📝 Enviei meu cadastro rápido pelo assistente virtual: \nEmpresa: ${name}\nResponsável: ${resp}\nCidade: ${city}\nWhatsApp: ${phone}`,
                    timestamp: new Date().toISOString()
                  };
                  
                  const botNoteMsg: ChatMessage = {
                    id: `msg-signup-bot-${Date.now()}`,
                    sender: 'bot',
                    senderName: 'Robô Agreste',
                    text: `Excelente, seu cadastro foi recebido com sucesso! 🎉\n\nVocê já está aparecendo em destaque com prioridade máxima para a nossa equipe técnica no painel. Chamei um técnico para validar seu contato!`,
                    timestamp: new Date().toISOString()
                  };

                  const updatedSess: ChatSession = {
                    ...activeSession,
                    id: newCli.id, // Migrate session ID to actual client ID!
                    clientUsername: cleanUsr,
                    clientName: name.trim(),
                    responsibleName: resp.trim(),
                    clientCity: city.trim(),
                    clientPhone: phone.trim(),
                    status: 'tech_requested', // Chamar técnico automaticamente!
                    messages: [...activeSession.messages, clientNoteMsg, botNoteMsg],
                    lastUpdated: new Date().toISOString()
                  };

                  // Remove old guest session, insert new client session
                  const currentChats = AGRESTE_DB.getChats().filter(c => c.id !== activeSession.id);
                  const updatedChats = [...currentChats, updatedSess];
                  AGRESTE_DB.saveChats(updatedChats);
                  setSessions(updatedChats);
                  setActiveSessionId(newCli.id);
                }

                showToast('Cadastro realizado com sucesso! Técnico notificado.', 'success');
                setShowBotRegisterModal(false);
                
                // Force page refresh for logged client status update
                setTimeout(() => window.location.reload(), 2000);
              }} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Nome do Estabelecimento *</label>
                  <input type="text" name="name" required placeholder="Ex: Mercado Central" className="w-full py-2 px-3 rounded-xl border text-xs bg-zinc-950 border-zinc-800 text-white focus:border-[#D35400] outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Seu Nome (Responsável) *</label>
                  <input type="text" name="responsible" required placeholder="Ex: Roberto Alves" className="w-full py-2 px-3 rounded-xl border text-xs bg-zinc-950 border-zinc-850 text-white focus:border-[#D35400] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Cidade *</label>
                    <input type="text" name="city" required placeholder="Ex: Caruaru" className="w-full py-2 px-3 rounded-xl border text-xs bg-zinc-950 border-zinc-850 text-white focus:border-[#D35400] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-400 font-mono">WhatsApp *</label>
                    <input type="text" name="phone" required placeholder="Ex: (81) 99999-1234" className="w-full py-2 px-3 rounded-xl border text-xs bg-zinc-950 border-zinc-850 text-white focus:border-[#D35400] outline-none" />
                  </div>
                </div>
                <button type="submit" className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer">
                  Salvar e Solicitar Técnico
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Chat Confirmation Modal */}
      <AnimatePresence>
        {deleteChatConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteChatConfirm(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl text-left ${
                theme === 'dark' ? 'bg-[#18181B] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <h3 className="text-sm font-bold text-red-500 flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-5 h-5 animate-bounce" />
                Excluir Chat e Registro?
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Você tem certeza que deseja excluir permanentemente o chat de <strong>{deleteChatConfirm.clientName}</strong>? <br/><br/>
                Isso apagará o histórico de conversas do banco de dados e também removerá o cadastro associado da sua lista de clientes do portal. Esta ação é definitiva e irreversível.
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteChatConfirm(null)}
                  className="px-3 py-2 border border-zinc-800 hover:border-zinc-700 text-orange-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { id, clientName } = deleteChatConfirm;
                    // 1. Delete chat
                    const remainingChats = sessions.filter(s => s.id !== id);
                    AGRESTE_DB.saveChats(remainingChats);
                    setSessions(remainingChats);
                    if (activeSessionId === id) {
                      setActiveSessionId(null);
                    }
                    // 2. Cascade delete client matching id
                    AGRESTE_DB.deleteClient(id);
                    showToast(`O chat de "${clientName}" e seu registro de cliente foram removidos com sucesso.`, 'success');
                    setDeleteChatConfirm(null);
                  }}
                  className="px-4 py-2 bg-red-650 hover:bg-red-650 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-red-600/10"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
