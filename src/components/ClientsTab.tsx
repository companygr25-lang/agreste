/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, PestStatus, VisitReport, PaymentStatus } from '../types';
import { AGRESTE_DB } from '../services/db';
import { 
  Users, MapPin, User, PlusCircle, CheckCircle, X, Search, 
  Trash2, Edit, ClipboardList, AlertTriangle, AlertCircle, Sparkles, Phone, Check,
  FileSpreadsheet, FileText, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

interface ClientsTabProps {
  theme: 'light' | 'dark';
  clients: Client[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
  canEdit?: boolean;
  currentUser?: string;
}

export default function ClientsTab({ 
  theme, 
  clients, 
  showToast, 
  onRefreshData, 
  canEdit = true,
  currentUser
}: ClientsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Find current user's role and edit level
  const userDetails = AGRESTE_DB.getUserDetails();
  const currentDetails = currentUser ? userDetails[currentUser.toLowerCase().trim()] : null;
  const isManager = !currentUser || 
                    currentUser.toLowerCase().trim() === 'gil silva' || 
                    currentDetails?.cargo === 'gerente' || 
                    currentDetails?.cargo === 'supervisor de operações';

  const canModifyItem = (itemCreatorUsername?: string) => {
    if (!canEdit) return false;
    if (isManager) return true;
    if (!itemCreatorUsername) return true; // old items can be edited by any tech
    return itemCreatorUsername.toLowerCase().trim() === currentUser?.toLowerCase().trim();
  };
  
  // Custom filter states
  const [selectedSize, setSelectedSize] = useState<'todos' | 'grande' | 'pequeno'>('todos');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [selectedCity, setSelectedCity] = useState('todas');
  const [selectedReportStatus, setSelectedReportStatus] = useState<'todos' | 'com_relatorio' | 'sem_relatorio'>('todos');

  // Modals visibility states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState<Client | null>(null);
  
  // Edit client states
  const [showEditModal, setShowEditModal] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSize, setEditSize] = useState<'grande' | 'pequeno'>('grande');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('pago');
  const [showEditConfirm, setShowEditConfirm] = useState<{ original: Client; updated: Client } | null>(null);

  // Add client form states
  const [clientName, setClientName] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientResponsible, setClientResponsible] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientPaymentStatus, setClientPaymentStatus] = useState<PaymentStatus>('pago');
  const [clientSize, setClientSize] = useState<'grande' | 'pequeno'>('grande');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingFile, setImportingFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<'idle' | 'loading' | 'review'>('idle');
  const [importProgressText, setImportProgressText] = useState('');
  const [importedClients, setImportedClients] = useState<Array<{
    name: string;
    city: string;
    responsible: string;
    phone: string;
    size: 'grande' | 'pequeno';
  }>>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImportFile(file);
  };

  const processImportFile = async (file: File) => {
    setImportingFile(file);
    setImportStep('loading');
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    setImportProgressText('Lendo arquivo e calculando estrutura...');
    
    try {
      let extractedText = '';
      
      if (fileExt === 'csv' || fileExt === 'txt') {
        extractedText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Erro ao ler arquivo de texto.'));
          reader.readAsText(file);
        });
      } else if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'xltx') {
        setImportProgressText('Analisando planilhas Excel (SheetJS)...');
        extractedText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              let textResult = '';
              workbook.SheetNames.forEach((sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                // Convert sheets to CSV format to preserve compact tab structure for Gemini
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                textResult += `--- Planilha: ${sheetName} ---\n${csv}\n\n`;
              });
              resolve(textResult);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Erro ao ler arquivo Excel.'));
          reader.readAsArrayBuffer(file);
        });
      } else if (fileExt === 'docx') {
        setImportProgressText('Extraindo conteúdos do documento Word (Mammoth)...');
        extractedText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              const result = await mammoth.extractRawText({ arrayBuffer });
              resolve(result.value);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Erro ao ler arquivo Word.'));
          reader.readAsArrayBuffer(file);
        });
      } else if (fileExt === 'pdf') {
        setImportProgressText('Iniciando extração textual e processamento OCR do PDF (PDF.js)...');
        extractedText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              
              if (!(window as any).pdfjsLib) {
                await new Promise<void>((res, rej) => {
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                  script.onload = () => res();
                  script.onerror = () => rej(new Error('Falha ao carregar motor PDF.js de CDN.'));
                  document.head.appendChild(script);
                });
              }
              
              const pdfjsLib = (window as any).pdfjsLib;
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              let textResult = '';
              
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                textResult += `--- Página ${i} ---\n${pageText}\n\n`;
              }
              
              resolve(textResult);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Erro ao ler arquivo PDF.'));
          reader.readAsArrayBuffer(file);
        });
      } else {
        throw new Error(`O formato de arquivo .${fileExt} não é suportado pelo importador qualificado.`);
      }

      setImportProgressText('Usando IA Gemini para mapear e formatar com 100% de exatidão...');
      
      const response = await fetch('/api/extract-clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileText: extractedText,
          fileName: file.name,
          fileExt: fileExt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido na requisição de IA.' }));
        throw new Error(errorData.error || 'Falha na resposta do servidor de IA.');
      }

      const responseData = await response.json();
      
      if (responseData.success && Array.isArray(responseData.clients)) {
        setImportedClients(responseData.clients);
        setImportStep('review');
        showToast(`Sucesso! Detectamos ${responseData.clients.length} clientes prontos para revisão de cadastro.`, 'success');
      } else {
        throw new Error('Retorno do servidor de extração inválido ou malformado.');
      }

    } catch (err: any) {
      console.error('[Import Error]', err);
      showToast(err.message || 'Falha ao realizar a importação automática do arquivo.', 'error');
      setImportStep('idle');
      setImportingFile(null);
    }
  };

  const handleConfirmImport = () => {
    if (importedClients.length === 0) {
      showToast('Nenhum cliente para importar.', 'error');
      return;
    }

    const validClients = importedClients.filter((client, idx) => {
      const inDb = clients.some(c => 
        c.name.trim().toLowerCase() === client.name.trim().toLowerCase() && 
        c.city.trim().toLowerCase() === client.city.trim().toLowerCase()
      );
      const inImportList = importedClients.some((other, oIdx) => 
        oIdx < idx && 
        other.name.trim().toLowerCase() === client.name.trim().toLowerCase() && 
        other.city.trim().toLowerCase() === client.city.trim().toLowerCase()
      );
      return !inDb && !inImportList;
    });

    if (validClients.length === 0) {
      showToast('Nenhum novo cliente para cadastrar. Todos os registros já existem ou são duplicados.', 'error');
      return;
    }

    validClients.forEach(client => {
      AGRESTE_DB.addClient({
        name: client.name,
        city: client.city,
        responsible: client.responsible,
        phone: client.phone,
        size: client.size,
        paymentStatus: 'pago',
        createdBy: currentUser?.toLowerCase().trim(),
        createdBy_name: currentDetails?.name || currentUser
      });
    });

    const skippedCount = importedClients.length - validClients.length;
    if (skippedCount > 0) {
      showToast(`${validClients.length} clientes novos importados com sucesso! ${skippedCount} repetidos foram pulados automaticamente.`, 'success');
    } else {
      showToast(`${validClients.length} clientes cadastrados com sucesso via "${importingFile?.name}"!`, 'success');
    }

    setShowImportModal(false);
    setImportingFile(null);
    setImportStep('idle');
    setImportedClients([]);
    onRefreshData();
  };

  // Visit form states
  const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  const initialTechName = AGRESTE_DB.getProfile().name;

  const [visitMonth, setVisitMonth] = useState(capitalizedMonth);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [techName, setTechName] = useState(initialTechName);
  const [punctuality, setPunctuality] = useState(10);
  const [communication, setCommunication] = useState(10);
  
  // Pest Control Checklist state
  const [pests, setPests] = useState({
    moscas: 'sem_necessidade' as PestStatus,
    baratas: 'sem_necessidade' as PestStatus,
    ratos: 'sem_necessidade' as PestStatus,
    formigas: 'sem_necessidade' as PestStatus,
  });

  const [recommendations, setRecommendations] = useState('');
  const [satisfaction, setSatisfaction] = useState('Excelente');
  const [comments, setComments] = useState('');
  const [referrals, setReferrals] = useState('');

  // Handle addition of a client
  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para cadastrar clientes.', 'error');
      return;
    }
    if (!clientName.trim() || !clientCity.trim() || !clientResponsible.trim()) {
      showToast('Por favor, preencha todos os campos do cliente.', 'error');
      return;
    }

    AGRESTE_DB.addClient({
      name: clientName,
      city: clientCity,
      responsible: clientResponsible,
      phone: clientPhone,
      paymentStatus: clientPaymentStatus,
      size: clientSize,
      createdBy: currentUser?.toLowerCase().trim(),
      createdBy_name: currentDetails?.name || currentUser
    });

    showToast(`Cliente "${clientName}" cadastrado com sucesso!`, 'success');
    
    // reset states
    setClientName('');
    setClientCity('');
    setClientResponsible('');
    setClientPhone('');
    setClientPaymentStatus('pago');
    setClientSize('grande');
    setShowAddModal(false);
    onRefreshData();
  };

  // Toggle payment status from list directly
  const handleTogglePayment = (client: Client) => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não pode alterar as informações de pagamento.', 'error');
      return;
    }
    const nextStatus: PaymentStatus = client.paymentStatus === 'pago' ? 'pendente' : 'pago';
    const updated = { ...client, paymentStatus: nextStatus };
    AGRESTE_DB.updateClient(updated);
    showToast(`Status de pagamento de ${client.name} alterado para ${nextStatus.toUpperCase()}.`, 'success');
    onRefreshData();
  };

  // Delete Client
  const handleDeleteClient = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  // Confirm pending client registration from chatbot signup
  const handleConfirmClient = (client: Client) => {
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não pode aprovar cadastros.', 'error');
      return;
    }
    const updated = { ...client, isPendingConfirmation: false };
    AGRESTE_DB.updateClient(updated);
    if (onRefreshData) {
      onRefreshData();
    }
    showToast(`Cadastro de "${client.name}" verificado e confirmado no sistema!`, 'success');
  };

  // Edit client actions
  const openEditModal = (client: Client) => {
    setShowEditModal(client);
    setEditName(client.name);
    setEditCity(client.city);
    setEditResponsible(client.responsible);
    setEditPhone(client.phone || '');
    setEditSize(client.size);
    setEditPaymentStatus(client.paymentStatus);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    if (!editName.trim() || !editCity.trim() || !editResponsible.trim()) {
      showToast('Por favor, preencha todos os campos do cliente.', 'error');
      return;
    }

    const updatedClient: Client = {
      ...showEditModal,
      name: editName,
      city: editCity,
      responsible: editResponsible,
      phone: editPhone,
      size: editSize,
      paymentStatus: editPaymentStatus,
    };

    setShowEditConfirm({
      original: showEditModal,
      updated: updatedClient,
    });
  };

  const handleConfirmEditSave = () => {
    if (!showEditConfirm) return;
    if (!canModifyItem(showEditConfirm.original.createdBy)) {
      showToast('Nível de permissão insuficiente para alterar este cliente.', 'error');
      return;
    }
    AGRESTE_DB.updateClient(showEditConfirm.updated);
    showToast(`Cliente "${showEditConfirm.updated.name}" atualizado com sucesso!`, 'success');
    setShowEditConfirm(null);
    setShowEditModal(null);
    onRefreshData();
  };

  // Open visit report dialog and seed default technician name
  const openVisitModal = (client: Client) => {
    setShowVisitModal(client);
    setTechName(AGRESTE_DB.getProfile().name || 'Adriano Senna');
    // resets control states
    setPests({
      moscas: 'sem_necessidade',
      baratas: 'sem_necessidade',
      ratos: 'sem_necessidade',
      formigas: 'sem_necessidade',
    });
    setRecommendations('');
    setSatisfaction('Excelente');
    setComments('');
    setReferrals('');
  };

  // Submit visit / pest report logic
  const handleSaveVisitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showVisitModal) return;
    if (!canEdit) {
      showToast('Acesso apenas leitura: você não tem permissão para registrar relatórios de visita.', 'error');
      return;
    }

    AGRESTE_DB.addReport({
      clientId: showVisitModal.id,
      clientName: showVisitModal.name,
      clientCity: showVisitModal.city,
      month: visitMonth,
      date: visitDate,
      techName: techName,
      punctuality: Number(punctuality),
      communication: Number(communication),
      pests: pests,
      recommendations: recommendations,
      satisfaction: satisfaction,
      comments: comments,
      referrals: referrals,
      createdBy: currentUser?.toLowerCase().trim(),
      createdBy_name: currentDetails?.name || currentUser
    });

    showToast(`Relatório de visita para "${showVisitModal.name}" finalizado e arquivado!`, 'success');
    setShowVisitModal(null);
    onRefreshData();
  };

  // Extract unique cities list dynamically for options
  const uniqueCities = Array.from(new Set(clients.map(c => c.city ? c.city.trim() : ''))).filter(Boolean).sort();

  // Expanded complex filters
  const reports = AGRESTE_DB.getReports();
  const filteredClients = clients.filter((client) => {
    // 1. Search Query
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      client.name.toLowerCase().includes(q) ||
      client.city.toLowerCase().includes(q) ||
      client.responsible.toLowerCase().includes(q)
    );

    // 2. Size
    const matchesSize = selectedSize === 'todos' || client.size === selectedSize;

    // 3. Payment Status
    const matchesPayment = selectedPaymentStatus === 'todos' || client.paymentStatus === selectedPaymentStatus;

    // 4. City
    const matchesCity = selectedCity === 'todas' || client.city.trim().toLowerCase() === selectedCity.trim().toLowerCase();

    // 5. Report status (Feito/Não Feito)
    let matchesReport = true;
    if (selectedReportStatus !== 'todos') {
      const clientReports = reports.filter(r => r.clientId === client.id);
      let hasActiveReport = false;
      if (clientReports.length > 0) {
        const latestRep = clientReports.reduce((latest, current) => {
          const dateA = new Date(latest.date);
          const dateB = new Date(current.date);
          return dateB > dateA ? current : latest;
        });
        
        let dateToParse = latestRep.date;
        if (dateToParse.includes('/')) {
          const parts = dateToParse.split('/');
          if (parts.length === 3) {
            dateToParse = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        const reportDate = new Date(dateToParse + 'T12:00:00');
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        threeMonthsAgo.setHours(0,0,0,0);
        
        if (reportDate >= threeMonthsAgo) {
          hasActiveReport = true;
        }
      }
      
      if (selectedReportStatus === 'com_relatorio') {
        matchesReport = hasActiveReport;
      } else if (selectedReportStatus === 'sem_relatorio') {
        matchesReport = !hasActiveReport;
      }
    }

    return matchesSearch && matchesSize && matchesPayment && matchesCity && matchesReport;
  });

  return (
    <div className="space-y-6">
      {/* Header operations bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight">Cadastro de Clientes</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Cadastre novos clientes, defina o porte do estabelecimento e agende relatórios de controle de pragas.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportStep('idle');
                setImportingFile(null);
                setImportedClients([]);
              }}
              id="import-client-btn"
              className={`flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer hover:scale-[1.01] border ${
                theme === 'dark'
                  ? 'bg-[#141414]/90 hover:bg-[#1A1A1A] border-zinc-805/50 text-zinc-100'
                  : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 shadow-sm'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-orange-500" />
              <span>Importar de Arquivo (Excel, Word, PDF)</span>
            </button>
            
            <button
              onClick={() => setShowAddModal(true)}
              id="add-client-btn"
              className="flex items-center gap-2 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-[#D35400]/10 cursor-pointer hover:scale-[1.01] transition-transform duration-100"
            >
              <PlusCircle className="w-4 h-4" /> Cadastrar Cliente
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#141414]/60 border-zinc-805/40' : 'bg-zinc-50/50 border-zinc-200'} space-y-3`}>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search bar */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, cidade ou responsável..."
              id="client-search-input"
              className={`w-full py-2 pl-10 pr-4 rounded-lg border text-xs outline-none transition-all ${
                theme === 'dark'
                  ? 'bg-[#1A1A1A]/90 border-[#242424] text-white focus:border-[#D35400] focus:ring-1 focus:ring-[#D35400]'
                  : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#D35400] focus:ring-1 focus:ring-[#D35400] shadow-sm'
              }`}
            />
          </div>

          {/* Porte Select Filter */}
          <div className="w-full md:w-44 select-container">
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value as any)}
              id="filter-client-size"
              className={`w-full py-2 px-3 rounded-lg border text-xs outline-none transition-all ${
                theme === 'dark'
                  ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                  : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400] shadow-sm'
              }`}
            >
              <option value="todos">Porte: Todos</option>
              <option value="grande">Grande Porte</option>
              <option value="pequeno">Pequeno Porte</option>
            </select>
          </div>

          {/* Cidade Select Filter */}
          <div className="w-full md:w-52 select-container">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              id="filter-client-city"
              className={`w-full py-2 px-3 rounded-lg border text-xs outline-none transition-all ${
                theme === 'dark'
                  ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                  : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400] shadow-sm'
              }`}
            >
              <option value="todas">Cidades: Todas</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Relatório Reis Select Filter */}
          <div className="w-full md:w-52 select-container">
            <select
              value={selectedReportStatus}
              onChange={(e) => setSelectedReportStatus(e.target.value as any)}
              id="filter-client-report"
              className={`w-full py-2 px-3 rounded-lg border text-xs outline-none transition-all ${
                theme === 'dark'
                  ? 'bg-zinc-950 border-[#242424] text-zinc-300 focus:border-[#D35400]'
                  : 'bg-white border-zinc-200 text-zinc-700 focus:border-[#D35400] shadow-sm'
              }`}
            >
              <option value="todos">Relatórios: Todos</option>
              <option value="com_relatorio">Com Relatório (Ativo)</option>
              <option value="sem_relatorio">Sem Relatório (ou Vencido)</option>
            </select>
          </div>
        </div>

        {/* Clear filters badge row */}
        {(selectedSize !== 'todos' || selectedCity !== 'todas' || selectedReportStatus !== 'todos' || searchQuery) && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-dashed border-zinc-800/20 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Filtros Ativos:</span>
            <div className="flex flex-wrap items-center gap-1.5 select-count">
              {searchQuery && (
                <span className="text-[9px] px-2 py-0.5 bg-orange-600/10 border border-orange-500/20 text-[#D35400] font-semibold rounded">
                  Busca: "{searchQuery}"
                </span>
              )}
              {selectedSize !== 'todos' && (
                <span className="text-[9px] px-2 py-0.5 bg-orange-600/10 border border-orange-500/20 text-[#D35400] font-semibold rounded">
                  Porte: {selectedSize === 'grande' ? 'Grande' : 'Pequeno'}
                </span>
              )}
              {selectedCity !== 'todas' && (
                <span className="text-[9px] px-2 py-0.5 bg-orange-600/10 border border-orange-500/20 text-[#D35400] font-semibold rounded">
                  Cidade: {selectedCity}
                </span>
              )}
              {selectedReportStatus !== 'todos' && (
                <span className="text-[9px] px-2 py-0.5 bg-orange-600/10 border border-orange-500/20 text-[#D35400] font-semibold rounded">
                  Relatório: {selectedReportStatus === 'com_relatorio' ? 'Com Relatório Ativo' : 'Sem Relatório ou Vencido'}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSize('todos');
                  setSelectedPaymentStatus('todos');
                  setSelectedCity('todas');
                  setSelectedReportStatus('todos');
                }}
                className="text-[9px] hover:underline font-bold text-zinc-500 hover:text-orange-500 pl-1.5 transition-colors cursor-pointer"
              >
                Limpar Todos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clients Cards Grid changed to elegant List Rows */}
      {filteredClients.length === 0 ? (
        <div className={`py-12 text-center rounded-2xl border border-dashed ${
          theme === 'dark' ? 'bg-[#1A1A1A]/30 border-[#242424]' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <Users className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
          <p className="text-md font-semibold font-display">Nenhum cliente encontrado</p>
          <p className="text-xs text-zinc-500 mt-1">Remova os filtros de busca ou cadastre um novo favorecido.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => {
            const reports = AGRESTE_DB.getReports();
            const clientReports = reports.filter(r => r.clientId === client.id);
            let recentReportInfo = null;
            if (clientReports.length > 0) {
              const latestRep = clientReports.reduce((latest, current) => {
                const dateA = new Date(latest.date);
                const dateB = new Date(current.date);
                return dateB > dateA ? current : latest;
              });
              
              let dateToParse = latestRep.date;
              if (dateToParse.includes('/')) {
                const parts = dateToParse.split('/');
                if (parts.length === 3) {
                  dateToParse = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
              }
              const reportDate = new Date(dateToParse + 'T12:00:00');
              const threeMonthsAgo = new Date();
              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
              threeMonthsAgo.setHours(0,0,0,0);
              
              if (reportDate >= threeMonthsAgo) {
                const renewalDate = new Date(reportDate);
                renewalDate.setMonth(renewalDate.getMonth() + 3);
                recentReportInfo = {
                  dateStr: reportDate.toLocaleDateString('pt-BR'),
                  renewalDateStr: renewalDate.toLocaleDateString('pt-BR'),
                  report: latestRep
                };
              }
            }

            return (
              <div 
                key={client.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  client.isPendingConfirmation
                    ? theme === 'dark'
                      ? 'bg-amber-600/5 border-amber-500/70 relative shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-[pulse_3s_infinite]'
                      : 'bg-amber-50 border-amber-500 relative shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : theme === 'dark' 
                      ? 'bg-[#1A1A1A] border-[#242424]' 
                      : 'bg-white border-zinc-200 shadow-xs'
                }`}
              >
                {/* Left Group: Code, Name, Details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-center shrink-0">
                    <span className="text-[10px] font-bold font-mono px-2 py-1 bg-zinc-950/40 text-[#D35400] rounded-lg border border-zinc-900/30">
                      Cód: {client.code || '001'}
                    </span>
                    <div className="mt-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                        client.size === 'grande' 
                          ? 'bg-[#D35400]/10 text-[#D35400]' 
                          : 'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {client.size === 'grande' ? 'Grande' : 'Pequeno'}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="font-bold text-sm md:text-md text-zinc-200 dark:text-zinc-100 flex flex-wrap items-center gap-1.5 truncate">
                      <span>{client.name}</span>
                      {client.isPendingConfirmation && (
                        <span className="text-[9px] px-2 py-0.5 bg-amber-600 text-white rounded-full font-extrabold uppercase tracking-wider animate-bounce inline-flex items-center gap-1 shrink-0">
                          <Sparkles className="w-2.5 h-2.5 animate-spin" /> NOVO CADASTRO (CONFIRMAR)
                        </span>
                      )}
                      {recentReportInfo && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 shrink-0 select-none bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                          title={`Relatório ativo criado em ${recentReportInfo.dateStr}.` }
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-400" /> Relatório Criado (Até {recentReportInfo.renewalDateStr})
                        </span>
                      )}
                    </h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#D35400]" /> {client.city}</span>
                    <span className="text-zinc-650">•</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-[#D35400]" /> Resp: {client.responsible}</span>
                    {client.phone && (
                      <>
                        <span className="text-zinc-650">•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#D35400]" /> Contato: {client.phone}</span>
                      </>
                    )}
                    {client.createdBy_name && (
                      <>
                        <span className="text-zinc-650">•</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#E67E22] bg-[#D35400]/10 px-1.5 py-0.5 rounded-md border border-[#D35400]/10">
                          Técnico: {client.createdBy_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Group: Visit/Delete actions (faturamento status display removed) */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/10 dark:border-[#242424]">
                <div className="flex items-center gap-1.5">
                  {client.isPendingConfirmation && canEdit && (
                    <button
                      onClick={() => handleConfirmClient(client)}
                      className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-550 hover:from-amber-500 hover:to-amber-450 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/15"
                      title="Clique para contatar e confirmar o cadastro deste cliente"
                    >
                      <Check className="w-4 h-4" /> <span>Confirmar Cadastro e Contato</span>
                    </button>
                  )}
                  {canEdit && !client.isPendingConfirmation && (
                    <button
                      onClick={() => openVisitModal(client)}
                      className="px-3 py-2 bg-[#D35400]/10 hover:bg-[#D35400] text-[#D35400] hover:text-white border border-[#D35400]/20 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ClipboardList className="w-4 h-4 text-[#D35400] hover:text-white" /> <span>Realizar Visita</span>
                    </button>
                  )}
                  {canModifyItem(client.createdBy) && (
                    <button
                      onClick={() => openEditModal(client)}
                      className="p-2 hover:bg-[#D35400]/15 text-zinc-500 hover:text-[#D35400] rounded-xl transition-colors cursor-pointer"
                      title="Editar Cliente"
                    >
                      <Edit className="w-4.5 h-4.5" />
                    </button>
                  )}
                  {canModifyItem(client.createdBy) && (
                    <button
                      onClick={() => handleDeleteClient(client.id, client.name)}
                      className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                      title="Excluir Cliente"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* MODAL 1: ADD CLIENT */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl z-10 ${
                theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424] text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-display">Cadastrar Novo Cliente</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  id="add-cli-modal-close"
                  className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddClient} className="space-y-4" id="add-client-form">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Razão Social ou Nome do Favorecido *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Panificadora Central Ltda."
                    id="new-client-name"
                    className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                      Cidade Atendida *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientCity}
                      onChange={(e) => setClientCity(e.target.value)}
                      placeholder="Ex: Caruaru"
                      id="new-client-city"
                      className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                      Responsável / Contato *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientResponsible}
                      onChange={(e) => setClientResponsible(e.target.value)}
                      placeholder="Ex: João da Silva"
                      id="new-client-responsible"
                      className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Telefone de Contato (WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Ex: (81) 99876-5432"
                    id="new-client-phone"
                    className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Porte do Estabelecimento *
                  </label>
                  <div className="flex gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setClientSize('grande')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                        clientSize === 'grande'
                          ? 'bg-[#D35400]/20 border-[#D35400] text-[#D35400]'
                          : theme === 'dark' ? 'bg-zinc-950 border-[#242424] text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}
                    >
                      Grande Porte
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientSize('pequeno')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                        clientSize === 'pequeno'
                          ? 'bg-[#D35400]/20 border-[#D35400] text-[#D35400]'
                          : theme === 'dark' ? 'bg-zinc-950 border-[#242424] text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}
                    >
                      Pequeno Porte
                    </button>
                  </div>
                </div>

                {/* Status Financeiro Inicial removed */}

                <div className="pt-4">
                  <button
                    type="submit"
                    id="save-new-client-btn"
                    className="w-full py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-semibold text-sm rounded-xl cursor-pointer"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: WRITE VISIT REPORT ("Realizar Visita") */}
      <AnimatePresence>
        {showVisitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVisitModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto ${
                theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424] text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-zinc-800/15">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#D35400] font-bold font-mono">Controle de Vetores & Pragas</span>
                  <h3 className="text-xl font-bold font-display mt-0.5">Relatório Técnico de Visita</h3>
                  <p className="text-xs text-zinc-500 mt-1">Cliente: <span className="font-bold text-zinc-300 dark:text-zinc-100">{showVisitModal.name} ({showVisitModal.city})</span></p>
                </div>
                <button
                  onClick={() => setShowVisitModal(null)}
                  id="visit-modal-close"
                  className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVisitReport} className="space-y-6" id="visit-report-form">
                
                {/* 1. Basic Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">Mês de Competência</label>
                    <input
                      type="text"
                      required
                      value={visitMonth}
                      onChange={(e) => setVisitMonth(e.target.value)}
                      placeholder="Ex: Maio"
                      id="visit-month-input"
                      className={`w-full py-2 px-3 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">Data da Aplicação</label>
                    <input
                      type="date"
                      required
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      id="visit-date-input"
                      className={`w-full py-2 px-3 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">Nome do Técnico</label>
                    <input
                      type="text"
                      required
                      value={techName}
                      onChange={(e) => setTechName(e.target.value)}
                      placeholder="Nome do Operador"
                      id="visit-tech-input"
                      className={`w-full py-2 px-3 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>
                </div>

                {/* 2. Professional Rating Evaluation (Punctuality, Communication 0-10) */}
                <div className="p-4 rounded-xl bg-orange-600/5 border border-orange-500/10 space-y-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500 font-mono">
                    <Sparkles className="w-4 h-4" /> Desempenho e Postura do Técnico
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Pontualidade e Uniformização</span>
                        <span className="font-bold text-orange-500 font-mono">{punctuality} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={punctuality}
                        onChange={(e) => setPunctuality(Number(e.target.value))}
                        id="rating-punctuality"
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Cortesia e Comunicação</span>
                        <span className="font-bold text-orange-500 font-mono">{communication} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={communication}
                        onChange={(e) => setCommunication(Number(e.target.value))}
                        id="rating-communication"
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Pest Controls Actions Columns */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Defensivos e Controle Terápico de Pragas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mosca control */}
                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <span className="text-xs font-bold block mb-2 text-zinc-300 dark:text-zinc-100">Controle de Moscas (Insetos Voadores)</span>
                      <div className="flex gap-2">
                        {['sem_necessidade', 'realizando', 'realizado'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setPests({ ...pests, moscas: status as PestStatus })}
                            id={`pests-moscas-${status}`}
                            className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-lg border cursor-pointer ${
                              pests.moscas === status
                                ? 'bg-orange-600/10 border-orange-500 text-orange-500'
                                : 'bg-transparent border-zinc-800 text-zinc-500'
                            }`}
                          >
                            {status === 'sem_necessidade' ? 'Inativo' : status === 'realizando' ? 'Em Ação' : 'Concluído'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Baratas control */}
                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <span className="text-xs font-bold block mb-2 text-zinc-300 dark:text-zinc-100">Controle de Baratas (Blatofobia)</span>
                      <div className="flex gap-2">
                        {['sem_necessidade', 'realizando', 'realizado'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setPests({ ...pests, baratas: status as PestStatus })}
                            id={`pests-baratas-${status}`}
                            className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-lg border cursor-pointer ${
                              pests.baratas === status
                                ? 'bg-orange-600/10 border-orange-500 text-orange-500'
                                : 'bg-transparent border-zinc-800 text-zinc-500'
                            }`}
                          >
                            {status === 'sem_necessidade' ? 'Inativo' : status === 'realizando' ? 'Em Ação' : 'Concluído'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ratos control */}
                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <span className="text-xs font-bold block mb-2 text-zinc-300 dark:text-zinc-100">Desratização (Controle de Roedores)</span>
                      <div className="flex gap-2">
                        {['sem_necessidade', 'realizando', 'realizado'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setPests({ ...pests, ratos: status as PestStatus })}
                            id={`pests-ratos-${status}`}
                            className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-lg border cursor-pointer ${
                              pests.ratos === status
                                ? 'bg-orange-600/10 border-orange-500 text-orange-500'
                                : 'bg-transparent border-zinc-800 text-zinc-500'
                            }`}
                          >
                            {status === 'sem_necessidade' ? 'Inativo' : status === 'realizando' ? 'Em Ação' : 'Concluído'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Formigas control */}
                    <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <span className="text-xs font-bold block mb-2 text-zinc-300 dark:text-zinc-100">Desinsetização contra Formigas</span>
                      <div className="flex gap-2">
                        {['sem_necessidade', 'realizando', 'realizado'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setPests({ ...pests, formigas: status as PestStatus })}
                            id={`pests-formigas-${status}`}
                            className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-lg border cursor-pointer ${
                              pests.formigas === status
                                ? 'bg-orange-600/10 border-orange-500 text-orange-500'
                                : 'bg-transparent border-zinc-800 text-zinc-500'
                            }`}
                          >
                            {status === 'sem_necessidade' ? 'Inativo' : status === 'realizando' ? 'Em Ação' : 'Concluído'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Recommendations & Feedback Columns */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">Recomendações ao Cliente</label>
                    <textarea
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      placeholder="Ex: Evitar resíduos orgânicos expostos e lacrar frestas no piso."
                      rows={2}
                      id="report-recs"
                      className={`w-full p-3 rounded-xl border text-sm outline-none transition-all resize-none ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">Nível de Satisfação do Cliente</label>
                      <select
                        value={satisfaction}
                        onChange={(e) => setSatisfaction(e.target.value)}
                        id="report-satisfaction"
                        className={`w-full py-2.5 px-3 rounded-xl border text-sm outline-none transition-all ${
                          theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-[#D35400] text-zinc-100' : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <option className="bg-[#1A1A1A] text-zinc-100">Excelente</option>
                        <option className="bg-[#1A1A1A] text-zinc-100">Muito Satisfeito</option>
                        <option className="bg-[#1A1A1A] text-zinc-100">Satisfeito</option>
                        <option className="bg-[#1A1A1A] text-zinc-100">Regular</option>
                        <option className="bg-[#1A1A1A] text-zinc-100">Insatisfeito</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">Novas Indicações do Cliente (Opcional)</label>
                      <input
                        type="text"
                        value={referrals}
                        onChange={(e) => setReferrals(e.target.value)}
                        placeholder="Nome ou contato indicado"
                        id="report-referrals"
                        className={`w-full py-2.5 px-3 rounded-xl border text-sm outline-none transition-all ${
                          theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">Reclamações, Solicitações e Comentários do Cliente</label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Espaço exclusivo para notas aditivas e reivindicações do tomador de serviço..."
                      rows={2}
                      id="report-comments"
                      className={`w-full p-3 rounded-xl border text-sm outline-none transition-all resize-none ${
                        theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Submit visit button */}
                <div className="pt-4 border-t border-zinc-800/15 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowVisitModal(null)}
                    id="visit-report-cancel"
                    className="px-4 py-2 bg-transparent hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    id="visit-report-submit"
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Finalizar e Arquivar Relatório
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DELETE CONFIRM OVERLAY */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xs"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl z-10 text-center ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-red-900/30 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="mx-auto w-12 h-12 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-lg font-display mb-1 text-white dark:text-zinc-100">Confirmar Exclusão</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Tem certeza que deseja remover o cliente <span className="font-bold text-orange-500">"{deleteConfirm.name}"</span> do sistema? 
                Isso apagará permanentemente todos os cronogramas associados.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const clientToDelete = clients.find(c => c.id === deleteConfirm.id);
                    if (!canModifyItem(clientToDelete?.createdBy)) {
                      showToast('Nível de permissão insuficiente para excluir este cliente.', 'error');
                      return;
                    }
                    AGRESTE_DB.deleteClient(deleteConfirm.id);
                    showToast(`Cliente "${deleteConfirm.name}" excluído.`, 'success');
                    setDeleteConfirm(null);
                    onRefreshData();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: EDIT CLIENT */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl z-10 ${
                theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424] text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-display">Editar Dados do Cliente</h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  id="edit-cli-modal-close"
                  className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4" id="edit-client-form">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Razão Social ou Nome do Favorecido *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Panificadora Central Ltda."
                    id="edit-client-name"
                    className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                      Cidade Atendida *
                    </label>
                    <input
                      type="text"
                      required
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Ex: Caruaru"
                      id="edit-client-city"
                      className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                      Responsável / Contato *
                    </label>
                    <input
                      type="text"
                      required
                      value={editResponsible}
                      onChange={(e) => setEditResponsible(e.target.value)}
                      placeholder="Ex: João da Silva"
                      id="edit-client-responsible"
                      className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Telefone de Contato (WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Ex: (81) 99876-5432"
                    id="edit-client-phone"
                    className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-zinc-950 border-[#242424] text-white focus:border-[#D35400]'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-[#D35400]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Porte do Estabelecimento *
                  </label>
                  <div className="flex gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setEditSize('grande')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                        editSize === 'grande'
                          ? 'bg-[#D35400]/20 border-[#D35400] text-[#D35400]'
                          : theme === 'dark' ? 'bg-zinc-950 border-[#242424] text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}
                    >
                      Grande Porte
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSize('pequeno')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                        editSize === 'pequeno'
                          ? 'bg-[#D35400]/20 border-[#D35400] text-[#D35400]'
                          : theme === 'dark' ? 'bg-zinc-950 border-[#242424] text-zinc-500' : 'bg-zinc-100 border-zinc-255 text-zinc-500'
                      }`}
                    >
                      Pequeno Porte
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(null)}
                    className="flex-1 py-2.5 border border-zinc-805/40 dark:border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer text-xs font-bold uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="save-edited-client-btn"
                    className="flex-1 py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: EDIT ACTION CONFIRMATION OVERLAY */}
      <AnimatePresence>
        {showEditConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditConfirm(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-xs"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl z-10 text-center ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-[#D35400]/30 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="mx-auto w-12 h-12 bg-[#D35400]/10 text-[#D35400] rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-lg font-display mb-1">Confirmar Alterações</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Deseja confirmar e aplicar as atualizações cadastrais do cliente <span className="font-bold text-[#FC6B0A]">"{showEditConfirm.updated.name}"</span>? 
                Isso alterará as informações cadastrais e de exibição em todo o sistema.
              </p>

              <div className="grid grid-cols-2 gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowEditConfirm(null)}
                  className="px-4 py-2 hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEditSave}
                  className="px-4 py-2 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Sim, Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: IMPORT FROM FILE (EXCEL, WORD, PDF, CSV) */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImportModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs animate-fade-in"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto ${
                theme === 'dark' ? 'bg-[#1A1A1A] border-zinc-805 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
              }`}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold font-display">Mapeamento e Importação Inteligente</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Cadastramento ágil a partir de planilhas Excel, documentos Word ou arquivos PDF.</p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {importStep === 'idle' && (
                <div className="space-y-4">
                  {/* Drag and drop Container */}
                  <div className="border border-dashed border-zinc-850 dark:border-zinc-805 rounded-2xl p-8 hover:border-[#D35400] transition-colors cursor-pointer relative text-center group">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.xltx,.doc,.docx,.pdf,.csv,.txt"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-3.5">
                      <div className="p-4 bg-[#D35400]/10 text-[#D35400] rounded-full group-hover:bg-[#D35400]/15 transition-colors">
                        <UploadCloud className="w-8 h-8 animate-bounce-slow" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Arraste ou clique para selecionar o arquivo</p>
                        <p className="text-xs text-zinc-500 mt-1">Excel (.xlsx, .xls, .xltx, .csv), Word (.docx) ou PDF (.pdf)</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-850 text-xs space-y-2 text-left">
                    <p className="font-bold text-[#D35400] uppercase text-[10px] tracking-wider">Instruções para Importação:</p>
                    <ul className="list-disc pl-4 space-y-1 text-zinc-400 font-sans text-[11px] leading-relaxed">
                      <li><strong>Excel (.xlsx, .xltx, .xls)/CSV</strong>: Organize a planilha com colunas representativas (Ex: Nome, Cidade, Responsável, Telefone).</li>
                      <li><strong>PDF e Word</strong>: O sistema executará varredura OCR para extrair as frentes cadastrais principais presentes nos parágrafos e tabelas.</li>
                      <li>Você poderá editar e validar todos os dados de forma visual e segura antes de confirmar a gravação.</li>
                    </ul>
                  </div>
                </div>
              )}

              {importStep === 'loading' && (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-t-[#D35400] border-zinc-350 dark:border-zinc-800 rounded-full animate-spin"></div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold font-mono text-[#D35400]">Processando arquivo...</p>
                    <p className="text-xs text-zinc-500">{importProgressText}</p>
                  </div>
                </div>
              )}

              {importStep === 'review' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-left">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <div>
                        <p className="text-xs font-bold leading-none uppercase">Extração concluída!</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-300 mt-1">Detectamos {importedClients.length} novos clientes prontos para gravação.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-zinc-950/45 px-2 py-1 rounded text-zinc-400 select-all border border-zinc-850">
                      {importingFile?.name}
                    </span>
                  </div>

                  {/* Warning banner when duplicates are present */}
                  {importedClients.some((client, idx) => {
                    const isDbDup = clients.some(c => 
                      c.name.trim().toLowerCase() === client.name.trim().toLowerCase() && 
                      c.city.trim().toLowerCase() === client.city.trim().toLowerCase()
                    );
                    const isFileDup = importedClients.some((other, oIdx) => 
                      oIdx < idx && 
                      other.name.trim().toLowerCase() === client.name.trim().toLowerCase() && 
                      other.city.trim().toLowerCase() === client.city.trim().toLowerCase()
                    );
                    return isDbDup || isFileDup;
                  }) && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 rounded-xl text-xs flex gap-2.5 items-start text-left leading-relaxed">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
                      <div className="space-y-0.5">
                        <p className="font-bold">Registros Repetidos Identificados</p>
                        <p className="text-zinc-400 text-[11px]">
                          Para evitar duplicidade, cadastros destacados com a mesma combinação de <strong>Nome</strong> e <strong>Cidade</strong> já salvos no sistema ou repetidos no arquivo serão <strong>ignorados na importação</strong>. 
                          Se desejar cadastrá-los como pontos diferentes, basta alterar o Nome ou Cidade de exibição na tabela abaixo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Review Table Editor */}
                  <div className="border border-zinc-805 dark:border-zinc-850 rounded-xl overflow-hidden text-left bg-zinc-950/25">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-805 dark:border-zinc-850">
                          <th className="p-2.5 font-bold uppercase text-[9px] text-zinc-400 tracking-wider">Nome do Cliente</th>
                          <th className="p-2.5 font-bold uppercase text-[9px] text-zinc-400 tracking-wider">Cidade</th>
                          <th className="p-2.5 font-bold uppercase text-[9px] text-zinc-400 tracking-wider">Responsável</th>
                          <th className="p-2.5 font-bold uppercase text-[9px] text-zinc-400 tracking-wider">WhatsApp</th>
                          <th className="p-2.5 font-bold uppercase text-[9px] text-zinc-400 tracking-wider text-center">Porte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedClients.map((client, idx) => {
                          const isDbDup = clients.some(c => 
                            c.name.trim().toLowerCase() === client.name.trim().toLowerCase() && 
                            c.city.trim().toLowerCase() === client.city.trim().toLowerCase()
                          );
                          const isFileDup = importedClients.some((other, oIdx) => 
                            oIdx < idx && 
                            other.name.trim().toLowerCase() === client.name.trim().toLowerCase() && 
                            other.city.trim().toLowerCase() === client.city.trim().toLowerCase()
                          );
                          const isDup = isDbDup || isFileDup;

                          return (
                            <tr 
                              key={idx} 
                              className={`border-b transition-colors ${
                                isDup 
                                  ? 'bg-amber-500/10 border-l-2 border-l-amber-500 border-b-zinc-800 hover:bg-amber-500/15' 
                                  : 'border-b-zinc-805 dark:border-zinc-900 last:border-b-0 hover:bg-zinc-900/30'
                              }`}
                            >
                              <td className="p-1 px-1.5">
                                <div className="flex flex-col">
                                  <input
                                    type="text"
                                    value={client.name}
                                    onChange={(e) => {
                                      const updated = [...importedClients];
                                      updated[idx].name = e.target.value;
                                      setImportedClients(updated);
                                    }}
                                    className={`w-full p-1 bg-transparent border-0 outline-none hover:bg-zinc-800/40 rounded focus:bg-zinc-800 font-bold ${
                                      isDup ? 'text-amber-500' : 'text-white'
                                    }`}
                                  />
                                  {isDbDup && (
                                    <span className="text-[9px] font-semibold text-amber-500 px-1 mt-0.5 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" /> Já Cadastrado (será ignorado)
                                    </span>
                                  )}
                                  {!isDbDup && isFileDup && (
                                    <span className="text-[9px] font-semibold text-amber-500 px-1 mt-0.5 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" /> Repetido no Arquivo (será ignorado)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-1 px-1.5">
                                <input
                                  type="text"
                                  value={client.city}
                                  onChange={(e) => {
                                    const updated = [...importedClients];
                                    updated[idx].city = e.target.value;
                                    setImportedClients(updated);
                                  }}
                                  className="w-full p-1 bg-transparent border-0 outline-none hover:bg-zinc-800/40 rounded focus:bg-zinc-800 text-white font-medium"
                                />
                              </td>
                              <td className="p-1 px-1.5">
                                <input
                                  type="text"
                                  value={client.responsible}
                                  onChange={(e) => {
                                    const updated = [...importedClients];
                                    updated[idx].responsible = e.target.value;
                                    setImportedClients(updated);
                                  }}
                                  className="w-full p-1 bg-transparent border-0 outline-none hover:bg-zinc-800/40 rounded focus:bg-zinc-800 text-white"
                                />
                              </td>
                              <td className="p-1 px-1.5">
                                <input
                                  type="text"
                                  value={client.phone}
                                  onChange={(e) => {
                                    const updated = [...importedClients];
                                    updated[idx].phone = e.target.value;
                                    setImportedClients(updated);
                                  }}
                                  className="w-full p-1 bg-transparent border-0 outline-none hover:bg-zinc-800/40 rounded focus:bg-zinc-800 font-mono text-white"
                                />
                              </td>
                              <td className="p-1 px-1.5 text-center">
                                <select
                                  value={client.size}
                                  onChange={(e) => {
                                    const updated = [...importedClients];
                                    updated[idx].size = e.target.value as any;
                                    setImportedClients(updated);
                                  }}
                                  className="p-1 bg-transparent border-0 outline-none hover:bg-zinc-800/40 rounded focus:bg-zinc-800 text-[10px] uppercase font-bold text-white cursor-pointer"
                                >
                                  <option value="grande">Grande</option>
                                  <option value="pequeno">Pequeno</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setImportStep('idle')}
                      className="px-4 py-2 bg-transparent border border-zinc-900 dark:border-zinc-800 hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Selecionar outro arquivo
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="px-5 py-2 bg-[#D35400] hover:bg-[#FC6B0A] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Importar e Cadastrar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
