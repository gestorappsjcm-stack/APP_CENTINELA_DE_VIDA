import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Paciente } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Eye,
  Trash2,
  FileText,
  Edit2,
  Upload,
  Check,
  X,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { ModalFichaCompletaPaciente } from '../modals/ModalFichaCompletaPaciente';
import { formatDistritoPaciente } from '../../lib/distritosHelper';

export const PacientesView: React.FC = () => {
  const {
    pacientes,
    currentUser,
    isDeveloperMode,
    setActiveModal,
    setEditingPaciente,
    deletePaciente,
    setSelectedPacienteFichaId,
    setCurrentTab,
  } = useApp();
  const isDeveloper = isDeveloperMode || currentUser.rol === 'desarrollador';
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoDocumentoFilter, setTipoDocumentoFilter] = useState('');
  const [seguroFilter, setSeguroFilter] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [currentPage, setCurrentPage] = useState(1);

  const filtrados = useMemo(
    () =>
      pacientes.filter((p) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          p.apellidos_nombres.toLowerCase().includes(term) ||
          (p.numero_documento && p.numero_documento.includes(term)) ||
          (p.codigo_temporal && p.codigo_temporal.toLowerCase().includes(term)) ||
          (p.hcl && p.hcl.toLowerCase().includes(term));

        const matchesTipoDoc = !tipoDocumentoFilter || p.tipo_documento === tipoDocumentoFilter;
        const matchesSeguro = !seguroFilter || p.seguro === seguroFilter;
        return matchesSearch && matchesTipoDoc && matchesSeguro;
      }),
    [pacientes, searchTerm, tipoDocumentoFilter, seguroFilter]
  );

  const totalRegistros = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(totalRegistros / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tipoDocumentoFilter, seguroFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRegistros);

  const paginados = useMemo(
    () => filtrados.slice(startIndex, endIndex),
    [filtrados, startIndex, endIndex]
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }
    const pages: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [1];
    const windowStart = Math.max(2, safePage - 1);
    const windowEnd = Math.min(totalPages - 1, safePage + 1);

    if (windowStart > 2) pages.push('ellipsis-left');
    for (let p = windowStart; p <= windowEnd; p++) {
      pages.push(p);
    }
    if (windowEnd < totalPages - 1) pages.push('ellipsis-right');
    pages.push(totalPages);
    return pages;
  }, [totalPages, safePage]);

  const exportarExcel = () => {
    const headers = [
      'Documento',
      'Nombres y Apellidos',
      'HCL',
      'Edad',
      'Sexo',
      'Seguro',
      'Distrito',
      'Celular',
      'Estado',
    ];
    const rows = filtrados.map((p) => [
      p.tipo_documento === 'INDOCUMENTADO' ? p.codigo_temporal : p.numero_documento || '-',
      `"${p.apellidos_nombres}"`,
      p.hcl || '-',
      p.edad ? `${p.edad}` : '-',
      p.sexo || '-',
      p.seguro || '-',
      `"${formatDistritoPaciente(p)}"`,
      p.celular || '-',
      p.estado,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Padron_Pacientes_CSMC_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Padrón de Pacientes Registrados
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Directorio de historias clínicas, seguros y datos de filiación
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setActiveModal('auditoriaHcl')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
          >
            <ClipboardCheck size={15} />
            <span>Verificar HCL</span>
          </button>

          {isDeveloper && (
            <button
              onClick={() => setActiveModal('importarPacientes')}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all"
            >
              <Upload size={15} />
              <span>Importar Excel / Pegar</span>
            </button>
          )}

          <button
            onClick={exportarExcel}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            <FileSpreadsheet size={15} />
            <span>Exportar CSV / Excel</span>
          </button>

          <button
            onClick={() => setActiveModal('registrarPaciente')}
            className="flex items-center gap-1.5 bg-[#1A2B4A] hover:bg-[#243b5e] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all"
          >
            <UserPlus size={15} />
            <span>+ Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Toolbar Filtros */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative w-full lg:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o HCL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Tipo Documento:</span>
            <select
              value={tipoDocumentoFilter}
              onChange={(e) => setTipoDocumentoFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="">Todos los documentos</option>
              <option value="DNI">DNI</option>
              <option value="CE">Carnet de Extranjería (CE)</option>
              <option value="PASAPORTE">Pasaporte</option>
              <option value="INDOCUMENTADO">Indocumentado</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Condición de Seguro:</span>
            <select
              value={seguroFilter}
              onChange={(e) => setSeguroFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="">Todos los seguros</option>
              <option value="SIS">SIS</option>
              <option value="ESSALUD">EsSalud</option>
              <option value="EPS">EPS</option>
              <option value="PRIVADO">Privado</option>
              <option value="NINGUNO">Ninguno (Particular)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-3">Apellidos y Nombres</th>
                <th className="py-3 px-3">HCL</th>
                <th className="py-3 px-3">Edad / Sexo</th>
                <th className="py-3 px-3">Seguro</th>
                <th className="py-3 px-3">Distrito</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {paginados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron pacientes registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginados.map((p) => {
                  const docLabel =
                    p.tipo_documento === 'INDOCUMENTADO'
                      ? p.codigo_temporal
                      : `${p.tipo_documento}: ${p.numero_documento || '-'}`;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {docLabel}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {p.apellidos_nombres}
                      </td>
                      <td className="py-3 px-3 font-mono text-teal-700 dark:text-teal-400 font-bold">
                        {p.hcl || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {p.edad ? `${p.edad}a` : '-'} / {p.sexo || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-teal-200 dark:border-teal-800">
                          {p.seguro || 'NINGUNO'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDistritoPaciente(p)}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            p.estado === 'activo'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPacienteFichaId(p.id);
                              setCurrentTab('ficha_paciente');
                            }}
                            title="Ver Ficha Clínica Integral"
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            onClick={() => setSelectedPaciente(p)}
                            title="Vista Rápida"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg cursor-pointer transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setEditingPaciente(p)}
                            title="Editar datos del paciente (DNI, HCL, nombres, seguro...)"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          {confirmDeleteId === p.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  deletePaciente(p.id);
                                  setConfirmDeleteId(null);
                                }}
                                title="Confirmar eliminación"
                                className="p-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-lg cursor-pointer transition-colors"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                title="Cancelar"
                                className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(p.id)}
                              title="Eliminar paciente"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500 dark:text-slate-400">Mostrar:</span>
              <select
                aria-label="Filas por página"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
                className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
            <span className="text-slate-500 dark:text-slate-400">
              {totalRegistros === 0
                ? 'Mostrando 0 de 0 pacientes'
                : `Mostrando ${startIndex + 1}–${endIndex} de ${totalRegistros} pacientes`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              title="Primera página"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              title="Página anterior"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1 px-1">
              {pageNumbers.map((item) =>
                typeof item === 'number' ? (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      item === safePage
                        ? 'bg-[#1A2B4A] text-white shadow-xs'
                        : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} className="px-1 text-xs text-slate-400 select-none">
                    ...
                  </span>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              title="Página siguiente"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              title="Última página"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>

        {/* Ficha Completa Integral del Paciente */}
        {selectedPaciente && (
          <ModalFichaCompletaPaciente
            paciente={pacientes.find((item) => item.id === selectedPaciente.id) || selectedPaciente}
            onClose={() => setSelectedPaciente(null)}
          />
        )}
      </div>
    </div>
  );
};
