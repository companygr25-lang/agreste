/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AGRESTE_DB } from '../services/db';
import { 
  ShieldCheck, UserPlus, LogIn, Lock, User as UserIcon, 
  MessageSquare, Sparkles, Building, Phone, MapPin, ArrowRight,
  Shield, Activity, Leaf, Droplet, Check, CheckSquare, Square,
  HelpCircle, ClipboardCheck, Award, Flame, Eye, EyeOff
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

  const [rememberMe, setRememberMe] = useState(false);

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
      className="min-h-screen w-full text-zinc-900 flex flex-col lg:flex-row font-sans bg-[#F4F4F5] overflow-x-hidden"
      id="login-page-container"
    >
      {/* INSTITUTIONAL PANEL (Top on mobile, Right on desktop) */}
      <div className="w-full lg:w-[68%] xl:w-[70%] h-[38vh] sm:h-[45vh] lg:h-screen bg-zinc-950 relative overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-16 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-900 z-10">
        {/* Background Image of the premium environmental health dashboard */}
        <div className="absolute inset-0 z-0">
          <img
            referrerPolicy="no-referrer"
            src="/src/assets/images/agreste_environmental_health_dashboard_1783599659130.jpg"
            alt="Agreste Gestão Inteligente em Saúde Ambiental"
            className="w-full h-full object-cover select-none filter brightness-[0.45] contrast-[1.05]"
          />
          {/* Soft elegant glass overlays & organic gradient flows */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30 z-10" />
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-[#D35400]/10 blur-[130px] pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] rounded-full bg-emerald-600/10 blur-[140px] pointer-events-none z-10" />
        </div>

        {/* Top Header Badge */}
        <div className="relative z-20 flex justify-between items-center">
          <div className="inline-flex items-center gap-2 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Award className="w-3.5 h-3.5 text-[#FC6B0A]" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-300 font-mono">
              Certificação de Excelência
            </span>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-300 font-mono">
              Manejo Integrado Ativo
            </span>
          </div>
        </div>

        {/* Main typography & text overlays */}
        <div className="relative z-20 text-left max-w-2xl my-auto space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-1.5 bg-[#D35400]/20 border border-[#D35400]/40 text-[#FC6B0A] px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest font-mono shadow-md backdrop-blur-sm"
          >
            <Shield className="w-3 h-3" /> Tecnologia • Confiança • Sustentabilidade
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-black tracking-tight leading-tight text-white uppercase font-display"
          >
            Gestão Inteligente em <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FC6B0A] to-[#E67E22]">Saúde Ambiental</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl font-sans drop-shadow-sm"
          >
            Sistema completo para gerenciamento de ordens de serviço, inspeções, clientes e monitoramentos ambientais de alta performance.
          </motion.p>

          {/* HUD features / Connection lines & bullets */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="hidden md:grid grid-cols-2 gap-4 pt-6 text-white/90"
          >
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 flex gap-3 shadow-lg hover:border-white/20 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <Leaf className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Sustentabilidade</h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-snug">Metodologias limpas e de baixo impacto ecológico.</p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 flex gap-3 shadow-lg hover:border-white/20 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-[#D35400]/20 flex items-center justify-center shrink-0 border border-[#D35400]/30 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-4 h-4 text-[#FC6B0A]" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Controle Operacional</h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-snug">Laudos em tempo real e monitoramento georreferenciado.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom status indicator */}
        <div className="relative z-20 flex justify-between items-center border-t border-white/10 pt-4 text-zinc-400 text-[10px]">
          <div>
            <span className="font-mono text-zinc-500 block uppercase tracking-wider text-[8px]">Licença Operacional</span>
            <span className="font-bold text-white uppercase text-[10px] tracking-wide">Agreste Saúde Ambiental LTDA</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-zinc-500 block uppercase tracking-wider text-[8px]">Suporte Rápido</span>
            <span className="font-bold text-[#FC6B0A] font-mono text-[10px]">0800 722 6080</span>
          </div>
        </div>
      </div>

      {/* LOGIN PANEL (Bottom on mobile, Left on desktop) */}
      <div className="w-full lg:w-[32%] xl:w-[30%] bg-white flex flex-col justify-between p-6 sm:p-10 md:p-12 shadow-2xl relative z-20 shrink-0 overflow-y-auto lg:h-screen lg:min-h-0">
        
        {/* Header Branding with Centered Agreste Logo */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="relative group mb-3">
            <div className="absolute -inset-1 rounded-full bg-[#D35400]/25 blur opacity-60 group-hover:opacity-100 transition duration-500"></div>
            <img
              referrerPolicy="no-referrer"
              src={logoUrl}
              alt="AGRESTE Logo"
              className="relative w-16 h-16 rounded-full object-cover border-2 border-[#D35400] shadow-md"
            />
          </div>

          <h1 className="text-xl font-black font-display tracking-wider text-[#D35400] leading-none uppercase">
            AGRESTE
          </h1>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.25em] mt-1 text-zinc-400 font-mono">
            saúde ambiental
          </p>
        </div>

        <div className="my-auto py-4">
          {/* Title and Subtitle */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-zinc-800 tracking-tight">Acesso ao Sistema</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Entre para acessar o painel técnico.</p>
          </div>

          {/* Segment Toggle Switch (Operador vs Cliente) */}
          <div className="mb-6">
            <div className="bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 flex relative">
              <button
                type="button"
                onClick={() => {
                  setActiveSegment('tech');
                  setIsRegister(false);
                }}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all relative z-10 cursor-pointer ${
                  activeSegment === 'tech' ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Painel Técnico
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSegment('client');
                  setClientSubState('login');
                }}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all relative z-10 cursor-pointer ${
                  activeSegment === 'client' ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Portal do Cliente
              </button>
              {/* Sliding Background block */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-[#D35400] to-[#E67E22] shadow-sm shadow-[#D35400]/20"
                layoutId="activeSegmentBgLight"
                style={{
                  width: 'calc(50% - 4px)',
                  left: activeSegment === 'tech' ? '4px' : 'calc(50%)',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            </div>
          </div>

          {/* Form Content Body with AnimatePresence */}
          <div className="flex-grow flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {activeSegment === 'tech' ? (
                /* --- TECHNICIAN FORM --- */
                <motion.div
                  key="tech-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="text-left mb-2">
                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                      {isRegister ? 'Cadastro de Operador' : 'Acesso Operador'}
                    </h2>
                  </div>

                  <form onSubmit={handleTechSubmit} className="space-y-4" id="tech-login-form">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                        Usuário / Login
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                          <UserIcon className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Ex: adriano.senna"
                          className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all placeholder-zinc-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                        Senha de Acesso
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all placeholder-zinc-400"
                        />
                      </div>
                    </div>

                    {isRegister && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-1"
                      >
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Confirmar Senha
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="password"
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repita sua senha"
                              className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all placeholder-zinc-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Função Operacional
                          </label>
                          <select
                            value={cargo}
                            onChange={(e) => setCargo(e.target.value as any)}
                            className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-850 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all cursor-pointer"
                          >
                            <option value="técnico">Técnico em Dedetização</option>
                            <option value="gerente">Gerente Operacional</option>
                            <option value="supervisor de operações">Supervisor de Operações</option>
                          </select>
                        </div>
                      </motion.div>
                    )}

                    {!isRegister && (
                      <div className="flex items-center justify-between mt-1 mb-2 text-xs">
                        <label className="flex items-center gap-2 text-zinc-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-300 text-[#D35400] focus:ring-[#D35400]/20 cursor-pointer accent-[#D35400]"
                          />
                          <span>Lembrar acesso</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => showToast('Contate a gerência ou use o email cadastrado para redefinir.', 'info')}
                          className="text-[#D35400] hover:underline font-medium hover:text-[#E67E22] transition-colors cursor-pointer"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 mt-2 bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:from-[#FC6B0A] hover:to-[#FC6B0A] text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-[#D35400]/15 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      {isRegister ? (
                        <>
                          <UserPlus className="w-4 h-4" /> Solicitar Cadastro Técnico
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" /> Entrar
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(!isRegister);
                        setPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer hover:underline"
                    >
                      {isRegister
                        ? 'Já possui credenciais? Conectar ao Painel'
                        : 'Trabalha conosco? Solicitar acesso como operador'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* --- CLIENT PORTAL FLOW --- */
                <motion.div
                  key="client-portal"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {clientSubState === 'login' && (
                    <motion.div
                      key="client-login"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="text-left mb-2">
                        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                          Acesso do Cliente
                        </h2>
                        <p className="text-[10px] text-zinc-500">
                          Consulte laudos, visitas e fale com o suporte técnico Agreste.
                        </p>
                      </div>

                      <form onSubmit={handleClientLoginSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Nome do Responsável ou Empresa
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <Building className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={responsibleInput}
                              onChange={(e) => setResponsibleInput(e.target.value)}
                              placeholder="Nome cadastrado na ficha"
                              className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all placeholder-zinc-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Celular / WhatsApp
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <Phone className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value)}
                              placeholder="(00) 00000-0000"
                              className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all placeholder-zinc-400"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-gradient-to-r from-[#D35400] to-[#E67E22] text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:from-[#FC6B0A] hover:to-[#FC6B0A] active:scale-[0.98]"
                        >
                          <LogIn className="w-4 h-4" /> Entrar no Portal do Cliente
                        </button>
                      </form>

                      <div className="pt-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setClientSubState('register');
                            setClientUsername('');
                            setClientPassword('');
                            setClientPhone('');
                          }}
                          className="text-[11px] text-[#D35400] hover:text-[#E67E22] transition-colors cursor-pointer hover:underline font-bold"
                        >
                          Não possui cadastro? Registrar suporte gratuito
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {clientSubState === 'register' && (
                    <motion.div
                      key="client-reg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="text-left mb-2">
                        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                          Registrar Novo Cliente
                        </h2>
                        <p className="text-[10px] text-zinc-500">
                          Crie um acesso básico para iniciar seu agendamento de dedetização.
                        </p>
                      </div>

                      <form onSubmit={handleClientRegisterSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Nome de Usuário (Login de Atendimento)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <UserIcon className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={clientUsername}
                              onChange={(e) => setClientUsername(e.target.value)}
                              placeholder="Ex: adriano.s"
                              className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all placeholder-zinc-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Senha de Acesso
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="password"
                              required
                              value={clientPassword}
                              onChange={(e) => setClientPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all placeholder-zinc-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Celular / WhatsApp para Contato
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <Phone className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              placeholder="(00) 00000-0000"
                              className="w-full py-2.5 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] focus:ring-4 focus:ring-[#D35400]/10 transition-all placeholder-zinc-400"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-gradient-to-r from-[#D35400] to-[#E67E22] text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:from-[#FC6B0A] hover:to-[#FC6B0A] active:scale-[0.98]"
                        >
                          Próximo Passo <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </form>

                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => setClientSubState('login')}
                          className="text-[11px] text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer hover:underline"
                        >
                          Já tem acesso? Conectar ao Portal
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {clientSubState === 'completing_profile' && (
                    <motion.div
                      key="client-profile"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="text-left mb-2">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#D35400]">
                          Concluir Ficha Cadastral
                        </h2>
                        <p className="text-[10px] text-zinc-500">
                          Preencha as informações do local a ser tratado para liberar o atendimento.
                        </p>
                      </div>

                      <form onSubmit={handleClientProfileCompleteSubmit} className="space-y-3.5">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Nome Comercial ou Residencial
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <Building className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="Ex: Mercadinho do Campo"
                              className="w-full py-2 pl-10 pr-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Nome Completo do Responsável
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <UserIcon className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={companyResponsible}
                              onChange={(e) => setCompanyResponsible(e.target.value)}
                              placeholder="Ex: Adriano Silva"
                              className="w-full py-2 pl-10 pr-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Cidade do Estabelecimento
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <MapPin className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={companyCity}
                              onChange={(e) => setCompanyCity(e.target.value)}
                              placeholder="Ex: Caruaru - PE"
                              className="w-full py-2 pl-10 pr-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider mb-1 text-zinc-500 text-left">
                            Telefone / WhatsApp (Confirmar)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <Phone className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={companyPhone}
                              onChange={(e) => setCompanyPhone(e.target.value)}
                              placeholder="(00) 00000-0000"
                              className="w-full py-2 pl-10 pr-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 outline-none focus:border-[#D35400] transition-all"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-gradient-to-r from-[#D35400] to-[#E67E22] text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:from-[#FC6B0A] hover:to-[#FC6B0A] active:scale-[0.98]"
                        >
                          Concluir e Iniciar Suporte
                        </button>
                      </form>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Rights */}
        <div className="pt-4 border-t border-zinc-200/80 text-center">
          <span className="text-[9px] text-zinc-400 tracking-wider font-mono block">
            SISTEMA AGRESTE v3.2 • CONEXÃO SEGURA
          </span>
        </div>

      </div>
    </div>
  );
}
