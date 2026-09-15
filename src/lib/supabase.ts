import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'centinela_supabase_url';
const STORAGE_KEY_KEY = 'centinela_supabase_anon_key';

export const getStoredCredentials = (): { url: string; key: string } => {
  let url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  let key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem(STORAGE_URL_KEY);
    const localKey = localStorage.getItem(STORAGE_KEY_KEY);
    if (!url && localUrl) url = localUrl.trim();
    if (!key && localKey) key = localKey.trim();
  }

  return { url, key };
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  }
  supabaseInstance = null; // Reiniciar instancia
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  supabaseInstance = null;
};

let supabaseInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getStoredCredentials();
  return Boolean(
    url &&
    key &&
    url.length > 0 &&
    key.length > 0 &&
    url.startsWith('http')
  );
};

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    const { url, key } = getStoredCredentials();
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Error inicializando cliente de Supabase:', err);
      return null;
    }
  }
  return supabaseInstance;
};

export const getSupabaseUrlDisplay = (): string => {
  const { url } = getStoredCredentials();
  return url ? url.replace(/^(https?:\/\/[^/]+).*/, '$1') : '';
};

export const SUPABASE_METADATA = {
  get url() {
    return getSupabaseUrlDisplay();
  },
  tables: [
    'cv_pacientes',
    'cv_citas',
    'cv_atenciones',
    'cv_triajes',
    'cv_profesionales',
    'cv_usuarios',
    'cv_fua_historial',
    'cv_fua_contador',
    'cv_consultorios',
    'cv_configuracion',
    'diagnosticospsico',
    'pac_datos_personales',
  ],
  views: [
    'v_cv_dashboard_resumen',
    'v_cv_stats_resumen',
    'v_cv_atenciones_hoy',
    'v_cv_citas_hoy',
    'v_cv_citas_por_atender',
    'v_cv_citas_proximas',
    'cv_consultorios_disponibles',
    'cv_consultorios_hoy',
  ],
};
