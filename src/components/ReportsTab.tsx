/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { VisitReport, PestStatus } from '../types';
import { AGRESTE_DB } from '../services/db';
import { 
  FileText, Search, Filter, Download, Trash2, Calendar, 
  MapPin, User, ChevronDown, Check, Star, RefreshCw, AlertTriangle, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportsTabProps {
  theme: 'light' | 'dark';
  reports: VisitReport[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
  canEdit?: boolean;
  currentUser?: string;
}

export default function ReportsTab({ theme, reports, showToast, onRefreshData, canEdit = true, currentUser }: ReportsTabProps) {
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
    if (!itemCreatorUsername) return true; // old reports are editable by any tech
    return itemCreatorUsername.toLowerCase().trim() === currentUser?.toLowerCase().trim();
  };
  // Filter states
  const [filterClient, setFilterClient] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPest, setFilterPest] = useState<'todos' | 'realizado' | 'realizando' | 'sem_necessidade'>('todos');
  const [filterDate, setFilterDate] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; date: string } | null>(null);
  const [previewReport, setPreviewReport] = useState<VisitReport | null>(null);
  const [shouldAutoPrint, setShouldAutoPrint] = useState(false);

  // Auto-print effect when shouldAutoPrint and previewReport is loaded
  useEffect(() => {
    if (shouldAutoPrint && previewReport) {
      const timer = setTimeout(() => {
        handlePrintDocument(previewReport);
        setShouldAutoPrint(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPrint, previewReport]);

  // Safe popout print technique to work reliably both inside and outside iFrames
  const handlePrintDocument = (report: VisitReport) => {
    try {
      const reportElement = document.getElementById('printable-paper-report');
      if (!reportElement) {
        // Fallback to normal print if element hasn't mounted yet
        window.print();
        return;
      }

      // Collect all stylesheets and inline rules from the parent document
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>AGRESTE_Relatorio_${report.clientName.replace(/\s+/g, '_')}</title>
              ${styles}
              <style>
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                  }
                }
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  background: white;
                  color: #111827;
                  padding: 20px;
                }
                #printable-paper-report {
                  max-height: none !important;
                  overflow: visible !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                }
              </style>
            </head>
            <body>
              <div id="printable-paper-report">
                ${reportElement.innerHTML}
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
        // Fallback if window.open popup was blocked
        window.print();
      }
    } catch (error) {
      console.error("Print popup blocked or failed, falling back to window.print", error);
      window.print();
    }
  };

  // Delete report
  const handleDeleteReport = (id: string, clientName: string, date: string) => {
    setDeleteConfirm({ id, name: clientName, date });
  };

  // Convert application data to CSV string and download as Excel file
  const handleExportExcel = () => {
    if (filteredReports.length === 0) {
      showToast('Nenhum relatório corresponde aos filtros ativos para exportação.', 'info');
      return;
    }

    // CSV Header with BOM and explicit sep marker for Microsoft Excel
    let csvContent = '\uFEFFsep=;\n';
    csvContent += 'ID;Cliente;Cidade;Mes;Data;Tecnico;Pontualidade;Comunicacao;Moscas;Baratas;Ratos;Formigas;Recomendacoes;Satisfacao;Comentarios;Indicacoes;Data Criacao\n';

    filteredReports.forEach((rep) => {
      const line = [
        rep.id || '',
        `"${(rep.clientName || '').toString().replace(/"/g, '""')}"`,
        `"${(rep.clientCity || '').toString().replace(/"/g, '""')}"`,
        `"${(rep.month || '').toString().replace(/"/g, '""')}"`,
        `"${(rep.date || '').toString().replace(/"/g, '""')}"`,
        `"${(rep.techName || '').toString().replace(/"/g, '""')}"`,
        rep.punctuality ?? '',
        rep.communication ?? '',
        `"${(rep.pests?.moscas || '').toString().toUpperCase()}"`,
        `"${(rep.pests?.baratas || '').toString().toUpperCase()}"`,
        `"${(rep.pests?.ratos || '').toString().toUpperCase()}"`,
        `"${(rep.pests?.formigas || '').toString().toUpperCase()}"`,
        `"${(rep.recommendations || '').toString().replace(/"/g, '""')}"`,
        `"${(rep.satisfaction || '').toString().replace(/"/g, '""')}"`,
        `"${(rep.comments || '').toString().replace(/"/g, '""')}"`,
        `"${(rep.referrals || '').toString().replace(/"/g, '""')}"`,
        `"${(rep.createdAt || '').toString().replace(/"/g, '""')}"`
      ].join(';');
      csvContent += line + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AGRESTE_Relatorio_Exportado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Planilha de relatórios exportada com sucesso!', 'success');
  };

  // Generate beautiful simulated standalone consolidated general report window / PDF
  const handleDownloadGeneralReport = () => {
    if (filteredReports.length === 0) {
      showToast('Nenhum relatório técnico para compilar.', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Erro ao abrir janela de impressão. Certifique-se de que os popups estão ativados.', 'error');
      return;
    }

    // Compute simple metrics for summary
    const totalReports = filteredReports.length;
    const avgPunctuality = (filteredReports.reduce((sum, r) => sum + r.punctuality, 0) / totalReports).toFixed(1);
    const avgCommunication = (filteredReports.reduce((sum, r) => sum + r.communication, 0) / totalReports).toFixed(1);

    const moscasCount = filteredReports.filter(r => r.pests.moscas === 'realizado').length;
    const baratasCount = filteredReports.filter(r => r.pests.baratas === 'realizado').length;
    const ratosCount = filteredReports.filter(r => r.pests.ratos === 'realizado').length;
    const formigasCount = filteredReports.filter(r => r.pests.formigas === 'realizado').length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AGRESTE - Relatório Consolidado Geral</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #18181b; line-height: 1.5; background: #fff; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #D35400; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-text { font-size: 32px; font-weight: bold; color: #D35400; letter-spacing: -0.025em; }
          .slogan { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #71717a; margin-top: 2px; }
          .title { text-align: right; font-size: 14px; font-family: monospace; color: #52525b; }
          
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .metric-card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 15px; background: #fafafa; text-align: center; }
          .metric-val { font-size: 22px; font-weight: bold; color: #D35400; }
          .metric-lbl { font-size: 10px; color: #71717a; text-transform: uppercase; margin-top: 4px; font-weight: bold; }
          
          .section-title { font-size: 16px; color: #D35400; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
          
          .table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
          .table th { background: #D35400; color: white; text-align: left; font-size: 10px; text-transform: uppercase; padding: 10px; }
          .table td { border-bottom: 1px solid #e4e4e7; padding: 10px; }
          
          .badge { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; border-radius: 4px; }
          .badge-realizado { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
          .badge-realizando { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
          .badge-sem_necessidade { background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; }
          
          .note-box { font-size: 12px; background: #fafafa; border-left: 3px solid #D35400; padding: 10px; border-radius: 0 6px 6px 0; margin-bottom: 10px; border-top: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7; border-bottom: 1px solid #e4e4e7; }
          .log-entry { margin-bottom: 20px; page-break-inside: avoid; }
          .log-header { font-size: 13px; font-weight: bold; color: #18181b; margin-bottom: 6px; }
          
          .footer { text-align: center; font-size: 10px; color: #a1a1aa; margin-top: 50px; border-top: 1px solid #f4f4f5; padding-top: 20px; page-break-inside: avoid; }
          
          @media print { body { padding: 0; } .metric-card { background: transparent; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-text">AGRESTE</div>
            <div class="slogan">saúde ambiental</div>
          </div>
          <div class="title">
            <strong>RELATÓRIO CONSOLIDADO DOS ATENDIMENTOS</strong><br>
            Filtro Ativo: ${filteredReports.length} registro(s)<br>
            Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-val">${totalReports}</div>
            <div class="metric-lbl">Total Visitas</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${avgPunctuality} / 10</div>
            <div class="metric-lbl">Pontualidade Média</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${avgCommunication} / 10</div>
            <div class="metric-lbl">Comunicação Média</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${moscasCount + baratasCount + ratosCount + formigasCount}</div>
            <div class="metric-lbl">Ações Pragas</div>
          </div>
        </div>

        <div class="section-title">Resumo da Planilha de Atendimento</div>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Cliente / Razão</th>
              <th>Cidade</th>
              <th>Técnico</th>
              <th>Satisfação</th>
              <th>Moscas</th>
              <th>Baratas</th>
              <th>Rato</th>
              <th>Formiga</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReports.map(rep => `
              <tr>
                <td><strong>${rep.id.split('-')[1]?.toUpperCase() || rep.id.substring(0, 4).toUpperCase()}</strong></td>
                <td>${rep.date}</td>
                <td><strong>${rep.clientName}</strong></td>
                <td>${rep.clientCity}</td>
                <td>${rep.techName}</td>
                <td style="font-weight: 500; color: #059669;">${rep.satisfaction || 'Excelente'}</td>
                <td><span class="badge badge-${rep.pests.moscas}">${rep.pests.moscas === 'sem_necessidade' ? 'Inat.' : rep.pests.moscas === 'realizando' ? 'And.' : 'Concl.'}</span></td>
                <td><span class="badge badge-${rep.pests.baratas}">${rep.pests.baratas === 'sem_necessidade' ? 'Inat.' : rep.pests.baratas === 'realizando' ? 'And.' : 'Concl.'}</span></td>
                <td><span class="badge badge-${rep.pests.ratos}">${rep.pests.ratos === 'sem_necessidade' ? 'Inat.' : rep.pests.ratos === 'realizando' ? 'And.' : 'Concl.'}</span></td>
                <td><span class="badge badge-${rep.pests.formigas}">${rep.pests.formigas === 'sem_necessidade' ? 'Inat.' : rep.pests.formigas === 'realizando' ? 'And.' : 'Concl.'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title" style="page-break-before: always;">Observações detalhadas dos atendimentos</div>
        <div style="margin-top: 15px;">
          ${filteredReports.map(rep => `
            ${rep.recommendations || rep.comments ? `
              <div class="log-entry">
                <div class="log-header">${rep.date} - ${rep.clientName} (${rep.clientCity}) — Técnico: ${rep.techName}</div>
                ${rep.recommendations ? `
                  <div class="note-box">
                    <strong>RECOMENDAÇÕES PARA O CLIENTE:</strong><br>
                    ${rep.recommendations}
                  </div>
                ` : ''}
                ${rep.comments ? `
                  <div class="note-box" style="border-left-color: #71717a;">
                    <strong>OBSERVAÇÕES DO CLIENTE:</strong><br>
                    ${rep.comments}
                  </div>
                ` : ''}
              </div>
            ` : ''}
          `).join('')}
        </div>

        <div class="footer">
          AGRESTE - Saúde Ambiental • Controle de Pragas de Alta Performance • Recife, Caruaru, Garanhuns.<br>
          <i>Este documento é um consolidado oficial exportado da plataforma de vistorias técnicas AGRESTE.</i>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    showToast('Relatório geral compilado e preparado para PDF.', 'success');
  };

  // Reset filtering options
  const handleClearFilters = () => {
    setFilterClient('');
    setFilterCity('');
    setFilterPest('todos');
    setFilterDate('');
    showToast('Filtros de relatórios redefinidos.', 'info');
  };

  // filter implementation
  const filteredReports = reports.filter((rep) => {
    // client match
    if (filterClient && !rep.clientName.toLowerCase().includes(filterClient.toLowerCase())) {
      return false;
    }
    // city match
    if (filterCity && !rep.clientCity.toLowerCase().includes(filterCity.toLowerCase())) {
      return false;
    }
    // date match
    if (filterDate && rep.date !== filterDate) {
      return false;
    }
    // pest match
    if (filterPest !== 'todos') {
      const match = 
        rep.pests.moscas === filterPest ||
        rep.pests.baratas === filterPest ||
        rep.pests.ratos === filterPest ||
        rep.pests.formigas === filterPest;
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight">Histórico de Relatórios</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Lista indexada de registros diários para auditorias, fiscalizações e laudos fitossanitários de desinsetização.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadGeneralReport}
            id="download-general-reports-pdf"
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-orange-600/10 cursor-pointer hover:scale-[1.01] transition-transform duration-105"
          >
            <FileText className="w-4 h-4" /> Relatório Geral (PDF)
          </button>
          <button
            onClick={handleExportExcel}
            id="export-reports-btn"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 cursor-pointer hover:scale-[1.01] transition-transform duration-100"
          >
            <Download className="w-4 h-4" /> Exportar Planilha Excel
          </button>
        </div>
      </div>

      {/* Filters Form Panel */}
      <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-orange-500">
          <Filter className="w-4 h-4" /> Painel de Filtros e Consultas
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Client Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">Filtrar por Cliente</label>
            <input
              type="text"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              placeholder="Digite o nome..."
              id="filter-client-input"
              className={`w-full py-2 px-3 rounded-lg border text-sm outline-none transition-all ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-50 border-zinc-200'
              }`}
            />
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">Filtrar por Cidade</label>
            <input
              type="text"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              placeholder="Ex: Caruaru"
              id="filter-city-input"
              className={`w-full py-2 px-3 rounded-lg border text-sm outline-none transition-all ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-50 border-zinc-200'
              }`}
            />
          </div>

          {/* Control Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">Status Controle Praga</label>
            <select
              value={filterPest}
              onChange={(e) => setFilterPest(e.target.value as any)}
              id="filter-pest-select"
              className={`w-full py-2 px-3 rounded-lg border text-sm outline-none transition-all ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-[#D35400]' : 'bg-zinc-50 border-zinc-200 text-zinc-850'
              }`}
            >
              <option value="todos" className="bg-[#1A1A1A] text-zinc-105">Todos</option>
              <option value="realizado" className="bg-[#1A1A1A] text-zinc-105">Concluído (Realizado)</option>
              <option value="realizando" className="bg-[#1A1A1A] text-zinc-105">Em Ação (Realizando)</option>
              <option value="sem_necessidade" className="bg-[#1A1A1A] text-zinc-105">Inativo (Sem Necessidade)</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">Filtrar por Data da Visita</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                id="filter-date-input"
                className={`w-full py-2 px-3 rounded-lg border text-sm outline-none transition-all ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-800 focus:border-orange-500' : 'bg-zinc-50 border-zinc-200'
                }`}
              />
              <button
                onClick={handleClearFilters}
                id="clear-filters-btn"
                className={`px-3 py-2 border rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
                title="Limpar Filtros"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List Cards */}
      {filteredReports.length === 0 ? (
        <div className={`py-12 text-center rounded-2xl border border-dashed ${
          theme === 'dark' ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <FileText className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
          <p className="text-md font-semibold font-display">Nenhum relatório técnico catalogado</p>
          <p className="text-xs text-zinc-500 mt-1">Modifique as pesquisas para visualizar relatórios arquivados de atendimentos passados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((rep) => (
            <div
              key={rep.id}
              className={`p-5 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:shadow-md'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Visual Details */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-orange-600/10 text-orange-500 font-bold font-mono text-[10px] uppercase">
                      ID: {rep.id.split('-')[1] || rep.id}
                    </span>
                    <h3 className="font-bold text-base text-zinc-200 dark:text-zinc-100 font-display">
                      {rep.clientName}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-orange-500" /> {rep.clientCity}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-orange-500" /> {rep.date} ({rep.month})</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-orange-500" /> Técnico: {rep.techName}</span>
                  </div>

                  {/* Pest highlights */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(rep.pests).map(([pest, status]) => {
                      if (status === 'sem_necessidade') return null;
                      return (
                        <span 
                          key={pest} 
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            status === 'realizado' 
                              ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-600/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {pest === 'moscas' ? '🦟 Moscas' : pest === 'baratas' ? '🪳 Baratas' : pest === 'ratos' ? '🐀 Ratos' : '🐜 Formigas'}: {status === 'realizado' ? 'Ok' : 'Fazendo'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Operations & actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => setPreviewReport(rep)}
                    id={`preview-rep-${rep.id}`}
                    className="px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-350 hover:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Visualizar Relatório"
                  >
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </button>
                  <button
                    onClick={() => {
                      setPreviewReport(rep);
                      setShouldAutoPrint(true);
                    }}
                    id={`download-rep-${rep.id}`}
                    className="px-3 py-2 bg-orange-600/10 hover:bg-[#D35400] border border-orange-500/20 text-[#D35400] hover:text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Baixar PDF"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar PDF
                  </button>
                  {canModifyItem(rep.createdBy) && (
                    <button
                      onClick={() => handleDeleteReport(rep.id, rep.clientName, rep.date)}
                      id={`delete-rep-${rep.id}`}
                      className="p-2 border border-zinc-800 text-zinc-500 hover:text-red-500 rounded-xl hover:bg-zinc-950/20 transition-colors cursor-pointer"
                      title="Excluir Relatório"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: DELETE CONFIRM OVERLAY */}
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
                Tem certeza que deseja excluir o relatório técnico da visita ao cliente <span className="font-bold text-orange-500">"{deleteConfirm.name}"</span> realizada em <span className="font-bold whitespace-nowrap text-white">{deleteConfirm.date}</span>?
                Esta ação apagará permanentemente o documento do histórico.
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
                    const reportToDelete = reports.find(r => r.id === deleteConfirm.id);
                    if (!canModifyItem(reportToDelete?.createdBy)) {
                      showToast('Nível de permissão insuficiente para excluir este relatório.', 'error');
                      return;
                    }
                    AGRESTE_DB.deleteReport(deleteConfirm.id);
                    showToast(`Relatório de "${deleteConfirm.name}" excluído.`, 'success');
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

      {/* MODAL: STYLISH VECTOR PDF PRINT PREVIEWER */}
      <AnimatePresence>
        {previewReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewReport(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm print:hidden"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-4xl rounded-2xl border p-4 sm:p-6 shadow-2xl z-10 my-8 print:border-none print:shadow-none print:p-0 print:my-0 ${
                theme === 'dark' ? 'bg-[#121212] border-zinc-805' : 'bg-white border-zinc-200'
              }`}
            >
              {/* Dynamic CSS styles loaded to force only the report element printable */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  html, body, #root, #root > div, main, .fixed, .absolute, .overflow-y-auto {
                    position: static !important;
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                    display: block !important;
                    flex: none !important;
                    grid: none !important;
                    box-shadow: none !important;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-paper-report, #printable-paper-report * {
                    visibility: visible !important;
                  }
                  #printable-paper-report {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                    background: white !important;
                    color: black !important;
                    padding: 40px !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                  }
                  .print-hidden-element {
                    display: none !important;
                  }
                }
              `}} />

              {/* Action bar on top (hidden on prints) */}
              <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-4 print-hidden-element">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Visualizador de Documento Técnico</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewReport(null)}
                    className="px-4 py-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer border border-zinc-700 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      handlePrintDocument(previewReport);
                    }}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-orange-600/10 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Imprimir (PDF)
                  </button>
                </div>
              </div>

              {/* PDF Document Container Frame */}
              <div 
                id="printable-paper-report" 
                className="bg-white text-zinc-900 p-6 sm:p-10 rounded-xl border border-zinc-200 shadow-md max-h-[70vh] overflow-y-auto print:max-h-full print:overflow-visible print:border-none print:shadow-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
              >
                {/* PDF Header Logo Banner */}
                <div className="flex justify-between items-start border-b-2 border-[#D35400] pb-5 mb-6 text-left">
                  <div>
                    <h1 className="text-3xl font-extrabold text-[#D35400] tracking-tighter">AGRESTE</h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">saúde ambiental ltda</p>
                    <p className="text-[9px] text-zinc-400 mt-1">Saneamento Técnico e Controle Fitosanitário</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800">Laudo Técnico Sanitário</h2>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">CÓD: {previewReport.id.split('-')[1]?.toUpperCase() || previewReport.id.substring(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Emissão: {new Date(previewReport.createdAt || Date.now()).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                {/* Patient/Client details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left border-b border-zinc-100 pb-5">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase text-[#D35400] mb-2 tracking-wider">Identificação do Favorecido</h3>
                    <div className="space-y-1 text-xs">
                      <p><span className="font-semibold text-zinc-500">Cliente / Razão:</span> <span className="font-bold text-zinc-850">{previewReport.clientName}</span></p>
                      <p><span className="font-semibold text-zinc-500">Município de Atendimento:</span> <span className="font-semibold text-zinc-800">{previewReport.clientCity}</span></p>
                      <p><span className="font-semibold text-zinc-500">Responsável Presente:</span> <span className="font-semibold text-zinc-850 font-mono">Setor de Vigilância Local</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold uppercase text-[#D35400] mb-2 tracking-wider">Metadados da Inspeção</h3>
                    <div className="space-y-1 text-xs">
                      <p><span className="font-semibold text-zinc-500">Técnico Operacional:</span> <span className="font-semibold text-zinc-800">{previewReport.techName}</span></p>
                      <p><span className="font-semibold text-zinc-500">Cronograma Corrente:</span> <span className="font-semibold text-zinc-800">{previewReport.date} ({previewReport.month})</span></p>
                      <p><span className="font-semibold text-zinc-500">Auditado às:</span> <span className="font-semibold text-zinc-800">{new Date(previewReport.createdAt || Date.now()).toLocaleTimeString('pt-BR')}</span></p>
                    </div>
                  </div>
                </div>

                {/* Pest Control Status Grid Checklist */}
                <div className="mb-6 text-left">
                  <h3 className="text-[10px] font-bold uppercase text-[#D35400] mb-3 tracking-wider">Status das Desinsetizações e Controle de Pragas</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#D35400] text-white uppercase text-[9px] tracking-wider">
                          <th className="p-2 border border-zinc-200">Segmento Vetorial</th>
                          <th className="p-2 border border-zinc-200 text-center">Intervenção Técnica</th>
                          <th className="p-2 border border-zinc-200">Diagnóstico Preventivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'moscas', label: '🦟 Moscas / Insetos Voadores (Dípteros)', value: previewReport.pests.moscas },
                          { key: 'baratas', label: '🪳 Baratas', value: previewReport.pests.baratas },
                          { key: 'ratos', label: '🐀 Ratos / Roedores Urbanos (Roedores)', value: previewReport.pests.ratos },
                          { key: 'formigas', label: '🐜 Formigas / Himonópteros (Formigas)', value: previewReport.pests.formigas },
                        ].map((row) => (
                          <tr key={row.key} className="hover:bg-zinc-50/50">
                            <td className="p-2.5 border border-zinc-200 font-medium text-zinc-800">{row.label}</td>
                            <td className="p-2.5 border border-zinc-200 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                row.value === 'realizado'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : row.value === 'realizando'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-zinc-100 text-zinc-650 border border-zinc-200'
                              }`}>
                                {row.value === 'realizado' ? 'Concluído' : row.value === 'realizando' ? 'Em Andamento' : 'Não Solicitado'}
                              </span>
                            </td>
                            <td className="p-2.5 border border-zinc-200 text-zinc-600 text-[11px]">
                              {row.value === 'realizado' 
                                ? 'Setor imunizado com sucesso, barreira ativa fixada.' 
                                : row.value === 'realizando'
                                ? 'Intervenção ativa, desinfecção em progresso.'
                                : 'Monitorado - Sem vetor presente na inspeção.'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Score panel for technician */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-left bg-zinc-50 p-4 rounded-xl border border-zinc-200/50">
                  <div className="border-r border-zinc-200 last:border-r-0 pr-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Pontualidade Técnico</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-black text-[#D35400] font-sans">{previewReport.punctuality}</span>
                      <span className="text-xs text-zinc-400">/ 10</span>
                    </div>
                  </div>
                  <div className="border-r border-zinc-200 last:border-r-0 pr-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Comunicação Técnico</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-black text-[#D35400] font-sans">{previewReport.communication}</span>
                      <span className="text-xs text-zinc-400">/ 10</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Satisfação do Cliente</span>
                    <span className="text-xs font-bold text-zinc-800 uppercase block">{previewReport.satisfaction || 'Excelente'}</span>
                  </div>
                </div>

                {/* Recommendations and annotations */}
                <div className="space-y-4 mb-8 text-left text-xs">
                  {previewReport.recommendations && (
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/40">
                      <h4 className="font-bold text-[#D35400] uppercase text-[9px] tracking-wider mb-1 font-sans">Recomendações para o cliente</h4>
                      <p className="text-zinc-700 leading-relaxed font-sans">{previewReport.recommendations}</p>
                    </div>
                  )}

                  {previewReport.comments && (
                    <div>
                      <h4 className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider mb-1 font-sans">Observações do cliente</h4>
                      <p className="text-zinc-650 leading-relaxed bg-zinc-50/40 p-2.5 rounded-lg border border-zinc-150 font-sans">{previewReport.comments}</p>
                    </div>
                  )}
                </div>

                {/* Signatures Row */}
                <div className="grid grid-cols-2 gap-8 pt-10 border-t border-dashed border-zinc-200 mt-8">
                  <div className="text-center">
                    <div className="w-48 h-px bg-zinc-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-zinc-800">Gerente / Supervisor de Operações</p>
                    <p className="text-[10px] text-zinc-400 font-semibold font-display">AGRESTE Saúde Ambiental</p>
                  </div>
                  <div className="text-center">
                    <div className="w-48 h-px bg-zinc-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-zinc-800">{previewReport.clientName}</p>
                    <p className="text-[10px] text-zinc-400 font-semibold">Cliente</p>
                  </div>
                </div>

                {/* Certification footer */}
                <div className="text-center text-[9px] text-zinc-400 mt-12 border-t border-zinc-100 pt-4">
                  <p>Este documento certifica a inspeção biológica contra vetores nos termos específicos do decreto sanitário em vigência.</p>
                  <p className="mt-0.5">Laudos originais gerados na Plataforma Operacional AGRESTE.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
