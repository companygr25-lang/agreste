/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { AGRESTE_DB } from '../services/db';
import { Camera, User, Phone, Save, Mail, Award, Key } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileTabProps {
  theme: 'light' | 'dark';
  profile: UserProfile;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
}

export default function ProfileTab({ theme, profile, showToast, onRefreshData }: ProfileTabProps) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);
  
  // Simulated stats
  const completedReportsCount = AGRESTE_DB.getReports().filter(r => r.techName === profile.name || r.techName === name).length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !photoUrl.trim()) {
      showToast('Por favor, preencha todos os campos do perfil profissional.', 'error');
      return;
    }

    AGRESTE_DB.updateProfile({
      id: profile.id,
      username: profile.username,
      name,
      phone,
      photoUrl,
    });

    showToast('Perfil profissional atualizado com sucesso!', 'success');
    onRefreshData();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        showToast('Por favor, escolha uma imagem com tamanho inferior a 3MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
          showToast('Foto importada com sucesso do seu dispositivo!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Switch photo presets easily
  const handleUsePresetLogo = () => {
    const preset = 'https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg';
    setPhotoUrl(preset);
    showToast('Foto do perfil alterada para o logotipo oficial AGRESTE!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold font-display tracking-tight">Perfil Profissional</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Gerencie suas informações cadastrais de operador técnico e credenciais para emissões de certificados fitossanitários.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Avatar Panel Card */}
        <div className={`lg:col-span-4 p-6 rounded-2xl border text-center flex flex-col items-center justify-between ${
          theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="space-y-4 w-full">
            <span className="text-xs font-mono font-bold text-[#D35400] uppercase tracking-widest block">Credenciamento Ativo</span>
            
            {/* Round photo with soft dynamic border and file upload click trigger */}
            <label className="relative group w-32 h-32 mx-auto cursor-pointer block" title="Clique para escolher da galeria">
              <div className="absolute -inset-1 rounded-full bg-[#D35400] blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
              <img
                referrerPolicy="no-referrer"
                src={photoUrl || 'https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg'}
                alt={name}
                className="relative w-32 h-32 rounded-full object-cover border-4 border-[#D35400] shadow-2xl mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-[#D35400] mb-1" />
                <span className="text-[9px] text-white font-bold uppercase tracking-wider">Mudar Foto</span>
                <span className="text-[7.5px] text-zinc-400">da galeria</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
                id="profile-photo-file-upload"
              />
            </label>

            <div>
              <h3 className="font-bold text-lg font-display tracking-tight text-zinc-100 dark:text-white">
                {name || 'Nome do Técnico'}
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">ID Operador: {profile.username}</p>
            </div>

            {/* Quick action button to use default logo */}
            <button
              onClick={handleUsePresetLogo}
              id="profile-use-logo-btn"
              className="text-xs text-[#D35400] hover:text-[#FC6B0A] font-medium underline transition-colors cursor-pointer"
            >
              Usar Logomarca Oficial AGRESTE
            </button>
          </div>

          {/* Quick stats items */}
          <div className="w-full grid grid-cols-2 gap-2 pt-6 mt-6 border-t border-zinc-800/20 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950/20 border border-zinc-850/10">
              <span className="text-zinc-500 block">Visitas Efetuadas</span>
              <span className="text-lg font-bold text-[#D35400] font-mono block mt-1">{completedReportsCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/20 border border-zinc-850/10">
              <span className="text-zinc-500 block">Papel</span>
              <span className="text-xs font-bold text-zinc-300 dark:text-zinc-200 block mt-1.5 truncate">Sanitarista Chefe</span>
            </div>
          </div>
        </div>

        {/* Right Side: Information Form */}
        <div className={`lg:col-span-8 p-6 rounded-2xl border ${
          theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider text-[#D35400]">
            <Award className="w-4 h-4" /> Informações do Operador Responsável
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4" id="profile-edit-form">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                Nome Completo do Técnico *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome Fantasia do Técnico"
                  id="profile-name-input"
                  className={`w-full py-2.5 pl-10 pr-4 rounded-xl border text-sm outline-none transition-all ${
                    theme === 'dark' ? 'bg-zinc-950 border-[#242424] focus:border-[#D35400]' : 'bg-zinc-100 border-zinc-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                Número de Contato / WhatsApp *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (81) 99876-5432"
                  id="profile-phone-input"
                  className={`w-full py-2.5 pl-10 pr-4 rounded-xl border text-sm outline-none transition-all ${
                    theme === 'dark' ? 'bg-zinc-950 border-[#242424] focus:border-[#D35400]' : 'bg-zinc-100 border-zinc-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                Mídia de Perfil e Assinatura Digital (Bucket do Supabase)
              </label>
              <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                theme === 'dark' ? 'bg-zinc-950/50 border-zinc-805 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
              }`}>
                <Camera className="w-8 h-8 text-[#D35400] shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold uppercase text-[#D35400] tracking-wider">Mídia Pronta Para Sincronização</p>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    A imagem local selecionada foi decodificada e importada via FileReader para atualização imediata. A aplicação está configurada para persistir esta carga nos buckets dedicados do Supabase.
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 mt-1.5 block">
                Altere ou envie uma nova imagem de perfil clicando diretamente sobre o avatar com símbolo de câmera no painel esquerdo.
              </span>
            </div>

            <div className="pt-4 border-t border-zinc-800/10 flex justify-end">
              <button
                type="submit"
                id="profile-submit-btn"
                className="w-full sm:w-auto px-5 py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-[0.98]"
              >
                <Save className="w-4 h-4" /> Salvar Cadastro Profissional
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
