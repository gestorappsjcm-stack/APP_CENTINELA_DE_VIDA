import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, Calendar, Building2, User, Check, Plus } from 'lucide-react';

export const ProgramacionTurnosView: React.FC = () => {
  const { consultorios, profesionales } = useApp();

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const turnos = [
    { id: 'M', nombre: 'Turno Mañana', horario: '08:00 - 14:00' },
    { id: 'T', nombre: 'Turno Tarde', horario: '14:00 - 20:00' },
  ];

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
              Distribución horaria semanal del personal de salud mental comunitaria por consultorio
            </p>
          </div>
        </div>
      </div>

      {/* Matriz de Turnos Semanal */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar size={16} className="text-teal-600" />
            <span>Rol de Turnos Semanal Activo</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Sede Chincha Alta</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 w-48">Consultorio / Servicio</th>
                {diasSemana.map((dia) => (
                  <th key={dia} className="py-3 px-3 text-center">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {consultorios.map((cons, index) => {
                const prof = profesionales[index % profesionales.length];

                return (
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

                    {diasSemana.map((dia, dIdx) => (
                      <td key={dia} className="py-3 px-2 text-center">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
                          <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 block">
                            {dIdx % 2 === 0 ? '08:00 - 14:00' : '14:00 - 20:00'}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 block truncate font-medium">
                            {prof?.apellidos_nombres.split(',')[0]}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
