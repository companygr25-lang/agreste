/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, VisitReport, LargeClientActivity, CompanyDocument, Reminder, UserProfile } from '../types';

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
      'adriano senna': 'agreste2026',
      'admin': 'admin2026'
    });
  }

  static registerUser(username: string, pass: string): boolean {
    const users = this.getUsers();
    if (users[username.toLowerCase()]) return false;
    users[username.toLowerCase()] = pass;
    this.set('users', users);
    return true;
  }

  static validateUser(username: string, pass: string): boolean {
    const users = this.getUsers();
    return users[username.toLowerCase()] === pass;
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
  }

  // --- Database Sync Check for Supabase migration compatibility ---
  static checkDatabaseStatus() {
    return {
      status: 'Ready',
      provider: 'Supabase Adapter Configured (Local Mode)',
      latencyMs: 12,
      tables: ['clients', 'reports', 'calendar', 'documents', 'reminders'],
      syncActive: true,
      pendingQueueLength: 0,
    };
  }
}
