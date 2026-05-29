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
                  className="bg-white text-black p-4 md:p-6 rounded-xl border border-zinc-300 shadow-xl max-h-[60vh] overflow-y-auto"
                >
                  {/* Outer design container replicating Garanhuns DANFSe v1.0 standard */}
                  <div style={{
                    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                    color: '#000000',
                    lineHeight: '1.25',
                    fontSize: '9px',
                    backgroundColor: '#ffffff',
                    width: '100%',
                    maxWidth: '800px',
                    margin: '0 auto',
                    boxSizing: 'border-box',
                    padding: '0',
                    textAlign: 'left',
                    position: 'relative',
                    userSelect: 'text'
                  }}>
                    
                    {/* Official Agreste Waterproof Watermark stamp in background */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-25deg)',
                      opacity: 0.05,
                      pointerEvents: 'none',
                      zIndex: 0,
                      width: '320px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img 
                        src="https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg" 
                        alt="Watermark Agreste" 
                        width="150"
                        height="150"
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                        referrerPolicy="no-referrer"
                      />
                      <span style={{ fontSize: '24px', fontWeight: '900', color: '#000000', letterSpacing: '4px', marginTop: '10px' }}>AGRESTE</span>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000', letterSpacing: '1px' }}>SAÚDE AMBIENTAL</span>
                    </div>

                    {/* Master Grid Frame starts here */}
                    <div style={{ border: '2px solid #000000', width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 10, backgroundColor: 'transparent' }}>
                      
                      {/* HEADER ROW */}
                      <div style={{ display: 'flex', borderBottom: '2.5px solid #000000', alignItems: 'stretch' }}>
                        {/* Col 1: NFSe Logo */}
                        <div style={{ flex: '1.2', borderRight: '1.5px solid #000000', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ color: '#059669', fontSize: '25px', fontWeight: '900', letterSpacing: '-1.5px', fontFamily: 'sans-serif' }}>NFS-e</span>
                          <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }} />
                          <div style={{ fontSize: '6px', fontWeight: '800', color: '#000000', lineHeight: '1.1', textTransform: 'uppercase' }}>
                            Nota Fiscal de<br />Serviço eletrônica
                          </div>
                        </div>
                        {/* Col 2: DANFSe title */}
                        <div style={{ flex: '1.5', borderRight: '1.5px solid #000000', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                          <strong style={{ fontSize: '12px', fontWeight: '900', color: '#000000', letterSpacing: '0.5px' }}>DANFSe v1.0</strong>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#000000', marginTop: '2px' }}>Documento Auxiliar da NFS-e</span>
                        </div>
                        {/* Col 3: Prefeitura Garanhuns */}
                        <div style={{ flex: '1.6', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <svg width="34" height="38" viewBox="0 0 100 115" style={{ minWidth: '34px' }}>
                            {/* 1. MURAL CROWN (COROA MURAL) - Gray/silver with masonry work */}
                            <path d="M30 20 L70 20 L71 14 L65 14 L65 9 L59 9 L59 14 L53 14 L53 9 L47 9 L47 14 L41 14 L41 9 L35 9 L35 14 L29 14 Z" fill="#CCCCCC" stroke="#000000" strokeWidth="2.5" strokeLinejoin="miter" />
                            {/* Masonry horizontal lines */}
                            <line x1="30" y1="17" x2="70" y2="17" stroke="#000000" strokeWidth="1.5" />
                            {/* Vertical slits/windows in the crown towers */}
                            <line x1="32" y1="15" x2="32" y2="19" stroke="#000000" strokeWidth="1" />
                            <line x1="38" y1="11" x2="38" y2="14" stroke="#000000" strokeWidth="1" />
                            <line x1="44" y1="15" x2="44" y2="19" stroke="#000000" strokeWidth="1" />
                            <line x1="50" y1="11" x2="50" y2="14" stroke="#000000" strokeWidth="1" />
                            <line x1="56" y1="15" x2="56" y2="19" stroke="#000000" strokeWidth="1" />
                            <line x1="62" y1="11" x2="62" y2="14" stroke="#000000" strokeWidth="1" />
                            <line x1="68" y1="15" x2="68" y2="19" stroke="#000000" strokeWidth="1" />

                            {/* 2. SHIELD (ESCUDO) */}
                            {/* Outer boundary of shield */}
                            <path d="M26 21 L74 21 L74 58 C74 81, 50 94, 50 94 C 50 94, 26 81, 26 58 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="3" strokeLinejoin="round" />
                            
                            {/* Red base division (Wavy/Double Arch) */}
                            {/* This path starts at point (26, 50) on the left of shield and draws double arches to (74, 50), then follows the base curve of shield */}
                            <path d="M 26 50 C 34 38, 43 51, 50 43 C 57 51, 66 38, 74 50 L 74 58 C 74 81, 50 94, 50 94 C 50 94, 26 81, 26 58 Z" fill="#CC1111" stroke="#000000" strokeWidth="1.5" />

                            {/* Three Silver circles inside the red section */}
                            {/* Top left coin */}
                            <circle cx="39" cy="62" r="4.5" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
                            {/* Top right coin */}
                            <circle cx="61" cy="62" r="4.5" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
                            {/* Bottom coin */}
                            <circle cx="50" cy="76" r="4.5" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />

                            {/* Three Eagles in the upper white section */}
                            {/* Eagle 1 (Left, centered cx=38, cy=33) */}
                            <path d="M 34 34 L 32 30 L 35 30 L 37 28 L 38 27 L 39 28 L 41 30 L 44 30 L 42 34 L 40 32 L 39 36 L 37 36 L 36 32 Z" fill="#000000" />
                            {/* Eagle 2 (Center, centered cx=50, cy=33) */}
                            <path d="M 46 34 L 44 30 L 47 30 L 49 28 L 50 27 L 51 28 L 53 30 L 56 30 L 54 34 L 52 32 L 51 36 L 49 36 L 48 32 Z" fill="#000000" />
                            {/* Eagle 3 (Right, centered cx=62, cy=33) */}
                            <path d="M 58 34 L 56 30 L 59 30 L 61 28 L 62 27 L 63 28 L 65 30 L 68 30 L 66 34 L 64 32 L 63 36 L 61 36 L 60 32 Z" fill="#000000" />

                            {/* 3. SCROLL / RIBBON AT THE BOTTOM (Listão) with folds */}
                            <path d="M 18 97 C 34 93, 66 93, 82 97 C 82 97, 85 104, 76 102 C 67 100, 33 100, 24 102 C 15 104, 18 97, 18 97 Z" fill="#CC1111" stroke="#000000" strokeWidth="1.5" />
                            <path d="M 18 97 C 15 99, 12 101, 14 105 C 18 105, 20 102, 18 97 Z" fill="#880000" stroke="#000000" strokeWidth="1" />
                            <path d="M 82 97 C 85 99, 88 101, 86 105 C 82 105, 80 102, 82 97 Z" fill="#880000" stroke="#000000" strokeWidth="1" />
                          </svg>
                          <div style={{ textAlign: 'left', lineHeight: '1.1' }}>
                            <div style={{ fontSize: '8px', fontWeight: '900', color: '#000000' }}>PREFEITURA MUNICIPAL DE</div>
                            <div style={{ fontSize: '11px', fontWeight: '950', color: '#000000' }}>GARANHUNS</div>
                            <div style={{ fontSize: '7.5px', fontWeight: '700', color: '#374151' }}>SECRETARIA DA FAZENDA</div>
                          </div>
                        </div>
                      </div>

                      {/* ACCESS KEY BAR */}
                      <div style={{ borderBottom: '1.5px solid #000000', padding: '4px 6px' }}>
                        <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563' }}>Chave de Acesso da NFS-e</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000', letterSpacing: '0.5px', fontFamily: 'monospace', marginTop: '2px' }}>
                          2606002616736300010056000{String(nfNumber).padStart(9, '0')}6260341353
                        </div>
                      </div>

                      {/* NFS-e NUMBERS & QR CODE BLOCK */}
                      <div style={{ display: 'flex', borderBottom: '2.5px solid #000000', alignItems: 'stretch' }}>
                        <div style={{ flex: '3', display: 'flex', flexDirection: 'column' }}>
                          {/* Upper line */}
                          <div style={{ display: 'flex', borderBottom: '1.5px solid #000000', flex: '1' }}>
                            <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563' }}>Número da NFS-e</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>{nfNumber}</div>
                            </div>
                            <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563' }}>Competência da NFS-e</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>{new Date().toLocaleDateString('pt-BR')}</div>
                            </div>
                            <div style={{ flex: '1.5', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563' }}>Data e Hora da emissão da NFS-e</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>{new Date().toLocaleDateString('pt-BR')} 11:55:14</div>
                            </div>
                          </div>
                          {/* Lower line */}
                          <div style={{ display: 'flex', flex: '1' }}>
                            <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563' }}>Número da DPS</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>2600000000{nfNumber}</div>
                            </div>
                            <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563' }}>Série da DPS</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>9</div>
                            </div>
                            <div style={{ flex: '1.5', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#4b5563' }}>Data e Hora da emissão da DPS</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>{new Date().toLocaleDateString('pt-BR')} 11:55:14</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right side QR information cell */}
                        <div style={{ flex: '1', borderLeft: '1.5px solid #000000', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=00020101021126480014br.gov.bcb.pix0126${pixKey}`}
                            alt="QRCode Pix"
                            width="50"
                            height="50"
                            style={{ objectFit: 'contain', border: '1px solid #cbd5e1', padding: '1px', borderRadius: '4px', backgroundColor: '#ffffff' }}
                            referrerPolicy="no-referrer"
                          />
                          <div style={{ fontSize: '6px', color: '#4b5563', lineHeight: '1.15', textTransform: 'none' }}>
                            A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e
                          </div>
                        </div>
                      </div>

                      {/* EMITENTE DA NFS-e ROW */}
                      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000', padding: '3px 6px', fontWeight: '800', fontSize: '8px', color: '#000000', letterSpacing: '0.5px' }}>
                        EMITENTE DA NFS-e
                      </div>
                      <div style={{ display: 'flex', borderBottom: '2.5px solid #000000', alignItems: 'stretch' }}>
                        <div style={{ flex: '8', display: 'flex', flexDirection: 'column' }}>
                          {/* Name and Basic Info Row */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                            <div style={{ flex: '2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Nome / Nome Empresarial</div>
                              <div style={{ fontSize: '10px', fontWeight: '900', color: '#000000' }}>AGRESTE CONTROLE DE PRAGAS LTDA</div>
                            </div>
                            <div style={{ flex: '1.2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>CNPJ / CPF / NIF</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000' }}>26.167.363/0001-00</div>
                            </div>
                            <div style={{ flex: '0.8', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Inscrição Municipal</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000' }}>3579581</div>
                            </div>
                            <div style={{ flex: '0.8', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Telefone</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000' }}>3762-4267</div>
                            </div>
                          </div>
                          {/* Address Row */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                            <div style={{ flex: '2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Endereço</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Rua Dr Jardim, , Santo Antônio</div>
                            </div>
                            <div style={{ flex: '1.2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>E-mail</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000', textTransform: 'lowercase' }}>sac@agrestededetizadora.com</div>
                            </div>
                            <div style={{ flex: '0.8', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Município</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Garanhuns - PE</div>
                            </div>
                            <div style={{ flex: '0.8', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>CEP</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>55293-280</div>
                            </div>
                          </div>
                          {/* Simples Nacional Row */}
                          <div style={{ display: 'flex' }}>
                            <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Simples Nacional na Data de Competência</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Não optante</div>
                            </div>
                            <div style={{ flex: '1', padding: '4px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Regime de Apuração Tributária pelo SN</div>
                              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Stamped Corporate Logo Section inside EMITENTE */}
                        <div style={{ flex: '1.8', borderLeft: '1.5px solid #000000', padding: '4px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', textAlign: 'center' }}>
                          <img 
                            src="https://i.postimg.cc/W3fG6xMt/Whats-App-Image-2026-05-21-at-16-33-40.jpg" 
                            alt="Logo Emitente Agreste" 
                            width="48" 
                            height="48" 
                            style={{ borderRadius: '6px', objectFit: 'cover', border: '1px solid #1e293b' }}
                            referrerPolicy="no-referrer"
                          />
                          <div style={{ fontSize: '6px', fontWeight: '900', color: '#D35400', marginTop: '3px', letterSpacing: '0.3px' }}>AGRESTE</div>
                          <div style={{ fontSize: '5px', color: '#6b7280', textTransform: 'lowercase' }}>registro nº 3579581</div>
                        </div>
                      </div>

                      {/* TOMADOR DO SERVIÇO ROW */}
                      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000', padding: '3px 6px', fontWeight: '800', fontSize: '8px', color: '#000000', letterSpacing: '0.5px' }}>
                        TOMADOR DO SERVIÇO
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '2.5px solid #000000' }}>
                        {/* Row 1 */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                          <div style={{ flex: '2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Nome / Nome Empresarial</div>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: '#000000' }}>{nfClient.name}</div>
                          </div>
                          <div style={{ flex: '1.2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>CNPJ / CPF / NIF</div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000' }}>30.987.372/0001-14</div>
                          </div>
                          <div style={{ flex: '0.8', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Inscrição Municipal</div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '0.8', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Telefone</div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000' }}>{nfClient.phone || '-'}</div>
                          </div>
                        </div>
                        {/* Row 2 */}
                        <div style={{ display: 'flex' }}>
                          <div style={{ flex: '2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Endereço</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>RUA PROJETADA 02, , NOVO HELIOPOLIS</div>
                          </div>
                          <div style={{ flex: '1.2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>E-mail</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000', textTransform: 'lowercase' }}>{nfClient.email || 'sradm@hotmail.com'}</div>
                          </div>
                          <div style={{ flex: '0.8', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Município</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>{nfClient.city || 'Garanhuns'} - PE</div>
                          </div>
                          <div style={{ flex: '0.8', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>CEP</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>55297-130</div>
                          </div>
                        </div>
                      </div>

                      {/* INTERMEDIARIO DA NFS-E */}
                      <div style={{ backgroundColor: '#fafafa', borderBottom: '2.5px solid #000000', padding: '4px 6px', textAlign: 'center', fontSize: '7.5px', fontWeight: 'bold', color: '#4b5563', letterSpacing: '0.3px' }}>
                        INTERMEDIÁRIO DO SERVIÇO NÃO IDENTIFICADO NA NFS-e
                      </div>

                      {/* SERVIÇO PRESTADO ROW */}
                      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000', padding: '3px 6px', fontWeight: '800', fontSize: '8px', color: '#000000', letterSpacing: '0.5px' }}>
                        SERVIÇO PRESTADO
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '2.5px solid #000000' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                          <div style={{ flex: '2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Código de Tributação Nacional</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>07.13.01 - Dedetização, desinfecção, desinsetização, imunização, higienização,</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Código de Tributação Municipal</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Local da Prestação</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>{nfClient.city.toUpperCase() || 'GARANHUNS'} - PE</div>
                          </div>
                          <div style={{ flex: '0.8', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>País da Prestação</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                        </div>
                        <div style={{ padding: '6px', minHeight: '45px' }}>
                          <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Descrição do serviço</div>
                          <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000000', whiteSpace: 'pre-line', lineHeight: '1.35', marginTop: '2px' }}>
                            {nfServiceType || 'CONTROLE DE PRAGAS'}
                          </div>
                        </div>
                      </div>

                      {/* TRIBUTAÇÃO MUNICIPAL ROW */}
                      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000', padding: '3px 6px', fontWeight: '800', fontSize: '8px', color: '#000000', letterSpacing: '0.5px' }}>
                        TRIBUTAÇÃO MUNICIPAL
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '2.5px solid #000000' }}>
                        {/* Row 1 */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Tributação do ISSQN</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Operação Tributável</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>País Result. da Prestação do Serviço</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Município de Incidência do ISSQN</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Garanhuns - PE</div>
                          </div>
                          <div style={{ flex: '1', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Regime Especial de Tributação</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Nenhum</div>
                          </div>
                        </div>
                        {/* Row 2 */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Tipo de Imunidade</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Suspensão da Exigibilidade do ISSQN</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Não</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Número Processo Suspensão</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Benefício Municipal</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                        </div>
                        {/* Row 3 */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Valor do Serviço</div>
                            <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000000' }}>R$ {nfValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Desconto Incondicionado</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Total Deduções/Reduções</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Cálculo do BM</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                        </div>
                        {/* Row 4 */}
                        <div style={{ display: 'flex' }}>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>BC ISSQN</div>
                            <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000000' }}>R$ {nfValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Alíquota Aplicada</div>
                            <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000000' }}>2,79 %</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Retenção do ISSQN</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Não Retido</div>
                          </div>
                          <div style={{ flex: '1', padding: '4px 6px', backgroundColor: '#fafafa' }}>
                            <div style={{ fontSize: '7px', color: '#b91c1c', fontWeight: 'bold' }}>ISSQN Apurado</div>
                            <div style={{ fontSize: '9.5px', fontWeight: '900', color: '#b91c1c' }}>R$ {(nfValue * 0.0279).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                      </div>

                      {/* TRIBUTAÇÃO FEDERAL ROW */}
                      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000', padding: '3px 6px', fontWeight: '800', fontSize: '8px', color: '#000000', letterSpacing: '0.5px' }}>
                        TRIBUTAÇÃO FEDERAL
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '2.5px solid #000000' }}>
                        {/* Row 1 */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>IRRF</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1.2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Contribuição Previdenciária - Retida</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1.2', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Contribuições Sociais - Retidas</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1.2', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Descrição Contrib. Sociais - Retidas</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>R$ 0,00</div>
                          </div>
                        </div>
                        {/* Row 2 */}
                        <div style={{ display: 'flex' }}>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>PIS - Débito Apuração Própria</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>COFINS - Débito Apuração Própria</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                        </div>
                      </div>

                      {/* VALOR TOTAL DA NFS-E */}
                      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000', padding: '3px 6px', fontWeight: '800', fontSize: '8px', color: '#000000', letterSpacing: '0.5px' }}>
                        VALOR TOTAL DA NFS-E
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '2.5px solid #000000' }}>
                        {/* Row 1 */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #000000' }}>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Valor do Serviço</div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000000' }}>R$ {nfValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Desconto Condicionado</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Desconto Incondicionado</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>-</div>
                          </div>
                          <div style={{ flex: '1', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>ISSQN Retido</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>Não Retido</div>
                          </div>
                        </div>
                        {/* Row 2 */}
                        <div style={{ display: 'flex' }}>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Total das Retenções Federais</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>R$ 0,00</div>
                          </div>
                          <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px' }}>
                            <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>PIS/COFINS Retidos</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#000000' }}>R$ 0,00</div>
                          </div>
                          <div style={{ flex: '1.2', padding: '4px 6px', backgroundColor: '#edfcf2' }}>
                            <div style={{ fontSize: '8px', color: '#059669', fontWeight: 'bold' }}>Valor Líquido da NFS-e</div>
                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#059669', marginTop: '1px' }}>R$ {nfValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                      </div>

                      {/* TOTAIS APROXIMADOS DOS TRIBUTOS */}
                      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000', padding: '3px 6px', fontWeight: '800', fontSize: '8px', color: '#000000', letterSpacing: '0.5px' }}>
                        TOTAIS APROXIMADOS DOS TRIBUTOS
                      </div>
                      <div style={{ display: 'flex', borderBottom: '2.5px solid #000000', alignItems: 'stretch' }}>
                        <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Federais</div>
                          <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>R$ 0,00</div>
                        </div>
                        <div style={{ flex: '1', borderRight: '1.5px solid #000000', padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Estaduais</div>
                          <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>R$ 0,00</div>
                        </div>
                        <div style={{ flex: '1', padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '7px', color: '#4b5563', fontWeight: 'bold' }}>Municipais</div>
                          <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>R$ {(nfValue * 0.0279).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>

                      {/* INFORMAÇÕES COMPLEMENTARES */}
                      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #000000', padding: '3px 6px', fontWeight: '800', fontSize: '8px', color: '#000000', letterSpacing: '0.5px' }}>
                        INFORMAÇÕES COMPLEMENTARES
                      </div>
                      <div style={{ padding: '6px', minHeight: '40px', fontSize: '8px', color: '#000000', lineHeight: '1.4', textTransform: 'none' }}>
                        Nome: {nfClient.code || '26.167.363'} • Operador de Emissão: <strong>{(() => {
                          const details = AGRESTE_DB.getUserDetails();
                          const userObject = currentUser ? details[currentUser.toLowerCase().trim()] : null;
                          return userObject?.name || AGRESTE_DB.getProfile().name || currentUser || 'Adriano Senna';
                        })()}</strong> • Garanhuns - PE<br />
                        Emissão de nota fiscal de serviços baseada inteiramente no Convênio de Autoconformidade Tributária Municipal de Garanhuns sob Decreto Fiscal Nacional.<br />
                        Prestação de serviço fitofarmacêutico e químico de desinsetização de alta eficiência da Agreste Saúde Ambiental.
                      </div>

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
