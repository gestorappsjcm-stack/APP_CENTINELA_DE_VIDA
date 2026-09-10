import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PrioridadTriaje } from '../../types';
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  Heart,
  Thermometer,
  Wind,
  X,
  Building2,
} from 'lucide-react';

export const TriajeView: React.FC = () => {
  const { citas, pacientes, consultorios, triajes, addTriaje, setCurrentTab } = useApp();

  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'completado' | 'atendido'>('todos');
  const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);

  // Form de Triaje
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [pa, setPa] = useState('120/80');
  const [fc, setFc] = useState('75');
  const [fr, setFr] = useState('18');
  const [temp, setTemp] = useState('36.5');
  const [spo2, setSpo2] = useState('98');
  const [prioridad, setPrioridad] = useState<PrioridadTriaje>('VERDE');
  const [motivo, setMotivo] = useState('');
  const [consultorioId, setConsultorioId] = useState(consultorios[0]?.id || '');

  // Citas de hoy
  const hoyStr = new Date().toISOString().split('T')[0];
  const citasHoy = citas.filter((c) => c.fecha_cita === hoyStr || c.fecha_cita === '2026-09-10');

  // Cálculo de IMC
  const pesoNum = parseFloat(peso);
  const tallaNum = parseFloat(talla);
  const imcCalculado =
    pesoNum > 0 && tallaNum > 0 ? (pesoNum / Math.pow(tallaNum / 100, 2)).toFixed(1) : '--.-';

  const handleOpenTriaje = (citaId: string) => {
    setSelectedCitaId(citaId);
    setPeso('');
    setTalla('');
    setPa('120/80');
    setFc('75');
    setFr('18');
    setTemp('36.5');
    setSpo2('98');
    setPrioridad('VERDE');
    setMotivo('');
    setConsultorioId(consultorios[0]?.id || '');
  };

  const handleSaveTriaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCitaId) return;

    const cita = citas.find((c) => c.id === selectedCitaId);
    if (!cita) return;

    addTriaje({
      cita_id: cita.id,
      paciente_id: cita.paciente_id,
      profesional_id: cita.profesional_id,
      consultorio_id: consultorioId,
      peso: parseFloat(peso) || undefined,
      talla: parseFloat(talla) || undefined,
      presion_arterial: pa,
      imc: parseFloat(imcCalculado) || undefined,
      frecuencia_cardiaca: parseInt(fc, 10) || undefined,
      frecuencia_respiratoria: parseInt(fr, 10) || undefined,
      temperatura: parseFloat(temp) || undefined,
      spo2: parseInt(spo2, 10) || undefined,
      clasificacion_riesgo: prioridad,
      motivo_consulta: motivo.trim() || 'Evaluación inicial en triaje',
    });

    setSelectedCitaId(null);
  };

  const citaModal = citas.find((c) => c.id === selectedCitaId);
  const pacienteModal = pacientes.find((p) => p.id === citaModal?.paciente_id);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-xl">
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Módulo de Triaje de Enfermería
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Toma de constantes vitales, cálculo de IMC, clasificación de Manchester y derivación a consultorio
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentTab('atencion')}
          className="flex items-center gap-2 bg-[#1A2B4A] hover:bg-[#243b5e] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all self-start md:self-auto"
        >
          <span>Ir a Consultorios / Atención &rarr;</span>
        </button>
      </div>

      {/* Filtros de Estado */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-x-auto">
        <button
          onClick={() => setFiltroEstado('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            filtroEstado === 'todos' ? 'bg-[#1A2B4A] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todos ({citasHoy.length})
        </button>
        <button
          onClick={() => setFiltroEstado('pendiente')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            filtroEstado === 'pendiente' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🟡 Pendientes de Triaje ({citasHoy.filter((c) => !c.triaje_completado).length})
        </button>
        <button
          onClick={() => setFiltroEstado('completado')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            filtroEstado === 'completado' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🟢 Triaje Realizado ({citasHoy.filter((c) => c.triaje_completado && !c.atencion_completada).length})
        </button>
        <button
          onClick={() => setFiltroEstado('atendido')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            filtroEstado === 'atendido' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🔵 Atendidos en Consultorio ({citasHoy.filter((c) => c.atencion_completada).length})
        </button>
      </div>

      {/* Lista de Pacientes citados hoy para triaje */}
      <div className="space-y-3">
        {citasHoy
          .filter((c) => {
            if (filtroEstado === 'pendiente') return !c.triaje_completado;
            if (filtroEstado === 'completado') return c.triaje_completado && !c.atencion_completada;
            if (filtroEstado === 'atendido') return c.atencion_completada;
            return true;
          })
          .map((c) => {
            const pac = pacientes.find((p) => p.id === c.paciente_id);
            const triajeRealizado = triajes.find((t) => t.cita_id === c.id);

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-teal-500/50 transition-all"
              >
                <div className="flex items-start md:items-center gap-4">
                  {/* Hora Badge */}
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-center shrink-0">
                    <span className="text-sm font-black text-teal-800 dark:text-teal-300 block font-mono">
                      {c.hora_cita}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">Cita</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
                        {pac?.apellidos_nombres}
                      </h4>
                      {triajeRealizado && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            triajeRealizado.clasificacion_riesgo === 'ROJO'
                              ? 'bg-red-100 text-red-800'
                              : triajeRealizado.clasificacion_riesgo === 'AMARILLO'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Riesgo: {triajeRealizado.clasificacion_riesgo}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>
                        {pac?.tipo_documento}: {pac?.numero_documento || pac?.codigo_temporal}
                      </span>
                      <span>•</span>
                      <span>{pac?.edad ? `${pac?.edad} años` : 'Edad no reg.'}</span>
                      <span>•</span>
                      <span className="bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                        Seguro: {pac?.seguro || 'SIS'}
                      </span>
                    </div>

                    {triajeRealizado && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1.5 flex items-center gap-2">
                        <span>PA: {triajeRealizado.presion_arterial}</span>
                        <span>•</span>
                        <span>IMC: {triajeRealizado.imc || '-'}</span>
                        <span>•</span>
                        <span>SpO2: {triajeRealizado.spo2}%</span>
                        <span>•</span>
                        <span className="text-teal-700 dark:text-teal-400 font-semibold">
                          Derivado a: {consultorios.find((cons) => cons.id === triajeRealizado.consultorio_id)?.codigo || 'Consultorio'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  {!c.triaje_completado ? (
                    <button
                      onClick={() => handleOpenTriaje(c.id)}
                      className="flex items-center gap-1.5 bg-[#1A2B4A] hover:bg-[#243b5e] text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all"
                    >
                      <Stethoscope size={15} />
                      <span>Realizar Triaje</span>
                    </button>
                  ) : c.atencion_completada ? (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 size={14} /> Atendido en Consultorio
                    </span>
                  ) : (
                    <span className="text-xs text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-1 bg-teal-50 dark:bg-teal-950/30 px-3 py-1.5 rounded-lg border border-teal-200">
                      <Clock size={14} /> Esperando en Consultorio
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal Realizar Triaje */}
      {selectedCitaId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/70 dark:bg-slate-850">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Stethoscope size={18} className="text-teal-600" />
                  <span>Registrar Triaje de Enfermería</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Paciente: {pacienteModal?.apellidos_nombres} ({pacienteModal?.numero_documento || pacienteModal?.codigo_temporal})
                </p>
              </div>
              <button
                onClick={() => setSelectedCitaId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTriaje} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* 1. Signos Vitales */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 border-b border-slate-100 dark:border-slate-700 pb-1">
                  1. Constantes Vitales y Antropometría
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ej: 65.5"
                      value={peso}
                      onChange={(e) => setPeso(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Talla (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej: 165"
                      value={talla}
                      onChange={(e) => setTalla(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      IMC (kg/m²)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={imcCalculado}
                      className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Presión (PA)
                    </label>
                    <input
                      type="text"
                      placeholder="120/80"
                      value={pa}
                      onChange={(e) => setPa(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Frec. Cardíaca (lpm)
                    </label>
                    <input
                      type="number"
                      placeholder="72"
                      value={fc}
                      onChange={(e) => setFc(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Frec. Resp. (rpm)
                    </label>
                    <input
                      type="number"
                      placeholder="18"
                      value={fr}
                      onChange={(e) => setFr(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Temperatura (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="36.5"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Saturación SpO2 (%)
                    </label>
                    <input
                      type="number"
                      placeholder="98"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Clasificación Manchester */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 border-b border-slate-100 dark:border-slate-700 pb-1">
                  2. Clasificación de Riesgo de Manchester (Triage)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'ROJO' as const, label: 'ROJO (Emergencia)', desc: 'Atención Inmediata', bg: 'bg-red-500' },
                    { id: 'AMARILLO' as const, label: 'AMARILLO (Urgencia)', desc: 'Hasta 15 min', bg: 'bg-amber-500' },
                    { id: 'VERDE' as const, label: 'VERDE (Consulta)', desc: 'Atención regular', bg: 'bg-emerald-500' },
                    { id: 'AZUL' as const, label: 'AZUL (Preventivo)', desc: 'Sin urgencia', bg: 'bg-blue-500' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPrioridad(item.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        prioridad === item.id
                          ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-teal-600/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-3 h-3 rounded-full ${item.bg}`}></span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.id}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Motivo y Consultorio de Derivación */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 border-b border-slate-100 dark:border-slate-700 pb-1">
                  3. Relato y Asignación de Consultorio
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Motivo / Observaciones de Enfermería *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Estado general del paciente al ingreso..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Derivar a Consultorio Médico / Psicológico *
                  </label>
                  <select
                    value={consultorioId}
                    onChange={(e) => setConsultorioId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none cursor-pointer font-semibold text-teal-800 dark:text-teal-300"
                  >
                    {consultorios.map((cons) => (
                      <option key={cons.id} value={cons.id}>
                        {cons.codigo} - {cons.nombre} ({cons.profesional_nombre})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedCitaId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-lg shadow-md cursor-pointer"
                >
                  💾 Guardar Triaje y Derivar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
