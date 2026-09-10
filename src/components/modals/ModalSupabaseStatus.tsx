import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  Layers,
  Table,
  Eye,
  ShieldCheck,
  Server,
} from 'lucide-react';
import { SUPABASE_METADATA } from '../../lib/supabase';

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

  if (activeModal !== 'supabaseStatus') return null;

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
                Centinela de Vida • CSMC (Red de Salud Chincha)
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
                  : 'Modo Local / Esperando Credenciales de Supabase'}
              </div>
              <p className="text-xs leading-relaxed opacity-90">{supabaseMessage}</p>
              {SUPABASE_METADATA.url && (
                <div className="font-mono text-[11px] pt-1 text-slate-600 dark:text-slate-300">
                  Host: {SUPABASE_METADATA.url}
                </div>
              )}
            </div>
          </div>

          {/* Sincronización Manual */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Server size={14} className="text-teal-600" />
                Sincronización Bidireccional
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Lee y sincroniza pacientes, citas, atenciones, triajes y FUAs en vivo.
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

          {/* Guía de Configuración si no está conectado */}
          {!isSupabaseConfigured && (
            <div className="p-4 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-teal-600" />
                Cómo vincular tus credenciales de Supabase
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                En el menú de <strong>Settings / Secrets</strong> de AI Studio, agrega las siguientes dos variables de entorno con los datos de tu proyecto de Supabase:
              </p>
              <div className="space-y-1 font-mono text-[11px] bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-teal-600 dark:text-teal-400">
                  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
                </div>
                <div className="text-indigo-600 dark:text-indigo-400">
                  VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                La aplicación detectará automáticamente tus tablas <code className="text-slate-700 dark:text-slate-300">cv_*</code> y vistas <code className="text-slate-700 dark:text-slate-300">v_cv_*</code> mostradas en tu base de datos de Supabase.
              </p>
            </div>
          )}
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
