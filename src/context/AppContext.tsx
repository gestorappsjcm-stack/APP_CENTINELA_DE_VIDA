import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Paciente,
  Profesional,
  Consultorio,
  Cita,
  Triaje,
  AtencionClinica,
  Usuario,
  ModuleId,
  DatosProgramacionMes,
  FUA,
  FuaConfig,
} from '../types';
import {
  INITIAL_USUARIOS,
  INITIAL_CONSULTORIOS,
  INITIAL_PROFESIONALES,
  INITIAL_PACIENTES,
  INITIAL_CITAS,
  INITIAL_TRIAJES,
  INITIAL_ATENCIONES,
  INITIAL_FUAS,
} from '../data/mockData';
import { supabaseService, SupabaseDashboardStats } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

interface AppContextType {
  // Autenticación y permisos
  currentUser: Usuario;
  setCurrentUser: (user: Usuario) => void;
  usuarios: Usuario[];
  addUsuario: (usuario: Omit<Usuario, 'id' | 'fechaCreacion'>) => void;
  updateUsuario: (id: string, data: Partial<Usuario>) => void;
  deleteUsuario: (id: string) => void;
  toggleUsuarioEstado: (id: string) => void;
  canAccess: (moduleId: ModuleId) => boolean;
  isLoggedOut: boolean;
  setIsLoggedOut: (val: boolean) => void;
  loginUser: (username: string, pass: string) => { success: boolean; error?: string };
  logoutUser: () => void;

  // Navegación
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  selectedPacienteFichaId: string | null;
  setSelectedPacienteFichaId: (id: string | null) => void;

  // Pacientes
  pacientes: Paciente[];
  addPaciente: (paciente: Omit<Paciente, 'id' | 'fecha_ingreso'>) => { success: boolean; message?: string; error?: string };
  updatePaciente: (id: string, data: Partial<Paciente>) => void;
  deletePaciente: (id: string) => void;

  // FUA (SIS)
  fuas: FUA[];
  fuaConfig: FuaConfig;
  updateFuaConfig: (config: Partial<FuaConfig>) => void;
  addFUA: (fua: Omit<FUA, 'id' | 'numero_fua' | 'fecha' | 'hora' | 'estado'>) => { success: boolean; fuaId?: string; numeroFua?: string; error?: string };
  updateFUA: (id: string, data: Partial<FUA>) => void;
  deleteFUA: (id: string) => void;

  // Profesionales
  profesionales: Profesional[];
  addProfesional: (prof: Omit<Profesional, 'id'>) => { success: boolean; error?: string };
  updateProfesional: (id: string, data: Partial<Profesional>) => void;
  toggleProfesional: (id: string) => void;
  deleteProfesional: (id: string) => void;

  // Consultorios
  consultorios: Consultorio[];
  updateConsultorio: (id: string, data: Partial<Consultorio>) => void;

  // Citas
  citas: Cita[];
  addCita: (cita: Omit<Cita, 'id'>) => { success: boolean; error?: string };
  confirmarCita: (id: string) => void;
  cancelarCita: (id: string, motivo?: string) => void;

  // Triajes
  triajes: Triaje[];
  addTriaje: (triaje: Omit<Triaje, 'id' | 'hora_llegada' | 'estado' | 'fecha'>) => { success: boolean; error?: string };
  llamarPaciente: (triajeId: string) => void;

  // Atenciones
  atenciones: AtencionClinica[];
  addAtencion: (atencion: Omit<AtencionClinica, 'id' | 'fecha_atencion' | 'hora_atencion' | 'estado'>) => { success: boolean; error?: string };

  // Datos Calculados para Programación Anual
  getProgramacionAnual: (anio: number, filtroProfesionalId?: string) => DatosProgramacionMes[];

  // Supabase Base de Datos
  isSupabaseConfigured: boolean;
  supabaseStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  supabaseMessage: string;
  supabaseLiveStats: SupabaseDashboardStats | null;
  isSyncing: boolean;
  syncWithSupabase: () => Promise<void>;

