/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Plus, Edit3, Trash2, RotateCcw, 
  Calendar, Check, AlertTriangle, Search, ClipboardList, Info, Sparkles,
  Play, FileText, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AGRESTE_DB } from '../services/db';
import { ManagerTask, WeekdayUnion } from '../types';

interface GerenciaTabProps {
  theme: 'light' | 'dark';
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  canEdit?: boolean;
}

const getTodayWeekday = (): WeekdayUnion => {
  const dayNames: WeekdayUnion[] = ['Segunda', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const dayOfWeek = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  return dayNames[dayOfWeek] || 'Segunda';
};

export default function GerenciaTab({ theme, showToast, canEdit = true }: GerenciaTabProps) {
  const [tasks, setTasks] = useState<ManagerTask[]>([]);
  const [selectedDay, setSelectedDay] = useState<WeekdayUnion>(getTodayWeekday());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom tasks modal states
  const [isAddMode, setIsAddMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState<WeekdayUnion>('Segunda');
  const [newPlannedTime, setNewPlannedTime] = useState('08:00');
  const [newDetails, setNewDetails] = useState('');

  // Details Modal state
  const [detailedTask, setDetailedTask] = useState<ManagerTask | null>(null);
  const [detailedNotes, setDetailedNotes] = useState('');
  const [detailedPlannedTime, setDetailedPlannedTime] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');

  // Daily Report Modal
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);

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

  // Helper: start task tracking
  const handleStartTask = (taskId: string) => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para alterar tarefas.', 'error');
      return;
    }
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, startTime: timeStr };
      }
      return t;
    });
    saveTasksState(updated);
    showToast('Tarefa iniciada! Horário de início registrado.', 'success');
  };

  // Helper: finish task tracking
  const handleFinishTask = (taskId: string) => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para alterar tarefas.', 'error');
      return;
    }
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, endTime: timeStr, completed: true };
      }
      return t;
    });
    saveTasksState(updated);
    showToast('Tarefa finalizada e registrada com sucesso!', 'success');
  };

  // Helper: reset task times
  const handleResetTaskTimes = (taskId: string) => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para alterar tarefas.', 'error');
      return;
    }
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, startTime: undefined, endTime: undefined, completed: false };
      }
      return t;
    });
    saveTasksState(updated);
    showToast('Horários e status de conclusão limpados!', 'info');
  };

  // Open Details Modal with pre-populated values
  const handleOpenDetails = (task: ManagerTask) => {
    setDetailedTask(task);
    setDetailedNotes(task.notes || '');
    setDetailedPlannedTime(task.plannedTime || '08:00');
    setDetailedDescription(task.details || '');
  };

  // Save Details Modal modifications
  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedTask) return;
    const updated = tasks.map(t => {
      if (t.id === detailedTask.id) {
        return {
          ...t,
          plannedTime: detailedPlannedTime,
          notes: detailedNotes,
          details: detailedDescription,
        };
      }
      return t;
    });
    saveTasksState(updated);
    setDetailedTask(null);
    showToast('Detalhes e horários atualizados com sucesso!', 'success');
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
        const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        showToast(
          nextStatus ? 'Tarefa concluída! Horários registrados.' : 'Tarefa marcada como pendente.',
          nextStatus ? 'success' : 'info'
        );
        return {
          ...t,
          completed: nextStatus,
          startTime: nextStatus ? (t.startTime || nowStr) : undefined,
          endTime: nextStatus ? (t.endTime || nowStr) : undefined
        };
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
      isCustom: true,
      plannedTime: newPlannedTime,
      details: newDetails.trim()
    };

    saveTasksState([...tasks, newTask]);
    setNewTitle('');
    setNewPlannedTime('08:00');
    setNewDetails('');
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
    setEditingTask({
      ...task,
      plannedTime: task.plannedTime || '08:00',
      details: task.details || ''
    });
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
      payload: { 
        ...editingTask, 
        title: editTitle.trim(),
        plannedTime: editingTask.plannedTime || '08:00',
        details: editingTask.details || ''
      },
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
            onClick={() => setShowDailyReportModal(true)}
            id="btn-generate-daily-report"
            className="px-3.5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-md cursor-pointer hover:bg-emerald-500 transition-colors flex items-center gap-1.5 active:scale-95"
            title="Gerar Relatório Diário de Atividades"
          >
            <FileText className="w-4 h-4" />
            Gerar Relatório Diário
          </button>
          
          <button
            onClick={triggerReset}
            id="btn-reset-manager-tasks"
            className={`px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 ${
              theme === 'dark'
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850'
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
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  task.completed 
                    ? theme === 'dark'
                      ? 'border-emerald-500/30 bg-emerald-950/15'
                      : 'border-emerald-500/20 bg-emerald-50/50'
                    : theme === 'dark'
                      ? 'border-zinc-800 bg-[#161618] hover:border-zinc-700' 
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-2xs'
                }`}
              >
                {/* Horizontal Group: Left Hours, Checkbox/Title */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  
                  {/* Left Planned Time Badge */}
                  <div className={`flex flex-col items-center justify-center shrink-0 w-14 text-center pr-3 border-r select-none ${
                    theme === 'dark' ? 'border-zinc-805 bg-black/10 rounded-lg p-1 py-1 px-1.5' : 'border-zinc-200 bg-zinc-100 rounded-lg p-1 py-1 px-1.5'
                  }`}>
                    <span className={`font-mono text-xs font-bold leading-none ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                      {task.plannedTime || '08:00'}
                    </span>
                    <span className="text-[7.5px] uppercase tracking-wider text-zinc-500 font-extrabold mt-1">
                      Horário
                    </span>
                  </div>

                  {/* Checkbox and Text */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
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

                    <div className="min-w-0 flex-1 text-left">
                      <p className={`text-xs font-bold leading-relaxed ${
                        task.completed 
                          ? 'line-through text-zinc-500 dark:text-zinc-500 font-normal' 
                          : theme === 'dark'
                            ? 'text-zinc-100'
                            : 'text-zinc-900'
                      }`}>
                        {task.title}
                      </p>
                      
                      {/* Sub-badge times tracking */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {task.startTime && (
                          <span className={`text-[9.5px] font-mono font-medium px-2 py-0.5 rounded-md border ${
                            theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-650'
                          }`}>
                            Início: <strong className="text-orange-500">{task.startTime}</strong>
                          </span>
                        )}
                        {task.endTime && (
                          <span className={`text-[9.5px] font-mono font-medium px-2 py-0.5 rounded-md border ${
                            theme === 'dark' ? 'bg-zinc-900 border-emerald-950/35 text-emerald-400' : 'bg-emerald-50/70 border-emerald-100 text-emerald-700'
                          }`}>
                            Término: <strong className="text-emerald-500">{task.endTime}</strong>
                          </span>
                        )}
                        {!task.startTime && !task.endTime && (
                          <span className="text-[8px] uppercase tracking-widest text-[#D35400]/80 font-bold block">
                            • Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operations & Action Tracker Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
                  
                  {/* Action Tracker Trigger */}
                  {!task.startTime && !task.completed && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-lg bg-emerald-600/10 text-emerald-505 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      Iniciar
                    </button>
                  )}
                  
                  {task.startTime && !task.endTime && (
                    <button
                      onClick={() => handleFinishTask(task.id)}
                      className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-lg bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95 animate-pulse"
                    >
                      <Check className="w-3 h-3 text-red-500" />
                      Finalizar
                    </button>
                  )}

                  {task.startTime && task.endTime && (
                    <button
                      onClick={() => handleResetTaskTimes(task.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-zinc-900 text-zinc-500 border-zinc-850 hover:text-zinc-300'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-400 border-zinc-200 hover:text-zinc-700'
                      }`}
                      title="Reiniciar Horários de Execução"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Details Button */}
                  <button
                    onClick={() => handleOpenDetails(task)}
                    className={`px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      theme === 'dark'
                        ? 'bg-zinc-900 text-zinc-300 border-zinc-850 hover:bg-zinc-800'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <Info className="w-3 h-3 text-[#D35400]" />
                    Detalhes
                  </button>

                  <div className={`h-6 w-[1px] ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

                  {/* Quick Edit/Delete */}
                  <button
                    onClick={() => triggerEdit(task)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-[#D35400] hover:bg-zinc-800/20 transition-colors cursor-pointer"
                    title="Editar afazer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => triggerDelete(task.id, task.title)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-zinc-800/20 transition-colors cursor-pointer"
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

              <div className="grid grid-cols-2 gap-2">
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

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Horário Previsto:</label>
                  <input
                    type="text"
                    required
                    value={newPlannedTime}
                    onChange={(e) => setNewPlannedTime(e.target.value)}
                    placeholder="EX: 08:30"
                    className="w-full px-3 py-2 bg-zinc-950 border border-[#D35400]/20 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-[#D35400]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Procedimento / Detalhes (Diretrizes):</label>
                <textarea
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  placeholder="EX: Descrever passos prioritários e cuidados regulatórios..."
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-[#D35400]"
                />
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
          <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
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

              <div className="grid grid-cols-2 gap-2">
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

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Horário Previsto:</label>
                  <input
                    type="text"
                    required
                    value={editingTask.plannedTime || '08:00'}
                    onChange={(e) => setEditingTask({ ...editingTask, plannedTime: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-[#D35400]"
                    placeholder="EX: 08:30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Procedimento / Detalhes:</label>
                <textarea
                  value={editingTask.details || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, details: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-[#D35400]"
                  placeholder="EX: Passos operacionais detalhados..."
                  rows={2}
                />
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

      {/* DETAILED TASK VIEW & NOTES EDITOR MODAL */}
      <AnimatePresence>
        {detailedTask && (
          <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <motion.form
              onSubmit={handleSaveDetails}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-805 rounded-2xl max-w-lg w-full p-6 text-left shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase text-[#D35400] tracking-widest">
                    Procedimento Detalhado do Checklist
                  </h3>
                  <h2 className="text-md font-extrabold text-zinc-100 font-display mt-1">
                    {detailedTask.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailedTask(null)}
                  className="p-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-zinc-900/40">
                <div>
                  <label className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Dia da Atividade:</label>
                  <span className="text-zinc-200 text-xs font-semibold block mt-1 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                    {detailedTask.day}
                  </span>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Horário Previsto (Lado Esquerdo):</label>
                  <input
                    type="text"
                    required
                    value={detailedPlannedTime}
                    onChange={(e) => setDetailedPlannedTime(e.target.value)}
                    placeholder="EX: 08:00"
                    className="w-full text-zinc-200 text-xs font-semibold mt-1 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-[#D35400]/25 focus:outline-[#D35400] focus:ring-1 focus:ring-[#D35400]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#D35400] font-mono font-bold uppercase tracking-wider block">Diretrizes / Detalhes da Tarefa:</label>
                <textarea
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  placeholder="Instruções padrão do checklist ou orientações de conformidade..."
                  rows={2}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-zinc-100 focus:outline-[#D35400] focus:ring-1 focus:ring-[#D35400] leading-relaxed"
                />
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
                <h4 className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Histórico de Conclusão e Ponto Eletrônico:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Horário Início:</span>
                    <span className="font-mono text-zinc-300 block font-semibold mt-0.5">
                      {detailedTask.startTime ? `🟢 ${detailedTask.startTime}` : '❌ Não Iniciado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Horário Término:</span>
                    <span className="font-mono text-zinc-300 block font-semibold mt-0.5">
                      {detailedTask.endTime ? `🏁 ${detailedTask.endTime}` : '❌ Não Finalizado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-wider block">Notas de Execução / Ocorrências (Para Relatório):</label>
                <textarea
                  value={detailedNotes}
                  onChange={(e) => setDetailedNotes(e.target.value)}
                  placeholder="Relatório de inconformidades, avarias, consumo ou justificação de atrasos..."
                  rows={2}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-100 focus:outline-[#D35400] focus:ring-1 focus:ring-[#D35400] leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setDetailedTask(null)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D35400] hover:bg-[#E67E22] text-white font-extrabold rounded-xl cursor-pointer shadow-md"
                >
                  Salvar Detalhes
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* DAILY CHECKLIST ROUTINE REPORT (PDF-PRINTABLE) */}
      <AnimatePresence>
        {showDailyReportModal && (
          <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-805 rounded-2xl max-w-3xl w-full p-6 text-left shadow-2xl space-y-4 relative"
            >
              {/* Header with Print buttons */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div>
                  <h2 className="text-sm font-extrabold text-[#D35400] font-sans uppercase tracking-widest">
                    RELATÓRIO DIÁRIO DE ATIVIDADES
                  </h2>
                  <p className="text-[10px] text-zinc-400">
                    Geração de dossiê de obrigações com hora programada vs hora realizada.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 text-[10px] font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow transition-all cursor-pointer"
                  >
                    Imprimir Relatório
                  </button>
                  <button
                    onClick={() => setShowDailyReportModal(false)}
                    className="p-1 text-zinc-500 hover:text-white transition-colors rounded-lg bg-zinc-900 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Area content wrapper */}
              <div id="activity-report-print-target" className="space-y-4 p-4 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-100 font-sans">
                {/* Dossiê Heading */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-900 pb-3">
                  <div>
                    <h1 className="text-md font-black tracking-tight text-white uppercase">AGRESTE SANEAMENTO INTEGRAL</h1>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Laudo de Ponto de Atividades • Gerência Geral</span>
                  </div>
                  <div className="text-right sm:text-right text-[10px] font-mono">
                    <p>Dia Selecionado: <strong className="text-orange-400">{selectedDay.toUpperCase()}</strong></p>
                    <p>Data de Emissão: <strong className="text-zinc-300">{getDayDateLabel(selectedDay)} / {new Date().getFullYear()}</strong></p>
                  </div>
                </div>

                {/* Checklist Report Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-950 text-zinc-550 uppercase tracking-widest font-mono text-[8px]">
                        <th className="py-2 pr-2">Horário Previsto</th>
                        <th className="py-2 pr-2">Tarefa / Obrigações do Expediente</th>
                        <th className="py-2 pr-2">Início Real</th>
                        <th className="py-2 pr-2">Conclusão Real</th>
                        <th className="py-2 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {tasks.filter(t => t.day === selectedDay).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-zinc-400 italic">
                            Nenhum encargo programado para este determinado dia.
                          </td>
                        </tr>
                      ) : (
                        tasks.filter(t => t.day === selectedDay).map((t) => {
                          let statusLabel = 'Pendente';
                          let statusClass = 'bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold border border-rose-500/10';
                          if (t.completed) {
                            statusLabel = 'Realizada';
                            statusClass = 'bg-emerald-600/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-555/15';
                          } else if (t.startTime) {
                            statusLabel = 'Em Progresso';
                            statusClass = 'bg-amber-600/15 text-amber-500 px-2 py-0.5 rounded-full font-bold border border-amber-500/10';
                          }
                          
                          return (
                            <tr key={t.id} className="hover:bg-zinc-900/30 transition-colors">
                              <td className="py-3 font-semibold font-mono text-zinc-400">{t.plannedTime || '08:00'}</td>
                              <td className="py-3 pr-2">
                                <p className="font-bold text-zinc-200">{t.title}</p>
                                {t.details && <p className="text-[9px] text-zinc-500 mt-0.5">{t.details}</p>}
                                {t.notes && <p className="text-[9px] text-orange-400 mt-1 italic">Obs: {t.notes}</p>}
                              </td>
                              <td className="py-3 font-mono text-zinc-400">{t.startTime || '--:--'}</td>
                              <td className="py-3 font-mono text-emerald-500">{t.endTime || '--:--'}</td>
                              <td className="py-3 px-2 text-center">
                                <span className={statusClass}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures and Endorsements block */}
                <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-zinc-900 text-center text-[9px] text-zinc-500">
                  <div className="border-t border-dashed border-zinc-800 pt-2">
                    <p className="font-bold uppercase text-zinc-400">GIL SILVA</p>
                    <p>Administrador Responsável</p>
                  </div>
                  <div className="border-t border-dashed border-zinc-800 pt-2">
                    <p className="font-bold uppercase text-zinc-400">DIRETORIA OPERACIONAL</p>
                    <p>AGRESTE Saneamento</p>
                  </div>
                </div>
              </div>

              {/* Instructions and Close actions */}
              <div className="text-[10px] text-zinc-500 bg-zinc-950/40 p-3 rounded-lg flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[#D35400] shrink-0 mt-0.5" />
                <span>Para exportar em formato PDF de forma nativa ou enviar para a diretoria, clique em <strong>Imprimir Relatório</strong> e selecione a opção de destino <strong>"Salvar como PDF"</strong>.</span>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowDailyReportModal(false)}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl shadow cursor-pointer font-semibold"
                >
                  Fechar Visualização
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
