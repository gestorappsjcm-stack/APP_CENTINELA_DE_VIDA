import React from 'react';
import { useApp } from '../../context/AppContext';
import { Paciente } from '../../types';
import { parseMedicamentosList } from '../../lib/medicamentosHelper';
import {
  X,
  User,
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
  FileText,
} from 'lucide-react';

interface ModalFichaCompletaPacienteProps {
  paciente: Paciente;
  onClose: () => void;
}

export const ModalFichaCompletaPaciente: React.FC<ModalFichaCompletaPacienteProps> = ({
  paciente,
  onClose,
}) => {
  const {
    citas,
    triajes,
    atenciones,
    fuas,
    profesionales,
    consultorios,
    setCurrentTab,
    setSelectedPacienteFichaId,
    setActiveModal,
  } = useApp();

  if (!paciente) return null;

  // Registros asociados al paciente con guards seguros
  const citasPaciente = (citas || []).filter((c) => c && c.paciente_id === paciente.id);
  const triajesPaciente = (triajes || []).filter((t) => t && t.paciente_id === paciente.id);
  const atencionesPaciente = (atenciones || []).filter((a) => a && a.paciente_id === paciente.id);
  const fuasPaciente = (fuas || []).filter((f) => f && f.paciente_id === paciente.id);

  // Determinar nivel de evolución en el establecimiento
  const tieneCitas = citasPaciente.length > 0;
  const tieneTriajes = triajesPaciente.length > 0;
  const tieneAtenciones = atencionesPaciente.length > 0;

  const handleIrAAgenda = () => {
    onClose();
    setActiveModal(null);
    setCurrentTab('agenda');
  };

  const handleIrAFichaExpediente = () => {
    if (paciente?.id) {
      setSelectedPacienteFichaId(paciente.id);
    }
    onClose();
    setActiveModal(null);
    setCurrentTab('ficha_paciente');
  };

  const estadoPaciente = paciente.estado || 'activo';
  const nombrePaciente = paciente.apellidos_nombres || 'Paciente';

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-60 p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-850 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 print:max-h-none print:border-none print:shadow-none">
        {/* Cabecera de la Ficha */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/90 dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-xl">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                  Ficha Integral del Paciente
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                  HC: {paciente.hcl || 'S/N'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CSMC Centinela de Vida • Registro y Expediente Clínico Progresivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              title="Imprimir Ficha Clínica"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido Desplazable de la Ficha */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200">
          {/* SECCIÓN 1: DATOS PRINCIPALES DE FILIACIÓN (Siempre visible) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  Datos de Filiación y Admisión
                </span>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase">
                  {nombrePaciente}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {paciente.tipo_documento || 'DOC'}: {paciente.numero_documento || paciente.codigo_temporal || '-'}
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                    estadoPaciente === 'activo'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {estadoPaciente.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">N° Historia Clínica (HCL)</span>
                <span className="font-bold text-teal-700 dark:text-teal-400 font-mono text-sm">
                  {paciente.hcl || 'Sin HCL'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Fecha de Nacimiento</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {paciente.fecha_nacimiento || 'No registrada'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Edad / Sexo</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {paciente.edad !== undefined ? `${paciente.edad} años` : '-'} • {paciente.sexo === 'M' ? 'Masculino (♂)' : paciente.sexo === 'F' ? 'Femenino (♀)' : 'No especificado'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Estado Civil</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {paciente.estado_civil || 'SOLTERO'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Condición de Seguro</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                    {paciente.seguro}
                  </span>
                  {paciente.seguro === 'SIS' && (
                    <a
                      href="https://cel.sis.gob.pe/SisConsultaEnLinea"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                      title="Verificar SIS en línea"
                    >
                      <ExternalLink size={10} />
                      <span>SIS</span>
                    </a>
                  )}
                  {paciente.seguro === 'ESSALUD' && (
                    <a
                      href="https://dondemeatiendo.essalud.gob.pe/#/consulta"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                      title="Verificar EsSalud en línea"
                    >
                      <ExternalLink size={10} />
                      <span>EsSalud</span>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Distrito</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {paciente.distrito || 'Chincha Alta'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Dirección / Domicilio</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={paciente.direccion}>
                  {paciente.direccion || 'Sin registrar'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Celular / Teléfono</span>
                <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                  {paciente.celular || 'No registrado'}
                </span>
              </div>
            </div>

            {/* Datos del Tutor si aplica */}
            {paciente.tiene_tutor && (
              <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
                <span className="font-bold text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                  Tutor / Familiar Acompañante:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400">DNI del Tutor:</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {paciente.tutor_numero_documento || 'No registrado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Apellidos y Nombres:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                      {paciente.tutor_nombres || 'No registrado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Parentesco:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {paciente.tutor_parentesco || 'Padre'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ESTADO DE FLUJO PROGRESIVO: Si solo está registrado */}
          {!tieneCitas && !tieneTriajes && !tieneAtenciones && (
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-teal-900 dark:text-teal-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={20} className="text-teal-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Paciente con Registro de Admisión Completo</p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300">
                    Aún no cuenta con citas programadas ni atenciones registradas en el sistema.
                  </p>
                </div>
              </div>
              <button
                onClick={handleIrAAgenda}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
              >
                <Calendar size={14} />
                <span>+ Programar Primera Cita</span>
              </button>
            </div>
          )}

          {/* SECCIÓN 2: CITAS PROGRAMADAS (Visible si tiene citas o para gestionar) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-teal-600" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Citas y Programación Médica ({citasPaciente.length})
                </h4>
              </div>
              <button
                onClick={handleIrAAgenda}
                className="text-xs text-teal-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <PlusCircle size={13} />
                <span>Nueva Cita</span>
              </button>
            </div>

            {tieneCitas ? (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Profesional / Consultorio</th>
                      <th className="py-2.5 px-3">Motivo</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {citasPaciente.map((c) => {
                      const prof = profesionales.find((p) => p.id === c.profesional_id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {c.fecha_cita} • {c.hora_cita}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {c.tipo_cita}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {prof ? prof.apellidos_nombres : 'Por asignar'}
                            </span>
                            {prof?.profesion && (
                              <span className="text-[10px] text-slate-400 block">{prof.profesion}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {c.motivo_consulta || 'Consulta de Salud Mental'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.estado === 'ATENDIDA'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : c.estado === 'CONFIRMADA'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                  : c.estado === 'CANCELADA'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {c.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                Sin citas programadas para este paciente.
              </div>
            )}
          </div>

          {/* SECCIÓN 3: TRIAJE Y SIGNOS VITALES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-teal-600" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Signos Vitales y Triaje Clínico ({triajesPaciente.length})
              </h4>
            </div>

            {tieneTriajes ? (
              <div className="space-y-2">
                {triajesPaciente.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Fecha: {t.fecha} • Hora llegada: {t.hora_llegada}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.clasificacion_riesgo === 'ROJO'
                            ? 'bg-rose-600 text-white'
                            : t.clasificacion_riesgo === 'AMARILLO'
                            ? 'bg-amber-500 text-white'
                            : t.clasificacion_riesgo === 'VERDE'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        Prioridad: {t.clasificacion_riesgo}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block">P.A. (mmHg)</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {t.presion_arterial || '-'}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block">F.C. (lpm)</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {t.frecuencia_cardiaca || '-'}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block">F.R. (rpm)</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {t.frecuencia_respiratoria || '-'}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block">Temp (°C)</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {t.temperatura ? `${t.temperatura}°C` : '-'}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block">Sat. O2 (%)</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          {t.spo2 ? `${t.spo2}%` : '-'}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block">Peso / Talla / IMC</span>
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-[11px]">
                          {t.peso ? `${t.peso}kg` : '-'} • {t.imc ? `IMC ${t.imc}` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                Sin mediciones de triaje registradas.
              </div>
            )}
          </div>

          {/* SECCIÓN 4: ATENCIONES CLÍNICAS Y EVOLUCIÓN (HISTORIA CLÍNICA) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Stethoscope size={18} className="text-teal-600" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Atenciones Clínicas y Evolución de HC ({atencionesPaciente.length})
              </h4>
            </div>

            {tieneAtenciones ? (
              <div className="space-y-3">
                {atencionesPaciente.map((atn) => {
                  const prof = profesionales.find((p) => p.id === atn.profesional_id);
                  const fuaAsociado = fuas.find((f) => f.id === atn.fua_id);
                  return (
                    <div
                      key={atn.id}
                      className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3 text-xs"
                    >
                      {/* Cabecera de la consulta */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-700 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 rounded font-bold text-[11px]">
                            {atn.fecha_atencion} • {atn.hora_atencion}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            Atendido por: {prof ? prof.apellidos_nombres : 'Profesional CSMC'}
                          </span>
                        </div>
                        {fuaAsociado && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 font-bold">
                            FUA N° {fuaAsociado.numero_fua_formateado || fuaAsociado.numero_fua}
                          </span>
                        )}
                      </div>

                      {/* Motivo de consulta y examen */}
                      <div className="space-y-1.5">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            Motivo de Consulta / Relato:
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 pl-2 border-l-2 border-teal-500 mt-0.5">
                            {atn.motivo_consulta}
                          </p>
                        </div>

                        {atn.examen_mental && (
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                              Examen Clínico / Salud Mental:
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 pl-2 border-l-2 border-blue-400 mt-0.5">
                              {atn.examen_mental}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Diagnósticos CIE-10 */}
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] block mb-1">
                          Diagnósticos CIE-10:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {atn.cie10_1 && (
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold border border-slate-200 dark:border-slate-600">
                              <span className="font-mono font-bold text-teal-700 dark:text-teal-300 mr-1">
                                [{atn.cie10_1}]
                              </span>
                              {atn.diagnostico_1}
                            </span>
                          )}
                          {atn.cie10_2 && (
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold border border-slate-200 dark:border-slate-600">
                              <span className="font-mono font-bold text-teal-700 dark:text-teal-300 mr-1">
                                [{atn.cie10_2}]
                              </span>
                              {atn.diagnostico_2}
                            </span>
                          )}
                          {atn.cie10_3 && (
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold border border-slate-200 dark:border-slate-600">
                              <span className="font-mono font-bold text-teal-700 dark:text-teal-300 mr-1">
                                [{atn.cie10_3}]
                              </span>
                              {atn.diagnostico_3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Plan de Tratamiento */}
                      {atn.plan_tratamiento && (
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            Plan de Tratamiento e Indicaciones:
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                            {atn.plan_tratamiento}
                          </p>
                        </div>
                      )}

                      {/* Medicamentos Prescritos */}
                      {(() => {
                        const medsList = parseMedicamentosList(atn.medicamentos);
                        if (medsList.length === 0) return null;
                        return (
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/70">
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1 mb-1.5">
                              <Pill size={13} className="text-teal-600" />
                              Receta Médica / Prescripciones ({medsList.length}):
                            </span>
                            <div className="space-y-1">
                              {medsList.map((med, idx) => (
                                <div
                                  key={med.id || idx}
                                  className="text-[11px] flex flex-wrap items-center justify-between bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 gap-2"
                                >
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {med.medicamento || med.nombre} {med.concentracion ? `(${med.concentracion})` : ''}
                                  </span>
                                  <span className="text-slate-500">
                                    {med.dosis ? `Dosis: ${med.dosis}` : ''}{' '}
                                    {med.frecuencia ? `cada ${med.frecuencia}` : ''}{' '}
                                    {med.duracion ? `por ${med.duracion}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                El paciente aún no registra consultas médicas o atenciones en su Historia Clínica.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0 print:hidden">
          <button
            type="button"
            onClick={handleIrAFichaExpediente}
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <FileText size={14} />
            <span>Abrir Vista de Expediente Completo (Ficha HC)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleIrAAgenda}
              className="px-3.5 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
            >
              <Calendar size={13} />
              <span>Programar Cita</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
