import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { FUA, Paciente, AtencionClinica } from '../../types';
import { FuaPreviewModal } from '../fua/FuaPreviewModal';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Activity,
  PlusCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const FuaView: React.FC = () => {
  const {
    fuas,
    fuaConfig,
    updateFuaConfig,
    addFUA,
    deleteFUA,
    pacientes,
    atenciones,
    profesionales,
    triajes,
    setCurrentTab,
    currentUser,
  } = useApp();

  // Estados de interfaz
  const [searchTermFua, setSearchTermFua] = useState('');
  const [selectedFuaForPreview, setSelectedFuaForPreview] = useState<FUA | null>(null);

  // Estados para Generar FUA
  const [searchPacienteText, setSearchPacienteText] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [selectedAtencion, setSelectedAtencion] = useState<AtencionClinica | null>(null);
  const [fuaRecienGenerado, setFuaRecienGenerado] = useState<FUA | null>(null);
  const [mensajeAlerta, setMensajeAlerta] = useState<string | null>(null);

  // Estados de configuraciÃ³n de rango
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [cfgRenipress, setCfgRenipress] = useState(fuaConfig?.codigo_renipress || '00003414');
  const [cfgAnio, setCfgAnio] = useState(fuaConfig?.anio || 2026);
  const [cfgRangoMax, setCfgRangoMax] = useState(fuaConfig?.rango_maximo || 100);
  const [cfgNombreIpress, setCfgNombreIpress] = useState(
    fuaConfig?.nombre_ipress || 'HOSPITAL SAN JOSÃ‰ DE CHINCHA'
  );
  const [configGuardadaMsg, setConfigGuardadaMsg] = useState(false);

  // PaginaciÃ³n de Historial
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  // KPIs de resumen
  const kpis = useMemo(() => {
    const total = fuas.length;
    const anioActual = new Date().getFullYear();
    const mesActual = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefijoMes = `${anioActual}-${mesActual}`;

    const esteMes = fuas.filter((f) => f.fecha && f.fecha.startsWith(prefijoMes)).length;
    const rangoMaximo = fuaConfig?.rango_maximo || 100;
    const disponibles = Math.max(0, rangoMaximo - total);
    const porcentajeUtilizado = Math.min(100, Math.round((total / rangoMaximo) * 100));

    return { total, esteMes, disponibles, porcentajeUtilizado, rangoMaximo };
  }, [fuas, fuaConfig]);

  // BÃºsqueda de pacientes reactiva
  const pacientesFiltrados = useMemo(() => {
    const q = searchPacienteText.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return pacientes
      .filter((p) => {
        const nom = (p.apellidos_nombres || '').toLowerCase();
        const doc = (p.numero_documento || p.codigo_temporal || '').toLowerCase();
        const hcl = (p.hcl || '').toLowerCase();
        return nom.includes(q) || doc.includes(q) || hcl.includes(q);
      })
      .slice(0, 8);
  }, [pacientes, searchPacienteText]);

  // Atenciones del paciente seleccionado
  const atencionesDelPaciente = useMemo(() => {
    if (!selectedPaciente) return [];
    return atenciones.filter((a) => a.paciente_id === selectedPaciente.id);
  }, [atenciones, selectedPaciente]);

  // SelecciÃ³n de paciente
  const handleSelectPaciente = (pac: Paciente) => {
    // Validar estado SIS
    const seguro = (pac.seguro || '').toUpperCase();
    if (seguro && seguro !== 'SIS' && seguro !== 'SUBSIDIADO' && seguro !== 'SEMISUBSIDIADO') {
      setMensajeAlerta(
        `AtenciÃ³n: El paciente ${pac.apellidos_nombres} registra seguro "${pac.seguro}". El Formato Ãšnico de AtenciÃ³n (FUA) corresponde prioritariamente a asegurados del SIS.`
      );
    } else {
      setMensajeAlerta(null);
    }

    setSelectedPaciente(pac);
    setSearchPacienteText('');
    setSelectedAtencion(null);
    setFuaRecienGenerado(null);
  };

  // Guardar ConfiguraciÃ³n
  const handleGuardarConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateFuaConfig({
      codigo_renipress: cfgRenipress,
      anio: Number(cfgAnio),
      rango_maximo: Number(cfgRangoMax),
      nombre_ipress: cfgNombreIpress,
    });
    setConfigGuardadaMsg(true);
    setTimeout(() => setConfigGuardadaMsg(false), 3000);
  };

  // Generar FUA
  const handleGenerarFUA = () => {
    if (!selectedPaciente) {
      alert('Debe seleccionar un paciente.');
      return;
    }

    if (!selectedAtencion) {
      alert('Debe seleccionar la atenciÃ³n clÃ­nica para generar el FUA.');
      return;
    }

    const profesional = profesionales.find((pr) => pr.id === selectedAtencion.profesional_id) || profesionales[0];
    const triaje = triajes.find((t) => t.id === selectedAtencion.triaje_id) || triajes.find((t) => t.paciente_id === selectedPaciente.id);

    // DiagnÃ³sticos de la atenciÃ³n
    const diagnosticos: FUA['diagnosticos'] = [];
    if (selectedAtencion.diagnostico_1) {
      diagnosticos.push({
        codigo: selectedAtencion.cie10_1 || 'F32.9',
        descripcion: selectedAtencion.diagnostico_1,
        tipo: 'D',
        tipo_ingreso: 'D',
        cie_ingreso: selectedAtencion.cie10_1 || 'F32.9',
        tipo_egreso: 'D',
        cie_egreso: selectedAtencion.cie10_1 || 'F32.9',
      });
    }
    if (selectedAtencion.diagnostico_2) {
      diagnosticos.push({
        codigo: selectedAtencion.cie10_2 || 'F41.1',
        descripcion: selectedAtencion.diagnostico_2,
        tipo: 'D',
        tipo_ingreso: 'D',
        cie_ingreso: selectedAtencion.cie10_2 || 'F41.1',
        tipo_egreso: 'D',
        cie_egreso: selectedAtencion.cie10_2 || 'F41.1',
      });
    }
    if (selectedAtencion.diagnostico_3) {
      diagnosticos.push({
        codigo: selectedAtencion.cie10_3 || 'Z73.0',
        descripcion: selectedAtencion.diagnostico_3,
        tipo: 'D',
        tipo_ingreso: 'D',
        cie_ingreso: selectedAtencion.cie10_3 || 'Z73.0',
        tipo_egreso: 'D',
        cie_egreso: selectedAtencion.cie10_3 || 'Z73.0',
      });
    }

    // Si la atenciÃ³n no tenÃ­a diagnÃ³sticos definidos, asignar diagnÃ³stico predeterminado de salud mental
    if (diagnosticos.length === 0) {
      diagnosticos.push({
        codigo: 'F32.1',
        descripcion: 'EPISODIO DEPRESIVO MODERADO',
        tipo: 'D',
        tipo_ingreso: 'D',
        cie_ingreso: 'F32.1',
        tipo_egreso: 'D',
        cie_egreso: 'F32.1',
      });
    }

    // Medicamentos de la atenciÃ³n
    const medicamentos: FUA['medicamentos'] = [];
    if (selectedAtencion.medicamentos && selectedAtencion.medicamentos.length > 0) {
      selectedAtencion.medicamentos.forEach((m, idx) => {
        medicamentos.push({
          codigo_sismed: `0289${idx + 1}`,
          descripcion: m.medicamento,
          cantidad: m.cantidad,
          indicacion: `${m.dosis} cada ${m.frecuencia} por ${m.duracion}`,
          forma_farmaceutica: m.presentacion || 'TAB',
          concentracion: m.concentracion || '10mg',
          cantidad_prescrita: m.cantidad,
          cantidad_entregada: m.cantidad,
          diagnostico_relacionado: '1',
        });
      });
    } else {
      medicamentos.push({
        codigo_sismed: '02891',
        descripcion: 'SERTRALINA 50 MG TABLETA',
        cantidad: 30,
        indicacion: '1 tableta vÃ­a oral cada 24 horas por las maÃ±anas',
        forma_farmaceutica: 'TAB',
        concentracion: '50mg',
        cantidad_prescrita: 30,
        cantidad_entregada: 30,
        diagnostico_relacionado: '1',
      });
    }

    // CÃ³digo prestacional (056: Consulta mÃ©dica especializada / Salud Mental)
    const codigoPrestacional: FUA['codigo_prestacional'] = '056';

    const pesoVal = selectedAtencion.peso ? parseFloat(selectedAtencion.peso) : (triaje?.peso ? Number(triaje.peso) : 65);
    const tallaVal = selectedAtencion.talla ? parseFloat(selectedAtencion.talla) : (triaje?.talla ? Number(triaje.talla) : 165);

    const fuaData: Omit<FUA, 'id' | 'numero_fua' | 'fecha' | 'hora' | 'estado'> = {
      paciente_id: selectedPaciente.id,
      codigo_renaes: fuaConfig?.codigo_renipress || '00003414',
      diresa: 'DIRESA ICA / RED CHINCHA',
      establecimiento: fuaConfig?.nombre_ipress || 'HOSPITAL SAN JOSÃ‰ DE CHINCHA',
      componente_sis: 'SUBSIDIADO',
      codigo_afiliacion_sis: `150-1-${selectedPaciente.numero_documento || selectedPaciente.codigo_temporal || '00000000'}`,
      tipo_atencion: 'AMBULATORIA',
      codigo_prestacional: codigoPrestacional,
      profesional_id: profesional?.id || 'prof-1',
      triaje_id: selectedAtencion.triaje_id || triaje?.id,
      atencion_id: selectedAtencion.id,
      presion_arterial: selectedAtencion.presion_arterial || triaje?.presion_arterial || '120/80',
      frecuencia_cardiaca: selectedAtencion.frecuencia_cardiaca ? parseInt(selectedAtencion.frecuencia_cardiaca) : 72,
      frecuencia_respiratoria: selectedAtencion.frecuencia_respiratoria ? parseInt(selectedAtencion.frecuencia_respiratoria) : 18,
      peso_kg: pesoVal,
      talla_cm: tallaVal,
      imc: tallaVal > 0 ? Number((pesoVal / Math.pow(tallaVal / 100, 2)).toFixed(1)) : 23.8,
      diagnosticos,
      medicamentos,
      procedimientos: [
        { cpms: '90806', descripcion: 'PSICOTERAPIA INDIVIDUAL', ind: '1', eje: '1', dx: '1', res: 'COMPLETO' },
        { cpms: '96101', descripcion: 'EVALUACIÃ“N PSICOLÃ“GICA INTEGRAL', ind: '1', eje: '1', dx: '1', res: 'INFORME' },
      ],
      observaciones: `AtenciÃ³n clÃ­nica ambulatoria vinculada a Historia ClÃ­nica ${selectedPaciente.hcl || 'S/N'}. Control programado.`,
      personal_atiende: 'IPRESS',
      lugar_atencion: 'INTRAMURAL',
      atencion_directa: true,
      destino: 'CITA',
    };

    const res = addFUA(fuaData);
    if (res.success && res.fuaId) {
      const nuevo = {
        ...fuaData,
        id: res.fuaId,
        numero_fua: res.numeroFua || `00003414-2026-00000001`,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        estado: 'REGISTRADO' as const,
      };
      setFuaRecienGenerado(nuevo);
    }
  };

  // Resetear para nuevo FUA
  const handleNuevoFua = () => {
    setSelectedPaciente(null);
    setSelectedAtencion(null);
    setFuaRecienGenerado(null);
    setSearchPacienteText('');
    setMensajeAlerta(null);
  };

  // Filtrado de Historial
  const historialFiltrado = useMemo(() => {
    const q = searchTermFua.trim().toLowerCase();
    if (!q) return fuas;
    return fuas.filter((f) => {
      const numFua = (f.numero_fua || '').toLowerCase();
      const pac = pacientes.find((p) => p.id === f.paciente_id);
      const nomPac = (pac?.apellidos_nombres || '').toLowerCase();
      const docPac = (pac?.numero_documento || pac?.codigo_temporal || '').toLowerCase();
      return numFua.includes(q) || nomPac.includes(q) || docPac.includes(q);
    });
  }, [fuas, pacientes, searchTermFua]);

  // PaginaciÃ³n
  const totalPaginas = Math.ceil(historialFiltrado.length / itemsPorPagina) || 1;
  const indexInicio = (paginaActual - 1) * itemsPorPagina;
  const fuasPaginados = historialFiltrado.slice(indexInicio, indexInicio + itemsPorPagina);

  // Exportar Excel
  const exportarHistorialFUAExcel = () => {
    if (fuas.length === 0) {
      alert('No hay registros FUA para exportar.');
      return;
    }

    const dataExcel = fuas.map((f, idx) => {
      const pac = pacientes.find((p) => p.id === f.paciente_id);
      const prof = profesionales.find((pr) => pr.id === f.profesional_id);
      const diags = (f.diagnosticos || []).map((d) => `${d.codigo}: ${d.descripcion}`).join(' | ');

      return {
        'NÂ°': idx + 1,
        'NÂ° FUA': f.numero_fua,
        'FECHA': f.fecha,
        'HORA': f.hora,
        'IPRESS RENIPRESS': f.renaiess || f.codigo_renaes,
        'ESTABLECIMIENTO': f.establecimiento,
        'PACIENTE': pac?.apellidos_nombres || 'Desconocido',
        'TIPO DOC': pac?.tipo_documento || 'DNI',
        'NÂ° DOCUMENTO': pac?.numero_documento || pac?.codigo_temporal || '',
        'HISTORIA CLÃNICA': pac?.hcl || '',
        'SEGURO': pac?.seguro || 'SIS',
        'CÃ“D. PRESTACIONAL': f.codigo_prestacional,
        'DIAGNÃ“STICOS': diags,
        'PROFESIONAL RESPONSABLE': prof?.apellidos_nombres || '',
        'COLEGIATURA': prof?.colegiatura || '',
        'ESTADO': f.estado,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial_FUA');

    const hoy = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Historial_FUAs_${hoy}.xlsx`);
  };

  const handleEliminarFua = (fuaId: string, numeroFua: string) => {
    if (window.confirm(`Â¿EstÃ¡ seguro de eliminar el registro FUA NÂ° ${numeroFua}?`)) {
      deleteFUA(fuaId);
      if (fuaRecienGenerado?.id === fuaId) {
        setFuaRecienGenerado(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* ENCABEZADO SUPERIOR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
            title="Volver al Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-[#1A2B4A] dark:text-blue-400">ðŸ“„ GestiÃ³n de FUA</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formato Ãšnico de AtenciÃ³n SIS â€¢ EmisiÃ³n, Duplex A4, SincronizaciÃ³n y Registro Oficial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMostrarConfig(!mostrarConfig)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <Settings size={15} />
            <span>{mostrarConfig ? 'Ocultar Rango' : 'Configurar Rango'}</span>
          </button>

          <button
            onClick={exportarHistorialFUAExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[#165a36] hover:bg-[#1a6e42] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span>ðŸ“Š Excel</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TARJETAS RESUMEN KPI (GRID 4 CARDS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Generados
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {kpis.total}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Formularios registrados</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Este Mes
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-teal-600 dark:text-teal-400">
            {kpis.esteMes}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Emitidos mes corriente</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Disponibles
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {kpis.disponibles}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">De {kpis.rangoMaximo} asignados</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              % Utilizado
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-600 dark:text-amber-400">
            {kpis.porcentajeUtilizado}%
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Rango de numeraciÃ³n</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL DE CONFIGURACIÃ“N DEL RANGO FUA */}
      {/* ========================================================================= */}
      {mostrarConfig && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-md animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-[#1A2B4A] dark:text-blue-400" />
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ConfiguraciÃ³n del Rango FUA Institucional
              </h2>
            </div>
            {configGuardadaMsg && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 size={13} />
                Guardado correctamente
              </span>
            )}
          </div>

          <form onSubmit={handleGuardarConfig} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                CÃ³digo RENIPRESS
              </label>
              <input
                type="text"
                value={cfgRenipress}
                onChange={(e) => setCfgRenipress(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="00003414"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                AÃ±o
              </label>
              <input
                type="number"
                value={cfgAnio}
                onChange={(e) => setCfgAnio(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Rango MÃ¡ximo Asignado
              </label>
              <input
                type="number"
                value={cfgRangoMax}
                onChange={(e) => setCfgRangoMax(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Ãšltimo NÃºmero Correlativo
              </label>
              <input
                type="text"
                value={fuaConfig?.ultimo_numero || 0}
                disabled
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Nombre de la IPRESS
              </label>
              <input
                type="text"
                value={cfgNombreIpress}
                onChange={(e) => setCfgNombreIpress(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="HOSPITAL SAN JOSÃ‰ DE CHINCHA"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#1e3a5f] hover:bg-[#284f80] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                ðŸ’¾ Guardar ConfiguraciÃ³n
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÃ“N GENERAR NUEVO FUA */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Generar Nuevo FUA
              </h2>
              <p className="text-xs text-slate-500">
                Seleccione un paciente atendido y vincule la atenciÃ³n clÃ­nica correspondiente
              </p>
            </div>
          </div>

          {selectedPaciente && (
            <button
              onClick={handleNuevoFua}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
            >
              Limpiar Formulario
            </button>
          )}
        </div>

        {/* SI SE ACABA DE GENERAR UN FUA CON Ã‰XITO */}
        {fuaRecienGenerado ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  OperaciÃ³n Exitosa
                </span>
                <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                  âœ… FUA GENERADO EXITOSAMENTE
                </h3>
              </div>

              {/* NÃšMERO FUA DESTACADO EN ROJO GRANDE */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-rose-500 dark:border-rose-600 shadow-sm max-w-md w-full my-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  NÃºmero Oficial de Formato FUA
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-rose-600 dark:text-rose-400 tracking-wider my-1">
                  {fuaRecienGenerado.numero_fua}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Paciente: <strong className="text-slate-900 dark:text-white">{selectedPaciente?.apellidos_nombres}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setSelectedFuaForPreview(fuaRecienGenerado)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#284f80] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <Eye size={16} />
                  <span>ðŸ‘ï¸ Previsualizar / Imprimir FUA (A4 Doble Cara)</span>
                </button>

                <button
                  onClick={handleNuevoFua}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all border border-slate-300 dark:border-slate-600"
                >
                  <PlusCircle size={15} />
                  <span>ðŸ“ Generar Otro FUA</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* BUSCAR PACIENTE */}
            {!selectedPaciente ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Buscar Paciente (por Apellidos, Nombres, DNI o Historia ClÃ­nica):
                </label>
                <div className="relative max-w-xl">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchPacienteText}
                    onChange={(e) => setSearchPacienteText(e.target.value)}
                    placeholder="Escriba el nombre, DNI o NÂ° de Historia..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* RESULTADOS DE PACIENTES */}
                {pacientesFiltrados.length > 0 && (
                  <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {pacientesFiltrados.map((pac) => {
                      const seguro = (pac.seguro || '').toUpperCase();
                      const esSis = seguro === 'SIS' || seguro === 'SUBSIDIADO' || seguro === 'SEMISUBSIDIADO';

                      return (
                        <div
                          key={pac.id}
                          onClick={() => handleSelectPaciente(pac)}
                          className="p-3 hover:bg-blue-50/60 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                              {pac.apellidos_nombres.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {pac.apellidos_nombres}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {pac.tipo_documento}: {pac.numero_documento || pac.codigo_temporal || 'S/D'} â€¢ HCL: {pac.hcl || 'S/N'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {pac.origen_caso && pac.origen_caso !== 'GENERAL' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                {pac.origen_caso}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                esSis
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              SIS: {esSis ? 'ACTIVO' : pac.seguro || 'NO SIS'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* PACIENTE SELECCIONADO */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Paciente Seleccionado
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {selectedPaciente.apellidos_nombres}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {selectedPaciente.tipo_documento}: {selectedPaciente.numero_documento || selectedPaciente.codigo_temporal} â€¢ HCL: {selectedPaciente.hcl || 'S/N'} â€¢ Sexo: {selectedPaciente.sexo}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      SIS: ACTIVO ({selectedPaciente.seguro || 'SUBSIDIADO'})
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPaciente(null);
                        setSelectedAtencion(null);
                        setMensajeAlerta(null);
                      }}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-all"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>

                {mensajeAlerta && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{mensajeAlerta}</span>
                  </div>
                )}

                {/* LISTA DE ATENCIONES DEL PACIENTE */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Activity size={15} className="text-blue-600" />
                    <span>ðŸ“‹ Seleccione una AtenciÃ³n ClÃ­nica:</span>
                  </div>

                  {atencionesDelPaciente.length === 0 ? (
                    <div className="p-5 bg-amber-50/70 dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-xl text-center space-y-2">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        âš ï¸ No se encontraron atenciones clÃ­nicas registradas para este paciente.
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Para generar un FUA conforme a la normativa SIS, primero debe registrar una atenciÃ³n en el mÃ³dulo de Atenciones ClÃ­nicas.
                      </p>
                      <button
                        onClick={() => setCurrentTab('atencion')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A2B4A] hover:bg-[#243b5e] text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Ir al MÃ³dulo de Atenciones
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {atencionesDelPaciente.map((atn) => {
                        const isSelected = selectedAtencion?.id === atn.id;
                        const prof = profesionales.find((pr) => pr.id === atn.profesional_id);

                        return (
                          <div
                            key={atn.id}
                            onClick={() => setSelectedAtencion(atn)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              </div>

                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>Fecha: {atn.fecha_atencion} {atn.hora_atencion}</span>
                                  {atn.fua_generado && (
                                    <span className="text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded font-bold">
                                      FUA Emitido
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                                  Dx: <span className="font-bold text-blue-700 dark:text-blue-400">{atn.cie10_1}</span> - {atn.diagnostico_1}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Atendido por: {prof?.apellidos_nombres || 'Profesional de Salud'}
                                </div>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-500 sm:text-right">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                                Consulta Externa (056)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* TARJETA DATOS DE ATENCIÃ“N SELECCIONADA */}
                {selectedAtencion && (
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      <span>Datos de AtenciÃ³n Seleccionada:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Fecha:</span>{' '}
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {selectedAtencion.fecha_atencion}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">DiagnÃ³stico CIE-10:</span>{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {selectedAtencion.cie10_1}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Tipo:</span>{' '}
                        <strong className="text-slate-900 dark:text-white">
                          Consulta Externa (Ambulatoria)
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOTONES DE ACCIÃ“N */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleGenerarFUA}
                    disabled={!selectedAtencion}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                      selectedAtencion
                        ? 'bg-[#1e3a5f] hover:bg-[#284f80] text-white cursor-pointer'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <FileText size={16} />
                    <span>ðŸ“„ GENERAR FUA</span>
                  </button>

                  <button
                    onClick={handleNuevoFua}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECCIÃ“N HISTORIAL DE FUAS GENERADOS */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Historial de FUAs Generados
            </h2>
            <p className="text-xs text-slate-500">
              Registros oficiales almacenados ({historialFiltrado.length} registros encontrados)
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTermFua}
              onChange={(e) => {
                setSearchTermFua(e.target.value);
                setPaginaActual(1);
              }}
              placeholder="Buscar por NÂ° FUA o Paciente..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* TABLA DE HISTORIAL */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3 px-4">NÂ° FUA</th>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Fecha GeneraciÃ³n</th>
                <th className="py-3 px-4">Estado SIS</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {fuasPaginados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron registros de FUA coincidentes con la bÃºsqueda.
                  </td>
                </tr>
              ) : (
                fuasPaginados.map((f) => {
                  const pac = pacientes.find((p) => p.id === f.paciente_id);

                  return (
                    <tr
                      key={f.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      {/* NÃšMERO FUA EN ROJO DESTACADO */}
                      <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400 tracking-wider">
                        {f.numero_fua}
                      </td>

                      {/* PACIENTE */}
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {pac?.apellidos_nombres || 'Paciente No Encontrado'}
                      </td>

                      {/* DOCUMENTO CON BADGES */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {pac?.numero_documento || pac?.codigo_temporal || 'S/D'}
                          </span>
                          {pac?.origen_caso && pac.origen_caso !== 'GENERAL' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              {pac.origen_caso}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* FECHA */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {f.fecha} {f.hora}
                      </td>

                      {/* ESTADO SIS */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {f.estado || 'REGISTRADO'}
                        </span>
                      </td>

                      {/* ACCIONES */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedFuaForPreview(f)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Previsualizar / Imprimir FUA"
                          >
                            <Eye size={16} />
                          </button>

                          {currentUser.rol === 'administrador' && (
                            <button
                              onClick={() => handleEliminarFua(f.id, f.numero_fua)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                              title="Eliminar FUA"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÃ“N */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
            <div className="text-slate-500">
              PÃ¡gina <strong className="text-slate-800 dark:text-slate-200">{paginaActual}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{totalPaginas}</strong>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                disabled={paginaActual === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPaginaActual(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paginaActual === num
                      ? 'bg-[#1e3a5f] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                disabled={paginaActual === totalPaginas}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL OFICIAL PREVIEW FUA (ANVERSO & REVERSO DUPLEX) */}
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

