/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AGRESTE_DB } from '../services/db';
import { ShieldCheck, UserPlus, LogIn, Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  theme: 'light' | 'dark';
}

export default function LoginScreen({ onLoginSuccess, showToast, theme }: LoginScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const logoUrl = 'https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        showToast('As senhas não coincidem.', 'error');
        return;
      }
      if (password.length < 4) {
        showToast('A senha precisa ter no mínimo 4 caracteres.', 'error');
        return;
      }

      const success = AGRESTE_DB.registerUser(username, password);
      if (success) {
        showToast('Usuário cadastrado com sucesso! Faça login.', 'success');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        showToast('Este usuário já existe.', 'error');
      }
    } else {
      const authResult = AGRESTE_DB.validateUser(username, password);
      if (authResult.valid) {
        showToast(`Bem-vindo, ${username}!`, 'success');
        onLoginSuccess(username);
      } else {
        showToast(authResult.message || 'Credenciais incorretas.', 'error');
      }
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-6 ${
        theme === 'dark' ? 'bg-[#0F0F0F] text-white' : 'bg-zinc-50 text-zinc-900'
      }`}
      style={{
        backgroundImage: theme === 'dark' 
          ? 'radial-gradient(circle at 10% 20%, rgba(211, 84, 0, 0.08) 0%, transparent 40%)'
          : 'radial-gradient(circle at 10% 20%, rgba(211, 84, 0, 0.04) 0%, transparent 40%)'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md rounded-2xl border p-8 shadow-2xl transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-[#1A1A1A] border-[#242424] backdrop-blur-md'
            : 'bg-white border-zinc-200 shadow-zinc-200/50'
        }`}
      >
        <div className="flex flex-col items-center text-center mb-8">
          {/* Logo element with custom direct URL decoration */}
          <div className="relative group mb-4">
            <div className="absolute -inset-1 rounded-full bg-[#D35400] blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <img
              referrerPolicy="no-referrer"
              src={logoUrl}
              alt="AGRESTE Logo"
              className="relative w-24 h-24 rounded-full object-cover border-2 border-[#D35400] shadow-xl"
            />
          </div>

          <h1 className="text-4xl font-bold font-display tracking-tight text-[#D35400]">
            AGRESTE
          </h1>
          <p className="text-xs font-medium uppercase tracking-[0.2em] mt-1 text-zinc-500 font-mono">
            saúde ambiental
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
              Usuário / Operador
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <UserIcon className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Insira o nome de usuário"
                id="username-input"
                className={`w-full py-3 pl-10 pr-4 rounded-xl border text-sm outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#D35400] focus:ring-1 focus:ring-[#D35400]'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400] focus:ring-1 focus:ring-[#D35400]'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                id="password-input"
                className={`w-full py-3 pl-10 pr-4 rounded-xl border text-sm outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#D35400] focus:ring-1 focus:ring-[#D35400]'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400] focus:ring-1 focus:ring-[#D35400]'
                }`}
              />
            </div>
          </div>

          {isRegister && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                Confirmar Senha
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  id="confirm-password-input"
                  className={`w-full py-3 pl-10 pr-4 rounded-xl border text-sm outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#D35400] focus:ring-1 focus:ring-[#D35400]'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400] focus:ring-1 focus:ring-[#D35400]'
                  }`}
                />
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            id="login-submit-btn"
            className="w-full py-3 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#D35400]/10 hover:shadow-[#D35400]/25 flex items-center justify-center gap-2 cursor-pointer transition-transform duration-100 active:scale-[0.98]"
          >
            {isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> Cadastrar Acesso
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Entrar no Painel
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-800/10 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setPassword('');
              setConfirmPassword('');
            }}
            id="toggle-register-btn"
            className="text-xs text-[#D35400] hover:text-[#FC6B0A] hover:underline cursor-pointer"
          >
            {isRegister
              ? 'Já possui uma conta? Entrar agora'
              : 'Não possui credenciais? Cadastrar operador'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
