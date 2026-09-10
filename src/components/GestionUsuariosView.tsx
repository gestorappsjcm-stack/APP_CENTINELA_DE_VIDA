import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Usuario, ModuleId, RolUsuario } from '../types';
import { MODULOS_SISTEMA } from '../data/mockData';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  KeyRound,
  Check,
  X,
  UserCheck,
  Lock,
  Search,
  LogIn,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const GestionUsuariosView: React.FC = () => {
  const {
    usuarios,
    currentUser,
    setCurrentUser,
    addUsuario,
    updateUsuario,
    deleteUsuario,
    toggleUsuarioEstado,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [rolFilter, setRolFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    nombres: string;
    apellidos: string;
    usuario: string;
    contrasena: string;
    rol: RolUsuario;
    correo: string;
    telefono: string;
    estado: 'activo' | 'inactivo';
    permisosModulos: ModuleId[];
  }>({
    nombres: '',
    apellidos: '',
    usuario: '',
    contrasena: '',
    rol: 'general',
    correo: '',
    telefono: '',
    estado: 'activo',
    permisosModulos: ['dashboard'],
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFormData({
      nombres: '',
      apellidos: '',
      usuario: '',
      contrasena: '',
      rol: 'general',
      correo: '',
      telefono: '',
      estado: 'activo',
      permisosModulos: ['dashboard', 'agenda'],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (user: Usuario) => {
    setEditingUserId(user.id);
    setFormData({
      nombres: user.nombres,
      apellidos: user.apellidos,
      usuario: user.usuario,
      contrasena: '',
      rol: user.rol,
      correo: user.correo || '',
      telefono: user.telefono || '',
      estado: user.estado,
      permisosModulos: [...user.permisosModulos],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Toggle de un permiso específico
  const togglePermiso = (modId: ModuleId) => {
    setFormData((prev) => {
      const exists = prev.permisosModulos.includes(modId);
      const updated = exists
        ? prev.permisosModulos.filter((id) => id !== modId)
        : [...prev.permisosModulos, modId];
      return { ...prev, permisosModulos: updated };
    });
  };

  // Aplicar Presets de permisos
  const applyPreset = (preset: 'todos' | 'medico' | 'triaje' | 'admision' | 'minimo') => {
    if (preset === 'todos') {
      setFormData((prev) => ({
        ...prev,
        permisosModulos: MODULOS_SISTEMA.map((m) => m.id),
      }));
    } else if (preset === 'medico') {
      setFormData((prev) => ({
        ...prev,
        rol: 'medico',
        permisosModulos: ['dashboard', 'pacientes', 'agenda', 'atencion', 'programacion_anual', 'reportes'],
      }));
    } else if (preset === 'triaje') {
      setFormData((prev) => ({
        ...prev,
        rol: 'enfermero',
        permisosModulos: ['dashboard', 'agenda', 'triaje', 'display_turnos', 'reportes'],
      }));
    } else if (preset === 'admision') {
      setFormData((prev) => ({
        ...prev,
        rol: 'admision',
        permisosModulos: ['dashboard', 'pacientes', 'agenda', 'programacion_turnos', 'display_turnos'],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permisosModulos: ['dashboard'],
      }));
    }
  };

  // Guardar usuario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.nombres.trim() || !formData.apellidos.trim() || !formData.usuario.trim()) {
      setFormError('Nombres, Apellidos y Nombre de usuario son obligatorios.');
      return;
    }

    // Si es nuevo, contraseña requerida
    if (!editingUserId && !formData.contrasena.trim()) {
      setFormError('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    // Verificar usuario único
    const existeUsuario = usuarios.some(
      (u) => u.usuario.toLowerCase() === formData.usuario.toLowerCase() && u.id !== editingUserId
    );
    if (existeUsuario) {
      setFormError(`El nombre de usuario "${formData.usuario}" ya está en uso.`);
      return;
    }

    if (editingUserId) {
      const updates: Partial<Usuario> = {
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        usuario: formData.usuario.trim().toLowerCase(),
        rol: formData.rol,
        correo: formData.correo.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        estado: formData.estado,
        permisosModulos: formData.permisosModulos,
      };
      if (formData.contrasena.trim()) {
        updates.contrasena = formData.contrasena.trim();
      }
      updateUsuario(editingUserId, updates);
    } else {
      addUsuario({
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        usuario: formData.usuario.trim().toLowerCase(),
        contrasena: formData.contrasena.trim(),
        rol: formData.rol,
        correo: formData.correo.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        estado: formData.estado,
        permisosModulos: formData.permisosModulos,
      });
    }

    setIsModalOpen(false);
  };

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter((u) => {
    const matchesSearch =
      u.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.usuario.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = !rolFilter || u.rol === rolFilter;
    return matchesSearch && matchesRol;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Gestión de Usuarios y Autorización de Módulos
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Creación de cuentas, asignación de roles y permisos de acceso para cada módulo del sistema
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-[#1A2B4A] hover:bg-[#243b5e] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all self-start md:self-auto"
        >
          <UserPlus size={16} />
          <span>+ Nuevo Usuario</span>
        </button>
      </div>

      {/* Info Banner sobre control de acceso */}
      <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 rounded-xl flex items-start gap-3 text-xs text-teal-900 dark:text-teal-200">
        <HelpCircle size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Control de Seguridad y Acceso por Módulos:</span>
          <p>
            Los usuarios con rol <strong>Administrador</strong> tienen acceso irrestricto a todas las funciones. Los usuarios con rol <strong>General</strong> (médicos, psicólogos, enfermeros o admisión) únicamente visualizan y operan los módulos que hayan sido expresamente marcados en su matriz de autorización.
          </p>
        </div>
      </div>

      {/* Toolbar: Buscador y Filtro por Rol */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Filtrar Rol:</span>
          <select
            value={rolFilter}
            onChange={(e) => setRolFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="medico">Médico / Psiquiatra</option>
            <option value="psicologo">Psicólogo(a)</option>
            <option value="enfermero">Enfermero(a)</option>
            <option value="admision">Admisión</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Listado de Usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usuariosFiltrados.map((u) => {
          const isCurrent = currentUser.id === u.id;
          const isAdmin = u.rol === 'administrador';

          return (
            <div
              key={u.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3.5">
                {/* User Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm shadow-inner uppercase">
                      {u.nombres[0]}
                      {u.apellidos[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {u.nombres} {u.apellidos}
                        </h4>
                        {isCurrent && (
                          <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            SESIÓN ACTUAL
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>@{u.usuario}</span>
                        <span>•</span>
                        <span className="capitalize font-semibold text-teal-700 dark:text-teal-400">
                          {u.rol}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      u.estado === 'activo'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                    }`}
                  >
                    {u.estado}
                  </span>
                </div>

                {/* Contact info */}
                <div className="text-xs text-slate-500 space-y-0.5 bg-slate-50/70 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span>Correo:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {u.correo || 'No registrado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Teléfono:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {u.telefono || 'No registrado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Último Acceso:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {u.ultimoAcceso || 'Reciente'}
                    </span>
                  </div>
                </div>

                {/* Módulos Autorizados */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Lock size={12} className="text-teal-600" />
                      Módulos Autorizados ({isAdmin ? 'Todos' : u.permisosModulos.length}):
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {isAdmin ? (
                      <span className="bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                        ⚡ Acceso Total a todos los módulos del sistema
                      </span>
                    ) : u.permisosModulos.length === 0 ? (
                      <span className="text-[11px] text-rose-500 italic">
                        Sin módulos asignados (Acceso restringido)
                      </span>
                    ) : (
                      u.permisosModulos.map((modId) => {
                        const modDef = MODULOS_SISTEMA.find((m) => m.id === modId);
                        return (
                          <span
                            key={modId}
                            className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-md"
                          >
                            {modDef?.label || modId}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 gap-2">
                <button
                  onClick={() => setCurrentUser(u)}
                  title="Cambiar sesión activa a este usuario para probar sus permisos"
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <LogIn size={13} />
                  <span>{isCurrent ? 'Activo' : 'Iniciar como'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleUsuarioEstado(u.id)}
                    title={u.estado === 'activo' ? 'Desactivar usuario' : 'Activar usuario'}
                    className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      u.estado === 'activo'
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {u.estado === 'activo' ? 'Inactivar' : 'Activar'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(u)}
                    title="Editar usuario y permisos"
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg cursor-pointer transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>

                  {u.id !== 'usr-1' && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar al usuario @${u.usuario}?`)) {
                          deleteUsuario(u.id);
                        }
                      }}
                      title="Eliminar usuario"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Creación / Edición de Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/40 text-teal-700 rounded-lg">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingUserId ? 'Editar Usuario y Permisos' : 'Registrar Nuevo Usuario'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina las credenciales y autorizaciones de acceso a los módulos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Datos Personales y Cuenta */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 border-b border-slate-100 dark:border-slate-700 pb-1">
                  1. Datos de la Cuenta y Personal
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carmen Rosa"
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Rivera Salazar"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre de Usuario (Login) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: crivera"
                      value={formData.usuario}
                      onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contraseña {editingUserId ? '(Dejar vacío para no cambiar)' : '*'}
                    </label>
                    <input
                      type="password"
                      placeholder={editingUserId ? '••••••••' : 'Ingrese clave segura'}
                      value={formData.contrasena}
                      onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Rol Asignado *
                    </label>
                    <select
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value as RolUsuario })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="administrador">Administrador (Acceso total)</option>
                      <option value="medico">Médico / Psiquiatra</option>
                      <option value="psicologo">Psicólogo(a)</option>
                      <option value="enfermero">Enfermero(a) Triaje</option>
                      <option value="admision">Admisión / Recepción</option>
                      <option value="general">Usuario General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="usuario@centinela.gob.pe"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Estado
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Matriz de Autorización de Módulos */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    2. Autorización de Uso de Módulos (Permisos de Acceso)
                  </h4>

                  {/* Presets Rápidos */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('todos')}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-medium cursor-pointer"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('medico')}
                      className="text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-medium cursor-pointer"
                    >
                      Asistencial
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('triaje')}
                      className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium cursor-pointer"
                    >
                      Triaje
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('admision')}
                      className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium cursor-pointer"
                    >
                      Admisión
                    </button>
                  </div>
                </div>

                {formData.rol === 'administrador' ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <Check size={16} className="text-blue-600 shrink-0" />
                    <span>
                      Como <strong>Administrador</strong>, este usuario tiene acceso automático a todos los módulos actuales y futuros.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {MODULOS_SISTEMA.map((mod) => {
                      const isChecked = formData.permisosModulos.includes(mod.id);

                      return (
                        <label
                          key={mod.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-teal-50/70 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800 text-teal-950 dark:text-teal-200'
                              : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermiso(mod.id)}
                            className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-semibold block">{mod.label}</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">
                              {mod.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-lg shadow-md cursor-pointer transition-all"
                >
                  {editingUserId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
