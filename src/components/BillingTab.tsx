/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Client, PaymentStatus } from '../types';
import { AGRESTE_DB } from '../services/db';
import { 
  Landmark, DollarSign, CheckCircle2, AlertTriangle, 
  Search, Sliders, Edit, Plus, FileText, QrCode, 
  Printer, X, CreditCard, RefreshCw, Sparkles, Receipt
} from 'lucide-react';

interface BillingTabProps {
  theme: 'light' | 'dark';
  clients: Client[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
  currentUser?: string | null;
}

export default function BillingTab({
  theme,
  clients,
  showToast,
  onRefreshData,
  currentUser
}: BillingTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [pixKey, setPixKey] = useState(() => AGRESTE_DB.getPixKey());
  const [isEditingPix, setIsEditingPix] = useState(false);
  const [newPixKeyInput, setNewPixKeyInput] = useState(pixKey);

  // Billing adjustment modal state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [customValue, setCustomValue] = useState(250);
  const [customDueDay, setCustomDueDay] = useState(10);
  const [customStatus, setCustomStatus] = useState<PaymentStatus>('pendente');

  // NF generation modal state
  const [isNfModalOpen, setIsNfModalOpen] = useState(false);
  const [nfClient, setNfClient] = useState<Client | null>(null);
  const [nfNumber, setNfNumber] = useState(1042);
  const [nfServiceType, setNfServiceType] = useState('Controle de Pragas urbanas e desinsetização geral periódica realizada.');
  const [nfValue, setNfValue] = useState(250);
  const [nfCode, setNfCode] = useState('');

  // Auto-generate some verifier code when opening NF
  useEffect(() => {
    if (nfClient) {
      const randomHex = Math.random().toString(16).substr(2, 8).toUpperCase();
      const code = `${randomHex}-${Date.now().toString().slice(-4)}`;
      setNfCode(code);
    }
  }, [nfClient]);

  const handleSavePix = () => {
    if (!newPixKeyInput.trim()) {
      showToast('A chave Pix não pode estar vazia.', 'error');
      return;
    }
    AGRESTE_DB.savePixKey(newPixKeyInput);
    setPixKey(newPixKeyInput);
    setIsEditingPix(false);
    showToast('Chave PIX corporativa salva com sucesso!', 'success');
    onRefreshData();
  };

  // Fast payment status toggling directly
  const handleTogglePaymentStatus = (client: Client) => {
    const updatedStatus: PaymentStatus = client.paymentStatus === 'pago' ? 'pendente' : 'pago';
    const updatedClient: Client = {
      ...client,
      paymentStatus: updatedStatus
    };
    AGRESTE_DB.updateClient(updatedClient);
    showToast(`Status de pagamento de "${client.name}" alterado para ${updatedStatus === 'pago' ? 'pago' : 'pendente'}!`, 'success');
    onRefreshData();
  };

  const handleOpenBillingModal = (client: Client) => {
    setSelectedClient(client);
    setCustomValue(client.billingValue ?? 250);
    setCustomDueDay(client.dueDay ?? 10);
    setCustomStatus(client.paymentStatus);
    setIsBillingModalOpen(true);
  };

  const handleSaveBillingConfig = () => {
    if (!selectedClient) return;

    if (customValue <= 0) {
      showToast('O valor de faturamento deve ser maior que zero.', 'error');
      return;
    }

    if (customDueDay < 1 || customDueDay > 31) {
      showToast('O dia de vencimento deve estar entre 1 e 31.', 'error');
      return;
    }

    const updatedClient: Client = {
      ...selectedClient,
      billingValue: customValue,
      dueDay: customDueDay,
      paymentStatus: customStatus
    };

    AGRESTE_DB.updateClient(updatedClient);
    setIsBillingModalOpen(false);
    setSelectedClient(null);
    showToast('Ajuste de faturamento consolidado com sucesso!', 'success');
    onRefreshData();
  };

  const handleOpenNfGenerator = (client: Client) => {
    setNfClient(client);
    setNfValue(client.billingValue ?? 250);
    // Dynamic starting NF number is random / incrementing from a base
    setNfNumber(Math.floor(1000 + Math.random() * 9000));
    setNfServiceType('Controle Integrado de Pragas, saneamento ambiental, aspersão de barreiras químicas e auditoria sanitária da vigilância.');
    setIsNfModalOpen(true);
  };

  // Safe popup printing system to guarantee flawless high-fidelity printing without background bleed, margins or scaling issues.
  const printElementPopoutAndClose = (elementId: string, title: string) => {
    try {
      const targetElement = document.getElementById(elementId);
      if (!targetElement) {
        window.print();
        return;
      }

      // Scrap style tags
      const cssStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title.replace(/\s+/g, '_')}</title>
              ${cssStyles}
              <style>
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                    padding: 0;
                  }
                  .print-hide {
                    display: none !important;
                  }
                }
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  background: white;
                  color: #111827;
                  padding: 30px;
                }
                #billing-report-print, #nf-output-print {
                  max-height: none !important;
                  overflow: visible !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                th, td {
                  border-bottom: 1px solid #e5e7eb;
                  padding: 8px 12px;
                  text-align: left;
                }
                th {
                  background-color: #f9fafb;
                  font-weight: 700;
                }
              </style>
            </head>
            <body>
              <div>
                ${targetElement.innerHTML}
              </div>
              <script>
                window.focus();
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 150);
                }, 500);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (e) {
      console.error(e);
      window.print();
    }
  };

  // Calculations for billing dashboard
  const calculatedClientList = clients.map(c => ({
    ...c,
    billingValue: c.billingValue ?? 250,
    dueDay: c.dueDay ?? 10
  }));

  const filteredClients = calculatedClientList.filter(c => {
    const matchesQuery = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.responsible.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'todos') return matchesQuery;
    return matchesQuery && c.paymentStatus === statusFilter;
  });

  const totalExpected = calculatedClientList.reduce((acc, curr) => acc + curr.billingValue, 0);
  const totalReceived = calculatedClientList
    .filter(c => c.paymentStatus === 'pago')
    .reduce((acc, curr) => acc + curr.billingValue, 0);
  const totalPending = calculatedClientList
    .filter(c => c.paymentStatus === 'pendente')
    .reduce((acc, curr) => acc + curr.billingValue, 0);

  const countPaid = calculatedClientList.filter(c => c.paymentStatus === 'pago').length;
  const countPending = calculatedClientList.filter(c => c.paymentStatus === 'pendente').length;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black font-display tracking-tight text-[#D35400] leading-none">
            FATURAMENTO E FINANÇAS
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium font-mono tracking-wider mt-1 uppercase">
            Gestão financeira técnica AGRESTE
          </p>
        </div>
        
        {/* ACTION TRIGGER BUTTON FOR MAIN BILLING REPORT */}
        <button
          onClick={() => printElementPopoutAndClose('billing-report-print', `Relatorio_Faturamento_${new Date().toISOString().split('T')[0]}`)}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-lg shadow-orange-600/10 self-start"
        >
          <Printer className="w-4 h-4" /> Exportar Balancete Financeiro
        </button>
      </div>

      {/* DASHBOARD CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* EXPECTED REVENUE */}
        <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black font-mono tracking-wider text-zinc-500 uppercase">Faturamento Projetado</p>
              <h3 className="text-2xl font-semibold text-zinc-100 font-display tracking-tight mt-1.5">
                R$ {totalExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-zinc-900/60 border border-zinc-850 rounded-xl text-zinc-400">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 font-semibold mt-3">
            Total sobre <span className="font-bold text-zinc-300 font-mono">{clients.length}</span> clientes ativos contratados.
          </p>
        </div>

        {/* RECEIVED REVENUE (PAID) */}
        <div className="bg-emerald-950/5 border border-emerald-900/10 dark:border-emerald-500/10 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black font-mono tracking-wider text-emerald-500 uppercase">Total Recebido</p>
              <h3 className="text-2xl font-semibold text-emerald-400 font-display tracking-tight mt-1.5">
                R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 font-semibold mt-3">
            <span className="text-emerald-400 font-bold font-mono">{countPaid}</span> clientes confirmaram o adimplemento.
          </p>
        </div>

        {/* PENDING REVENUE */}
        <div className="bg-amber-950/5 border border-amber-900/10 dark:border-amber-500/10 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black font-mono tracking-wider text-amber-500 uppercase">Pendente / Em Aberto</p>
              <h3 className="text-2xl font-semibold text-amber-500 font-display tracking-tight mt-1.5">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 font-semibold mt-3">
            <span className="text-amber-500 font-bold font-mono">{countPending}</span> clientes aguardando vencimento.
          </p>
        </div>

        {/* CORPORATE PIX KEY SECTION */}
        <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black font-mono tracking-wider text-orange-400 uppercase">Chave Pix Empresa</span>
              <CreditCard className="w-4 h-4 text-orange-500" />
            </div>
            
            {isEditingPix ? (
              <div className="mt-2 flex gap-1.5">
                <input
                  type="text"
                  value={newPixKeyInput}
                  onChange={(e) => setNewPixKeyInput(e.target.value)}
                  className="flex-1 w-full text-xs font-mono font-bold bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500 text-white"
                />
                <button
                  onClick={handleSavePix}
                  className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center justify-between gap-1.5 group">
                <span className="text-xs font-mono font-bold text-zinc-200 block truncate" title={pixKey}>
                  {pixKey}
                </span>
                <button
                  onClick={() => {
                    setNewPixKeyInput(pixKey);
                    setIsEditingPix(true);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200 underline font-semibold shrink-0 cursor-pointer"
                >
                  Editar
                </button>
              </div>
            )}
          </div>
          <p className="text-[9px] text-zinc-500 leading-tight mt-2 italic">
            Integrada ao chatbot de autoatendimento para geração dinâmica de Pix copia e cola e QRCode.
          </p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-zinc-950/15 border border-zinc-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, responsável ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-orange-500 text-zinc-300 placeholder-zinc-500 transition-colors"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 shrink-0 bg-zinc-950/40 p-1 border border-zinc-900 rounded-xl overflow-x-auto">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-all ${
              statusFilter === 'todos'
                ? 'bg-orange-600/10 text-orange-500 border border-orange-500/10 font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({clients.length})
          </button>
          <button
            onClick={() => setStatusFilter('pago')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-all ${
              statusFilter === 'pago'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-black'
                : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            Pago ({countPaid})
          </button>
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-all ${
              statusFilter === 'pendente'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10 font-black'
                : 'text-zinc-400 hover:text-amber-500'
            }`}
          >
            Abertos ({countPending})
          </button>
        </div>
      </div>

      {/* CLIENTS FINANCES BILLING TABLE LIST */}
      <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/10">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-zinc-950/40 border-b border-zinc-900 text-[10px] uppercase tracking-wider font-extrabold text-zinc-400">
                <th className="px-6 py-4">Cod / Cliente</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Mensalidade</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Status Pagamento</th>
                <th className="px-6 py-4 text-right">Ações Faturamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/80 text-xs text-zinc-300">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-zinc-500 font-semibold font-mono">
                    Nenhum faturamento de cliente localizado nos filtros ativos.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isPaid = client.paymentStatus === 'pago';
                  return (
                    <tr 
                      key={client.id}
                      className="hover:bg-zinc-950/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-bold font-mono text-[#D35400] bg-orange-600/5 px-2 py-0.5 rounded border border-orange-500/10 shrink-0">
                            {client.code}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-zinc-100 block truncate max-w-[200px]">
                              {client.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              {client.city}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-zinc-200 font-semibold">{client.responsible}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{client.phone || '(Seta de contato pendente)'}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-black text-zinc-100 font-mono">
                          R$ {client.billingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold font-mono text-zinc-400">
                          Dia {client.dueDay}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleTogglePaymentStatus(client)}
                          className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-center cursor-pointer transition-all border ${
                            isPaid
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20'
                          }`}
                          title="Clique para alternar o status de pagamento"
                        >
                          {isPaid ? 'PACO / LIQUIDADO' : 'PENDENTE'}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Configure / Adjust values */}
                          <button
                            onClick={() => handleOpenBillingModal(client)}
                            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-orange-500/30 hover:bg-zinc-850 text-zinc-400 hover:text-orange-500 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                            title="Alterar valor de cobrança ou vencimento"
                          >
                            <Sliders className="w-3.5 h-3.5" /> Ajustar cobrança
                          </button>
                          
                          {/* Invoice NFS-e Generation block */}
                          <button
                            onClick={() => handleOpenNfGenerator(client)}
                            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-emerald-500/30 hover:bg-zinc-850 text-zinc-400 hover:text-emerald-400 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                            title="Gerar e imprimir Nota Fiscal (NF)"
                          >
                            <Receipt className="w-3.5 h-3.5" /> Emitir NF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DUMMY HIDDEN PRINT TABLE PORT - PERFECT CONSOLIDATED OUTPUT */}
      <div id="billing-report-print" className="hidden">
        <div style={{ fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
          {/* Logo Heading and metadata top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #D35400', paddingBottom: '15px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img 
                src="https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg" 
                alt="Logo Agreste" 
                width="64" 
                height="64" 
                style={{ borderRadius: '8px', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 style={{ color: '#D35400', fontSize: '26px', margin: 0, fontWeight: 900, tracking: 'tight' }}>
                  AGRESTE SAÚDE AMBIENTAL
                </h1>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', color: '#4b5563' }}>
                  Saneamento Técnico e Controle Fitosanitário
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '14px', margin: 0, fontWeight: 'bold', color: '#111827' }}>
                DEMONSTRATIVO DE FATURAMENTO GLOBAL
              </h2>
              <span style={{ fontSize: '10px', color: '#6b7280' }}>
                Emitido em: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Quick Metrics grid for printable paper */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280' }}>Faturamento Projetado</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', color: '#111827' }}>
                R$ {totalExpected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#ecfdf5' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#059669' }}>Total Liquidado</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', color: '#047857' }}>
                R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fffbeb' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#d97706' }}>Total Aberto / Pendente</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', color: '#b45309' }}>
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Detail List */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>CÓD</th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>CLIENTE</th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>RESPONSÁVEL</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>VALOR MENSAL</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>DIA VENC.</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>SITUAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {calculatedClientList.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px' }}>{c.code}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.name} ({c.city})</td>
                  <td style={{ padding: '8px' }}>{c.responsible}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>R$ {c.billingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>Dia {c.dueDay}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: c.paymentStatus === 'pago' ? '#047857' : '#b45309', fontWeight: 'bold' }}>
                    {c.paymentStatus === 'pago' ? 'LIQUIDADO' : 'PENDENTE'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signature and verification block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', borderTop: '1px dashed #e5e7eb', paddingTop: '30px' }}>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid #9ca3af', marginBottom: '5px' }} />
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#4b5563' }}>Controladoria Interna AGRESTE</span>
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid #9ca3af', marginBottom: '5px' }} />
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#4b5563' }}>Gerência Administrativa</span>
            </div>
          </div>
        </div>
      </div>

      {/* BILLING MODAL COMPLIANT CONFIGURATION PANEL */}
      {isBillingModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950/45">
              <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-orange-500 animate-pulse" /> CONFIGURAR COBRANÇA
              </h3>
              <button 
                onClick={() => {
                  setIsBillingModalOpen(false);
                  setSelectedClient(null);
                }}
                className="p-1 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-orange-500 font-mono block uppercase">Cliente Associado</span>
                <p className="text-sm font-bold text-zinc-100 mt-1">{selectedClient.name}</p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{selectedClient.city} • Resp: {selectedClient.responsible}</p>
              </div>

              {/* COBRANCA VALUE INPUT */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 font-mono block uppercase mb-1.5">Valor Mensal Cobrado (R$)</label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-zinc-500 text-xs font-bold">R$</div>
                  <input
                    type="number"
                    value={customValue}
                    onChange={(e) => setCustomValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2 pl-9 pr-4 text-xs font-mono font-bold focus:outline-none focus:border-orange-500 text-zinc-100 placeholder-zinc-700"
                    placeholder="250.00"
                  />
                </div>
              </div>

              {/* COBRANCA DUE DAY SELECTION */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 font-mono block uppercase mb-1.5">Dia do Vencimento Mensal</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={customDueDay}
                  onChange={(e) => setCustomDueDay(parseInt(e.target.value) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2 px-4 text-xs font-mono font-bold focus:outline-none focus:border-orange-500 text-zinc-100"
                />
                <span className="text-[9px] text-zinc-500 leading-none mt-1.5 block">Insira um dia útil de vencimento entre 1 e 31.</span>
              </div>

              {/* BILLING PAYMENT STATUS SELECT */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 font-mono block uppercase mb-1.5 font-display">Status de Pagamento Atual</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setCustomStatus('pendente')}
                    className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      customStatus === 'pendente'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    PENDENTE
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomStatus('pago')}
                    className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      customStatus === 'pago'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    PACO / LIQUIDADO
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end p-4 border-t border-zinc-900 bg-zinc-950/45">
              <button
                type="button"
                onClick={() => {
                  setIsBillingModalOpen(false);
                  setSelectedClient(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-[10px] uppercase font-bold text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSaveBillingConfig}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] uppercase rounded-lg transition-all cursor-pointer"
              >
                Confirmar Configuração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTA FISCAL (NF) DYNAMIC GENERATION & PRINT CONTROL PANEL */}
      {isNfModalOpen && nfClient && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950/45">
              <h3 className="text-sm font-black text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500 animate-pulse" /> EMISSOR DE NOTA FISCAL DE SERVIÇOS (NFS-e)
              </h3>
              <button 
                onClick={() => {
                  setIsNfModalOpen(false);
                  setNfClient(null);
                }}
                className="p-1 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
                title="Fechar emissão"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
              {/* Left Config Panel */}
              <div className="lg:col-span-4 space-y-4">
                <div className="border border-zinc-900 rounded-xl p-3 bg-zinc-900/10">
                  <span className="text-[10px] font-bold text-zinc-500 font-display block uppercase leading-none">Status Inicial</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-zinc-200">Tomador Pré-Validado</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 font-mono block uppercase mb-1">Cód. da Nota Fiscal (NFS-e)</label>
                  <input
                    type="number"
                    value={nfNumber}
                    onChange={(e) => setNfNumber(parseInt(e.target.value) || 1)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-1.5 px-3 text-xs font-mono font-bold focus:outline-none focus:border-orange-500 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 font-mono block uppercase mb-1">Valor dos Serviços (R$)</label>
                  <input
                    type="number"
                    value={nfValue}
                    onChange={(e) => setNfValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-1.5 px-3 text-xs font-mono font-bold focus:outline-none focus:border-orange-500 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 font-mono block uppercase mb-1">Informativo do Serviço Prestado</label>
                  <textarea
                    value={nfServiceType}
                    onChange={(e) => setNfServiceType(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-1.5 px-3 text-xs font-semibold focus:outline-none focus:border-orange-500 text-zinc-200 resize-none leading-relaxed"
                  />
                </div>

                <div className="text-[10px] text-zinc-500 leading-normal italic">
                  A NFS-e é gerada automaticamente de acordo com as diretrizes do Convênio Nacional da Receita Municipal. Os impostos federais e municipais correspondentes são recolhidos de forma integral.
                </div>
              </div>

              {/* Right Preview Panel (A4 Formats simulated elegantly) */}
              <div className="lg:col-span-8 space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase block leading-none">Espelho de Impressão (NFS-e)</span>
                
                {/* Visual A4 Print Box */}
                <div 
                  id="nf-output-print"
                  className="bg-zinc-50 text-zinc-950 p-8 rounded-2xl border border-zinc-200 shadow-xl max-h-[60vh] overflow-y-auto"
                >
                  <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', lineHeight: '1.5', fontSize: '12px' }}>
                    
                    {/* Header bar */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        
                        {/* Municipal emblem + Logo and branding */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ position: 'relative' }}>
                            <img 
                              src="https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg" 
                              alt="Logo Agreste" 
                              width="56" 
                              height="56" 
                              style={{ borderRadius: '10px', objectFit: 'cover', border: '1px solid #f1f5f9' }}
                              referrerPolicy="no-referrer"
                            />
                            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 'bold', border: '2px solid white' }}>✓</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'block' }}>REPUBLICA FEDERATIVA DO BRASIL</span>
                            <strong style={{ fontSize: '13px', display: 'block', color: '#0f172a', fontWeight: '800' }}>PREFEITURA MUNICIPAL DE GARANHUNS</strong>
                            <span style={{ fontSize: '11px', fontWeight: '600', display: 'block', color: '#475569' }}>Secretaria Municipal de Finanças e Arrecadação</span>
                          </div>
                        </div>

                        {/* Title Badge and ID Pill */}
                        <div style={{ textSelf: 'flex-end', textAlign: 'right', minWidth: '180px' }}>
                          <div style={{ display: 'inline-block', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '9px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '9999px', marginBottom: '6px' }}>
                            DOCUMENTO ELETRÔNICO VÁLIDO
                          </div>
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>NFS-e • NOTA FISCAL DE SERVIÇOS</span>
                          <strong style={{ fontSize: '15px', color: '#D35400', display: 'block', fontWeight: '900', marginTop: '2px' }}>Nº {nfNumber}</strong>
                        </div>

                      </div>

                      {/* Barcode-like validation line */}
                      <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '12px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b' }}>
                        <span><strong>Código Verificador:</strong> {nfCode}</span>
                        <span><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>

                    {/* Master Flex / Two Column layout for Prestador and Tomador */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      
                      {/* PRESTADOR DOS SERVIÇOS */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '12px', backgroundColor: '#D35400', borderRadius: '2px' }}></div>
                          <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase' }}>Prestador dos Serviços</span>
                        </div>
                        <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>AGRESTE SAÚDE AMBIENTAL LTDA</strong>
                        <span style={{ display: 'block', fontSize: '10px', color: '#475569', marginTop: '4px' }}><strong>CNPJ:</strong> 12.345.678/0001-90</span>
                        <span style={{ display: 'block', fontSize: '10px', color: '#475569' }}><strong>Inscr. Municipal:</strong> 994025-1 | <strong>UF:</strong> PE</span>
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Rua Vidal de Negreiros, 250, Centro<br />Garanhuns - PE • CEP: 55290-000</span>
                      </div>

                      {/* TOMADOR DOS SERVIÇOS */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
                          <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase' }}>Tomador de Serviços / Cliente</span>
                        </div>
                        <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>{nfClient.name}</strong>
                        <span style={{ display: 'block', fontSize: '10px', color: '#475569', marginTop: '4px' }}><strong>Responsável Técnico:</strong> {nfClient.responsible}</span>
                        <span style={{ display: 'block', fontSize: '10px', color: '#475569' }}><strong>Cidade do Tomador:</strong> {nfClient.city} - PE</span>
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748b', marginTop: '4px' }}><strong>Contato cadastrado:</strong><br />{nfClient.phone || '(Seta de contato corporativo)'}</span>
                      </div>

                    </div>

                    {/* DISCRIMINAÇÃO DOS SERVIÇOS */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '2px' }}></div>
                        <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase' }}>Descrição Técnica dos Serviços Executados</span>
                      </div>
                      <div style={{ padding: '4px', fontSize: '11px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line', minHeight: '60px' }}>
                        {nfServiceType}
                      </div>
                    </div>

                    {/* IMPOSTOS E TRIBUTAÇÃO */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '12px', backgroundColor: '#64748b', borderRadius: '2px' }}></div>
                        <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase' }}>Alíquotas e Retenções de Impostos</span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', divideX: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ padding: '12px', borderRight: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '8px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>ISSQN Retido</span>
                          <strong style={{ display: 'block', fontSize: '11px', color: '#0f172a', marginTop: '3px' }}>Isento / Não Retido</strong>
                        </div>
                        <div style={{ padding: '12px', borderRight: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '8px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Alíquota ISS (%)</span>
                          <strong style={{ display: 'block', fontSize: '11px', color: '#0f172a', marginTop: '3px' }}>2.00%</strong>
                        </div>
                        <div style={{ padding: '12px', borderRight: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '8px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Retenção COFINS</span>
                          <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '3px' }}>R$ 0,00</strong>
                        </div>
                        <div style={{ padding: '12px' }}>
                          <span style={{ fontSize: '8px', textTransform: 'uppercase', color: '#D35400', fontWeight: 'bold' }}>ISS do Município</span>
                          <strong style={{ display: 'block', fontSize: '11px', color: '#D35400', marginTop: '3px' }}>R$ {(nfValue * 0.02).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                      </div>
                    </div>

                    {/* VALOR LIQUIDO / INTERACTIVE COMPONETS FOR IMMEDIATE PAYMENT */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#fcfcfc', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor Líquido do Documento / NFS-e</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2.5px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>R$</span>
                          <strong style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.025em' }}>{nfValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                      </div>

                      {/* QRCODE block for smart instant PIX checkout */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', border: '1px solid #f1f5f9', padding: '10px 14px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#16a34a', display: 'block' }}>⚡ COMUNICADO DE FISCALIZAÇÃO</span>
                          <strong style={{ fontSize: '9px', display: 'block', color: '#0f172a', marginTop: '1.5px' }}>QR-CODE PIX CORPORATIVO</strong>
                          <span style={{ fontSize: '8px', color: '#64748b', display: 'block' }}>Aponte a câmera para realizar adimplemento</span>
                        </div>
                        <div style={{ padding: '4px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=00020101021126480014br.gov.bcb.pix0126${pixKey}`}
                            alt="QRCode Pix"
                            width="60"
                            height="60"
                            style={{ objectFit: 'contain' }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fiscal rules notes and warning */}
                    <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '20px', paddingTop: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '8px', color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                        Nota emitida eletronicamente sob autorização legal de serviços fitossanitários • Agreste Saúde Ambiental
                      </p>
                    </div>

                  </div>
                </div>

                {/* Print confirmation actions */}
                <div className="flex gap-2.5 justify-end">
                  <button
                    onClick={() => printElementPopoutAndClose('nf-output-print', `Nota_Fiscal_${nfNumber}_${nfClient.name.replace(/\s+/g, '_')}`)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow"
                  >
                    <Printer className="w-4 h-4" /> Autorizar e Imprimir NFS-e (PDF)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
