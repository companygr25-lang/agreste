/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AGRESTE_DB } from './services/db';
import { isSupabaseConfigured } from './services/supabase';
import { Client, VisitReport, CompanyDocument, Reminder, UserProfile } from './types';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import DashboardTab from './components/DashboardTab';
import ClientsTab from './components/ClientsTab';
import CalendarTab from './components/CalendarTab';
import ReportsTab from './components/ReportsTab';
import DocumentsTab from './components/DocumentsTab';
import ProfileTab from './components/ProfileTab';
import SettingsTab from './components/SettingsTab';
import Toast from './components/Toast';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Data State triggers
  const [clients, setClients] = useState<Client[]>([]);
  const [reports, setReports] = useState<VisitReport[]>([]);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load state and dynamic configuration on startup
  useEffect(() => {
    // 1. One-time clean slate trigger to clear any old test data in localStorage
    const slateReset = localStorage.getItem('agreste_clean_slate_manual_reset_v4');
    if (!slateReset) {
      localStorage.removeItem('agreste_clients');
      localStorage.removeItem('agreste_reports');
      localStorage.removeItem('agreste_calendar');
      localStorage.removeItem('agreste_documents');
      localStorage.removeItem('agreste_reminders');
      localStorage.setItem('agreste_clean_slate_manual_reset_v4', 'true');
    }

    // 2. Theme sync
    const loadedTheme = AGRESTE_DB.getTheme();
    setTheme(loadedTheme);

    // 3. Auth sync
    const savedUser = localStorage.getItem('agreste_logged_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }

    // 4. Dynamic Favicon setter (overriding in-browser favicon dynamically to fulfill user requirement)
    try {
      const logoUrl = 'https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg';
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = logoUrl;
      link.type = 'image/jpeg';
      document.title = 'AGRESTE - Saúde Ambiental';
    } catch (e) {
      console.warn('Falha ao redefinir favicon dinâmico.', e);
    }

    // Load initial databases
    refreshAllData();

    // 5. Subscribe to real-time sync channel & trigger pull
    const unsubscribe = AGRESTE_DB.subscribeToRealtime(() => {
      refreshAllData();
    });

    if (isSupabaseConfigured()) {
      AGRESTE_DB.pullFromSupabase().then((pulled) => {
        if (pulled) {
          showToast('Sincronia Ativa: Banco de dados nuvem sincronizado em tempo real.', 'success');
        }
      });
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshAllData = () => {
    setClients(AGRESTE_DB.getClients());
    setReports(AGRESTE_DB.getReports());
    setDocuments(AGRESTE_DB.getDocuments());
    setReminders(AGRESTE_DB.getReminders());
    setProfile(AGRESTE_DB.getProfile());
  };

  const handleLoginSuccess = (username: string) => {
    localStorage.setItem('agreste_logged_user', username);
    setCurrentUser(username);
    refreshAllData();
  };

  const handleLogout = () => {
    localStorage.removeItem('agreste_logged_user');
    setCurrentUser(null);
    showToast('Logout efetuado com sucesso.', 'info');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // Synchronous theme propogation
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    AGRESTE_DB.setTheme(newTheme);
  };

  if (!currentUser) {
    return (
      <main className={theme === 'dark' ? 'dark' : ''} id="app-main-auth">
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          showToast={showToast} 
          theme={theme} 
        />
        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
      </main>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark text-zinc-100 bg-[#0F0F0F]' : 'text-zinc-900 bg-zinc-50'}>
      <div className="min-h-screen flex flex-col lg:flex-row" id="app-structure">
        {/* Navigation Sidebar Drawer */}
        <Sidebar 
          theme={theme}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            refreshAllData();
          }}
          onLogout={handleLogout}
          profile={profile || { id: '', username: '', name: 'Operador', phone: '', photoUrl: '' }}
          clients={clients}
          documents={documents}
        />

        {/* Core Screen Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8" id="app-viewport">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' && (
                <DashboardTab
                  theme={theme}
                  clients={clients}
                  reports={reports}
                  documents={documents}
                  setActiveTab={setActiveTab}
                  showToast={showToast}
                  onRefreshData={refreshAllData}
                />
              )}

              {activeTab === 'clientes' && (
                <ClientsTab
                  theme={theme}
                  clients={clients}
                  showToast={showToast}
                  onRefreshData={refreshAllData}
                />
              )}

              {activeTab === 'calendario' && (
                <CalendarTab
                  theme={theme}
                  calendarEvents={AGRESTE_DB.getCalendar()}
                  clients={clients}
                  showToast={showToast}
                  onRefreshData={refreshAllData}
                />
              )}

              {activeTab === 'relatorios' && (
                <ReportsTab
                  theme={theme}
                  reports={reports}
                  showToast={showToast}
                  onRefreshData={refreshAllData}
                />
              )}

              {activeTab === 'documentacao' && (
                <DocumentsTab
                  theme={theme}
                  documents={documents}
                  showToast={showToast}
                  onRefreshData={refreshAllData}
                />
              )}

              {activeTab === 'perfil' && profile && (
                <ProfileTab
                  theme={theme}
                  profile={profile}
                  showToast={showToast}
                  onRefreshData={refreshAllData}
                />
              )}

              {activeTab === 'configuracoes' && (
                <SettingsTab
                  theme={theme}
                  setTheme={handleThemeChange}
                  reminders={reminders}
                  showToast={showToast}
                  onRefreshData={refreshAllData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Alert Notification Drawer */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
