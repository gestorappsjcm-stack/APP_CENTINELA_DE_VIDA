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
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'resumen' | 'atenciones' | 'triajes' | 'recetas' | 'fua'>('resumen');

  // Paciente seleccionado actual (o el primero por defecto)
  const currentPaciente =
    pacientes.find((p) => p.id === selectedPacienteFichaId) || pacientes[0];

  const filteredPacientes = pacientes.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.apellidos_nombres.toLowerCase().includes(term) ||
      (p.numero_documento && p.numero_documento.includes(term)) ||
      (p.hcl && p.hcl.toLowerCase().includes(term))
    );
  });

  if (!currentPaciente) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center text-slate-400">
        No hay pacientes registrados en el sistema.
      </div>
    );
  }

  // Datos asociados al paciente
  const atencionesPaciente = atenciones.filter((a) => a.paciente_id === currentPaciente.id);
  const triajesPaciente = triajes.filter((t) => t.paciente_id === currentPaciente.id);
  const citasPaciente = citas.filter((c) => c.paciente_id === currentPaciente.id);
  const fuasPaciente = fuas.filter((f) => f.paciente_id === currentPaciente.id);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Ficha Integral del Paciente (Historia Clínica)
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Expediente clínico individualizado, evolución de consultas, triajes y formatos FUA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            <Printer size={15} />
            <span>Imprimir Ficha</span>
          </button>

          <button
            onClick={() => setCurrentTab('fua')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all"
          >
            <FileSpreadsheet size={15} />
            <span>+ Generar FUA SIS</span>
          </button>
        </div>
      </div>

      {/* Selector Rápido de Paciente y Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Buscador y Tarjeta de Identificación */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <label className="block text-xs font-bold uppercase text-slate-400">
              Buscar y Seleccionar Paciente:
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
                      <div className="truncate">{p.apellidos_nombres}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.tipo_documento}: {p.numero_documento || p.codigo_temporal} • HCL: {p.hcl || 'S/N'}
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
                {currentPaciente.apellidos_nombres.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                  {currentPaciente.apellidos_nombres}
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
                  {currentPaciente.edad ? `${currentPaciente.edad} años` : 'No reg.'} / {currentPaciente.sexo === 'M' ? 'Masculino' : 'Femenino'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Condición de Seguro:</span>
                <span className="font-bold text-teal-700 dark:text-teal-300">
                  {currentPaciente.seguro || 'PARTICULAR'}
                </span>
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
                <div>{currentPaciente.tutor_nombres} ({currentPaciente.tutor_parentesco})</div>
                <div className="text-slate-500">Cel: {currentPaciente.tutor_celular || 'S/N'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Pestañas de Historial Clínico */}
        <div className="lg:col-span-2 space-y-4">
          {/* Navegación interna */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'resumen', label: 'Resumen Clínico', icon: User },
              { id: 'atenciones', label: `Atenciones (${atencionesPaciente.length})`, icon: Activity },
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
                Resumen de Antecedentes y Estado Actual
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">
                    Diagnóstico Principal Registrado:
                  </span>
                  <div className="font-bold text-teal-700 dark:text-teal-400 text-sm">
                    {atencionesPaciente[0]?.diagnosticos[0]?.descripcion || 'Sin diagnóstico definitivo aún'}
                  </div>
                  <div className="font-mono text-slate-500">
                    CIE-10: {atencionesPaciente[0]?.diagnosticos[0]?.codigo || '-'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">
                    Último Triaje / Presión Arterial:
                  </span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {triajesPaciente[0]?.presion_arterial || '120/80'} mmHg
                  </div>
                  <div className="text-slate-500">
                    IMC: {triajesPaciente[0]?.imc ? `${triajesPaciente[0].imc} (${triajesPaciente[0].clasificacion_imc})` : 'Normal'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-slate-700 dark:text-slate-300">
                  Historial de Citas Programadas
                </h5>
                {citasPaciente.length === 0 ? (
                  <p className="text-slate-400 text-[11px]">No tiene citas en la agenda actual.</p>
                ) : (
                  <div className="space-y-2">
                    {citasPaciente.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Cita el {c.fecha_cita} a las {c.hora_cita}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            Motivo: {c.motivo_consulta}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.estado === 'ATENDIDA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {c.estado}
                        </span>
                      </div>
                    ))}
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

                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl space-y-1">
                        <span className="font-bold text-slate-500 block text-[10px] uppercase">
                          Diagnósticos Registrados:
                        </span>
                        {a.diagnosticos.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{d.codigo}</span>
                            <span>{d.descripcion}</span>
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded font-bold">
                              {d.tipo}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-slate-500 text-[10px] uppercase block">
                          Evolución y Plan Terapéutico:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 italic">
                          "{a.plan_trabajo}"
                        </p>
                      </div>
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
                  No hay registros de triaje de enfermería para este paciente.
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                        Prioridad {t.prioridad}
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
                        <strong>{t.peso_kg || 65} kg</strong>
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
                {atencionesPaciente.flatMap((a) => a.receta_medicamentos || []).length === 0 ? (
                  <p className="text-slate-400">No se han registrado prescripciones para este paciente.</p>
                ) : (
                  atencionesPaciente.flatMap((a) => a.receta_medicamentos || []).map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-teal-700 dark:text-teal-400">
                          {m.medicamento} {m.concentracion} ({m.presentacion})
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Dosis: {m.dosis} • Frecuencia: {m.frecuencia} • Duración: {m.duracion}
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        Cant: {m.cantidad}
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
                        FUA N° {f.numero_fua}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        Emitido el {f.fecha} • Prestación: <strong>{f.codigo_prestacional}</strong> • {f.componente_sis}
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
      </div>
    </div>
  );
};
