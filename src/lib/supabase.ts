import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variables de entorno cliente Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim().length > 0 &&
    supabaseAnonKey.trim().length > 0 &&
    supabaseUrl.startsWith('http')
  );
};

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
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

export const SUPABASE_METADATA = {
  url: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^/]+).*/, '$1') : '',
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
