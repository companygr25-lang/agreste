/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, VisitReport, LargeClientActivity, CompanyDocument, Reminder, UserProfile, SystemUserDetail, ChatSession, FloatingNotification, ManagerTask } from '../types';
import { isSupabaseConfigured, getSupabase } from './supabase';

// Seed Initial Data
const SEED_CLIENTS: Client[] = [];
const SEED_DOCUMENTS: CompanyDocument[] = [];
const SEED_CALENDAR: LargeClientActivity[] = [];
const SEED_REPORTS: VisitReport[] = [];
const SEED_REMINDERS: Reminder[] = [];

const SEED_PROFILE: UserProfile = {
  id: 'usr-1',
  username: 'adriano senna',
  name: 'Adriano Senna',
  phone: '',
  photoUrl: '', // Will be added from gallery/bucket
  cargo: 'Gerente e Supervisor de Operações'
};

export class AGRESTE_DB {
  private static listeners: (() => void)[] = [];
  private static realtimeChannel: any = null;

  static subscribeToRealtime(callback: () => void): () => void {
    this.listeners.push(callback);
    
    // Lazy initialize Supabase real-time subscription
    if (isSupabaseConfigured() && !this.realtimeChannel) {
      this.initRealtimeSubscription();
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private static notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (err) {
        console.error('Error in listener callback:', err);
      }
    });
  }

  private static initRealtimeSubscription() {
    const supabase = getSupabase();
    if (!supabase) return;

    this.realtimeChannel = supabase
      .channel('agreste_realtime_db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreste_sync' }, (payload: any) => {
        const row = payload.new;
        if (row && row.key) {
          localStorage.setItem(`agreste_${row.key}`, JSON.stringify(row.data));
          this.notifyListeners();
        }
      })
      .subscribe();
  }

  static async pullFromSupabase(): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { data, error } = await supabase.from('agreste_sync').select('*');
      if (error) {
        console.warn('Erro ao carregar dados do Supabase:', error);
        return false;
      }

      if (data && data.length > 0) {
        data.forEach((row: any) => {
          localStorage.setItem(`agreste_${row.key}`, JSON.stringify(row.data));
        });
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Falha na comunicação com o Supabase durante o pull:', err);
      return false;
    }
  }

  static async pushToSupabase(key: string, value: any): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await supabase.from('agreste_sync').upsert({
        key,
        data: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch (err) {
      console.warn(`Erro ao salvar '${key}' no Supabase:`, err);
    }
  }

  private static get<T>(key: string, seed: T): T {
    try {
      const data = localStorage.getItem(`agreste_${key}`);
      if (!data) {
        localStorage.setItem(`agreste_${key}`, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return seed;
    }
  }

  private static set<T>(key: string, value: T): void {
    localStorage.setItem(`agreste_${key}`, JSON.stringify(value));
    this.pushToSupabase(key, value);
    this.notifyListeners();
  }

  // --- Theme ---
  static getTheme(): 'light' | 'dark' {
    return localStorage.getItem('agreste_theme') as 'light' | 'dark' || 'dark';
  }

  static setTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem('agreste_theme', theme);
  }

  // --- Auth & Users ---
  static getUsers(): Record<string, string> {
    return this.get<Record<string, string>>('users', { 
      'gil silva': 'admin123'
    });
  }

  static saveUsers(users: Record<string, string>): void {
    this.set('users', users);
  }

  static getUserDetails(): Record<string, SystemUserDetail> {
    const defaultDetails: Record<string, SystemUserDetail> = {
      'gil silva': {
        username: 'gil silva',
        name: 'Gil Silva',
        status: 'approved',
        paymentStatus: 'pago',
        paymentValue: 0,
        allowedTabs: ['dashboard', 'usuarios', 'faturamento', 'configuracoes']
      }
    };
    return this.get<Record<string, SystemUserDetail>>('user_details', defaultDetails);
  }

  static saveUserDetails(details: Record<string, SystemUserDetail>): void {
    this.set('user_details', details);
  }

  static getLicensesLimit(): number {
    return this.get<number>('licenses_limit', 5);
  }

  static setLicensesLimit(limit: number): void {
    this.set('licenses_limit', limit);
  }

  static registerUser(username: string, pass: string, cargo?: 'técnico' | 'gerente' | 'supervisor de operações'): boolean {
    const users = this.getUsers();
    const normalized = username.toLowerCase().trim();
    if (users[normalized]) return false;
    users[normalized] = pass;
    this.set('users', users);

    // Save initial details
    const details = this.getUserDetails();
    details[normalized] = {
      username: normalized,
      name: username,
      status: normalized === 'gil silva' ? 'approved' : 'pending',
      paymentStatus: 'pendente',
      paymentValue: 150,
      allowedTabs: ['dashboard', 'clientes', 'calendario', 'relatorios', 'documentacao', 'faturamento', 'perfil', 'configuracoes'],
      cargo: cargo || 'técnico'
    };
    this.saveUserDetails(details);
    return true;
  }

  static validateUser(username: string, pass: string, deviceId?: string): { valid: boolean; status?: 'pending' | 'approved' | 'blocked'; message?: string } {
    const normalized = username.toLowerCase().trim();
    
    // Self-healing bypass to ensure Gil Silva can always log in with the correct credentials
    if (normalized === 'gil silva' && pass === 'admin123') {
      const details = this.getUserDetails();
      const existing = details[normalized];
      const allowedDevs = existing?.allowedDevices || [];

      if (deviceId && !allowedDevs.includes(deviceId)) {
        if (allowedDevs.length < 2) {
          allowedDevs.push(deviceId);
        } else {
          return {
            valid: false,
            message: 'Limite de aparelhos atingido para este usuário (máximo 2 aparelhos). Solicite a liberação de um aparelho anterior ao administrador.'
          };
        }
      }

      details[normalized] = {
        username: normalized,
        name: 'Gil Silva',
        status: 'approved',
        paymentStatus: 'pago',
        paymentValue: 0,
        allowedTabs: ['dashboard', 'usuarios', 'faturamento', 'configuracoes'],
        allowedDevices: allowedDevs
      };
      this.saveUserDetails(details);

      const users = this.getUsers();
      users[normalized] = 'admin123';
      this.set('users', users);

      return { valid: true };
    }

    const users = this.getUsers();
    
    if (users[normalized] !== pass) {
      return { valid: false, message: 'Credenciais incorretas.' };
    }
    
    const details = this.getUserDetails();
    let detail = details[normalized];
    
    // Auto-create detail if user registered earlier but detail doesn't exist
    if (!detail) {
      details[normalized] = {
        username: normalized,
        name: username,
        status: normalized === 'gil silva' ? 'approved' : 'pending',
        paymentStatus: 'pendente',
        paymentValue: 150,
        allowedTabs: ['dashboard', 'clientes', 'calendario', 'relatorios', 'documentacao', 'faturamento', 'perfil', 'configuracoes'],
        allowedDevices: []
      };
      this.saveUserDetails(details);
      detail = details[normalized];
    }
    
    if (detail.status === 'pending') {
      return { valid: false, status: 'pending', message: 'Acesso pendente de liberação. Favor aguardar a liberação do administrador.' };
    }
    
    if (detail.status === 'blocked') {
      return { valid: false, status: 'blocked', message: 'Acesso bloqueado pelo provedor.' };
    }

    // Check device limit
    const allowedDevices = detail.allowedDevices || [];
    if (deviceId && !allowedDevices.includes(deviceId)) {
      if (allowedDevices.length >= 2) {
        return { 
          valid: false, 
          message: 'Limite de aparelhos atingido para este usuário (máximo 2 aparelhos). Entre em contato com o administrador para redefinir os aparelhos autorizados.' 
        };
      } else {
        // Register this new device
        detail.allowedDevices = [...allowedDevices, deviceId];
        details[normalized] = detail;
        this.saveUserDetails(details);
      }
    }
    
    return { valid: true };
  }

  // --- Clients CRUD ---
  static getClients(): Client[] {
    const clients = this.get<Client[]>('clients', SEED_CLIENTS);
    
    // Automatic on-the-fly self-healing of any duplicate IDs
    const seenIds = new Set<string>();
    let hasDuplicates = false;
    
    const healedClients = clients.map((client) => {
      if (!client.id || seenIds.has(client.id)) {
        hasDuplicates = true;
        const newId = `cli-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        seenIds.add(newId);
        return { ...client, id: newId };
      }
      seenIds.add(client.id);
      return client;
    });

    if (hasDuplicates) {
      this.set('clients', healedClients);
    }

    return [...healedClients].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  }

  static addClient(client: Omit<Client, 'id' | 'createdAt' | 'code'>): Client {
    const clients = this.getClients();
    
    // Auto calculate the 3 digit code: serial based on next count
    const nextCodeNum = clients.length + 1;
    const clientCode = String(nextCodeNum).padStart(3, '0');

    const newClient: Client = {
      ...client,
      id: `cli-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      code: clientCode,
      createdAt: new Date().toISOString().split('T')[0],
    };
    clients.push(newClient);
    this.set('clients', clients);

    // Trigger a notification for all technicians in case of pending confirmation signup
    if (client.isPendingConfirmation) {
      this.addNotification({
        type: 'new_registration',
        title: 'Novo Cadastro Efetuado',
        message: `O cliente "${newClient.name}" (${newClient.city}) realizou seu cadastro pendente por chatbot/portal e aguarda validação no painel.`,
        clientName: newClient.name,
        clientId: newClient.id
      });
    }

    return newClient;
  }

  static updateClient(updated: Client): void {
    const clients = this.getClients();
    const index = clients.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      clients[index] = updated;
      this.set('clients', clients);
    }
  }

  static deleteClient(id: string): void {
    const clients = this.getClients();
    const clientToDelete = clients.find(c => c.id === id);
    const filteredClients = clients.filter(c => c.id !== id);
    this.set('clients', filteredClients);
    
    // Also remove from calendar
    const calendar = this.getCalendar().filter(c => c.clientId !== id);
    this.set('calendar', calendar);
    
    // Also remove associated chat session
    const chats = this.getChats().filter(chat => chat.id !== id);
    this.saveChats(chats);

    // Also remove any matching customer account credentials in client_chat_accounts
    if (clientToDelete) {
      const accounts = this.getClientChatAccounts();
      const responsibleLower = clientToDelete.responsible?.toLowerCase().trim();
      const nameLower = clientToDelete.name?.toLowerCase().trim();
      const phoneDigits = clientToDelete.phone ? clientToDelete.phone.replace(/\D/g, '') : '';

      let changed = false;
      for (const [usr, acc] of Object.entries(accounts)) {
        const accResp = acc.responsible ? acc.responsible.toLowerCase().trim() : '';
        const accName = acc.name ? acc.name.toLowerCase().trim() : '';
        const accPhone = acc.phone ? acc.phone.replace(/\D/g, '') : '';

        // If it matches the deleted client credentials, delete this chat login account as well!
        if (usr.toLowerCase().trim() === responsibleLower || 
            accResp === responsibleLower || 
            accName === nameLower ||
            (phoneDigits && accPhone && (phoneDigits.includes(accPhone) || accPhone.includes(phoneDigits)))) {
          delete accounts[usr];
          changed = true;
        }
      }
      if (changed) {
        this.saveClientChatAccounts(accounts);
      }
    }
  }

  // --- Reports CRUD ---
  static getReports(): VisitReport[] {
    return this.get<VisitReport[]>('reports', SEED_REPORTS);
  }

  static addReport(report: Omit<VisitReport, 'id' | 'createdAt'>): VisitReport {
    const reports = this.getReports();
    const newReport: VisitReport = {
      ...report,
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    reports.push(newReport);
    this.set('reports', reports);
    return newReport;
  }

  static deleteReport(id: string): void {
    const reports = this.getReports().filter(r => r.id !== id);
    this.set('reports', reports);
  }

  // --- Calendar CRUD ---
  static getCalendar(): LargeClientActivity[] {
    return this.get<LargeClientActivity[]>('calendar', SEED_CALENDAR);
  }

  static addCalendarEvent(event: Omit<LargeClientActivity, 'id'>): LargeClientActivity {
    const calendar = this.getCalendar();
    const newEvent: LargeClientActivity = {
      ...event,
      id: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
    calendar.push(newEvent);
    this.set('calendar', calendar);
    return newEvent;
  }

  static updateCalendarEvent(updated: LargeClientActivity): void {
    const calendar = this.getCalendar();
    const index = calendar.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      calendar[index] = updated;
      this.set('calendar', calendar);
    }
  }

  static deleteCalendarEvent(id: string): void {
    const calendar = this.getCalendar().filter(c => c.id !== id);
    this.set('calendar', calendar);
  }

  // --- Company Documents CRUD ---
  static getDocuments(): CompanyDocument[] {
    return this.get<CompanyDocument[]>('documents', SEED_DOCUMENTS);
  }

  static addDocument(doc: Omit<CompanyDocument, 'id'>): CompanyDocument {
    const docs = this.getDocuments();
    const newDoc: CompanyDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
    docs.push(newDoc);
    this.set('documents', docs);
    return newDoc;
  }

  static updateDocument(updated: CompanyDocument): void {
    const docs = this.getDocuments();
    const index = docs.findIndex(d => d.id === updated.id);
    if (index !== -1) {
      docs[index] = updated;
      this.set('documents', docs);
    }
  }

  static deleteDocument(id: string): void {
    const docs = this.getDocuments().filter(d => d.id !== id);
    this.set('documents', docs);
  }

  // --- Reminders CRUD ---
  static getReminders(): Reminder[] {
    return this.get<Reminder[]>('reminders', SEED_REMINDERS);
  }

  static addReminder(rem: Omit<Reminder, 'id' | 'completed'>): Reminder {
    const reminders = this.getReminders();
    const newRem: Reminder = {
      ...rem,
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      completed: false
    };
    reminders.push(newRem);
    this.set('reminders', reminders);
    return newRem;
  }

  static toggleReminder(id: string): void {
    const reminders = this.getReminders();
    const index = reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      reminders[index].completed = !reminders[index].completed;
      this.set('reminders', reminders);
    }
  }

  static deleteReminder(id: string): void {
    const reminders = this.getReminders().filter(r => r.id !== id);
    this.set('reminders', reminders);
  }

  // --- Profile ---
  static getProfile(): UserProfile {
    const loggedUser = localStorage.getItem('agreste_logged_user');
    if (loggedUser) {
      const normalized = loggedUser.toLowerCase().trim();
      const specificProfile = this.get<UserProfile | null>(`profile_${normalized}`, null);
      if (specificProfile) {
        if (normalized === 'adriano senna' && !specificProfile.cargo) {
          specificProfile.cargo = 'Gerente e Supervisor de Operações';
        }
        return specificProfile;
      }
      
      const details = this.getUserDetails();
      const userDetail = details[normalized];
      if (userDetail) {
        return {
          id: `usr-${normalized}`,
          username: normalized,
          name: userDetail.name || (normalized === 'adriano senna' ? 'Adriano Senna' : userDetail.username),
          phone: '',
          photoUrl: '',
          cargo: normalized === 'adriano senna' ? 'Gerente e Supervisor de Operações' : (userDetail.cargo || 'Operador Técnico')
        };
      }
    }
    
    const legacy = this.get<UserProfile | null>('profile', null);
    if (legacy) {
      if (loggedUser && loggedUser.toLowerCase().trim() === 'adriano senna') {
        if (legacy.name === 'Sandro' || legacy.name === '' || !legacy.name) {
          legacy.name = 'Adriano Senna';
        }
        if (!legacy.cargo) {
          legacy.cargo = 'Gerente e Supervisor de Operações';
        }
      }
      return legacy;
    }
    return SEED_PROFILE;
  }

  static updateProfile(profile: UserProfile): void {
    const loggedUser = localStorage.getItem('agreste_logged_user');
    if (loggedUser) {
      const normalized = loggedUser.toLowerCase().trim();
      this.set(`profile_${normalized}`, profile);
    }
    this.set('profile', profile);
  }

  static clearAllData(): void {
    this.set('clients', []);
    this.set('reports', []);
    this.set('calendar', []);
    this.set('documents', []);
    this.set('reminders', []);
    this.set('chats', []);
    this.set('client_chat_accounts', {});
  }

  // --- Chat Bot and Client Accounts Helpers ---
  static getClientChatAccounts(): Record<string, { password?: string; phone: string; name?: string; responsible?: string; city?: string; isRegistered: boolean }> {
    return this.get<Record<string, { password?: string; phone: string; name?: string; responsible?: string; city?: string; isRegistered: boolean }>>('client_chat_accounts', {});
  }

  static saveClientChatAccounts(accounts: Record<string, { password?: string; phone: string; name?: string; responsible?: string; city?: string; isRegistered: boolean }>): void {
    this.set('client_chat_accounts', accounts);
  }

  static getChats(): ChatSession[] {
    return this.get<ChatSession[]>('chats', []);
  }

  static saveChats(chats: ChatSession[]): void {
    this.set('chats', chats);
  }

  // --- Floating Notifications Helpers ---
  static getNotifications(): FloatingNotification[] {
    return this.get<FloatingNotification[]>('notifications', []);
  }

  static saveNotifications(notifications: FloatingNotification[]): void {
    this.set('notifications', notifications);
  }

  static getPixKey(): string {
    return this.get<string>('pix_key', 'agreste.saude.ambiental@pix.com');
  }

  static savePixKey(key: string): void {
    this.set('pix_key', key);
  }

  static dismissNotificationForUser(id: string, username: string): void {
    const notifications = this.getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      const notif = notifications[index];
      const lowerUser = username.toLowerCase().trim();
      
      if (notif.type === 'chat_request' && notif.targetTech?.toLowerCase().trim() === lowerUser) {
        notif.status = 'dismissed';
      }
      
      if (!notif.dismissedBy) {
        notif.dismissedBy = [];
      }
      if (!notif.dismissedBy.includes(lowerUser)) {
        notif.dismissedBy.push(lowerUser);
      }
      
      this.saveNotifications(notifications);
    }
  }

  static addNotification(notif: Omit<FloatingNotification, 'id' | 'createdAt' | 'status'>): FloatingNotification {
    const notifications = this.getNotifications();
    const newNotif: FloatingNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    notifications.push(newNotif);
    this.saveNotifications(notifications);
    return newNotif;
  }

  static getUserDisplayName(username: string): string {
    const details = this.getUserDetails();
    const lower = username.toLowerCase().trim();
    if (details[lower] && details[lower].name) {
      return details[lower].name;
    }
    return username;
  }

  static tryAcceptNotification(notificationId: string, techUsername: string): { success: boolean; message: string; notification?: FloatingNotification } {
    const notifications = this.getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    
    if (index === -1) {
      return { success: false, message: 'Esta notificação não está mais ativa.' };
    }

    const notif = notifications[index];

    // If already accepted by someone else
    if (notif.status === 'accepted' && notif.acceptedBy && notif.acceptedBy !== techUsername) {
      const display = this.getUserDisplayName(notif.acceptedBy);
      
      // Update this notification to dismissed so it hides from this screen
      notif.status = 'dismissed';
      this.saveNotifications(notifications);

      return { 
        success: false, 
        message: `O técnico "${display}" já carregou o atendimento / cadastro referente a este chamado!` 
      };
    }

    // Accept it
    notif.status = 'accepted';
    notif.acceptedBy = techUsername;
    this.saveNotifications(notifications);

    return { 
      success: true, 
      message: 'Atendimento aceito com sucesso!', 
      notification: notif 
    };
  }

  // --- Database Sync Check for Supabase migration compatibility ---
  static checkDatabaseStatus() {
    const configured = isSupabaseConfigured();
    return {
      status: configured ? 'Conectado' : 'Modo Sincronização Local',
      provider: configured ? 'Supabase Integrado' : 'Adaptador Modular Local (Aguardando Supabase)',
      latencyMs: configured ? 45 : 12,
      tables: ['clients', 'reports', 'calendar', 'documents', 'reminders'],
      syncActive: configured,
      pendingQueueLength: 0,
      configured
    };
  }

  // --- Manager Checklist System (Faithful to Excel Sheet) ---
  static getManagerTasks(): ManagerTask[] {
    const defaultTasks: ManagerTask[] = [
      // SEGUNDA (Monday)
      { id: 'task-seg-1', day: 'Segunda', title: 'Conferir planilhas de manutenção, EDI, Veículos / Entrega dos certificados', completed: false },
      { id: 'task-seg-2', day: 'Segunda', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-seg-3', day: 'Segunda', title: 'Conferir: atendimento (whats, insta, email, financeiro (se preencheu planilha, pós-venda) vendas (renovações, vendas novas, visitas)', completed: false },
      { id: 'task-seg-4', day: 'Segunda', title: 'Estudar 30 min', completed: false },
      { id: 'task-seg-5', day: 'Segunda', title: 'Trabalhos esporádicos (olhar planko, cancelar roteiros, etc)', completed: false },
      { id: 'task-seg-6', day: 'Segunda', title: 'Serviços externos (COBRANÇA E VISITAS DE SUPERVISÃO)', completed: false },
      { id: 'task-seg-7', day: 'Segunda', title: 'Almoço', completed: false },
      { id: 'task-seg-8', day: 'Segunda', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-seg-9', day: 'Segunda', title: 'Financeiro (pagar contas e dar baixa no sistema)', completed: false },
      { id: 'task-seg-10', day: 'Segunda', title: 'Acompanhar operação', completed: false },
      { id: 'task-seg-11', day: 'Segunda', title: 'Preencher planilhas e fazer relatórios', completed: false },
      { id: 'task-seg-12', day: 'Segunda', title: 'Conferencia de roteiros do dia e olhar roteiros do dia seguinte', completed: false },

      // TERÇA (Tuesday)
      { id: 'task-ter-1', day: 'Terça', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-ter-2', day: 'Terça', title: 'Conferir: atendimento (whats, insta, email, financeiro (se preencheu planilha, pós-venda) vendas (renovações, vendas novas, visitas)', completed: false },
      { id: 'task-ter-3', day: 'Terça', title: 'Estudar 30 min', completed: false },
      { id: 'task-ter-4', day: 'Terça', title: 'Trabalhos esporádicos (olhar planko, cancelar roteiros, etc)', completed: false },
      { id: 'task-ter-5', day: 'Terça', title: 'Serviços externos (COBRANÇA E VISITAS DE SUPERVISÃO)', completed: false },
      { id: 'task-ter-6', day: 'Terça', title: 'Almoço', completed: false },
      { id: 'task-ter-7', day: 'Terça', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-ter-8', day: 'Terça', title: 'Financeiro (pagar contas e dar baixa no sistema)', completed: false },
      { id: 'task-ter-9', day: 'Terça', title: 'Acompanhar operação', completed: false },
      { id: 'task-ter-10', day: 'Terça', title: 'Preencher planilhas e fazer relatórios', completed: false },
      { id: 'task-ter-11', day: 'Terça', title: 'Conferir as demanda da empresa e roteiro do dia', completed: false },

      // QUARTA (Wednesday)
      { id: 'task-qua-1', day: 'Quarta', title: 'Laboratorio de aprendizado', completed: false },
      { id: 'task-qua-2', day: 'Quarta', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-qua-3', day: 'Quarta', title: 'Conferir: atendimento (whats, insta, email, financeiro (se preencheu planilha, pós-venda) vendas (renovações, vendas novas, visitas)', completed: false },
      { id: 'task-qua-4', day: 'Quarta', title: 'Estudar 30 min', completed: false },
      { id: 'task-qua-5', day: 'Quarta', title: 'Trabalhos esporádicos (olhar planko, cancelar roteiros, etc)', completed: false },
      { id: 'task-qua-6', day: 'Quarta', title: 'Serviços externos (COBRANÇA E VISITAS DE SUPERVISÃO)', completed: false },
      { id: 'task-qua-7', day: 'Quarta', title: 'Almoço', completed: false },
      { id: 'task-qua-8', day: 'Quarta', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-qua-9', day: 'Quarta', title: 'Financeiro (pagar contas e dar baixa no sistema)', completed: false },
      { id: 'task-qua-10', day: 'Quarta', title: 'Acompanhar operação', completed: false },
      { id: 'task-qua-11', day: 'Quarta', title: 'Preencher planilhas e fazer relatórios', completed: false },
      { id: 'task-qua-12', day: 'Quarta', title: 'Conferir as demanda da empresa e roteiro do dia', completed: false },

      // QUINTA (Thursday)
      { id: 'task-qui-1', day: 'Quinta', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-qui-2', day: 'Quinta', title: 'Conferir: atendimento (whats, insta, email, financeiro (se preencheu planilha, pós-venda) vendas (renovações, vendas novas, visitas)', completed: false },
      { id: 'task-qui-3', day: 'Quinta', title: 'Estudar 30 min', completed: false },
      { id: 'task-qui-4', day: 'Quinta', title: 'Trabalhos esporádicos (olhar planko, cancelar roteiros, etc)', completed: false },
      { id: 'task-qui-5', day: 'Quinta', title: 'Serviços externos (COBRANÇA E VISITAS DE SUPERVISÃO)', completed: false },
      { id: 'task-qui-6', day: 'Quinta', title: 'Almoço', completed: false },
      { id: 'task-qui-7', day: 'Quinta', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-qui-8', day: 'Quinta', title: 'Financeiro (pagar contas e dar baixa no sistema)', completed: false },
      { id: 'task-qui-9', day: 'Quinta', title: 'Acompanhar operação', completed: false },
      { id: 'task-qui-10', day: 'Quinta', title: 'Preencher planilhas e fazer relatórios', completed: false },
      { id: 'task-qui-11', day: 'Quinta', title: 'Conferir as demanda da empresa e roteiro do dia', completed: false },

      // SEXTA (Friday)
      { id: 'task-sex-1', day: 'Sexta', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-sex-2', day: 'Sexta', title: 'Reunião com sócios', completed: false },
      { id: 'task-sex-3', day: 'Sexta', title: 'Conferir: atendimento (whats, insta, email, financeiro (se preencheu planilha, pós-venda) vendas (renovações, vendas novas, visitas)', completed: false },
      { id: 'task-sex-4', day: 'Sexta', title: 'Estudar 30 min', completed: false },
      { id: 'task-sex-5', day: 'Sexta', title: 'Trabalhos esporádicos (olhar planko, cancelar roteiros, etc)', completed: false },
      { id: 'task-sex-6', day: 'Sexta', title: 'Serviços externos (COBRANÇA E VISITAS DE SUPERVISÃO)', completed: false },
      { id: 'task-sex-7', day: 'Sexta', title: 'Almoço', completed: false },
      { id: 'task-sex-8', day: 'Sexta', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-sex-9', day: 'Sexta', title: 'Financeiro (pagar contas e dar baixa no sistema)', completed: false },
      { id: 'task-sex-10', day: 'Sexta', title: 'Acompanhar operação', completed: false },
      { id: 'task-sex-11', day: 'Sexta', title: 'Preencher planilhas e fazer relatórios', completed: false },
      { id: 'task-sex-12', day: 'Sexta', title: 'Conferir as demanda da empresa e roteiro do dia', completed: false },

      // SÁBADO (Saturday)
      { id: 'task-sab-1', day: 'Sábado', title: 'Conferir roteiros marcados / ver com operadores planejamento do dia', completed: false },
      { id: 'task-sab-2', day: 'Sábado', title: 'Visitas de supervisão e cobrança', completed: false },

      // MENSAL (Monthly)
      { id: 'task-men-1', day: 'Mensal', title: '30 de cada mês: Levantamento do estoque', completed: false },
      { id: 'task-men-2', day: 'Mensal', title: '01 de cada mês: Cobrar as compras / feira e papelaria / Conferir estoque mínimo e fazer pedido TR', completed: false }
    ];
    const tasks = this.get<ManagerTask[]>('manager_tasks', defaultTasks);

    // Get Monday of the current week to detect week boundaries
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const currentWeekMondayStr = monday.toISOString().split('T')[0];

    const lastResetWeek = this.get<string>('checklist_last_reset_week', '');

    if (!lastResetWeek) {
      // First time setup, save the current Monday to avoid resetting immediately
      this.set('checklist_last_reset_week', currentWeekMondayStr);
    } else if (lastResetWeek !== currentWeekMondayStr) {
      // A new week started! Reset completed status of all tasks
      const resetTasks = tasks.map(t => ({ ...t, completed: false }));
      this.set('manager_tasks', resetTasks);
      this.set('checklist_last_reset_week', currentWeekMondayStr);
      return resetTasks;
    }

    return tasks;
  }

  static saveManagerTasks(tasks: ManagerTask[]): void {
    // Save completion status during the week
    this.set('manager_tasks', tasks);
  }
}
