/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AGRESTE_DB } from '../services/db';
import { SystemUserDetail } from '../types';
import { 
  Users, UserCheck, UserX, Clock, ShieldAlert, CheckCircle2, 
  Trash2, Search, Filter, ShieldCheck, UserMinus, KeyRound 
} from 'lucide-react';

interface UsersTabProps {
  theme: 'light' | 'dark';
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
}

export default function UsersTab({ theme, showToast, onRefreshData }: UsersTabProps) {
  const [usersDict, setUsersDict] = useState<Record<string, SystemUserDetail>>(() => AGRESTE_DB.getUserDetails());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');
  
  const refreshUsers = () => {
    const updated = AGRESTE_DB.getUserDetails();
    setUsersDict(updated);
    onRefreshData();
  };

  const usersList = (Object.values(usersDict) as SystemUserDetail[]).filter(u => u.username !== 'gil silva');

  // Filter logic
  const filteredUsers = usersList.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && user.status === statusFilter;
  });

  const activeCount = usersList.filter(u => u.status === 'approved').length;
  const pendingCount = usersList.filter(u => u.status === 'pending').length;
  const blockedCount = usersList.filter(u => u.status === 'blocked').length;
  const maxLicenses = AGRESTE_DB.getLicensesLimit();

  const handleApprove = (username: string) => {
    const currentActive = (Object.values(usersDict) as SystemUserDetail[]).filter(u => u.status === 'approved' && u.username !== 'gil silva').length;
    const limit = AGRESTE_DB.getLicensesLimit();

    if (currentActive >= limit) {
      showToast(`Limite de licenças atingido (${limit} acessos). Aumente o limite na aba Configurações.`, 'error');
      return;
    }

    const updated = { ...usersDict };
    if (updated[username]) {
      updated[username].status = 'approved';
      AGRESTE_DB.saveUserDetails(updated);
      showToast(`Acesso do usuário '${updated[username].name}' liberado com sucesso.`, 'success');
      refreshUsers();
    }
  };

  const handleBlock = (username: string) => {
    const updated = { ...usersDict };
    if (updated[username]) {
      updated[username].status = 'blocked';
      AGRESTE_DB.saveUserDetails(updated);
      showToast(`Acesso do usuário '${updated[username].name}' foi bloqueado.`, 'info');
      refreshUsers();
    }
  };

  const handleUnblock = (username: string) => {
    const updated = { ...usersDict };
    if (updated[username]) {
      updated[username].status = 'approved';
      AGRESTE_DB.saveUserDetails(updated);
      showToast(`Acesso do usuário '${updated[username].name}' reativado.`, 'success');
      refreshUsers();
    }
  };

  const handleDelete = (username: string) => {
    if (confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${username}?`)) {
      const updatedDetails = { ...usersDict };
      delete updatedDetails[username];
      AGRESTE_DB.saveUserDetails(updatedDetails);

      // Also delete from credential dictionary
      const credentials = AGRESTE_DB.getUsers();
      delete credentials[username];
      // Save updated credentials
      localStorage.setItem('agreste_users', JSON.stringify(credentials));
      
      showToast(`Cadastro de '${username}' excluído com sucesso.`, 'success');
      refreshUsers();
    }
  };

  const handleUpdatePaymentValue = (username: string, value: number) => {
    const updated = { ...usersDict };
    if (updated[username]) {
      updated[username].paymentValue = value;
      AGRESTE_DB.saveUserDetails(updated);
      refreshUsers();
    }
  };

  return (
    <div className="space-y-6" id="users-tab-container">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900/10 dark:border-zinc-800/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight">Solicitações & Controle de Usuários</h2>
          <p className="text-xs text-zinc-500 font-medium">Libere novos cadastros do sistema e consulte as licenças em andamento.</p>
        </div>
        
        {/* Licensing Progress Overview */}
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-[#18181A] border-zinc-850' : 'bg-white border-zinc-200'
        } flex items-center gap-4 shadow-sm`}>
          <div className="w-10 h-10 rounded-xl bg-orange-600/15 flex items-center justify-center text-orange-500 font-bold">
            {activeCount}/{maxLicenses}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Licenças Consumidas</div>
            <div className="w-32 bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
              <div 
                className="bg-orange-500 h-1.5 transition-all duration-300"
                style={{ width: `${Math.min(100, (activeCount / maxLicenses) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border text-left flex items-center justify-between ${
          theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-250 shadow-sm'
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Usuários Ativos</span>
            <span className="text-3xl font-extrabold font-mono text-emerald-500 mt-1 block">
              {String(activeCount).padStart(2, '0')}
            </span>
          </div>
          <UserCheck className="w-8 h-8 text-emerald-500/25" />
        </div>

        <div className={`p-4 rounded-2xl border text-left flex items-center justify-between ${
          theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-250 shadow-sm'
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Solitações Pendentes</span>
            <span className={`text-3xl font-extrabold font-mono mt-1 block ${pendingCount > 0 ? 'text-amber-500 animate-pulse' : 'text-zinc-500'}`}>
              {String(pendingCount).padStart(2, '0')}
            </span>
          </div>
          <Clock className="w-8 h-8 text-amber-500/25" />
        </div>

        <div className={`p-4 rounded-2xl border text-left flex items-center justify-between ${
          theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-250 shadow-sm'
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Bloqueados</span>
            <span className="text-3xl font-extrabold font-mono text-neutral-500 mt-1 block">
              {String(blockedCount).padStart(2, '0')}
            </span>
          </div>
          <ShieldAlert className="w-8 h-8 text-red-500/15" />
        </div>
      </div>

      {/* Filter and Search Bar controls */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center justify-between ${
        theme === 'dark' ? 'bg-[#151515] border-zinc-900' : 'bg-white border-zinc-200'
      }`}>
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome..."
            id="search-user-input"
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border transition-all ${
              theme === 'dark' 
                ? 'bg-zinc-950 border-zinc-800 text-white focus:border-orange-500' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-orange-500'
            }`}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {(['all', 'pending', 'approved', 'blocked'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              id={`filter-btn-${filter}`}
              className={`flex-1 md:flex-none px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-orange-600 border-orange-500 text-white'
                  : theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {filter === 'all' && 'Todos'}
              {filter === 'pending' && `Pendentes (${pendingCount})`}
              {filter === 'approved' && `Ativos (${activeCount})`}
              {filter === 'blocked' && `Bloqueados (${blockedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* User listings */}
      <div className="space-y-3" id="users-list-wrapper">
        {filteredUsers.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border ${
            theme === 'dark' ? 'bg-zinc-950/20 border-zinc-900' : 'bg-zinc-50 border-zinc-250'
          }`}>
            <Users className="w-10 h-10 text-zinc-500 mx-auto opacity-40 mb-3" />
            <p className="text-sm font-semibold text-zinc-400">Nenhum operador encontrado com o filtro atual.</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            return (
              <div
                key={user.username}
                id={`user-card-${user.username}`}
                className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all ${
                  theme === 'dark' 
                    ? 'bg-[#151515] hover:bg-zinc-900/60 border-zinc-900' 
                    : 'bg-white hover:bg-zinc-100/40 border-zinc-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-orange-600/10 flex items-center justify-center text-orange-500 font-bold uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100">{user.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-zinc-500">@{user.username}</span>
                      <span className="text-[10px] text-zinc-400">•</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase">
                        <span>Licença:</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-zinc-500 text-[10px] font-normal font-mono">R$</span>
                          <input
                            type="number"
                            min="0"
                            value={user.paymentValue !== undefined ? user.paymentValue : 150}
                            onChange={(e) => handleUpdatePaymentValue(user.username, Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 font-mono text-orange-500 bg-zinc-950/40 border border-zinc-800 rounded outline-none text-right focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges / Controls status bar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Status label badge */}
                  {user.status === 'pending' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Pendente Aprovação
                    </span>
                  )}
                  {user.status === 'approved' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/15">
                      Aprovado / Ativo
                    </span>
                  )}
                  {user.status === 'blocked' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/15">
                      Bloqueado
                    </span>
                  )}

                  {/* Payment status badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    user.paymentStatus === 'pago'
                      ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/10'
                      : 'bg-amber-600/15 text-amber-400 border-amber-500/15 animate-pulse'
                  }`}>
                    Assinatura: {user.paymentStatus === 'pago' ? 'PAGO' : 'PENDENTE'}
                  </span>
                </div>

                {/* Operations buttons */}
                <div className="flex items-center justify-end gap-2 border-t md:border-t-0 border-zinc-900/10 dark:border-zinc-800/40 pt-3 md:pt-0">
                  {user.status === 'pending' && (
                    <button
                      onClick={() => handleApprove(user.username)}
                      id={`approve-user-btn-${user.username}`}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 mr-auto md:mr-0 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Liberar Cadastro
                    </button>
                  )}

                  {user.status === 'approved' && (
                    <button
                      onClick={() => handleBlock(user.username)}
                      id={`block-user-btn-${user.username}`}
                      className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-red-400 border border-zinc-850 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Bloquear
                    </button>
                  )}

                  {user.status === 'blocked' && (
                    <button
                      onClick={() => handleUnblock(user.username)}
                      id={`unblock-user-btn-${user.username}`}
                      className="px-3.5 py-1.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Reativar
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(user.username)}
                    id={`delete-user-btn-${user.username}`}
                    className="p-1.5 hover:bg-red-500/10 hover:border-red-500/20 text-zinc-500 hover:text-red-500 rounded-lg transition-colors cursor-pointer border border-transparent"
                    title="Excluir cadastro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
