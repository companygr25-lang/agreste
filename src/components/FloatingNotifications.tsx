import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MessageSquare, AlertCircle, Check, Users } from 'lucide-react';
import { AGRESTE_DB } from '../services/db';
import { FloatingNotification, WeekdayUnion } from '../types';

interface FloatingNotificationsProps {
  currentUser: string;
  setActiveTab: (tab: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function FloatingNotifications({
  currentUser,
  setActiveTab,
  showToast
}: FloatingNotificationsProps) {
  const [notifications, setNotifications] = useState<FloatingNotification[]>(() => AGRESTE_DB.getNotifications());
  const [localDismissed, setLocalDismissed] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('agreste_locally_dismissed_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State to track floating notifications already displayed in a previous session
  const [sessionAlreadySeenFloating] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('agreste_seen_floating_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const playedNotifsRef = useRef<Set<string>>(new Set());

  // Populate initially known notification IDs on mount
  useEffect(() => {
    const initialNotifs = AGRESTE_DB.getNotifications();
    initialNotifs.forEach(n => playedNotifsRef.current.add(n.id));
  }, []);

  // Sync with real-time database updates
  useEffect(() => {
    const handleSync = () => {
      setNotifications(AGRESTE_DB.getNotifications());
    };
    return AGRESTE_DB.subscribeToRealtime(handleSync);
  }, []);

  // Watch for new incoming relevant notifications and play notification sound
  useEffect(() => {
    const lowerUser = currentUser.toLowerCase().trim();
    let shouldPlay = false;

    notifications.forEach(notif => {
      // If we already saw/processed this one, skip
      if (playedNotifsRef.current.has(notif.id)) return;

      // Mark as seen so we don't play/assess it again
      playedNotifsRef.current.add(notif.id);

      // Check if it is currently active is not dismissed locally/globally
      if (localDismissed.includes(notif.id)) return;
      if (notif.status === 'dismissed') return;

      let isRelevant = false;
      if (notif.type === 'chat_request') {
        isRelevant = notif.targetTech?.toLowerCase().trim() === lowerUser;
      } else if (notif.type === 'new_registration') {
        isRelevant = true;
      }

      if (isRelevant) {
        shouldPlay = true;
      }
    });

    if (shouldPlay) {
      try {
        const audio = new Audio('https://www.image2url.com/r2/default/audio/1779643438140-5768f505-6746-43a6-bc97-5162d73af79a.mp3');
        audio.play().catch(e => {
          // Normal browser autoplay block, handled gracefully
          console.warn('Notification audio autoplay prevented or failed:', e);
        });
      } catch (err) {
        console.error('Failed to play notification audio:', err);
      }
    }
  }, [notifications, currentUser, localDismissed]);

  // Hourly background scheduler for Checklist reminders (business hours: 08:00 - 18:00)
  useEffect(() => {
    if (!currentUser) return;

    // Proactively request browser Notification Permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(err => {
          console.warn('Notification permission request denied or failed:', err);
        });
      }
    }

    const checkAndNotifyChecklist = () => {
      const now = new Date();
      const hours = now.getHours();

      // Commercial/business hours check: 08:00 to 18:00 (8h to 17h inclusive, no triggers at 18:00 or after)
      if (hours < 8 || hours >= 18) {
        return;
      }

      // Identify if the active user is a Manager or Supervisor
      const userDetails = AGRESTE_DB.getUserDetails();
      const currentDetails = userDetails[currentUser.toLowerCase().trim()];
      const profile = AGRESTE_DB.getProfile();
      const cargoText = (profile?.cargo || currentDetails?.cargo || '').toLowerCase();
      const isManager = currentUser.toLowerCase().trim() === 'adriano senna' || 
                        cargoText.includes('gerente') || 
                        cargoText.includes('supervisor');

      if (!isManager) {
        return;
      }

      // Check current day of current week
      const dayMap: { [key: number]: WeekdayUnion } = {
        1: 'Segunda',
        2: 'Terça',
        3: 'Quarta',
        4: 'Quinta',
        5: 'Sexta',
        6: 'Sábado'
      };
      const todayCode = now.getDay();
      const todayDayName = dayMap[todayCode];

      // Retrieve all checklist tasks
      const allTasks = AGRESTE_DB.getManagerTasks();
      // Filter tasks matching today's weekday plus Monthly tasks
      const todaysTasks = allTasks.filter(t => t.day === todayDayName || t.day === 'Mensal');
      const pendingTasks = todaysTasks.filter(t => !t.completed);

      // Only notify if there are pending check items
      if (pendingTasks.length === 0) {
        return;
      }

      // Check when the last notification was sent to enforce the strict 1-hour frequency limit
      const lastNotifiedStr = localStorage.getItem('agreste_checklist_reminder_last_time');
      const lastNotified = lastNotifiedStr ? Number(lastNotifiedStr) : 0;
      const oneHourMs = 60 * 60 * 1000;

      if (Date.now() - lastNotified >= oneHourMs) {
        const title = 'Checklist Pendente 🎯';
        const message = `Atenção: Você possui ${pendingTasks.length} tarefa(s) pendente(s) no checklist de hoje. Toque para conferir!`;

        // 1. Show in-app notice
        showToast(message, 'info');

        // 2. Play subtle notification sound
        try {
          const audio = new Audio('https://www.image2url.com/r2/default/audio/1779643438140-5768f505-6746-43a6-bc97-5162d73af79a.mp3');
          audio.play().catch(() => {});
        } catch {}

        // 3. Desktop / Mobile system-level notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const systemNotif = new Notification(title, {
              body: message,
              icon: 'https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg',
              tag: 'agreste-checklist-reminder'
            });
            systemNotif.onclick = () => {
              window.focus();
              setActiveTab('gerencia');
            };
          } catch (e) {
            console.warn('Web notification instantiation failed, falling back:', e);
          }
        }

