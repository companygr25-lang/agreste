/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AGRESTE_DB } from '../services/db';
import { SystemUserDetail } from '../types';
import { 
  Users, UserCheck, UserX, Clock, ShieldAlert, CheckCircle2, 
  Trash2, Search, Filter, ShieldCheck, UserMinus, KeyRound,
  Edit, AlertCircle, X, Check, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UsersTabProps {
  theme: 'light' | 'dark';
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
}

export default function UsersTab({ theme, showToast, onRefreshData }: UsersTabProps) {
  const [usersDict, setUsersDict] = useState<Record<string, SystemUserDetail>>(() => AGRESTE_DB.getUserDetails());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');

  // Confirmation and edit states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ username: string; name: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState<SystemUserDetail | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'blocked'>('pending');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'pago' | 'pendente'>('pendente');
  const [editPaymentValue, setEditPaymentValue] = useState<number>(150);
  const [editAllowedTabs, setEditAllowedTabs] = useState<string[]>([]);
  const [editCargo, setEditCargo] = useState<'técnico' | 'gerente' | 'supervisor de operações'>('técnico');
  const [editCanEditData, setEditCanEditData] = useState<boolean>(true);
  const [showEditConfirm, setShowEditConfirm] = useState<{ original: SystemUserDetail; updated: SystemUserDetail; newPassword?: string } | null>(null);

  // Add Operator States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCargo, setNewCargo] = useState<'técnico' | 'gerente' | 'supervisor de operações'>('técnico');
  const [newStatus, setNewStatus] = useState<'pending' | 'approved' | 'blocked'>('approved');
  const [newPaymentStatus, setNewPaymentStatus] = useState<'pago' | 'pendente'>('pago');
  const [newPaymentValue, setNewPaymentValue] = useState<number>(150);
  const [newAllowedTabs, setNewAllowedTabs] = useState<string[]>([
    'dashboard', 'clientes', 'calendario', 'relatorios', 'documentacao', 'perfil', 'configuracoes'
  ]);
  const [newCanEditData, setNewCanEditData] = useState<boolean>(true);

  const handleToggleNewTabPermission = (tabId: string) => {
    setNewAllowedTabs(prev => 
      prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
    );
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    const normalized = newUsername.toLowerCase().trim();

    // Check if user already exists
    const users = AGRESTE_DB.getUsers();
    if (users[normalized] || normalized === 'gil silva') {
      showToast('Este nome de usuário já está cadastrado no sistema.', 'error');
      return;
    }

    // Check if adding this user would exceed the licenses limit (if approved)
    if (newStatus === 'approved') {
      const currentActive = (Object.values(usersDict) as SystemUserDetail[]).filter(u => u.status === 'approved' && u.username !== 'gil silva').length;
      const limit = AGRESTE_DB.getLicensesLimit();
      if (currentActive >= limit) {
        showToast(`Limite de licenças atingido (${limit} acessos). Aumente o limite na aba Configurações ou salve este usuário como Pendente/Bloqueado.`, 'error');
        return;
      }
    }

    // Save user credentials password
    users[normalized] = newPassword;
    AGRESTE_DB.saveUsers(users);

    // Save user details
    const details = AGRESTE_DB.getUserDetails();
    details[normalized] = {
      username: normalized,
      name: newName.trim(),
      status: newStatus,
      paymentStatus: newPaymentStatus,
      paymentValue: newPaymentValue,
      allowedTabs: newAllowedTabs,
      cargo: newCargo,
      canEditData: newCanEditData,
      allowedDevices: []
    };
    AGRESTE_DB.saveUserDetails(details);

    showToast(`Operador "${newName.trim()}" adicionado com sucesso!`, 'success');
    
    // Reset states
    setShowAddModal(false);
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewCargo('técnico');
    setNewStatus('approved');
    setNewPaymentStatus('pago');
    setNewPaymentValue(150);
    setNewAllowedTabs([
      'dashboard', 'clientes', 'calendario', 'relatorios', 'documentacao', 'perfil', 'configuracoes'
    ]);
    setNewCanEditData(true);

    refreshUsers();
  };
  
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

  const handleDelete = (username: string, name: string) => {
    setShowDeleteConfirm({ username, name });
  };

  const handleConfirmDelete = () => {
    if (!showDeleteConfirm) return;
    const { username } = showDeleteConfirm;

    const updatedDetails = { ...usersDict };
    delete updatedDetails[username];
    AGRESTE_DB.saveUserDetails(updatedDetails);

    // Also delete from credential dictionary
    const credentials = AGRESTE_DB.getUsers();
    delete credentials[username];
    // Save updated credentials
    AGRESTE_DB.saveUsers(credentials);
    
    showToast(`Cadastro de '${username}' excluído com sucesso.`, 'success');
    setShowDeleteConfirm(null);
    refreshUsers();
  };

  // User editing actions
  const openEditModal = (user: SystemUserDetail) => {
    setShowEditModal(user);
    setEditName(user.name);
    
    const credentials = AGRESTE_DB.getUsers();
    setEditPassword(credentials[user.username] || '');

    setEditStatus(user.status);
    setEditPaymentStatus(user.paymentStatus);
    setEditPaymentValue(user.paymentValue);
    setEditAllowedTabs(user.allowedTabs || []);
    setEditCargo(user.cargo || 'técnico');
    setEditCanEditData(user.canEditData !== false);
  };

  const handleToggleTabPermission = (tabId: string) => {
    setEditAllowedTabs(prev => 
      prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    if (!editName.trim()) {
      showToast('Por favor, defina um nome.', 'error');
      return;
    }

    const updatedUser: SystemUserDetail = {
      ...showEditModal,
      name: editName.trim(),
      status: editStatus,
      paymentStatus: editPaymentStatus,
      paymentValue: editPaymentValue,
      allowedTabs: editAllowedTabs,
      cargo: editCargo,
      canEditData: editCanEditData
    };

    setShowEditConfirm({
      original: showEditModal,
      updated: updatedUser,
      newPassword: editPassword
    });
  };

  const handleConfirmEditSave = () => {
    if (!showEditConfirm) return;
    const { updated, newPassword } = showEditConfirm;
    const { username } = updated;

    // 1. Save user properties
    const updatedDetails = { ...usersDict };
    updatedDetails[username] = updated;
    AGRESTE_DB.saveUserDetails(updatedDetails);

    // 2. Save user credentials password
    if (newPassword) {
      const credentials = AGRESTE_DB.getUsers();
      credentials[username] = newPassword;
      AGRESTE_DB.saveUsers(credentials);
    }

    showToast(`Usuário "${updated.name}" atualizado com sucesso!`, 'success');
    setShowEditConfirm(null);
    setShowEditModal(null);
    refreshUsers();
  };

  const handleUpdatePaymentValue = (username: string, value: number) => {
    const updated = { ...usersDict };
    if (updated[username]) {
      updated[username].paymentValue = value;
      AGRESTE_DB.saveUserDetails(updated);
      refreshUsers();
    }
  };

  const handleResetDevices = (username: string) => {
    const updated = { ...usersDict };
    if (updated[username]) {
      updated[username].allowedDevices = [];
      AGRESTE_DB.saveUserDetails(updated);
      showToast(`Aparelhos autorizados de "${updated[username].name}" limpos com sucesso.`, 'success');
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
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            id="add-user-btn"
            className="px-4 py-3 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-xs font-bold uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md border border-[#FC6B0A]/10 hover:shadow-orange-500/10"
          >
            <UserPlus className="w-4 h-4" /> Adicionar Operador
          </button>

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
                    <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                      {user.name}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider bg-orange-600/10 text-orange-500 border border-orange-600/20">
                        {user.cargo || 'técnico'}
                      </span>
                    </h4>
                    <div className="flex flex-col gap-1.5 mt-1.5">
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

                      <div className="flex items-center gap-2.5 mt-0.5">
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase bg-zinc-950/20 px-2 py-0.5 rounded-md border border-zinc-900/10 dark:border-zinc-800/40">
                          <span>Aparelhos:</span>
                          <span className="text-[#FC6B0A] font-mono">{(user.allowedDevices || []).length}</span>
                        </div>
                        {(user.allowedDevices || []).length > 0 && (
                          <button
                            onClick={() => handleResetDevices(user.username)}
                            className="text-[9px] px-2 py-0.5 rounded-md bg-red-600/15 border border-red-500/20 text-red-500 hover:bg-red-500/25 transition-all font-semibold uppercase tracking-wider cursor-pointer"
                          >
                            Resetar Aparelhos
                          </button>
                        )}
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
                    onClick={() => openEditModal(user)}
                    id={`edit-user-btn-${user.username}`}
                    className="p-1.5 hover:bg-orange-500/10 hover:border-orange-500/20 text-zinc-500 hover:text-orange-500 rounded-lg transition-colors cursor-pointer border border-transparent"
                    title="Editar operador"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(user.username, user.name)}
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

      {/* MODAL 1: DELETE USER CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl z-10 text-center ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-red-500/30 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="mx-auto w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h2 className="font-bold text-lg font-display mb-1">Deseja excluir operador?</h2>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Você está prestes a excluir permanentemente o cadastro de <span className="font-bold text-red-400">"{showDeleteConfirm.name}"</span> (@{showDeleteConfirm.username}). Esta ação é irreversível e revogará imediatamente o acesso deste operador ao sistema.
              </p>

              <div className="grid grid-cols-2 gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  id="confirm-delete-user-btn"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT USER MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(null)}
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
              <div className="flex justify-between items-center mb-5">
                <div className="text-left">
                  <h3 className="text-lg font-bold font-display">Editar Dados do Operador</h3>
                  <p className="text-[10px] text-zinc-500">Ajuste credenciais, mensalidade e permissões de acesso de @{showEditModal.username}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Adriano Senna"
                    className={`w-full py-2 px-3.5 rounded-xl border text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                    }`}
                  />
                </div>

                {/* Password Change */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Senha de Acesso *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <KeyRound className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Redefinir senha..."
                      className={`w-full py-2 pl-9 pr-3.5 rounded-xl border text-xs outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>
                </div>

                {/* Numeric Licença Value and Status Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                      Licença Cadastrada (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editPaymentValue}
                      onChange={(e) => setEditPaymentValue(Number(e.target.value))}
                      className={`w-full py-2 px-3.5 rounded-xl border text-xs outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                      Situação de Acesso *
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className={`w-full py-2 px-3 rounded-xl border text-xs outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                          : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400]'
                      }`}
                    >
                      <option value="approved">Aprovado / Ativo</option>
                      <option value="pending">Pendente Liberação</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </div>
                </div>

                {/* Faturamento Financeiro */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Status Faturamento Financeiro *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPaymentStatus('pago')}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer ${
                        editPaymentStatus === 'pago'
                          ? 'bg-emerald-600/10 border-emerald-600 text-emerald-400'
                          : theme === 'dark' ? 'bg-zinc-950/20 border-[#242424] text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}
                    >
                      Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaymentStatus('pendente')}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer ${
                        editPaymentStatus === 'pendente'
                          ? 'bg-red-600/10 border-red-600 text-red-500'
                          : theme === 'dark' ? 'bg-zinc-950/20 border-[#242424] text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}
                    >
                      Pendente
                    </button>
                  </div>
                </div>

                {/* Função / Cargo Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Função / Cargo Operacional *
                  </label>
                  <select
                    value={editCargo}
                    onChange={(e) => setEditCargo(e.target.value as any)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                        : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400]'
                    }`}
                  >
                    <option value="técnico">Técnico</option>
                    <option value="gerente">Gerente</option>
                    <option value="supervisor de operações">Supervisor de Operações</option>
                  </select>
                </div>

                {/* Permissão de Edição */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Nível de Permissão / Edição *
                  </label>
                  <select
                    value={editCanEditData ? 'completo' : 'visualizacao'}
                    onChange={(e) => setEditCanEditData(e.target.value === 'completo')}
                    className={`w-full py-2 px-3 rounded-xl border text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                        : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400]'
                    }`}
                  >
                    <option value="completo">Acesso Completo (Pode criar, editar e excluir)</option>
                    <option value="visualizacao">Visualização Apenas (Não pode alterar nada)</option>
                  </select>
                </div>

                {/* Permissions checkboxes (Allowed tabs) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Telas e Permissões do Sistema
                  </label>
                  <div className={`p-3 rounded-xl border text-left max-h-[140px] overflow-y-auto ${
                    theme === 'dark' ? 'bg-zinc-950 border-[#242424]' : 'bg-zinc-50 border-zinc-200'
                  } space-y-1.5 scrollbar-thin`}>
                    {[
                      { id: 'dashboard', label: 'Painel Geral (Dashboard)' },
                      { id: 'clientes', label: 'Gestão de Clientes' },
                      { id: 'calendario', label: 'Calendário de Cronogramas' },
                      { id: 'relatorios', label: 'Laudos e Visitas' },
                      { id: 'usuarios', label: 'Gestão de Usuários (Admin)' },
                      { id: 'documentacao', label: 'Documentação Técnica' },
                      { id: 'perfil', label: 'Perfil do Operador' },
                      { id: 'configuracoes', label: 'Configurações Globais' }
                    ].map(tab => {
                      const isChecked = editAllowedTabs.includes(tab.id);
                      return (
                        <div 
                          key={tab.id}
                          onClick={() => handleToggleTabPermission(tab.id)}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#D35400]/5 cursor-pointer text-[11px] transition-colors"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-[#D35400] border-[#D35400]' 
                              : theme === 'dark' ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3.5px]" />}
                          </div>
                          <span className={isChecked ? 'text-white' : 'text-zinc-350 dark:text-zinc-400'}>{tab.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Save Options */}
                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(null)}
                    className="flex-1 py-2 border border-zinc-805/40 dark:border-zinc-800 text-zinc-550 hover:text-white rounded-xl transition-all cursor-pointer text-xs font-bold uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EDIT ACTION CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showEditConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditConfirm(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-xs"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl z-10 text-center ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-[#D35400]/30 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="mx-auto w-12 h-12 bg-[#D35400]/10 text-[#D35400] rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-lg font-display mb-1">Confirmar Alterações</h3>
              <p className="text-xs text-zinc-455 dark:text-zinc-400 leading-relaxed mb-6">
                Deseja confirmar e aplicar os novos dados cadastrais e de licenciamento para o operador <span className="font-bold text-[#FC6B0A]">"{showEditConfirm.updated.name}"</span>? Esta alteração impacta os acessos e módulos liberados imediatamente.
              </p>

              <div className="grid grid-cols-2 gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowEditConfirm(null)}
                  className="px-4 py-2 hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEditSave}
                  className="px-4 py-2 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Sim, Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: ADD OPERATOR MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto ${
                theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424] text-white' : 'bg-white border-zinc-200 text-zinc-900'
              } scrollbar-thin`}
            >
              <div className="flex justify-between items-center mb-5">
                <div className="text-left">
                  <h3 className="text-lg font-bold font-display">Adicionar Novo Operador</h3>
                  <p className="text-[10px] text-zinc-500">Cadastre credenciais, mensalidade e permissões de acesso do novo operador.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
                {/* Nome Completo */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Adriano Senna"
                    className={`w-full py-2 px-3.5 rounded-xl border text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                    }`}
                  />
                </div>

                {/* Nome de Usuário (login) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Nome de Usuário (Login) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="adriano.senna"
                      className={`w-full py-2 pl-7 pr-3.5 rounded-xl border text-xs outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>
                </div>

                {/* Senha de Acesso */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Senha de Acesso *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <KeyRound className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Senha provisória do usuário..."
                      className={`w-full py-2 pl-9 pr-3.5 rounded-xl border text-xs outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>
                </div>

                {/* Numeric Licença Value and Status Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                      Licença Cadastrada (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newPaymentValue}
                      onChange={(e) => setNewPaymentValue(Number(e.target.value))}
                      className={`w-full py-2 px-3.5 rounded-xl border text-xs outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                      Situação de Acesso *
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className={`w-full py-2 px-3 rounded-xl border text-xs outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                          : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400]'
                      }`}
                    >
                      <option value="approved">Aprovado / Ativo</option>
                      <option value="pending">Pendente Liberação</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </div>
                </div>

                {/* Faturamento Financeiro */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Status Faturamento Financeiro *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPaymentStatus('pago')}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer ${
                        newPaymentStatus === 'pago'
                          ? 'bg-emerald-600/10 border-emerald-600 text-emerald-400'
                          : theme === 'dark' ? 'bg-zinc-950/20 border-[#242424] text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}
                    >
                      Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPaymentStatus('pendente')}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer ${
                        newPaymentStatus === 'pendente'
                          ? 'bg-red-600/10 border-red-600 text-red-500'
                          : theme === 'dark' ? 'bg-zinc-950/20 border-[#242424] text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}
                    >
                      Pendente
                    </button>
                  </div>
                </div>

                {/* Função / Cargo Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Função / Cargo Operacional *
                  </label>
                  <select
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value as any)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                        : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400]'
                    }`}
                  >
                    <option value="técnico">Técnico</option>
                    <option value="gerente">Gerente</option>
                    <option value="supervisor de operações">Supervisor de Operações</option>
                  </select>
                </div>

                {/* Permissão de Edição */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Nível de Permissão / Edição *
                  </label>
                  <select
                    value={newCanEditData ? 'completo' : 'visualizacao'}
                    onChange={(e) => setNewCanEditData(e.target.value === 'completo')}
                    className={`w-full py-2 px-3 rounded-xl border text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                        : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400]'
                    }`}
                  >
                    <option value="completo">Acesso Completo (Pode criar, editar e excluir)</option>
                    <option value="visualizacao">Visualização Apenas (Não pode alterar nada)</option>
                  </select>
                </div>

                {/* Permissions checkboxes (Allowed tabs) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Telas e Permissões do Sistema
                  </label>
                  <div className={`p-3 rounded-xl border text-left max-h-[140px] overflow-y-auto ${
                    theme === 'dark' ? 'bg-zinc-950 border-[#242424]' : 'bg-zinc-50 border-zinc-200'
                  } space-y-1.5 scrollbar-thin`}>
                    {[
                      { id: 'dashboard', label: 'Painel Geral (Dashboard)' },
                      { id: 'clientes', label: 'Gestão de Clientes' },
                      { id: 'calendario', label: 'Calendário de Cronogramas' },
                      { id: 'relatorios', label: 'Laudos e Visitas' },
                      { id: 'usuarios', label: 'Gestão de Usuários (Admin)' },
                      { id: 'documentacao', label: 'Documentação Técnica' },
                      { id: 'perfil', label: 'Perfil do Operador' },
                      { id: 'configuracoes', label: 'Configurações Globais' }
                    ].map(tab => {
                      const isChecked = newAllowedTabs.includes(tab.id);
                      return (
                        <div 
                          key={tab.id}
                          onClick={() => handleToggleNewTabPermission(tab.id)}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#D35400]/5 cursor-pointer text-[11px] transition-colors"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-[#D35400] border-[#D35400]' 
                              : theme === 'dark' ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3.5px]" />}
                          </div>
                          <span className={isChecked ? 'text-white' : 'text-zinc-350 dark:text-zinc-400'}>{tab.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Save Options */}
                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 border border-zinc-805/40 dark:border-zinc-800 text-zinc-550 hover:text-white rounded-xl transition-all cursor-pointer text-xs font-bold uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Cadastrar Operador
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
