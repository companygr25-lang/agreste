/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Client, CompanyDocument, VisitReport, FloatingNotification } from '../types';
import { AGRESTE_DB } from '../services/db';
import { 
  Users, CheckCircle2, AlertTriangle, FileCheck, Landmark, ArrowRight,
  TrendingUp, Calendar, ArrowUpRight, DollarSign, Clock, HelpCircle,
  Check, Sparkles, ClipboardCheck, Plus, Trash2, Bell, BellRing, MessageSquare, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardTabProps {
  theme: 'light' | 'dark';
  clients: Client[];
  reports: VisitReport[];
  documents: CompanyDocument[];
  setActiveTab: (tab: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
  currentUser?: string | null;
}

interface TechnicalObjective {
  id: string;
  task: string;
  category: string;
  done: boolean;
  priority: 'Urgente' | 'Alta' | 'Média' | 'Baixa';
}

export default function DashboardTab({ 
  theme, clients, reports, documents, setActiveTab, showToast, onRefreshData, currentUser 
}: DashboardTabProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Find current user's role and edit level
  const uDetails = AGRESTE_DB.getUserDetails();
  const uCurrentDetails = currentUser ? uDetails[currentUser.toLowerCase().trim()] : null;
  const canEditState = uCurrentDetails ? uCurrentDetails.canEditData !== false : true;

  // States and subscription for Bell Notifications
  const [dbNotifications, setDbNotifications] = useState<FloatingNotification[]>(() => AGRESTE_DB.getNotifications());
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  useEffect(() => {
    const handleSync = () => {
      setDbNotifications(AGRESTE_DB.getNotifications());
    };
    return AGRESTE_DB.subscribeToRealtime(handleSync);
  }, []);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const lowerUser = (currentUser || '').toLowerCase().trim();
    AGRESTE_DB.dismissNotificationForUser(id, lowerUser);
    showToast('Notificação marcada como lida.', 'success');
  };

  const handleAcceptFromBell = (notif: FloatingNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    const lowerUser = (currentUser || '').toLowerCase().trim();
    const result = AGRESTE_DB.tryAcceptNotification(notif.id, lowerUser);
    if (result.success) {
      showToast('Atendimento aceito com sucesso!', 'success');
      if (notif.type === 'chat_request' && notif.chatId) {
        const chats = AGRESTE_DB.getChats();
        const updated = chats.map(c => {
          if (c.id === notif.chatId) {
            return {
              ...c,
              assignedTech: lowerUser,
              status: 'active_with_tech' as const
            };
          }
          return c;
        });
        AGRESTE_DB.saveChats(updated);
        localStorage.setItem('agreste_active_chat_id', notif.chatId);
        setActiveTab('agreste-chat');
      } else if (notif.type === 'new_registration') {
        setActiveTab('clientes');
      }
    } else {
      showToast(result.message, 'error');
    }
    AGRESTE_DB.dismissNotificationForUser(notif.id, lowerUser);
    setShowBellDropdown(false);
  };

  const lowerUserTrimmed = (currentUser || '').toLowerCase().trim();
  const importantNotifications = dbNotifications.filter(notif => {
    if (notif.dismissedBy?.includes(lowerUserTrimmed)) return false;
    if (notif.status === 'dismissed') return false;

    if (notif.type === 'chat_request') {
      return notif.targetTech?.toLowerCase().trim() === lowerUserTrimmed;
    }
    if (notif.type === 'new_registration') {
      return true;
    }
    return false;
  });

  // Field checklist manual user state - starts empty
  const [objectives, setObjectives] = useState<TechnicalObjective[]>(() => {
    try {
      const saved = localStorage.getItem('agreste_technical_objectives_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State for adding new objective
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Controle Estrutural');
  const [newPriority, setNewPriority] = useState<'Urgente' | 'Alta' | 'Média' | 'Baixa'>('Média');

  const saveObjectives = (newObjectives: TechnicalObjective[]) => {
    setObjectives(newObjectives);
    localStorage.setItem('agreste_technical_objectives_v2', JSON.stringify(newObjectives));
  };

  // Handle objective toggle
  const handleToggleObjective = (id: string, name: string) => {
    const updated = objectives.map(obj => {
      if (obj.id === id) {
        const nextState = !obj.done;
        showToast(`Meta "${name}" marcada como ${nextState ? 'CONCLUÍDA' : 'PENDENTE'}!`, 'info');
        return { ...obj, done: nextState };
      }
      return obj;
    });
    saveObjectives(updated);
  };

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Por favor, informe a descrição do objetivo.', 'error');
      return;
    }
    const newObj: TechnicalObjective = {
      id: `obj-${Date.now()}`,
      task: newTitle.trim(),
      category: newCategory,
      done: false,
      priority: newPriority
    };
    saveObjectives([...objectives, newObj]);
    setNewTitle('');
    setShowAddForm(false);
    showToast('Objetivo técnico inserido com sucesso!', 'success');
  };

  const handleDeleteObjective = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = objectives.filter(o => o.id !== id);
    saveObjectives(updated);
    showToast('Objetivo excluído com sucesso.', 'info');
  };

  // Filter calculations
  const activeClientsCount = clients.length;
  const completedVisitsCount = reports.length;
  
  // Pending payments
  const pendingPaymentClients = clients.filter(c => c.paymentStatus === 'pendente');
  const pendingPaymentsCount = pendingPaymentClients.length;

  // Documents checks
  const okDocsCount = documents.filter(d => d.status === 'ok').length;
  const pendingDocsCount = documents.length - okDocsCount;

  // Highlight close-to-expiration documents
  const isCloseToExpiration = (dateStr: string) => {
    const today = new Date('2026-05-21');
    const updateDate = new Date(dateStr);
    const diffTime = updateDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const criticalDocs = documents.filter(d => d.status === 'pendente' || isCloseToExpiration(d.nextUpdateDate));

  // Handle immediate payment action (Toggle state inside database to 'pago' with confirmation toast)
  const handleQuickResolvePayment = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: Client = { ...client, paymentStatus: 'pago' };
    AGRESTE_DB.updateClient(updated);
    showToast(`Cobrança de ${client.name} liquidada. Status de pagamento atualizado para PAGO!`, 'success');
    onRefreshData();
  };

  // Weekly Productivity seed representation
  const countByDay = [0, 0, 0, 0, 0, 0, 0]; // Seg, Ter, Qua, Qui, Sex, Sáb, Dom
  const complianceSum = [0, 0, 0, 0, 0, 0, 0];

  reports.forEach(rep => {
    if (!rep.date) return;
    try {
      const d = new Date(rep.date + 'T12:00:00');
      if (isNaN(d.getTime())) return;
      const rawDay = d.getDay(); // 0 is Sun, 1 is Mon...
      const index = rawDay === 0 ? 6 : rawDay - 1; // map so index 0 = Mon, ..., index 6 = Sun
      
      countByDay[index] += 1;
      
      const averageScore = ((rep.punctuality || 10) + (rep.communication || 10)) / 2; // scale of 0 to 10
      const scorePercentage = Math.round(averageScore * 10);
      complianceSum[index] += scorePercentage;
    } catch (err) {
      console.error(err);
    }
  });

  const weeklyData = [
    { label: 'Seg', visits: countByDay[0], compliance: countByDay[0] > 0 ? Math.round(complianceSum[0] / countByDay[0]) : 0 },
    { label: 'Ter', visits: countByDay[1], compliance: countByDay[1] > 0 ? Math.round(complianceSum[1] / countByDay[1]) : 0 },
    { label: 'Qua', visits: countByDay[2], compliance: countByDay[2] > 0 ? Math.round(complianceSum[2] / countByDay[2]) : 0 },
    { label: 'Qui', visits: countByDay[3], compliance: countByDay[3] > 0 ? Math.round(complianceSum[3] / countByDay[3]) : 0 },
    { label: 'Sex', visits: countByDay[4], compliance: countByDay[4] > 0 ? Math.round(complianceSum[4] / countByDay[4]) : 0 },
    { label: 'Sáb', visits: countByDay[5], compliance: countByDay[5] > 0 ? Math.round(complianceSum[5] / countByDay[5]) : 0 },
    { label: 'Dom', visits: countByDay[6], compliance: countByDay[6] > 0 ? Math.round(complianceSum[6] / countByDay[6]) : 0 },
  ];

  const maxVisits = Math.max(...weeklyData.map(d => d.visits), 1);
  const chartHeight = 140;

  const userDetails = AGRESTE_DB.getUserDetails();
  const currentDetail = currentUser ? userDetails[currentUser.toLowerCase().trim()] : null;
  const currentName = currentDetail?.name || currentUser || 'OPERADOR';
  const currentDateStr = new Date().toLocaleDateString('pt-BR');
  const isProvider = currentUser?.toLowerCase() === 'gil silva';

  if (isProvider) {
    const detailsDict = AGRESTE_DB.getUserDetails();
    const usersListExcludingGil = Object.values(detailsDict).filter(u => u.username !== 'gil silva');
    
    const activeUsers = usersListExcludingGil.filter(u => u.status === 'approved');
    const totalActiveCount = activeUsers.length;
    const pendingCount = usersListExcludingGil.filter(u => u.status === 'pending').length;
    
    const totalIncomeFuture = activeUsers.reduce((acc, u) => acc + (u.paymentValue || 0), 0);
    const paidIncome = activeUsers.filter(u => u.paymentStatus === 'pago').reduce((acc, u) => acc + (u.paymentValue || 0), 0);
    const pendingIncome = activeUsers.filter(u => u.paymentStatus === 'pendente').reduce((acc, u) => acc + (u.paymentValue || 0), 0);

    const handleTogglePayment = (username: string) => {
      const updated = { ...detailsDict };
      if (updated[username]) {
        const currentStatus = updated[username].paymentStatus;
        const nextStatus = currentStatus === 'pago' ? 'pendente' : 'pago';
        updated[username].paymentStatus = nextStatus;
        AGRESTE_DB.saveUserDetails(updated);
        showToast(`Mensalidade de '${updated[username].name}' marcada como ${nextStatus.toUpperCase()}!`, 'success');
        onRefreshData();
      }
    };

    return (
      <div className="space-y-6 animate-fade-in" id="provider-dashboard-view">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900/10 dark:border-zinc-800/40 pb-5 text-left">
          <div>
            <h2 className="text-2xl font-black font-display tracking-tight text-[#D35400] uppercase flex items-center gap-2">
              <Landmark className="w-6 h-6 shrink-0 text-[#D35400]" /> PAINEL DO PROVEDOR
            </h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Gerencie a cobrança das licenças, mensalidades ativas e status de contas.
            </p>
          </div>
          
          <div className="flex items-center gap-3.5 justify-between w-full md:w-auto self-stretch md:self-auto">
            
            {/* BOTÃO DE SINO NOTIFICAÇÕES PARA PROVEDOR */}
            <div className="relative">
              <button
                type="button"
                id="btn-bell-notifications-provider"
                onClick={() => setShowBellDropdown(!showBellDropdown)}
                className={`p-2.5 rounded-xl transition-all cursor-pointer relative flex items-center justify-center ${
                  theme === 'dark'
                    ? 'bg-zinc-900 hover:bg-zinc-805 border border-zinc-800 text-zinc-200 hover:text-white'
                    : 'bg-zinc-100 hover:bg-zinc-150 border border-zinc-200 text-zinc-700 hover:text-zinc-900 shadow-3xs'
                }`}
                title="Notificações e Alertas"
              >
                <Bell className={`w-4 h-4 ${importantNotifications.length > 0 ? 'text-[#D35400] animate-bounce' : ''}`} />
                
                {importantNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] font-black text-white items-center justify-center">
                      {importantNotifications.length}
                    </span>
                  </span>
                )}
              </button>

              {/* DROPDOWN MENU */}
              <AnimatePresence>
                {showBellDropdown && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className={`fixed left-4 right-4 top-24 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 rounded-2xl border p-4 shadow-2xl z-50 text-left ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-zinc-850 text-zinc-100 shadow-[0_20px_40px_rgba(0,0,0,0.8)]'
                        : 'bg-white border-zinc-200 text-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.15)]'
                    }`}
                    style={{ minWidth: '280px' }}
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900 dark:border-zinc-850 mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D35400]">ALERTAS IMPORTANTES</span>
                      <button 
                        type="button" 
                        onClick={() => setShowBellDropdown(false)}
                        className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {importantNotifications.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 flex flex-col items-center gap-1">
                        <p className="text-xs font-bold leading-none">Nadar por aqui! 🏖️</p>
                        <p className="text-[10px] text-zinc-500">Nenhuma notificação importante no momento.</p>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-3.5 pr-1 py-1">
                        {importantNotifications.map((notif) => {
                          const isChat = notif.type === 'chat_request';
                          return (
                            <div 
                              key={notif.id} 
                              className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                theme === 'dark'
                                  ? 'border-zinc-900 bg-zinc-900/40 hover:border-zinc-850'
                                  : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100/70'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                  isChat ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {isChat ? <MessageSquare className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-[11px] font-bold leading-tight">{notif.title}</h4>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                    {notif.message}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900/5 dark:border-zinc-900/15">
                                <button
                                  type="button"
                                  onClick={(e) => handleAcceptFromBell(notif, e)}
                                  className={`px-2.5 py-1 text-[9px] rounded-lg font-bold uppercase cursor-pointer transition-colors ${
                                    isChat 
                                      ? 'bg-orange-600 hover:bg-orange-500 text-white' 
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  }`}
                                >
                                  {isChat ? 'ATENDER' : 'VISUALIZAR'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                                  className={`px-2.5 py-1 text-[9px] rounded-lg font-bold uppercase cursor-pointer border transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-zinc-900 hover:bg-zinc-805 border-zinc-800 text-zinc-300'
                                      : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
                                  }`}
                                >
                                  LIDA
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-right flex flex-col items-start md:items-end font-mono">
              <span className="text-[11px] font-bold tracking-wider text-[#D35400] uppercase">
                GIL SILVA • ADMINISTRADOR
              </span>
              <span className="text-[9px] font-extrabold text-[#D35400]/85 uppercase tracking-wider mt-0.5">
                PROVEDOR DO SISTEMA
              </span>
            </div>
          </div>
        </div>

        {/* Stats and Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'
          } text-left flex items-center justify-between`}>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Usuários Ativos</span>
              <span className="text-3xl font-extrabold font-mono text-orange-500 mt-1 block">
                {String(totalActiveCount).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-1 font-sans">Limite: {AGRESTE_DB.getLicensesLimit()} acessos</span>
            </div>
            <Users className="w-8 h-8 text-orange-500/15" />
          </div>

          <div className={`p-4 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'
          } text-left flex items-center justify-between`}>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Mensalidades Recebidas</span>
              <span className="text-3xl font-extrabold font-mono text-emerald-500 mt-1 block">
                R$ {paidIncome}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold block mt-1 font-sans font-medium">Status: Pago</span>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/15" />
          </div>

          <div className={`p-4 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#151515] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
          } text-left flex items-center justify-between`}>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Mensalidades Pendentes</span>
              <span className="text-3xl font-extrabold font-mono text-red-500 mt-1 block">
                R$ {pendingIncome}
              </span>
              <span className="text-[10px] text-red-500 font-extrabold block mt-1 font-sans">Cobrança pendente</span>
            </div>
            <Clock className="w-8 h-8 text-red-500/15" />
          </div>
        </div>

        {/* Dashboard Grid body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main accounts / Licences list (Span 2) */}
          <div className={`lg:col-span-2 p-5 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'
          } text-left`}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-900/10 dark:border-zinc-800/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                Contratos & Licenças Ativos
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('usuarios')}
                className="text-[10px] font-bold text-zinc-400 hover:text-orange-500 flex items-center gap-1 cursor-pointer transition-colors uppercase tracking-wider"
              >
                Liberar Usuários <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeUsers.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-semibold font-sans">
                Nenhum usuário ativo contratado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900/10 dark:border-zinc-800/40 text-[10px] uppercase font-bold text-zinc-400">
                      <th className="pb-3 pt-1">Operador</th>
                      <th className="pb-3 pt-1">Usuário</th>
                      <th className="pb-3 pt-1 text-right">Mensalidade</th>
                      <th className="pb-3 pt-1 text-center">Status Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/10 dark:divide-zinc-800/40 text-xs text-left">
                    {activeUsers.map(user => (
                      <tr key={user.username} className="hover:bg-zinc-900/5 dark:hover:bg-zinc-900/10 transition-colors">
                        <td className="py-3 font-extrabold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-orange-600/10 flex items-center justify-center text-[10px] text-orange-500 font-bold uppercase shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          {user.name}
                        </td>
                        <td className="py-3 text-zinc-500 font-mono">@{user.username}</td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1 font-mono font-bold text-emerald-500">
                            <span className="text-zinc-500 text-[10px]">R$</span>
                            <input
                              type="number"
                              min="0"
                              value={user.paymentValue !== undefined ? user.paymentValue : 150}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = { ...detailsDict };
                                if (updated[user.username]) {
                                  updated[user.username].paymentValue = val;
                                  AGRESTE_DB.saveUserDetails(updated);
                                  onRefreshData();
                                }
                              }}
                              className="w-16 px-1.5 py-0.5 text-xs text-emerald-500 bg-zinc-950/40 border border-zinc-900 rounded outline-none text-right focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                            />
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button; button"
                              onClick={() => handleTogglePayment(user.username)}
                              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                user.paymentStatus === 'pago'
                                  ? 'bg-emerald-600/10 border-emerald-500/15 text-emerald-400 hover:bg-emerald-650/20'
                                  : 'bg-red-600/10 border-red-500/15 text-red-500 hover:bg-red-650/20 animate-pulse'
                              }`}
                            >
                              {user.paymentStatus === 'pago' ? (
                                <><Check className="w-3 h-3 text-emerald-400" /> Pago</>
                              ) : (
                                <><Clock className="w-3 h-3 text-red-500" /> Pendente</>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions & Notifications Sidebar (Span 1) */}
          <div className="space-y-4 lg:col-span-1">
            {pendingCount > 0 && (
              <div className="p-4 bg-amber-600/10 text-amber-500 border border-amber-500/20 rounded-2xl flex flex-col gap-3 text-left animate-pulse">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-widest leading-none">Solicitações Registradas</h4>
                    <p className="text-[10px] text-zinc-400 mt-1 lines-clamp-2 leading-tight">Existe(m) {pendingCount} operador(es) pendente(s) de liberação no sistema.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('usuarios')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer text-center transition-all"
                >
                  Liberar Acessos
                </button>
              </div>
            )}

            <div className={`p-4 rounded-2xl border ${
              theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-200'
            } text-left`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-3 flex items-center gap-1.5 border-b border-zinc-900/10 dark:border-zinc-800/40 pb-2">
                <Sparkles className="w-4 h-4 shrink-0" /> Visão Provedor
              </h3>

              <div className="space-y-3.5 text-xs font-sans">
                <div className="p-3 bg-zinc-950/25 border border-zinc-900/30 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">Sincronização Cloud</span>
                  <p className="text-zinc-400 mt-1 font-medium leading-relaxed">
                    Sincronia ativa real-time. Qualquer liberação é enviada instantaneamente para todos os dispositivos de trabalho.
                  </p>
                </div>

                <div className="p-3 bg-zinc-950/25 border border-zinc-900/30 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block">Configuração de Telas</span>
                  <p className="text-zinc-400 mt-1 font-medium leading-relaxed">
                    Personalize o acesso a cada aba, limite de licenças e restrições de escrita de cada operador de forma independente na aba <strong className="text-orange-500">Configuração</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black font-display tracking-tight uppercase text-zinc-100 dark:text-zinc-50 flex flex-wrap items-center gap-x-2">
            PAINEL GERAL <span className="text-[#D35400] font-black">SAÚDE AMBIENTAL</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Acompanhamento em alta densidade do controle de pragas sanitário e obrigações técnicas diárias.
          </p>
        </div>
        
        {/* Date Row with Clickable Bell Notification Mark to its left */}
        <div className="flex items-center gap-3.5 justify-between w-full md:w-auto self-stretch md:self-auto">
          
          {/* BOTÃO DE SINO NOTIFICAÇÕES */}
          <div className="relative">
            <button
              type="button"
              id="btn-bell-notifications"
              onClick={() => setShowBellDropdown(!showBellDropdown)}
              className={`p-2.5 rounded-xl transition-all cursor-pointer relative flex items-center justify-center ${
                theme === 'dark'
                  ? 'bg-zinc-900 hover:bg-zinc-805 border border-zinc-800 text-zinc-200 hover:text-white'
                  : 'bg-zinc-100 hover:bg-zinc-150 border border-zinc-200 text-zinc-700 hover:text-zinc-900 shadow-3xs'
              }`}
              title="Notificações e Alertas"
            >
              <Bell className={`w-4 h-4 ${importantNotifications.length > 0 ? 'text-[#D35400] animate-bounce' : ''}`} />
              
              {importantNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] font-black text-white items-center justify-center">
                    {importantNotifications.length}
                  </span>
                </span>
              )}
            </button>

            {/* DROPDOWN MENU */}
            <AnimatePresence>
              {showBellDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className={`fixed left-4 right-4 top-24 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 rounded-2xl border p-4 shadow-2xl z-50 text-left ${
                    theme === 'dark'
                      ? 'bg-zinc-950 border-zinc-850 text-zinc-100 shadow-[0_20px_40px_rgba(0,0,0,0.8)]'
                      : 'bg-white border-zinc-200 text-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.15)]'
                  }`}
                  style={{ minWidth: '280px' }}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900 dark:border-zinc-850 mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D35400]">ALERTAS IMPORTANTES</span>
                    <button 
                      type="button" 
                      onClick={() => setShowBellDropdown(false)}
                      className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {importantNotifications.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 flex flex-col items-center gap-1">
                      <p className="text-xs font-bold leading-none">Nadar por aqui! 🏖️</p>
                      <p className="text-[10px] text-zinc-500">Nenhuma notificação importante no momento.</p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-3.5 pr-1 py-1">
                      {importantNotifications.map((notif) => {
                        const isChat = notif.type === 'chat_request';
                        return (
                          <div 
                            key={notif.id} 
                            className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                              theme === 'dark'
                                ? 'border-zinc-900 bg-zinc-900/40 hover:border-zinc-850'
                                : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100/70'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                isChat ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {isChat ? <MessageSquare className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[11px] font-bold leading-tight">{notif.title}</h4>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900/5 dark:border-zinc-900/15">
                              <button
                                type="button"
                                onClick={(e) => handleAcceptFromBell(notif, e)}
                                className={`px-2.5 py-1 text-[9px] rounded-lg font-bold uppercase cursor-pointer transition-colors ${
                                  isChat 
                                    ? 'bg-orange-600 hover:bg-orange-500 text-white' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                {isChat ? 'ATENDER' : 'VISUALIZAR'}
                              </button>
                              
                              <button
                                type="button"
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                className={`px-2.5 py-1 text-[9px] rounded-lg font-bold uppercase cursor-pointer border transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-zinc-900 hover:bg-zinc-805 border-zinc-800 text-zinc-300'
                                    : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
                                }`}
                              >
                                LIDA
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-right flex flex-col items-start md:items-end font-mono">
            <span className="text-[11px] font-bold tracking-wider text-[#D35400] uppercase">
              {currentDateStr} • {currentName}
            </span>
            <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mt-0.5">
              RESPONSÁVEL OPERACIONAL
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Bento Grid with thick borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 (Clientes) */}
        <div 
          onClick={() => setActiveTab('clientes')}
          id="kpi-card-clientes"
          className={`group shadow-sm cursor-pointer transition-all border relative overflow-hidden p-4 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700' 
              : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-400">
                CLIENTES
              </span>
              <span className="text-[9px] font-black tracking-wider text-zinc-500 uppercase">
                REGULAMENTADOS
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#D35400]/10 text-[#D35400]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 text-left">
            <span className="block text-4xl font-extrabold font-mono tracking-tight text-[#D35400]">
              {activeClientsCount}
            </span>
            <span className="text-[10px] text-emerald-500 font-bold block mt-1">
              +{clients.filter(c => c.createdAt && c.createdAt.startsWith('2026-05')).length} este mês
            </span>
          </div>
        </div>

        {/* Metric 2 (Atividades Concluídas) */}
        <div 
          onClick={() => setActiveTab('relatorios')}
          id="kpi-card-atividades"
          className={`group shadow-sm cursor-pointer transition-all border relative overflow-hidden p-4 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700' 
              : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-400">
                VISITAS REALIZADAS
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-7 text-left">
            <span className="block text-4xl font-extrabold font-mono tracking-tight text-sky-400">
              {completedVisitsCount}
            </span>
            <span className="text-[10px] text-sky-400 font-bold block mt-1">
              {completedVisitsCount} registrada(s)
            </span>
          </div>
        </div>

        {/* Metric 3 (Lembretes / Demandas) */}
        <div 
          onClick={() => setActiveTab('calendario')}
          id="kpi-card-demandas"
          className={`group shadow-sm cursor-pointer transition-all border relative overflow-hidden p-4 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700' 
              : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-400">
                VISITAS PENDENTES
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-7 text-left">
            <span className="block text-4xl font-extrabold font-mono tracking-tight text-red-500">
              {String(clients.filter(c => !reports.some(r => r.clientId === c.id)).length).padStart(2, '0')}
            </span>
            {clients.filter(c => !reports.some(r => r.clientId === c.id)).length > 0 ? (
              <span className="text-[9px] text-[#FF4444] font-extrabold tracking-wider mt-1 uppercase block">
                AÇÃO NECESSÁRIA
              </span>
            ) : (
              <span className="text-[9px] text-emerald-500 font-extrabold tracking-wider mt-1 uppercase block">
                TUDO EM DIA
              </span>
            )}
          </div>
        </div>

        {/* Metric 4 (Documentação) */}
        <div 
          onClick={() => setActiveTab('documentacao')}
          id="kpi-card-docs"
          className={`group shadow-sm cursor-pointer transition-all border relative overflow-hidden p-4 rounded-xl ${
            theme === 'dark' 
              ? 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700' 
              : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-400">
                VALIDADE DE OPERAÇÃO
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-left">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-4xl font-extrabold text-emerald-500">
                {okDocsCount}
              </span>
              <div className="text-[10px] text-zinc-500 flex flex-col leading-none">
                <span>/ {pendingDocsCount}</span>
                <span>pend.</span>
              </div>
            </div>
            {pendingDocsCount > 0 ? (
              <div className="px-2.5 py-0.5 bg-amber-600 text-white text-[11px] font-black rounded-md tracking-wider">
                ALERTA
              </div>
            ) : (
              <div className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-black rounded-md tracking-wider">
                OK
              </div>
            )}
          </div>
          <div className="mt-1 text-left">
            <span className={`text-[10px] font-extrabold block leading-tight ${pendingDocsCount > 0 ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {pendingDocsCount > 0 ? 'Cobrança recomendada' : 'Certificados integrados'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Analysis and Alerts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Weekly Productivity Custom Line & Bar Chart */}
        <div className={`col-span-1 lg:col-span-12 p-4 rounded-sm border ${
          theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
            <div>
              <h3 className="text-[14px] font-black uppercase tracking-tight text-zinc-200 dark:text-zinc-100">Rendimento Operacional Semanal</h3>
              <p className="text-[11px] text-zinc-500">Visitas de controle integrado executadas nos distritos e polos.</p>
            </div>
            <div className="flex gap-3 text-[10px] font-mono">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#D35400]"></span>
                <span className="text-zinc-400">Efetuadas (AGRESTE #D35400)</span>
              </div>
            </div>
          </div>

          {/* SVG Custom High-Polished Chart */}
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 border border-dashed border-zinc-805/40 dark:border-zinc-800 rounded-xl bg-zinc-950/20 px-4" style={{ height: `${chartHeight}px` }}>
              <TrendingUp className="w-8 h-8 text-[#D35400]/40 mb-1.5 shrink-0" />
              <p className="text-[11px] font-bold text-zinc-400">Nenhum laudo ou visita registrada</p>
              <p className="text-[9px] text-zinc-500 max-w-[280px] mt-0.5">Os laudos lançados no distrito alimentarão este gráfico automaticamente.</p>
            </div>
          ) : (
            <div className="relative w-full overflow-hidden" style={{ height: `${chartHeight + 25}px` }}>
              <svg 
                className="w-full h-full" 
                viewBox={`0 0 500 ${chartHeight + 15}`} 
                preserveAspectRatio="none"
                id="productivity-svg-chart-refined"
              >
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = chartHeight * ratio;
                  return (
                    <line
                      key={index}
                      x1="0"
                      y1={y}
                      x2="490"
                      y2={y}
                      stroke={theme === 'dark' ? '#222222' : '#f0f0f0'}
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Chart Bars with burnt orange/rust amber */}
                {weeklyData.map((data, idx) => {
                  const colWidth = 490 / weeklyData.length;
                  const barWidth = 18;
                  const barHeight = (data.visits / maxVisits) * chartHeight;
                  const x = idx * colWidth + (colWidth - barWidth) / 2;
                  const y = chartHeight - barHeight;

                  const isHovered = hoveredBar === idx;

                  return (
                    <g key={idx}>
                      {/* Background trigger bar for tooltips */}
                      <rect
                        x={idx * colWidth}
                        y="0"
                        width={colWidth}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />

                      {/* Styled rounded column */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barHeight, 3)}
                        rx={2}
                        fill={isHovered ? '#FC6B0A' : '#D35400'}
                        className="transition-all duration-100 shadow-sm cursor-pointer"
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />

                      {/* Bar top badge count */}
                      {data.visits > 0 && (
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          textAnchor="middle"
                          fill={theme === 'dark' ? '#E4E4E7' : '#1F2937'}
                          className="text-[9px] font-bold font-mono"
                        >
                          {data.visits}
                        </text>
                      )}

                      {/* X Axis Labels */}
                      <text
                        x={idx * colWidth + colWidth / 2}
                        y={chartHeight + 12}
                        textAnchor="middle"
                        fill={theme === 'dark' ? '#71717A' : '#6B7280'}
                        className="text-[10px] font-mono font-bold"
                      >
                        {data.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Custom Interactive Tooltip Banner */}
              {hoveredBar !== null && (
                <div 
                  className="absolute top-1 right-2 p-1.5 bg-[#141414] border border-[#D35400]/50 rounded-sm text-white text-[10px] font-mono shadow-md z-10"
                >
                  <div className="font-bold text-[#FC6B0A]">{weeklyData[hoveredBar].label === 'Seg' ? 'Segunda-feira' : weeklyData[hoveredBar].label === 'Ter' ? 'Terça-feira' : weeklyData[hoveredBar].label === 'Qua' ? 'Quarta-feira' : weeklyData[hoveredBar].label === 'Qui' ? 'Quinta-feira' : weeklyData[hoveredBar].label === 'Sex' ? 'Sexta-feira' : weeklyData[hoveredBar].label === 'Sáb' ? 'Sábado' : 'Domingo'}</div>
                  <div>Visitas: <span className="font-bold">{weeklyData[hoveredBar].visits}</span></div>
                  <div>Eficácia: <span className="font-bold text-emerald-400">{weeklyData[hoveredBar].compliance}%</span></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row: Sharp Operational Checklist & Expiration Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Visual Sharp Checklists Widget */}
        <div className={`p-4 rounded-sm border ${
          theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-[#D35400]" />
              <h3 className="text-[14px] font-black uppercase tracking-tight text-zinc-200 dark:text-zinc-100">Objetivos Técnicos do Dia</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold bg-[#D35400]/25 text-[#D35400] border border-[#D35400]/30 px-1.5 py-0.5 rounded-sm">
                {objectives.filter(o => !o.done).length} Pendências
              </span>
              {canEditState && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="p-1 hover:bg-[#D35400]/10 text-[#D35400] rounded transition-colors text-xs font-bold flex items-center gap-0.5 cursor-pointer border border-[#D35400]/20"
                  title="Adicionar Objetivo"
                >
                  <Plus className="w-3 h-3" /> <span className="text-[8.5px] uppercase">Novo</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mb-3 leading-tight">
            Metas do plano de controle ambiental preventivo expedidas no campo para a equipe. Clique nas caixas de verificação para regularizar.
          </p>

          {/* Form to Add New Technical Objective */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddObjective}
                className={`mb-4 p-3 rounded border text-xs space-y-3 overflow-hidden ${
                  theme === 'dark' ? 'bg-[#141414] border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Descrição do Objetivo *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Aplicar aspersão no fosso de ventilação"
                    className={`w-full p-2 rounded border focus:border-[#D35400] outline-none text-[11px] ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-950'
                    }`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Categoria</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className={`w-full p-2 rounded border outline-none text-[11px] ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-950'
                      }`}
                    >
                      <option value="Controle Estrutural">Controle Estrutural</option>
                      <option value="Equipamento">Equipamento</option>
                      <option value="Sistemas">Sistemas</option>
                      <option value="Conformidade">Conformidade</option>
                      <option value="Desinsetização">Desinsetização</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Prioridade</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className={`w-full p-2 rounded border outline-none text-[11px] ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-950'
                      }`}
                    >
                      <option value="Urgente">Urgente</option>
                      <option value="Alta">Alta</option>
                      <option value="Média">Média</option>
                      <option value="Baixa">Baixa</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2 py-1 hover:bg-zinc-850 border border-transparent rounded text-[10px] text-zinc-450 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    Adicionar
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {objectives.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-[11px] border border-dashed border-zinc-800/80 rounded bg-[#141414]/10 dark:bg-[#141414]/30">
              <ClipboardCheck className="w-8 h-8 text-[#D35400]/40 mx-auto mb-1.5" />
              Nenhum objetivo cadastrado para hoje.
              <button
                onClick={() => setShowAddForm(true)}
                className="block text-[#D35400] hover:underline font-bold text-[10px] mx-auto mt-1 uppercase tracking-wider"
              >
                Clique aqui para cadastrar
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {objectives.map((obj) => (
                <div 
                  key={obj.id} 
                  onClick={() => {
                    if (canEditState) {
                      handleToggleObjective(obj.id, obj.task);
                    } else {
                      showToast('Acesso apenas leitura: você não pode alterar os objetivos técnico do dia.', 'error');
                    }
                  }}
                  className={`flex items-start gap-2.5 p-2 rounded-sm border cursor-pointer transition-all ${
                    obj.done 
                      ? theme === 'dark' ? 'bg-[#141414]/40 border-zinc-900/60 opacity-55' : 'bg-zinc-50 border-zinc-150 opacity-60'
                      : theme === 'dark' ? 'bg-[#141414] border-[#222222] hover:border-[#333333]' : 'bg-zinc-100/50 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 ${
                    obj.done 
                      ? 'bg-emerald-600 border-emerald-500 text-white' 
                      : 'border-zinc-500 hover:border-[#D35400]'
                  }`}>
                    {obj.done && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0 pr-1 text-left">
                    <p className={`text-[11px] font-bold leading-normal truncate block ${obj.done ? 'line-through text-zinc-600' : 'text-zinc-250 dark:text-zinc-100'}`}>
                      {obj.task}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wide text-zinc-500">
                        {obj.category}
                      </span>
                      <span className={`text-[8px] px-1 font-mono font-bold rounded-xs ${
                        obj.priority === 'Urgente' ? 'bg-red-950 text-red-400 border border-red-900/40' :
                        obj.priority === 'Alta' ? 'bg-amber-950 text-amber-400 border border-amber-900/40' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {obj.priority}
                      </span>
                    </div>
                  </div>

                  {/* Delete Objective button */}
                  {canEditState && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteObjective(obj.id, e)}
                      className="p-1 hover:text-red-500 text-zinc-600 dark:text-zinc-550 rounded transition-colors self-center cursor-pointer"
                      title="Apagar objetivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expirations Panel Block */}
        <div className={`p-4 rounded-sm border ${
          theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
            <h3 className="text-[14px] font-black uppercase tracking-tight text-zinc-200 dark:text-zinc-100 font-display">Avisos e Alvarás Sanitários</h3>
          </div>
          <p className="text-[11px] text-zinc-400 mb-3 leading-tight">
            Validação de documentos requeridos pela Vigilância Sanitária e IBAMA expirarão nos próximos 30 dias.
          </p>

          {criticalDocs.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-[11px] border border-dashed border-zinc-800/80 rounded bg-[#141414]/30">
              Certificações normativas em dias. Próximas vistorias fora do ciclo de risco.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {criticalDocs.map((doc) => {
                const isExpired = doc.status === 'pendente';
                const daysLeft = Math.ceil(
                  (new Date(doc.nextUpdateDate).getTime() - new Date('2026-05-21').getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div 
                    key={doc.id}
                    className={`p-2.5 rounded-sm border flex items-start gap-2.5 transition-all border-l-[3.5px] ${
                      isExpired
                        ? 'bg-red-950/20 border-[#262626] border-l-red-500'
                        : daysLeft <= 10 
                          ? 'bg-amber-950/20 border-[#262626] border-l-amber-500'
                          : 'bg-[#141414] border-[#262626] border-l-[#D35400]'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                      isExpired ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <FileCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-[11px] text-zinc-150 dark:text-zinc-50 leading-tight">
                        {doc.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] mt-0.5">
                        <span className="text-zinc-400 font-mono">Limite: {doc.nextUpdateDate}</span>
                        <span className={`px-1 rounded-xs uppercase font-bold font-mono ${
                          isExpired 
                            ? 'bg-red-650/40 text-red-400' 
                            : 'bg-amber-600/40 text-amber-400'
                        }`}>
                          {isExpired ? 'ATRASADO / CRÍTICO' : `${daysLeft}d restantes`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
