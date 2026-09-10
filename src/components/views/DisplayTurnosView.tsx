import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Monitor, Volume2, Clock, Building2, BellRing, Sparkles } from 'lucide-react';

export const DisplayTurnosView: React.FC = () => {
  const { citas, pacientes, consultorios, triajes } = useApp();
  const [horaActual, setHoraActual] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Paciente llamado actualmente
  const citaLlamada = citas.find((c) => c.llamado_pantalla && c.estado !== 'ATENDIDA');
  const pacienteLlamado = pacientes.find((p) => p.id === citaLlamada?.paciente_id);
  const consultorioLlamado = consultorios.find((cons) => cons.id === citaLlamada?.consultorio_id);

  // Pacientes en espera
  const pacientesEnEspera = citas.filter(
    (c) => c.id !== citaLlamada?.id && c.estado !== 'ATENDIDA' && c.estado !== 'CANCELADA'
  );

  return (
    <div className="min-h-[85vh] bg-[#0F172A] text-white p-6 md:p-10 flex flex-col justify-between rounded-2xl shadow-2xl space-y-6">
      {/* Top TV Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <Monitor size={26} />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-teal-400">
              MINISTERIO DE SALUD • GOBIERNO REGIONAL DE ICA
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              CSMC CENTINELA DE VIDA - SALA DE ESPERA
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 px-5 py-2.5 rounded-2xl">
          <Clock size={20} className="text-teal-400" />
          <div className="text-2xl md:text-3xl font-mono font-extrabold text-white tracking-wider">
            {horaActual}
          </div>
        </div>
      </div>

      {/* Main Grid: Hero Llamado & Cola de Espera */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
        {/* Columna Izquierda (2 cols): Turno Convocado */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-[#162032] border border-slate-700/60 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-400 font-bold uppercase tracking-wider text-xs">
              <BellRing size={16} className="animate-bounce" />
              <span>Llamado de Paciente a Consultorio</span>
            </div>
            <span className="bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-full border border-teal-500/30">
              ATENCIÓN INMEDIATA
            </span>
          </div>

          <div className="relative z-10 my-8 space-y-4">
            {citaLlamada && pacienteLlamado ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Por favor acercarse al servicio:
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight uppercase">
                  {pacienteLlamado.apellidos_nombres}
                </h2>

                <div className="inline-flex flex-wrap items-center gap-4 bg-teal-500/15 border border-teal-500/40 px-6 py-4 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-teal-300 font-bold uppercase block">
                      Consultorio de Destino
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-teal-300 font-mono">
                      {consultorioLlamado?.codigo || 'CONS-01'}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-teal-500/30 hidden sm:block"></div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Especialidad / Médico
                    </span>
                    <span className="text-base sm:text-lg font-bold text-white">
                      {consultorioLlamado?.nombre} • {consultorioLlamado?.profesional_nombre}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                  <Volume2 size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-400">
                  Esperando el próximo llamado médico...
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Los pacientes citados serán notificados en este panel con el consultorio correspondiente.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Info */}
          <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-4">
            <span>Sede Chincha Alta • Jr. Los Ángeles s/n</span>
            <span className="text-teal-400 font-semibold">Salud Mental para Todos</span>
          </div>

          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Columna Derecha: Próximos Turnos en Espera */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">
                Próximos en Espera
              </h3>
              <span className="text-xs font-mono text-teal-400 font-bold">
                {pacientesEnEspera.length} en cola
              </span>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {pacientesEnEspera.slice(0, 6).map((c, idx) => {
                const pac = pacientes.find((p) => p.id === c.paciente_id);
                const cons = consultorios.find((cons) => cons.id === c.consultorio_id);

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-white max-w-[170px] truncate">
                          {pac?.apellidos_nombres}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {cons?.codigo || 'CONSULTORIO'} • {c.hora_cita}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
                      En Sala
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Conserve su turno y preste atención al llamado sonoro.
          </div>
        </div>
      </div>
    </div>
  );
};
