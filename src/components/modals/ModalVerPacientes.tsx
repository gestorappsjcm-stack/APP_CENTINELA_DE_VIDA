import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Paciente } from '../../types';
import { X, Search, FileSpreadsheet, Eye, Trash2, Users, Filter } from 'lucide-react';
import { ModalFichaCompletaPaciente } from './ModalFichaCompletaPaciente';

export const ModalVerPacientes: React.FC = () => {
  const { activeModal, setActiveModal, pacientes, deletePaciente } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [seguroFilter, setSeguroFilter] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);

  if (activeModal !== 'verPacientes') return null;

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
    const headers = ['Documento', 'Nombres y Apellidos', 'HCL', 'Edad', 'Sexo', 'Seguro', 'Distrito', 'Celular', 'Estado'];
    const rows = filtrados.map((p) => [
      p.tipo_documento === 'INDOCUMENTADO' ? p.codigo_temporal : p.numero_documento || '-',
      p.apellidos_nombres,
      p.hcl || '-',
      p.edad ? `${p.edad} años` : '-',
      p.sexo || '-',
      p.seguro || '-',
      p.distrito || '-',
      p.celular || '-',
      p.estado,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Padron_Pacientes_Centinela_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-lg">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Padrón de Pacientes Registrados
              </h3>
              <p className="text-xs text-slate-500">
                {filtrados.length} pacientes registrados en Centinela de Vida
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20 flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, documento o HCL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={seguroFilter}
                onChange={(e) => setSeguroFilter(e.target.value)}
                className="text-xs bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">Todos los Seguros</option>
                <option value="SIS">SIS</option>
                <option value="ESSALUD">EsSalud</option>
                <option value="EPS">EPS</option>
                <option value="PRIVADO">Privado</option>
                <option value="NINGUNO">Ninguno (Particular)</option>
              </select>
            </div>
          </div>

          <button
            onClick={exportarExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all self-start sm:self-auto"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar Excel / CSV</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4">Documento</th>
                <th className="py-2.5 px-3">Apellidos y Nombres</th>
                <th className="py-2.5 px-3">HCL</th>
                <th className="py-2.5 px-3">Edad / Sexo</th>
                <th className="py-2.5 px-3">Seguro</th>
                <th className="py-2.5 px-3">Distrito</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron pacientes que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => {
                  const docLabel =
                    p.tipo_documento === 'INDOCUMENTADO'
                      ? p.codigo_temporal
                      : `${p.tipo_documento}: ${p.numero_documento || '-'}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {docLabel}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {p.apellidos_nombres}
                      </td>
                      <td className="py-3 px-3 font-mono text-teal-700 dark:text-teal-400 font-semibold">
                        {p.hcl || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {p.edad ? `${p.edad}a` : '-'} / {p.sexo || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          {p.seguro || 'NINGUNO'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{p.distrito || '-'}</td>
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
                            onClick={() => setSelectedPaciente(p)}
                            title="Ver ficha completa"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar al paciente ${p.apellidos_nombres}?`)) {
                                deletePaciente(p.id);
                              }
                            }}
                            title="Eliminar paciente"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 size={15} />
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

        {/* Ficha Completa Integral del Paciente */}
        {selectedPaciente && (
          <ModalFichaCompletaPaciente
            paciente={selectedPaciente}
            onClose={() => setSelectedPaciente(null)}
          />
        )}
      </div>
    </div>
  );
};
