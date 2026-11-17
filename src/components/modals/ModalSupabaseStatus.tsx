import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  Table,
  Eye,
  ShieldCheck,
  Server,
  Key,
  Globe,
  Trash2,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import {
  SUPABASE_METADATA,
  getStoredCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
} from '../../lib/supabase';

const RLS_FIX_SQL = `-- Ejecutar en Supabase SQL Editor (permite leer/guardar/editar/eliminar desde la app)
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'cv_pacientes',
    'cv_profesionales',
    'cv_usuarios',
    'cv_citas',
    'cv_triajes',
    'cv_atenciones',
    'cv_fua_historial',
    'cv_fua_contador',
    'cv_consultorios',
    'cv_configuracion'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated;', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "Permitir acceso app centinela" ON public.%I;', t);
      EXECUTE format(
        'CREATE POLICY "Permitir acceso app centinela" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
        t
      );
    END IF;
  END LOOP;
END $$;`;

export const ModalSupabaseStatus: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    supabaseStatus,
    supabaseMessage,
    isSupabaseConfigured,
    syncWithSupabase,
    isSyncing,
  } = useApp();

  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [showConfigInputs, setShowConfigInputs] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
  const [showRlsSql, setShowRlsSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (activeModal === 'supabaseStatus') {
      const creds = getStoredCredentials();
      setInputUrl(creds.url);
      setInputKey(creds.key);
      setFormErrorMsg(null);
      setConfirmClear(false);
      if (!creds.url || !creds.key) {
        setShowConfigInputs(true);
      }
    }
  }, [activeModal]);

  if (activeModal !== 'supabaseStatus') return null;

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMsg(null);
    if (!inputUrl.trim() || !inputKey.trim()) {
      setFormErrorMsg('Por favor complete la URL y el Anon Key de Supabase.');
      return;
    }
    saveSupabaseCredentials(inputUrl.trim(), inputKey.trim());
    setSaveSuccessMsg('Credenciales guardadas. Verificando conexión...');
    await syncWithSupabase();
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleClearCredentials = async () => {
    clearSupabaseCredentials();
    setInputUrl('');
    setInputKey('');
    setConfirmClear(false);
    setShowConfigInputs(true);
    await syncWithSupabase();
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(RLS_FIX_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      setShowRlsSql(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#1A2B4A] to-[#2D9C8B] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Database size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Conexión a Base de Datos Supabase
              </h3>
              <p className="text-xs text-white/80">
                Centinela de Vida • Unidad de Seguros (U.E. 401)
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status Box */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              supabaseStatus === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : supabaseStatus === 'connecting'
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            {supabaseStatus === 'connected' ? (
              <CheckCircle2 size={22} className="text-emerald-600 mt-0.5 shrink-0" />
            ) : supabaseStatus === 'connecting' ? (
              <RefreshCw size={22} className="text-blue-600 mt-0.5 shrink-0 animate-spin" />
            ) : (
              <AlertCircle size={22} className="text-amber-600 mt-0.5 shrink-0" />
            )}

            <div className="space-y-1 flex-1">
              <div className="font-bold text-sm flex items-center gap-2">
                {supabaseStatus === 'connected'
                  ? 'Conexión activa con Supabase'
                  : supabaseStatus === 'connecting'
                  ? 'Verificando enlace con Supabase...'
                  : 'Esperando Credenciales o Reconexión con Supabase'}
              </div>
              <p className="text-xs leading-relaxed opacity-90">{supabaseMessage}</p>
              {SUPABASE_METADATA.url && (
                <div className="font-mono text-[11px] pt-1 text-slate-600 dark:text-slate-300">
                  Host: {SUPABASE_METADATA.url}
                </div>
              )}
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {formErrorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{formErrorMsg}</span>
            </div>
          )}

          {/* Solución RLS para escritura desde la App */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-600" />
                  Permisos RLS en Supabase (Solución si falla el guardado)
                </h4>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  Si ves <code className="font-mono font-semibold">violates row-level security policy</code>, ejecuta este script en <strong>Supabase → SQL Editor</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRlsSql((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 flex items-center gap-1 cursor-pointer"
                >
                  <Terminal size={12} />
                  <span>{showRlsSql ? 'Ocultar SQL' : 'Ver Script SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  {copiedSql ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedSql ? 'Copiado' : 'Copiar SQL'}</span>
                </button>
              </div>
            </div>

            {showRlsSql && (
              <pre className="p-3 rounded-lg bg-slate-900 text-emerald-300 text-[10.5px] font-mono overflow-x-auto leading-relaxed border border-slate-700">
                {RLS_FIX_SQL}
              </pre>
            )}
          </div>

          {/* Formulario de Credenciales de Supabase */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Key size={14} className="text-teal-600" />
                Credenciales de Supabase (URL y Anon Key)
              </h4>
              <button
                type="button"
                onClick={() => setShowConfigInputs(!showConfigInputs)}
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
              >
                {showConfigInputs ? 'Ocultar campos' : 'Editar / Reconfigurar'}
              </button>
            </div>

            {showConfigInputs ? (
              <form onSubmit={handleSaveAndConnect} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Supabase Project URL:
                  </label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://tu-proyecto.supabase.co"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Supabase Anon Public API Key:
                  </label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSyncing}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                    <span>Guardar y Conectar a Supabase</span>
                  </button>

                  {confirmClear ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleClearCredentials}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Confirmar limpieza
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="px-2.5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="px-3 py-2 bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-slate-500">
                {inputUrl ? (
                  <>
                    Configurado para el servidor <code className="font-mono text-teal-700 dark:text-teal-300">{inputUrl}</code>
                  </>
                ) : (
                  'No hay credenciales registradas todavía. Haga clic en "Editar / Reconfigurar" para ingresarlas.'
                )}
              </p>
            )}
          </div>

          {/* Sincronización Manual */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Server size={14} className="text-teal-600" />
                Sincronización Bidireccional en Vivo
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Lee y sincroniza pacientes, citas, atenciones, triajes y FUAs en tiempo real.
              </p>
            </div>
            <button
              onClick={() => syncWithSupabase()}
              disabled={isSyncing}
              className="px-4 py-2 bg-[#1A2B4A] hover:bg-[#253c66] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          </div>

          {/* Tablas Supabase Mapeadas */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Table size={14} className="text-teal-600" />
              Tablas del Esquema CSMC Centinela de Vida ({SUPABASE_METADATA.tables.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPABASE_METADATA.tables.map((tbl) => (
                <div
                  key={tbl}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">{tbl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vistas Supabase Mapeadas */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Eye size={14} className="text-indigo-600" />
              Vistas Analíticas y Reportes Supabase ({SUPABASE_METADATA.views.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPABASE_METADATA.views.map((vw) => (
                <div
                  key={vw}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    <span className="truncate">{vw}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-sans font-bold">
                    VIEW
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={() => setActiveModal(null)}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
