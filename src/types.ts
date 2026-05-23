/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PaymentStatus = 'pago' | 'pendente';

export type PestStatus = 'sem_necessidade' | 'realizando' | 'realizado';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  phone: string;
  photoUrl: string;
}

export interface SystemUserDetail {
  username: string;
  name: string;
  status: 'pending' | 'approved' | 'blocked';
  paymentStatus: PaymentStatus;
  paymentValue: number;
  allowedTabs: string[];
  canEditData?: boolean;
}

export interface Client {
  id: string;
  code: string; // e.g. "001"
  name: string; // Favorecido
  city: string;
  responsible: string;
  paymentStatus: PaymentStatus;
  size: 'grande' | 'pequeno';
  createdAt: string;
}

export interface PestControl {
  moscas: PestStatus;
  baratas: PestStatus;
  ratos: PestStatus;
  formigas: PestStatus;
}

export interface VisitReport {
  id: string;
  clientId: string;
  clientName: string;
  clientCity: string;
  month: string;
  date: string;
  techName: string;
  punctuality: number; // 0 to 10
  communication: number; // 0 to 10
  pests: PestControl;
  recommendations: string;
  satisfaction: string; // text or rating scale (e.g. "Excelente", "Bom", etc.)
  comments: string;
  referrals: string; // indicações
  createdAt: string;
}

export interface LargeClientActivity {
  id: string;
  clientId: string;
  clientName: string;
  scheduledWeekday: string; // e.g., "Segunda-feira"
  visitDate: string; // actual date of visit
  observations: string;
  situation: 'antes_prazo' | 'no_prazo' | 'atrasado' | 'pendente';
}

export interface CompanyDocument {
  id: string;
  name: string;
  date: string;
  nextUpdateDate: string;
  status: 'ok' | 'pendente';
}

export interface Reminder {
  id: string;
  title: string;
  time: string;
  completed: boolean;
}

export interface AppState {
  theme: 'light' | 'dark';
  currentTab: string;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}
