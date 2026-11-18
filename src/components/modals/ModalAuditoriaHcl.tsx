import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  Loader2,
  Hash,
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  auditarCorrelativoHcl,
  extraerNumeroHcl,
  RegistroHclAudit,
} from '../../lib/pacientesHelper';

export const ModalAuditoriaHcl: React.FC = () => {
  const { activeModal, setActiveModal, pacientes, canAccess } = useApp();

  const [rawRows, setRawRows] = useState<RegistroHclAudit[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<'supabase' | 'local'>('local');
  const [desdeStr, setDesdeStr] = useState('100');
  const [hastaStr, setHastaStr] = useState('317');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const cargarDatos = async () => {
    setIsLoading(true);
    setCopiedMsg(false);
    try {
      if (isSupabaseConfigured()) {
        const rows = await supabaseService.getPacientesHclAuditRaw();
        if (rows) {
          setRawRows(rows);
          setSourceLabel('supabase');
          const maxNum = rows.reduce<number | null>((acc, r) => {
            const n = extraerNumeroHcl(r.hcl);
            if (n === null) return acc;
            return acc === null || n > acc ? n : acc;
          }, null);
          if (maxNum && maxNum >= 100) {
            setHastaStr(String(maxNum));
          }
          setIsLoading(false);
          return;
        }
      }

      const localRows: RegistroHclAudit[] = pacientes.map((p) => ({
        id: p.id,
        hcl: p.hcl,
        numero_documento: p.numero_documento,
        apellidos_nombres: p.apellidos_nombres,
      }));
      setRawRows(localRows);
      setSourceLabel('local');
      const maxNum = localRows.reduce<number | null>((acc, r) => {
        const n = extraerNumeroHcl(r.hcl);
        if (n === null) return acc;
        return acc === null || n > acc ? n : acc;
      }, null);
      if (maxNum && maxNum >= 100) {
        setHastaStr(String(maxNum));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeModal === 'auditoriaHcl') {
      cargarDatos();
    }
  }, [activeModal]);

  const registrosActivos: RegistroHclAudit[] = useMemo(() => {
    if (rawRows) return rawRows;
    return pacientes.map((p) => ({
      id: p.id,
      hcl: p.hcl,
      numero_documento: p.numero_documento,
      apellidos_nombres: p.apellidos_nombres,
    }));
  }, [rawRows, pacientes]);

  const desdeNum = Math.max(1, parseInt(desdeStr, 10) || 100);
  const hastaNum = Math.max(desdeNum, parseInt(hastaStr, 10) || desdeNum);

  const audit = useMemo(
    () => auditarCorrelativoHcl(registrosActivos, desdeNum, hastaNum),
    [registrosActivos, desdeNum, hastaNum]
  );

  const handleCopyFaltantes = async () => {
    if (audit.faltantes.length === 0) return;
    try {
      await navigator.clipboard.writeText(audit.faltantes.join(', '));
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      setCopiedMsg(false);
    }
  };

  if (activeModal !== 'auditoriaHcl' || !canAccess('pacientes')) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[75] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Auditoría de Correlativos HCL
              </h3>
              <p className="text-xs text-slate-500">
                Verifica saltos, faltantes y duplicados ({sourceLabel === 'supabase' ? 'consulta directa a cv_pacientes' : 'padrón local'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Controles de Rango */}
          <div className="flex flex-wrap items-end justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  HCL Desde
                </label>
                <input
                  type="number"
                  min={1}
                  value={desdeStr}
                  onChange={(e) => setDesdeStr(e.target.value)}
                  className="w-28 px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  HCL Hasta
                </label>
                <input
                  type="number"
                  min={desdeNum}
                  value={hastaStr}
                  onChange={(e) => setHastaStr(e.target.value)}
                  className="w-28 px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              {audit.maxHclDetectado !== null && (
                <button
                  type="button"
                  onClick={() => setHastaStr(String(audit.maxHclDetectado))}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-pointer transition-colors"
                >
                  Máximo detectado: {audit.maxHclDetectado}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={cargarDatos}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              <span>Actualizar análisis</span>
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40">
              <p className="text-[11px] text-slate-500 font-medium">Total filas en tabla</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {audit.totalRegistros}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40">
              <p className="text-[11px] text-slate-500 font-medium">
                Únicos ({desdeNum}–{hastaNum})
              </p>
              <p className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-0.5">
                {audit.unicosEnRango} / {audit.esperadosEnRango}
              </p>
            </div>
            <div
              className={`p-3.5 rounded-xl border ${
                audit.faltantes.length > 0
                  ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-700'
                  : 'border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800'
              }`}
            >
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                HCL faltantes / saltados
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  audit.faltantes.length > 0
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {audit.faltantes.length}
              </p>
            </div>
            <div
              className={`p-3.5 rounded-xl border ${
                audit.duplicados.length > 0
                  ? 'border-rose-300 bg-rose-50/70 dark:bg-rose-950/30 dark:border-rose-700'
                  : 'border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800'
              }`}
            >
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                HCL duplicados en BD
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  audit.duplicados.length > 0
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {audit.duplicados.length}
              </p>
            </div>
          </div>

          {/* Faltantes / Saltados */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {audit.faltantes.length === 0 ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                )}
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {audit.faltantes.length === 0
                    ? `¡Correlativo completo! No falta ningún HCL entre ${desdeNum} y ${hastaNum}.`
                    : `Se detectaron ${audit.faltantes.length} número(s) de HCL faltante(s) entre ${desdeNum} y ${hastaNum}:`}
                </h4>
              </div>

              {audit.faltantes.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyFaltantes}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg cursor-pointer transition-colors"
                >
                  <Copy size={12} />
                  <span>{copiedMsg ? '¡Copiados!' : 'Copiar faltantes'}</span>
                </button>
              )}
            </div>

            {audit.faltantes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                {audit.faltantes.map((num) => (
                  <span
                    key={num}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-mono font-bold text-xs"
                  >
                    HCL {num}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Duplicados detectados */}
          {audit.duplicados.length > 0 && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 space-y-2.5">
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                <span>HCL repetidos en la base de datos ({audit.duplicados.length}):</span>
              </h4>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {audit.duplicados.map((dup) => (
                  <div
                    key={dup.hcl}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/70 text-xs"
                  >
                    <p className="font-mono font-bold text-rose-700 dark:text-rose-300">
                      HCL {dup.hcl} ({dup.registros.length} registros)
                    </p>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                      {dup.registros.map((r) => (
                        <li key={r.id}>
                          • {r.apellidos_nombres || 'Sin nombre'}{' '}
                          {r.numero_documento ? `(Doc: ${r.numero_documento})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fuera de rango / Sin HCL / No numéricos */}
          {(audit.fueraDeRango.length > 0 || audit.sinHcl.length > 0 || audit.noNumericos.length > 0) && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Hash size={14} className="text-slate-500" />
                <span>Registros fuera del rango {desdeNum}–{hastaNum} o sin HCL numérico</span>
              </h4>
              {audit.fueraDeRango.length > 0 && (
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Fuera de rango ({audit.fueraDeRango.length}):</span>{' '}
                  {audit.fueraDeRango
                    .map((r) => `HCL ${r.hcl} (${r.apellidos_nombres})`)
                    .join(' • ')}
                </div>
              )}
              {audit.sinHcl.length > 0 && (
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Sin HCL ({audit.sinHcl.length}):</span>{' '}
                  {audit.sinHcl.map((r) => r.apellidos_nombres || r.numero_documento).join(' • ')}
                </div>
              )}
              {audit.noNumericos.length > 0 && (
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">HCL con texto ({audit.noNumericos.length}):</span>{' '}
                  {audit.noNumericos.map((r) => `${r.hcl} (${r.apellidos_nombres})`).join(' • ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50/70 dark:bg-slate-850 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-xl cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
