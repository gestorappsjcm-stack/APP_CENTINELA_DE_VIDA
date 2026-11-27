import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
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
  Ticket,
  Printer,
  ShieldCheck,
  FastForward,
  UserMinus,
  Sparkles,
  Edit2,
  ClipboardList,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
} from 'lucide-react';
import { TicketAtencionModal } from '../modals/TicketAtencionModal';

export const AgendaView: React.FC = () => {
  const {
    currentUser,
    citas,
    pacientes,
    profesionales,
    consultorios,
    turnosProgramados,
    addCita,
    updateCita,
    updatePaciente,
    confirmarCita,
    cancelarCita,
    adelantarCita,
    liberarCupo,
    setCurrentTab,
  } = useApp();

  const [filtroFecha, setFiltroFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroProf, setFiltroProf] = useState<string>('');
  const [filtroVista, setFiltroVista] = useState<'dia' | 'proximas' | 'todas'>('dia');

  // Modal Nueva Cita
  const [isModalNuevaCita, setIsModalNuevaCita] = useState(false);
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [selectedPacienteId, setSelectedPacienteId] = useState('');
  const [citaFecha, setCitaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [citaHora, setCitaHora] = useState('09:00');
  const [citaProfId, setCitaProfId] = useState('');
  const [citaTipo, setCitaTipo] = useState<'CONSULTA' | 'EMERGENCIA' | 'TELECONSULTA' | 'VISITA_DOMICILIARIA'>('CONSULTA');
  const [citaMotivo, setCitaMotivo] = useState('');
  const [citaSeguro, setCitaSeguro] = useState<'SIS' | 'ESSALUD' | 'PARTICULAR' | 'OTRO'>('SIS');
  const [actualizarSeguroEnFicha, setActualizarSeguroEnFicha] = useState(false);
  const [nuevaCitaError, setNuevaCitaError] = useState<string | null>(null);
  const [editingProfCitaId, setEditingProfCitaId] = useState<string | null>(null);
  const [agendaNotice, setAgendaNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Modal Ticket de Atención
  const [selectedCitaTicket, setSelectedCitaTicket] = useState<Cita | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isRecienCreadaTicket, setIsRecienCreadaTicket] = useState(false);

  // Modal Cancelar Cita
  const [cancelingCitaId, setCancelingCitaId] = useState<string | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Modal Adelantar Cita
  const [adelantarCitaModal, setAdelantarCitaModal] = useState<Cita | null>(null);
  const [adelantarFecha, setAdelantarFecha] = useState(new Date().toISOString().split('T')[0]);
  const [adelantarHora, setAdelantarHora] = useState('09:00');
  const [adelantarPasarATriaje, setAdelantarPasarATriaje] = useState(true);

  // Modal Liberar Cupo
  const [liberarCupoModal, setLiberarCupoModal] = useState<Cita | null>(null);
  const [motivoLiberacion, setMotivoLiberacion] = useState('Paciente no se presentó / Cupo liberado para nueva atención');

  // Búsqueda rápida por paciente / DNI / N° de ticket
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación de tabla principal (20 o 50)
  const [pageSize, setPageSize] = useState<20 | 50>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Ventana emergente: Lista del Día con filtro por profesional y descarga
  const [isModalListaDia, setIsModalListaDia] = useState<boolean>(false);
  const [listaDiaFecha, setListaDiaFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [listaDiaProfId, setListaDiaProfId] = useState<string>('');
  const [listaDiaEstado, setListaDiaEstado] = useState<string>('ACTIVAS');

  // Función de normalización de fecha YYYY-MM-DD
  const normalizarFecha = (f?: string) => {
    if (!f) return '';
    const clean = f.split('T')[0].split(' ')[0].trim();
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return clean;
  };

  const hoyStr = new Date().toISOString().split('T')[0];

  // Filtrado robusto de citas (incluye re-citados y búsqueda global)
  const citasFiltradas = citas
    .filter((c) => {
      const pac = pacientes.find((p) => p.id === c.paciente_id);
      const fechaNorm = normalizarFecha(c.fecha_cita);

      // Búsqueda rápida por texto (si escribe, busca en todo el historial y futuras)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchPac = pac?.apellidos_nombres?.toLowerCase().includes(q);
        const matchDoc = (pac?.numero_documento || pac?.codigo_temporal || '').toLowerCase().includes(q);
        const matchTicket = (c.numero_ticket || '').toLowerCase().includes(q);
        const matchMotivo = (c.motivo_consulta || '').toLowerCase().includes(q);
        if (!matchPac && !matchDoc && !matchTicket && !matchMotivo) {
          return false;
        }
      } else {
        if (filtroVista === 'dia') {
          if (filtroFecha && fechaNorm !== filtroFecha) return false;
        } else if (filtroVista === 'proximas') {
          if (fechaNorm < hoyStr) return false;
        }
      }

      if (filtroEstado && c.estado !== filtroEstado) return false;
      if (filtroProf && c.profesional_id !== filtroProf) return false;
      return true;
    })
    .sort((a, b) => {
      const fA = normalizarFecha(a.fecha_cita) + ' ' + (a.hora_cita || '00:00');
      const fB = normalizarFecha(b.fecha_cita) + ' ' + (b.hora_cita || '00:00');
      return fA.localeCompare(fB);
    });

  const totalRegistros = citasFiltradas.length;
  const totalPages = Math.max(1, Math.ceil(totalRegistros / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroFecha, filtroEstado, filtroProf, filtroVista, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRegistros);

  const citasPaginadas = useMemo(
    () => citasFiltradas.slice(startIndex, endIndex),
    [citasFiltradas, startIndex, endIndex]
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

  // Datos para ventana emergente Lista del Día
  const citasBaseListaDia = useMemo(() => {
    return citas
      .filter((c) => {
        if (normalizarFecha(c.fecha_cita) !== listaDiaFecha) return false;
        if (listaDiaEstado === 'ACTIVAS') return c.estado !== 'CANCELADA';
        if (listaDiaEstado !== 'TODAS') return c.estado === listaDiaEstado;
        return true;
      })
      .sort((a, b) => (a.hora_cita || '00:00').localeCompare(b.hora_cita || '00:00'));
  }, [citas, listaDiaFecha, listaDiaEstado]);

  const conteoPorProfListaDia = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of citasBaseListaDia) {
      const k = c.profesional_id ? String(c.profesional_id) : '__SIN_PROF__';
      map.set(k, (map.get(k) || 0) + 1);
    }
    return map;
  }, [citasBaseListaDia]);

  const citasListaDiaFiltradas = useMemo(() => {
    if (!listaDiaProfId) return citasBaseListaDia;
    if (listaDiaProfId === '__SIN_PROF__') {
      return citasBaseListaDia.filter((c) => !c.profesional_id);
    }
    return citasBaseListaDia.filter((c) => String(c.profesional_id || '') === listaDiaProfId);
  }, [citasBaseListaDia, listaDiaProfId]);

  const handleDescargarListaDiaExcel = () => {
    const fechaLabel = listaDiaFecha || hoyStr;
    const profSeleccionado =
      listaDiaProfId && listaDiaProfId !== '__SIN_PROF__'
        ? profesionales.find((p) => String(p.id) === listaDiaProfId)
        : undefined;

    const buildRowsForList = (items: Cita[]) =>
      items.map((c, idx) => {
        const pac = pacientes.find((p) => String(p.id) === String(c.paciente_id));
        const prof = profesionales.find((p) => String(p.id) === String(c.profesional_id));
        const cons = consultorios.find((x) => x.id === c.consultorio_id);
        return [
          idx + 1,
          c.hora_cita || '',
          c.numero_ticket || `TKT-${c.id.replace('cita-', '').slice(-6)}`,
          pac?.hcl || '-',
          `${pac?.tipo_documento || 'DNI'}: ${pac?.numero_documento || pac?.codigo_temporal || '-'}`,
          pac?.apellidos_nombres || 'Paciente no identificado',
          pac?.celular || '-',
          c.seguro_cita || pac?.seguro || 'SIS',
          prof?.apellidos_nombres || 'Sin profesional asignado',
          cons ? `${cons.codigo} - ${cons.nombre}` : '-',
          c.tipo_cita || 'CONSULTA',
          c.estado,
          c.motivo_consulta || c.observaciones || '-',
        ];
      });

    const createStyledSheet = (tituloProf: string, items: Cita[]) => {
      const aoa = [
        [`CSMC CENTINELA DE VIDA — LISTA DE PACIENTES DEL DÍA (${fechaLabel})`],
        [`Profesional: ${tituloProf}`, '', `Total pacientes: ${items.length}`],
        [],
        [
          'N°',
          'HORA',
          'N° TICKET',
          'HCL',
          'DOCUMENTO',
          'PACIENTE (APELLIDOS Y NOMBRES)',
          'TELÉFONO',
          'SEGURO',
          'PROFESIONAL ASIGNADO',
          'CONSULTORIO',
          'TIPO CITA',
          'ESTADO',
          'MOTIVO / OBSERVACIÓN',
        ],
        ...buildRowsForList(items),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 8 },
        { wch: 16 },
        { wch: 12 },
        { wch: 16 },
        { wch: 36 },
        { wch: 13 },
        { wch: 12 },
        { wch: 32 },
        { wch: 24 },
        { wch: 14 },
        { wch: 13 },
        { wch: 28 },
      ];
      return ws;
    };

    const wb = XLSX.utils.book_new();
    const sanitizeSheetName = (raw: string, fallback: string) => {
      const clean = raw.replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
      return (clean || fallback).slice(0, 31);
    };

    if (listaDiaProfId) {
      const profLabel =
        listaDiaProfId === '__SIN_PROF__'
          ? 'Sin Profesional Asignado'
          : profSeleccionado?.apellidos_nombres || 'Profesional';
      const ws = createStyledSheet(profLabel, citasListaDiaFiltradas);
      XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(profLabel, 'Lista_Dia'));
      const slug = profLabel
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 28);
      XLSX.writeFile(wb, `Lista_Pacientes_${fechaLabel}_${slug || 'Profesional'}.xlsx`);
      return;
    }

    // Todos los profesionales: hoja general + una hoja por cada profesional con citas ese día
    const orderedAll = [...citasListaDiaFiltradas].sort((a, b) => {
      const profA = profesionales.find((p) => String(p.id) === String(a.profesional_id))?.apellidos_nombres || 'ZZZ';
      const profB = profesionales.find((p) => String(p.id) === String(b.profesional_id))?.apellidos_nombres || 'ZZZ';
      const cmp = profA.localeCompare(profB);
      if (cmp !== 0) return cmp;
      return (a.hora_cita || '00:00').localeCompare(b.hora_cita || '00:00');
    });

    XLSX.utils.book_append_sheet(
      wb,
      createStyledSheet('Todos los Profesionales', orderedAll),
      `Lista_${fechaLabel}`
    );

    const groupedByProf = new Map<string, { label: string; items: Cita[] }>();
    for (const c of orderedAll) {
      const prof = profesionales.find((p) => String(p.id) === String(c.profesional_id));
      const key = prof ? String(prof.id) : '__SIN_PROF__';
      const label = prof?.apellidos_nombres || 'Sin Asignar';
      const entry = groupedByProf.get(key) || { label, items: [] };
      entry.items.push(c);
      groupedByProf.set(key, entry);
    }

    const usedNames = new Set<string>([`Lista_${fechaLabel}`]);
    for (const { label, items } of groupedByProf.values()) {
      let sheetName = sanitizeSheetName(label, 'Profesional');
      if (usedNames.has(sheetName)) {
        sheetName = sanitizeSheetName(`${sheetName.slice(0, 27)}_${usedNames.size}`, 'Prof');
      }
      usedNames.add(sheetName);
      XLSX.utils.book_append_sheet(wb, createStyledSheet(label, items), sheetName);
    }

    XLSX.writeFile(wb, `Lista_Pacientes_Dia_${fechaLabel}.xlsx`);
  };

  const resolverConsultorioParaCita = (profId: string, fecha: string, hora: string): string | undefined => {
    if (!profId) return undefined;
    const turnoPreferido = hora && hora < '14:00' ? 'MAÑANA' : 'TARDE';
    const fechaNorm = normalizarFecha(fecha);
    const delRol =
      turnosProgramados.find(
        (t) =>
          t.fecha === fechaNorm &&
          t.profesional_id === profId &&
          t.turno === turnoPreferido &&
          t.consultorio_id
      ) ||
      turnosProgramados.find(
        (t) =>
          t.fecha === fechaNorm &&
          t.profesional_id === profId &&
          (t.turno === 'MAÑANA' || t.turno === 'TARDE') &&
          t.consultorio_id
      );

    if (delRol?.consultorio_id) return delRol.consultorio_id;

    const profSeleccionado = profesionales.find((p) => p.id === profId);
    const consAsignado = profSeleccionado?.consultorioAsignado
      ? consultorios.find(
          (c) => c.id === profSeleccionado.consultorioAsignado || c.codigo === profSeleccionado.consultorioAsignado
        )
      : undefined;
    return consAsignado?.id || undefined;
  };

  const handleCrearCita = (e: React.FormEvent) => {
    e.preventDefault();
    setNuevaCitaError(null);
    if (!selectedPacienteId) {
      setNuevaCitaError('Debe buscar y seleccionar un paciente de la lista antes de guardar la cita.');
      return;
    }

    // Actualizar condición del seguro en la ficha del paciente si fue solicitado
    if (actualizarSeguroEnFicha && selectedPacienteId) {
      updatePaciente(selectedPacienteId, { seguro: citaSeguro as any });
    }

    const consultorioResuelto = citaProfId
      ? resolverConsultorioParaCita(citaProfId, citaFecha, citaHora)
      : undefined;

    const res = addCita({
      paciente_id: selectedPacienteId,
      profesional_id: citaProfId || undefined,
      consultorio_id: consultorioResuelto,
      fecha_cita: citaFecha,
      hora_cita: citaHora,
      tipo_cita: citaTipo,
      estado: 'PENDIENTE',
      motivo_consulta: citaMotivo.trim() || undefined,
      seguro_cita: citaSeguro,
    });

    setIsModalNuevaCita(false);
    setSelectedPacienteId('');
    setPacienteSearch('');
    setCitaProfId('');
    setCitaMotivo('');
    setActualizarSeguroEnFicha(false);
    setNuevaCitaError(null);

    if (res?.cita) {
      setSelectedCitaTicket(res.cita);
      setIsRecienCreadaTicket(true);
      setIsTicketModalOpen(true);
    }
  };

  const handleConfirmarCancelacion = () => {
    if (cancelingCitaId) {
      cancelarCita(cancelingCitaId, motivoCancelacion.trim() || 'Cancelado por el usuario');
      setCancelingCitaId(null);
      setMotivoCancelacion('');
    }
  };

  const handleConfirmarAdelanto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adelantarCitaModal) return;
    adelantarCita(adelantarCitaModal.id, adelantarFecha, adelantarHora, adelantarPasarATriaje);
    setAdelantarCitaModal(null);
  };

  const handleConfirmarLiberarCupo = () => {
    if (!liberarCupoModal) return;
    liberarCupo(liberarCupoModal.id, motivoLiberacion.trim() || 'Cupo liberado para nueva atención');
    setLiberarCupoModal(null);
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
              Control diario, programación de próximas citas, adelanto de turnos y liberación de cupos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              setListaDiaFecha(filtroVista === 'dia' && filtroFecha ? filtroFecha : hoyStr);
              setListaDiaProfId(filtroProf || '');
              setListaDiaEstado('ACTIVAS');
              setIsModalListaDia(true);
            }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all"
          >
            <ClipboardList size={16} />
            <span>Lista del Día</span>
          </button>

          <button
            onClick={() => {
              setCitaFecha(filtroFecha || hoyStr);
              setNuevaCitaError(null);
              setIsModalNuevaCita(true);
            }}
            className="flex items-center gap-2 bg-[#1A2B4A] hover:bg-[#243b5e] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all"
          >
            <Plus size={16} />
            <span>Programar Nueva Cita</span>
          </button>
        </div>
      </div>

      {agendaNotice && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            agendaNotice.type === 'err'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <span>{agendaNotice.text}</span>
          <button
            type="button"
            onClick={() => setAgendaNotice(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Selector de Rango de Vista */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-850 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-750">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setFiltroVista('dia');
              setFiltroFecha(hoyStr);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroVista === 'dia'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📅 Por Fecha Seleccionada
          </button>
          <button
            onClick={() => setFiltroVista('proximas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filtroVista === 'proximas'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>⏭️ Próximas Citas y Re-citados</span>
            <span className="bg-teal-100 text-teal-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {citas.filter((c) => normalizarFecha(c.fecha_cita) >= hoyStr && c.estado !== 'CANCELADA').length}
            </span>
          </button>
          <button
            onClick={() => setFiltroVista('todas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroVista === 'todas'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📋 Todas las Citas ({citas.length})
          </button>
        </div>

        {filtroVista === 'dia' && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-slate-500 font-semibold">Fecha:</span>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer font-bold"
            />
            <button
              onClick={() => setFiltroFecha(hoyStr)}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-lg font-bold cursor-pointer"
            >
              Hoy
            </button>
          </div>
        )}
      </div>

      {/* Toolbar Filtros Estado / Profesional / Búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Campo de búsqueda rápida */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por paciente, DNI o N° ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
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

        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <select
            aria-label="Citas por página"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as 20 | 50)}
            className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
          >
            <option value={20}>20 por pág.</option>
            <option value={50}>50 por pág.</option>
          </select>
          <span>
            {totalRegistros === 0
              ? 'Mostrando 0 citas'
              : `Mostrando ${startIndex + 1}–${endIndex} de ${totalRegistros} citas`}
          </span>
        </div>
      </div>

      {/* Tabla de Citas */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 text-center">N° Ticket</th>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3">Profesional Asignado</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3">Motivo / Cupo</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {citasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No se encontraron citas registradas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                citasPaginadas.map((c) => {
                  const paciente = pacientes.find((p) => String(p.id) === String(c.paciente_id));
                  const prof = profesionales.find((p) => String(p.id) === String(c.profesional_id));

                  const badgeClass =
                    c.estado === 'PENDIENTE'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30'
                      : c.estado === 'CONFIRMADA'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30'
                      : c.estado === 'ATENDIDA'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30';

                  const ticketCode = c.numero_ticket || `TKT-${c.id.replace('cita-', '').slice(-6)}`;
                  const esFechaFutura = normalizarFecha(c.fecha_cita) > hoyStr;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedCitaTicket(c);
                            setIsRecienCreadaTicket(false);
                            setIsTicketModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg font-mono font-bold text-xs border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                          title="Click para ver e imprimir Ticket oficial"
                        >
                          <Ticket size={13} className="text-blue-600 dark:text-blue-400" />
                          <span>{ticketCode}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {paciente?.apellidos_nombres || 'Paciente no identificado'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{paciente?.tipo_documento}: {paciente?.numero_documento || paciente?.codigo_temporal}</span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            (c.seguro_cita || paciente?.seguro || '').toUpperCase().includes('SIS')
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            Seguro: {c.seguro_cita || paciente?.seguro || 'SIS'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span>{normalizarFecha(c.fecha_cita)}</span>
                          {esFechaFutura && (
                            <span className="text-[9px] bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold px-1.5 py-0.2 rounded">
                              Re-citado
                            </span>
                          )}
                        </div>
                        <div className="text-teal-600 dark:text-teal-400 font-bold">{c.hora_cita}</div>
                      </td>

                      <td className="py-3 px-3">
                        {editingProfCitaId === c.id ? (
                          <div className="flex items-center gap-1 min-w-[190px]">
                            <select
                              autoFocus
                              value={c.profesional_id || ''}
                              onChange={async (e) => {
                                const newProfId = e.target.value;
                                const nextConsId = newProfId
                                  ? resolverConsultorioParaCita(newProfId, c.fecha_cita, c.hora_cita)
                                  : undefined;
                                setEditingProfCitaId(null);
                                const res = await updateCita(c.id, {
                                  profesional_id: newProfId || undefined,
                                  consultorio_id: nextConsId,
                                });
                                if (!res.success && res.error) {
                                  setAgendaNotice({
                                    type: 'err',
                                    text: `No se pudo guardar el profesional en Supabase: ${res.error}`,
                                  });
                                } else {
                                  const nombreProf = profesionales.find((x) => x.id === newProfId)?.apellidos_nombres;
                                  setAgendaNotice({
                                    type: 'ok',
                                    text: newProfId
                                      ? `Profesional "${nombreProf || ''}" asignado y guardado en la cita.`
                                      : 'Profesional retirado de la cita.',
                                  });
                                  setTimeout(() => setAgendaNotice(null), 3500);
                                }
                              }}
                              onBlur={() => setEditingProfCitaId(null)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-teal-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium cursor-pointer focus:outline-none"
                            >
                              <option value="">-- Sin profesional --</option>
                              {profesionales
                                .filter((p) => p.estado === 'ACTIVO')
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.apellidos_nombres}
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-1.5 group">
                            <div>
                              <div
                                className={`font-medium ${
                                  prof
                                    ? 'text-slate-800 dark:text-slate-200'
                                    : 'text-amber-700 dark:text-amber-300 italic'
                                }`}
                              >
                                {prof?.apellidos_nombres || 'Sin profesional asignado'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {prof?.profesion}
                                {c.consultorio_id &&
                                  (() => {
                                    const cons = consultorios.find((x) => x.id === c.consultorio_id);
                                    return cons ? ` • ${cons.codigo}` : '';
                                  })()}
                              </div>
                            </div>
                            {c.estado !== 'CANCELADA' && (
                              <button
                                type="button"
                                onClick={() => setEditingProfCitaId(c.id)}
                                title={prof ? 'Cambiar profesional asignado' : 'Asignar profesional ahora'}
                                className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded cursor-pointer transition-colors shrink-0"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                          </div>
                        )}
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
                        <div className="flex items-center justify-center gap-1">
                          {/* Ticket */}
                          <button
                            onClick={() => {
                              setSelectedCitaTicket(c);
                              setIsRecienCreadaTicket(false);
                              setIsTicketModalOpen(true);
                            }}
                            title="Ver e Imprimir Ticket de Atención"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Ticket size={15} />
                          </button>

                          {/* Adelantar Cita */}
                          {c.estado !== 'ATENDIDA' && c.estado !== 'CANCELADA' && (
                            <button
                              onClick={() => {
                                setAdelantarCitaModal(c);
                                setAdelantarFecha(hoyStr);
                                setAdelantarHora(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
                              }}
                              title="Adelantar fecha/hora de esta cita"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg cursor-pointer transition-colors"
                            >
                              <FastForward size={15} />
                            </button>
                          )}

                          {/* Liberar Cupo */}
                          {c.estado !== 'ATENDIDA' && c.estado !== 'CANCELADA' && (
                            <button
                              onClick={() => {
                                setLiberarCupoModal(c);
                                setMotivoLiberacion('Paciente no asistió / Cupo liberado para nueva atención');
                              }}
                              title="Liberar cupo para nueva atención"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg cursor-pointer transition-colors"
                            >
                              <UserMinus size={15} />
                            </button>
                          )}

                          {/* Confirmar Asistencia */}
                          {c.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => confirmarCita(c.id)}
                              title="Confirmar asistencia (Llegó al establecimiento)"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}

                          {/* Cancelar Cita */}
                          {c.estado !== 'ATENDIDA' && c.estado !== 'CANCELADA' && (
                            <button
                              onClick={() => setCancelingCitaId(c.id)}
                              title="Cancelar cita"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <XCircle size={15} />
                            </button>
                          )}

                          {/* Ir a atención médica */}
                          <button
                            onClick={() => setCurrentTab('atencion')}
                            title="Ir al consultorio de atención clínica"
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Stethoscope size={15} />
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

        {/* Barra de Paginación */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500 dark:text-slate-400">Mostrar:</span>
              <select
                aria-label="Filas por página"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as 20 | 50)}
                className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
              </select>
            </div>
            <span className="text-slate-500 dark:text-slate-400">
              {totalRegistros === 0
                ? 'Mostrando 0 de 0 citas'
                : `Mostrando ${startIndex + 1}–${endIndex} de ${totalRegistros} citas`}
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
                    …
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
      </div>

      {/* Modal Adelantar Cita */}
      {adelantarCitaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                <FastForward size={18} />
                <span>Adelantar Cita Programada</span>
              </div>
              <button
                onClick={() => setAdelantarCitaModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl text-xs space-y-1">
              <p className="font-bold text-indigo-900 dark:text-indigo-200">
                {pacientes.find((p) => p.id === adelantarCitaModal.paciente_id)?.apellidos_nombres}
              </p>
              <p className="text-indigo-700 dark:text-indigo-300 text-[11px]">
                Cita actual: {normalizarFecha(adelantarCitaModal.fecha_cita)} a las {adelantarCitaModal.hora_cita}
              </p>
            </div>

            <form onSubmit={handleConfirmarAdelanto} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nueva Fecha de Atención *
                </label>
                <input
                  type="date"
                  required
                  value={adelantarFecha}
                  onChange={(e) => setAdelantarFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nueva Hora de Atención *
                </label>
                <input
                  type="time"
                  required
                  value={adelantarHora}
                  onChange={(e) => setAdelantarHora(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>

              <label className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={adelantarPasarATriaje}
                  onChange={(e) => setAdelantarPasarATriaje(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span className="text-[11px] font-semibold text-teal-900 dark:text-teal-200">
                  Confirmar llegada y pasar a Triaje inmediatamente (atención hoy)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAdelantarCitaModal(null)}
                  className="px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Confirmar Adelanto de Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Liberar Cupo */}
      {liberarCupoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <UserMinus size={18} />
                <span>Liberar Cupo de Atención</span>
              </div>
              <button
                onClick={() => setLiberarCupoModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl text-xs space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Paciente: {pacientes.find((p) => p.id === liberarCupoModal.paciente_id)?.apellidos_nombres}
              </p>
              <p className="text-amber-800 dark:text-amber-300 text-[11px]">
                Slot reservado: {normalizarFecha(liberarCupoModal.fecha_cita)} - {liberarCupoModal.hora_cita}
              </p>
            </div>

            <p className="text-xs text-slate-500">
              Al liberar el cupo, la cita quedará cancelada con el motivo indicado y el horario quedará habilitado para programar a un nuevo paciente.
            </p>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Motivo de Liberación del Cupo:
              </label>
              <select
                value={motivoLiberacion}
                onChange={(e) => setMotivoLiberacion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                <option value="Paciente no se presentó / Cupo liberado para nueva atención">
                  Paciente no se presentó / Inasistencia
                </option>
                <option value="Paciente se retiró del establecimiento sin continuar la atención">
                  Paciente se retiró del establecimiento sin continuar atención
                </option>
                <option value="Paciente adelantó o reprogramó su cita">
                  Paciente adelantó o reprogramó su cita
                </option>
                <option value="Cupo liberado por admisión para caso prioritario">
                  Cupo liberado por admisión para caso prioritario
                </option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setLiberarCupoModal(null)}
                className="px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarLiberarCupo}
                className="px-4 py-2 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md cursor-pointer text-xs"
              >
                Liberar Cupo Ahora
              </button>
            </div>
          </div>
        </div>
      )}

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
              {nuevaCitaError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="text-rose-600 shrink-0" />
                  <span>{nuevaCitaError}</span>
                </div>
              )}

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
                            const seg = (p.seguro?.toUpperCase() as any) || 'SIS';
                            setCitaSeguro(seg.includes('SIS') ? 'SIS' : seg.includes('ESSALUD') ? 'ESSALUD' : seg.includes('PARTICULAR') ? 'PARTICULAR' : 'OTRO');
                          }}
                          className={`p-2 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer ${
                            selectedPacienteId === p.id ? 'bg-teal-100 font-bold text-teal-900' : ''
                          }`}
                        >
                          {p.apellidos_nombres} ({p.tipo_documento}: {p.numero_documento || p.codigo_temporal}) • Seguro: {p.seguro || 'SIS'}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Confirmación y Validación de Cobertura de Seguro */}
              {selectedPacienteId && (
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-600" />
                      Condición del Seguro para esta Cita:
                    </span>
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      citaSeguro === 'SIS'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {citaSeguro}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <select
                        value={citaSeguro}
                        onChange={(e) => setCitaSeguro(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer"
                      >
                        <option value="SIS">SIS (Seguro Integral de Salud)</option>
                        <option value="ESSALUD">EsSalud</option>
                        <option value="PARTICULAR">Particular / Sin Seguro</option>
                        <option value="OTRO">Otro Seguro</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={actualizarSeguroEnFicha}
                        onChange={(e) => setActualizarSeguroEnFicha(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Actualizar seguro en Ficha del Paciente</span>
                    </label>
                  </div>

                  {currentUser?.rol === 'desarrollador' &&
                    (citaSeguro === 'SIS' ? (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        ✓ Paciente con SIS activo: Habilitado para emisión de Formato Único de Atención (FUA).
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                        ⚠️ Atención: Con seguro {citaSeguro} no se generará FUA (normativa MINSA exclusiva para afiliados SIS).
                      </p>
                    ))}
                </div>
              )}

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
                  {profesionales
                    .filter((p) => p.estado === 'ACTIVO')
                    .map((p) => {
                      const rolDelDia = turnosProgramados.filter(
                        (t) =>
                          t.fecha === normalizarFecha(citaFecha) &&
                          t.profesional_id === p.id &&
                          (t.turno === 'MAÑANA' || t.turno === 'TARDE')
                      );
                      const consId = rolDelDia[0]?.consultorio_id || p.consultorioAsignado;
                      const cons = consId
                        ? consultorios.find((c) => c.id === consId || c.codigo === consId)
                        : undefined;
                      const etiquetaTurno =
                        rolDelDia.length === 2
                          ? ' • Rol: MT'
                          : rolDelDia[0]?.turno === 'MAÑANA'
                            ? ' • Rol: M'
                            : rolDelDia[0]?.turno === 'TARDE'
                              ? ' • Rol: T'
                              : '';
                      return (
                        <option key={p.id} value={p.id}>
                          {p.apellidos_nombres} ({p.profesion}
                          {cons ? ` • ${cons.codigo}` : ''}
                          {etiquetaTurno})
                        </option>
                      );
                    })}
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

      {/* Ventana Emergente: Lista de Pacientes del Día */}
      {isModalListaDia && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] my-4">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#1A2B4A] to-teal-700 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/15">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Lista de Pacientes del Día</h3>
                  <p className="text-xs text-white/80">
                    Consulta rápida por fecha y profesional • Exportable a Excel por profesional o lista completa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDescargarListaDiaExcel}
                  disabled={citasListaDiaFiltradas.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Download size={14} />
                  <span>
                    {listaDiaProfId ? 'Descargar Lista del Profesional (.xlsx)' : 'Descargar Lista (.xlsx)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalListaDia(false)}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filtros de la Ventana Emergente */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Fecha:</span>
                  <input
                    type="date"
                    value={listaDiaFecha}
                    onChange={(e) => setListaDiaFecha(e.target.value)}
                    className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setListaDiaFecha(hoyStr)}
                    className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg font-bold cursor-pointer"
                  >
                    Hoy
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <UserCheck size={14} className="text-teal-600 shrink-0" />
                  <select
                    aria-label="Filtrar lista del día por profesional"
                    value={listaDiaProfId}
                    onChange={(e) => setListaDiaProfId(e.target.value)}
                    className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 min-w-[230px] focus:outline-none cursor-pointer"
                  >
                    <option value="">
                      Todos los Profesionales ({citasBaseListaDia.length})
                    </option>
                    {profesionales.map((p) => {
                      const count = conteoPorProfListaDia.get(String(p.id)) || 0;
                      if (count === 0 && p.estado !== 'ACTIVO') return null;
                      return (
                        <option key={p.id} value={String(p.id)}>
                          {p.apellidos_nombres} ({count})
                        </option>
                      );
                    })}
                    {(conteoPorProfListaDia.get('__SIN_PROF__') || 0) > 0 && (
                      <option value="__SIN_PROF__">
                        Sin profesional asignado ({conteoPorProfListaDia.get('__SIN_PROF__')})
                      </option>
                    )}
                  </select>
                </div>

                <select
                  aria-label="Filtrar estado en lista del día"
                  value={listaDiaEstado}
                  onChange={(e) => setListaDiaEstado(e.target.value)}
                  className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="ACTIVAS">Activas (sin canceladas)</option>
                  <option value="TODAS">Todos los estados</option>
                  <option value="PENDIENTE">Solo Pendientes</option>
                  <option value="CONFIRMADA">Solo Confirmadas</option>
                  <option value="ATENDIDA">Solo Atendidas</option>
                </select>
              </div>

              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Total en lista:{' '}
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold">
                  {citasListaDiaFiltradas.length} paciente(s)
                </span>
              </div>
            </div>

            {/* Cuerpo / Tabla de Lista del Día */}
            <div className="overflow-y-auto flex-1">
              {citasListaDiaFiltradas.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                  <ClipboardList size={32} className="mx-auto text-slate-300" />
                  <p>No hay pacientes citados para {listaDiaFecha} con los filtros seleccionados.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3">Hora</th>
                      <th className="py-2.5 px-3">N° Ticket</th>
                      <th className="py-2.5 px-3">Paciente</th>
                      <th className="py-2.5 px-3">Seguro</th>
                      <th className="py-2.5 px-3">Profesional / Consultorio</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {citasListaDiaFiltradas.map((c, idx) => {
                      const pac = pacientes.find((p) => String(p.id) === String(c.paciente_id));
                      const prof = profesionales.find((p) => String(p.id) === String(c.profesional_id));
                      const cons = consultorios.find((x) => x.id === c.consultorio_id);
                      const badgeEstado =
                        c.estado === 'PENDIENTE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : c.estado === 'CONFIRMADA'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : c.estado === 'ATENDIDA'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
                      const ticketCode = c.numero_ticket || `TKT-${c.id.replace('cita-', '').slice(-6)}`;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/40">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                            {c.hora_cita}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                            {ticketCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {pac?.apellidos_nombres || 'Paciente no identificado'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {pac?.tipo_documento || 'DNI'}: {pac?.numero_documento || pac?.codigo_temporal || '-'}
                              {pac?.hcl ? ` • HCL: ${pac.hcl}` : ''}
                              {pac?.celular ? ` • Cel: ${pac.celular}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (c.seguro_cita || pac?.seguro || '').toUpperCase().includes('SIS')
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {c.seguro_cita || pac?.seguro || 'SIS'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {prof?.apellidos_nombres || 'Sin profesional asignado'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {prof?.profesion || ''}
                              {cons ? ` • ${cons.codigo}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeEstado}`}>
                              {c.estado}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">
                            {c.motivo_consulta || c.observaciones || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-slate-500">
                {listaDiaProfId
                  ? 'El Excel descargará la lista filtrada del profesional seleccionado.'
                  : 'Con "Todos los Profesionales", el Excel incluye la lista general y una hoja separada por cada profesional.'}
              </span>
              <button
                type="button"
                onClick={() => setIsModalListaDia(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ticket de Atención */}
      {isTicketModalOpen && selectedCitaTicket && (
        <TicketAtencionModal
          cita={citas.find((item) => item.id === selectedCitaTicket.id) || selectedCitaTicket}
          onClose={() => {
            setIsTicketModalOpen(false);
            setSelectedCitaTicket(null);
            setIsRecienCreadaTicket(false);
          }}
          isRecienCreada={isRecienCreadaTicket}
        />
      )}
    </div>
  );
};
