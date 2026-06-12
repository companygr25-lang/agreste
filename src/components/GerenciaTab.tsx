/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Plus, Edit3, Trash2, RotateCcw, 
  Calendar, Check, AlertTriangle, Search, ClipboardList, Info, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AGRESTE_DB } from '../services/db';
import { ManagerTask, WeekdayUnion } from '../types';

interface GerenciaTabProps {
  theme: 'light' | 'dark';
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  canEdit?: boolean;
}

export default function GerenciaTab({ theme, showToast, canEdit = true }: GerenciaTabProps) {
  const [tasks, setTasks] = useState<ManagerTask[]>([]);
  const [selectedDay, setSelectedDay] = useState<WeekdayUnion>('Segunda');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom tasks modal states
  const [isAddMode, setIsAddMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState<WeekdayUnion>('Segunda');

  // Edit / Action Confirmation states
  const [editingTask, setEditingTask] = useState<ManagerTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    type: 'delete' | 'reset' | 'edit';
    taskId?: string;
    payload?: any;
    message: string;
  } | null>(null);

  // Load tasks on mount and db changes
  useEffect(() => {
    const loaded = AGRESTE_DB.getManagerTasks();
    setTasks(loaded);
  }, []);

  const saveTasksState = (updated: ManagerTask[]) => {
    setTasks(updated);
    AGRESTE_DB.saveManagerTasks(updated);
  };

  // Helper: toggle task completion
  const handleToggleTask = (taskId: string) => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para alterar tarefas.', 'error');
      return;
    }
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus = !t.completed;
        showToast(
          nextStatus ? 'Tarefa marcada como Concluída! 🎯' : 'Tarefa marcada como Pendente.',
          nextStatus ? 'success' : 'info'
        );
        return { ...t, completed: nextStatus };
      }
      return t;
    });
    saveTasksState(updated);
  };

  // Helper: add custom task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para adicionar tarefas.', 'error');
      return;
    }
    if (!newTitle.trim()) {
      showToast('O título da tarefa não pode estar vazio.', 'error');
      return;
    }

    const newTask: ManagerTask = {
      id: `custom-task-${Date.now()}`,
      day: newDay,
      title: newTitle.trim(),
      completed: false,
      isCustom: true
    };

    saveTasksState([...tasks, newTask]);
    setNewTitle('');
    setIsAddMode(false);
    setSelectedDay(newDay); // switch view to the added task's day
    showToast('Nova tarefa adicionada com sucesso!', 'success');
  };

  // Trigger confirmation prompt for Delete
  const triggerDelete = (taskId: string, title: string) => {
    setConfirmModal({
      type: 'delete',
      taskId,
      message: `Tem certeza que deseja excluir permanentemente a tarefa "${title}"?`
    });
  };

  // Execute Delete
  const executeDelete = (taskId: string) => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para excluir tarefas.', 'error');
      return;
    }
    const updated = tasks.filter(t => t.id !== taskId);
    saveTasksState(updated);
    showToast('Tarefa excluída permanentemente.', 'info');
    setConfirmModal(null);
  };

  // Trigger confirmation prompt for Edit
  const triggerEdit = (task: ManagerTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
  };

  // Save Edit action after user confirmation
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTitle.trim()) {
      showToast('O título da tarefa não pode estar vazio.', 'error');
      return;
    }

    setConfirmModal({
      type: 'edit',
      taskId: editingTask.id,
      payload: { ...editingTask, title: editTitle.trim() },
      message: `Deseja salvar as alterações feitas no item "${editingTask.title}"?`
    });
  };

  // Execute Edit
  const executeEdit = (updatedTask: ManagerTask) => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para editar tarefas.', 'error');
      return;
    }
    const updated = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    saveTasksState(updated);
    showToast('Tarefa atualizada com sucesso!', 'success');
    setEditingTask(null);
    setConfirmModal(null);
  };

  // Trigger Confirmation for Resetting all day's completions
  const triggerReset = () => {
    setConfirmModal({
      type: 'reset',
      message: 'Deseja reiniciar/desmarcar todos os seus afazeres desta lista?'
    });
  };

  // Execute Reset
  const executeReset = () => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para reiniciar tarefas.', 'error');
      return;
    }
    const updated = tasks.map(t => ({ ...t, completed: false }));
    saveTasksState(updated);
    showToast('Lista de afazeres reiniciada com sucesso.', 'success');
    setConfirmModal(null);
  };

  // Calculations for current selection & overall
  const days: WeekdayUnion[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Mensal'];
  
  // Helper to fetch formatted date for each day of current week
  const getDayDateLabel = (day: WeekdayUnion): string => {
    if (day === 'Mensal') {
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const currentMonth = months[new Date().getMonth()];
      return currentMonth.toUpperCase();
    }

    const dayOffsets: { [key: string]: number } = {
      'Segunda': 1,
      'Terça': 2,
      'Quarta': 3,
      'Quinta': 4,
      'Sexta': 5,
      'Sábado': 6
    };

    const targetDayCode = dayOffsets[day];
    if (targetDayCode === undefined) return '';

    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Normalize Sunday (0) to 7 for index calculations
    const normalizedTodayCode = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
    const difference = targetDayCode - normalizedTodayCode;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + difference);
    
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    
    return `${dd}/${mm}`;
  };
  
  const filteredTasks = tasks.filter(t => {
    const matchesDay = t.day === selectedDay;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDay && matchesSearch;
  });

  const totalSelectedTasks = tasks.filter(t => t.day === selectedDay).length;
  const completedSelectedTasks = tasks.filter(t => t.day === selectedDay && t.completed).length;
  const completionPercentage = totalSelectedTasks > 0 ? Math.round((completedSelectedTasks / totalSelectedTasks) * 100) : 0;

  // General statistics for indicator panels
  const overallTotal = tasks.length;
  const overallCompleted = tasks.filter(t => t.completed).length;
  const overallPercentage = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'}`} id="gerencia-tab-root">
      
      {/* Title Header */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4 ${
        theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-[#D35400]/20 text-[#D35400] rounded-md">
              Checklist de Gerência
            </span>
          </div>
          <h2 className={`text-2xl font-bold font-display mt-1 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            CHECKLIST
          </h2>
          <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${theme === 'dark' ? 'text-zinc-350' : 'text-zinc-600'}`}>
            Acompanhamento e controle de afazeres diários, controle de rotinas e tarefas operacionais da gerência.
          </p>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddMode(true)}
            id="btn-add-manager-task"
            className="px-3.5 py-2 text-xs font-bold bg-[#D35400] text-white rounded-xl shadow-md cursor-pointer hover:bg-[#E67E22] transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
          
          <button
            onClick={triggerReset}
            id="btn-reset-manager-tasks"
            className={`px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 ${
              theme === 'dark'
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-805'
                : 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700'
            }`}
            title="Reiniciar progresso de todas as tarefas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar Progresso
          </button>
        </div>
      </div>

      {/* INDIVIDUAL INDICATOR CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="gerencia-indicators">
        
        {/* Progress Day Card */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          theme === 'dark' ? 'border-zinc-800 bg-[#161618]' : 'border-zinc-200 bg-white'
        }`}>
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 text-[10px] font-bold font-mono tracking-widest uppercase">
            <span>Adesão {selectedDay}</span>
            <Calendar className="w-3.5 h-3.5 text-[#D35400]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-extrabold font-display ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {completionPercentage}%
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              ({completedSelectedTasks}/{totalSelectedTasks})
            </span>
          </div>
          <div className={`w-full rounded-full h-1.5 mt-3 overflow-hidden ${theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
            <motion.div 
              className="bg-[#D35400] h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Global Progress Card */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          theme === 'dark' ? 'border-zinc-800 bg-[#161618]' : 'border-zinc-200 bg-white'
        }`}>
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 text-[10px] font-bold font-mono tracking-widest uppercase">
            <span>Total da Semana</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-extrabold font-display ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
              {overallPercentage}%
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              ({overallCompleted}/{overallTotal})
            </span>
          </div>
          <div className={`w-full rounded-full h-1.5 mt-3 overflow-hidden ${theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
            <motion.div 
              className="bg-amber-500 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Pending Card */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          theme === 'dark' ? 'border-zinc-800 bg-[#161618]' : 'border-zinc-200 bg-white'
        }`}>
          <div className="flex items-center justify-between text-[#E74C3C] text-[10px] font-bold font-mono tracking-widest uppercase">
            <span>Pendências Hoje</span>
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-[#E74C3C] font-display">
              {totalSelectedTasks - completedSelectedTasks}
            </span>
            <span className="text-xs text-zinc-500 ml-1 font-medium">
              itens restantes
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-3 truncate font-medium">
            {selectedDay === 'Mensal' ? 'Afazeres mensais' : `Rotinas focadas para: ${selectedDay}`}
          </p>
        </div>

        {/* Adherence Rate status card */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          theme === 'dark' ? 'border-zinc-800 bg-[#161618]' : 'border-zinc-200 bg-white'
        }`}>
          <div className="flex items-center justify-between text-emerald-500 text-[10px] font-bold font-mono tracking-widest uppercase">
            <span>Status da Operação</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-emerald-500 font-display truncate">
            {completionPercentage === 100 
              ? 'Concluído!' 
              : completionPercentage >= 50 
                ? 'Em progresso bom' 
                : totalSelectedTasks === 0 
                  ? 'Sem tarefas' 
                  : 'Ações Pendentes'}
          </div>
          <p className="text-[10px] text-zinc-400 mt-4 leading-none font-medium">
            {completionPercentage === 100 ? 'Excelente! Tudo sob controle.' : 'Foco operacional necessário.'}
          </p>
        </div>

      </div>

      {/* FILTER & WEEKDAY SELECTOR CONTAINER */}
      <div className={`p-4 rounded-2xl border space-y-4 shadow-sm ${
        theme === 'dark' ? 'border-zinc-800 bg-[#141416]' : 'border-zinc-200 bg-zinc-50/80'
      }`}>
        
        {/* Navigation Tabs (Faithful to spreadsheet headers) */}
        <div className={`flex flex-wrap gap-1 border-b pb-2 ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
          {days.map((day) => {
            const isSelected = selectedDay === day;
            const dayCount = tasks.filter(t => t.day === day).length;
            const dayCompleted = tasks.filter(t => t.day === day && t.completed).length;
            const pct = dayCount > 0 ? Math.round((dayCompleted / dayCount) * 100) : 0;
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-[#D35400] text-white shadow-xs' 
                    : theme === 'dark'
                      ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                }`}
              >
                <span>{day.toUpperCase()}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  isSelected 
                    ? 'bg-black/30 text-white' 
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400'
                      : 'bg-zinc-200 text-zinc-600'
                }`}>
                  {getDayDateLabel(day)}
                </span>
                {pct === 100 && dayCount > 0 && (
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search tool for tasks */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder={`Buscar na rotina de ${selectedDay}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 border text-xs rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#D35400] transition-colors ${
              theme === 'dark'
                ? 'border-zinc-800 bg-zinc-950/70 text-zinc-100 placeholder-zinc-500'
                : 'border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400'
            }`}
          />
        </div>
      </div>

      {/* CORE CHECKLIST GRID */}
      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`p-8 text-center rounded-2xl border border-dashed ${
                theme === 'dark'
                  ? 'border-zinc-800 bg-zinc-950/20 text-zinc-400'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500'
              }`}
            >
              <ClipboardList className="w-8 h-8 text-zinc-450 mx-auto opacity-50 mb-2" />
              <p className="text-xs font-medium font-display">Nenhum afazer cadastrado para este dia ou busca.</p>
              <p className="text-[10px] text-zinc-500 mt-1">Insira uma tarefa customizada utilizando o botão "Nova Tarefa" acima.</p>
            </motion.div>
          ) : (
            filteredTasks.map((task, idx) => (
              <motion.div
                key={task.id}
                layoutId={`task-container-${task.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, delay: idx * 0.02 }}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                  task.completed 
                    ? theme === 'dark'
                      ? 'border-emerald-505/30 bg-emerald-950/15'
                      : 'border-emerald-500/20 bg-emerald-50/50'
                    : theme === 'dark'
                      ? 'border-zinc-800 bg-[#161618] hover:border-zinc-700' 
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="mt-0.5 text-[#D35400] hover:text-[#E67E22] transition-transform duration-100 transform active:scale-90 shrink-0 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-relaxed ${
                      task.completed 
                        ? 'line-through text-zinc-500 dark:text-zinc-500 font-normal' 
                        : theme === 'dark'
                          ? 'text-zinc-100'
                          : 'text-zinc-900'
                    }`}>
                      {task.title}
                    </p>
                    
                    {task.completed && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[8px] font-mono font-semibold text-emerald-500 flex items-center gap-0.5">
                          ✓ realizado
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations Buttons: Edit and Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => triggerEdit(task)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-[#D35400] hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    title="Editar afazer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => triggerDelete(task.id, task.title)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    title="Excluir afazer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* RENDER SHEET FOOTNOTE INFORMATION */}
      <div className="p-4 rounded-xl border border-zinc-800/20 dark:border-zinc-900 bg-zinc-500/[0.02] flex gap-3">
        <Info className="w-4.5 h-4.5 text-[#D35400] shrink-0 mt-0.5" />
        <div className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p className="font-bold text-zinc-400 dark:text-zinc-300 uppercase tracking-widest font-mono text-[9px] mb-0.5">Observação de Execução:</p>
          Este painel reflete com perfeição as obrigações estipuladas na planilha física de "ROTINA GERENCIA". Os relatórios gerados a partir deste fluxo são compartilhados de forma transparente com os diretores de saúde da AGRESTE.
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-850 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase font-display text-zinc-300 tracking-wider">
                    Confirmação Necessária
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-zinc-900 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.type === 'delete' && confirmModal.taskId) {
                      executeDelete(confirmModal.taskId);
                    } else if (confirmModal.type === 'edit' && confirmModal.payload) {
                      executeEdit(confirmModal.payload);
                    } else if (confirmModal.type === 'reset') {
                      executeReset();
                    }
                  }}
                  className={`px-4 py-2 text-xs font-extrabold text-white rounded-xl cursor-pointer shadow-md ${
                    confirmModal.type === 'delete' ? 'bg-red-650 hover:bg-red-700' : 'bg-[#D35400] hover:bg-[#E67E22]'
                  }`}
                >
                  {confirmModal.type === 'delete' ? 'Sim, Excluir' : 'Sim, Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE NEW TASK MODAL */}
      <AnimatePresence>
        {isAddMode && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.form
              onSubmit={handleAddTask}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-850 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl space-y-4"
            >
              <div>
                <h3 className="text-sm font-extrabold uppercase font-display text-[#D35400] tracking-semibold">
                  Cadastrar Item do Checklist
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Adicione uma tarefa customizada ou afazer na agenda.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Afazer / Obrigação:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="EX: Conferir estoque de biocidas..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-[#D35400]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Dia de Atuação:</label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value as WeekdayUnion)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white focus:outline-hidden"
                >
                  {days.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddMode(false)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D35400] text-white font-extrabold hover:bg-[#E67E22] rounded-xl cursor-pointer shadow-md"
                >
                  Cadastrar
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT EXISTING TASK DIALOG WITH CONFIRMATION */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.form
              onSubmit={handleSaveEdit}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-850 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl space-y-4"
            >
              <div>
                <h3 className="text-sm font-extrabold uppercase font-display text-[#D35400] tracking-semibold">
                  Editar Item do Checklist
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Modifique os detalhes desta tarefa ou afazer.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Afazer:</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-[#D35400]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Dia da Semana:</label>
                <select
                  value={editingTask.day}
                  onChange={(e) => setEditingTask({ ...editingTask, day: e.target.value as WeekdayUnion })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white focus:outline-hidden"
                >
                  {days.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D35400] text-white font-extrabold hover:bg-[#E67E22] rounded-xl cursor-pointer shadow-md"
                >
                  Salvar
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
