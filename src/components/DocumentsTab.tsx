/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CompanyDocument } from '../types';
import { AGRESTE_DB } from '../services/db';
import { 
  FileText, ShieldAlert, CheckCircle, Trash2, Edit2, PlusCircle, 
  Settings, X, CalendarCheck, Clock, ExternalLink, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentsTabProps {
  theme: 'light' | 'dark';
  documents: CompanyDocument[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => void;
  canEdit?: boolean;
}

export default function DocumentsTab({ 
  theme, documents, showToast, onRefreshData, canEdit = true 
}: DocumentsTabProps) {
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CompanyDocument | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Form states
  const [docName, setDocName] = useState('');
  const [docDate, setDocDate] = useState('');
  const [docNextUpdate, setDocNextUpdate] = useState('');
  const [docStatus, setDocStatus] = useState<'ok' | 'pendente'>('ok');

  // Trigger modal for editing
  const handleOpenEdit = (doc: CompanyDocument) => {
    setEditingDoc(doc);
    setDocName(doc.name);
    setDocDate(doc.date);
    setDocNextUpdate(doc.nextUpdateDate);
    setDocStatus(doc.status);
    setShowDocModal(true);
  };

  // Trigger modal for new doc
  const handleOpenNew = () => {
    setEditingDoc(null);
    setDocName('');
    setDocDate(new Date().toISOString().split('T')[0]);
    setDocNextUpdate('');
    setDocStatus('ok');
    setShowDocModal(true);
  };

  // Delete Document
  const handleDeleteDoc = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  // Submit form
  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();

    if (!docName.trim() || !docDate || !docNextUpdate) {
      showToast('Por favor, indique o nome do documento e as respectivas datas.', 'error');
      return;
    }

    if (editingDoc) {
      AGRESTE_DB.updateDocument({
        id: editingDoc.id,
        name: docName,
        date: docDate,
        nextUpdateDate: docNextUpdate,
        status: docStatus,
      });
      showToast(`Certificação "${docName}" atualizada com sucesso!`, 'success');
    } else {
      AGRESTE_DB.addDocument({
        name: docName,
        date: docDate,
        nextUpdateDate: docNextUpdate,
        status: docStatus,
      });
      showToast(`Nova certificação "${docName}" adicionada com êxito!`, 'success');
    }

    setShowDocModal(false);
    onRefreshData();
  };

  // Checking days left math
  const getDaysLeftLabel = (dateStr: string) => {
    const today = new Date('2026-05-21');
    const updateDate = new Date(dateStr);
    const diffTime = updateDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Venceu há ${Math.abs(diffDays)} dias`, color: 'text-red-500 font-bold' };
    } else if (diffDays === 0) {
      return { text: 'Vence hoje!', color: 'text-red-500 font-bold animate-pulse' };
    } else if (diffDays <= 7) {
      return { text: `Expira em ${diffDays} dias (Urgente)`, color: 'text-rose-500 font-bold' };
    } else if (diffDays <= 30) {
      return { text: `Expira em ${diffDays} dias`, color: 'text-amber-500' };
    }
    return { text: `Validade de ${diffDays} dias`, color: 'text-zinc-500' };
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight">Documentação da Empresa</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Gestão de laudos ambientais, alvará de funcionamento sanitário da AGRESTE, químicos responsáveis e obrigações recorrentes.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleOpenNew}
            id="add-doc-btn"
            className="flex items-center gap-2 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-[#D35400]/10 cursor-pointer hover:scale-[1.01] transition-transform duration-100"
          >
            <PlusCircle className="w-4 h-4" /> Anexar Licença / Alvará
          </button>
        )}
      </div>

      {/* Documents Table Checklist Layout */}
      <div className={`rounded-2xl border overflow-hidden ${
        theme === 'dark' ? 'bg-[#1A1A1A] border-[#242424]' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="docs-table">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider text-zinc-400 ${
                theme === 'dark' ? 'bg-zinc-950/60 border-zinc-880/50' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <th className="py-4 px-6">Licença / Documento</th>
                <th className="py-4 px-6">Emissão Original</th>
                <th className="py-4 px-6">Data de Expiração</th>
                <th className="py-4 px-6">Estado Conforme</th>
                <th className="py-4 px-6">Selo de Validade</th>
                <th className="py-4 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20 text-sm">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500 text-xs">
                    Nenhum documento legal ou certificado administrativo registrado.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const validity = getDaysLeftLabel(doc.nextUpdateDate);
                  const isPending = doc.status === 'pendente';

                  return (
                    <tr 
                      key={doc.id}
                      className={`hover:bg-zinc-800/10 transition-colors ${
                        isPending ? 'bg-red-500/[0.01]' : ''
                      }`}
                    >
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          <span className={`p-2 rounded-lg ${
                            isPending ? 'bg-red-600/10 text-red-500' : 'bg-[#D35400]/10 text-[#D35400]'
                          }`}>
                            <FileText className="w-4 h-4" />
                          </span>
                          <span className="font-bold text-zinc-200 dark:text-zinc-100 max-w-[240px] truncate block">
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4.5 px-6 font-mono text-xs text-zinc-400">
                        {doc.date}
                      </td>
                      <td className="py-4.5 px-6 font-mono text-xs text-zinc-400">
                        {doc.nextUpdateDate}
                      </td>
                      <td className="py-4.5 px-6">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isPending 
                            ? 'bg-red-600/15 text-red-400 border border-red-500/20' 
                            : 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isPending ? 'Pendente' : 'Regularizado'}
                        </span>
                      </td>
                      <td className={`py-4.5 px-6 text-xs font-medium ${validity.color}`}>
                        {validity.text}
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        {canEdit && (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(doc)}
                              id={`edit-doc-${doc.id}`}
                              className="p-1.5 text-zinc-500 hover:text-orange-500 hover:bg-zinc-800/30 rounded-lg transition-colors cursor-pointer"
                              title="Editar Licença"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(doc.id, doc.name)}
                              id={`delete-doc-${doc.id}`}
                              className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-zinc-800/30 rounded-lg transition-colors cursor-pointer"
                              title="Remover Licença"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE / EDIT DOCUMENT */}
      <AnimatePresence>
        {showDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDocModal(false)}
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
                <h3 className="text-xl font-bold font-display">
                  {editingDoc ? 'Editar Homologação' : 'Anexar Nova Certificação'}
                </h3>
                <button
                  onClick={() => setShowDocModal(false)}
                  id="doc-modal-close"
                  className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDoc} className="space-y-4" id="documents-form">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Título do Documento / Alvará *
                  </label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Ex: Licença Sanitária ANVISA"
                    id="doc-name-input"
                    className={`w-full py-2.5 px-4 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark' ? 'bg-zinc-950 border-[#242424] focus:border-[#D35400]' : 'bg-zinc-100 border-zinc-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400 font-sans">
                      Emissão Original *
                    </label>
                    <input
                      type="date"
                      required
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      id="doc-date"
                      className={`w-full py-2.5 px-3 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-zinc-950 border-[#242424] focus:border-[#D35400]' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400 font-sans">
                      Expiração Prevista *
                    </label>
                    <input
                      type="date"
                      required
                      value={docNextUpdate}
                      onChange={(e) => setDocNextUpdate(e.target.value)}
                      id="doc-next-update"
                      className={`w-full py-2.5 px-3 rounded-xl border text-sm outline-none transition-all ${
                        theme === 'dark' ? 'bg-zinc-950 border-[#242424] focus:border-[#D35400]' : 'bg-zinc-100 border-zinc-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-zinc-400">
                    Status de Conformidade
                  </label>
                  <select
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value as any)}
                    id="doc-status-select"
                    className={`w-full py-2.5 px-3 rounded-xl border text-sm outline-none transition-all ${
                      theme === 'dark' ? 'bg-zinc-950 border-[#242424] text-zinc-100 focus:border-[#D35400]' : 'bg-zinc-100 border-zinc-200 text-zinc-805'
                    }`}
                  >
                    <option value="ok" className="bg-[#1A1A1A] text-zinc-100">Regularizado / OK</option>
                    <option value="pendente" className="bg-[#1A1A1A] text-zinc-100">Pendente de Atualização / Vencido</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    id="doc-submit-btn"
                    className="w-full py-2.5 bg-[#D35400] hover:bg-[#FC6B0A] text-white font-semibold text-sm rounded-xl cursor-pointer"
                  >
                    Salvar Alvará de Conformidade
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                theme === 'dark' ? 'bg-[#1a1a1a] border-[#242424] text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="mx-auto w-12 h-12 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-lg font-display mb-1 text-white dark:text-zinc-100">Confirmar Remoção</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Tem certeza que deseja remover o documento <span className="font-bold text-orange-500">"{deleteConfirm.name}"</span> do banco de dados?
                Esta ação é irreversível.
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
                    AGRESTE_DB.deleteDocument(deleteConfirm.id);
                    showToast(`Certificação "${deleteConfirm.name}" removida com sucesso.`, 'success');
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
    </div>
  );
}
