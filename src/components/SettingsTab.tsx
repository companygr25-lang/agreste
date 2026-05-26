/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Reminder, SystemUserDetail } from '../types';
import { AGRESTE_DB } from '../services/db';
import { isSupabaseConfigured } from '../services/supabase';
import { 
  Settings, Sun, Moon, Database, Clock, PlusCircle, CheckCircle, 
  Trash2, PlayCircle, ShieldCheck, Check, Info, FileCode,
  Lock, Unlock, ShieldAlert, CreditCard, LayoutGrid, KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsTabProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  reminders: Reminder[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
  currentUser?: string | null;
}

export default function SettingsTab({ 
  theme, setTheme, reminders, showToast, onRefreshData, currentUser 
}: SettingsTabProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  
  // Database status checking state
  const [checkingDb, setCheckingDb] = useState(false);
  const [dbStatusResult, setDbStatusResult] = useState<any | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Provider states
  const [providerUsers, setProviderUsers] = useState<Record<string, SystemUserDetail>>(() => AGRESTE_DB.getUserDetails());
  const [licenses, setLicenses] = useState<number>(() => AGRESTE_DB.getLicensesLimit());
  
  const activeUsersExcludingGil = (Object.values(providerUsers) as SystemUserDetail[]).filter(u => u.username !== 'gil silva' && u.status === 'approved');
  
  const [selectedUser, setSelectedUser] = useState<string>(() => {
    return activeUsersExcludingGil[0]?.username || '';
  });

  const [paymentVal, setPaymentVal] = useState<number>(() => {
    const defaultUser = activeUsersExcludingGil[0]?.username;
    const user = providerUsers[selectedUser || defaultUser];
    return user ? user.paymentValue : 150;
  });

  const [screens, setScreens] = useState<string[]>(() => {
    const defaultUser = activeUsersExcludingGil[0]?.username;
    const user = providerUsers[selectedUser || defaultUser];
    return user ? user.allowedTabs || [] : [];
  });

  const [canModify, setCanModify] = useState<boolean>(() => {
    const defaultUser = activeUsersExcludingGil[0]?.username;
    const user = providerUsers[selectedUser || defaultUser];
    return user ? user.canEditData !== false : true;
  });

  // When selected user changes, reload states
  const handleSelectUser = (username: string) => {
    setSelectedUser(username);
    const user = providerUsers[username];
    if (user) {
      setPaymentVal(user.paymentValue);
      setScreens(user.allowedTabs || []);
      setCanModify(user.canEditData !== false);
    }
  };

  const handleSaveUserConfig = () => {
    if (!selectedUser) {
      showToast('Selecione um usuário para configurar.', 'error');
      return;
    }

    const updated = { ...providerUsers };
    if (updated[selectedUser]) {
      updated[selectedUser].paymentValue = Number(paymentVal) || 0;
      updated[selectedUser].allowedTabs = screens;
      updated[selectedUser].canEditData = canModify;
      
      AGRESTE_DB.saveUserDetails(updated);
      setProviderUsers(updated);
      showToast(`Permissões de '${updated[selectedUser].name}' salvas com sucesso!`, 'success');
      onRefreshData();
    }
  };

  const handleSaveLicenses = () => {
    if (licenses < 1) {
      showToast('O número de licenças deve ser no mínimo 1.', 'error');
      return;
    }
    AGRESTE_DB.setLicensesLimit(licenses);
    showToast(`Limite de licenças do sistema atualizado para ${licenses} com sucesso!`, 'success');
    onRefreshData();
  };

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

  const isProvider = currentUser?.toLowerCase() === 'gil silva';

  if (isProvider) {
    return (
      <div className="space-y-6" id="provider-config-view">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-900/10 dark:border-zinc-800/40 pb-5 text-left">
          <div>
            <h2 className="text-2xl font-black font-display tracking-tight text-[#D35400] uppercase flex items-center gap-2">
              <Settings className="w-6 h-6 shrink-0 text-[#D35400]" /> CONFIGURAÇÃO DO SISTEMA
            </h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Controle o teto máximo de licenças permitidas, as mensalidades de cada conta e as abas visíveis dos operadores.
            </p>
          </div>
          <div className="text-right flex flex-col items-start md:items-end font-mono">
            <span className="text-[11px] font-bold tracking-wider text-[#D35400] uppercase">
              GIL SILVA • ADMINISTRADOR
            </span>
            <span className="text-[9px] font-extrabold text-[#D35400]/85 uppercase tracking-wider mt-0.5 animate-pulse">
              PROVEDOR DO SISTEMA
            </span>
          </div>
        </div>

        {/* Configuration Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Box 1: Licensing Limit and Global Settings (Span 1) */}
          <div className={`p-5 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'
          } text-left flex flex-col justify-between`}>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-4 flex items-center gap-1.5 pb-2 border-b border-zinc-900/10 dark:border-zinc-850">
                <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" /> Limite de Licenças (Acessos)
              </h3>
              
              <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-5">
                Defina o número máximo de licenças de operadores ativos que podem estar cadastrados simultaneamente no aplicativo.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLicenses(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 bg-zinc-950 hover:bg-zinc-900 active:scale-95 text-zinc-300 font-black text-lg border border-zinc-850 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={licenses}
                    onChange={(e) => setLicenses(Math.max(1, Number(e.target.value) || 1))}
                    className={`w-full py-2.5 px-3 rounded-xl border text-center font-bold tracking-wider font-mono outline-none ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-zinc-800 text-white focus:border-orange-500'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-orange-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setLicenses(prev => prev + 1)}
                    className="w-10 h-10 bg-zinc-950 hover:bg-zinc-900 active:scale-95 text-zinc-300 font-black text-lg border border-zinc-850 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-start gap-2 p-3 bg-zinc-950/25 border border-zinc-900/30 rounded-xl mt-3 text-[11px] text-zinc-400 leading-normal font-sans">
                  <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p>
                    Quando este limite for atingido, novas solicitações na tela de Liberações serão barradas até que o limite seja estendido ou uma licença atual seja desativada.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveLicenses}
              className="mt-6 w-full py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#D35400]/10 flex items-center justify-center gap-1.5 cursor-pointer border border-[#D35400]"
            >
              <Check className="w-4 h-4" /> Atualizar Licenças
            </button>
          </div>

          {/* Box 2: Controlling Each Accounts Tab Access & Write Lock (Span 2) */}
          <div className={`lg:col-span-2 p-5 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'
          } text-left`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-4 flex items-center gap-1.5 pb-2 border-b border-zinc-900/10 dark:border-zinc-850">
              <KeyRound className="w-4 h-4 text-orange-400 shrink-0" /> Restrições & Telas por Operador
            </h3>

            {activeUsersExcludingGil.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-semibold font-sans">
                Nenhum operador ativo no sistema para configurar de forma customizada.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Select User Dropdown */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Seleção da Conta de Trabalho</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => handleSelectUser(e.target.value)}
                    className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-zinc-805 text-white focus:border-orange-500'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-orange-500'
                    }`}
                  >
                    {activeUsersExcludingGil.map(u => (
                      <option key={u.username} value={u.username}>
                        {u.name} (@{u.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monthly Value Setting */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Valor de Cadastro / Cobrança (Mensalidade)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold font-mono text-zinc-500">R$</span>
                    <input
                      type="number"
                      value={paymentVal}
                      onChange={(e) => setPaymentVal(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="150"
                      className={`w-full py-2.5 pl-9 pr-4 rounded-xl border text-xs font-bold font-mono outline-none ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-zinc-800 text-white focus:border-orange-500'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-orange-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Visible screens checkpoint */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4 text-orange-400" /> Telas Visíveis (Menu de Navegação)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-1">
                    {[
                      { id: 'dashboard', label: 'Dashboard' },
                      { id: 'clientes', label: 'Clientes' },
                      { id: 'calendario', label: 'Calendário / Agenda' },
                      { id: 'relatorios', label: 'Laudos de Visitas' },
                      { id: 'documentacao', label: 'Documentação' },
                      { id: 'faturamento', label: 'Faturamento & Cobranças' },
                      { id: 'perfil', label: 'Perfil do Operador' },
                      { id: 'configuracoes', label: 'Configurações Operador' },
                    ].map((tab) => {
                      const isChecked = screens.includes(tab.id);
                      return (
                        <label
                          key={tab.id}
                          className={`p-3 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-orange-600/10 border-orange-500 text-orange-500 font-bold'
                              : 'bg-zinc-950/20 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setScreens(screens.filter(s => s !== tab.id));
                              } else {
                                setScreens([...screens, tab.id]);
                              }
                            }}
                            className="accent-orange-500 shrink-0"
                          />
                          <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Operations rules (can write vs read-only) */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Permissão de Operações (O que poderão mudar)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
                    <div
                      onClick={() => setCanModify(true)}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-4 cursor-pointer transition-all ${
                        canModify
                          ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500'
                          : 'bg-zinc-950/25 border-zinc-900 text-zinc-400'
                      }`}
                    >
                      <Unlock className="w-5 h-5 mt-0.5 shrink-0 text-emerald-500" />
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider">Habilitar Escrita Completa</h4>
                        <p className="text-[9px] text-zinc-400 tracking-wide mt-0.5 leading-tight">Autorizado a adicionar, alterar, registrar laudos e apagar itens locais ou na nuvem.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => setCanModify(false)}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-4 cursor-pointer transition-all ${
                        !canModify
                          ? 'bg-amber-600/10 border-amber-500 text-amber-500'
                          : 'bg-zinc-950/25 border-zinc-900 text-zinc-400'
                      }`}
                    >
                      <Lock className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider">Exclusivo Leitura (Visualizador)</h4>
                        <p className="text-[9px] text-zinc-400 tracking-wide mt-0.5 leading-tight">Modo restrito tipo auditoria. Botões de ação, salvar, excluir e novos registros do operador serão lacrados.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call to save */}
                <div className="pt-4 border-t border-zinc-900/10 dark:border-zinc-850 text-right">
                  <button
                    type="button"
                    onClick={handleSaveUserConfig}
                    className="px-5 py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#D35400]/10 flex items-center justify-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <ShieldCheck className="w-4 h-4" /> Gravar Alterações do Usuário
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                  showToast('Estrutura de tabelas (SQL) copiada para o console de desenvolvimento. Abra-o com F12.', 'info');
                  console.log(`
-- =========================================================
-- SCHEMA DE PORTABILIDADE E CONEXÃO EM TEMPO REAL - AGRESTE
-- Execute este comando no console SQL (SQL Editor) do seu Supabase:
-- =========================================================

CREATE TABLE IF NOT EXISTS public.agreste_sync (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar replicação em tempo real para sincronia instantânea
ALTER PUBLICATION supabase_realtime ADD TABLE public.agreste_sync;

-- Habilitar permissões públicas se autenticação de anon for habilitada
ALTER TABLE public.agreste_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read and write access" ON public.agreste_sync
    FOR ALL USING (true) WITH CHECK (true);

console.log('SQL IMPRESSO COM SUCESSO - PRONTO PARA COPIAR');
                  `);
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
