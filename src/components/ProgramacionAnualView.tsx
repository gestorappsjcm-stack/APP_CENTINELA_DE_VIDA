import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CalendarRange,
  Download,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShieldAlert,
  Printer,
  FileSpreadsheet,
  Info,
} from 'lucide-react';

export const ProgramacionAnualView: React.FC = () => {
  const { getProgramacionAnual, profesionales, setCurrentTab, setActiveModal } = useApp();
  const [selectedAnio, setSelectedAnio] = useState<number>(2026);
  const [selectedProf, setSelectedProf] = useState<string>('');
  const [seguroHighlight, setSeguroHighlight] = useState<string>('TODOS');

  const datosMeses = getProgramacionAnual(selectedAnio, selectedProf || undefined);

  // Totales acumulados
  const totalProgramadas = datosMeses.reduce((acc, m) => acc + m.citasProgramadas, 0);
  const totalAtendidas = datosMeses.reduce((acc, m) => acc + m.pacientesAtendidos, 0);
  const totalNoAsistieron = datosMeses.reduce((acc, m) => acc + m.pacientesNoAsistieron, 0);
  const totalSIS = datosMeses.reduce((acc, m) => acc + m.desgloseSeguro.SIS, 0);
  const totalEsSalud = datosMeses.reduce((acc, m) => acc + m.desgloseSeguro.ESSALUD, 0);
  const totalEPS = datosMeses.reduce((acc, m) => acc + m.desgloseSeguro.EPS, 0);
  const totalPrivado = datosMeses.reduce((acc, m) => acc + m.desgloseSeguro.PRIVADO, 0);
  const totalNinguno = datosMeses.reduce((acc, m) => acc + m.desgloseSeguro.NINGUNO, 0);
  const totalOtro = datosMeses.reduce((acc, m) => acc + m.desgloseSeguro.OTRO, 0);

  const porcentajeCumplimientoGlobal =
    totalProgramadas > 0 ? Math.round((totalAtendidas / totalProgramadas) * 100) : 0;
  const porcentajeSIS = totalAtendidas > 0 ? Math.round((totalSIS / totalAtendidas) * 100) : 0;

  // Exportar a CSV / Excel
  const exportarCSV = () => {
    const headers = [
      'Mes',
      'Citas Programadas',
      'Pacientes Atendidos',
      'No Asistieron',
      '% Cumplimiento',
      'SIS',
      'ESSALUD',
      'EPS',
      'PRIVADO',
      'NINGUNO',
      'OTRO',
    ];

    const rows = datosMeses.map((m) => [
      m.mesNombre,
      m.citasProgramadas,
      m.pacientesAtendidos,
      m.pacientesNoAsistieron,
      `${m.porcentajeCumplimiento}%`,
      m.desgloseSeguro.SIS,
      m.desgloseSeguro.ESSALUD,
      m.desgloseSeguro.EPS,
      m.desgloseSeguro.PRIVADO,
      m.desgloseSeguro.NINGUNO,
      m.desgloseSeguro.OTRO,
    ]);

    // Fila de totales
    rows.push([
      'TOTAL ANUAL',
      totalProgramadas,
      totalAtendidas,
      totalNoAsistieron,
      `${porcentajeCumplimientoGlobal}%`,
      totalSIS,
      totalEsSalud,
      totalEPS,
      totalPrivado,
      totalNinguno,
      totalOtro,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Programacion_Anual_Centinela_${selectedAnio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-xl">
              <CalendarRange size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                Programación Anual de Citas y Atenciones
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                Monitoreo mensual real: citas otorgadas vs pacientes atendidos por condición de seguro (SIS, EsSalud, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Año */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-xs">
            {[2026, 2025, 2024].map((anio) => (
              <button
                key={anio}
                onClick={() => setSelectedAnio(anio)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedAnio === anio
                    ? 'bg-[#1A2B4A] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {anio}
              </button>
            ))}
          </div>

          {/* Filtro Profesional */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-xs">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedProf}
              onChange={(e) => setSelectedProf(e.target.value)}
              className="text-xs bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">Todos los Profesionales</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellidos_nombres} ({p.profesion})
                </option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            <FileSpreadsheet size={15} />
            Exportar Excel / CSV
          </button>
        </div>
      </div>

      {/* Banner de Veracidad de Datos */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Matriz calculada al 100% con los registros reales de citas y atenciones en el sistema.</span>
        </div>
        <span className="text-[11px] font-bold bg-emerald-200 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
          Año {selectedAnio}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Citas Programadas</span>
            <CalendarRange size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totalProgramadas}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
            Meta asignada {selectedAnio}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Pacientes Atendidos</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalAtendidas}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
            {porcentajeCumplimientoGlobal}% cumplimiento
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Inasistencias / No Show</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {totalNoAsistieron}
          </div>
          <div className="text-[11px] text-rose-500 mt-1 font-medium">
            {totalProgramadas > 0 ? Math.round((totalNoAsistieron / totalProgramadas) * 100) : 0}% tasa deserción
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Asegurados SIS</span>
            <TrendingUp size={16} className="text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
            {totalSIS}
          </div>
          <div className="text-[11px] text-teal-700 dark:text-teal-400 mt-1 font-medium">
            {porcentajeSIS}% del total atendido
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Otros Seguros</span>
            <Users size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {totalAtendidas - totalSIS}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
            EsSalud: {totalEsSalud} | Part.: {totalNinguno + totalPrivado}
          </div>
        </div>
      </div>

      {/* Gráfico Visual Mensual (SVG) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Comparativo Mensual: Citas Programadas vs Pacientes Atendidos</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluación de cobertura mensual del Centro de Salud Mental Comunitario ({selectedAnio})
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#1A2B4A] inline-block"></span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Citas Programadas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#2D9C8B] inline-block"></span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Pacientes Atendidos</span>
            </div>
          </div>
        </div>

        {/* SVG Responsive Bar Graph */}
        <div className="h-44 w-full flex items-end gap-2 md:gap-3 pt-4 px-2 border-b border-slate-200 dark:border-slate-700">
          {datosMeses.map((mes) => {
            const maxVal = Math.max(...datosMeses.map((m) => m.citasProgramadas), 45);
            const heightProg = Math.max(12, Math.round((mes.citasProgramadas / maxVal) * 100));
            const heightAtend = Math.max(8, Math.round((mes.pacientesAtendidos / maxVal) * 100));

            return (
              <div key={mes.mesNumero} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-12 bg-slate-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                  <div className="font-bold">{mes.mesNombre}</div>
                  <div>Prog: {mes.citasProgramadas} | Atend: {mes.pacientesAtendidos} ({mes.porcentajeCumplimiento}%)</div>
                </div>

                <div className="w-full flex items-end justify-center gap-1 h-32">
                  {/* Barra Programadas */}
                  <div
                    style={{ height: `${heightProg}%` }}
                    className="w-2.5 sm:w-4 md:w-5 bg-[#1A2B4A] rounded-t-sm transition-all group-hover:opacity-80"
                  ></div>
                  {/* Barra Atendidas */}
                  <div
                    style={{ height: `${heightAtend}%` }}
                    className="w-2.5 sm:w-4 md:w-5 bg-[#2D9C8B] rounded-t-sm transition-all group-hover:opacity-80"
                  ></div>
                </div>
                <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  {mes.mesNombre.substring(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Matriz Detallada con Condición de Seguros */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarRange size={18} className="text-teal-600" />
              <span>Matriz Anual: Citas, Atenciones y Condición de Aseguramiento</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Identificación de pacientes cubiertos por SIS, EsSalud, EPS, Privado y No Asegurados
            </p>
          </div>

          {/* Filtro rápido por tipo de seguro */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Resaltar:</span>
            {['TODOS', 'SIS', 'ESSALUD', 'EPS/PRIV'].map((t) => (
              <button
                key={t}
                onClick={() => setSeguroHighlight(t)}
                className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                  seguroHighlight === t
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Mes</th>
                <th className="py-3 px-3 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                  Citas Prog.
                </th>
                <th className="py-3 px-3 text-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                  Atendidos
                </th>
                <th className="py-3 px-3 text-center text-slate-500">Inasistencias</th>
                <th className="py-3 px-3 text-center">% Cumpl.</th>
                <th
                  className={`py-3 px-3 text-center transition-colors ${
                    seguroHighlight === 'SIS' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-900 dark:text-teal-200' : 'text-teal-800 dark:text-teal-300'
                  }`}
                >
                  SIS
                </th>
                <th
                  className={`py-3 px-3 text-center transition-colors ${
                    seguroHighlight === 'ESSALUD' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200' : 'text-blue-800 dark:text-blue-300'
                  }`}
                >
                  EsSalud
                </th>
                <th className="py-3 px-3 text-center text-indigo-800 dark:text-indigo-300">EPS</th>
                <th className="py-3 px-3 text-center text-purple-800 dark:text-purple-300">Privado</th>
                <th className="py-3 px-3 text-center text-amber-800 dark:text-amber-300">Ninguno / Part.</th>
                <th className="py-3 px-3 text-center text-slate-600">Otro</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {datosMeses.map((m) => {
                const cumplimiento = m.porcentajeCumplimiento;
                const statusColor =
                  cumplimiento >= 85
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : cumplimiento >= 70
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';

                return (
                  <tr
                    key={m.mesNumero}
                    className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
                      {m.mesNombre}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-800 dark:text-blue-300 bg-blue-50/20 dark:bg-blue-950/10">
                      {m.citasProgramadas}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                      {m.pacientesAtendidos}
                    </td>
                    <td className="py-3 px-3 text-center text-rose-600 dark:text-rose-400 font-medium">
                      {m.pacientesNoAsistieron}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {cumplimiento}%
                    </td>
                    {/* Seguros */}
                    <td
                      className={`py-3 px-3 text-center font-semibold text-teal-700 dark:text-teal-400 ${
                        seguroHighlight === 'SIS' ? 'bg-teal-50 dark:bg-teal-950/30' : ''
                      }`}
                    >
                      {m.desgloseSeguro.SIS}
                    </td>
                    <td
                      className={`py-3 px-3 text-center font-semibold text-blue-700 dark:text-blue-400 ${
                        seguroHighlight === 'ESSALUD' ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      {m.desgloseSeguro.ESSALUD}
                    </td>
                    <td className="py-3 px-3 text-center text-indigo-700 dark:text-indigo-400">
                      {m.desgloseSeguro.EPS}
                    </td>
                    <td className="py-3 px-3 text-center text-purple-700 dark:text-purple-400">
                      {m.desgloseSeguro.PRIVADO}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-700 dark:text-amber-400">
                      {m.desgloseSeguro.NINGUNO}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500">
                      {m.desgloseSeguro.OTRO}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                        {cumplimiento >= 85 ? 'ÓPTIMO' : cumplimiento >= 70 ? 'REGULAR' : 'BAJO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totales Anuales Footer */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-900 font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600">
                <td className="py-3.5 px-4 text-sm uppercase">Total Anual</td>
                <td className="py-3.5 px-3 text-center text-blue-800 dark:text-blue-300 text-sm">
                  {totalProgramadas}
                </td>
                <td className="py-3.5 px-3 text-center text-emerald-700 dark:text-emerald-400 text-sm">
                  {totalAtendidas}
                </td>
                <td className="py-3.5 px-3 text-center text-rose-600 text-sm">
                  {totalNoAsistieron}
                </td>
                <td className="py-3.5 px-3 text-center text-sm">
                  {porcentajeCumplimientoGlobal}%
                </td>
                <td className="py-3.5 px-3 text-center text-teal-700 dark:text-teal-400 text-sm">
                  {totalSIS}
                </td>
                <td className="py-3.5 px-3 text-center text-blue-700 dark:text-blue-400 text-sm">
                  {totalEsSalud}
                </td>
                <td className="py-3.5 px-3 text-center text-indigo-700 text-sm">
                  {totalEPS}
                </td>
                <td className="py-3.5 px-3 text-center text-purple-700 text-sm">
                  {totalPrivado}
                </td>
                <td className="py-3.5 px-3 text-center text-amber-700 text-sm">
                  {totalNinguno}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-600 text-sm">
                  {totalOtro}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="bg-teal-700 text-white px-2.5 py-1 rounded-full text-[11px]">
                    CONSOLIDADO
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-teal-600 shrink-0" />
            <span>
              Datos calculados con base en las citas y atenciones registradas en Centinela de Vida (CSMC). Los asegurados SIS representan la prioridad en salud mental comunitaria.
            </span>
          </div>
          <button
            onClick={() => setCurrentTab('agenda')}
            className="text-teal-700 dark:text-teal-400 hover:underline font-semibold text-xs whitespace-nowrap cursor-pointer"
          >
            Ir a Agenda de Citas &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
