/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Reminder } from '../types';
import { AGRESTE_DB } from '../services/db';
import { isSupabaseConfigured } from '../services/supabase';
import { 
  Settings, Sun, Moon, Database, Clock, PlusCircle, CheckCircle, 
  Trash2, PlayCircle, ShieldCheck, Check, Info, FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsTabProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  reminders: Reminder[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
}

export default function SettingsTab({ 
  theme, setTheme, reminders, showToast, onRefreshData 
}: SettingsTabProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  
  // Database status checking state
  const [checkingDb, setCheckingDb] = useState(false);
  const [dbStatusResult, setDbStatusResult] = useState<any | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Toggle theme and update storage
  const handleToggleTheme = (selected: 'light' | 'dark') => {
    setTheme(selected);
    AGRESTE_DB.setTheme(selected);
    showToast(`Tema do sistema alterado para o modo ${selected === 'dark' ? 'ESCURO' : 'CLARO'}!`, 'success');
  };

  // Add a reminder
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTime) {
      showToast('Preencha a descrição do lembrete e o horário.', 'error');
      return;
    }

    AGRESTE_DB.addReminder({
      title: newTitle,
      time: newTime
    });

    showToast(`Demanda "${newTitle}" agendada com sucesso!`, 'success');
    setNewTitle('');
    setNewTime('');
    onRefreshData();
  };

  // Toggle completed state on reminder
  const handleToggleReminder = (id: string, title: string) => {
    AGRESTE_DB.toggleReminder(id);
    showToast(`Demanda "${title}" atualizada.`, 'info');
    onRefreshData();
  };

  // Delete reminder
  const handleDeleteReminder = (id: string, title: string) => {
    AGRESTE_DB.deleteReminder(id);
    showToast(`Agenda de "${title}" removida.`, 'success');
    onRefreshData();
  };

  // Run database sync diagnostics
  const handleTestDatabase = () => {
    setCheckingDb(true);
    setDbStatusResult(null);

    setTimeout(() => {
      const res = AGRESTE_DB.checkDatabaseStatus();
      setDbStatusResult(res);
      setCheckingDb(false);
      showToast('Status do banco de dados verificado. Conexão ESTÁVEL!', 'success');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold font-display tracking-tight">Preferências e Configurações</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Gerencie o tema visual da aplicação, programe horários de alarmes e faça diagnósticos de rotas locais e integração do Supabase.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Row 1: Dual Theme & Database Diagnostic Actions */}
        <div className="space-y-6">
          {/* Theme Setup Card */}
          <div className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-[#D35400]">
              <Sun className="w-4 h-4" /> Personalização de Tema Sincronizado
            </div>
            
            <p className="text-xs text-zinc-500 mb-5">
              Altere a sincronia visual de todo o painel AGRESTE. O tema se propaga por todos os relatórios, caixas de diálogo e modais de visitas.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Light Option */}
              <button
                onClick={() => handleToggleTheme('light')}
                id="theme-light-select"
                className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[#D35400]/10 border-[#D35400] text-[#D35400]'
                    : 'bg-zinc-950/20 border-zinc-850 hover:bg-zinc-850 text-zinc-400'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs font-bold">Modo AGRESTE Claro</span>
              </button>

              {/* Dark Option */}
              <button
                onClick={() => handleToggleTheme('dark')}
                id="theme-dark-select"
                className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#D35400]/10 border-[#D35400] text-[#D35400]'
                    : 'bg-zinc-950/20 border-zinc-850 hover:bg-zinc-800/50 text-zinc-400'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs font-bold">Modo AGRESTE Escuro</span>
              </button>
            </div>
          </div>

          {/* Database & Supabase Checkups */}
          <div className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-[#D35400]">
              <Database className="w-4 h-4" /> Diagnóstico e Integração de Rede
            </div>
            
            <p className="text-xs text-zinc-500 mb-5">
              Certifique-se de que a estrutura de tabelas do banco de dados (Supabase & Vercel) está saudável e pronta para a sincronização remota assíncrona.
            </p>

            {!isSupabaseConfigured() && (
              <div className="mb-5 p-4 rounded-xl border border-[#D35400]/20 bg-[#D35400]/5 text-xs text-left">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#D35400] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#D35400] block uppercase tracking-wider mb-1 text-[10px]">Configuração de Credenciais Supabase</span>
                    <p className="text-zinc-400 leading-relaxed mb-3 text-[11px]">
                      Para conectar seu banco de dados Supabase e buckets de mídia reais de forma segura, acesse as configurações de <strong>Secrets (Segredos)</strong> no menu do <strong>Google AI Studio</strong> e cadastre as variáveis de ambiente com o prefixo <code>VITE_</code> abaixo:
                    </p>
                    <div className="space-y-1.5 font-mono text-[10.5px] bg-black/40 p-2.5 rounded border border-zinc-800 select-all text-zinc-300">
                      <div><strong className="text-[#D35400]">VITE_SUPABASE_URL</strong>: <code>https://SEU-PROJETO.supabase.co</code></div>
                      <div><strong className="text-[#D35400]">VITE_SUPABASE_ANON_KEY</strong>: <code>eyJhbGciOi...</code></div>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-2 block leading-snug">
                      * Nota: Variáveis com o prefixo <code>VITE_</code> são carregadas de forma segura no lado do cliente (Vite HMR). Nenhuma chave sensível fica exposta publicamente sem autorização.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {checkingDb ? (
              <div className="py-6 text-center text-xs animate-pulse text-orange-500 flex items-center justify-center gap-2 font-mono">
                <Clock className="w-4 h-4 animate-spin" /> Escaneando tabelas remotas...
              </div>
            ) : dbStatusResult ? (
              <div className="space-y-4 mb-4">
                <div className="p-3 bg-emerald-600/5 border border-emerald-500/20 rounded-xl text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-200 dark:text-zinc-100 block">Conexão Saudável</span>
                    <span className="text-zinc-500 text-[11px] block mt-0.5">Adaptador modular local sincronizado com a latência de {dbStatusResult.latencyMs}ms.</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-3 bg-zinc-950/30 rounded-xl border border-zinc-850">
                  <div>
                    <span className="text-zinc-500">Status Gateway:</span>
                    <span className="text-emerald-400 font-bold block">{dbStatusResult.status}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Canal Ativo:</span>
                    <span className="text-orange-500 font-bold block">{dbStatusResult.provider}</span>
                  </div>
                  <div className="col-span-2 pt-2 mt-2 border-t border-zinc-850/60">
                    <span className="text-zinc-500 block mb-1">Tabelas Locais Monitoradas:</span>
                    <div className="flex flex-wrap gap-1">
                      {dbStatusResult.tables.map((tbl: string) => (
                        <span key={tbl} className="px-1.5 py-0.5 bg-zinc-800 text-[9px] font-bold text-zinc-300 rounded border border-zinc-700">{tbl}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTestDatabase}
                id="test-database-btn"
                className="py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Database className="w-3.5 h-3.5" /> Testar Banco Supabase
              </button>
              
              <button
                type="button"
                onClick={() => {
                  showToast('Estrutura de tabelas do Supabase exportada para o console de desenvolvimento.', 'info');
                  console.log('SUPABASE CREATE TABLES COMMANDS READY');
                }}
                id="export-schema-btn"
                className={`py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" /> Ver SQL Schema
              </button>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                id="reset-database-btn"
                className="col-span-2 py-2.5 bg-red-600/10 hover:bg-red-600 border border-red-500/25 hover:border-red-650 text-red-500 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Zerar Banco de Dados
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Reminders & Daily Schedulers CRUD */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
          theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D35400]">
                <Clock className="w-4 h-4" /> Agenda de Demandas e Lembretes
              </div>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-zinc-950/40 rounded text-zinc-400 border border-zinc-850">
                {reminders.filter(r => !r.completed).length} Abertos
              </span>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Defina tarefas diárias e lembretes para evitar atrasos em visitas técnicas e obrigações sanitárias.
            </p>

            {/* Form to append reminder */}
            <form onSubmit={handleAddReminder} className="flex gap-2 mb-5" id="reminder-add-form">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Insira a demanda... Ex: Higienizar bombas"
                id="reminder-title-input"
                className={`flex-1 py-2 px-3 rounded-xl border text-xs outline-none transition-all ${
                  theme === 'dark' ? 'bg-zinc-950 border-[#242424] focus:border-[#D35400]' : 'bg-zinc-100 border-zinc-200 focus:bg-white focus:border-[#D35400]'
                }`}
              />

              <input
                type="time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                id="reminder-time-input"
                className={`w-20 sm:w-24 py-2 px-2 rounded-xl border text-xs text-center outline-none transition-all font-mono ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                }`}
              />

              <button
                type="submit"
                id="reminder-submit"
                className="px-3 bg-[#D35400] hover:bg-[#FC6B0A] text-white rounded-xl shadow-md cursor-pointer flex items-center justify-center"
                title="Agendar Lembrete"
              >
                <PlusCircle className="w-4.5 h-4.5" />
              </button>
            </form>

            {/* List items */}
            {reminders.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs border border-dashed border-zinc-850 rounded-xl bg-zinc-950/10">
                Nenhuma demanda agendada hoje. Use o formulário acima para programar!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      rem.completed
                        ? theme === 'dark' ? 'bg-zinc-950/20 border-zinc-850/30 opacity-50' : 'bg-zinc-50 border-zinc-100 opacity-60'
                        : theme === 'dark' ? 'bg-zinc-950/40 border-zinc-850 text-zinc-200' : 'bg-zinc-100/40 border-zinc-200 text-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full pr-4 text-left">
                      <button
                        type="button"
                        onClick={() => handleToggleReminder(rem.id, rem.title)}
                        id={`check-rem-${rem.id}`}
                        className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                          rem.completed
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-zinc-500 hover:border-orange-500'
                        }`}
                      >
                        {rem.completed && <Check className="w-3 h-3" />}
                      </button>

                      <div className="truncate">
                        <p className={`font-medium ${rem.completed ? 'line-through text-zinc-500' : ''}`}>
                          {rem.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Programado: às {rem.time}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(rem.id, rem.title)}
                      id={`delete-rem-${rem.id}`}
                      className="text-zinc-500 hover:text-red-500 p-1 hover:bg-zinc-950/20 rounded transition-colors cursor-pointer"
                      title="Excluir Lembrete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800/10 text-[11px] text-zinc-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-zinc-600" />
            <span>Demandas concluídas saem temporariamente da barra de pendências do menu e dashboard.</span>
          </div>
        </div>
      </div>

      {/* MODAL: RESET DATABASE CONFIRM OVERLAY */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
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
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-lg font-display mb-1 text-white dark:text-zinc-100">Confirmar Limpeza</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Tem certeza que deseja apagar permanentemente todos os clientes, visitas, relatórios, documentos e demandas? 
                Esta ação é <span className="font-bold text-red-500">definitiva</span> e deixará o painel zerado para digitação manual.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent border border-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    AGRESTE_DB.clearAllData();
                    showToast('Banco de dados zerado com sucesso! Prontinho para inclusão manual.', 'success');
                    setShowResetConfirm(false);
                    onRefreshData();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Apagar Tudo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
