/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building2, Users, Calendar, FileText, FileCheck, 
  Settings, User, LogOut, Sun, Moon, Sparkles, Clock, Landmark
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
  const allowedTabs = currentDetails?.allowedTabs || ['dashboard', 'clientes', 'calendario', 'relatorios', 'documentacao', 'perfil', 'configuracoes'];

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
    { id: 'perfil', label: 'Meu Perfil', icon: <User className="w-4.5 h-4.5" /> },
    { id: 'configuracoes', label: isProvider ? 'Configuração' : 'Configurações', icon: <Settings className="w-4.5 h-4.5" /> },
  ];

  const menuItems = allMenuItems.filter(item => allowedTabs.includes(item.id));

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
              <p className="text-[10px] text-zinc-500 truncate font-mono">{profile.phone}</p>
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

      {/* MOBILE RESPONSIVE TOP NAV BAR + BOTTOM DRAWER STICKY */}
      <div className="lg:hidden shrink-0">
        {/* TOP MOBILE BANNER */}
        <header className={`sticky top-0 w-full z-20 border-b flex items-center justify-between px-4 py-3 ${
          theme === 'dark' ? 'bg-[#141414] border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-900'
        }`}>
          <div className="flex items-center gap-2">
            <img
              referrerPolicy="no-referrer"
              src={logoUrl}
              alt="AGRESTE"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <h1 className="text-md font-bold font-display text-[#D35400] leading-none">AGRESTE</h1>
              <span className="text-[8px] font-extrabold font-mono tracking-wider text-zinc-400 dark:text-white/95 leading-none uppercase">saúde ambiental</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('perfil')}
              id="mobile-avatar-top-btn"
              className="p-1"
            >
              <img
                referrerPolicy="no-referrer"
                src={profile.photoUrl || logoUrl}
                alt={profile.name}
                className="w-7.5 h-7.5 rounded-full object-cover border border-[#D35400]/30"
              />
            </button>
            <button
              onClick={onLogout}
              id="mobile-logout-top-btn"
              className="p-2 text-zinc-400 hover:text-red-500 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* BOTTOM NAV STICKY NAVIGATOR BAR */}
        <nav className={`fixed bottom-0 left-0 right-0 z-30 border-t flex justify-around py-2 ${
          theme === 'dark' ? 'bg-[#141414]/95 border-zinc-900 text-white backdrop-blur-md' : 'bg-white border-zinc-200 text-zinc-900'
        }`}>
          {menuItems.slice(0, 5).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                id={`mobile-nav-item-${item.id}`}
                className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
                  isActive ? 'text-[#D35400] font-bold' : 'text-zinc-500'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.id === 'clientes' && pendingPaymentsCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-[8px] leading-none bg-red-650 text-white w-2 h-2 rounded-full ring-2 ring-zinc-950 animate-ping"></span>
                  )}
                  {item.id === 'documentacao' && pendingDocsCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-[8px] leading-none bg-amber-500 text-white w-2 h-2 rounded-full ring-2 ring-zinc-950"></span>
                  )}
                </div>
                <span className="text-[9px] mt-1 tracking-tighter truncate max-w-[60px] block">
                  {item.id === 'dashboard' ? 'Dash' : item.id === 'clientes' ? 'Clientes' : item.id === 'calendario' ? 'Agenda' : item.id === 'relatorios' ? 'Laudos' : 'Docs'}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
