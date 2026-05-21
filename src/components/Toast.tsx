/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      bg: 'bg-zinc-900 border-orange-500 text-white',
      icon: <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />,
      barColor: 'bg-orange-500',
    },
    error: {
      bg: 'bg-zinc-900 border-red-500 text-white',
      icon: <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />,
      barColor: 'bg-red-500',
    },
    info: {
      bg: 'bg-zinc-950 border-zinc-700 text-white',
      icon: <Info className="w-5 h-5 text-zinc-400 shrink-0" />,
      barColor: 'bg-zinc-500',
    },
  };

  const currentConfig = config[type] || config.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      id={`toast-${type}`}
      className={`fixed bottom-6 right-6 z-50 flex flex-col min-w-xs max-w-sm rounded-lg border shadow-xl overflow-hidden ${currentConfig.bg}`}
    >
      <div className="flex items-center gap-3 p-4">
        {currentConfig.icon}
        <p className="text-sm font-medium pr-4">{message}</p>
        <button
          onClick={onClose}
          id="toast-close-btn"
          className="ml-auto text-zinc-400 hover:text-white rounded-full p-1 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
        className={`h-[3px] w-full ${currentConfig.barColor}`}
      />
    </motion.div>
  );
}
