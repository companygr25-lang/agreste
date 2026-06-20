/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AGRESTE_DB } from '../services/db';
import { 
  ShieldCheck, UserPlus, LogIn, Lock, User as UserIcon, 
  MessageSquare, Sparkles, Building, Phone, MapPin, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
  onClientLoginSuccess: (client: { id: string; name: string; responsible: string; phone: string; city: string; isNew: boolean }) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  theme: 'light' | 'dark';
}

export default function LoginScreen({ 
  onLoginSuccess, onClientLoginSuccess, showToast, theme 
}: LoginScreenProps) {
  // Toggle between Tech Login and Client Chat portal
  const [activeSegment, setActiveSegment] = useState<'tech' | 'client'>('tech');

  // --- TECHNICIAN STATES ---
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cargo, setCargo] = useState<'técnico' | 'gerente' | 'supervisor de operações'>('técnico');

  // --- CLIENT STATES ---
  // Subview inside CLIENT: 'login' | 'register' | 'completing_profile'
  const [clientSubState, setClientSubState] = useState<'login' | 'register' | 'completing_profile'>('login');
  
  // Client Fast Login inputs (Established Client)
  const [responsibleInput, setResponsibleInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Client Signup inputs
  const [clientUsername, setClientUsername] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Client Profile Completion form fields
  const [companyName, setCompanyName] = useState('');
  const [companyResponsible, setCompanyResponsible] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  const logoUrl = 'https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg';

  // Tech Login form submit
  const handleTechSubmit = (e: React.FormEvent) => {
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

      const success = AGRESTE_DB.registerUser(username, password, cargo);
      if (success) {
        showToast('Cadastro realizado com sucesso! Aguarde liberação do administrador.', 'success');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        showToast('Este usuário de operador já existe.', 'error');
      }
    } else {
      let deviceId = localStorage.getItem('agreste_device_id');
      if (!deviceId) {
        deviceId = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
        localStorage.setItem('agreste_device_id', deviceId);
      }

      const authResult = AGRESTE_DB.validateUser(username, password, deviceId);
      if (authResult.valid) {
        showToast(`Bem-vindo ao Painel Técnico, ${username}!`, 'success');
        onLoginSuccess(username);
      } else {
        showToast(authResult.message || 'Credenciais de operador incorretas.', 'error');
      }
    }
  };

  // Client portal form submit (Existing Client)
  const handleClientLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!responsibleInput.trim() || !phoneInput.trim()) {
      showToast('Preencha seu nome e contato para acesso.', 'error');
      return;
    }

    const clients = AGRESTE_DB.getClients();
    const accounts = AGRESTE_DB.getClientChatAccounts();
    const rawInput = responsibleInput.trim();
    const cleanResponsibleInput = rawInput.toLowerCase();
    const collapsedInput = cleanResponsibleInput.replace(/\s/g, '');
    const cleanPhoneInput = phoneInput.replace(/\D/g, ''); // just digits

    // Let's find matches in clients database first (by responsible person, company name, or phone)
    let foundClient = clients.find(c => {
      const cResp = c.responsible ? c.responsible.toLowerCase() : '';
      const cName = c.name ? c.name.toLowerCase() : '';
      
      const respMatch = cResp === cleanResponsibleInput || cResp.replace(/\s/g, '') === collapsedInput;
      const nameMatch = cName === cleanResponsibleInput || cName.replace(/\s/g, '') === collapsedInput;
      
      const cPhoneDigits = c.phone ? c.phone.replace(/\D/g, '') : '';
      const phoneMatch = cPhoneDigits && cleanPhoneInput && (cPhoneDigits.includes(cleanPhoneInput) || cleanPhoneInput.includes(cPhoneDigits));
      
      return respMatch || nameMatch || phoneMatch;
    });

    // If client is still not found in client database, search in chat accounts record (accounts)
    // to see if we have a match on username, responsible, or phone
    if (!foundClient) {
      let matchedAccKey: string | null = null;
      let matchedAcc: any = null;

      for (const [usrName, acc] of Object.entries(accounts)) {
        const usrMatch = usrName.toLowerCase().replace(/\s/g, '') === collapsedInput;
        const accResp = acc.responsible ? acc.responsible.toLowerCase() : '';
        const accRespMatch = accResp === cleanResponsibleInput || accResp.replace(/\s/g, '') === collapsedInput;
        const accName = acc.name ? acc.name.toLowerCase() : '';
        const accNameMatch = accName === cleanResponsibleInput || accName.replace(/\s/g, '') === collapsedInput;
        const accPhoneDigits = acc.phone ? acc.phone.replace(/\D/g, '') : '';
        const accPhoneMatch = accPhoneDigits && cleanPhoneInput && (accPhoneDigits.includes(cleanPhoneInput) || cleanPhoneInput.includes(accPhoneDigits));

        if (usrMatch || accRespMatch || accNameMatch || accPhoneMatch) {
          matchedAccKey = usrName;
          matchedAcc = acc;
          break;
        }
      }

      if (matchedAcc) {
        // Self-heal: Create missing Client record from the existing chat credentials
        foundClient = AGRESTE_DB.addClient({
          name: matchedAcc.name || 'Empresa Recuperada',
          responsible: matchedAcc.responsible || matchedAccKey || 'Responsável',
          city: matchedAcc.city || 'Caruaru',
          phone: matchedAcc.phone || phoneInput.trim(),
          paymentStatus: 'pendente',
          size: 'pequeno',
          isPendingConfirmation: true
        });
        showToast('Cadastro localizado e sincronizado com sucesso!', 'success');
      }
    }

    if (foundClient) {
      // Recognized as established client!
      const loggedInfo = {
        id: foundClient.id,
        name: foundClient.name,
        responsible: foundClient.responsible,
        phone: phoneInput.trim() || foundClient.phone || '',
        city: foundClient.city,
        isNew: false
      };
      
      localStorage.setItem('agreste_logged_client', JSON.stringify(loggedInfo));
      onClientLoginSuccess(loggedInfo);
      showToast(`Bem-vindo de volta, ${foundClient.responsible}! Portal de atendimento aberto.`, 'success');
    } else {
      showToast('Cadastro de cliente não localizado na base. Se for um cadastro novo, clique abaixo para fazer seu cadastro gratuito!', 'error');
    }
  };

  // Client Register submit (creates user, telephone, then pushes to Profile form)
  const handleClientRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientUsername.trim() || !clientPassword.trim() || !clientPhone.trim()) {
      showToast('Preencha todas as credenciais básicas.', 'error');
      return;
    }

    if (clientPassword.length < 4) {
      showToast('A senha precisa conter ao menos 4 caracteres.', 'error');
      return;
    }

    const accounts = AGRESTE_DB.getClientChatAccounts();
    const cleanUsr = clientUsername.toLowerCase().trim();

    if (accounts[cleanUsr]) {
      const clients = AGRESTE_DB.getClients();
      const associatedClient = clients.find(c => {
        const cResp = c.responsible ? c.responsible.toLowerCase().trim() : '';
        const cPhoneDigits = c.phone ? c.phone.replace(/\D/g, '') : '';
        const acc = accounts[cleanUsr];
        const accResp = acc.responsible ? acc.responsible.toLowerCase().trim() : '';
        const accPhone = acc.phone ? acc.phone.replace(/\D/g, '') : '';
        
        return cResp === cleanUsr || cResp === accResp || (cPhoneDigits && accPhone && (cPhoneDigits.includes(accPhone) || accPhone.includes(cPhoneDigits)));
      });

      if (!associatedClient) {
        // Orphan account! Self-heal: Delete it so the user can register again
        delete accounts[cleanUsr];
        AGRESTE_DB.saveClientChatAccounts(accounts);
      } else {
        showToast('Este nome de usuário de atendimento já está em uso.', 'error');
        return;
      }
    }

    // Move to Step 2: Information form asking for Company, Responsible, City, Phone
    setCompanyPhone(clientPhone);
    setCompanyResponsible(clientUsername);
    setClientSubState('completing_profile');
    showToast('Acesso básico criado! Preencha a ficha de cadastro para abrir o chat.', 'info');
  };

  // Client Profile completeness submit (concludes signup & logs in)
  const handleClientProfileCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim() || !companyResponsible.trim() || !companyCity.trim() || !companyPhone.trim()) {
      showToast('Preencha todos os dados da sua empresa ou residência.', 'error');
      return;
    }

    // 1. Add them as an official active client in clients database!
    const newClient = AGRESTE_DB.addClient({
      name: companyName.trim(),
      responsible: companyResponsible.trim(),
      city: companyCity.trim(),
      phone: companyPhone.trim(),
      paymentStatus: 'pendente', // default pending payment
      size: 'pequeno', // default size
      isPendingConfirmation: true // Highlight on the technician clients screen!
    });

    // 2. Persist their chat access credentials with linked profiling data
    const accounts = AGRESTE_DB.getClientChatAccounts();
    const cleanUsr = clientUsername.toLowerCase().trim();
    accounts[cleanUsr] = {
      password: clientPassword,
      phone: companyPhone.trim(),
      name: companyName.trim(),
      responsible: companyResponsible.trim(),
      city: companyCity.trim(),
      isRegistered: true
    };
    AGRESTE_DB.saveClientChatAccounts(accounts);

    // 3. Log them in automatically!
    const loggedInfo = {
      id: newClient.id,
      name: companyName.trim(),
      responsible: companyResponsible.trim(),
      phone: companyPhone.trim(),
      city: companyCity.trim(),
      isNew: true
    };

    localStorage.setItem('agreste_logged_client', JSON.stringify(loggedInfo));
    onClientLoginSuccess(loggedInfo);
    showToast(`Parceria Iniciada! Chat de suporte aberto para ${companyName}.`, 'success');
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 sm:p-6 ${
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
        className={`w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-[#1A1A1A] border-[#242424] backdrop-blur-md'
            : 'bg-white border-zinc-200 shadow-zinc-200/50'
        }`}
      >
        <div className="flex flex-col items-center text-center mb-6">
          {/* Logo element with custom direct URL decoration */}
          <div className="relative group mb-3">
            <div className="absolute -inset-1 rounded-full bg-[#D35400] blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <img
              referrerPolicy="no-referrer"
              src={logoUrl}
              alt="AGRESTE Logo"
              className="relative w-20 h-20 rounded-full object-cover border-2 border-[#D35400] shadow-xl"
            />
          </div>

          <h1 className="text-3xl font-black font-display tracking-tight text-[#D35400] leading-none">
            AGRESTE
          </h1>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] mt-1.5 text-zinc-500 font-mono">
            saúde ambiental
          </p>
        </div>

        {/* ─── TECHNICAL / OPERATOR WORKSPACE LOGIN ─── */}
        <form onSubmit={handleTechSubmit} className="space-y-4" id="login-form">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400 text-left">
              Usuário / Operador
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome cadastrado"
                id="username-input"
                className={`w-full py-2.5 pl-9 pr-3.5 rounded-xl border text-xs outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#D35400]'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400 text-left">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                id="password-input"
                className={`w-full py-2.5 pl-9 pr-3.5 rounded-xl border text-xs outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#D35400]'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                }`}
              />
            </div>
          </div>

          {isRegister && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400 text-left">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    id="confirm-password-input"
                    className={`w-full py-2.5 pl-9 pr-3.5 rounded-xl border text-xs outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#D35400]'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-905 focus:bg-white focus:border-[#D35400]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400 text-left">
                  Função / Cargo Operacional
                </label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value as any)}
                  id="cargo-select"
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-zinc-950 border-zinc-200 text-white focus:border-[#D35400]'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                  }`}
                >
                  <option value="técnico" className={theme === 'dark' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}>Técnico</option>
                  <option value="gerente" className={theme === 'dark' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}>Gerente</option>
                  <option value="supervisor de operações" className={theme === 'dark' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}>Supervisor de Operações</option>
                </select>
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            id="login-submit-btn"
            className="w-full py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-xs font-bold uppercase rounded-xl shadow-lg shadow-[#D35400]/10 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> Registrar Acesso Técnico
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Entrar no Painel Técnico
              </>
            )}
          </button>

          <div className="pt-4 border-t border-zinc-805/40 dark:border-zinc-900 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-xs text-[#D35400] hover:text-[#FC6B0A] hover:underline cursor-pointer"
            >
              {isRegister
                ? 'Já é operador? Conectar ao Painel'
                : 'Trabalha conosco? Solicitar Acesso como Técnico'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
