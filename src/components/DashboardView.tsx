import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Stethoscope,
  ClipboardList,
  UserCheck,
  UserPlus,
  FileText,
  Activity,
  CalendarRange,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Lock,
  Database,
  RefreshCw,
  Server,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    pacientes,
    citas,
    atenciones,
    profesionales,
    setCurrentTab,
    setActiveModal,
    canAccess,
    getProgramacionAnual,
    supabaseStatus,
    supabaseLiveStats,
    syncWithSupabase,
    isSyncing,
  } = useApp();

  const [chartAnio, setChartAnio] = useState<number>(2026);

  // Estadísticas clave (prioriza vistas en vivo de Supabase si existen)
  const totalPacientes = supabaseLiveStats?.totalPacientes ?? pacientes.length;
  const hoyStr = new Date().toISOString().split('T')[0];
  const atencionesHoy =
    supabaseLiveStats?.atencionesHoy ?? atenciones.filter((a) => a.fecha_atencion === hoyStr).length;
  const citasPendientes =
    supabaseLiveStats?.citasPendientes ?? citas.filter((c) => c.estado === 'PENDIENTE').length;
  const profesionalesActivos =
    supabaseLiveStats?.profesionalesActivos ?? profesionales.filter((p) => p.estado === 'ACTIVO').length;

  // Operaciones principales
  const operaciones = [
    {
      id: 'registrarPaciente',
      moduleId: 'pacientes' as const,
      title: 'Registrar Paciente',
      desc: 'Nuevo ingreso de paciente al sistema de salud mental con validación por DNI.',
      icon: UserPlus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      action: () => setActiveModal('registrarPaciente'),
    },
    {
      id: 'verPacientes',
      moduleId: 'pacientes' as const,
      title: 'Ver Pacientes',
      desc: 'Consultar ficha completa, historial y exportación en Excel / PDF.',
      icon: FileText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      action: () => setActiveModal('verPacientes'),
    },
    {
      id: 'registrarAtencion',
      moduleId: 'atencion' as const,
      title: 'Registrar Atención',
      desc: 'Atención médica en consultorio: examen mental, CIE-10, CPMS y recetas.',
      icon: Activity,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-950/30',
      action: () => setCurrentTab('atencion'),
    },
    {
      id: 'programacionAnual',
      moduleId: 'programacion_anual' as const,
      title: 'Programación Anual',
      desc: 'Proyección mensual de pacientes citados vs atendidos por condición SIS / EsSalud.',
      icon: CalendarRange,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      action: () => setCurrentTab('programacion_anual'),
    },
    {
      id: 'reportes',
      moduleId: 'reportes' as const,
      title: 'Reportes',
      desc: 'Estadísticas, indicadores y consolidado de atenciones por periodo.',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      action: () => setCurrentTab('reportes'),
    },
    {
      id: 'gestionarUsuarios',
      moduleId: 'gestion_usuarios' as const,
      title: 'Gestionar Usuarios',
      desc: 'Crear, editar y administrar cuentas de acceso del personal y permisos.',
      icon: ShieldCheck,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
      action: () => setCurrentTab('gestion_usuarios'),
    },
  ];

  const datosChart = getProgramacionAnual(chartAnio);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-7">
      {/* Welcome Banner con Identidad Dual (CSMC Centinela de Vida + Unidad de Seguros) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A2B4A] via-[#1A365D] to-[#2D9C8B] dark:from-[#0B1426] dark:via-[#11243D] dark:to-[#0D4D44] text-white p-6 md:p-8 shadow-xl border border-white/15 dark:border-teal-500/20 transition-all">
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Contenedor de Logos Institucionales */}
            <div className="flex items-center gap-2.5 shrink-0 bg-white/10 dark:bg-black/20 p-2 rounded-2xl backdrop-blur-md border border-white/20">
              {/* Logo 1: CSMC Centinela de Vida */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white shadow-md border-2 border-teal-400 shrink-0 flex items-center justify-center">
                <img
                  src="/img/centinela.jpg"
                  alt="CSMC Centinela de Vida"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-[10px] font-black text-teal-700 leading-none">CSMC<br/>CENTINELA</span>';
                    }
                  }}
                />
              </div>

              <div className="h-8 w-px bg-white/30 hidden sm:block"></div>

              {/* Logo 2: Unidad de Seguros U.E. 401 */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white shadow-md border-2 border-blue-400 shrink-0 flex items-center justify-center">
                <img
                  src="/img/image.png"
                  alt="Unidad de Seguros U.E. 401"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-[10px] font-black text-blue-800 leading-none">U.E. 401<br/>SEGUROS</span>';
                    }
                  }}
                />
              </div>
            </div>

            {/* Saludo y Títulos */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-200 bg-teal-950/40 border border-teal-400/40 px-2.5 py-0.5 rounded-full">
                  Unidad de Seguros • U.E. 401
                </span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-200 bg-blue-950/40 border border-blue-400/40 px-2.5 py-0.5 rounded-full">
                  CSMC Centinela de Vida
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
                Bienvenido, {currentUser.nombres} {currentUser.apellidos}
              </h2>
              <p className="text-xs sm:text-sm text-teal-50/90 font-normal max-w-xl">
                Plataforma Integral de Sistematización, Programación Anual y Gestión FUA
              </p>
            </div>
          </div>

          <div className="self-start md:self-auto shrink-0">
            <span className="bg-white/20 hover:bg-white/25 dark:bg-teal-500/20 backdrop-blur-md text-white dark:text-teal-200 text-xs font-extrabold px-4 py-2 rounded-xl tracking-wider uppercase border border-white/25 dark:border-teal-400/40 shadow-sm inline-block">
              {currentUser.rol}
            </span>
          </div>
        </div>

        {/* Decorative backdrop glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Supabase Integration Live Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              supabaseStatus === 'connected'
                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                : supabaseStatus === 'connecting'
                ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
            }`}
          >
            <Database size={20} className={supabaseStatus === 'connecting' ? 'animate-spin' : ''} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                Base de Datos Supabase (CSMC Centinela de Vida)
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : supabaseStatus === 'connecting'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}
              >
                {supabaseStatus === 'connected'
                  ? 'Conectado en Vivo'
                  : supabaseStatus === 'connecting'
                  ? 'Sincronizando...'
                  : 'Modo Local / Esquema Mapeado'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate max-w-xl">
              Tablas: cv_pacientes, cv_citas, cv_atenciones, cv_triajes, cv_fua_historial • Vistas: v_cv_dashboard_resumen, v_cv_stats_resumen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => syncWithSupabase()}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
          <button
            onClick={() => setActiveModal('supabaseStatus')}
            className="px-3 py-1.5 bg-[#1A2B4A] hover:bg-[#253c66] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Ver Detalles BD
          </button>
        </div>
      </div>

      {/* Stats Row - 4 Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Pacientes Registrados */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-3">
            <Users size={20} />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalPacientes}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Pacientes registrados
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-2">
            Total acumulado
          </div>
        </div>

        {/* Atenciones Hoy */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3">
            <Stethoscope size={20} />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {atencionesHoy}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Atenciones hoy
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            Nuevas hoy
          </div>
        </div>

        {/* Citas Pendientes */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-3">
            <ClipboardList size={20} />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {citasPendientes}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Citas pendientes
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-2">
            Por confirmar
          </div>
        </div>

        {/* Profesionales Activos */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-3">
            <UserCheck size={20} />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {profesionalesActivos}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Profesionales activos
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-2">
            En servicio
          </div>
        </div>
      </div>

      {/* Sección Operaciones - 6 Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="w-1 h-5 bg-[#1A2B4A] dark:bg-teal-400 rounded-full inline-block"></span>
          Operaciones
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {operaciones.map((op) => {
            const hasAccess = canAccess(op.moduleId);
            const Icon = op.icon;

            return (
              <div
                key={op.id}
                onClick={() => {
                  if (hasAccess) op.action();
                }}
                className={`relative group bg-white dark:bg-slate-800 p-6 rounded-2xl border transition-all select-none ${
                  hasAccess
                    ? 'border-slate-200 dark:border-slate-700 hover:border-teal-500/50 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                    : 'border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Icon Wrap */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${op.bgColor} ${op.color} flex items-center justify-center shadow-xs`}>
                    <Icon size={24} />
                  </div>

                  {!hasAccess ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      <Lock size={10} /> Restringido
                    </span>
                  ) : (
                    <ArrowRight
                      size={18}
                      className="text-slate-300 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-1 transition-all"
                    />
                  )}
                </div>

                <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  {op.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {op.desc}
                </p>

                {/* Bottom active accent line on hover */}
                {hasAccess && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-600 to-[#1A2B4A] rounded-b-2xl scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfico de Atenciones por Mes */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
              Atenciones por Mes
            </h3>
            <p className="text-xs text-slate-500">
              Consolidado de consultas psiquiátricas, psicológicas y atenciones comunitarias
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[2026, 2025].map((anio) => (
              <button
                key={anio}
                onClick={() => setChartAnio(anio)}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                  chartAnio === anio
                    ? 'bg-[#1A2B4A] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {anio}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas / SVG Chart Bar */}
        <div className="h-44 w-full flex items-end gap-2 md:gap-4 pt-6 px-2 border-b border-slate-200 dark:border-slate-700">
          {datosChart.map((mes) => {
            const maxVal = 40;
            const height = Math.max(15, Math.round((mes.pacientesAtendidos / maxVal) * 100));

            return (
              <div key={mes.mesNumero} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                <div className="absolute -top-7 text-[10px] font-bold text-teal-800 dark:text-teal-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  {mes.pacientesAtendidos}
                </div>
                <div
                  style={{ height: `${height}%` }}
                  className="w-full max-w-7 bg-gradient-to-t from-[#1A2B4A] to-[#2D9C8B] dark:from-blue-600 dark:to-teal-400 hover:from-blue-700 hover:to-teal-300 rounded-t-md transition-all shadow-xs"
                ></div>
                <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  {mes.mesNombre.substring(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
