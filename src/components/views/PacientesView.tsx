import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Paciente } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Eye,
  Trash2,
  Filter,
  FileText,
  Edit2,
  Upload,
  Check,
  X,
  ClipboardCheck,
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
    deleteAllPacientes,
    setSelectedPacienteFichaId,
    setCurrentTab,
  } = useApp();
  const isDeveloper = isDeveloperMode || currentUser.rol === 'desarrollador';
  const [searchTerm, setSearchTerm] = useState('');
  const [seguroFilter, setSeguroFilter] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    setStatusMessage(null);
    const res = await deleteAllPacientes();
    setIsDeletingAll(false);
    setConfirmDeleteAll(false);
    if (res.success) {
      setStatusMessage({
        type: 'ok',
        text: 'Tabla de pacientes limpiada correctamente (Supabase y memoria local). Ya puedes usar "Importar Excel / Pegar" para subir el nuevo padrón completo.',
      });
    } else {
      setStatusMessage({
        type: 'err',
        text: res.error || 'No se pudo limpiar la tabla de pacientes.',
      });
    }
  };

  const filtrados = pacientes.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.apellidos_nombres.toLowerCase().includes(term) ||
      (p.numero_documento && p.numero_documento.includes(term)) ||
      (p.codigo_temporal && p.codigo_temporal.toLowerCase().includes(term)) ||
      (p.hcl && p.hcl.toLowerCase().includes(term));

    const matchesSeguro = !seguroFilter || p.seguro === seguroFilter;
    return matchesSearch && matchesSeguro;
  });

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

          {isDeveloper && pacientes.length > 0 && (
            confirmDeleteAll ? (
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-semibold text-rose-700 dark:text-rose-300">
                  ¿Vaciar los {pacientes.length}?
                </span>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={handleConfirmDeleteAll}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isDeletingAll ? 'Limpiando...' : 'Sí, limpiar tabla'}
                </button>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={() => setConfirmDeleteAll(false)}
                  className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setConfirmDeleteAll(true);
                }}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                title="Vaciar toda la tabla de pacientes para cargar un nuevo Excel completo (Exclusivo Desarrollador)"
              >
                <Trash2 size={15} />
                <span>Limpiar Tabla ({pacientes.length})</span>
              </button>
            )
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

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center justify-between gap-3 ${
            statusMessage.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o HCL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron pacientes registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => {
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
