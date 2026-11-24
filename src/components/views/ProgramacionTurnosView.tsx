import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AsignacionTurnoDia, CodigoTurnoRol } from '../../types';
import {
  MESES_NOMBRES,
  formatFechaIso,
  getCodigoTurnoProfesionalEnFecha,
  getDaysInMonth,
  getDiaSemanaLetra,
  getHorasMesProfesional,
  getSemanasDelMes,
  getTodayIso,
} from '../../lib/turnosHelper';
import { ModalImportarRolPdf } from '../modals/ModalImportarRolPdf';
import { ModalImportarRolExcel } from '../modals/ModalImportarRolExcel';
import {
  Clock,
  Calendar,
  Building2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  Users,
  Copy,
  Wand2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Paintbrush,
  RefreshCw,
  Database,
} from 'lucide-react';

type VistaRolMode = 'consultorios' | 'profesionales';
type PincelModo = 'SELECT' | CodigoTurnoRol | 'CLEAR';

const CODIGOS_ROL: Array<{
  codigo: CodigoTurnoRol;
  label: string;
  desc: string;
  chipClass: string;
}> = [
  {
    codigo: 'M',
    label: 'M',
    desc: 'Mañana (08:00 - 14:00)',
    chipClass: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700',
  },
  {
    codigo: 'T',
    label: 'T',
    desc: 'Tarde (14:00 - 20:00)',
    chipClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700',
  },
  {
    codigo: 'MT',
    label: 'MT',
    desc: 'Mañana y Tarde (08:00 - 20:00)',
    chipClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700',
  },
  {
    codigo: 'L',
    label: 'L',
    desc: 'Libre / Franco',
    chipClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  },
  {
    codigo: 'D',
    label: 'D',
    desc: 'Descanso / Domingo',
    chipClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700',
  },
  {
    codigo: 'V',
    label: 'V',
    desc: 'Vacaciones / Licencia',
    chipClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700',
  },
  {
    codigo: 'F',
    label: 'F',
    desc: 'Feriado',
    chipClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700',
  },
];

