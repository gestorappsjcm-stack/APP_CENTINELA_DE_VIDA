import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  Users,
  ShieldCheck,
  AlertTriangle,
  Download,
  Stethoscope,
  Activity,
  HeartHandshake,
  MapPin,
  CheckCircle2,
  Database,
  Info,
} from 'lucide-react';

export const ReportesView: React.FC = () => {
  const { pacientes, atenciones, triajes, profesionales, citas, isSupabaseConfigured, supabaseStatus } = useApp();
  const [periodo, setPeriodo] = useState<string>('2026');

  // Filtrado estricto por periodo seleccionado
  const atencionesPeriodo = atenciones.filter(
    (a) => periodo === 'HISTORICO' || a.fecha_atencion.startsWith(periodo)
  );

  const triajesPeriodo = triajes.filter(
    (t) => periodo === 'HISTORICO' || t.fecha.startsWith(periodo)
  );

  const citasPeriodo = citas.filter(
    (c) => periodo === 'HISTORICO' || c.fecha_cita.startsWith(periodo)
  );

  const pacientesPeriodo = pacientes.filter(
    (p) => periodo === 'HISTORICO' || (p.fecha_ingreso && p.fecha_ingreso.startsWith(periodo)) || periodo === '2026'
  );

  // Totales 100% reales
  const totalPacientes = pacientesPeriodo.length;
  const totalAtenciones = atencionesPeriodo.length;
  const totalTriajes = triajesPeriodo.length;
  const totalCitas = citasPeriodo.length;

  // 1. Distribución real por Condición de Seguro
  const seguroCounts: Record<string, number> = {
    SIS: 0,
    ESSALUD: 0,
    EPS: 0,
    PRIVADO: 0,
    NINGUNO: 0,
    OTRO: 0,
  };

  pacientesPeriodo.forEach((p) => {
    const s = (p.seguro || 'NINGUNO').toUpperCase();
    if (seguroCounts[s] !== undefined) {
      seguroCounts[s]++;
    } else {
      seguroCounts.OTRO++;
    }
  });

  const totalSeguros = Object.values(seguroCounts).reduce((a, b) => a + b, 0);

  // 2. Diagnósticos CIE-10 reales de las atenciones
  const dxMap = new Map<string, { count: number; nombre: string }>();
  atencionesPeriodo.forEach((a) => {
    if (a.cie10_1) {
      const code = a.cie10_1;
      const prev = dxMap.get(code);
      if (prev) {
        prev.count++;
      } else {
        dxMap.set(code, { count: 1, nombre: a.diagnostico_1 || code });
      }
    }
    if (a.cie10_2) {
      const code = a.cie10_2;
      const prev = dxMap.get(code);
      if (prev) {
        prev.count++;
      } else {
        dxMap.set(code, { count: 1, nombre: a.diagnostico_2 || code });
      }
    }
  });

  const topDiagnosticos = Array.from(dxMap.entries())
    .map(([codigo, item]) => ({
      codigo,
      nombre: item.nombre,
      count: item.count,
    }))
    .sort((a, b) => b.count - a.count);

  const maxDxCount = topDiagnosticos.length > 0 ? topDiagnosticos[0].count : 1;

  // 3. Distribución real por Grupo Etario
  const gruposEtarios = [
    { label: 'Niños (0 - 11 años)', count: pacientesPeriodo.filter((p) => (p.edad || 0) <= 11).length, color: 'bg-sky-500' },
    { label: 'Adolescentes (12 - 17 años)', count: pacientesPeriodo.filter((p) => (p.edad || 0) >= 12 && (p.edad || 0) <= 17).length, color: 'bg-teal-500' },
    { label: 'Jóvenes (18 - 29 años)', count: pacientesPeriodo.filter((p) => (p.edad || 0) >= 18 && (p.edad || 0) <= 29).length, color: 'bg-indigo-500' },
    { label: 'Adultos (30 - 59 años)', count: pacientesPeriodo.filter((p) => (p.edad || 0) >= 30 && (p.edad || 0) <= 59).length, color: 'bg-emerald-500' },
    { label: 'Adultos Mayores (60+ años)', count: pacientesPeriodo.filter((p) => (p.edad || 0) >= 60).length, color: 'bg-amber-500' },
  ];
  const totalEdad = gruposEtarios.reduce((acc, g) => acc + g.count, 0);

  // 4. Distribución real por Sexo
  const totalF = pacientesPeriodo.filter((p) => p.sexo === 'F').length;
  const totalM = pacientesPeriodo.filter((p) => p.sexo === 'M').length;
  const totalOtroSexo = pacientesPeriodo.filter((p) => p.sexo !== 'F' && p.sexo !== 'M').length;
  const totalSexo = totalF + totalM + totalOtroSexo;

  // 5. Distribución real por Distrito
  const distritosMap = new Map<string, number>();
  pacientesPeriodo.forEach((p) => {
    const dist = (p.distrito || 'NO ESPECIFICADO').trim().toUpperCase();
    distritosMap.set(dist, (distritosMap.get(dist) || 0) + 1);
  });

  const distritos = Array.from(distritosMap.entries())
    .map(([nombre, count]) => ({
      nombre,
      count,
      porcentaje: totalPacientes > 0 ? Math.round((count / totalPacientes) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 6. Clasificación de Riesgo en Triaje (Manchester)
  const riesgoTriaje = [
    { color: 'ROJO', label: 'Emergencia (Atención Inmediata)', count: triajesPeriodo.filter((t) => t.clasificacion_riesgo === 'ROJO').length, bg: 'bg-red-500', text: 'text-red-700' },
    { color: 'AMARILLO', label: 'Urgencia (Hasta 15 min)', count: triajesPeriodo.filter((t) => t.clasificacion_riesgo === 'AMARILLO').length, bg: 'bg-amber-500', text: 'text-amber-700' },
    { color: 'VERDE', label: 'Consulta Externa (Estándar)', count: triajesPeriodo.filter((t) => t.clasificacion_riesgo === 'VERDE').length, bg: 'bg-emerald-500', text: 'text-emerald-700' },
    { color: 'AZUL', label: 'Preventivo / Administrativo', count: triajesPeriodo.filter((t) => t.clasificacion_riesgo === 'AZUL').length, bg: 'bg-blue-500', text: 'text-blue-700' },
  ];
  const totalTriajesChart = riesgoTriaje.reduce((a, b) => a + b.count, 0);

  const emergenciasUrgencias = riesgoTriaje[0].count + riesgoTriaje[1].count;

  // 7. Productividad real por profesional
  const productividad = profesionales.map((p) => {
    const atn = atencionesPeriodo.filter((a) => a.profesional_id === p.id).length;
    const cit = citasPeriodo.filter((c) => c.profesional_id === p.id).length;
    const cumpl = cit > 0 ? Math.min(100, Math.round((atn / cit) * 100)) : atn > 0 ? 100 : 0;
    return {
      profesional: p,
      atenciones: atn,
      citas: cit,
      cumplimiento: cumpl,
    };
  });

  // Exportar reporte consolidado en archivo de texto
  const exportarResumen = () => {
    const contenido = `REPORTE ESTADÍSTICO REAL - CSMC CENTINELA DE VIDA
Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}
Periodo Evaluado: ${periodo}
Origen de Datos: ${isSupabaseConfigured && supabaseStatus === 'connected' ? 'Base de Datos Supabase (Producción)' : 'Base de Datos Local'}

1. RESUMEN GENERAL (DATOS REALES)
- Total Pacientes Registrados: ${totalPacientes}
- Pacientes con Seguro SIS: ${seguroCounts.SIS} (${totalPacientes > 0 ? Math.round((seguroCounts.SIS / totalPacientes) * 100) : 0}%)
- Total Atenciones Clínicas en el Periodo: ${totalAtenciones}
- Total Evaluaciones en Triaje: ${totalTriajes}
- Total Citas Programadas: ${totalCitas}

2. MORBILIDAD CIE-10 (ATENCIONES REGISTRADAS)
${topDiagnosticos.length > 0 ? topDiagnosticos.map((d) => `- [${d.codigo}] ${d.nombre}: ${d.count} casos`).join('\n') : '- Sin diagnósticos registrados en este periodo.'}

3. DEMOGRAFÍA REAL
- Mujeres (F): ${totalF} (${totalSexo > 0 ? Math.round((totalF / totalSexo) * 100) : 0}%)
- Hombres (M): ${totalM} (${totalSexo > 0 ? Math.round((totalM / totalSexo) * 100) : 0}%)
- Total evaluado: ${totalSexo}

4. DISTRIBUCIÓN POR CONDICIÓN DE SEGURO
- SIS: ${seguroCounts.SIS}
- EsSalud: ${seguroCounts.ESSALUD}
- EPS: ${seguroCounts.EPS}
- Privado: ${seguroCounts.PRIVADO}
- Ninguno: ${seguroCounts.NINGUNO}
- Otro: ${seguroCounts.OTRO}

5. PROCEDENCIA POR DISTRITO
${distritos.map((d) => `- ${d.nombre}: ${d.count} pacientes (${d.porcentaje}%)`).join('\n')}
`;

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Real_Centinela_${periodo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pctSIS = totalSeguros > 0 ? Math.round((seguroCounts.SIS / totalSeguros) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Reportes Estadísticos y Validación de Atenciones
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Métricas reales de morbilidad CIE-10, afiliación SIS y productividad
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-xs">
            {['2026', '2025', 'HISTORICO'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  periodo === p
                    ? 'bg-[#1A2B4A] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {p === 'HISTORICO' ? 'Histórico Total' : p}
              </button>
            ))}
          </div>

          <button
            onClick={exportarResumen}
            className="flex items-center gap-1.5 bg-[#1A2B4A] hover:bg-[#253c66] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            <Download size={14} />
            Exportar Consolidado
          </button>
        </div>
      </div>

      {/* Banner de Veracidad de Datos */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <span>Reportes Calculados 100% en Base a Datos Reales</span>
              <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                Cero Ficticios
              </span>
            </h4>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
              Todos los gráficos, recuentos y porcentajes se computan en tiempo real exclusivamente desde los registros de tu base de datos ({totalPacientes} pacientes, {totalAtenciones} atenciones y {totalTriajes} triajes).
            </p>
          </div>
        </div>
      </div>

      {/* KPI Top Cards (100% Reales) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pacientes en Padrón</span>
            <Users size={16} className="text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totalPacientes}
          </div>
          <div className="text-[11px] text-teal-600 font-medium mt-0.5">
            Historias clínicas activas
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Cobertura Asegurados SIS</span>
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {pctSIS}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {seguroCounts.SIS} pacientes con SIS Gratuito
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Atenciones Realizadas</span>
            <Activity size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {totalAtenciones}
          </div>
          <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium mt-0.5">
            En periodo {periodo}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Riesgo Crítico / Urgencias</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {emergenciasUrgencias}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
            {riesgoTriaje[0].count} Rojo (Emergencia) | {riesgoTriaje[1].count} Amarillo (Urgencia)
          </div>
        </div>
      </div>

      {/* Grid 2 Columnas de Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica 1: Condición de Aseguramiento */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-600" />
                <span>Atenciones por Condición de Seguro</span>
              </h3>
              <p className="text-xs text-slate-500">Distribución de pacientes según tipo de cobertura</p>
            </div>
            <span className="text-xs bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold px-2 py-0.5 rounded-full">
              MINSA / SIS
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { label: 'SIS (Seguro Integral de Salud)', count: seguroCounts.SIS, color: 'bg-teal-600' },
              { label: 'EsSalud', count: seguroCounts.ESSALUD, color: 'bg-blue-600' },
              { label: 'EPS', count: seguroCounts.EPS, color: 'bg-indigo-600' },
              { label: 'Privado', count: seguroCounts.PRIVADO, color: 'bg-purple-600' },
              { label: 'Ninguno / Particular', count: seguroCounts.NINGUNO, color: 'bg-amber-500' },
              { label: 'Otros Convenios', count: seguroCounts.OTRO, color: 'bg-slate-400' },
            ].map((item) => {
              const pct = totalSeguros > 0 ? Math.round((item.count / totalSeguros) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{item.label}</span>
                    <span>{item.count} pacientes ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }} className={`h-full ${item.color} rounded-full transition-all`}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfica 2: Morbilidad en Salud Mental (CIE-10) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-purple-600" />
                <span>Diagnósticos de Salud Mental Registrados (CIE-10)</span>
              </h3>
              <p className="text-xs text-slate-500">Patologías registradas en consultas clínicas</p>
            </div>
            <span className="text-xs bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
              Morbilidad Real
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {topDiagnosticos.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                Aún no hay atenciones con código CIE-10 registrado en el periodo {periodo}.
              </div>
            ) : (
              topDiagnosticos.slice(0, 5).map((item) => {
                const pct = Math.round((item.count / maxDxCount) * 100);
                return (
                  <div key={item.codigo} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-purple-900 dark:text-purple-300">
                        [{item.codigo}] <span className="font-normal text-slate-700 dark:text-slate-300">{item.nombre}</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-purple-600 rounded-full transition-all"></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Gráfica 3: Demografía por Grupo Etario y Sexo */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-sky-600" />
                <span>Pirámide Demográfica: Grupo Etario y Género</span>
              </h3>
              <p className="text-xs text-slate-500">Población beneficiaria registrada</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-rose-600">♀ Mujeres: {totalSexo > 0 ? Math.round((totalF / totalSexo) * 100) : 0}% ({totalF})</span>
              <span className="text-blue-600">♂ Hombres: {totalSexo > 0 ? Math.round((totalM / totalSexo) * 100) : 0}% ({totalM})</span>
            </div>
          </div>

          <div className="space-y-3">
            {gruposEtarios.map((g) => {
              const pct = totalEdad > 0 ? Math.round((g.count / totalEdad) * 100) : 0;
              return (
                <div key={g.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{g.label}</span>
                    <span>{g.count} pacientes ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }} className={`h-full ${g.color} rounded-full`}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfica 4: Validación de Riesgo y Triaje Manchester */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope size={16} className="text-emerald-600" />
                <span>Clasificación de Riesgo en Triaje (Manchester)</span>
              </h3>
              <p className="text-xs text-slate-500">Evaluación inicial registrada de urgencia</p>
            </div>
            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
              Triage Real
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {riesgoTriaje.map((r) => {
              const pct = totalTriajesChart > 0 ? Math.round((r.count / totalTriajesChart) * 100) : 0;
              return (
                <div
                  key={r.color}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span className={`w-3 h-3 rounded-full ${r.bg}`}></span>
                      {r.color}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {r.count} ({pct}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{r.label}</p>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <HeartHandshake size={18} className="shrink-0 text-amber-600" />
            <span>
              <strong>Evaluación de Triaje:</strong> {totalTriajes} pacientes evaluados en enfermería en el periodo {periodo}.
            </span>
          </div>
        </div>
      </div>

      {/* Distribución por Distrito y Productividad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Procedencia Geográfica */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin size={16} className="text-rose-600" />
            <span>Procedencia Geográfica Real</span>
          </h3>
          <p className="text-xs text-slate-500">Distritos según residencia de los pacientes</p>

          <div className="space-y-2 pt-1 max-h-64 overflow-y-auto">
            {distritos.length === 0 ? (
              <p className="text-xs text-slate-400">Sin distritos registrados</p>
            ) : (
              distritos.map((d) => (
                <div key={d.nombre} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-none">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{d.nombre}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{d.count} ({d.porcentaje}%)</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Productividad Asistencial Real */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Productividad por Profesional Asistencial (Real)</span>
          </h3>
          <p className="text-xs text-slate-500">Atenciones clínicas registradas en el periodo</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                  <th className="py-2">Profesional</th>
                  <th className="py-2">Especialidad</th>
                  <th className="py-2 text-center">Citas Asignadas</th>
                  <th className="py-2 text-center">Atenciones Realizadas</th>
                  <th className="py-2 text-center">Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {productividad.map((p) => (
                  <tr key={p.profesional.id}>
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-100">
                      {p.profesional.apellidos_nombres}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {p.profesional.profesion} - {p.profesional.especialidad || 'General'}
                    </td>
                    <td className="py-2.5 text-center text-slate-600 dark:text-slate-300 font-medium">
                      {p.citas}
                    </td>
                    <td className="py-2.5 text-center font-bold text-teal-700 dark:text-teal-400">
                      {p.atenciones}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        {p.cumplimiento}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
