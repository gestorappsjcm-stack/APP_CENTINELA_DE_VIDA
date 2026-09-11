import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Paciente } from '../../types';
import {
  FileText,
  User,
  Search,
  Calendar,
  Activity,
  Stethoscope,
  Pill,
  FileSpreadsheet,
  Printer,
  Shield,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ExternalLink,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';

export const FichaPacienteView: React.FC = () => {
  const {
    pacientes,
    selectedPacienteFichaId,
    setSelectedPacienteFichaId,
    atenciones,
    triajes,
    citas,
    fuas,
    profesionales,
    setCurrentTab,
    setActiveModal,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'atenciones' | 'triajes' | 'recetas' | 'fua'>('resumen');

  // Paciente seleccionado actual (o el primero por defecto)
  const currentPaciente =
    pacientes.find((p) => p && p.id === selectedPacienteFichaId) || pacientes[0];

  const filteredPacientes = (pacientes || []).filter((p) => {
    if (!p) return false;
    const term = searchTerm.toLowerCase();
    const nombres = (p.apellidos_nombres || '').toLowerCase();
    const numDoc = p.numero_documento || '';
    const codTemp = p.codigo_temporal || '';
    const hcl = p.hcl || '';
    return (
      nombres.includes(term) ||
      numDoc.includes(term) ||
      codTemp.toLowerCase().includes(term) ||
      hcl.toLowerCase().includes(term)
    );
  });

  if (!currentPaciente) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center text-slate-400">
        No hay pacientes registrados en el sistema. Registre un paciente desde el módulo de Admisión.
      </div>
    );
  }

  // Datos asociados al paciente con arrays seguros
  const atencionesPaciente = (atenciones || []).filter((a) => a && a.paciente_id === currentPaciente.id);
  const triajesPaciente = (triajes || []).filter((t) => t && t.paciente_id === currentPaciente.id);
  const citasPaciente = (citas || []).filter((c) => c && c.paciente_id === currentPaciente.id);
  const fuasPaciente = (fuas || []).filter((f) => f && f.paciente_id === currentPaciente.id);

  // Niveles de progresión
  const tieneCitas = citasPaciente.length > 0;
  const tieneTriajes = triajesPaciente.length > 0;
  const tieneAtenciones = atencionesPaciente.length > 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Ficha Integral del Paciente (Historia Clínica)
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Expediente clínico progresivo según nivel de atención en el CSMC Centinela de Vida
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            <Printer size={15} />
            <span>Imprimir Ficha HC</span>
          </button>

          <button
            onClick={() => setCurrentTab('agenda')}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all"
          >
            <Calendar size={15} />
            <span>+ Programar Cita</span>
          </button>
        </div>
      </div>

      {/* Selector Rápido de Paciente y Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Buscador y Tarjeta de Identificación */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <label className="block text-xs font-bold uppercase text-slate-400">
              Buscar Paciente en Padrón:
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="DNI, Nombres o HCL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-100 dark:border-slate-700/60 rounded-xl">
              {filteredPacientes.map((p) => {
                const isSelected = p.id === currentPaciente.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPacienteFichaId(p.id)}
                    className={`w-full p-2.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <div>
                      <div className="truncate font-semibold">{p.apellidos_nombres || 'Paciente'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.tipo_documento || 'DOC'}: {p.numero_documento || p.codigo_temporal || '-'} • HCL: {p.hcl || 'S/N'}
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {p.seguro || 'S/S'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tarjeta de Filiación Detallada */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-base">
                {(currentPaciente.apellidos_nombres || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                  {currentPaciente.apellidos_nombres || 'Paciente'}
                </h3>
                <span className="font-mono text-xs text-teal-600 font-bold block mt-0.5">
                  HCL: {currentPaciente.hcl || 'SIN ASIGNAR'}
                </span>
              </div>
            </div>

            <div className="text-xs space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Documento:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {currentPaciente.tipo_documento}: {currentPaciente.numero_documento || currentPaciente.codigo_temporal}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Edad / Sexo:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {currentPaciente.edad !== undefined ? `${currentPaciente.edad} años` : 'No reg.'} /{' '}
                  {currentPaciente.sexo === 'M' ? 'Masculino' : currentPaciente.sexo === 'F' ? 'Femenino' : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Condición Seguro:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-teal-700 dark:text-teal-300">
                    {currentPaciente.seguro || 'PARTICULAR'}
                  </span>
                  {currentPaciente.seguro === 'SIS' && (
                    <a
                      href="https://cel.sis.gob.pe/SisConsultaEnLinea"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink size={9} />
                      <span>SIS</span>
                    </a>
                  )}
                  {currentPaciente.seguro === 'ESSALUD' && (
                    <a
                      href="https://dondemeatiendo.essalud.gob.pe/#/consulta"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink size={9} />
                      <span>EsSalud</span>
                    </a>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Distrito:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {currentPaciente.distrito || 'Chincha Alta'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Celular:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {currentPaciente.celular || 'No registrado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dirección:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right truncate max-w-[160px]">
                  {currentPaciente.direccion || 'Sin dirección'}
                </span>
              </div>
            </div>

            {currentPaciente.tiene_tutor && (
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 text-[11px] space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-300 block">
                  Acompañante / Tutor Responsable
                </span>
                <div className="font-semibold">{currentPaciente.tutor_nombres}</div>
                <div className="text-slate-500">
                  DNI: {currentPaciente.tutor_numero_documento || 'S/N'} • Parentesco: {currentPaciente.tutor_parentesco || 'Tutor'}
                </div>
                {currentPaciente.tutor_celular && (
                  <div className="text-slate-500">Celular: {currentPaciente.tutor_celular}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Información Progresiva de la Historia Clínica */}
        <div className="lg:col-span-2 space-y-4">
          {/* Si solo está registrado (sin citas ni atenciones) */}
          {!tieneCitas && !tieneTriajes && !tieneAtenciones ? (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
              <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-teal-950 dark:text-teal-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-teal-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Estado Actual: Paciente Registrado en Admisión</h4>
                    <p className="text-xs text-teal-800 dark:text-teal-300">
                      Cuenta con sus datos de filiación completos. Aún no se han programado citas ni realizado atenciones clínicas.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab('agenda')}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                >
                  <Calendar size={14} />
                  <span>Programar Primera Cita</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Ficha Principal de Datos de Admisión */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                  Datos Principales del Registro de Admisión
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Apellidos y Nombres:</span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm uppercase">
                      {currentPaciente.apellidos_nombres}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Documento y N° Historia:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {currentPaciente.tipo_documento}: {currentPaciente.numero_documento || currentPaciente.codigo_temporal} • HCL: <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{currentPaciente.hcl || 'Sin HCL'}</span>
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Nacimiento y Estado Civil:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Nac.: {currentPaciente.fecha_nacimiento || 'No registrada'} • Estado Civil: {currentPaciente.estado_civil || 'SOLTERO'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Seguro y Residencia:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Seguro: <span className="font-bold text-teal-700 dark:text-teal-300">{currentPaciente.seguro}</span> • Distrito: {currentPaciente.distrito || 'Chincha Alta'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Si ya tiene citas o atenciones: Navegación de pestañas */
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto scrollbar-none">
                {[
                  { id: 'resumen', label: 'Resumen Clínico', icon: User },
                  { id: 'atenciones', label: `Atenciones HC (${atencionesPaciente.length})`, icon: Activity },
                  { id: 'triajes', label: `Triajes (${triajesPaciente.length})`, icon: Stethoscope },
                  { id: 'recetas', label: 'Recetas / Fármacos', icon: Pill },
                  { id: 'fua', label: `Formatos FUA (${fuasPaciente.length})`, icon: FileSpreadsheet },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeSubTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveSubTab(t.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[#1A2B4A] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-Pestaña: Resumen Clínico */}
              {activeSubTab === 'resumen' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                    Resumen de Atención y Programación
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                      <span className="font-bold text-slate-400 block text-[10px] uppercase">
                        Diagnóstico Principal Registrado:
                      </span>
                      <div className="font-bold text-teal-700 dark:text-teal-400 text-sm">
                        {atencionesPaciente[0]?.diagnostico_1 || 'Sin diagnóstico definitivo aún'}
                      </div>
                      <div className="font-mono text-slate-500">
                        CIE-10: {atencionesPaciente[0]?.cie10_1 ? `[${atencionesPaciente[0].cie10_1}]` : '-'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                      <span className="font-bold text-slate-400 block text-[10px] uppercase">
                        Último Triaje / Presión Arterial:
                      </span>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {triajesPaciente[0]?.presion_arterial || 'Sin registro'} mmHg
                      </div>
                      <div className="text-slate-500">
                        Temp: {triajesPaciente[0]?.temperatura ? `${triajesPaciente[0].temperatura}°C` : '-'} • SatO2: {triajesPaciente[0]?.spo2 ? `${triajesPaciente[0].spo2}%` : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-700 dark:text-slate-300">
                        Historial de Citas Programadas
                      </h5>
                      <button
                        onClick={() => setCurrentTab('agenda')}
                        className="text-[11px] text-teal-700 font-semibold hover:underline"
                      >
                        + Nueva Cita
                      </button>
                    </div>

                    {citasPaciente.length === 0 ? (
                      <p className="text-slate-400 text-[11px]">No tiene citas en la agenda actual.</p>
                    ) : (
                      <div className="space-y-2">
                        {citasPaciente.map((c) => {
                          const prof = profesionales.find((p) => p.id === c.profesional_id);
                          return (
                            <div
                              key={c.id}
                              className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  Cita el {c.fecha_cita} a las {c.hora_cita}
                                </span>
                                <span className="block text-[11px] text-slate-500">
                                  Profesional: {prof ? prof.apellidos_nombres : 'Por asignar'} • Motivo: {c.motivo_consulta}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  c.estado === 'ATENDIDA'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.estado === 'CONFIRMADA'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {c.estado}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Pestaña: Atenciones */}
              {activeSubTab === 'atenciones' && (
                <div className="space-y-3">
                  {atencionesPaciente.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs">
                      Este paciente aún no registra consultas clínicas finalizadas.
                    </div>
                  ) : (
                    atencionesPaciente.map((a) => {
                      const prof = profesionales.find((pr) => pr.id === a.profesional_id);
                      return (
                        <div
                          key={a.id}
                          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-white">
                                Atención Clínica • {prof?.profesion || 'Consulta Médica'}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Fecha: {a.fecha_atencion} {a.hora_atencion} • Profesional: {prof?.apellidos_nombres}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                              COMPLETADA
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-bold text-slate-500 block text-[10px] uppercase">
                              Motivo de Consulta:
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">
                              {a.motivo_consulta}
                            </p>
                          </div>

                          {a.examen_mental && (
                            <div className="space-y-1">
                              <span className="font-bold text-slate-500 block text-[10px] uppercase">
                                Examen Mental / Clínico:
                              </span>
                              <p className="text-slate-700 dark:text-slate-300">
                                {a.examen_mental}
                              </p>
                            </div>
                          )}

                          <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl space-y-1">
                            <span className="font-bold text-slate-500 block text-[10px] uppercase">
                              Diagnósticos CIE-10 Registrados:
                            </span>
                            <div className="space-y-1">
                              {a.cie10_1 && (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">[{a.cie10_1}]</span>
                                  <span>{a.diagnostico_1}</span>
                                </div>
                              )}
                              {a.cie10_2 && (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">[{a.cie10_2}]</span>
                                  <span>{a.diagnostico_2}</span>
                                </div>
                              )}
                              {a.cie10_3 && (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">[{a.cie10_3}]</span>
                                  <span>{a.diagnostico_3}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {a.plan_tratamiento && (
                            <div className="space-y-1">
                              <span className="font-bold text-slate-500 text-[10px] uppercase block">
                                Plan Terapéutico e Indicaciones:
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 italic">
                                "{a.plan_tratamiento}"
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Sub-Pestaña: Triajes */}
              {activeSubTab === 'triajes' && (
                <div className="space-y-3">
                  {triajesPaciente.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 text-xs">
                      No hay registros de triaje para este paciente.
                    </div>
                  ) : (
                    triajesPaciente.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Triaje de Fecha: {t.fecha} ({t.hora_llegada})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.clasificacion_riesgo === 'ROJO'
                                ? 'bg-rose-600 text-white'
                                : t.clasificacion_riesgo === 'AMARILLO'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            Prioridad {t.clasificacion_riesgo}
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-2 text-center font-mono">
                          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">PA</span>
                            <strong>{t.presion_arterial || '120/80'}</strong>
                          </div>
                          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">FC</span>
                            <strong>{t.frecuencia_cardiaca || 72}</strong>
                          </div>
                          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">FR</span>
                            <strong>{t.frecuencia_respiratoria || 18}</strong>
                          </div>
                          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">PESO</span>
                            <strong>{t.peso || 65} kg</strong>
                          </div>
                          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <span className="text-[9px] text-slate-400 block">IMC</span>
                            <strong>{t.imc || 23.5}</strong>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sub-Pestaña: Recetas */}
              {activeSubTab === 'recetas' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 text-xs">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Medicamentos Prescritos en el CSMC
                  </h4>
                  <div className="space-y-3">
                    {atencionesPaciente.flatMap((a) => a.medicamentos || []).length === 0 ? (
                      <p className="text-slate-400">No se han registrado prescripciones para este paciente.</p>
                    ) : (
                      atencionesPaciente.flatMap((a) => a.medicamentos || []).map((m, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-teal-700 dark:text-teal-400">
                              {m.nombre || m.medicamento} {m.concentracion} ({m.presentacion})
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              Dosis: {m.dosis} • Frecuencia: {m.frecuencia} • Duración: {m.duracion}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                            Cant: {m.cantidad || 1}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Pestaña: Formatos FUA */}
              {activeSubTab === 'fua' && (
                <div className="space-y-3">
                  {fuasPaciente.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                      <p className="text-slate-400 text-xs">No hay formatos FUA emitidos para este paciente.</p>
                      <button
                        onClick={() => setCurrentTab('fua')}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Generar FUA Ahora
                      </button>
                    </div>
                  ) : (
                    fuasPaciente.map((f) => (
                      <div
                        key={f.id}
                        className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">
                            FUA N° {f.numero_fua_formateado || f.numero_fua}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            Emitido el {f.fecha_atencion} • Prestación: <strong>{f.codigo_prestacional}</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => setCurrentTab('fua')}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer size={14} />
                          <span>Ver FUA Oficial</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