export const ProgramacionTurnosView: React.FC = () => {
  const {
    currentUser,
    isDeveloperMode,
    consultorios,
    profesionales,
    asignarProfesionalAConsultorio,
    turnosProgramados,
    consultoriosDefaultProf,
    setConsultorioDefaultProf,
    turnosSyncStatus,
    turnosSyncError,
    reintentarGuardarTurnos,
    asignarTurnoConsultorioFecha,
    aplicarTurnoProfesionalFecha,
    importarTurnosMasivo,
    limpiarTurnosMes,
    isSupabaseConfigured,
  } = useApp();

  const isDeveloper = isDeveloperMode || currentUser.rol === 'desarrollador';
  const canImportExcel = isDeveloper || currentUser.rol === 'administrador';
  const todayIso = getTodayIso();
  const hoy = useMemo(() => new Date(), []);

  const [anio, setAnio] = useState<number>(hoy.getFullYear());
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1);
  const [vistaMode, setVistaMode] = useState<VistaRolMode>('consultorios');
  const [incluirDomingos, setIncluirDomingos] = useState<boolean>(false);
  const [semanaIdx, setSemanaIdx] = useState<number>(0);
  const [busqueda, setBusqueda] = useState<string>('');
  const [showBaseFija, setShowBaseFija] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [confirmClearMes, setConfirmClearMes] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [pincel, setPincel] = useState<PincelModo>('SELECT');
  const [showSqlHelp, setShowSqlHelp] = useState<boolean>(false);
  const [copiedTurnosSql, setCopiedTurnosSql] = useState<boolean>(false);

  const profesionalesActivos = useMemo(
    () =>
      profesionales
        .filter((p) => p.estado === 'ACTIVO')
        .sort((a, b) => a.apellidos_nombres.localeCompare(b.apellidos_nombres)),
    [profesionales]
  );

  const semanas = useMemo(
    () => getSemanasDelMes(anio, mes, incluirDomingos),
    [anio, mes, incluirDomingos]
  );

  // Seleccionar la semana actual al abrir el mes en curso
  useEffect(() => {
    const idxHoy = semanas.findIndex((s) => s.dias.some((d) => d.fecha === todayIso));
    setSemanaIdx(idxHoy >= 0 ? idxHoy : 0);
  }, [anio, mes, incluirDomingos, todayIso]);

  const semanaActual = semanas[Math.min(semanaIdx, Math.max(0, semanas.length - 1))] || semanas[0];

  const totalDiasMes = useMemo(() => getDaysInMonth(anio, mes), [anio, mes]);
  const diasDelMes = useMemo(
    () =>
      Array.from({ length: totalDiasMes }, (_, idx) => {
        const dia = idx + 1;
        const fecha = formatFechaIso(anio, mes, dia);
        const letra = getDiaSemanaLetra(anio, mes, dia);
        const esDomingo = new Date(anio, mes - 1, dia).getDay() === 0;
        return { dia, fecha, letra, esDomingo };
      }),
    [anio, mes, totalDiasMes]
  );

  const mesPrefix = `${anio}-${String(mes).padStart(2, '0')}-`;
  const turnosDelMes = useMemo(
    () => turnosProgramados.filter((t) => t.fecha.startsWith(mesPrefix)),
    [turnosProgramados, mesPrefix]
  );

  // Índice rápido de turnos por fecha + consultorio + turno
  const slotMap = useMemo(() => {
    const map = new Map<string, AsignacionTurnoDia>();
    for (const t of turnosDelMes) {
      if (t.turno === 'MAÑANA' || t.turno === 'TARDE') {
        map.set(`${t.fecha}__${t.consultorio_id}__${t.turno}`, t);
      }
    }
    return map;
  }, [turnosDelMes]);

  // Detectar cruces: mismo profesional en más de 1 consultorio en la misma fecha y turno
  const crucesSet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of turnosDelMes) {
      if ((t.turno === 'MAÑANA' || t.turno === 'TARDE') && t.profesional_id) {
        const k = `${t.fecha}__${t.turno}__${t.profesional_id}`;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    const conflicts = new Set<string>();
    for (const [k, count] of counts.entries()) {
      if (count > 1) conflicts.add(k);
    }
    return conflicts;
  }, [turnosDelMes]);

  const consultoriosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return consultorios;
    return consultorios.filter(
      (c) =>
        c.codigo.toLowerCase().includes(q) ||
        c.nombre.toLowerCase().includes(q) ||
        (c.piso || '').toLowerCase().includes(q)
    );
  }, [consultorios, busqueda]);

  const profesionalesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return profesionalesActivos;
    return profesionalesActivos.filter(
      (p) =>
        p.apellidos_nombres.toLowerCase().includes(q) ||
        (p.profesion || '').toLowerCase().includes(q) ||
        (p.especialidad || '').toLowerCase().includes(q)
    );
  }, [profesionalesActivos, busqueda]);

  const notify = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const cambiarMes = (delta: number) => {
    let nextMes = mes + delta;
    let nextAnio = anio;
    if (nextMes < 1) {
      nextMes = 12;
      nextAnio -= 1;
    } else if (nextMes > 12) {
      nextMes = 1;
      nextAnio += 1;
    }
    setAnio(nextAnio);
    setMes(nextMes);
    setConfirmClearMes(false);
  };

  const irAHoy = () => {
    setAnio(hoy.getFullYear());
    setMes(hoy.getMonth() + 1);
  };

  const handleAplicarBaseASemana = () => {
    if (!semanaActual) return;
    const nuevos: AsignacionTurnoDia[] = [];

    for (const d of semanaActual.dias) {
      if (d.esDomingo) continue;
      for (const cons of consultorios) {
        const keyM = `${d.fecha}__${cons.id}__MAÑANA`;
        if (!slotMap.has(keyM) && cons.profesional_id) {
          nuevos.push({
            id: keyM,
            fecha: d.fecha,
            consultorio_id: cons.id,
            turno: 'MAÑANA',
            profesional_id: cons.profesional_id,
            profesional_nombre: cons.profesional_nombre,
            codigo_rol: 'M',
          });
        }
        const keyT = `${d.fecha}__${cons.id}__TARDE`;
        if (!slotMap.has(keyT) && cons.profesional_tarde_id) {
          nuevos.push({
            id: keyT,
            fecha: d.fecha,
            consultorio_id: cons.id,
            turno: 'TARDE',
            profesional_id: cons.profesional_tarde_id,
            profesional_nombre: cons.profesional_tarde_nombre,
            codigo_rol: 'T',
          });
        }
      }
    }

    if (nuevos.length === 0) {
      notify('Todos los espacios vacíos de esta semana ya están asignados o no hay asignación base definida.');
      return;
    }
    importarTurnosMasivo(nuevos);
    notify(`Se rellenaron ${nuevos.length} turnos en ${semanaActual.label} usando la base fija.`);
  };

  const handleCopiarSemanaATodoElMes = () => {
    if (!semanaActual) return;

    // Patrón por día de semana (0=Dom..6=Sáb) basado en la semana visible
    const patronPorDow = new Map<number, AsignacionTurnoDia[]>();
    for (const d of semanaActual.dias) {
      const dow = new Date(`${d.fecha}T12:00:00`).getDay();
      const delDia = turnosDelMes.filter(
        (t) => t.fecha === d.fecha && (t.turno === 'MAÑANA' || t.turno === 'TARDE')
      );
      patronPorDow.set(dow, delDia);
    }

    const nuevos: AsignacionTurnoDia[] = [];
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const fecha = formatFechaIso(anio, mes, dia);
      const dow = new Date(anio, mes - 1, dia).getDay();
      const plantilla = patronPorDow.get(dow);
      if (!plantilla || plantilla.length === 0) continue;

      for (const item of plantilla) {
        nuevos.push({
          ...item,
          id: `${fecha}__${item.consultorio_id}__${item.turno}`,
          fecha,
        });
      }
    }

    if (nuevos.length === 0) {
      notify('Primero asigna al menos un turno en la semana actual para poder copiarlo al resto del mes.');
      return;
    }

    importarTurnosMasivo(nuevos);
    notify(`Patrón de ${semanaActual.label} replicado en ${MESES_NOMBRES[mes - 1]} ${anio} (${nuevos.length} turnos).`);
  };

  const getConsultorioDefaultProf = (profId: string, fecha?: string): string => {
    if (consultoriosDefaultProf[profId]) return consultoriosDefaultProf[profId];
    if (fecha) {
      const delDia = turnosDelMes.find(
        (t) =>
          t.fecha === fecha &&
          t.profesional_id === profId &&
          (t.turno === 'MAÑANA' || t.turno === 'TARDE') &&
          t.consultorio_id
      );
      if (delDia?.consultorio_id) return delDia.consultorio_id;
    }
    const prof = profesionalesActivos.find((p) => p.id === profId);
    if (prof?.consultorioAsignado) {
      const found = consultorios.find(
        (c) => c.id === prof.consultorioAsignado || c.codigo === prof.consultorioAsignado
      );
      if (found) return found.id;
    }
    return consultorios[0]?.id || '';
  };

  const TURNOS_SQL_FIX = `-- Ejecutar en Supabase -> SQL Editor para ampliar cv_configuracion y/o habilitar cv_turnos_programados
ALTER TABLE IF EXISTS public.cv_configuracion ALTER COLUMN valor TYPE text;
CREATE TABLE IF NOT EXISTS public.cv_turnos_programados (
  clave text PRIMARY KEY,
  datos jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cv_turnos_programados TO anon, authenticated;
ALTER TABLE public.cv_turnos_programados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acceso turnos centinela" ON public.cv_turnos_programados;
CREATE POLICY "Permitir acceso turnos centinela" ON public.cv_turnos_programados FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`;

  const getBadgeClassPorCodigo = (codigo: CodigoTurnoRol | '') => {
    const found = CODIGOS_ROL.find((c) => c.codigo === codigo);
    return found ? found.chipClass : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Programación de Turnos y Consultorios
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Rol por fecha exacta — asigna turnos Mañana (08–14h) y Tarde (14–20h) día por día
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isSupabaseConfigured && (
            <button
              type="button"
              onClick={() => reintentarGuardarTurnos()}
              title="Clic para guardar/sincronizar turnos en Supabase"
              className={`flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold rounded-xl border cursor-pointer transition-colors ${
                turnosSyncStatus === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                  : turnosSyncStatus === 'saving'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              {turnosSyncStatus === 'saving' ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Database size={13} />
              )}
              <span>
                {turnosSyncStatus === 'saving'
                  ? 'Guardando...'
                  : turnosSyncStatus === 'error'
                    ? 'Error al guardar en BD'
                    : turnosSyncStatus === 'saved'
                      ? 'Guardado en Supabase'
                      : 'Sincronizar Turnos'}
              </span>
            </button>
          )}

          {/* Selector de Mes / Año */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              title="Mes anterior"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-white min-w-[132px] text-center">
              {MESES_NOMBRES[mes - 1]} {anio}
            </span>
            <button
              type="button"
              onClick={() => cambiarMes(1)}
              title="Mes siguiente"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={irAHoy}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
          >
            Hoy
          </button>

          {canImportExcel && (
            <button
              type="button"
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer transition-colors"
            >
              <FileSpreadsheet size={15} />
              <span>Importar Rol Excel</span>
            </button>
          )}

          {isDeveloper && (
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm cursor-pointer transition-colors"
            >
              <Sparkles size={15} />
              <span>Importar Rol PDF (IA)</span>
            </button>
          )}
        </div>
      </div>

      {turnosSyncStatus === 'error' && turnosSyncError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={15} className="text-rose-600 shrink-0" />
              <span>No se pudo guardar en Supabase: {turnosSyncError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSqlHelp((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 font-bold text-[11px] cursor-pointer"
              >
                {showSqlHelp ? 'Ocultar SQL' : 'Ver solución SQL'}
              </button>
              <button
                type="button"
                onClick={() => reintentarGuardarTurnos()}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
          {showSqlHelp && (
            <div className="space-y-2 pt-1">
              <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[10.5px] overflow-x-auto">
                {TURNOS_SQL_FIX}
              </pre>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(TURNOS_SQL_FIX).catch(() => {});
                  setCopiedTurnosSql(true);
                  setTimeout(() => setCopiedTurnosSql(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-white text-[11px] font-semibold cursor-pointer"
              >
                <Copy size={12} />
                <span>{copiedTurnosSql ? 'SQL copiado al portapapeles' : 'Copiar SQL para Supabase'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2">
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="p-1 rounded hover:bg-emerald-200/50 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Barra de Modos y Acciones */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start">
            <button
              type="button"
              onClick={() => setVistaMode('consultorios')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                vistaMode === 'consultorios'
                  ? 'bg-[#1A2B4A] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Building2 size={14} />
              <span>Por Consultorio y Fecha (Semana)</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaMode('profesionales')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                vistaMode === 'profesionales'
                  ? 'bg-[#1A2B4A] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Users size={14} />
              <span>Por Profesional (Matriz 01–{totalDiasMes})</span>
            </button>
          </div>

          {/* Buscador + Acciones Rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  vistaMode === 'consultorios'
                    ? 'Filtrar consultorio...'
                    : 'Filtrar profesional...'
                }
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>

            {vistaMode === 'consultorios' && (
              <>
                <button
                  type="button"
                  onClick={handleAplicarBaseASemana}
                  title="Rellenar huecos de esta semana usando los consultorios base"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg cursor-pointer"
                >
                  <Wand2 size={13} />
                  <span>Aplicar base a semana</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopiarSemanaATodoElMes}
                  title="Replicar los turnos de esta semana a las demás semanas del mes"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-lg cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Copiar semana al mes</span>
                </button>
              </>
            )}

            {turnosDelMes.length > 0 &&
              (confirmClearMes ? (
                <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded-lg">
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                    ¿Limpiar {MESES_NOMBRES[mes - 1]}?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      limpiarTurnosMes(anio, mes);
                      setConfirmClearMes(false);
                      notify(`Se limpiaron los turnos de ${MESES_NOMBRES[mes - 1]} ${anio}.`);
                    }}
                    className="p-1 bg-rose-600 text-white rounded cursor-pointer"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearMes(false)}
                    className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearMes(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Limpiar mes</span>
                </button>
              ))}
          </div>
        </div>

        {/* Subbarra contextual */}
        {vistaMode === 'consultorios' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center gap-1.5">
              {semanas.map((sem) => (
                <button
                  key={sem.index}
                  type="button"
                  onClick={() => setSemanaIdx(sem.index)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                    semanaActual?.index === sem.index
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sem.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirDomingos}
                onChange={(e) => setIncluirDomingos(e.target.checked)}
                className="rounded border-slate-300 text-teal-600"
              />
              <span>Incluir Domingos</span>
            </label>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                <Paintbrush size={13} className="text-indigo-600" />
                Pincel rápido:
              </span>
              <button
                type="button"
                onClick={() => setPincel('SELECT')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                  pincel === 'SELECT'
                    ? 'bg-[#1A2B4A] text-white border-[#1A2B4A]'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Selector lista
              </button>
              {CODIGOS_ROL.map((c) => (
                <button
                  key={c.codigo}
                  type="button"
                  onClick={() => setPincel(c.codigo)}
                  title={c.desc}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                    pincel === c.codigo
                      ? `${c.chipClass} ring-2 ring-indigo-500`
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPincel('CLEAR')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                  pincel === 'CLEAR'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-slate-900 text-rose-600 border-rose-200 dark:border-rose-800'
                }`}
              >
                Borrar
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              {pincel === 'SELECT'
                ? 'Cambia cualquier día desde la lista de cada casilla'
                : `Modo pincel activo (${pincel === 'CLEAR' ? 'Borrar' : pincel}): haz clic en cualquier día para asignar`}
            </span>
          </div>
        )}
      </div>

      {/* VISTA 1: POR CONSULTORIO Y FECHA EXACTA (SEMANA) */}
      {vistaMode === 'consultorios' && semanaActual && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar size={16} className="text-teal-600" />
              <span>
                Rol Semanal — {MESES_NOMBRES[mes - 1]} {anio} ({semanaActual.label})
              </span>
            </h3>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <UserCheck size={13} /> Cada celda corresponde a una fecha exacta • 6h por turno
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 min-w-[200px] sticky left-0 z-10 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                    Consultorio / Servicio
                  </th>
                  {semanaActual.dias.map((d) => {
                    const esHoy = d.fecha === todayIso;
                    return (
                      <th
                        key={d.fecha}
                        className={`py-3 px-2.5 text-center min-w-[175px] ${
                          esHoy ? 'bg-teal-50/80 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>
                            {d.diaSemanaCorto} {String(d.dia).padStart(2, '0')}
                          </span>
                          {esHoy && (
                            <span className="px-1.5 py-0.5 text-[9px] rounded bg-teal-600 text-white font-bold">
                              HOY
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {consultoriosFiltrados.map((cons) => (
                  <tr key={cons.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/30">
                    <td className="py-3 px-4 sticky left-0 z-10 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700/60 align-top">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {cons.codigo}
                      </div>
                      <div className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold leading-snug">
                        {cons.nombre}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cons.piso}</div>
                    </td>

                    {semanaActual.dias.map((d) => {
                      const slotM = slotMap.get(`${d.fecha}__${cons.id}__MAÑANA`);
                      const slotT = slotMap.get(`${d.fecha}__${cons.id}__TARDE`);
                      const cruceM =
                        slotM?.profesional_id &&
                        crucesSet.has(`${d.fecha}__MAÑANA__${slotM.profesional_id}`);
                      const cruceT =
                        slotT?.profesional_id &&
                        crucesSet.has(`${d.fecha}__TARDE__${slotT.profesional_id}`);
                      const esHoy = d.fecha === todayIso;

                      return (
                        <td
                          key={d.fecha}
                          className={`py-2 px-2 align-top ${
                            esHoy ? 'bg-teal-50/30 dark:bg-teal-950/10' : ''
                          }`}
                        >
                          <div className="space-y-1.5">
                            {/* Turno Mañana */}
                            <div
                              className={`p-1.5 rounded-lg border ${
                                cruceM
                                  ? 'bg-amber-50 border-amber-400 dark:bg-amber-950/30 dark:border-amber-700'
                                  : slotM?.profesional_id
                                    ? 'bg-teal-50/80 border-teal-200 dark:bg-teal-950/25 dark:border-teal-800'
                                    : 'bg-slate-50/70 border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-bold text-teal-800 dark:text-teal-300">
                                  M: 08:00 - 14:00
                                </span>
                                {cruceM && (
                                  <span
                                    title="Este profesional también figura en otro consultorio en este mismo turno"
                                    className="text-[9px] font-bold text-amber-700 flex items-center gap-0.5"
                                  >
                                    <AlertTriangle size={10} /> Cruce
                                  </span>
                                )}
                              </div>
                              <select
                                value={slotM?.profesional_id || ''}
                                onChange={(e) =>
                                  asignarTurnoConsultorioFecha(
                                    d.fecha,
                                    cons.id,
                                    'MAÑANA',
                                    e.target.value
                                  )
                                }
                                className="w-full px-1.5 py-1 text-[10.5px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium cursor-pointer focus:outline-none focus:border-teal-500"
                              >
                                <option value="">-- Sin asignar --</option>
                                {profesionalesActivos.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.apellidos_nombres}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Turno Tarde */}
                            <div
                              className={`p-1.5 rounded-lg border ${
                                cruceT
                                  ? 'bg-amber-50 border-amber-400 dark:bg-amber-950/30 dark:border-amber-700'
                                  : slotT?.profesional_id
                                    ? 'bg-indigo-50/80 border-indigo-200 dark:bg-indigo-950/25 dark:border-indigo-800'
                                    : 'bg-slate-50/70 border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-bold text-indigo-800 dark:text-indigo-300">
                                  T: 14:00 - 20:00
                                </span>
                                {cruceT && (
                                  <span
                                    title="Este profesional también figura en otro consultorio en este mismo turno"
                                    className="text-[9px] font-bold text-amber-700 flex items-center gap-0.5"
                                  >
                                    <AlertTriangle size={10} /> Cruce
                                  </span>
                                )}
                              </div>
                              <select
                                value={slotT?.profesional_id || ''}
                                onChange={(e) =>
                                  asignarTurnoConsultorioFecha(
                                    d.fecha,
                                    cons.id,
                                    'TARDE',
                                    e.target.value
                                  )
                                }
                                className="w-full px-1.5 py-1 text-[10.5px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium cursor-pointer focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">-- Sin asignar --</option>
                                {profesionalesActivos.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.apellidos_nombres}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: MATRIZ MENSUAL POR PROFESIONAL (01 - 31) */}
      {vistaMode === 'profesionales' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap justify-between items-center gap-3">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              <span>
                Cuadro Mensual de Rol por Profesional — {MESES_NOMBRES[mes - 1]} {anio}
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
              {CODIGOS_ROL.map((c) => (
                <span key={c.codigo} className={`px-2 py-0.5 rounded border ${c.chipClass}`}>
                  {c.label}: {c.desc.split(' (')[0]}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 min-w-[200px] sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                    Profesional
                  </th>
                  <th className="py-2.5 px-2 min-w-[140px]">Consultorio</th>
                  <th className="py-2.5 px-2 text-center w-16">Horas</th>
                  {diasDelMes.map((d) => {
                    const esHoy = d.fecha === todayIso;
                    return (
                      <th
                        key={d.fecha}
                        className={`py-2 px-1 text-center min-w-[44px] ${
                          esHoy
                            ? 'bg-teal-100/80 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300'
                            : d.esDomingo
                              ? 'bg-rose-50/70 dark:bg-rose-950/20 text-rose-600'
                              : ''
                        }`}
                      >
                        <div className="text-[9px] opacity-75">{d.letra}</div>
                        <div className="font-mono text-[11px] font-bold">
                          {String(d.dia).padStart(2, '0')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {profesionalesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={3 + diasDelMes.length} className="py-10 text-center text-slate-400">
                      No hay profesionales activos que coincidan con el filtro.
                    </td>
                  </tr>
                ) : (
                  profesionalesFiltrados.map((prof) => {
                    const horasMes = getHorasMesProfesional(turnosProgramados, prof.id, anio, mes);
                    const consSeleccionado = getConsultorioDefaultProf(prof.id);

                    return (
                      <tr key={prof.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/20">
                        <td className="py-2 px-3 sticky left-0 z-10 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700/60">
                          <div className="font-bold text-[11px] text-slate-900 dark:text-white truncate max-w-[195px]">
                            {prof.apellidos_nombres}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[195px]">
                            {prof.profesion}
                          </div>
                        </td>

                        <td className="py-2 px-2">
                          <select
                            value={consSeleccionado}
                            onChange={(e) => setConsultorioDefaultProf(prof.id, e.target.value)}
                            className="w-36 px-1.5 py-1 text-[10.5px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            {consultorios.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.codigo}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-2 px-2 text-center font-mono font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10.5px] ${
                              horasMes >= 150
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : horasMes > 0
                                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300'
                                  : 'text-slate-400'
                            }`}
                          >
                            {horasMes}h
                          </span>
                        </td>

                        {diasDelMes.map((d) => {
                          const codigo = getCodigoTurnoProfesionalEnFecha(
                            turnosDelMes,
                            prof.id,
                            d.fecha
                          );
                          const badgeClass = getBadgeClassPorCodigo(codigo);
                          const consParaDia = getConsultorioDefaultProf(prof.id, d.fecha);

                          return (
                            <td
                              key={d.fecha}
                              className={`p-1 text-center ${
                                d.esDomingo ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                              }`}
                            >
                              {pincel === 'SELECT' ? (
                                <select
                                  value={codigo}
                                  onChange={(e) =>
                                    aplicarTurnoProfesionalFecha(
                                      d.fecha,
                                      prof.id,
                                      consParaDia,
                                      e.target.value as CodigoTurnoRol | ''
                                    )
                                  }
                                  title={`${prof.apellidos_nombres} • ${d.fecha}`}
                                  className={`w-10 h-7 text-center text-[10px] font-mono font-bold rounded border cursor-pointer focus:outline-none appearance-none ${badgeClass}`}
                                >
                                  <option value="">—</option>
                                  <option value="M">M</option>
                                  <option value="T">T</option>
                                  <option value="MT">MT</option>
                                  <option value="L">L</option>
                                  <option value="D">D</option>
                                  <option value="V">V</option>
                                  <option value="F">F</option>
                                </select>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    aplicarTurnoProfesionalFecha(
                                      d.fecha,
                                      prof.id,
                                      consParaDia,
                                      pincel === 'CLEAR' ? '' : pincel
                                    )
                                  }
                                  title={`Clic para asignar ${pincel === 'CLEAR' ? 'vacío' : pincel} el ${d.fecha}`}
                                  className={`w-10 h-7 text-center text-[10px] font-mono font-bold rounded border cursor-pointer transition-transform active:scale-95 ${badgeClass}`}
                                >
                                  {codigo || '—'}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asignación Base Fija (Colapsable) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBaseFija((prev) => !prev)}
          className="w-full p-4 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap justify-between items-center gap-2 text-left cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-900/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-teal-600" />
            <span className="font-bold text-sm text-slate-800 dark:text-white">
              Asignación Base Fija por Consultorio (Mañana / Tarde)
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              — Respaldo por defecto cuando una fecha no tiene turno específico
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>{profesionalesActivos.length} profesionales activos</span>
            {showBaseFija ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showBaseFija && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-slate-200 dark:border-slate-700">
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
                      Turno Mañana base (08:00 - 14:00)
                    </label>
                    <select
                      value={cons.profesional_id || ''}
                      onChange={(e) =>
                        asignarProfesionalAConsultorio(cons.id, 'MAÑANA', e.target.value)
                      }
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
                      Turno Tarde base (14:00 - 20:00)
                    </label>
                    <select
                      value={cons.profesional_tarde_id || ''}
                      onChange={(e) =>
                        asignarProfesionalAConsultorio(cons.id, 'TARDE', e.target.value)
                      }
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
        )}
      </div>

      {/* Modal Importar Rol desde Excel (Administrador y Desarrollador) */}
      {canImportExcel && (
        <ModalImportarRolExcel
          isOpen={showExcelModal}
          onClose={() => setShowExcelModal(false)}
          anioActual={anio}
          mesActual={mes}
          onApplied={(appliedAnio, appliedMes, totalTurnos) => {
            setAnio(appliedAnio);
            setMes(appliedMes);
            setVistaMode('profesionales');
            notify(
              `Se asignaron ${totalTurnos} turnos desde el Excel para ${MESES_NOMBRES[appliedMes - 1]} ${appliedAnio}.`
            );
          }}
        />
      )}

      {/* Modal Importar Rol desde PDF (Exclusivo Desarrollador) */}
      {isDeveloper && (
        <ModalImportarRolPdf
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          anioActual={anio}
          mesActual={mes}
          onApplied={(appliedAnio, appliedMes, totalTurnos) => {
            setAnio(appliedAnio);
            setMes(appliedMes);
            setVistaMode('profesionales');
            notify(
              `Se asignaron ${totalTurnos} turnos desde el PDF para ${MESES_NOMBRES[appliedMes - 1]} ${appliedAnio}.`
            );
          }}
        />
      )}
    </div>
  );
};
