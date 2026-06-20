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
  cargo?: string;
}

export interface SystemUserDetail {
  username: string;
  name: string;
  status: 'pending' | 'approved' | 'blocked';
  paymentStatus: PaymentStatus;
  paymentValue: number;
  allowedTabs: string[];
  canEditData?: boolean;
  cargo?: 'técnico' | 'gerente' | 'supervisor de operações';
  allowedDevices?: string[];
}

export interface Client {
  id: string;
  code: string; // e.g. "001"
  name: string; // Favorecido
  city: string;
  responsible: string;
  phone?: string;
  paymentStatus: PaymentStatus;
  size: 'grande' | 'pequeno';
  createdAt: string;
  isPendingConfirmation?: boolean;
  billingValue?: number;
  dueDay?: number;
  createdBy?: string;
  createdBy_name?: string;
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
  createdBy?: string;
  createdBy_name?: string;
}

export interface LargeClientActivity {
  id: string;
  clientId: string;
  clientName: string;
  scheduledWeekday: string; // e.g., "Segunda-feira"
  visitDate: string; // actual date of visit
  observations: string;
  situation: 'antes_prazo' | 'no_prazo' | 'atrasado' | 'pendente';
  createdBy?: string;
  createdBy_name?: string;
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

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'client' | 'technician';
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface ChatSession {
  id: string; // client reference or random
  clientUsername: string; // matches account in client environment or "guest-..."
  clientName: string;
  clientPhone: string;
  clientCity: string;
  responsibleName: string;
  isNewClient: boolean;
  assignedTech?: string; // technician username
  status: 'bot' | 'tech_requested' | 'active_with_tech' | 'rating';
  messages: ChatMessage[];
  lastUpdated: string;
  unreadCount?: number;
}

export interface FloatingNotification {
  id: string;
  type: 'chat_request' | 'new_registration';
  title: string;
  message: string;
  clientName: string;
  clientId: string;
  chatId?: string;
  targetTech?: string; // technician username if specified
  acceptedBy?: string; // which technician accepted this
  status: 'pending' | 'accepted' | 'dismissed';
  createdAt: string;
  dismissedBy?: string[];
}

export type WeekdayUnion = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Mensal';

export interface ManagerTask {
  id: string;
  day: WeekdayUnion;
  title: string;
  completed: boolean;
  notes?: string;
  isCustom?: boolean;
  plannedTime?: string;
  startTime?: string;
  endTime?: string;
  details?: string;
}

