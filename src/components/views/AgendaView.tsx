import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Cita } from '../../types';
import {
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  X,
  Stethoscope,
  Eye,
  Filter,
  Search,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';

export const AgendaView: React.FC = () => {
  const { citas, pacientes, profesionales, addCita, confirmarCita, cancelarCita, setCurrentTab } = useApp();

  const [filtroFecha, setFiltroFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroProf, setFiltroProf] = useState<string>('');

  // Modal Nueva Cita
  const [isModalNuevaCita, setIsModalNuevaCita] = useState(false);
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [selectedPacienteId, setSelectedPacienteId] = useState('');
  const [citaFecha, setCitaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [citaHora, setCitaHora] = useState('09:00');
  const [citaProfId, setCitaProfId] = useState('');
  const [citaTipo, setCitaTipo] = useState<'CONSULTA' | 'TRIAJE' | 'EMERGENCIA' | 'TELECONSULTA' | 'VISITA_DOMICILIARIA'>('CONSULTA');
  const [citaMotivo, setCitaMotivo] = useState('');

  // Modal Cancelar Cita
  const [cancelingCitaId, setCancelingCitaId] = useState<string | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Filtrado de citas
  const citasFiltradas = citas.filter((c) => {
    if (filtroFecha && c.fecha_cita !== filtroFecha) return false;
    if (filtroEstado && c.estado !== filtroEstado) return false;
    if (filtroProf && c.profesional_id !== filtroProf) return false;
    return true;
  });

  const handleCrearCita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPacienteId) {
      alert('Debe seleccionar un paciente');
      return;
    }

    addCita({
      paciente_id: selectedPacienteId,
      profesional_id: citaProfId || undefined,
      fecha_cita: citaFecha,
      hora_cita: citaHora,
      tipo_cita: citaTipo,
      estado: 'PENDIENTE',
      motivo_consulta: citaMotivo.trim() || undefined,
    });

    setIsModalNuevaCita(false);
    setSelectedPacienteId('');
    setPacienteSearch('');
    setCitaMotivo('');
  };

  const handleConfirmarCancelacion = () => {
    if (cancelingCitaId) {
      cancelarCita(cancelingCitaId, motivoCancelacion.trim() || 'Cancelado por el usuario');
      setCancelingCitaId(null);
      setMotivoCancelacion('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 rounded-xl">
            <CalendarDays size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Agenda de Citas y Turnos
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Control diario y programación de citas ambulatorias y triaje
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalNuevaCita(true)}
          className="flex items-center gap-2 bg-[#1A2B4A] hover:bg-[#243b5e] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Programar Nueva Cita</span>
        </button>
      </div>

      {/* Toolbar Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">Todos los Estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="ATENDIDA">Atendida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select
            value={filtroProf}
            onChange={(e) => setFiltroProf(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">Todos los Profesionales</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.apellidos_nombres}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltroFecha(new Date().toISOString().split('T')[0])}
            className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
          >
            📅 Hoy
          </button>
          <button
            onClick={() => setFiltroFecha('')}
            className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
          >
            Todas
          </button>
        </div>
      </div>

      {/* Tabla de Citas */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3">Profesional Asignado</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3">Motivo</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {citasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    No se encontraron citas registradas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                citasFiltradas.map((c) => {
                  const paciente = pacientes.find((p) => p.id === c.paciente_id);
                  const prof = profesionales.find((p) => p.id === c.profesional_id);

                  const badgeClass =
                    c.estado === 'PENDIENTE'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30'
                      : c.estado === 'CONFIRMADA'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30'
                      : c.estado === 'ATENDIDA'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {paciente?.apellidos_nombres || 'Paciente no identificado'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {paciente?.tipo_documento}: {paciente?.numero_documento || paciente?.codigo_temporal} • Seguro: {paciente?.seguro}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{c.fecha_cita}</div>
                        <div className="text-teal-600 dark:text-teal-400 font-bold">{c.hora_cita}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {prof?.apellidos_nombres || 'Sin profesional asignado'}
                        </div>
                        <div className="text-[10px] text-slate-400">{prof?.profesion}</div>
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">
                        {c.tipo_cita}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeClass}`}>
                          {c.estado}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {c.motivo_consulta || c.observaciones || '-'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => confirmarCita(c.id)}
                              title="Confirmar asistencia"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}

                          {c.estado !== 'ATENDIDA' && c.estado !== 'CANCELADA' && (
                            <button
                              onClick={() => setCancelingCitaId(c.id)}
                              title="Cancelar cita"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <XCircle size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => setCurrentTab('atencion')}
                            title="Ir a atención médica"
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Stethoscope size={16} />
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

      {/* Modal Programar Nueva Cita */}
      {isModalNuevaCita && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/70 dark:bg-slate-850">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Programar Nueva Cita
              </h3>
              <button
                onClick={() => setIsModalNuevaCita(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearCita} className="p-6 space-y-4">
              {/* Seleccionar Paciente */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Buscar Paciente *
                </label>
                <input
                  type="text"
                  placeholder="Escriba apellido o DNI..."
                  value={pacienteSearch}
                  onChange={(e) => setPacienteSearch(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 mb-1"
                />

                {/* Resultados filtrados de pacientes */}
                {pacienteSearch && (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {pacientes
                      .filter((p) =>
                        p.apellidos_nombres.toLowerCase().includes(pacienteSearch.toLowerCase()) ||
                        (p.numero_documento && p.numero_documento.includes(pacienteSearch))
                      )
                      .slice(0, 5)
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPacienteId(p.id);
                            setPacienteSearch(p.apellidos_nombres);
                          }}
                          className={`p-2 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer ${
                            selectedPacienteId === p.id ? 'bg-teal-100 font-bold text-teal-900' : ''
                          }`}
                        >
                          {p.apellidos_nombres} ({p.tipo_documento}: {p.numero_documento || p.codigo_temporal})
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Cita *
                  </label>
                  <input
                    type="date"
                    required
                    value={citaFecha}
                    onChange={(e) => setCitaFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hora de Cita *
                  </label>
                  <input
                    type="time"
                    required
                    value={citaHora}
                    onChange={(e) => setCitaHora(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Profesional
                </label>
                <select
                  value={citaProfId}
                  onChange={(e) => setCitaProfId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="">Seleccione profesional...</option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.apellidos_nombres} ({p.profesion})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Cita
                </label>
                <select
                  value={citaTipo}
                  onChange={(e) => setCitaTipo(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="CONSULTA">Consulta Médica / Psicológica</option>
                  <option value="TRIAJE">Triaje</option>
                  <option value="EMERGENCIA">Emergencia</option>
                  <option value="TELECONSULTA">Teleconsulta</option>
                  <option value="VISITA_DOMICILIARIA">Visita Domiciliaria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo de Consulta
                </label>
                <textarea
                  rows={2}
                  placeholder="Descripción breve..."
                  value={citaMotivo}
                  onChange={(e) => setCitaMotivo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalNuevaCita(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Guardar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cancelar Cita */}
      {cancelingCitaId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertCircle size={18} />
              <span>¿Cancelar Cita Programada?</span>
            </div>
            <p className="text-xs text-slate-500">
              Indique el motivo por el cual se cancela la cita:
            </p>
            <input
              type="text"
              placeholder="Ej: Paciente no asistió / Reprogramación"
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelingCitaId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmarCancelacion}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
