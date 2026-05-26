import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MessageSquare, AlertCircle, Check, Users } from 'lucide-react';
import { AGRESTE_DB } from '../services/db';
import { FloatingNotification } from '../types';

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

  const activeNotifs = notifications.filter(notif => {
    // 1. Filter out locally closed notifications
    if (localDismissed.includes(notif.id)) return false;

    // Filter out if user dismissed it globally
    const lowerUser = currentUser.toLowerCase().trim();
    if (notif.dismissedBy?.includes(lowerUser)) return false;

    // 2. Filter out globally dismissed notifications
    if (notif.status === 'dismissed') return false;

    // 3. Match user types
    if (notif.type === 'chat_request') {
      return notif.targetTech?.toLowerCase().trim() === lowerUser;
    }
    
    if (notif.type === 'new_registration') {
      return true; // Visible to all technicians
    }

    return false;
  });

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
