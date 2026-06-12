/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LargeClientActivity, Client } from '../types';
import { AGRESTE_DB } from '../services/db';
import { 
  Calendar, CheckCircle, Clock, AlertTriangle, PlayCircle, PlusCircle, 
  Trash2, Edit3, X, Sparkles, Building2, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarTabProps {
  theme: 'light' | 'dark';
  calendarEvents: LargeClientActivity[];
  clients: Client[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
  canEdit?: boolean;
  currentUser?: string;
}

export default function CalendarTab({ 
  theme, calendarEvents, clients, showToast, onRefreshData, canEdit = true, currentUser 
}: CalendarTabProps) {
  // Find current user's role and edit level
  const userDetails = AGRESTE_DB.getUserDetails();
  const currentDetails = currentUser ? userDetails[currentUser.toLowerCase().trim()] : null;
  const isManager = !currentUser || 
                    currentUser.toLowerCase().trim() === 'gil silva' || 
                    currentDetails?.cargo === 'gerente' || 
                    currentDetails?.cargo === 'supervisor de operações';

  const canModifyItem = (itemCreatorUsername?: string) => {
    if (!canEdit) return false;
    if (isManager) return true;
    if (!itemCreatorUsername) return true; // old calendar events are editable by any tech
    return itemCreatorUsername.toLowerCase().trim() === currentUser?.toLowerCase().trim();
  };

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LargeClientActivity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Form states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [scheduledWeekday, setScheduledWeekday] = useState('Segunda-feira');
  const [visitDate, setVisitDate] = useState('');
  const [observations, setObservations] = useState('');
  const [situation, setSituation] = useState<'antes_prazo' | 'no_prazo' | 'atrasado' | 'pendente'>('pendente');

  const weekdays = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo',
  ];

  // Open modal for new event
  const handleOpenNewEvent = () => {
    setEditingEvent(null);
    const largeClients = clients.filter(c => c.size === 'grande');
    setSelectedClientId(largeClients[0]?.id || (clients[0]?.id || ''));
    setCustomClientName('');
    setScheduledWeekday('Segunda-feira');
    setVisitDate('');
    setObservations('');
    setSituation('pendente');
    setShowEventModal(true);
  };

  // Open modal for editing event
  const handleOpenEditEvent = (event: LargeClientActivity) => {
    setEditingEvent(event);
    setSelectedClientId(event.clientId);
    setCustomClientName(event.clientName);
    setScheduledWeekday(event.scheduledWeekday);
    setVisitDate(event.visitDate);
    setObservations(event.observations);
    setSituation(event.situation);
    setShowEventModal(true);
  };

  // Delete event
  const handleDeleteEvent = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  // Submit / Save event
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();

    let finalClientName = customClientName;
    if (selectedClientId && selectedClientId !== 'custom') {
      const matched = clients.find(c => c.id === selectedClientId);
      if (matched) finalClientName = matched.name;
    }

    if (!finalClientName.trim()) {
      showToast('Por favor, informe ou selecione o nome do cliente de grande porte.', 'error');
      return;
    }

    if (editingEvent) {
      if (!canModifyItem(editingEvent.createdBy)) {
        showToast('Nível de permissão insuficiente para editar este cronograma.', 'error');
        return;
      }
      // update
      AGRESTE_DB.updateCalendarEvent({
        id: editingEvent.id,
        clientId: selectedClientId,
        clientName: finalClientName,
        scheduledWeekday,
        visitDate,
        observations,
        situation,
        createdBy: editingEvent.createdBy,
        createdBy_name: editingEvent.createdBy_name,
      });
      showToast(`Cronograma de "${finalClientName}" atualizado com sucesso.`, 'success');
    } else {
      if (!canEdit) {
        showToast('Acesso apenas leitura: você não tem permissão para cadastrar cronogramas.', 'error');
        return;
      }
      // create
      AGRESTE_DB.addCalendarEvent({
        clientId: selectedClientId,
        clientName: finalClientName,
        scheduledWeekday,
        visitDate,
        observations,
        situation,
        createdBy: currentUser?.toLowerCase().trim(),
        createdBy_name: currentDetails?.name || currentUser,
      });
      showToast(`Acompanhamento de grande porte criado para "${finalClientName}".`, 'success');
    }

    setShowEventModal(false);
    onRefreshData();
  };

  // Status configuration badges helper
  const situationConfig = {
    antes_prazo: {
      label: 'Antecipado (Antes do Prazo)',
      bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
    },
    no_prazo: {
      label: 'No Prazo Correto',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    },
    atrasado: {
      label: 'Atrasado',
      bg: 'bg-red-500/10 border-red-500/30 text-red-400',
      icon: <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />,
    },
    pendente: {
      label: 'Pendente / Agendado',
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
    },
  };

  return (
    <div className="space-y-6">
      {/* Page Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight">Clientes de Grande Porte</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Clientes VIP com regime operacional diferenciado que requerem acompanhamento e inspeções técnicas semanais fixas.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleOpenNewEvent}
            id="add-large-client-btn"
            className="flex items-center gap-2 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-[#D35400]/10 cursor-pointer hover:scale-[1.01] transition-transform duration-100 animate-pulse"
          >
            <PlusCircle className="w-4 h-4" /> Configurar Visita Fixo
          </button>
        )}
      </div>

      {/* Grid of Scheduled Events */}
      {calendarEvents.length === 0 ? (
        <div className={`py-12 text-center rounded-2xl border border-dashed ${
          theme === 'dark' ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <Calendar className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
          <p className="text-md font-semibold font-display">Nenhum evento semanal configurado</p>
          <p className="text-xs text-zinc-500 mt-1">Cadastre os clientes que exigem monitoramentos preventivos repetitivos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {calendarEvents.map((event) => {
            const config = situationConfig[event.situation] || situationConfig.pendente;

            return (
              <div
                key={event.id}
                className={`p-6 rounded-2xl border hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between ${
                  theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
                }`}
              >
                {/* Visual side accent matching situation */}
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                  event.situation === 'antes_prazo' ? 'bg-indigo-600' : event.situation === 'no_prazo' ? 'bg-emerald-600' : event.situation === 'atrasado' ? 'bg-red-600' : 'bg-amber-600'
                }`} />

                <div className="pl-2">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-zinc-400 shrink-0" />
                      <h3 className="font-bold text-lg font-display tracking-tight text-zinc-100 dark:text-white">
                        {event.clientName}
                      </h3>
                    </div>
                    {canModifyItem(event.createdBy) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditEvent(event)}
                          id={`edit-cal-${event.id}`}
                          className="text-zinc-500 hover:text-orange-500 p-1.5 hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
                          title="Editar Evento"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id, event.clientName)}
                          id={`delete-cal-${event.id}`}
                          className="text-zinc-500 hover:text-red-500 p-1.5 hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
                          title="Remover Evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Scheduled Weekday and Details */}
                  <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Inspeção Requerida (Semanal):</span>
                      <span className="font-bold text-orange-500 font-mono flex items-center gap-1 mt-1">
                        <Calendar className="w-4 h-4 text-orange-600" /> {event.scheduledWeekday}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">Data Efetiva da Visita:</span>
                      <span className="font-bold text-zinc-300 dark:text-zinc-100 font-mono mt-1 block">
                        {event.visitDate ? event.visitDate : 'Não efetuada'}
                      </span>
                    </div>
                  </div>

                  {event.observations && (
                    <div className="mt-4 p-3 rounded-xl bg-zinc-950/20 border border-zinc-850/10 text-xs text-zinc-400 line-clamp-2">
                      <span className="font-bold block text-zinc-300 mb-0.5">Observações Operacionais:</span>
                      {event.observations}
                    </div>
                  )}
                </div>

                {/* Status Indicator Pill */}
                <div className="mt-5 pl-2 pt-3 border-t border-zinc-850/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-zinc-500">Situação do Atendimento:</span>
                    {event.createdBy_name && (
                      <span className="text-[10px] text-[#E67E22] font-semibold mt-0.5">
                        Técnico: {event.createdBy_name}
                      </span>
                    )}
                  </div>
                  <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${config.bg}`}>
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT DIALOG */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEventModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl z-10 ${
                theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424] text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-display">
                  {editingEvent ? 'Editar Acompanhamento' : 'Configurar GP Semanal'}
                </h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  id="large-modal-close"
                  className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4" id="large-client-form">
                {/* Client dropdown or custom input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Selecione o Cliente *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      if (e.target.value !== 'custom') {
                        const matched = clients.find(c => c.id === e.target.value);
                        setCustomClientName(matched ? matched.name : '');
                      }
                    }}
                    id="schedule-client-select"
                    className={`w-full py-2.5 px-3 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-zinc-950 border-zinc-850 text-zinc-100 focus:border-[#D35400]' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                    }`}
                  >
                    {clients.filter(c => c.size === 'grande').map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1A1A1A] text-zinc-100">
                        {c.name} (Cód: {c.code || '001'})
                      </option>
                    ))}
                    {clients.filter(c => c.size !== 'grande').length > 0 && (
                      <option disabled className="text-zinc-500 bg-[#1A1A1A]">-- CLIENTES DE PEQUENO PORTE --</option>
                    )}
                    {clients.filter(c => c.size !== 'grande').map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1A1A1A] text-zinc-400">
                        {c.name} (Cód: {c.code || '001'})
                      </option>
                    ))}
                    <option value="custom" className="bg-[#1A1A1A] text-zinc-100">-- Digitar Nome Manual --</option>
                  </select>
                </div>

                {selectedClientId === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                      Nome do Cliente Especial *
                    </label>
                    <input
                      type="text"
                      required
                      value={customClientName}
                      onChange={(e) => setCustomClientName(e.target.value)}
                      placeholder="Ex: Lojas Vale do Rio"
                      id="schedule-client-name-custom"
                      className={`w-full py-2.5 px-3 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400 font-sans">
                      Dia Fixo de Visita
                    </label>
                    <select
                      value={scheduledWeekday}
                      onChange={(e) => setScheduledWeekday(e.target.value)}
                      id="schedule-weekday-select"
                      className={`w-full py-2.5 px-2 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' 
                          ? 'bg-zinc-950 border-zinc-850 text-zinc-100 focus:border-[#D35400]' 
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:border-[#D35400] font-sans'
                      }`}
                    >
                      {weekdays.map(day => (
                        <option key={day} value={day} className="bg-[#1A1A1A] text-zinc-100">{day}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400 font-sans">
                      Data Efetiva Ocorrida
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      id="schedule-visit-date"
                      className={`w-full py-2.5 px-2 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Situação Atual do Prazo
                  </label>
                  <select
                    value={situation}
                    onChange={(e) => setSituation(e.target.value as any)}
                    id="schedule-situation"
                    className={`w-full py-2.5 px-3 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-zinc-950 border-zinc-850 text-zinc-100 focus:border-[#D35400]' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:border-[#D35400]'
                    }`}
                  >
                    <option value="pendente" className="bg-[#1A1A1A] text-zinc-100">Pendente / Agendado</option>
                    <option value="no_prazo" className="bg-[#1A1A1A] text-zinc-100">Realizada no Prazo Correto</option>
                    <option value="antes_prazo" className="bg-[#1A1A1A] text-zinc-100">Realizada Antecipadamente (Antes do Prazo)</option>
                    <option value="atrasado" className="bg-[#1A1A1A] text-zinc-100">Atrasada em Relação ao Prazo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Observações de Vigilância
                  </label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Ex: Verificar ralos sifonados e dispensadores de iscas químicas nas dependências do refeitório."
                    rows={3}
                    id="schedule-ops"
                    className={`w-full p-3 rounded-xl border text-sm outline-none transition-all resize-none ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                    }`}
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    id="schedule-submit-btn"
                    className="w-full py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-semibold text-sm rounded-xl cursor-pointer"
                  >
                    Salvar Cronograma
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE CONFIRM OVERLAY */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xs"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl z-10 text-center ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-[#242424] text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="mx-auto w-12 h-12 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-lg font-display mb-1 text-white dark:text-zinc-100">Confirmar Remoção</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Tem certeza que deseja remover o cronograma de visita do cliente <span className="font-bold text-orange-500">"{deleteConfirm.name}"</span>?
                Esta ação é irreversível.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const eventToDelete = calendarEvents.find(e => e.id === deleteConfirm.id);
                    if (!canModifyItem(eventToDelete?.createdBy)) {
                      showToast('Nível de permissão insuficiente para excluir este cronograma.', 'error');
                      return;
                    }
                    AGRESTE_DB.deleteCalendarEvent(deleteConfirm.id);
                    showToast(`Cronograma de "${deleteConfirm.name}" removido com sucesso.`, 'success');
                    setDeleteConfirm(null);
                    onRefreshData();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
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
