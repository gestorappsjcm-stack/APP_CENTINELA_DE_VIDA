import React from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, Calendar, Building2, UserCheck } from 'lucide-react';

export const ProgramacionTurnosView: React.FC = () => {
  const { consultorios, profesionales, asignarProfesionalAConsultorio } = useApp();

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const profesionalesActivos = profesionales.filter((p) => p.estado === 'ACTIVO');

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Programación de Turnos y Consultorios
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Asignación directa de profesionales por consultorio en turnos de 6 horas (Lunes a Sábado)
            </p>
          </div>
        </div>
      </div>

      {/* Asignación Rápida de Profesionales por Consultorio */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 size={16} className="text-teal-600" />
            <span>Asignación de Profesional a Consultorio (Mañana / Tarde)</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            {profesionalesActivos.length === 0
              ? 'Primero registra profesionales en la pestaña Profesionales para asignarlos aquí'
              : `${profesionalesActivos.length} profesionales activos disponibles`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {consultorios.map((cons) => (
            <div
              key={cons.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 space-y-2.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-teal-700 dark:text-teal-400">
                    {cons.codigo}
                  </span>
                  <span className="text-[10px] text-slate-400">{cons.piso}</span>
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {cons.nombre}
                </div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                    Turno Mañana (08:00 - 14:00)
                  </label>
                  <select
                    value={cons.profesional_id || ''}
                    onChange={(e) => asignarProfesionalAConsultorio(cons.id, 'MAÑANA', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                  >
                    <option value="">-- Sin asignar --</option>
                    {profesionalesActivos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.apellidos_nombres} ({p.profesion})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                    Turno Tarde (14:00 - 20:00)
                  </label>
                  <select
                    value={cons.profesional_tarde_id || ''}
                    onChange={(e) => asignarProfesionalAConsultorio(cons.id, 'TARDE', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                  >
                    <option value="">-- Sin asignar --</option>
                    {profesionalesActivos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.apellidos_nombres} ({p.profesion})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matriz de Turnos Semanal */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar size={16} className="text-teal-600" />
            <span>Rol de Turnos Semanal Activo</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <UserCheck size={13} /> Lunes a Sábado • 6h por turno
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 w-56">Consultorio / Servicio</th>
                {diasSemana.map((dia) => (
                  <th key={dia} className="py-3 px-3 text-center">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {consultorios.map((cons) => (
                <tr key={cons.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {cons.codigo}
                    </div>
                    <div className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
                      {cons.nombre}
                    </div>
                    <div className="text-[10px] text-slate-400">{cons.piso}</div>
                  </td>

                  {diasSemana.map((dia) => (
                    <td key={dia} className="py-2.5 px-2 text-center align-top">
                      <div className="space-y-1.5">
                        <div className="p-1.5 bg-teal-50/60 dark:bg-teal-950/20 rounded-lg border border-teal-200/60 dark:border-teal-800/50">
                          <span className="text-[9px] font-bold text-teal-800 dark:text-teal-300 block">
                            M: 08:00 - 14:00
                          </span>
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 block truncate font-medium">
                            {cons.profesional_nombre ? cons.profesional_nombre.split(',')[0] : 'Sin asignar'}
                          </span>
                        </div>
                        <div className="p-1.5 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-lg border border-indigo-200/60 dark:border-indigo-800/50">
                          <span className="text-[9px] font-bold text-indigo-800 dark:text-indigo-300 block">
                            T: 14:00 - 20:00
                          </span>
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 block truncate font-medium">
                            {cons.profesional_tarde_nombre ? cons.profesional_tarde_nombre.split(',')[0] : 'Sin asignar'}
                          </span>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
