/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, CompanyDocument, VisitReport } from '../types';
import { AGRESTE_DB } from '../services/db';
import { 
  Users, CheckCircle2, AlertTriangle, FileCheck, Landmark, ArrowRight,
  TrendingUp, Calendar, ArrowUpRight, DollarSign, Clock, HelpCircle,
  Check, Sparkles, ClipboardCheck, Plus, Trash2
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
}

interface TechnicalObjective {
  id: string;
  task: string;
  category: string;
  done: boolean;
  priority: 'Urgente' | 'Alta' | 'Média' | 'Baixa';
}

export default function DashboardTab({ 
  theme, clients, reports, documents, setActiveTab, showToast, onRefreshData 
}: DashboardTabProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

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

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-black font-display tracking-tight uppercase text-zinc-100 dark:text-zinc-50 flex items-center gap-2">
            Painel Geral <span className="text-[10px] bg-[#D35400] text-white px-2 py-0.5 rounded font-mono font-bold tracking-wider">Antracite Compacto</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Métricas de controle operacional, status de conformidade integrada e agendas diárias unificadas.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#D35400]/10 text-[#D35400] text-[11px] font-mono font-bold px-3 py-1 rounded-sm border border-[#D35400]/30">
          <Clock className="w-3.5 h-3.5" />
          <span>Sincronia: 21 de Maio, 2026</span>
        </div>
      </div>

      {/* Metrics Bento Grid with thick borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 (Clientes) */}
        <div 
          onClick={() => setActiveTab('clientes')}
          id="kpi-card-clientes"
          className={`group shadow-sm cursor-pointer transition-all border relative overflow-hidden p-3.5 rounded-sm ${
            theme === 'dark' 
              ? 'bg-[#1A1A1A] border-[#242424] border-l-[6px] border-l-[#D35400] hover:border-r-slate-800' 
              : 'bg-white border-zinc-200 border-l-[6px] border-l-[#D35400] shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] text-[#D35400]">
              Controle Geral
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#D35400] transition-colors" />
          </div>
          <div className="mt-2.5">
            <span className="block text-3xl font-black font-mono tracking-tight text-[#D35400]">
              {activeClientsCount}
            </span>
            <span className="text-xs font-bold block mt-0.5 text-zinc-200 dark:text-zinc-100">
              Clientes Ativos
            </span>
            <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">
              Cadastros ativos e mapeados.
            </span>
          </div>
        </div>

        {/* Metric 2 (Atividades Concluídas) */}
        <div 
          onClick={() => setActiveTab('relatorios')}
          id="kpi-card-atividades"
          className={`group shadow-sm cursor-pointer transition-all border relative overflow-hidden p-3.5 rounded-sm ${
            theme === 'dark' 
              ? 'bg-[#1A1A1A] border-[#242424] border-l-[6px] border-l-[#10B981]' 
              : 'bg-white border-zinc-200 border-l-[6px] border-l-emerald-500 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] text-emerald-500">
              Estatísticas SMS
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="mt-2.5">
            <span className="block text-3xl font-black font-mono tracking-tight text-emerald-500">
              {completedVisitsCount}
            </span>
            <span className="text-xs font-bold block mt-0.5 text-zinc-200 dark:text-zinc-100">
              Atividades Concluídas
            </span>
            <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">
              Laudos técnicos salvos hoje.
            </span>
          </div>
        </div>

        {/* Metric 3 (Lembretes / Demandas) */}
        <div 
          onClick={() => setActiveTab('configuracoes')}
          id="kpi-card-demandas"
          className={`group shadow-sm cursor-pointer transition-all border relative overflow-hidden p-3.5 rounded-sm ${
            theme === 'dark' 
              ? 'bg-[#1A1A1A] border-[#242424] border-l-[6px] border-l-[#F59E0B]' 
              : 'bg-white border-zinc-200 border-l-[6px] border-l-amber-500 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] text-amber-500">
              Pendências Campo
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="mt-2.5">
            <span className="block text-3xl font-black font-mono tracking-tight text-amber-500">
              {AGRESTE_DB.getReminders().filter(r => !r.completed).length}
            </span>
            <span className="text-xs font-bold block mt-0.5 text-zinc-200 dark:text-zinc-100">
              Lembretes de Campo
            </span>
            <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">
              Instruções e alarmes ativos.
            </span>
          </div>
        </div>

        {/* Metric 4 (Documentação) */}
        <div 
          onClick={() => setActiveTab('documentacao')}
          id="kpi-card-docs"
          className={`group shadow-sm cursor-pointer transition-all border relative overflow-hidden p-3.5 rounded-sm ${
            theme === 'dark' 
              ? 'bg-[#1A1A1A] border-[#242424] border-l-[6px] border-l-[#EF4444]' 
              : 'bg-white border-zinc-200 border-l-[6px] border-l-red-500 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] text-red-500">
              Vigilância Ativa
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-500 transition-colors" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tracking-tight text-red-500">
                {okDocsCount}
              </span>
              <span className="text-[11px] font-mono font-bold text-zinc-500">/ {documents.length} OK</span>
            </div>
            <span className="text-xs font-bold block mt-0.5 text-zinc-200 dark:text-zinc-100">
              Documentos Estáveis
            </span>
            <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">
              {pendingDocsCount > 0 ? `${pendingDocsCount} alertas de ação pendente.` : 'Alvarás e termos regulares.'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Analysis and Alerts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Weekly Productivity Custom Line & Bar Chart */}
        <div className={`col-span-1 lg:col-span-8 p-4 rounded-sm border ${
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
        </div>

        {/* High-Contrast Pending Payments Block */}
        <div className={`col-span-1 lg:col-span-4 p-4 rounded-sm border flex flex-col justify-between ${
          theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-[#D35400]" />
              <h3 className="text-[14px] font-black uppercase tracking-tight text-zinc-200 dark:text-zinc-100">Faturas Pendentes</h3>
            </div>
            
            <p className="text-[11px] text-zinc-400 mb-2 leading-tight">
              Acompanhamento de fluxos abertos. Realize cobranças ativas para manter a sustentabilidade operacional.
            </p>

            {pendingPaymentsCount === 0 ? (
              <div className="py-6 text-center bg-[#141414] rounded border border-dashed border-zinc-800 text-zinc-500 text-[11px]">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/50 mx-auto mb-1" />
                Nenhuma pendência financeira encontrada!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {pendingPaymentClients.map((client) => (
                  <div 
                    key={client.id}
                    className={`flex items-center justify-between p-2 rounded-sm border text-[11px] border-l-[3.5px] border-l-red-500 ${
                      theme === 'dark' 
                        ? 'bg-[#141414] border-[#262626] hover:border-zinc-800' 
                        : 'bg-red-50/20 border-red-100 hover:bg-red-50/40'
                    }`}
                  >
                    <div className="truncate pr-1">
                      <p className="font-bold text-zinc-250 dark:text-zinc-100 truncate">
                        {client.name}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono mt-0.5 mt-0">
                        {client.city} • Responsável: {client.responsible}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleQuickResolvePayment(client, e)}
                      id={`pay-btn-${client.id}`}
                      className="px-2 py-0.5 bg-[#D35400]/15 border border-[#D35400]/40 text-[#D35400] text-[10px] font-bold rounded-sm hover:bg-[#D35400] hover:text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-zinc-850">
            <button
              onClick={() => setActiveTab('clientes')}
              id="dashboard-goto-clients-btn"
              className="w-full py-1.5 bg-[#141414] hover:bg-zinc-900 border border-[#242424] text-[11px] font-bold uppercase tracking-wider text-zinc-300 rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Faturamento Completo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
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
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="p-1 hover:bg-[#D35400]/10 text-[#D35400] rounded transition-colors text-xs font-bold flex items-center gap-0.5 cursor-pointer border border-[#D35400]/20"
                title="Adicionar Objetivo"
              >
                <Plus className="w-3 h-3" /> <span className="text-[8.5px] uppercase">Novo</span>
              </button>
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
                  onClick={() => handleToggleObjective(obj.id, obj.task)}
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
                  <button
                    type="button"
                    onClick={(e) => handleDeleteObjective(obj.id, e)}
                    className="p-1 hover:text-red-500 text-zinc-600 dark:text-zinc-550 rounded transition-colors self-center cursor-pointer"
                    title="Apagar objetivo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