        // Set persistent trigger marker timestamp to local storage
        localStorage.setItem('agreste_checklist_reminder_last_time', String(Date.now()));
      }
    };

    // Evaluate right now
    checkAndNotifyChecklist();

    // Check periodically every 30 seconds
    const intervalId = setInterval(checkAndNotifyChecklist, 30000);
    return () => clearInterval(intervalId);
  }, [currentUser, setActiveTab]);

  const dismissLocally = (id: string) => {
    // Save to user database record so it synchronizes and never shows up for this user on any device
    AGRESTE_DB.dismissNotificationForUser(id, currentUser);

    const updated = [...localDismissed, id];
    setLocalDismissed(updated);
    try {
      localStorage.setItem('agreste_locally_dismissed_notifications', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = (notif: FloatingNotification) => {
    const lowerUser = currentUser.toLowerCase().trim();
    const result = AGRESTE_DB.tryAcceptNotification(notif.id, lowerUser);

    if (result.success) {
      showToast('Atendimento aceito com sucesso!', 'success');

      if (notif.type === 'chat_request' && notif.chatId) {
        // Automatically make sure the chat is assigned and active
        const chats = AGRESTE_DB.getChats();
        const updatedChats = chats.map(c => {
          if (c.id === notif.chatId) {
            return {
              ...c,
              assignedTech: lowerUser,
              status: 'active_with_tech' as const
            };
          }
          return c;
        });
        AGRESTE_DB.saveChats(updatedChats);

        // Queue active chat ID in localStorage for AgresteChat
        localStorage.setItem('agreste_active_chat_id', notif.chatId);
        setActiveTab('agreste-chat');
      } else if (notif.type === 'new_registration') {
        // Redirection to Clients Tab to view status
        setActiveTab('clientes');
      }
    } else {
      // Fail state: Inform that someone else already took the client!
      showToast(result.message, 'error');
    }

    // Always dismiss locally so it immediately disappears on interaction
    dismissLocally(notif.id);
  };

  const activeNotifs = useMemo(() => {
    return notifications.filter(notif => {
      // 1. Filter out locally closed notifications
      if (localDismissed.includes(notif.id)) return false;

      // Filter out if user dismissed it globally
      const lowerUser = currentUser.toLowerCase().trim();
      if (notif.dismissedBy?.includes(lowerUser)) return false;

      // 2. Filter out globally dismissed notifications
      if (notif.status === 'dismissed') return false;

      // 3. Filter out notifications that were already seen before this session started
      if (sessionAlreadySeenFloating.includes(notif.id)) return false;

      // 4. Match user types
      if (notif.type === 'chat_request') {
        return notif.targetTech?.toLowerCase().trim() === lowerUser;
      }
      
      if (notif.type === 'new_registration') {
        return true; // Visible to all technicians
      }

      return false;
    });
  }, [notifications, localDismissed, currentUser, sessionAlreadySeenFloating]);

  // Save actively floating notifications as seen in localStorage so they don't float ever again
  useEffect(() => {
    if (activeNotifs.length > 0) {
      try {
        const saved = localStorage.getItem('agreste_seen_floating_notifications');
        const seenList: string[] = saved ? JSON.parse(saved) : [];
        let updated = false;
        
        activeNotifs.forEach(n => {
          if (!seenList.includes(n.id)) {
            seenList.push(n.id);
            updated = true;
          }
        });
        
        if (updated) {
          localStorage.setItem('agreste_seen_floating_notifications', JSON.stringify(seenList));
        }
      } catch (e) {
        console.error('Error saving seen floating notifications:', e);
      }
    }
  }, [activeNotifs]);

  if (activeNotifs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm px-4 sm:px-0">
      <AnimatePresence>
        {activeNotifs.map((notif) => {
          const isChatReq = notif.type === 'chat_request';
          
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 relative text-left overflow-hidden group select-none"
              style={{
                boxShadow: isChatReq 
                  ? '0 20px 25px -5px rgba(211, 84, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                  : '0 20px 25px -5px rgba(16, 185, 129, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Highlight bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                isChatReq ? 'bg-gradient-to-r from-orange-600 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`} />

              <div className="flex gap-3 items-start pr-6">
                <div className={`p-2 rounded-xl shrink-0 ${
                  isChatReq ? 'bg-orange-600/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {isChatReq ? <MessageSquare className="w-5 h-5 animate-pulse" /> : <Users className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 leading-snug">
                    {notif.title}
                    {!isChatReq && (
                      <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-0.5 px-1 rounded-sm uppercase font-extrabold tracking-wider shrink-0">GERAL</span>
                    )}
                    {isChatReq && (
                      <span className="text-[8px] bg-orange-500/10 border border-orange-500/20 text-orange-400 py-0.5 px-1 rounded-sm uppercase font-extrabold tracking-wider shrink-0">DIRETO</span>
                    )}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 justify-end mt-1 border-t border-zinc-900/40 pt-2.5">
                <button
                  type="button"
                  onClick={() => dismissLocally(notif.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  Dispensar
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(notif)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold text-white flex items-center gap-1 transition-all cursor-pointer shadow ${
                    isChatReq 
                      ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/10' 
                      : 'bg-emerald-600 hover:bg-emerald-555 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {isChatReq ? 'Iniciar Suporte' : 'Visualizar Cadastro'}
                </button>
              </div>

              {/* Close corner icon button */}
              <button
                type="button"
                onClick={() => dismissLocally(notif.id)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                aria-label="Fecar notificação"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