  // Tema
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'centinela_vida_csmc_state_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialización con persistencia local
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_usuarios`);
    return saved ? JSON.parse(saved) : INITIAL_USUARIOS;
  });

  const [currentUser, setCurrentUser] = useState<Usuario>(() => {
    const savedSession = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_active_session`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) return parsed;
      } catch (e) {
        console.warn('Error leyendo sesion activa:', e);
      }
    }
    return usuarios[0] || INITIAL_USUARIOS[0];
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedPacienteFichaId, setSelectedPacienteFichaId] = useState<string | null>(null);
  // Por defecto, iniciar SIEMPRE en la pantalla de Login a menos que exista una sesión activa
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(() => {
    const active = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_active_session`);
    return !active;
  });

  const [pacientes, setPacientes] = useState<Paciente[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_pacientes`);
    return saved ? JSON.parse(saved) : INITIAL_PACIENTES;
  });

  const [fuas, setFuas] = useState<FUA[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_fuas`);
    return saved ? JSON.parse(saved) : INITIAL_FUAS;
  });

  const [fuaConfig, setFuaConfig] = useState<FuaConfig>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_fua_config`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Error parseando fua_config:', e);
      }
    }
    return {
      codigo_renipress: '00003414',
      anio: 2026,
      rango_maximo: 100,
      ultimo_numero: INITIAL_FUAS.length,
      nombre_ipress: 'HOSPITAL SAN JOSÉ DE CHINCHA',
    };
  });

  const updateFuaConfig = (cfg: Partial<FuaConfig>) => {
    setFuaConfig((prev) => {
      const updated = { ...prev, ...cfg };
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_fua_config`, JSON.stringify(updated));
      return updated;
    });
  };

  const [profesionales, setProfesionales] = useState<Profesional[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_profesionales`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 30) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error parseando profesionales:', e);
      }
    }
    return INITIAL_PROFESIONALES;
  });

  const [consultorios, setConsultorios] = useState<Consultorio[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_consultorios`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 13) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error parseando consultorios:', e);
      }
    }
    return INITIAL_CONSULTORIOS;
  });

  const [citas, setCitas] = useState<Cita[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_citas`);
    return saved ? JSON.parse(saved) : INITIAL_CITAS;
  });

  const [triajes, setTriajes] = useState<Triaje[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_triajes`);
    return saved ? JSON.parse(saved) : INITIAL_TRIAJES;
  });

  const [atenciones, setAtenciones] = useState<AtencionClinica[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_atenciones`);
    return saved ? JSON.parse(saved) : INITIAL_ATENCIONES;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_theme`);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  // Sincronizar clase .dark y data-theme en el elemento <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_theme`, theme);
    } catch (e) {
      console.warn('Error guardando tema:', e);
    }
  }, [theme]);

  // Supabase States
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>(
    isSupabaseConfigured() ? 'connecting' : 'disconnected'
  );
  const [supabaseMessage, setSupabaseMessage] = useState<string>(
    isSupabaseConfigured()
      ? 'Conectando con Supabase (esquema CSMC Centinela de Vida)...'
      : 'Modo Local / Almacenamiento Seguro (Configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para enlazar Supabase)'
  );
  const [supabaseLiveStats, setSupabaseLiveStats] = useState<SupabaseDashboardStats | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sincronización con Supabase (tablas cv_* y vistas v_cv_*)
  const syncWithSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setSupabaseStatus('disconnected');
      setSupabaseMessage('Credenciales de Supabase no configuradas (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).');
      return;
    }

    setIsSyncing(true);
    setSupabaseStatus('connecting');
    setSupabaseMessage('Consultando tablas cv_* y vistas v_cv_* en Supabase...');

    try {
      const conn = await supabaseService.checkConnection();
      if (!conn.connected) {
        setSupabaseStatus('error');
        setSupabaseMessage(conn.message);
        setIsSyncing(false);
        return;
      }

      setSupabaseStatus('connected');
      setSupabaseMessage(conn.message);

      // Cargar datos en vivo desde Supabase
      const [liveStats, supaPacientes, supaCitas, supaAtenciones, supaTriajes, supaProfesionales, supaUsuarios, supaFuas] = await Promise.all([
        supabaseService.getDashboardResumen(),
        supabaseService.getPacientes(),
        supabaseService.getCitas(),
        supabaseService.getAtenciones(),
        supabaseService.getTriajes(),
        supabaseService.getProfesionales(),
        supabaseService.getUsuarios(),
        supabaseService.getFuas(),
      ]);

      if (liveStats) {
        setSupabaseLiveStats(liveStats);
      }
      if (supaPacientes && supaPacientes.length > 0) {
        setPacientes(supaPacientes);
      }
      if (supaCitas && supaCitas.length > 0) {
        setCitas(supaCitas);
      }
      if (supaAtenciones && supaAtenciones.length > 0) {
        setAtenciones(supaAtenciones);
      }
      if (supaTriajes && supaTriajes.length > 0) {
        setTriajes(supaTriajes);
      }
      if (supaProfesionales && supaProfesionales.length > 0) {
        setProfesionales(supaProfesionales);
      }
      if (supaUsuarios && supaUsuarios.length > 0) {
        setUsuarios(supaUsuarios);
      }
      if (supaFuas && supaFuas.length > 0) {
        setFuas(supaFuas);
      }
    } catch (err: any) {
      console.warn('Error durante sincronización con Supabase:', err);
      setSupabaseStatus('error');
      setSupabaseMessage(err?.message || 'Error al conectar con la base de datos de Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Intentar sincronizar al iniciar
  useEffect(() => {
    if (isSupabaseConfigured()) {
      syncWithSupabase();
    }
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_usuarios`, JSON.stringify(usuarios));
  }, [usuarios]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_pacientes`, JSON.stringify(pacientes));
  }, [pacientes]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_profesionales`, JSON.stringify(profesionales));
  }, [profesionales]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_citas`, JSON.stringify(citas));
  }, [citas]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_triajes`, JSON.stringify(triajes));
  }, [triajes]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_atenciones`, JSON.stringify(atenciones));
  }, [atenciones]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_fuas`, JSON.stringify(fuas));
  }, [fuas]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_consultorios`, JSON.stringify(consultorios));
  }, [consultorios]);

  // Login y Logout
  const loginUser = (username: string, pass: string) => {
    const user = usuarios.find((u) => u.usuario.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
      return { success: false, error: 'El nombre de usuario no existe en el sistema.' };
    }
    if (user.estado === 'inactivo') {
      return { success: false, error: 'Esta cuenta se encuentra inactiva. Contacte al Administrador.' };
    }
    // Si tiene contraseña configurada la validamos, sino demo libre
    if (user.contrasena && pass && user.contrasena !== pass) {
      return { success: false, error: 'Contraseña incorrecta.' };
    }
    setCurrentUser(user);
    setIsLoggedOut(false);
    try {
      sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_active_session`, JSON.stringify(user));
    } catch (e) {
      console.warn('Error guardando sesion:', e);
    }
    return { success: true };
  };

  const logoutUser = () => {
    try {
      sessionStorage.removeItem(`${LOCAL_STORAGE_KEY}_active_session`);
    } catch (e) {
      console.warn('Error eliminando sesion:', e);
    }
    setIsLoggedOut(true);
  };

  // FUA (Formato Único de Atención SIS)
  const addFUA = (data: Omit<FUA, 'id' | 'numero_fua' | 'fecha' | 'hora' | 'estado'>) => {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const correlativoNum = (fuaConfig.ultimo_numero || fuas.length) + 1;
    const correlativo = String(correlativoNum).padStart(8, '0');
    const anio = fuaConfig.anio || now.getFullYear();
    const renaiess = fuaConfig.codigo_renipress || '00003414';
    const numero_fua = `${renaiess}-${anio}-${correlativo}`;
    const fuaId = `fua-${Date.now()}`;

    const newFUA: FUA = {
      ...data,
      id: fuaId,
      numero_fua,
      fecha,
      hora,
      renaiess,
      anio_fua: anio,
      correlativo,
      estado: 'REGISTRADO',
    };

    setFuas((prev) => [newFUA, ...prev]);

    // Actualizar último número
    setFuaConfig((prev) => {
      const updated = { ...prev, ultimo_numero: correlativoNum };
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_fua_config`, JSON.stringify(updated));
      return updated;
    });

    // Si viene vinculado a una atención, marcar la atención
    if (data.atencion_id) {
      setAtenciones((prev) =>
        prev.map((a) => (a.id === data.atencion_id ? { ...a, fua_generado: true, fua_id: fuaId } : a))
      );
    }

    if (isSupabaseConfigured()) {
      supabaseService.insertFua(newFUA).catch((e) => console.warn('Supabase insertFua error:', e));
    }
    return { success: true, fuaId, numeroFua: numero_fua };
  };

  const updateFUA = (id: string, data: Partial<FUA>) => {
    setFuas((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)));
  };

  const deleteFUA = (id: string) => {
    setFuas((prev) => prev.filter((f) => f.id !== id));
  };

  // Actualizar usuario actual si cambia en la lista
  useEffect(() => {
    const found = usuarios.find((u) => u.id === currentUser.id);
    if (found) {
      setCurrentUser(found);
    }
  }, [usuarios, currentUser.id]);

  // Verificar si el usuario actual tiene acceso al módulo
  const canAccess = (moduleId: ModuleId): boolean => {
    if (!currentUser) return false;
    if (currentUser.rol === 'administrador') return true;
    return currentUser.permisosModulos.includes(moduleId);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // PACIENTES
  const addPaciente = (data: Omit<Paciente, 'id' | 'fecha_ingreso'>) => {
    // Verificar duplicados
    if (data.tipo_documento === 'INDOCUMENTADO' && data.hcl) {
      const existe = pacientes.some((p) => p.hcl?.toLowerCase() === data.hcl?.toLowerCase());
      if (existe) {
        return { success: false, error: 'Ya existe un paciente indocumentado con este HCL.' };
      }
    } else if (data.numero_documento) {
      const existe = pacientes.some(
        (p) => p.tipo_documento === data.tipo_documento && p.numero_documento === data.numero_documento
      );
      if (existe) {
        return { success: false, error: `Ya existe un paciente con ${data.tipo_documento}: ${data.numero_documento}` };
      }
    }

    const newPaciente: Paciente = {
      ...data,
      id: `pac-${Date.now()}`,
      fecha_ingreso: new Date().toISOString().split('T')[0],
    };

    setPacientes((prev) => [newPaciente, ...prev]);
    // Persistir en Supabase si está enlazado
    if (isSupabaseConfigured()) {
      supabaseService.insertPaciente(newPaciente).catch((e) => console.warn('Supabase insertPaciente error:', e));
    }
    return { success: true, message: 'Paciente registrado correctamente.' };
  };

  const updatePaciente = (id: string, data: Partial<Paciente>) => {
    setPacientes((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    if (isSupabaseConfigured()) {
      supabaseService.updatePaciente(id, data).catch((e) => console.warn('Supabase updatePaciente error:', e));
    }
  };

  const deletePaciente = (id: string) => {
    setPacientes((prev) => prev.filter((p) => p.id !== id));
    if (isSupabaseConfigured()) {
      supabaseService.deletePaciente(id).catch((e) => console.warn('Supabase deletePaciente error:', e));
    }
  };

  // PROFESIONALES
  const addProfesional = (prof: Omit<Profesional, 'id'>) => {
    if (profesionales.some((p) => p.dni === prof.dni)) {
      return { success: false, error: `Ya existe un profesional con DNI: ${prof.dni}` };
    }
    const newProf: Profesional = {
      ...prof,
      id: `prof-${Date.now()}`,
    };
    setProfesionales((prev) => [...prev, newProf]);
    return { success: true };
  };

  const updateProfesional = (id: string, data: Partial<Profesional>) => {
    setProfesionales((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const toggleProfesional = (id: string) => {
    setProfesionales((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : p))
    );
  };

  const deleteProfesional = (id: string) => {
    setProfesionales((prev) => prev.filter((p) => p.id !== id));
  };

  // CONSULTORIOS
  const updateConsultorio = (id: string, data: Partial<Consultorio>) => {
    setConsultorios((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...data } : c));
      return updated;
    });
  };

  // CITAS
  const addCita = (cita: Omit<Cita, 'id'>) => {
    const newCita: Cita = {
      ...cita,
      id: `cita-${Date.now()}`,
    };
    setCitas((prev) => [...prev, newCita]);
    if (isSupabaseConfigured()) {
      supabaseService.insertCita(newCita).catch((e) => console.warn('Supabase insertCita error:', e));
    }
    return { success: true };
  };

  const confirmarCita = (id: string) => {
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, estado: 'CONFIRMADA' } : c)));
    if (isSupabaseConfigured()) {
      supabaseService.updateCita(id, { estado: 'CONFIRMADA' }).catch((e) => console.warn('Supabase confirmarCita error:', e));
    }
  };

  const cancelarCita = (id: string, motivo?: string) => {
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, estado: 'CANCELADA', observaciones: motivo } : c)));
    if (isSupabaseConfigured()) {
      supabaseService.updateCita(id, { estado: 'CANCELADA', observaciones: motivo }).catch((e) => console.warn('Supabase cancelarCita error:', e));
    }
  };

  // TRIAJES
  const addTriaje = (data: Omit<Triaje, 'id' | 'hora_llegada' | 'estado' | 'fecha'>) => {
    const now = new Date();
    const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fecha = now.toISOString().split('T')[0];

    const newTriaje: Triaje = {
      ...data,
      id: `trj-${Date.now()}`,
      fecha,
      hora_llegada: hora,
      estado: 'EN_ESPERA',
    };

    setTriajes((prev) => [newTriaje, ...prev]);

    if (data.cita_id) {
      setCitas((prev) => prev.map((c) => (c.id === data.cita_id ? { ...c, triaje_completado: true } : c)));
    }

    if (isSupabaseConfigured()) {
      supabaseService.insertTriaje(newTriaje).catch((e) => console.warn('Supabase insertTriaje error:', e));
    }

    return { success: true };
  };

  const llamarPaciente = (triajeId: string) => {
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    setTriajes((prev) => prev.map((t) => (t.id === triajeId ? { ...t, estado: 'LLAMADO', hora_llamado: hora } : t)));
  };

  // ATENCIONES
  const addAtencion = (data: Omit<AtencionClinica, 'id' | 'fecha_atencion' | 'hora_atencion' | 'estado'>) => {
    const now = new Date();
    const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const fecha = now.toISOString().split('T')[0];

    const newAtencion: AtencionClinica = {
      ...data,
      id: `atn-${Date.now()}`,
      fecha_atencion: fecha,
      hora_atencion: hora,
      estado: 'COMPLETADA',
    };

    setAtenciones((prev) => [newAtencion, ...prev]);

    // Marcar triaje como atendido
    if (data.triaje_id) {
      setTriajes((prev) =>
        prev.map((t) => (t.id === data.triaje_id ? { ...t, estado: 'ATENDIDO', hora_fin_atencion: hora } : t))
      );
    }

    // Marcar cita como atendida
    if (data.cita_id) {
      setCitas((prev) =>
        prev.map((c) => (c.id === data.cita_id ? { ...c, estado: 'ATENDIDA', atencion_completada: true } : c))
      );
    }

    // Si finaliza proceso, marcar paciente inactivo
    if (data.finaliza_proceso && data.paciente_id) {
      setPacientes((prev) => prev.map((p) => (p.id === data.paciente_id ? { ...p, estado: 'inactivo' } : p)));
    }

    if (isSupabaseConfigured()) {
      supabaseService.insertAtencion(newAtencion).catch((e) => console.warn('Supabase insertAtencion error:', e));
    }

    return { success: true };
  };

  // USUARIOS
  const addUsuario = (usuario: Omit<Usuario, 'id' | 'fechaCreacion'>) => {
    const newUsuario: Usuario = {
      ...usuario,
      id: `usr-${Date.now()}`,
      fechaCreacion: new Date().toISOString().split('T')[0],
      ultimoAcceso: 'Nunca',
    };
    setUsuarios((prev) => [...prev, newUsuario]);
  };

  const updateUsuario = (id: string, data: Partial<Usuario>) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
  };

  const deleteUsuario = (id: string) => {
    if (usuarios.length <= 1) return;
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  };

  const toggleUsuarioEstado = (id: string) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, estado: u.estado === 'activo' ? 'inactivo' : 'activo' } : u))
    );
  };

  // PROGRAMACIÓN ANUAL: Cálculo de citas y atenciones desglosadas por mes y seguro
  const getProgramacionAnual = (anio: number, filtroProfesionalId?: string): DatosProgramacionMes[] => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Mapeo de paciente -> seguro
    const mapSeguroPaciente = new Map<string, string>();
    pacientes.forEach((p) => {
      mapSeguroPaciente.set(p.id, p.seguro || 'NINGUNO');
    });

    return meses.map((nombreMes, index) => {
      const mesNum = index + 1;
      const mesStr = String(mesNum).padStart(2, '0');
      const prefijo = `${anio}-${mesStr}`;

      // Filtrar citas del mes
      const citasMes = citas.filter((c) => {
        if (!c.fecha_cita.startsWith(prefijo)) return false;
        if (filtroProfesionalId && c.profesional_id !== filtroProfesionalId) return false;
        return true;
      });

      // Filtrar atenciones del mes
      const atencionesMes = atenciones.filter((a) => {
        if (!a.fecha_atencion.startsWith(prefijo)) return false;
        if (filtroProfesionalId && a.profesional_id !== filtroProfesionalId) return false;
        return true;
      });

      // Cálculo 100% REAL a partir de los registros de la base de datos
      const citasProgramadas = citasMes.length;
      const pacientesAtendidos = atencionesMes.length;
      
      const hoyStr = new Date().toISOString().split('T')[0];
      const noAsistieron = citasMes.filter(
        (c) => c.estado === 'CANCELADA' || (!c.atencion_completada && c.fecha_cita < hoyStr)
      ).length;

      // Desglose real por tipo de seguro de los pacientes atendidos en el mes
      const desgloseSeguro = {
        SIS: 0,
        ESSALUD: 0,
        EPS: 0,
        PRIVADO: 0,
        NINGUNO: 0,
        OTRO: 0,
      };

      atencionesMes.forEach((a) => {
        const seg = (mapSeguroPaciente.get(a.paciente_id) || 'NINGUNO').toUpperCase();
        if (desgloseSeguro[seg as keyof typeof desgloseSeguro] !== undefined) {
          desgloseSeguro[seg as keyof typeof desgloseSeguro]++;
        } else {
          desgloseSeguro.OTRO++;
        }
      });

      const cumplimiento =
        citasProgramadas > 0
          ? Math.round((pacientesAtendidos / citasProgramadas) * 100)
          : pacientesAtendidos > 0
          ? 100
          : 0;

      return {
        mesNumero: mesNum,
        mesNombre: nombreMes,
        citasProgramadas,
        pacientesAtendidos,
        pacientesNoAsistieron: noAsistieron,
        porcentajeCumplimiento: cumplimiento,
        desgloseSeguro,
        totalPorSeguro: pacientesAtendidos,
      };
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        usuarios,
        addUsuario,
        updateUsuario,
        deleteUsuario,
        toggleUsuarioEstado,
        canAccess,
        isLoggedOut,
        setIsLoggedOut,
        loginUser,
        logoutUser,
        currentTab,
        setCurrentTab,
        activeModal,
        setActiveModal,
        selectedPacienteFichaId,
        setSelectedPacienteFichaId,
        pacientes,
        addPaciente,
        updatePaciente,
        deletePaciente,
        fuas,
        fuaConfig,
        updateFuaConfig,
        addFUA,
        updateFUA,
        deleteFUA,
        profesionales,
        addProfesional,
        updateProfesional,
        toggleProfesional,
        deleteProfesional,
        consultorios,
        updateConsultorio,
        citas,
        addCita,
        confirmarCita,
        cancelarCita,
        triajes,
        addTriaje,
        llamarPaciente,
        atenciones,
        addAtencion,
        getProgramacionAnual,
        isSupabaseConfigured: isSupabaseConfigured(),
        supabaseStatus,
        supabaseMessage,
        supabaseLiveStats,
        isSyncing,
        syncWithSupabase,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
