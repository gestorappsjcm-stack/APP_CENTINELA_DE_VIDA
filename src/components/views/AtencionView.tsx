import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CIE10Item,
  MedicamentoReceta,
  TipoDiagnostico,
  AtencionClinica,
  FUA,
} from '../../types';
import { CIE10_COMUNES, MEDICAMENTOS_SALUD_MENTAL } from '../../data/mockData';
import { FuaPreviewModal } from '../fua/FuaPreviewModal';
import { parseMedicamentosList } from '../../lib/medicamentosHelper';
import {
  Stethoscope,
  Bell,
  CheckCircle,
  FileText,
  User,
  Activity,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  X,
  Search,
  Eye,
  FileSpreadsheet,
  Users,
  ShieldAlert,
  ShieldCheck,
  HeartPulse,
  Pill,
  ExternalLink,
} from 'lucide-react';

export const AtencionView: React.FC = () => {
  const {
    consultorios,
    citas,
    pacientes,
    triajes,
    profesionales,
    atenciones,
    fuas,
    fuaConfig,
    llamarTurno,
    addAtencion,
    addFUA,
    setCurrentTab,
  } = useApp();

  // Selector de Pestaña Activa dentro de Atenciones: 'consultorio' (Sala y Consulta) | 'atendidos' (Historial de Atendidos y FUA)
  const [subTab, setSubTab] = useState<'consultorio' | 'atendidos'>('atendidos');

  // Estados del Consultorio
  const [selectedConsultorioId, setSelectedConsultorioId] = useState(consultorios[0]?.id || 'cons-1');
  const [atendiendoCitaId, setAtendiendoCitaId] = useState<string | null>(null);

  // Modal de FUA y Modal de Detalle Clínico
  const [selectedFuaForPreview, setSelectedFuaForPreview] = useState<FUA | null>(null);
  const [selectedAtencionDetail, setSelectedAtencionDetail] = useState<AtencionClinica | null>(null);
  const [atencionRecienGuardada, setAtencionRecienGuardada] = useState<AtencionClinica | null>(null);
  const [fuaSuccessToast, setFuaSuccessToast] = useState<{ numeroFua: string; paciente: string } | null>(null);

  // Estados de Filtro para Pacientes Atendidos
  const [searchTermAtendidos, setSearchTermAtendidos] = useState('');
  const [filtroEstadoFua, setFiltroEstadoFua] = useState<'TODOS' | 'CON_FUA' | 'SIN_FUA'>('TODOS');
  const [filtroConsultorio, setFiltroConsultorio] = useState<string>('TODOS');

  // Formulario Clínico de Consulta
  const [anamnesis, setAnamnesis] = useState('');
  const [examenMental, setExamenMental] = useState({
    apariencia: 'Consciente, orientado en tiempo y espacio, aseo adecuado.',
    afecto: 'Eutímico / Ansioso reactivo',
    pensamiento: 'Lógico, coherente, sin ideas delirantes ni ideación suicida activa.',
    sensopercepcion: 'Sin alucinaciones activas.',
  });

  // Diagnósticos
  const [diagnosticos, setDiagnosticos] = useState<
    Array<{ codigo: string; descripcion: string; tipo: TipoDiagnostico }>
  >([
    {
      codigo: 'F41.1',
      descripcion: 'Trastorno de ansiedad generalizada',
      tipo: 'DEFINITIVO',
    },
  ]);
  const [cieSearch, setCieSearch] = useState('');

  // Procedimientos CPMS
  const [procedimientoCPMS, setProcedimientoCPMS] = useState('99203');

  // Receta Médica
  const [recetas, setRecetas] = useState<MedicamentoReceta[]>([]);
  const [nuevoMedNombre, setNuevoMedNombre] = useState(MEDICAMENTOS_SALUD_MENTAL[0]?.nombre || 'SERTRALINA');
  const [nuevaDosis, setNuevaDosis] = useState('1 tableta');
  const [nuevaFrecuencia, setNuevaFrecuencia] = useState('Cada 24 horas (mañanas)');
  const [nuevaDuracion, setNuevaDuracion] = useState('30 días');
  const [nuevaCantidad, setNuevaCantidad] = useState(30);

  // Próxima Cita
  const [proximaCita, setProximaCita] = useState('');
  const [destinoFinal, setDestinoFinal] = useState('CITA_CONTROL');

  // Pacientes en cola del consultorio seleccionado
  const consultorioActual = consultorios.find((c) => c.id === selectedConsultorioId);
  const colaConsultorio = citas.filter((c) => {
    const tr = triajes.find((t) => t.cita_id === c.id);
    return (
      (c.consultorio_id === selectedConsultorioId || tr?.consultorio_id === selectedConsultorioId) &&
      c.estado !== 'ATENDIDA' &&
      c.estado !== 'CANCELADA'
    );
  });

  // =========================================================================
  // HELPER: OBTENER FUA VINCULADO A UNA ATENCIÓN
  // =========================================================================
  const getFuaForAtencion = (atn: AtencionClinica): FUA | undefined => {
    if (atn.fua_id) {
      const f = fuas.find((item) => String(item.id) === String(atn.fua_id));
      if (f) return f;
    }
    return fuas.find(
      (item) =>
        (item.atencion_id && String(item.atencion_id) === String(atn.id)) ||
        (String(item.paciente_id) === String(atn.paciente_id) && item.fecha === atn.fecha_atencion)
    );
  };

  // =========================================================================
  // HELPER: GENERAR FUA OFICIAL PARA UNA ATENCIÓN
  // =========================================================================
  const handleGenerarFuaParaAtencion = (atn: AtencionClinica) => {
    const pac = pacientes.find((p) => String(p.id) === String(atn.paciente_id));
    if (!pac) {
      alert('No se encontró el paciente asociado a esta atención.');
      return;
    }

    const prof =
      profesionales.find((p) => String(p.id) === String(atn.profesional_id)) ||
      profesionales[0];
    const triaje =
      triajes.find((t) => String(t.id) === String(atn.triaje_id)) ||
      triajes.find((t) => String(t.paciente_id) === String(pac.id));

    const diagnosticosFua: FUA['diagnosticos'] = [];
    if (atn.diagnostico_1) {
      diagnosticosFua.push({
        codigo: atn.cie10_1 || 'F32.9',
        descripcion: atn.diagnostico_1,
        tipo: 'D',
        tipo_ingreso: 'D',
        cie_ingreso: atn.cie10_1 || 'F32.9',
        tipo_egreso: 'D',
        cie_egreso: atn.cie10_1 || 'F32.9',
      });
    }
    if (atn.diagnostico_2) {
      diagnosticosFua.push({
        codigo: atn.cie10_2 || 'F41.1',
        descripcion: atn.diagnostico_2,
        tipo: 'D',
        tipo_ingreso: 'D',
        cie_ingreso: atn.cie10_2 || 'F41.1',
        tipo_egreso: 'D',
        cie_egreso: atn.cie10_2 || 'F41.1',
      });
    }
    if (diagnosticosFua.length === 0) {
      diagnosticosFua.push({
        codigo: 'F32.1',
        descripcion: 'EPISODIO DEPRESIVO MODERADO',
        tipo: 'D',
        tipo_ingreso: 'D',
        cie_ingreso: 'F32.1',
        tipo_egreso: 'D',
        cie_egreso: 'F32.1',
      });
    }

    const medicamentosFua: FUA['medicamentos'] = [];
    const medsList = parseMedicamentosList(atn.medicamentos);
    if (medsList.length > 0) {
      medsList.forEach((m, idx) => {
        medicamentosFua.push({
          codigo_sismed: `0289${idx + 1}`,
          descripcion: m.medicamento || m.nombre || 'MEDICAMENTO',
          cantidad: m.cantidad || 1,
          indicacion: `${m.dosis || ''} cada ${m.frecuencia || ''} por ${m.duracion || ''}`.trim() || 'Según indicación médica',
          forma_farmaceutica: m.presentacion || 'TAB',
          concentracion: m.concentracion || '10mg',
          cantidad_prescrita: m.cantidad || 1,
          cantidad_entregada: m.cantidad || 1,
          diagnostico_relacionado: '1',
        });
      });
    } else {
      medicamentosFua.push({
        codigo_sismed: '02891',
        descripcion: 'SERTRALINA 50 MG TABLETA',
        cantidad: 30,
        indicacion: '1 tableta vía oral cada 24 horas por las mañanas',
        forma_farmaceutica: 'TAB',
        concentracion: '50mg',
        cantidad_prescrita: 30,
        cantidad_entregada: 30,
        diagnostico_relacionado: '1',
      });
    }

    const pesoVal = atn.peso
      ? parseFloat(atn.peso)
      : triaje?.peso
      ? Number(triaje.peso)
      : 65;
    const tallaVal = atn.talla
      ? parseFloat(atn.talla)
      : triaje?.talla
      ? Number(triaje.talla)
      : 165;

    const fuaData: Omit<FUA, 'id' | 'numero_fua' | 'fecha' | 'hora' | 'estado'> = {
      paciente_id: pac.id,
      codigo_renaes: fuaConfig?.codigo_renipress || '00003414',
      renaiess: fuaConfig?.codigo_renipress || '00003414',
      anio_fua: fuaConfig?.anio || 2026,
      diresa: 'DIRESA ICA / RED CHINCHA',
      establecimiento: fuaConfig?.nombre_ipress || 'HOSPITAL SAN JOSÉ DE CHINCHA',
      componente_sis: 'SUBSIDIADO',
      codigo_afiliacion_sis: `150-1-${pac.numero_documento || pac.codigo_temporal || '00000000'}`,
      tipo_atencion: 'AMBULATORIA',
      codigo_prestacional: '056',
      profesional_id: prof ? String(prof.id) : (atn.profesional_id ? String(atn.profesional_id) : 'prof-1'),
      triaje_id: atn.triaje_id || triaje?.id,
      atencion_id: String(atn.id),
      presion_arterial: atn.presion_arterial || triaje?.presion_arterial || '120/80',
      frecuencia_cardiaca: atn.frecuencia_cardiaca ? parseInt(atn.frecuencia_cardiaca) : 72,
      frecuencia_respiratoria: atn.frecuencia_respiratoria ? parseInt(atn.frecuencia_respiratoria) : 18,
      peso_kg: pesoVal,
      talla_cm: tallaVal,
      imc: tallaVal > 0 ? Number((pesoVal / Math.pow(tallaVal / 100, 2)).toFixed(1)) : 23.8,
      diagnosticos: diagnosticosFua,
      medicamentos: medicamentosFua,
      procedimientos: [
        {
          cpms: '90834',
          descripcion: 'PSICOTERAPIA INDIVIDUAL DE 45 A 50 MINUTOS',
          ind: '1',
          eje: '1',
          dx: '1',
          res: 'COMPLETO',
        },
      ],
      observaciones: `Atención clínica ambulatoria vinculada a Historia Clínica ${pac.hcl || 'S/N'}. Control programado.`,
      personal_atiende: 'IPRESS',
      lugar_atencion: 'INTRAMURAL',
      atencion_directa: true,
      destino: 'CITA',
    };

    const res = addFUA(fuaData);
    if (res.success && res.fuaId) {
      const nuevoFua: FUA = {
        ...fuaData,
        id: res.fuaId,
        numero_fua: res.numeroFua || '00003414-2026-00000001',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        estado: 'REGISTRADO',
      };
      setFuaSuccessToast({
        numeroFua: res.numeroFua || '',
        paciente: pac.apellidos_nombres,
      });
      setSelectedFuaForPreview(nuevoFua);
    }
  };

  // Generar todos los FUAs pendientes en lote
  const handleGenerarTodosFuasPendientes = () => {
    const pendientes = atenciones.filter((a) => !getFuaForAtencion(a));
    if (pendientes.length === 0) {
      alert('Todas las atenciones ya cuentan con FUA generado.');
      return;
    }

    let generados = 0;
    for (const atn of pendientes) {
      const pac = pacientes.find((p) => String(p.id) === String(atn.paciente_id));
      if (!pac) continue;

      const prof =
        profesionales.find((p) => String(p.id) === String(atn.profesional_id)) ||
        profesionales[0];
      const triaje =
        triajes.find((t) => String(t.id) === String(atn.triaje_id)) ||
        triajes.find((t) => String(t.paciente_id) === String(pac.id));

      const diagnosticosFua: FUA['diagnosticos'] = [];
      if (atn.diagnostico_1) {
        diagnosticosFua.push({
          codigo: atn.cie10_1 || 'F32.9',
          descripcion: atn.diagnostico_1,
          tipo: 'D',
          tipo_ingreso: 'D',
          cie_ingreso: atn.cie10_1 || 'F32.9',
          tipo_egreso: 'D',
          cie_egreso: atn.cie10_1 || 'F32.9',
        });
      }
      if (diagnosticosFua.length === 0) {
        diagnosticosFua.push({
          codigo: 'F32.1',
          descripcion: 'EPISODIO DEPRESIVO MODERADO',
          tipo: 'D',
          tipo_ingreso: 'D',
          cie_ingreso: 'F32.1',
          tipo_egreso: 'D',
          cie_egreso: 'F32.1',
        });
      }

      const pesoVal = atn.peso ? parseFloat(atn.peso) : triaje?.peso ? Number(triaje.peso) : 65;
      const tallaVal = atn.talla ? parseFloat(atn.talla) : triaje?.talla ? Number(triaje.talla) : 165;

      const fuaData: Omit<FUA, 'id' | 'numero_fua' | 'fecha' | 'hora' | 'estado'> = {
        paciente_id: pac.id,
        codigo_renaes: fuaConfig?.codigo_renipress || '00003414',
        renaiess: fuaConfig?.codigo_renipress || '00003414',
        anio_fua: fuaConfig?.anio || 2026,
        diresa: 'DIRESA ICA / RED CHINCHA',
        establecimiento: fuaConfig?.nombre_ipress || 'HOSPITAL SAN JOSÉ DE CHINCHA',
        componente_sis: 'SUBSIDIADO',
        codigo_afiliacion_sis: `150-1-${pac.numero_documento || pac.codigo_temporal || '00000000'}`,
        tipo_atencion: 'AMBULATORIA',
        codigo_prestacional: '056',
        profesional_id: prof ? String(prof.id) : (atn.profesional_id ? String(atn.profesional_id) : 'prof-1'),
        triaje_id: atn.triaje_id || triaje?.id,
        atencion_id: String(atn.id),
        presion_arterial: atn.presion_arterial || triaje?.presion_arterial || '120/80',
        frecuencia_cardiaca: atn.frecuencia_cardiaca ? parseInt(atn.frecuencia_cardiaca) : 72,
        frecuencia_respiratoria: atn.frecuencia_respiratoria ? parseInt(atn.frecuencia_respiratoria) : 18,
        peso_kg: pesoVal,
        talla_cm: tallaVal,
        imc: tallaVal > 0 ? Number((pesoVal / Math.pow(tallaVal / 100, 2)).toFixed(1)) : 23.8,
        diagnosticos: diagnosticosFua,
        medicamentos: [],
        procedimientos: [
          {
            cpms: '90834',
            descripcion: 'PSICOTERAPIA INDIVIDUAL DE 45 A 50 MINUTOS',
            ind: '1',
            eje: '1',
            dx: '1',
            res: 'COMPLETO',
          },
        ],
        observaciones: `Atención clínica ambulatoria vinculada a Historia Clínica ${pac.hcl || 'S/N'}. Control programado.`,
        personal_atiende: 'IPRESS',
        lugar_atencion: 'INTRAMURAL',
        atencion_directa: true,
        destino: 'CITA',
      };

      addFUA(fuaData);
      generados++;
    }

    setFuaSuccessToast({
      numeroFua: `Lote de ${generados} FUAs`,
      paciente: 'Todos los pacientes atendidos pendientes',
    });
  };

  // =========================================================================
  // FILTRADO Y ESTADÍSTICAS DE PACIENTES ATENDIDOS
  // =========================================================================
  const atencionesFiltradas = useMemo(() => {
    return atenciones.filter((atn) => {
      const pac = pacientes.find((p) => String(p.id) === String(atn.paciente_id));
      const fua = getFuaForAtencion(atn);

      // Filtro de Texto
      const q = searchTermAtendidos.trim().toLowerCase();
      if (q) {
        const nom = (pac?.apellidos_nombres || '').toLowerCase();
        const doc = (pac?.numero_documento || pac?.codigo_temporal || '').toLowerCase();
        const hcl = (pac?.hcl || '').toLowerCase();
        const dx1 = (atn.diagnostico_1 || '').toLowerCase();
        const cie1 = (atn.cie10_1 || '').toLowerCase();
        const numFua = (fua?.numero_fua || '').toLowerCase();

        const coincide =
          nom.includes(q) ||
          doc.includes(q) ||
          hcl.includes(q) ||
          dx1.includes(q) ||
          cie1.includes(q) ||
          numFua.includes(q);

        if (!coincide) return false;
      }

      // Filtro Estado FUA
      if (filtroEstadoFua === 'CON_FUA' && !fua) return false;
      if (filtroEstadoFua === 'SIN_FUA' && fua) return false;

      // Filtro Consultorio
      if (filtroConsultorio !== 'TODOS' && atn.consultorio_id !== filtroConsultorio) {
        return false;
      }

      return true;
    });
  }, [atenciones, pacientes, fuas, searchTermAtendidos, filtroEstadoFua, filtroConsultorio]);

  const kpisAtendidos = useMemo(() => {
    const total = atenciones.length;
    const conFua = atenciones.filter((a) => Boolean(getFuaForAtencion(a))).length;
    const sinFua = total - conFua;
    const pacientesUnicos = new Set(atenciones.map((a) => a.paciente_id)).size;

    return { total, conFua, sinFua, pacientesUnicos };
  }, [atenciones, fuas]);

  // Manejo de Cola y Consultas
  const handleLlamar = (citaId: string) => {
    llamarTurno(citaId, selectedConsultorioId);
  };

  const handleIniciarAtencion = (citaId: string) => {
    setAtendiendoCitaId(citaId);
    setAnamnesis('');
    setDiagnosticos([
      {
        codigo: 'F41.1',
        descripcion: 'Trastorno de ansiedad generalizada',
        tipo: 'DEFINITIVO',
      },
    ]);
    setRecetas([]);
  };

  const handleAddReceta = () => {
    const medSel = MEDICAMENTOS_SALUD_MENTAL.find((m) => m.nombre === nuevoMedNombre);
    const nuevo: MedicamentoReceta = {
      id: 'rec-' + Date.now(),
      medicamento: nuevoMedNombre,
      presentacion: medSel?.presentacion || 'Tableta',
      concentracion: medSel?.concentracion || '50mg',
      dosis: nuevaDosis,
      frecuencia: nuevaFrecuencia,
      duracion: nuevaDuracion,
      cantidad: nuevaCantidad,
      indicaciones: `${nuevaDosis} ${nuevaFrecuencia} durante ${nuevaDuracion}.`,
    };
    setRecetas([...recetas, nuevo]);
  };

  const handleRemoveReceta = (id: string) => {
    setRecetas(recetas.filter((r) => r.id !== id));
  };

  const handleAddCie10 = (item: CIE10Item) => {
    if (diagnosticos.some((d) => d.codigo === item.codigo)) return;
    setDiagnosticos([
      ...diagnosticos,
      { codigo: item.codigo, descripcion: item.descripcion, tipo: 'DEFINITIVO' },
    ]);
    setCieSearch('');
  };

  const handleFinalizarAtencion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!atendiendoCitaId) return;

    const cita = citas.find((c) => c.id === atendiendoCitaId);
    if (!cita) return;

    const prof =
      profesionales.find((p) => p.id === cita.profesional_id) || profesionales[0];
    const triajeCita = triajes.find((t) => t.cita_id === cita.id);

    const nuevaAtencionData = {
      cita_id: cita.id,
      paciente_id: cita.paciente_id,
      profesional_id: prof.id,
      consultorio_id: selectedConsultorioId,
      presion_arterial: triajeCita?.presion_arterial || '120/80',
      peso: triajeCita?.peso?.toString() || '65',
      talla: triajeCita?.talla?.toString() || '165',
      imc: triajeCita?.imc?.toString() || '23.8',
      temperatura: triajeCita?.temperatura?.toString() || '36.5',
      saturacion_o2: triajeCita?.spo2?.toString() || '98',
      frecuencia_cardiaca: triajeCita?.frecuencia_cardiaca?.toString() || '72',
      frecuencia_respiratoria: triajeCita?.frecuencia_respiratoria?.toString() || '18',
      motivo_consulta: anamnesis || 'Paciente asiste a evaluación especializada de salud mental.',
      examen_mental: `${examenMental.apariencia} Afecto: ${examenMental.afecto}. Pensamiento: ${examenMental.pensamiento}. Sensopercepción: ${examenMental.sensopercepcion}`,
      diagnostico_1: diagnosticos[0]?.descripcion || 'Trastorno de ansiedad generalizada',
      cie10_1: diagnosticos[0]?.codigo || 'F41.1',
      diagnostico_2: diagnosticos[1]?.descripcion || undefined,
      cie10_2: diagnosticos[1]?.codigo || undefined,
      procedimientos:
        procedimientoCPMS === '99203'
          ? '99203 - Consulta Médica Especializada'
          : '90834 - Psicoterapia Individual',
      recetas: recetas,
      proxima_cita_fecha: proximaCita || undefined,
      destino_final: destinoFinal as any,
    };

    addAtencion(nuevaAtencionData);

    const atencionGuardadaMock: AtencionClinica = {
      ...nuevaAtencionData,
      id: `atn-${Date.now()}`,
      fecha_atencion: new Date().toISOString().split('T')[0],
      hora_atencion: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      estado: 'COMPLETADA',
      finaliza_proceso: false,
    };

    setAtencionRecienGuardada(atencionGuardadaMock);
    setAtendiendoCitaId(null);
  };

  const citaAtendiendo = citas.find((c) => c.id === atendiendoCitaId);
  const pacienteAtendiendo = pacientes.find((p) => p.id === citaAtendiendo?.paciente_id);
  const triajeAtendiendo = triajes.find((t) => t.cita_id === atendiendoCitaId);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* ========================================================================= */}
      {/* ENCABEZADO PRINCIPAL DEL MÓDULO */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 rounded-xl">
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Consultorios y Atenciones Clínicas</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Gestión de consulta, registro de pacientes atendidos y emisión oficial del FUA (SIS)
            </p>
          </div>
        </div>

        {/* Acceso Rápido al Módulo Central FUA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('fua')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Ir a la Gestión General del FUA (SIS)"
          >
            <FileSpreadsheet size={15} />
            <span>Gestión FUA Central</span>
            <ExternalLink size={12} className="opacity-70" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SELECTOR DE VISTA / PESTAÑAS INTERNAS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab('atendidos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'atendidos'
                ? 'bg-white dark:bg-slate-900 text-[#1A2B4A] dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users size={16} />
            <span>📋 Pacientes Atendidos y Registro FUA</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                subTab === 'atendidos'
                  ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {atenciones.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('consultorio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'consultorio'
                ? 'bg-white dark:bg-slate-900 text-[#1A2B4A] dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Stethoscope size={16} />
            <span>🩺 Sala de Espera y Atender Consulta</span>
            {colaConsultorio.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                {colaConsultorio.length} en espera
              </span>
            )}
          </button>
        </div>

        {/* Indicador de Consultorio */}
        <div className="flex items-center gap-2 px-3 py-1 text-xs">
          <span className="text-slate-500 font-semibold">Consultorio Activo:</span>
          <select
            value={selectedConsultorioId}
            onChange={(e) => setSelectedConsultorioId(e.target.value)}
            className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none"
          >
            {consultorios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo}: {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: LISTADO DE PACIENTES ATENDIDOS Y ACCIONES FUA */}
      {/* ========================================================================= */}
      {subTab === 'atendidos' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* TARJETAS RESUMEN KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Atenciones
                </span>
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                  <Activity size={17} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                {kpisAtendidos.total}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Consultas registradas</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Con FUA Generado
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={17} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {kpisAtendidos.conFua}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {kpisAtendidos.total > 0
                  ? Math.round((kpisAtendidos.conFua / kpisAtendidos.total) * 100)
                  : 0}
                % con formato oficial
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pendientes de FUA
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <AlertCircle size={17} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-amber-600 dark:text-amber-400">
                {kpisAtendidos.sinFua}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Requieren emisión de FUA</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pacientes Únicos
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <User size={17} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                {kpisAtendidos.pacientesUnicos}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Personas beneficiadas</div>
            </div>
          </div>

          {/* NOTIFICACIÓN ÉXITO FUA */}
          {fuaSuccessToast && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <strong className="font-bold">¡FUA Generado con Éxito!</strong>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Se registró <strong>{fuaSuccessToast.numeroFua}</strong> para {fuaSuccessToast.paciente}. Puede visualizarlo e imprimirlo inmediatamente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFuaSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* BANNER ORIENTATIVO */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 rounded-lg shrink-0 mt-0.5">
                <FileText size={16} />
              </div>
              <div>
                <strong className="text-blue-950 dark:text-blue-200 block">
                  Panel de Atenciones y Visualización Directa del FUA
                </strong>
                <p className="text-blue-800/80 dark:text-blue-300">
                  En esta tabla puede ver a todos los pacientes atendidos en el CSMC. Si el paciente ya tiene su FUA emitido, presione <strong>"👁️ Ver FUA"</strong> para visualizar e imprimir el anverso y reverso oficial. Si aún no lo tiene, presione <strong>"📄 Generar FUA"</strong> para crearlo en 1 clic.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {kpisAtendidos.sinFua > 0 && (
                <button
                  onClick={handleGenerarTodosFuasPendientes}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                  title="Generar FUA para todas las atenciones que no tengan uno emitido"
                >
                  <FileText size={14} />
                  <span>⚡ Generar FUAs Pendientes ({kpisAtendidos.sinFua})</span>
                </button>
              )}
              <button
                onClick={() => setCurrentTab('fua')}
                className="px-3.5 py-2 bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all"
              >
                Configurar Lote / Rango FUA
              </button>
            </div>
          </div>

          {/* CONTROLES Y BUSCADOR */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchTermAtendidos}
                  onChange={(e) => setSearchTermAtendidos(e.target.value)}
                  placeholder="Buscar por Paciente, DNI, HCL o CIE-10..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-bold">Estado FUA:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
                  <button
                    onClick={() => setFiltroEstadoFua('TODOS')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filtroEstadoFua === 'TODOS'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Todos ({atenciones.length})
                  </button>
                  <button
                    onClick={() => setFiltroEstadoFua('CON_FUA')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filtroEstadoFua === 'CON_FUA'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    Con FUA ({kpisAtendidos.conFua})
                  </button>
                  <button
                    onClick={() => setFiltroEstadoFua('SIN_FUA')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filtroEstadoFua === 'SIN_FUA'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    Pendientes ({kpisAtendidos.sinFua})
                  </button>
                </div>
              </div>
            </div>

            {/* TABLA DE ATENCIONES REALIZADAS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Paciente</th>
                    <th className="py-3 px-4">Consultorio / Profesional</th>
                    <th className="py-3 px-4">Diagnóstico Principal (CIE-10)</th>
                    <th className="py-3 px-4">Estado FUA</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {atencionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No se encontraron atenciones registradas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    atencionesFiltradas.map((atn) => {
                      const pac = pacientes.find((p) => String(p.id) === String(atn.paciente_id));
                      const prof = profesionales.find((pr) => String(pr.id) === String(atn.profesional_id));
                      const fua = getFuaForAtencion(atn);

                      return (
                        <tr
                          key={atn.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                        >
                          {/* FECHA Y HORA */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              <span>{atn.fecha_atencion}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock size={12} className="text-slate-400" />
                              <span>{atn.hora_atencion}</span>
                            </div>
                          </td>

                          {/* PACIENTE */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {pac?.apellidos_nombres || 'Paciente No Identificado'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                              <span>
                                {pac?.tipo_documento}: {pac?.numero_documento || pac?.codigo_temporal || 'S/D'}
                              </span>
                              <span>•</span>
                              <span>HCL: {pac?.hcl || 'S/N'}</span>
                              <span>•</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {pac?.seguro || 'SIS'}
                              </span>
                            </div>
                          </td>

                          {/* CONSULTORIO Y PROFESIONAL */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {prof?.apellidos_nombres || 'Profesional de Salud'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {prof?.profesion} • Colegiatura: {prof?.colegiatura || 'S/C'}
                            </div>
                          </td>

                          {/* DIAGNÓSTICO CIE-10 */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                {atn.cie10_1 || 'F32.9'}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {atn.diagnostico_1}
                              </span>
                            </div>
                            {atn.diagnostico_2 && (
                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                <span className="font-mono font-semibold">{atn.cie10_2}:</span>
                                <span>{atn.diagnostico_2}</span>
                              </div>
                            )}
                          </td>

                          {/* ESTADO FUA */}
                          <td className="py-3.5 px-4">
                            {fua ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <ShieldCheck size={12} />
                                  <span>FUA GENERADO</span>
                                </span>
                                <div className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 pl-1">
                                  {fua.numero_fua}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <AlertCircle size={12} />
                                <span>SIN FUA EMITIDO</span>
                              </span>
                            )}
                          </td>

                          {/* ACCIONES */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* BOTÓN VER FUA O GENERAR FUA */}
                              {fua ? (
                                <button
                                  onClick={() => setSelectedFuaForPreview(fua)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                  title="Ver e Imprimir Formato Oficial FUA A4 Doble Cara"
                                >
                                  <Eye size={14} />
                                  <span>Ver FUA</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGenerarFuaParaAtencion(atn)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#284f80] text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                  title="Generar FUA Oficial para este paciente y atención"
                                >
                                  <FileText size={14} />
                                  <span>Generar FUA</span>
                                </button>
                              )}

                              {/* BOTÓN DETALLE CLÍNICO */}
                              <button
                                onClick={() => setSelectedAtencionDetail(atn)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded-xl transition-all cursor-pointer"
                                title="Ver Ficha Clínica de Consulta"
                              >
                                <Activity size={15} />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: SALA DE ESPERA, LLAMADO Y ATENCIÓN CLÍNICA EN VIVO */}
      {/* ========================================================================= */}
      {subTab === 'consultorio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Columna Izquierda: Información del Consultorio */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-teal-600 tracking-wider">
                  {consultorioActual?.codigo}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {consultorioActual?.nombre}
                </h3>
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Profesional a cargo:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {consultorioActual?.profesional_nombre}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Piso / Ubicación:</span>
                <span className="font-medium">{consultorioActual?.piso}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">En espera en sala:</span>
                <span className="font-bold text-teal-600">{colaConsultorio.length} pacientes</span>
              </div>
            </div>

            <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200">
              💡 Al presionar <strong>"Llamar a Pantalla"</strong>, se emitirá una alerta visual y sonora en el monitor de sala de espera convocando al paciente a este consultorio.
            </div>
          </div>

          {/* Columna Derecha (2 cols): Lista de Pacientes en Espera */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Pacientes en Cola para {consultorioActual?.codigo}</span>
              <span className="text-xs text-slate-400 font-normal">
                Ordenados por prioridad de triaje y hora de llegada
              </span>
            </h3>

            {colaConsultorio.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <CheckCircle size={36} className="text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  No hay pacientes en espera en este consultorio
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Los pacientes aparecerán aquí una vez que hayan sido triados y derivados a este servicio.
                </p>
              </div>
            ) : (
              colaConsultorio.map((c) => {
                const pac = pacientes.find((p) => p.id === c.paciente_id);
                const tr = triajes.find((t) => t.cita_id === c.id);

                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border bg-white dark:bg-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      c.llamado_pantalla
                        ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                        {c.hora_cita}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {pac?.apellidos_nombres}
                          </h4>
                          {c.llamado_pantalla && (
                            <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                              LLAMADO EN PANTALLA
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-medium">
                          <span>
                            {pac?.tipo_documento}: {pac?.numero_documento || pac?.codigo_temporal}
                          </span>
                          <span>•</span>
                          <span>Seguro: {pac?.seguro || 'SIS'}</span>
                          {tr && (
                            <>
                              <span>•</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                PA: {tr.presion_arterial} | IMC: {tr.imc}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleLlamar(c.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                        title="Llamar en pantalla de sala de espera"
                      >
                        <Bell size={14} className="text-teal-600" />
                        <span>{c.llamado_pantalla ? 'Volver a Llamar' : 'Llamar a Pantalla'}</span>
                      </button>

                      <button
                        onClick={() => handleIniciarAtencion(c.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all"
                      >
                        <Stethoscope size={14} />
                        <span>Atender Consulta</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ATENCIÓN MÉDICA EN CURSO */}
      {/* ========================================================================= */}
      {atendiendoCitaId && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/40 text-teal-700 rounded-lg">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Hoja de Atención Integral en Salud Mental
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paciente: {pacienteAtendiendo?.apellidos_nombres} ({pacienteAtendiendo?.tipo_documento}:{' '}
                    {pacienteAtendiendo?.numero_documento || pacienteAtendiendo?.codigo_temporal}) • Seguro:{' '}
                    {pacienteAtendiendo?.seguro}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAtendiendoCitaId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFinalizarAtencion} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Resumen de Triaje */}
              {triajeAtendiendo && (
                <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-teal-900 dark:text-teal-200">
                    Constantes en Triaje:
                  </div>
                  <div className="flex gap-3 text-slate-700 dark:text-slate-300">
                    <span>
                      PA: <strong>{triajeAtendiendo.presion_arterial}</strong>
                    </span>
                    <span>
                      FC: <strong>{triajeAtendiendo.frecuencia_cardiaca} lpm</strong>
                    </span>
                    <span>
                      FR: <strong>{triajeAtendiendo.frecuencia_respiratoria} rpm</strong>
                    </span>
                    <span>
                      T°: <strong>{triajeAtendiendo.temperatura} °C</strong>
                    </span>
                    <span>
                      SpO2: <strong>{triajeAtendiendo.spo2}%</strong>
                    </span>
                    <span>
                      IMC: <strong>{triajeAtendiendo.imc}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* 1. Anamnesis / Motivo */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  1. Anamnesis y Motivo de Consulta *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Relato cronológico de los síntomas, factores desencadenantes y antecedentes psiquiátricos/psicológicos..."
                  value={anamnesis}
                  onChange={(e) => setAnamnesis(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* 2. Examen Mental */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  2. Examen del Estado Mental
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Apariencia y Conciencia:
                    </span>
                    <input
                      type="text"
                      value={examenMental.apariencia}
                      onChange={(e) =>
                        setExamenMental({ ...examenMental, apariencia: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Estado Afectivo / Ánimo:
                    </span>
                    <input
                      type="text"
                      value={examenMental.afecto}
                      onChange={(e) =>
                        setExamenMental({ ...examenMental, afecto: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Curso y Contenido del Pensamiento:
                    </span>
                    <input
                      type="text"
                      value={examenMental.pensamiento}
                      onChange={(e) =>
                        setExamenMental({ ...examenMental, pensamiento: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Sensopercepción y Juicio:
                    </span>
                    <input
                      type="text"
                      value={examenMental.sensopercepcion}
                      onChange={(e) =>
                        setExamenMental({ ...examenMental, sensopercepcion: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Diagnósticos CIE-10 */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  3. Diagnósticos (CIE-10 Oficial) *
                </label>

                {/* Buscador CIE-10 */}
                <div className="relative">
                  <input
                    type="text"
                    value={cieSearch}
                    onChange={(e) => setCieSearch(e.target.value)}
                    placeholder="Buscar diagnóstico CIE-10 por código o nombre (ej. F32, Depresión, Ansiedad)..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                  {cieSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      {CIE10_COMUNES.filter(
                        (c) =>
                          c.codigo.toLowerCase().includes(cieSearch.toLowerCase()) ||
                          c.descripcion.toLowerCase().includes(cieSearch.toLowerCase())
                      ).map((item) => (
                        <div
                          key={item.codigo}
                          onClick={() => handleAddCie10(item)}
                          className="p-2 text-xs hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between"
                        >
                          <span className="font-bold text-teal-700 dark:text-teal-300">
                            {item.codigo}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            {item.descripcion}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lista de Diagnósticos Seleccionados */}
                <div className="space-y-2">
                  {diagnosticos.map((d, index) => (
                    <div
                      key={d.codigo}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                          {d.codigo}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {d.descripcion}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={d.tipo}
                          onChange={(e) => {
                            const newTipo = e.target.value as TipoDiagnostico;
                            setDiagnosticos(
                              diagnosticos.map((item, idx) =>
                                idx === index ? { ...item, tipo: newTipo } : item
                              )
                            );
                          }}
                          className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"
                        >
                          <option value="PRESUNTIVO">Presuntivo</option>
                          <option value="DEFINITIVO">Definitivo</option>
                          <option value="REPETIDO">Repetido</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setDiagnosticos(diagnosticos.filter((_, idx) => idx !== index))
                          }
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Procedimientos CPMS */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  4. Procedimiento CPMS Aplicado
                </label>
                <select
                  value={procedimientoCPMS}
                  onChange={(e) => setProcedimientoCPMS(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
                >
                  <option value="99203">99203 - Consulta Médica Especializada</option>
                  <option value="90834">90834 - Psicoterapia Individual (45-50 min)</option>
                  <option value="90837">90837 - Psicoterapia Individual Prolongada (60 min)</option>
                  <option value="96101">96101 - Evaluación Psicológica Integral</option>
                </select>
              </div>

              {/* 5. Recetas Médicas SISMED */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  5. Prescripción Farmacológica (Petitorio SISMED)
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Medicamento
                    </label>
                    <select
                      value={nuevoMedNombre}
                      onChange={(e) => setNuevoMedNombre(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                    >
                      {MEDICAMENTOS_SALUD_MENTAL.map((m) => (
                        <option key={m.id} value={m.nombre}>
                          {m.nombre} ({m.concentracion})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Dosis / Frecuencia
                    </label>
                    <input
                      type="text"
                      value={nuevaDosis}
                      onChange={(e) => setNuevaDosis(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                      placeholder="1 tableta"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Cantidad Total
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={nuevaCantidad}
                        onChange={(e) => setNuevaCantidad(Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={handleAddReceta}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recetas agregadas */}
                {recetas.length > 0 && (
                  <div className="space-y-1.5">
                    {recetas.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs"
                      >
                        <div>
                          <strong className="text-emerald-950 dark:text-emerald-300">
                            {r.medicamento}
                          </strong>{' '}
                          - {r.dosis} ({r.cantidad} unidades)
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveReceta(r.id)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Próxima Cita */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Próxima Cita Sugerida
                  </label>
                  <input
                    type="date"
                    value={proximaCita}
                    onChange={(e) => setProximaCita(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destino del Paciente
                  </label>
                  <select
                    value={destinoFinal}
                    onChange={(e) => setDestinoFinal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="CITA_CONTROL">Cita de Control en CSMC</option>
                    <option value="ALTA_MEDICA">Alta Médica / Terapéutica</option>
                    <option value="REFERENCIA_HOSPITAL">Referencia a Hospital San José</option>
                    <option value="VISITA_DOMICILIARIA">Visita Domiciliaria Programada</option>
                  </select>
                </div>
              </div>

              {/* Botones de Finalizar */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAtendiendoCitaId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  <CheckCircle size={16} />
                  <span>Guardar y Finalizar Atención</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ALERTA: ATENCIÓN FINALIZADA Y OPCIÓN PARA GENERAR FUA DE INMEDIATO */}
      {/* ========================================================================= */}
      {atencionRecienGuardada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                ¡Atención Registrada Exitosamente!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La consulta médica ha sido guardada en la base de datos oficial.
              </p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 text-left">
              <strong>¿Desea generar el Formato Único de Atención (FUA)?</strong>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                Para atenciones de pacientes SIS, el sistema asignará el número correlativo oficial de forma automática.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  const atn = atencionRecienGuardada;
                  setAtencionRecienGuardada(null);
                  handleGenerarFuaParaAtencion(atn);
                }}
                className="w-full py-2.5 px-4 bg-[#1e3a5f] hover:bg-[#284f80] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                <span>📄 Generar y Ver FUA Oficial Ahora</span>
              </button>

              <button
                onClick={() => {
                  setAtencionRecienGuardada(null);
                  setSubTab('atendidos');
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                📋 Ir a la Lista de Pacientes Atendidos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALLE CLÍNICO COMPLETO */}
      {/* ========================================================================= */}
      {selectedAtencionDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 max-w-2xl w-full rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <Activity size={18} className="text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Detalle Clínico de la Consulta Médica
                </h3>
              </div>
              <button
                onClick={() => setSelectedAtencionDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Fecha y Hora</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedAtencionDetail.fecha_atencion} {selectedAtencionDetail.hora_atencion}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Presión Arterial</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedAtencionDetail.presion_arterial || '120/80'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Peso / Talla</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedAtencionDetail.peso} kg / {selectedAtencionDetail.talla} cm
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">IMC</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedAtencionDetail.imc}
                  </strong>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. Motivo de Consulta / Anamnesis:
                </span>
                <p className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {selectedAtencionDetail.motivo_consulta}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  2. Examen Mental:
                </span>
                <p className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {selectedAtencionDetail.examen_mental}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  3. Diagnósticos y Procedimientos:
                </span>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div>
                    <span className="font-bold text-blue-600 font-mono">
                      {selectedAtencionDetail.cie10_1}
                    </span>{' '}
                    - {selectedAtencionDetail.diagnostico_1}
                  </div>
                  {selectedAtencionDetail.diagnostico_2 && (
                    <div>
                      <span className="font-bold text-blue-600 font-mono">
                        {selectedAtencionDetail.cie10_2}
                      </span>{' '}
                      - {selectedAtencionDetail.diagnostico_2}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                    Procedimiento: {selectedAtencionDetail.procedimientos}
                  </div>
                </div>
              </div>

              {selectedAtencionDetail.medicamentos && selectedAtencionDetail.medicamentos.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    4. Farmacoterapia Prescrita:
                  </span>
                  <div className="space-y-1">
                    {selectedAtencionDetail.medicamentos.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-900 dark:text-emerald-200 text-xs flex justify-between"
                      >
                        <span>
                          <strong>{m.medicamento}</strong> - {m.dosis} {m.frecuencia}
                        </span>
                        <span>{m.cantidad} uds</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedAtencionDetail(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL OFICIAL PREVIEW FUA (ANVERSO & REVERSO DUPLEX A4) */}
      {/* ========================================================================= */}
      {selectedFuaForPreview && (
        <FuaPreviewModal
          fua={selectedFuaForPreview}
          onClose={() => setSelectedFuaForPreview(null)}
        />
      )}
    </div>
  );
};
