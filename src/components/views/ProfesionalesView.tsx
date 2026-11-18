import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Profesional } from '../../types';
import { findUsuarioParaProfesional } from '../../lib/profesionalesHelper';
import { UserCheck, UserPlus, Plus, Search, Mail, Phone, Trash2, Power, Building2, Edit2, Clock } from 'lucide-react';

const PROFESIONES_CATALOGO = [
  { value: 'PSIQUIATRA', label: 'Médico Psiquiatra' },
  { value: 'MEDICO', label: 'Médico General / Familiar' },
  { value: 'PSICOLOGO', label: 'Psicólogo(a)' },
  { value: 'ENFERMERO', label: 'Lic. Enfermería' },
  { value: 'TERAPEUTA_OCUPACIONAL', label: 'Terapeuta Ocupacional' },
  { value: 'TERAPEUTA_LENGUAJE', label: 'Terapeuta de Lenguaje' },
  { value: 'TRABAJADOR_SOCIAL', label: 'Trabajador(a) Social' },
  { value: 'FARMACEUTICO', label: 'Químico Farmacéutico' },
  { value: 'ADMISION_SOPORTE', label: 'Admisión / Estadística / Soporte' },
  { value: 'OTRO', label: 'Otro Profesional' },
];

export const ProfesionalesView: React.FC = () => {
  const {
    profesionales,
    usuarios,
    consultorios,
    atenciones,
    currentUser,
    isDeveloperMode,
    canAccess,
    setCurrentTab,
    setPendingUsuarioProfesionalId,
    addProfesional,
    updateProfesional,
    toggleProfesional,
    deleteProfesional,
    deleteAllProfesionales,
  } = useApp();
  const isDeveloper = isDeveloperMode || currentUser.rol === 'desarrollador';
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfId, setEditingProfId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Form State
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'CE' | 'PASAPORTE'>('DNI');
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [profesion, setProfesion] = useState('PSICOLOGO');
  const [colegiatura, setColegiatura] = useState('');
  const [rne, setRne] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [consultorioAsignado, setConsultorioAsignado] = useState('');
  const [turnoHabitual, setTurnoHabitual] = useState<'MAÑANA' | 'TARDE' | 'ROTATIVO'>('MAÑANA');

  const filtrados = profesionales.filter((p) => {
    const term = searchTerm.toLowerCase();
    const cons = consultorios.find((c) => c.id === p.consultorioAsignado || c.codigo === p.consultorioAsignado);
    return (
      p.apellidos_nombres.toLowerCase().includes(term) ||
      p.profesion.toLowerCase().includes(term) ||
      (p.dni && p.dni.toLowerCase().includes(term)) ||
      (p.colegiatura && p.colegiatura.toLowerCase().includes(term)) ||
      (p.rne && p.rne.toLowerCase().includes(term)) ||
      (cons && `${cons.codigo} ${cons.nombre}`.toLowerCase().includes(term))
    );
  });

  const handleTipoDocumentoChange = (nuevoTipo: 'DNI' | 'CE' | 'PASAPORTE') => {
    setTipoDocumento(nuevoTipo);
    if (nuevoTipo === 'DNI') {
      setDni((prev) => prev.replace(/\D/g, '').slice(0, 8));
    } else if (nuevoTipo === 'CE') {
      setDni((prev) => prev.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12));
    } else {
      setDni((prev) => prev.replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 15));
    }
  };

  const openCreateModal = () => {
    setEditingProfId(null);
    setFormError('');
    setTipoDocumento('DNI');
    setDni('');
    setNombres('');
    setProfesion('PSICOLOGO');
    setColegiatura('');
    setRne('');
    setEspecialidad('');
    setCorreo('');
    setTelefono('');
    setConsultorioAsignado('');
    setTurnoHabitual('MAÑANA');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Profesional) => {
    const cons = consultorios.find((c) => c.id === p.consultorioAsignado || c.codigo === p.consultorioAsignado);
    const doc = (p.dni || '').trim();
    const tipoDetectado: 'DNI' | 'CE' | 'PASAPORTE' =
      p.tipo_documento || (doc && !/^\d{8}$/.test(doc) ? 'CE' : 'DNI');
    setEditingProfId(p.id);
    setFormError('');
    setTipoDocumento(tipoDetectado);
    setDni(doc);
    setNombres(p.apellidos_nombres || '');
    setProfesion(p.profesion || 'PSICOLOGO');
    setColegiatura(p.colegiatura || '');
    setRne(p.rne || '');
    setEspecialidad(p.especialidad || '');
    setCorreo(p.correo || '');
    setTelefono(p.telefono || '');
    setConsultorioAsignado(cons?.id || p.consultorioAsignado || '');
    setTurnoHabitual(p.turnoHabitual || 'MAÑANA');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!nombres.trim()) return;

    const docLimpio = dni.trim().toUpperCase();
    if (docLimpio) {
      if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(docLimpio)) {
        setFormError('El DNI debe tener exactamente 8 dígitos numéricos.');
        return;
      }
      if (tipoDocumento === 'CE' && docLimpio.length < 6) {
        setFormError('El Carnet de Extranjería (CE) debe tener al menos 6 caracteres.');
        return;
      }
      if (tipoDocumento === 'PASAPORTE' && docLimpio.length < 5) {
        setFormError('El Pasaporte debe tener al menos 5 caracteres.');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editingProfId) {
        const res = await updateProfesional(editingProfId, {
          tipo_documento: tipoDocumento,
          dni: docLimpio || undefined,
          apellidos_nombres: nombres.trim().toUpperCase(),
          profesion,
          colegiatura: colegiatura.trim().toUpperCase() || undefined,
          rne: rne.trim().toUpperCase() || undefined,
          especialidad: especialidad.trim() || undefined,
          correo: correo.trim() || undefined,
          telefono: telefono.trim() || undefined,
          consultorioAsignado: consultorioAsignado || undefined,
          turnoHabitual,
        });
        if (!res.success) {
          setFormError(res.error || 'No se pudo actualizar al profesional.');
          return;
        }
        setStatusMessage({ type: 'ok', text: 'Profesional y asignación de consultorio actualizados.' });
      } else {
        const res = await addProfesional({
          tipo_documento: tipoDocumento,
          dni: docLimpio || undefined,
          apellidos_nombres: nombres.trim().toUpperCase(),
          profesion,
          colegiatura: colegiatura.trim().toUpperCase() || undefined,
          rne: rne.trim().toUpperCase() || undefined,
          especialidad: especialidad.trim() || undefined,
          correo: correo.trim() || undefined,
          telefono: telefono.trim() || undefined,
          estado: 'ACTIVO',
          consultorioAsignado: consultorioAsignado || undefined,
          turnoHabitual,
        });

        if (!res.success) {
          setFormError(res.error || 'No se pudo registrar al profesional.');
          return;
        }
        setStatusMessage({ type: 'ok', text: 'Profesional registrado y guardado correctamente en Supabase.' });
      }

      setIsModalOpen(false);
      setEditingProfId(null);
      setTipoDocumento('DNI');
      setDni('');
      setNombres('');
      setColegiatura('');
      setRne('');
      setEspecialidad('');
      setCorreo('');
      setTelefono('');
      setConsultorioAsignado('');
      setTurnoHabitual('MAÑANA');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    setStatusMessage(null);
    const res = await deleteAllProfesionales();
    setIsDeletingAll(false);
    setConfirmDeleteAll(false);
    if (res.success) {
      setStatusMessage({ type: 'ok', text: 'Se eliminaron todos los profesionales registrados.' });
    } else {
      setStatusMessage({
        type: 'err',
        text: `Se limpió la vista local, pero Supabase devolvió: ${res.error || 'permiso denegado / llave foránea'}. Ejecuta DELETE FROM cv_profesionales; en Supabase SQL Editor.`,
      });
    }
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

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {isDeveloper && profesionales.length > 0 && (
            confirmDeleteAll ? (
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-semibold text-rose-700 dark:text-rose-300">
                  ¿Eliminar los {profesionales.length}?
                </span>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={handleConfirmDeleteAll}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isDeletingAll ? 'Eliminando...' : 'Sí, eliminar todos'}
                </button>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={() => setConfirmDeleteAll(false)}
                  className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(true)}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                <Trash2 size={15} />
                <span>Eliminar Todos ({profesionales.length})</span>
              </button>
            )
          )}

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#1A2B4A] hover:bg-[#243b5e] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all"
          >
            <Plus size={16} />
            <span>+ Registrar Profesional</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border ${
            statusMessage.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Toolbar Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs max-w-md">
        <Search size={15} className="text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI/CE, especialidad, colegiatura o RNE..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
        />
      </div>

      {/* Grid de Profesionales */}
      {filtrados.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
            <UserCheck size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            {profesionales.length === 0
              ? 'No hay profesionales registrados aún'
              : 'No se encontraron profesionales con ese criterio'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {profesionales.length === 0
              ? 'La base de profesionales está en blanco lista para ingresar tu equipo médico y asistencial real.'
              : 'Prueba buscando con otro nombre, DNI/CE o número de colegiatura.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtrados.map((p) => {
            const atencionesRealizadas = atenciones.filter((a) => a.profesional_id === p.id).length;
            const consAsignado = consultorios.find(
              (c) => c.id === p.consultorioAsignado || c.codigo === p.consultorioAsignado
            );

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                        {p.apellidos_nombres[0] || 'P'}
                        {p.apellidos_nombres.split(' ')[1]?.[0] || 'M'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {p.apellidos_nombres}
                        </h4>
                        <div className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                          {PROFESIONES_CATALOGO.find((pr) => pr.value === p.profesion)?.label || p.profesion}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase shrink-0 ${
                        p.estado === 'ACTIVO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.estado}
                    </span>
                  </div>

                  {/* Badge Consultorio Asignado */}
                  <div
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
                      consAsignado
                        ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
                        : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 size={13} className="shrink-0" />
                      <span className="font-bold truncate">
                        {consAsignado ? `${consAsignado.codigo} — ${consAsignado.nombre}` : 'Sin consultorio asignado'}
                      </span>
                    </div>
                    {consAsignado && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/60 shrink-0">
                        <Clock size={10} />
                        {p.turnoHabitual || 'MAÑANA'}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl">
                    {p.dni && (
                      <div className="flex justify-between">
                        <span>
                          {p.tipo_documento || (/^\d{8}$/.test(p.dni.trim()) ? 'DNI' : 'CE')}:
                        </span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {p.dni}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Colegiatura:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {p.colegiatura || 'No reg.'}
                      </span>
                    </div>
                    {p.rne && (
                      <div className="flex justify-between">
                        <span>Reg. Especialidad (RNE):</span>
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                          {p.rne}
                        </span>
                      </div>
                    )}
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

                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60">
                  {canAccess('gestion_usuarios') ? (
                    (() => {
                      const usuarioVinc = findUsuarioParaProfesional(p, usuarios);
                      return usuarioVinc ? (
                        <button
                          type="button"
                          onClick={() => setCurrentTab('gestion_usuarios')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                          title="Este profesional ya cuenta con acceso al sistema"
                        >
                          <UserCheck size={11} />
                          <span>@{usuarioVinc.usuario}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingUsuarioProfesionalId(p.id);
                            setCurrentTab('gestion_usuarios');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
                          title="Crear usuario de acceso jalando automáticamente los datos de este profesional"
                        >
                          <UserPlus size={12} />
                          <span>Crear Usuario</span>
                        </button>
                      );
                    })()
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer"
                      title="Editar datos o asignar consultorio"
                    >
                      <Edit2 size={12} />
                      <span>Editar / Consultorio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleProfesional(p.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      title={p.estado === 'ACTIVO' ? 'Desactivar profesional' : 'Activar profesional'}
                    >
                      <Power size={12} />
                      <span>{p.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}</span>
                    </button>
                    {isDeveloper && (confirmDeleteId === p.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            deleteProfesional(p.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        title="Eliminar profesional (Exclusivo Desarrollador)"
                      >
                        <Trash2 size={12} />
                        <span>Eliminar</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 my-auto">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {editingProfId ? 'Editar Profesional y Asignación de Consultorio' : 'Registrar Nuevo Profesional de Salud'}
            </h3>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tipo de Documento</label>
                  <select
                    value={tipoDocumento}
                    onChange={(e) => handleTipoDocumentoChange(e.target.value as 'DNI' | 'CE' | 'PASAPORTE')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                  >
                    <option value="DNI">DNI (Nacional - 8 dígitos)</option>
                    <option value="CE">CE (Carnet de Extranjería)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {tipoDocumento === 'DNI'
                      ? 'N° DNI'
                      : tipoDocumento === 'CE'
                        ? 'N° Carnet de Extranjería (CE)'
                        : 'N° de Pasaporte'}
                  </label>
                  <input
                    type="text"
                    maxLength={tipoDocumento === 'DNI' ? 8 : tipoDocumento === 'CE' ? 12 : 15}
                    placeholder={
                      tipoDocumento === 'DNI'
                        ? '8 dígitos'
                        : tipoDocumento === 'CE'
                          ? 'Ej: 001234567 (9 a 12 caracteres)'
                          : 'Ej: A12345678'
                    }
                    value={dni}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (tipoDocumento === 'DNI') {
                        setDni(raw.replace(/\D/g, ''));
                      } else if (tipoDocumento === 'CE') {
                        setDni(raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase());
                      } else {
                        setDni(raw.replace(/[^A-Za-z0-9-]/g, '').toUpperCase());
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Profesión *</label>
                  <select
                    value={profesion}
                    onChange={(e) => setProfesion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {PROFESIONES_CATALOGO.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    Colegiatura Profesional (CMP / CPsP / CEP)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: CMP-65432"
                    value={colegiatura}
                    onChange={(e) => setColegiatura(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Reg. de Especialista (RNE) <span className="text-slate-400 font-normal">(si aplica)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: RNE-29412"
                    value={rne}
                    onChange={(e) => setRne(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              {/* Asignación a Consultorio y Turno */}
              <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-200">
                  <Building2 size={14} />
                  <span>Asignación de Consultorio y Turno (6 horas)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Consultorio Asignado
                    </label>
                    <select
                      value={consultorioAsignado}
                      onChange={(e) => setConsultorioAsignado(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg font-semibold"
                    >
                      <option value="">-- Sin consultorio asignado --</option>
                      {consultorios.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} — {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Turno Habitual
                    </label>
                    <select
                      value={turnoHabitual}
                      onChange={(e) => setTurnoHabitual(e.target.value as 'MAÑANA' | 'TARDE' | 'ROTATIVO')}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg font-semibold"
                    >
                      <option value="MAÑANA">Mañana (08:00 - 14:00)</option>
                      <option value="TARDE">Tarde (14:00 - 20:00)</option>
                      <option value="ROTATIVO">Rotativo (M/T)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    Correo Electrónico <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Opcional (ej: correo@centinela.gob.pe)"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Celular <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Opcional (ej: 999999999)"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 font-bold bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {isSaving
                    ? 'Guardando...'
                    : editingProfId
                      ? 'Guardar Cambios'
                      : 'Guardar Profesional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
