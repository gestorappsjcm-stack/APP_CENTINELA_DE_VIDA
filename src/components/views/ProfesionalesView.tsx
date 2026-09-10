import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Profesional } from '../../types';
import { UserCheck, Plus, Search, Mail, Phone, Award, Stethoscope, Building2 } from 'lucide-react';

export const ProfesionalesView: React.FC = () => {
  const { profesionales, atenciones, addProfesional } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [nombres, setNombres] = useState('');
  const [profesion, setProfesion] = useState('Médico Psiquiatra');
  const [colegiatura, setColegiatura] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');

  const filtrados = profesionales.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.apellidos_nombres.toLowerCase().includes(term) ||
      p.profesion.toLowerCase().includes(term) ||
      (p.colegiatura && p.colegiatura.toLowerCase().includes(term))
    );
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombres.trim()) return;

    addProfesional({
      apellidos_nombres: nombres.trim().toUpperCase(),
      profesion,
      colegiatura: colegiatura.trim() || undefined,
      especialidad: especialidad.trim() || undefined,
      correo: correo.trim() || undefined,
      telefono: telefono.trim() || undefined,
      estado: 'ACTIVO',
    });

    setIsModalOpen(false);
    setNombres('');
    setColegiatura('');
    setEspecialidad('');
    setCorreo('');
    setTelefono('');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 rounded-xl">
            <UserCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Equipo de Profesionales de la Salud
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Cuerpo médico, psiquiatras, psicólogos, enfermeros y terapeutas del CSMC
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#1A2B4A] hover:bg-[#243b5e] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all self-start md:self-auto"
        >
          <Plus size={16} />
          <span>+ Registrar Profesional</span>
        </button>
      </div>

      {/* Toolbar Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs max-w-md">
        <Search size={15} className="text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, especialidad o colegiatura..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
        />
      </div>

      {/* Grid de Profesionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtrados.map((p) => {
          const atencionesRealizadas = atenciones.filter((a) => a.profesional_id === p.id).length;

          return (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm uppercase">
                      {p.apellidos_nombres[0]}
                      {p.apellidos_nombres.split(' ')[1]?.[0] || 'M'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {p.apellidos_nombres}
                      </h4>
                      <div className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                        {p.profesion}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      p.estado === 'ACTIVO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {p.estado}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span>Colegiatura:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {p.colegiatura || 'No reg.'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Especialidad:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {p.especialidad || 'General'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Atenciones Realizadas:</span>
                    <span className="font-bold text-teal-600">
                      {atencionesRealizadas} registradas
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 pt-1">
                  {p.correo && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={12} className="text-slate-400" />
                      <span>{p.correo}</span>
                    </div>
                  )}
                  {p.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400" />
                      <span>{p.telefono}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Registrar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Registrar Nuevo Profesional de Salud
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Apellidos y Nombres *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: MEDINA ROJAS, LUIS ALBERTO"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Profesión</label>
                  <select
                    value={profesion}
                    onChange={(e) => setProfesion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Médico Psiquiatra">Médico Psiquiatra</option>
                    <option value="Médico General">Médico General</option>
                    <option value="Psicólogo(a)">Psicólogo(a)</option>
                    <option value="Lic. Enfermería">Lic. Enfermería</option>
                    <option value="Terapeuta Ocupacional">Terapeuta Ocupacional</option>
                    <option value="Trabajador(a) Social">Trabajador(a) Social</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Colegiatura (CMP/CPsP)</label>
                  <input
                    type="text"
                    placeholder="Ej: CMP-65432"
                    value={colegiatura}
                    onChange={(e) => setColegiatura(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Especialidad / Subespecialidad</label>
                <input
                  type="text"
                  placeholder="Ej: Psiquiatría de Niños y Adolescentes"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="correo@centinela.gob.pe"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Celular</label>
                  <input
                    type="text"
                    placeholder="999999999"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-lg cursor-pointer"
                >
                  Guardar Profesional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
