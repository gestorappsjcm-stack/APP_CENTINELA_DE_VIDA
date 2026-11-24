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
  AsignacionTurnoDia,
  CodigoTurnoRol,
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
  DIAGNOSTICOS_CIE10,
  PROCEDIMIENTOS_CPMS,
  MODULOS_SISTEMA,
} from '../data/mockData';
import { supabaseService, SupabaseDashboardStats } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  buscarConflictoPaciente,
  calcularEdadDesdeFecha,
  deduplicarPacientes,
  normalizarDocumento,
  normalizarHcl,
} from '../lib/pacientesHelper';
import {
  aplicarCodigoTurnoProfesional,
  asignarSlotConsultorioFecha,
  getTodayIso,
} from '../lib/turnosHelper';

interface AppContextType {
  // Autenticación y permisos
  currentUser: Usuario;
  setCurrentUser: (user: Usuario) => void;
  isDeveloperMode: boolean;
  developerUser: Usuario;
  usuarios: Usuario[];
  addUsuario: (usuario: Omit<Usuario, 'id' | 'fechaCreacion'>) => Promise<{ success: boolean; error?: string }>;
  updateUsuario: (id: string, data: Partial<Usuario>) => Promise<{ success: boolean; error?: string }>;
  deleteUsuario: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleUsuarioEstado: (id: string) => void;
  canAccess: (moduleId: ModuleId) => boolean;
  isLoggedOut: boolean;
  setIsLoggedOut: (val: boolean) => void;
  loginUser: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;

  // Navegación
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  pendingUsuarioProfesionalId: string | null;
  setPendingUsuarioProfesionalId: (id: string | null) => void;
  selectedPacienteFichaId: string | null;
  setSelectedPacienteFichaId: (id: string | null) => void;

  // Pacientes
  pacientes: Paciente[];
  editingPaciente: Paciente | null;
  setEditingPaciente: (p: Paciente | null) => void;
  addPaciente: (paciente: Omit<Paciente, 'id' | 'fecha_ingreso'>) => Promise<{ success: boolean; message?: string; error?: string }>;
  updatePaciente: (id: string, data: Partial<Paciente>) => Promise<{ success: boolean; error?: string }>;
  importarPacientesMasivo: (
    registros: Omit<Paciente, 'id' | 'fecha_ingreso'>[]
  ) => Promise<{ inserted: number; skippedDuplicates: number; errors: string[] }>;
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
  addProfesional: (prof: Omit<Profesional, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateProfesional: (id: string, data: Partial<Profesional>) => Promise<{ success: boolean; error?: string }>;
  toggleProfesional: (id: string) => void;
  deleteProfesional: (id: string) => void;
  deleteAllProfesionales: () => Promise<{ success: boolean; error?: string }>;

  // Consultorios y Programación de Turnos por Fecha
  consultorios: Consultorio[];
  updateConsultorio: (id: string, data: Partial<Consultorio>) => void;
  asignarProfesionalAConsultorio: (consultorioId: string, turno: 'MAÑANA' | 'TARDE', profesionalId: string) => void;
  turnosProgramados: AsignacionTurnoDia[];
  asignarTurnoConsultorioFecha: (
    fecha: string,
    consultorioId: string,
    turno: 'MAÑANA' | 'TARDE',
    profesionalId: string
  ) => void;
  aplicarTurnoProfesionalFecha: (
    fecha: string,
    profesionalId: string,
    consultorioId: string,
    codigo: CodigoTurnoRol | ''
  ) => void;
  importarTurnosMasivo: (
    nuevosTurnos: AsignacionTurnoDia[],
    opciones?: { reemplazarMes?: { anio: number; mes: number } }
  ) => void;
  limpiarTurnosMes: (anio: number, mes: number) => void;

  // Citas
  citas: Cita[];
  addCita: (cita: Omit<Cita, 'id'>) => { success: boolean; cita?: Cita; error?: string };
  confirmarCita: (id: string) => void;
  cancelarCita: (id: string, motivo?: string) => void;
  llamarTurno: (citaId: string, consultorioId?: string) => void;
  reprogramarCita: (id: string, fecha: string, hora: string) => void;
  adelantarCita: (id: string, fecha: string, hora: string, pasarATriaje?: boolean) => void;
  liberarCupo: (id: string, motivo?: string) => { fecha: string; hora: string; consultorio_id?: string; profesional_id?: string };

  // Catálogos Oficiales (Sincronizados con Supabase: diagnosticospico y pac_procedimientos)
  catalogoDiagnosticos: Array<{ codigo: string; nombre: string; sexo?: string }>;
  catalogoProcedimientos: Array<{ cpms: string; descripcion: string; estrategia?: string }>;

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

const VALID_TABS = new Set<string>([
  'dashboard',
  'pacientes',
  'ficha_paciente',
  'fua',
  'agenda',
  'triaje',
  'atencion',
  'display_turnos',
  'profesionales',
  'programacion_turnos',
  'programacion_anual',
  'reportes',
  'gestion_usuarios',
]);

const parseHashTab = (): string | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#\/?/, '').trim().split('?')[0];
  return raw && VALID_TABS.has(raw) ? raw : null;
};

const verifyUserPassword = async (stored: string | undefined, input: string): Promise<boolean> => {
  if (!stored) return true;
  if (stored.startsWith('pbkdf2:sha256:')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const iterations = parseInt(parts[0].split(':')[2] || '600000', 10);
    const salt = parts[1];
    const expectedHex = parts[2].toLowerCase();
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      try {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          enc.encode(input),
          'PBKDF2',
          false,
          ['deriveBits']
        );
        const derivedBits = await window.crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: enc.encode(salt),
            iterations: Number.isFinite(iterations) ? iterations : 600000,
            hash: 'SHA-256',
          },
          keyMaterial,
          (expectedHex.length / 2) * 8
        );
        const derivedHex = Array.from(new Uint8Array(derivedBits))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        return derivedHex === expectedHex;
      } catch (e) {
        console.warn('Error verificando hash PBKDF2:', e);
        return false;
      }
    }
    return false;
  }
  return stored === input;
};

