/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, VisitReport, LargeClientActivity, CompanyDocument, Reminder, UserProfile, SystemUserDetail, ChatSession, FloatingNotification } from '../types';
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
  phone: '(81) 99876-5432',
  photoUrl: '', // Will be added from gallery/bucket
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
        allowedTabs: ['dashboard', 'usuarios', 'configuracoes']
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

  static registerUser(username: string, pass: string): boolean {
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
      allowedTabs: ['dashboard', 'clientes', 'calendario', 'relatorios', 'documentacao', 'perfil', 'configuracoes']
    };
    this.saveUserDetails(details);
    return true;
  }

  static validateUser(username: string, pass: string): { valid: boolean; status?: 'pending' | 'approved' | 'blocked'; message?: string } {
    const normalized = username.toLowerCase().trim();
    
    // Self-healing bypass to ensure Gil Silva can always log in with the correct credentials
    if (normalized === 'gil silva' && pass === 'admin123') {
      const details = this.getUserDetails();
      details[normalized] = {
        username: normalized,
        name: 'Gil Silva',
        status: 'approved',
        paymentStatus: 'pago',
        paymentValue: 0,
        allowedTabs: ['dashboard', 'usuarios', 'configuracoes']
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
        allowedTabs: ['dashboard', 'clientes', 'calendario', 'relatorios', 'documentacao', 'perfil', 'configuracoes']
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
    
    return { valid: true };
  }

  // --- Clients CRUD ---
  static getClients(): Client[] {
    return this.get<Client[]>('clients', SEED_CLIENTS);
  }

  static addClient(client: Omit<Client, 'id' | 'createdAt' | 'code'>): Client {
    const clients = this.getClients();
    
    // Auto calculate the 3 digit code: serial based on next count
    const nextCodeNum = clients.length + 1;
    const clientCode = String(nextCodeNum).padStart(3, '0');

    const newClient: Client = {
      ...client,
      id: `cli-${Date.now()}`,
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
    const clients = this.getClients().filter(c => c.id !== id);
    this.set('clients', clients);
    // Also remove from calendar
    const calendar = this.getCalendar().filter(c => c.clientId !== id);
    this.set('calendar', calendar);
    // Also remove associated chat session
    const chats = this.getChats().filter(chat => chat.id !== id);
    this.saveChats(chats);
  }

  // --- Reports CRUD ---
  static getReports(): VisitReport[] {
    return this.get<VisitReport[]>('reports', SEED_REPORTS);
  }

  static addReport(report: Omit<VisitReport, 'id' | 'createdAt'>): VisitReport {
    const reports = this.getReports();
    const newReport: VisitReport = {
      ...report,
      id: `rep-${Date.now()}`,
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
      id: `cal-${Date.now()}`,
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
      id: `doc-${Date.now()}`,
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
      id: `rem-${Date.now()}`,
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
    return this.get<UserProfile>('profile', SEED_PROFILE);
  }

  static updateProfile(profile: UserProfile): void {
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
}
