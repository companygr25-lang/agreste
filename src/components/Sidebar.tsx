/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building2, Users, Calendar, FileText, FileCheck, 
  Settings, User, LogOut, Sun, Moon, Sparkles, Clock, Landmark, MessageSquare, BookOpen,
  Menu, X, ClipboardList
} from 'lucide-react';
import { motion } from 'motion/react';
import { Client, CompanyDocument, UserProfile } from '../types';
import { AGRESTE_DB } from '../services/db';

interface SidebarProps {
  theme: 'light' | 'dark';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  profile: UserProfile;
  clients: Client[];
  documents: CompanyDocument[];
  currentUser?: string | null;
}

export default function Sidebar({ 
  theme, activeTab, setActiveTab, onLogout, profile, clients, documents, currentUser 
}: SidebarProps) {
  const logoUrl = 'https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg';

  // Badges calculations
  const pendingPaymentsCount = clients.filter(c => c.paymentStatus === 'pendente').length;
  
  const isCloseToExpiration = (dateStr: string) => {
    const today = new Date('2026-05-21');
    const updateDate = new Date(dateStr);
    const diffTime = updateDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };
  const pendingDocsCount = documents.filter(d => d.status === 'pendente' || isCloseToExpiration(d.nextUpdateDate)).length;

  const normalizedUser = currentUser?.toLowerCase() || '';
  const isProvider = normalizedUser === 'gil silva';
  
  // Custom screens from DB
  const userDetails = AGRESTE_DB.getUserDetails();
  const currentDetails = userDetails[normalizedUser];
  const allowedTabs = [
    ...(currentDetails?.allowedTabs || ['dashboard', 'clientes', 'calendario', 'relatorios', 'documentacao', 'perfil', 'configuracoes']),
  ];

  const isManager = isProvider || 
                    normalizedUser === 'adriano senna' || 
                    profile.cargo?.toLowerCase().includes('gerente') || 
                    profile.cargo?.toLowerCase().includes('supervisor') || 
                    currentDetails?.cargo?.toLowerCase().includes('gerente') || 
                    currentDetails?.cargo?.toLowerCase().includes('supervisor');

  if (isManager && !allowedTabs.includes('gerencia')) {
    allowedTabs.push('gerencia');
  }

  // Ensure controles is always present for all users as a technical guide
  if (!allowedTabs.includes('controles')) {
    allowedTabs.push('controles');
  }

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Building2 className="w-4.5 h-4.5" /> },
    { id: 'usuarios', label: 'Usuários', icon: <Users className="w-4.5 h-4.5" /> },
    { 
      id: 'clientes', 
      label: 'Clientes', 
      icon: <Users className="w-4.5 h-4.5" />,
      badge: pendingPaymentsCount > 0 ? (
        <span className="ml-auto px-2 py-0.5 bg-red-650/20 text-red-400 font-bold font-mono text-[9px] rounded-full border border-red-500/20 animate-pulse">
          $ {pendingPaymentsCount}
        </span>
      ) : null
    },
    { id: 'calendario', label: 'Calendário de Atividades', icon: <Calendar className="w-4.5 h-4.5" /> },
    { id: 'relatorios', label: 'Relatórios Diários', icon: <FileText className="w-4.5 h-4.5" /> },
    { 
      id: 'documentacao', 
      label: 'Documentação Empresa', 
      icon: <FileCheck className="w-4.5 h-4.5" />,
      badge: pendingDocsCount > 0 ? (
        <span className="ml-auto px-1.5 py-0.5 bg-amber-600/20 text-amber-500 font-bold font-mono text-[9px] rounded-full border border-amber-500/10">
          {pendingDocsCount}
        </span>
      ) : null
    },
    { id: 'controles', label: 'Tipos de Controles', icon: <BookOpen className="w-4.5 h-4.5" /> },
    { id: 'gerencia', label: 'Checklist', icon: <ClipboardList className="w-4.5 h-4.5" /> },
    { id: 'perfil', label: 'Meu Perfil', icon: <User className="w-4.5 h-4.5" /> },
    { id: 'configuracoes', label: isProvider ? 'Configuração' : 'Configurações', icon: <Settings className="w-4.5 h-4.5" /> },
  ];

  const menuItems = allMenuItems.filter(item => allowedTabs.includes(item.id));
  const [isMinimizedMobile, setIsMinimizedMobile] = React.useState(true);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r z-20 ${
          theme === 'dark' 
            ? 'bg-[#141414] border-zinc-900 text-white' 
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Brand Header Logo */}
        <div className="p-6 border-b border-zinc-900/10 dark:border-zinc-900/40 flex items-center gap-3">
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 rounded-full bg-[#D35400] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <img
              referrerPolicy="no-referrer"
              src={logoUrl}
              alt="AGRESTE"
              className="relative w-11 h-11 rounded-full object-cover border border-[#D35400]/40"
            />
          </div>
          <div>
            <h1 className="text-xl font-black font-display tracking-tight text-[#D35400] leading-none">
              AGRESTE
            </h1>
            <span className="text-[9px] font-extrabold font-mono uppercase tracking-[0.18em] text-zinc-400 dark:text-white/90 mt-1 block">
              saúde ambiental
            </span>
          </div>
        </div>

        {/* Navigation Sidebar List */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                id={`sidebar-item-${item.id}`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-100 cursor-pointer ${
                  isActive
                    ? 'bg-[#D35400] text-white shadow-lg shadow-[#D35400]/15 border-l-4 border-l-[#D35400]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                        .replace('hover:text-zinc-200 hover:bg-zinc-900/40', theme === 'light' ? 'hover:text-zinc-800 hover:bg-zinc-100' : 'hover:text-zinc-200 hover:bg-zinc-900/40')
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-zinc-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge}
              </button>
            );
          })}
        </nav>

        {/* User Account / Footer */}
        <div className="p-4 border-t border-zinc-900/10 dark:border-zinc-900 space-y-3 shrink-0">
          <div 
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-zinc-900/35 transition-all ${
              theme === 'light' ? 'hover:bg-zinc-100' : ''
            }`}
          >
            <img
              referrerPolicy="no-referrer"
              src={profile.photoUrl || logoUrl}
              alt={profile.name}
              className="w-9 h-9 rounded-full object-cover border border-[#D35400]/30"
            />
            <div className="truncate text-left w-full pr-2">
              <p className="text-xs font-bold text-zinc-300 dark:text-zinc-100 truncate">{profile.name}</p>
              <p className="text-[10px] text-[#D35400] truncate font-medium">{profile.cargo || 'Operador Técnico'}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            id="desktop-logout-btn"
            className="w-full py-2 bg-zinc-950 hover:bg-zinc-900/50 hover:border-zinc-850 dark:hover:bg-zinc-900/60 border border-zinc-900 text-red-500 dark:text-red-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* MOBILE RESPONSIVE COLLAPSIBLE SIDEBAR */}
      <div className="lg:hidden shrink-0">
        {/* Floating menu toggle button when sidebar is collapsed */}
        {isMinimizedMobile && (
          <button
            onClick={() => setIsMinimizedMobile(false)}
            id="mobile-floating-menu-trigger"
            className="fixed top-4 left-4 z-30 w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-lg border border-[#D35400]/25 bg-zinc-950/95 hover:bg-zinc-900 text-[#D35400] active:scale-95"
            title="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
            {/* Notification badge */}
            {(pendingPaymentsCount > 0 || pendingDocsCount > 0) && (
              <span className="absolute -top-1 -right-1 bg-[#D35400] text-white w-2 h-2 rounded-full ring-2 ring-zinc-950 animate-pulse" />
            )}
          </button>
        )}

        {/* Backdrop overlay when mobile sidebar is expanded */}
        {!isMinimizedMobile && (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-35 transition-opacity duration-300"
            onClick={() => setIsMinimizedMobile(true)}
          />
        )}

        <aside 
          className={`fixed top-0 bottom-0 left-0 h-screen w-[270px] z-40 border-r flex flex-col transition-transform duration-300 ease-in-out ${
            isMinimizedMobile ? '-translate-x-full' : 'translate-x-0'
          } ${
            theme === 'dark' 
              ? 'bg-[#141414] border-zinc-900 text-white' 
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* Header containing Brand Info and Close Trigger */}
          <div className="p-4 border-b border-zinc-900/10 dark:border-zinc-900/40 flex items-center justify-between shrink-0 h-[64px]">
            <div className="flex items-center gap-2.5">
              <img
                referrerPolicy="no-referrer"
                src={logoUrl}
                alt="AGRESTE"
                className="w-8.5 h-8.5 rounded-full object-cover border border-[#D35400]/40"
              />
              <div className="truncate">
                <h1 className="text-sm font-bold font-display text-[#D35400] leading-none">AGRESTE</h1>
                <span className="text-[7.5px] font-extrabold font-mono tracking-wider text-zinc-400 dark:text-white/95 leading-none uppercase mt-0.5 block">saúde ambiental</span>
              </div>
            </div>
            <button
              onClick={() => setIsMinimizedMobile(true)}
              id="mobile-sidebar-close-btn"
              className="w-8 h-8 rounded-lg bg-zinc-950/20 text-zinc-400 hover:text-[#D35400] flex items-center justify-center cursor-pointer"
              title="Fechar Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Vertical Scrolling List inside expanded drawer */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-none">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMinimizedMobile(true); // Auto collapse after select on mobile
                  }}
                  id={`mobile-sidebar-item-${item.id}`}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-100 cursor-pointer justify-start ${
                    isActive
                      ? 'bg-[#D35400] text-white shadow-md shadow-[#D35400]/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                          .replace('hover:text-zinc-200 hover:bg-zinc-900/40', theme === 'light' ? 'hover:text-zinc-800 hover:bg-zinc-100' : 'hover:text-zinc-200 hover:bg-zinc-900/40')
                  }`}
                  title={item.label}
                >
                  <span className={`relative shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                    {item.icon}
                    {item.id === 'clientes' && pendingPaymentsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white w-2.5 h-2.5 text-[7px] leading-none rounded-full flex items-center justify-center font-bold ring-2 ring-zinc-950">
                        {pendingPaymentsCount}
                      </span>
                    )}
                    {item.id === 'documentacao' && pendingDocsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-white w-2 h-2 rounded-full ring-2 ring-zinc-950" />
                    )}
                  </span>

                  <span className="text-xs truncate text-left flex-1 font-semibold">
                    {item.label}
                  </span>

                  {item.badge}
                </button>
              );
            })}
          </nav>

          {/* Footer profile & logout triggers */}
          <div className="p-4 border-t border-zinc-900/10 dark:border-zinc-900 space-y-3 shrink-0">
            <div 
              onClick={() => {
                setActiveTab('perfil');
                setIsMinimizedMobile(true);
              }}
              className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-zinc-900/35 transition-all ${
                theme === 'light' ? 'hover:bg-zinc-100' : ''
              }`}
            >
              <img
                referrerPolicy="no-referrer"
                src={profile.photoUrl || logoUrl}
                alt={profile.name}
                className="w-9 h-9 rounded-full object-cover border border-[#D35400]/30"
              />
              <div className="truncate text-left w-full pr-1">
                <p className="text-xs font-bold text-zinc-300 dark:text-zinc-100 truncate">{profile.name}</p>
                <p className="text-[10px] text-[#D35400] truncate font-medium">{profile.cargo || 'Operador Técnico'}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              id="mobile-sidebar-logout-btn"
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900/50 hover:border-zinc-850 dark:hover:bg-zinc-900/60 border border-zinc-900 text-red-500 dark:text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
              title="Sair do Painel"
            >
              <LogOut className="w-3.5 h-3.5" /> 
              <span>Sair do Painel</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