const DEV_USER: Usuario = {
  id: 'usr-dev',
  usuario: 'DEV',
  nombres: 'Desarrollador',
  apellidos: 'Sistema',
  rol: 'desarrollador',
  estado: 'activo',
  permisosModulos: MODULOS_SISTEMA.map((m) => m.id),
  ultimoAcceso: 'Sesión activa',
  fechaCreacion: '2025-01-01',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialización con persistencia local
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_usuarios`);
    return saved ? JSON.parse(saved) : INITIAL_USUARIOS;
  });

  const [isDeveloperMode, setIsDeveloperMode] = useState<boolean>(() => {
    const active = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_active_session`);
    const devMode = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_dev_mode`);
    return Boolean(active) && devMode === 'true';
  });

  const [currentUser, setCurrentUserState] = useState<Usuario>(() => {
    const savedSession = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_active_session`);
    const devMode = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_dev_mode`) === 'true';
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) {
          if (parsed.id === 'usr-dev' && !devMode) {
            return usuarios[0] || INITIAL_USUARIOS[0];
          }
          return parsed;
        }
      } catch (e) {
        console.warn('Error leyendo sesion activa:', e);
      }
    }
    return usuarios[0] || INITIAL_USUARIOS[0];
  });

  const [selectedPacienteFichaId, setSelectedPacienteFichaIdState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_selected_ficha_id`) || null;
    } catch {
      return null;
    }
  });

  const setSelectedPacienteFichaId = (id: string | null) => {
    setSelectedPacienteFichaIdState(id);
    try {
      if (id) {
        sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_selected_ficha_id`, id);
      } else {
        sessionStorage.removeItem(`${LOCAL_STORAGE_KEY}_selected_ficha_id`);
      }
    } catch (e) {
      console.warn('Error guardando paciente ficha:', e);
    }
  };

  const [currentTab, setCurrentTabState] = useState<string>(() => {
    try {
      const fromHash = parseHashTab();
      const fromSession = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_current_tab`);
      const candidate =
        fromHash || (fromSession && VALID_TABS.has(fromSession) ? fromSession : 'dashboard');
      if (candidate === 'ficha_paciente') {
        const fichaId = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_selected_ficha_id`);
        return fichaId ? 'ficha_paciente' : 'pacientes';
      }
      return candidate;
    } catch {
      return 'dashboard';
    }
  });

  const setCurrentTab = (tab: string) => {
    const safeTab = VALID_TABS.has(tab) ? tab : 'dashboard';
    setCurrentTabState(safeTab);
    try {
      sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_current_tab`, safeTab);
      if (typeof window !== 'undefined') {
        const targetHash = `#/${safeTab}`;
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
      }
    } catch (e) {
      console.warn('Error guardando pestaña activa:', e);
    }
  };

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [pendingUsuarioProfesionalId, setPendingUsuarioProfesionalId] = useState<string | null>(null);
  // Por defecto, iniciar SIEMPRE en la pantalla de Login a menos que exista una sesión activa
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(() => {
    const active = sessionStorage.getItem(`${LOCAL_STORAGE_KEY}_active_session`);
    return !active;
  });

  // Mantener sincronizada la pestaña activa en URL hash / sessionStorage y soportar Atrás/Adelante del navegador
  useEffect(() => {
    if (isLoggedOut) return;
    try {
      sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_current_tab`, currentTab);
      const targetHash = `#/${currentTab}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${targetHash}`);
      }
    } catch (e) {
      console.warn('Error sincronizando hash de pestaña:', e);
    }
  }, [currentTab, isLoggedOut]);

  useEffect(() => {
    const handleHashChange = () => {
      const hashTab = parseHashTab();
      if (hashTab) {
        setCurrentTabState(hashTab);
        try {
          sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_current_tab`, hashTab);
        } catch {
          // noop
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_pacientes`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filtrar antiguos registros demo (pac-1 a pac-10) y deduplicar por Documento/HCL
          return deduplicarPacientes(parsed.filter((p: any) => !p.id || !p.id.match(/^pac-[1-9]$|^pac-10$/)));
        }
      } catch (e) {
        console.warn('Error parseando pacientes:', e);
      }
    }
    return deduplicarPacientes(INITIAL_PACIENTES);
  });

  const [fuas, setFuas] = useState<FUA[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_fuas`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((f: any) => !f.id || !f.id.match(/^fua-[1-9]$/));
        }
      } catch (e) {
        console.warn('Error parseando fuas:', e);
      }
    }
    return INITIAL_FUAS;
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
      ultimo_numero: 0,
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
        if (Array.isArray(parsed)) {
          // Limpiar antiguos registros demo (prof-1 a prof-50) para iniciar en blanco con datos reales
          return parsed.filter(
            (p: any) => !p.id || !/^prof-\d{1,2}$/.test(String(p.id))
          );
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
          return parsed.map((c: any) => {
            const isDemoManana = c.profesional_id && /^prof-\d{1,2}$/.test(String(c.profesional_id));
            const isDemoTarde = c.profesional_tarde_id && /^prof-\d{1,2}$/.test(String(c.profesional_tarde_id));
            if (isDemoManana || isDemoTarde) {
              const {
                profesional_id: _p1,
                profesional_nombre: _n1,
                profesional_tarde_id: _p2,
                profesional_tarde_nombre: _n2,
                ...rest
              } = c;
              return rest;
            }
            return c;
          });
        }
      } catch (e) {
        console.warn('Error parseando consultorios:', e);
      }
    }
    return INITIAL_CONSULTORIOS;
  });

  const [turnosProgramados, setTurnosProgramados] = useState<AsignacionTurnoDia[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_turnos_programados`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error parseando turnos programados:', e);
      }
    }
    return [];
  });

  const [citas, setCitas] = useState<Cita[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_citas`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((c: any) => !c.id || !c.id.match(/^cita-[1-9]$/))
            .map((c: any, idx: number) => ({
              ...c,
              numero_ticket:
                c.numero_ticket ||
                `TKT-${c.fecha_cita ? c.fecha_cita.split('-')[0] : '2026'}-${String(idx + 1).padStart(4, '0')}`,
            }));
        }
      } catch (e) {
        console.warn('Error parseando citas:', e);
      }
    }
    return INITIAL_CITAS;
  });

  const [triajes, setTriajes] = useState<Triaje[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_triajes`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t: any) => !t.id || !t.id.match(/^trj-[1-9]$/));
        }
      } catch (e) {
        console.warn('Error parseando triajes:', e);
      }
    }
    return INITIAL_TRIAJES;
  });

  const [atenciones, setAtenciones] = useState<AtencionClinica[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_atenciones`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((a: any) => !a.id || !a.id.match(/^atn-[1-9]$/));
        }
      } catch (e) {
        console.warn('Error parseando atenciones:', e);
      }
    }
    return INITIAL_ATENCIONES;
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

  // Catálogos Oficiales (CIE-10 Salud Mental y CPMS)
  const [catalogoDiagnosticos, setCatalogoDiagnosticos] = useState<Array<{ codigo: string; nombre: string; sexo?: string }>>(DIAGNOSTICOS_CIE10);
  const [catalogoProcedimientos, setCatalogoProcedimientos] = useState<Array<{ cpms: string; descripcion: string; estrategia?: string }>>(PROCEDIMIENTOS_CPMS);

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
      const [
        liveStats,
        supaPacientes,
        supaCitas,
        supaAtenciones,
        supaTriajes,
        supaProfesionales,
        supaUsuarios,
        supaFuas,
        supaDiagnosticos,
        supaProcedimientos,
        supaTurnosProgramados,
      ] = await Promise.all([
        supabaseService.getDashboardResumen(),
        supabaseService.getPacientes(),
        supabaseService.getCitas(),
        supabaseService.getAtenciones(),
        supabaseService.getTriajes(),
        supabaseService.getProfesionales(),
        supabaseService.getUsuarios(),
        supabaseService.getFuas(),
        supabaseService.getDiagnosticosPsico(),
        supabaseService.getProcedimientos(),
        supabaseService.getTurnosProgramados(),
      ]);

      if (liveStats) {
        setSupabaseLiveStats(liveStats);
      }
      if (Array.isArray(supaPacientes)) {
        setPacientes(deduplicarPacientes(supaPacientes));
      }
      if (Array.isArray(supaCitas)) {
        setCitas(supaCitas);
      }
      if (Array.isArray(supaAtenciones)) {
        setAtenciones(supaAtenciones);
      }
      if (Array.isArray(supaTriajes)) {
        setTriajes(supaTriajes);
      }
      if (Array.isArray(supaProfesionales)) {
        setProfesionales(supaProfesionales);
      }
      if (Array.isArray(supaUsuarios)) {
        setUsuarios(supaUsuarios);
      }
      if (Array.isArray(supaFuas)) {
        setFuas(supaFuas);
      }
      if (Array.isArray(supaDiagnosticos) && supaDiagnosticos.length > 0) {
        setCatalogoDiagnosticos(supaDiagnosticos);
      }
      if (Array.isArray(supaProcedimientos) && supaProcedimientos.length > 0) {
        setCatalogoProcedimientos(supaProcedimientos);
      }
      if (Array.isArray(supaTurnosProgramados)) {
        setTurnosProgramados(supaTurnosProgramados);
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

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_turnos_programados`, JSON.stringify(turnosProgramados));
  }, [turnosProgramados]);

  // Cambio rápido de usuario (exclusivo para sesión de desarrollador)
  const setCurrentUser = (user: Usuario) => {
    if (!isDeveloperMode) return;
    setCurrentUserState(user);
    try {
      sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_active_session`, JSON.stringify(user));
    } catch (e) {
      console.warn('Error guardando sesion:', e);
    }
  };

  // Login y Logout
  const loginUser = async (username: string, pass: string) => {
    const cleanUser = username.trim();

    if (cleanUser.toUpperCase() === 'DEV') {
      if (pass !== 'test125879') {
        return { success: false, error: 'Contraseña incorrecta.' };
      }
      setCurrentUserState(DEV_USER);
      setIsDeveloperMode(true);
      setIsLoggedOut(false);
      try {
        sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_active_session`, JSON.stringify(DEV_USER));
        sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_dev_mode`, 'true');
      } catch (e) {
        console.warn('Error guardando sesion:', e);
      }
      return { success: true };
    }

    const user = usuarios.find((u) => u.usuario.toLowerCase() === cleanUser.toLowerCase());
    if (!user) {
      return { success: false, error: 'El nombre de usuario no existe en el sistema.' };
    }
    if (user.estado === 'inactivo') {
      return { success: false, error: 'Esta cuenta se encuentra inactiva. Contacte al Administrador.' };
    }
    // Validar contraseña (soporta texto plano y hashes pbkdf2:sha256 de Supabase)
    if (user.contrasena) {
      const passwordOk = await verifyUserPassword(user.contrasena, pass);
      if (!passwordOk) {
        return { success: false, error: 'Contraseña incorrecta.' };
      }
    }

    setIsDeveloperMode(false);
    setCurrentUserState(user);
    setIsLoggedOut(false);
    try {
      sessionStorage.setItem(`${LOCAL_STORAGE_KEY}_active_session`, JSON.stringify(user));
      sessionStorage.removeItem(`${LOCAL_STORAGE_KEY}_dev_mode`);
    } catch (e) {
      console.warn('Error guardando sesion:', e);
    }
    return { success: true };
  };

  const logoutUser = () => {
    try {
      sessionStorage.removeItem(`${LOCAL_STORAGE_KEY}_active_session`);
      sessionStorage.removeItem(`${LOCAL_STORAGE_KEY}_dev_mode`);
      sessionStorage.removeItem(`${LOCAL_STORAGE_KEY}_current_tab`);
      sessionStorage.removeItem(`${LOCAL_STORAGE_KEY}_selected_ficha_id`);
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (e) {
      console.warn('Error eliminando sesion:', e);
    }
    setSelectedPacienteFichaIdState(null);
    setCurrentTabState('dashboard');
    setIsDeveloperMode(false);
    setIsLoggedOut(true);
  };

  // FUA (Formato Único de Atención SIS)
  const addFUA = (data: Omit<FUA, 'id' | 'numero_fua' | 'fecha' | 'hora' | 'estado'>) => {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const correlativoNum = ((fuaConfig?.ultimo_numero ?? fuas.length) || 0) + 1;
    const correlativo = String(correlativoNum).padStart(8, '0');
    const anio = fuaConfig?.anio || now.getFullYear();
    const renaiess = fuaConfig?.codigo_renipress || '00003414';
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

    // Actualizar último número en configuración local
    setFuaConfig((prev) => {
      const updated = { ...prev, ultimo_numero: correlativoNum };
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_fua_config`, JSON.stringify(updated));
      return updated;
    });

    // Si viene vinculado a una atención, marcar la atención tanto en memoria como persistencia
    if (data.atencion_id) {
      setAtenciones((prev) =>
        prev.map((a) =>
          String(a.id) === String(data.atencion_id)
            ? { ...a, fua_generado: true, fua_id: fuaId }
            : a
        )
      );
    }

    // Persistir en Supabase en segundo plano si está disponible
    if (isSupabaseConfigured()) {
      supabaseService.insertFua(newFUA)
        .then((ok) => {
          if (ok && data.atencion_id) {
            supabaseService.updateAtencionFua(String(data.atencion_id), fuaId).catch(() => {});
          }
        })
        .catch((e) => console.warn('Supabase insertFua error:', e));
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
    if (currentUser.id === 'usr-dev') return;
    const found = usuarios.find((u) => u.id === currentUser.id);
    if (found) {
      setCurrentUserState(found);
    }
  }, [usuarios, currentUser.id]);

  // Verificar si el usuario actual tiene acceso al módulo
  const canAccess = (moduleId: ModuleId): boolean => {
    if (!currentUser) return false;
    const isDev = isDeveloperMode || currentUser.rol === 'desarrollador';
    if (isDev) return true;

    // Solo el Administrador y el Desarrollador pueden editar accesos/usuarios
    if (moduleId === 'gestion_usuarios') {
      return currentUser.rol === 'administrador';
    }

    if (currentUser.rol === 'administrador') return true;

    // La pantalla TV de turnos es de acceso operativo en el CSMC
    if (moduleId === 'display_turnos') return true;
    if (!currentUser.permisosModulos || !Array.isArray(currentUser.permisosModulos)) return false;
    return currentUser.permisosModulos.includes(moduleId);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // PACIENTES (Registro único estricto por Documento y HCL)
  const addPaciente = async (
    data: Omit<Paciente, 'id' | 'fecha_ingreso'>
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!canAccess('pacientes')) {
      return {
        success: false,
        error: 'Su perfil no cuenta con autorización para registrar pacientes.',
      };
    }
    const docLimpio = data.tipo_documento !== 'INDOCUMENTADO' ? normalizarDocumento(data.numero_documento) : '';
    const hclLimpio = normalizarHcl(data.hcl);
    const codTemporalLimpio = data.tipo_documento === 'INDOCUMENTADO' ? normalizarDocumento(data.codigo_temporal) : '';

    const conflictoLocal = buscarConflictoPaciente(
      {
        tipo_documento: data.tipo_documento,
        numero_documento: docLimpio,
        hcl: hclLimpio,
        codigo_temporal: codTemporalLimpio,
      },
      pacientes
    );
    if (conflictoLocal) {
      return { success: false, error: conflictoLocal.message };
    }

    if (isSupabaseConfigured()) {
      const conflictoRemoto = await supabaseService.findPacienteDuplicado({
        tipo_documento: data.tipo_documento,
        numero_documento: docLimpio,
        hcl: hclLimpio,
      });
      if (conflictoRemoto) {
        const labelCampo = conflictoRemoto.field === 'hcl' ? `HCL ${hclLimpio}` : `Documento ${docLimpio}`;
        return {
          success: false,
          error: `Registro único duplicado en base de datos (${labelCampo}): ${conflictoRemoto.existing.apellidos_nombres}.`,
        };
      }
    }

    const tempId = `pac-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const edadFinal =
      typeof data.edad === 'number' ? data.edad : calcularEdadDesdeFecha(data.fecha_nacimiento);

    const newPaciente: Paciente = {
      ...data,
      numero_documento: docLimpio || undefined,
      codigo_temporal: codTemporalLimpio || undefined,
      hcl: hclLimpio || undefined,
      edad: edadFinal,
      id: tempId,
      fecha_ingreso: new Date().toISOString().split('T')[0],
    };

    if (isSupabaseConfigured()) {
      const res = await supabaseService.insertPaciente(newPaciente);
      if (!res.id) {
        return {
          success: false,
          error: res.error || 'No se pudo guardar el paciente en la base de datos Supabase.',
        };
      }
      newPaciente.id = res.id;
    }

    setPacientes((prev) => deduplicarPacientes([newPaciente, ...prev]));
    return { success: true, message: 'Paciente registrado correctamente.' };
  };

  const updatePaciente = async (id: string, data: Partial<Paciente>): Promise<{ success: boolean; error?: string }> => {
    const isSoloSeguroClinico = Object.keys(data).length === 1 && data.seguro !== undefined;
    if (!canAccess('pacientes') && !isSoloSeguroClinico) {
      return {
        success: false,
        error: 'Su perfil no cuenta con autorización para modificar datos del padrón de pacientes.',
      };
    }
    const actual = pacientes.find((p) => p.id === id);
    if (!actual) {
      return { success: false, error: 'Paciente no encontrado.' };
    }

    const nextTipoDoc = data.tipo_documento ?? actual.tipo_documento;
    const nextNumDoc = normalizarDocumento(
      data.numero_documento !== undefined ? data.numero_documento : actual.numero_documento
    );
    const nextHcl = normalizarHcl(data.hcl !== undefined ? data.hcl : actual.hcl);
    const nextCod = normalizarDocumento(
      data.codigo_temporal !== undefined ? data.codigo_temporal : actual.codigo_temporal
    );

    const conflictoLocal = buscarConflictoPaciente(
      {
        tipo_documento: nextTipoDoc,
        numero_documento: nextNumDoc,
        hcl: nextHcl,
        codigo_temporal: nextCod,
      },
      pacientes,
      id
    );
    if (conflictoLocal) {
      return { success: false, error: conflictoLocal.message };
    }

    if (isSupabaseConfigured()) {
      const conflictoRemoto = await supabaseService.findPacienteDuplicado({
        tipo_documento: nextTipoDoc,
        numero_documento: nextNumDoc,
        hcl: nextHcl,
        excludeId: id,
      });
      if (conflictoRemoto) {
        const labelCampo = conflictoRemoto.field === 'hcl' ? `HCL ${nextHcl}` : `Documento ${nextNumDoc}`;
        return {
          success: false,
          error: `No se puede actualizar porque ${labelCampo} ya pertenece a ${conflictoRemoto.existing.apellidos_nombres}.`,
        };
      }
    }

    const normalizedPayload: Partial<Paciente> = {
      ...data,
      ...(data.numero_documento !== undefined ? { numero_documento: nextNumDoc || undefined } : {}),
      ...(data.hcl !== undefined ? { hcl: nextHcl || undefined } : {}),
      ...(data.fecha_nacimiento !== undefined && data.edad === undefined
        ? { edad: calcularEdadDesdeFecha(data.fecha_nacimiento) }
        : {}),
    };

    if (isSupabaseConfigured()) {
      const res = await supabaseService.updatePaciente(id, normalizedPayload);
      if (!res.ok) {
        return { success: false, error: res.error || 'No se pudo actualizar el paciente en Supabase.' };
      }
    }

    setPacientes((prev) => prev.map((p) => (p.id === id ? { ...p, ...normalizedPayload } : p)));
    return { success: true };
  };

  const importarPacientesMasivo = async (
    registros: Omit<Paciente, 'id' | 'fecha_ingreso'>[]
  ): Promise<{ inserted: number; skippedDuplicates: number; errors: string[] }> => {
    if (!isDeveloperMode && currentUser.rol !== 'desarrollador') {
      return {
        inserted: 0,
        skippedDuplicates: 0,
        errors: ['Acción restringida exclusivamente al perfil Desarrollador.'],
      };
    }

    const remoteList = isSupabaseConfigured() ? await supabaseService.getPacientes() : null;
    const workingExistentes: Paciente[] = remoteList
      ? deduplicarPacientes([...remoteList, ...pacientes])
      : deduplicarPacientes([...pacientes]);

    const hoy = new Date().toISOString().split('T')[0];
    const nuevosGuardados: Paciente[] = [];
    const errors: string[] = [];
    let skippedDuplicates = 0;

    for (let i = 0; i < registros.length; i++) {
      const item = registros[i];
      const docLimpio = item.tipo_documento !== 'INDOCUMENTADO' ? normalizarDocumento(item.numero_documento) : '';
      const hclLimpio = normalizarHcl(item.hcl);
      const codTempLimpio = item.tipo_documento === 'INDOCUMENTADO' ? normalizarDocumento(item.codigo_temporal) : '';

      const conflicto = buscarConflictoPaciente(
        {
          tipo_documento: item.tipo_documento,
          numero_documento: docLimpio,
          hcl: hclLimpio,
          codigo_temporal: codTempLimpio,
        },
        workingExistentes
      );

      if (conflicto) {
        skippedDuplicates++;
        continue;
      }

      const edadAuto = calcularEdadDesdeFecha(item.fecha_nacimiento);
      const nuevo: Paciente = {
        ...item,
        id: `pac-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        numero_documento: docLimpio || undefined,
        hcl: hclLimpio || undefined,
        codigo_temporal: codTempLimpio || undefined,
        edad: typeof edadAuto === 'number' ? edadAuto : item.edad,
        fecha_ingreso: hoy,
        estado: item.estado || 'activo',
      };

      if (isSupabaseConfigured()) {
        const res = await supabaseService.insertPaciente(nuevo);
        if (!res.id) {
          errors.push(
            `${nuevo.apellidos_nombres || docLimpio || hclLimpio}: ${res.error || 'Error al guardar en Supabase'}`
          );
          // Detener rápido si es un error de permisos RLS para no repetir 20 veces
          if (res.error && res.error.toLowerCase().includes('rls')) {
            break;
          }
          continue;
        }
        nuevo.id = res.id;
      }

      nuevosGuardados.push(nuevo);
      workingExistentes.push(nuevo);
    }

    if (nuevosGuardados.length > 0) {
      setPacientes((prev) => deduplicarPacientes([...nuevosGuardados.slice().reverse(), ...prev]));
    }

    return {
      inserted: nuevosGuardados.length,
      skippedDuplicates,
      errors,
    };
  };

  const deletePaciente = (id: string) => {
    if (!canAccess('pacientes')) {
      console.warn('Acción denegada: sin autorización para eliminar pacientes.');
      return;
    }
    setPacientes((prev) => prev.filter((p) => p.id !== id));
    if (isSupabaseConfigured()) {
      supabaseService.deletePaciente(id).catch((e) => console.warn('Supabase deletePaciente error:', e));
    }
  };

  // PROFESIONALES
  const addProfesional = async (
    prof: Omit<Profesional, 'id'>
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanDoc = prof.dni?.trim().toUpperCase();
    if (cleanDoc && profesionales.some((p) => (p.dni || '').trim().toUpperCase() === cleanDoc)) {
      return {
        success: false,
        error: `Ya existe un profesional registrado con el documento: ${cleanDoc}`,
      };
    }
    const tempId = `prof-${Date.now()}`;
    const newProf: Profesional = {
      ...prof,
      tipo_documento: prof.tipo_documento || (cleanDoc && !/^\d{8}$/.test(cleanDoc) ? 'CE' : 'DNI'),
      dni: cleanDoc || undefined,
      id: tempId,
    };

    if (isSupabaseConfigured()) {
      const res = await supabaseService.insertProfesional(newProf);
      if (!res.id) {
        return {
          success: false,
          error: res.error || 'No se pudo guardar el profesional en la base de datos Supabase.',
        };
      }
      newProf.id = res.id;
    }

    setProfesionales((prev) => [...prev, newProf]);
    return { success: true };
  };

  const updateProfesional = async (
    id: string,
    data: Partial<Profesional>
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanDoc = data.dni !== undefined ? data.dni.trim().toUpperCase() : undefined;
    if (
      cleanDoc &&
      profesionales.some((p) => p.id !== id && (p.dni || '').trim().toUpperCase() === cleanDoc)
    ) {
      return {
        success: false,
        error: `Ya existe otro profesional registrado con el documento: ${cleanDoc}`,
      };
    }

    const normalizedData: Partial<Profesional> = {
      ...data,
      ...(data.dni !== undefined ? { dni: cleanDoc || undefined } : {}),
    };

    if (isSupabaseConfigured()) {
      const res = await supabaseService.updateProfesional(id, normalizedData);
      if (!res.ok) {
        return {
          success: false,
          error: res.error || 'No se pudo actualizar el profesional en Supabase.',
        };
      }
    }

    setProfesionales((prev) => prev.map((p) => (p.id === id ? { ...p, ...normalizedData } : p)));
    return { success: true };
  };

  const toggleProfesional = (id: string) => {
    const actual = profesionales.find((p) => p.id === id);
    const nuevoEstado: 'ACTIVO' | 'INACTIVO' = actual?.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setProfesionales((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : p))
    );
    if (isSupabaseConfigured()) {
      supabaseService.updateProfesional(id, { estado: nuevoEstado }).catch((e) => console.warn('Supabase toggleProfesional error:', e));
    }
  };

  const deleteProfesional = (id: string) => {
    if (!isDeveloperMode && currentUser.rol !== 'desarrollador') {
      console.warn('Acción denegada: solo el Desarrollador puede eliminar profesionales.');
      return;
    }
    setProfesionales((prev) => prev.filter((p) => p.id !== id));
    if (isSupabaseConfigured()) {
      supabaseService.deleteProfesional(id).catch((e) => console.warn('Supabase deleteProfesional error:', e));
    }
  };

  const deleteAllProfesionales = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isDeveloperMode && currentUser.rol !== 'desarrollador') {
      return {
        success: false,
        error: 'Solo el Desarrollador puede eliminar profesionales. Como Administrador solo puedes deshabilitarlos.',
      };
    }
    setProfesionales([]);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_profesionales`, JSON.stringify([]));
    setSupabaseLiveStats((prev) => (prev ? { ...prev, profesionalesActivos: 0 } : prev));
    if (isSupabaseConfigured()) {
      const res = await supabaseService.deleteAllProfesionales();
      if (!res.ok) {
        return { success: false, error: res.error };
      }
    }
    return { success: true };
  };

  // Sincronizar automáticamente Consultorios con los Turnos de HOY (prioritario) y Profesionales base
  useEffect(() => {
    const todayIso = getTodayIso();
    setConsultorios((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const turnoHoyManana = turnosProgramados.find(
          (t) =>
            t.fecha === todayIso &&
            (t.consultorio_id === c.id || t.consultorio_id === c.codigo) &&
            t.turno === 'MAÑANA'
        );
        const turnoHoyTarde = turnosProgramados.find(
          (t) =>
            t.fecha === todayIso &&
            (t.consultorio_id === c.id || t.consultorio_id === c.codigo) &&
            t.turno === 'TARDE'
        );

        const asignados = profesionales.filter(
          (p) =>
            p.estado === 'ACTIVO' &&
            p.consultorioAsignado &&
            (p.consultorioAsignado === c.id || p.consultorioAsignado === c.codigo)
        );
        const profBaseManana = asignados.find(
          (p) => !p.turnoHabitual || p.turnoHabitual === 'MAÑANA' || p.turnoHabitual === 'ROTATIVO'
        );
        const profBaseTarde =
          asignados.find((p) => p.turnoHabitual === 'TARDE') ||
          asignados.find((p) => p.turnoHabitual === 'ROTATIVO');

        const profHoyManana = turnoHoyManana
          ? profesionales.find((p) => p.id === turnoHoyManana.profesional_id && p.estado === 'ACTIVO')
          : undefined;
        const profHoyTarde = turnoHoyTarde
          ? profesionales.find((p) => p.id === turnoHoyTarde.profesional_id && p.estado === 'ACTIVO')
          : undefined;

        const nextMananaId = profHoyManana?.id || turnoHoyManana?.profesional_id || profBaseManana?.id;
        const nextMananaNombre =
          profHoyManana?.apellidos_nombres ||
          turnoHoyManana?.profesional_nombre ||
          profBaseManana?.apellidos_nombres;
        const nextTardeId = profHoyTarde?.id || turnoHoyTarde?.profesional_id || profBaseTarde?.id;
        const nextTardeNombre =
          profHoyTarde?.apellidos_nombres ||
          turnoHoyTarde?.profesional_nombre ||
          profBaseTarde?.apellidos_nombres;

        if (
          c.profesional_id !== nextMananaId ||
          c.profesional_nombre !== nextMananaNombre ||
          c.profesional_tarde_id !== nextTardeId ||
          c.profesional_tarde_nombre !== nextTardeNombre
        ) {
          changed = true;
          return {
            ...c,
            profesional_id: nextMananaId,
            profesional_nombre: nextMananaNombre,
            profesional_tarde_id: nextTardeId,
            profesional_tarde_nombre: nextTardeNombre,
          };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [profesionales, turnosProgramados]);

  // CONSULTORIOS
  const updateConsultorio = (id: string, data: Partial<Consultorio>) => {
    setConsultorios((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...data } : c));
      return updated;
    });
  };

  const asignarProfesionalAConsultorio = (
    consultorioId: string,
    turno: 'MAÑANA' | 'TARDE',
    profesionalId: string
  ) => {
    const cons = consultorios.find((c) => c.id === consultorioId || c.codigo === consultorioId);
    const targetConsId = cons?.id || consultorioId;
    const targetConsCodigo = cons?.codigo || consultorioId;

    setProfesionales((prev) =>
      prev.map((p) => {
        const estabaEnEsteSlot =
          (p.consultorioAsignado === targetConsId || p.consultorioAsignado === targetConsCodigo) &&
          (turno === 'MAÑANA'
            ? !p.turnoHabitual || p.turnoHabitual === 'MAÑANA'
            : p.turnoHabitual === 'TARDE');

        if (profesionalId && p.id === profesionalId) {
          const updated = { ...p, consultorioAsignado: targetConsId, turnoHabitual: turno };
          if (isSupabaseConfigured()) {
            supabaseService
              .updateProfesional(p.id, { consultorioAsignado: targetConsId, turnoHabitual: turno })
              .catch(() => {});
          }
          return updated;
        }

        if (estabaEnEsteSlot && p.id !== profesionalId) {
          const updated = { ...p, consultorioAsignado: undefined };
          if (isSupabaseConfigured()) {
            supabaseService.updateProfesional(p.id, { consultorioAsignado: '' }).catch(() => {});
          }
          return updated;
        }

        return p;
      })
    );
  };

  const persistirTurnos = (nextTurnos: AsignacionTurnoDia[]) => {
    if (isSupabaseConfigured()) {
      supabaseService.saveTurnosProgramados(nextTurnos).catch(() => {});
    }
  };

  const asignarTurnoConsultorioFecha = (
    fecha: string,
    consultorioId: string,
    turno: 'MAÑANA' | 'TARDE',
    profesionalId: string
  ) => {
    const prof = profesionales.find((p) => p.id === profesionalId);
    setTurnosProgramados((prev) => {
      const next = asignarSlotConsultorioFecha({
        turnos: prev,
        fecha,
        consultorioId,
        turno,
        profesionalId,
        profesionalNombre: prof?.apellidos_nombres,
      });
      persistirTurnos(next);
      return next;
    });
  };

  const aplicarTurnoProfesionalFecha = (
    fecha: string,
    profesionalId: string,
    consultorioId: string,
    codigo: CodigoTurnoRol | ''
  ) => {
    const prof = profesionales.find((p) => p.id === profesionalId);
    setTurnosProgramados((prev) => {
      const next = aplicarCodigoTurnoProfesional({
        turnos: prev,
        fecha,
        profesionalId,
        profesionalNombre: prof?.apellidos_nombres,
        consultorioId,
        codigo,
      });
      persistirTurnos(next);
      return next;
    });
  };

  const importarTurnosMasivo = (
    nuevosTurnos: AsignacionTurnoDia[],
    opciones?: { reemplazarMes?: { anio: number; mes: number } }
  ) => {
    setTurnosProgramados((prev) => {
      let base = prev;
      if (opciones?.reemplazarMes) {
        const prefix = `${opciones.reemplazarMes.anio}-${String(opciones.reemplazarMes.mes).padStart(2, '0')}-`;
        base = base.filter((t) => !t.fecha.startsWith(prefix));
      } else {
        const incomingKeys = new Set(
          nuevosTurnos.map((t) =>
            t.turno === 'AUSENCIA'
              ? `aus__${t.fecha}__${t.profesional_id}`
              : `${t.fecha}__${t.consultorio_id}__${t.turno}`
          )
        );
        const incomingProfDays = new Set(
          nuevosTurnos.map((t) => `${t.fecha}__${t.profesional_id}`)
        );
        base = base.filter((t) => {
          const slotKey =
            t.turno === 'AUSENCIA'
              ? `aus__${t.fecha}__${t.profesional_id}`
              : `${t.fecha}__${t.consultorio_id}__${t.turno}`;
          if (incomingKeys.has(slotKey)) return false;
          if (t.turno === 'AUSENCIA' && incomingProfDays.has(`${t.fecha}__${t.profesional_id}`)) {
            return false;
          }
          return true;
        });
      }
      const next = [...base, ...nuevosTurnos];
      persistirTurnos(next);
      return next;
    });
  };

  const limpiarTurnosMes = (anio: number, mes: number) => {
    const prefix = `${anio}-${String(mes).padStart(2, '0')}-`;
    setTurnosProgramados((prev) => {
      const next = prev.filter((t) => !t.fecha.startsWith(prefix));
      persistirTurnos(next);
      return next;
    });
  };

  // CITAS
  const addCita = (cita: Omit<Cita, 'id'>) => {
    const correlativo = String(citas.length + 1).padStart(4, '0');
    const anio = new Date().getFullYear();
    const newCita: Cita = {
      ...cita,
      id: `cita-${Date.now()}`,
      numero_ticket: cita.numero_ticket || `TKT-${anio}-${correlativo}`,
    };
    setCitas((prev) => [...prev, newCita]);
    if (isSupabaseConfigured()) {
      supabaseService.insertCita(newCita).catch((e) => console.warn('Supabase insertCita error:', e));
    }
    return { success: true, cita: newCita };
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

  const llamarTurno = (citaId: string, consultorioId?: string) => {
    setCitas((prev) =>
      prev.map((c) =>
        c.id === citaId
          ? {
              ...c,
              llamado_pantalla: true,
              consultorio_id: consultorioId || c.consultorio_id,
            }
          : c
      )
    );
  };

  const reprogramarCita = (id: string, fecha: string, hora: string) => {
    setCitas((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, fecha_cita: fecha, hora_cita: hora, estado: 'PENDIENTE' } : c
      )
    );
    if (isSupabaseConfigured()) {
      supabaseService.updateCita(id, { fecha_cita: fecha, hora_cita: hora, estado: 'PENDIENTE' })
        .catch((e) => console.warn('Supabase reprogramarCita error:', e));
    }
  };

  const adelantarCita = (id: string, fecha: string, hora: string, pasarATriaje: boolean = false) => {
    let citaActualizada: Cita | undefined;
    setCitas((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          citaActualizada = { ...c, fecha_cita: fecha, hora_cita: hora, estado: 'CONFIRMADA' };
          return citaActualizada;
        }
        return c;
      })
    );
    if (isSupabaseConfigured()) {
      supabaseService.updateCita(id, { fecha_cita: fecha, hora_cita: hora, estado: 'CONFIRMADA' })
        .catch((e) => console.warn('Supabase adelantarCita error:', e));
    }

    if (pasarATriaje && citaActualizada) {
      addTriaje({
        paciente_id: citaActualizada.paciente_id,
        cita_id: citaActualizada.id,
        profesional_id: citaActualizada.profesional_id,
        consultorio_id: citaActualizada.consultorio_id,
        presion_arterial: '',
        frecuencia_cardiaca: undefined,
        frecuencia_respiratoria: undefined,
        temperatura: undefined,
        peso: undefined,
        talla: undefined,
        clasificacion_riesgo: 'VERDE',
        motivo_consulta: 'Adelanto de cita para atención el día de hoy.',
      });
    }
  };

  const liberarCupo = (id: string, motivo: string = 'Cupo liberado por inasistencia / adelanto'): { fecha: string; hora: string; consultorio_id?: string; profesional_id?: string } => {
    let slotLiberado = { fecha: '', hora: '', consultorio_id: undefined as string | undefined, profesional_id: undefined as string | undefined };
    setCitas((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          slotLiberado = {
            fecha: c.fecha_cita,
            hora: c.hora_cita,
            consultorio_id: c.consultorio_id,
            profesional_id: c.profesional_id,
          };
          return { ...c, estado: 'CANCELADA', observaciones: motivo };
        }
        return c;
      })
    );
    if (isSupabaseConfigured()) {
      supabaseService.updateCita(id, { estado: 'CANCELADA', observaciones: motivo })
        .catch((e) => console.warn('Supabase liberarCupo error:', e));
    }
    return slotLiberado;
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

    // Si se programó próxima cita de control en la atención clínica, crear y persistir automáticamente la nueva Cita
    if (data.proxima_cita_fecha && data.paciente_id) {
      const anio = new Date().getFullYear();
      const correlativo = String(citas.length + 1).padStart(4, '0');
      const citaAnterior = citas.find((c) => c.id === data.cita_id);
      const pacActual = pacientes.find((p) => p.id === data.paciente_id);
      const fechaLimpia = String(data.proxima_cita_fecha).split('T')[0].split(' ')[0];
      const nuevaCitaControl: Cita = {
        id: `cita-${Date.now() + 5}`,
        paciente_id: data.paciente_id,
        profesional_id: data.profesional_id || citaAnterior?.profesional_id,
        consultorio_id: data.consultorio_id || citaAnterior?.consultorio_id,
        fecha_cita: fechaLimpia,
        hora_cita: citaAnterior?.hora_cita || '08:30',
        tipo_cita: 'CONSULTA',
        estado: 'PENDIENTE',
        motivo_consulta: `Control y seguimiento post-atención (Dx: ${data.cie10_1 || 'Salud Mental'})`,
        numero_ticket: `TKT-${anio}-${correlativo}`,
        seguro_cita: citaAnterior?.seguro_cita || (pacActual?.seguro as any) || 'SIS',
      };
      setCitas((prev) => [...prev, nuevaCitaControl]);
      if (isSupabaseConfigured()) {
        supabaseService.insertCita(nuevaCitaControl).catch((e) => console.warn('Supabase insertCita control error:', e));
      }
    }

    if (isSupabaseConfigured()) {
      supabaseService.insertAtencion(newAtencion).catch((e) => console.warn('Supabase insertAtencion error:', e));
    }

    return { success: true };
  };

  // USUARIOS (Persistidos en la tabla cv_usuarios de Supabase)
  const sanitizarPermisosPorRol = (rolDestino: Usuario['rol'], permisos: ModuleId[]): ModuleId[] => {
    return permisos.filter((m) => {
      if (m === 'gestion_usuarios') return rolDestino === 'administrador' || rolDestino === 'desarrollador';
      return true;
    });
  };

  const addUsuario = async (
    usuario: Omit<Usuario, 'id' | 'fechaCreacion'>
  ): Promise<{ success: boolean; error?: string }> => {
    const isDev = isDeveloperMode || currentUser.rol === 'desarrollador';
    if (!isDev && currentUser.rol !== 'administrador') {
      return {
        success: false,
        error: 'Solo el Administrador o Desarrollador pueden crear usuarios y editar permisos.',
      };
    }
    if (!isDev && usuario.rol === 'desarrollador') {
      return { success: false, error: 'Solo el Desarrollador puede asignar rol de Desarrollador.' };
    }

    const cleanUsername = usuario.usuario.trim().toLowerCase();
    if (cleanUsername === 'dev') {
      return { success: false, error: 'El nombre de usuario "DEV" está reservado para el sistema.' };
    }
    if (usuarios.some((u) => u.usuario.toLowerCase() === cleanUsername)) {
      return { success: false, error: `El nombre de usuario "${usuario.usuario}" ya está en uso.` };
    }

    const tempId = `usr-${Date.now()}`;
    const newUsuario: Usuario = {
      ...usuario,
      usuario: cleanUsername,
      permisosModulos: sanitizarPermisosPorRol(usuario.rol, usuario.permisosModulos || ['dashboard']),
      id: tempId,
      fechaCreacion: new Date().toISOString().split('T')[0],
      ultimoAcceso: 'Nunca',
    };

    if (isSupabaseConfigured()) {
      const res = await supabaseService.insertUsuario(newUsuario);
      if (!res.id) {
        return {
          success: false,
          error: res.error || 'No se pudo guardar el usuario en la base de datos Supabase.',
        };
      }
      newUsuario.id = res.id;
    }

    setUsuarios((prev) => [...prev, newUsuario]);
    return { success: true };
  };

  const updateUsuario = async (
    id: string,
    data: Partial<Usuario>
  ): Promise<{ success: boolean; error?: string }> => {
    const isDev = isDeveloperMode || currentUser.rol === 'desarrollador';
    if (!isDev && currentUser.rol !== 'administrador') {
      return {
        success: false,
        error: 'Solo el Administrador o Desarrollador pueden editar usuarios y accesos a módulos.',
      };
    }
    const existing = usuarios.find((u) => u.id === id);
    if (!isDev && (existing?.rol === 'desarrollador' || data.rol === 'desarrollador')) {
      return { success: false, error: 'No autorizado para modificar cuentas de Desarrollador.' };
    }

    const rolFinal = data.rol || existing?.rol || 'general';
    const sanitizedData: Partial<Usuario> = {
      ...data,
      ...(data.permisosModulos
        ? { permisosModulos: sanitizarPermisosPorRol(rolFinal, data.permisosModulos) }
        : {}),
    };

    if (isSupabaseConfigured()) {
      const res = await supabaseService.updateUsuario(id, sanitizedData);
      if (!res.ok) {
        return {
          success: false,
          error: res.error || 'No se pudo actualizar el usuario en Supabase.',
        };
      }
    }

    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...sanitizedData } : u)));
    return { success: true };
  };

  const deleteUsuario = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const isDev = isDeveloperMode || currentUser.rol === 'desarrollador';
    if (!isDev) {
      return {
        success: false,
        error: 'Solo el Desarrollador puede eliminar usuarios registrados. Como Administrador solo puedes deshabilitarlos.',
      };
    }

    const target = usuarios.find((u) => u.id === id);
    if (!target) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    if (target.id === currentUser.id) {
      return { success: false, error: 'No puede eliminar su propia sesión activa.' };
    }

    if (isSupabaseConfigured()) {
      const res = await supabaseService.deleteUsuario(id);
      if (!res.ok) {
        return { success: false, error: res.error || 'No se pudo eliminar el usuario en Supabase.' };
      }
    }

    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    return { success: true };
  };

  const toggleUsuarioEstado = (id: string) => {
    const user = usuarios.find((u) => u.id === id);
    if (!user) return;
    const nuevoEstado = user.estado === 'activo' ? 'inactivo' : 'activo';
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, estado: nuevoEstado } : u))
    );
    if (isSupabaseConfigured()) {
      supabaseService.updateUsuario(id, { estado: nuevoEstado }).catch((e) => console.warn('Supabase toggleUsuarioEstado error:', e));
    }
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
        isDeveloperMode,
        developerUser: DEV_USER,
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
        pendingUsuarioProfesionalId,
        setPendingUsuarioProfesionalId,
        selectedPacienteFichaId,
        setSelectedPacienteFichaId,
        pacientes,
        editingPaciente,
        setEditingPaciente,
        addPaciente,
        updatePaciente,
        importarPacientesMasivo,
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
        deleteAllProfesionales,
        consultorios,
        updateConsultorio,
        asignarProfesionalAConsultorio,
        turnosProgramados,
        asignarTurnoConsultorioFecha,
        aplicarTurnoProfesionalFecha,
        importarTurnosMasivo,
        limpiarTurnosMes,
        citas,
        addCita,
        confirmarCita,
        cancelarCita,
        llamarTurno,
        reprogramarCita,
        adelantarCita,
        liberarCupo,
        catalogoDiagnosticos,
        catalogoProcedimientos,
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
