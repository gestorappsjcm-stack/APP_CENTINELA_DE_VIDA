import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AsignacionTurnoDia, CodigoTurnoRol } from '../../types';
import {
  MESES_NOMBRES,
  aplicarCodigoTurnoProfesional,
  formatFechaIso,
  getDaysInMonth,
  matchConsultorioPorCodigoONombre,
  matchProfesionalPorNombreODni,
} from '../../lib/turnosHelper';
import {
  X,
  FileUp,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  UserCheck,
} from 'lucide-react';

interface TurnoPdfItem {
  dia: number;
  codigoOriginal: string;
  tipoTurno: string;
  consultorioCodigo?: string;
}

interface ProfesionalPdfDetectado {
  nombrePdf: string;
  dniPdf?: string;
  profesionalIdSugerido?: string;
  consultorioCodigoSugerido?: string;
  turnos: TurnoPdfItem[];
}

interface ParsePdfResponse {
  anio: number;
  mes: number;
  observaciones?: string;
  profesionalesDetectados: ProfesionalPdfDetectado[];
}

interface FilaRevisionPdf {
  key: string;
  incluir: boolean;
  nombrePdf: string;
  dniPdf?: string;
  profesionalId: string;
  consultorioId: string;
  turnos: TurnoPdfItem[];
}

interface ModalImportarRolPdfProps {
  isOpen: boolean;
  onClose: () => void;
  anioActual: number;
  mesActual: number;
  onApplied?: (anio: number, mes: number, totalTurnos: number) => void;
}

const mapTipoTurnoACodigo = (tipoTurno: string, codigoOriginal: string): CodigoTurnoRol | '' => {
  const norm = (tipoTurno || '').toUpperCase().trim();
  const orig = (codigoOriginal || '').toUpperCase().trim();

  if (
    norm === 'MAÑANA_TARDE' ||
    norm === 'MANANA_TARDE' ||
    orig === 'MT' ||
    orig === 'M/T' ||
    orig === 'M-T' ||
    orig === 'M+T' ||
    orig === 'GD' ||
    orig === '12H'
  ) {
    return 'MT';
  }
  if (norm === 'MAÑANA' || norm === 'MANANA' || orig === 'M' || orig === 'AM' || orig === 'M1' || orig === 'M2') {
    return 'M';
  }
  if (norm === 'TARDE' || orig === 'T' || orig === 'PM' || orig === 'T1' || orig === 'T2') {
    return 'T';
  }
  if (norm === 'FERIADO' || orig === 'F' || orig === 'FER' || orig.includes('FERIADO')) {
    return 'F';
  }
  if (
    norm === 'VACACIONES' ||
    orig === 'V' ||
    orig.includes('VAC') ||
    orig.includes('LIC') ||
    orig.includes('MATERNIDAD') ||
    orig === 'PERM' ||
    orig === 'DM'
  ) {
    return 'V';
  }
  if (norm === 'DESCANSO' || orig === 'D' || orig === 'DESC' || orig === 'DOM') {
    return 'D';
  }
  if (norm === 'LIBRE' || orig === 'L' || orig === 'FR' || orig === 'H' || orig.includes('HOSPITAL')) {
    return 'L';
  }
  return '';
};

export const ModalImportarRolPdf: React.FC<ModalImportarRolPdfProps> = ({
  isOpen,
  onClose,
  anioActual,
  mesActual,
  onApplied,
}) => {
  const {
    currentUser,
    isDeveloperMode,
    profesionales,
    consultorios,
    importarTurnosMasivo,
  } = useApp();

  const isDeveloper = isDeveloperMode || currentUser.rol === 'desarrollador';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [observacionesPdf, setObservacionesPdf] = useState<string>('');
  const [targetAnio, setTargetAnio] = useState<number>(anioActual);
  const [targetMes, setTargetMes] = useState<number>(mesActual);
  const [reemplazarMes, setReemplazarMes] = useState<boolean>(false);
  const [filas, setFilas] = useState<FilaRevisionPdf[]>([]);

  const profesionalesActivos = useMemo(
    () => profesionales.filter((p) => p.estado === 'ACTIVO'),
    [profesionales]
  );

  if (!isOpen || !isDeveloper) return null;

  const resetModalState = () => {
    setFileName('');
    setErrorMsg(null);
    setObservacionesPdf('');
    setFilas([]);
    setTargetAnio(anioActual);
    setTargetMes(mesActual);
  };

  const handleClose = () => {
    if (isAnalyzing) return;
    resetModalState();
    onClose();
  };

  const leerArchivoComoBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const idx = result.indexOf('base64,');
        resolve(idx >= 0 ? result.slice(idx + 7) : result);
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF seleccionado.'));
      reader.readAsDataURL(file);
    });

  const procesarPdf = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Por favor selecciona un archivo en formato PDF (.pdf).');
      return;
    }

    if (file.size > 18 * 1024 * 1024) {
      setErrorMsg('El archivo PDF supera el límite de 18 MB. Usa un archivo más liviano.');
      return;
    }

    setFileName(file.name);
    setErrorMsg(null);
    setObservacionesPdf('');
    setFilas([]);
    setIsAnalyzing(true);

    try {
      const pdfBase64 = await leerArchivoComoBase64(file);

      const response = await fetch('/api/turnos/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          fileName: file.name,
          anioHint: anioActual,
          mesHint: mesActual,
          profesionales: profesionalesActivos.map((p) => ({
            id: p.id,
            apellidos_nombres: p.apellidos_nombres,
            dni: p.dni,
            profesion: p.profesion,
            consultorioAsignado: p.consultorioAsignado,
          })),
          consultorios: consultorios.map((c) => ({
            id: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
          })),
        }),
      });

      const rawResponseText = await response.text();
      let payload: any = {};
      try {
        payload = rawResponseText ? JSON.parse(rawResponseText) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            'El servicio /api/turnos/parse-pdf devolvió 404 (no encontrado en este despliegue). Verifica que la carpeta /api esté desplegada correctamente.'
          );
        }
        throw new Error(payload?.error || `Error del servidor (${response.status})`);
      }

      const data = payload as ParsePdfResponse;
      const anioDetectado =
        Number.isInteger(data.anio) && data.anio >= 2020 && data.anio <= 2040
          ? data.anio
          : anioActual;
      const mesDetectado =
        Number.isInteger(data.mes) && data.mes >= 1 && data.mes <= 12
          ? data.mes
          : mesActual;

      setTargetAnio(anioDetectado);
      setTargetMes(mesDetectado);
      setObservacionesPdf(data.observaciones || '');

      const detectados = Array.isArray(data.profesionalesDetectados)
        ? data.profesionalesDetectados
        : [];

      if (detectados.length === 0) {
        throw new Error(
          'No se detectaron filas de profesionales con turnos en el PDF. Verifica que el documento contenga un cuadro de rol legible.'
        );
      }

      const mappedFilas: FilaRevisionPdf[] = detectados.map((item, idx) => {
        const profMatch = matchProfesionalPorNombreODni(
          item.nombrePdf,
          item.dniPdf,
          item.profesionalIdSugerido,
          profesionalesActivos
        );
        const consMatch = matchConsultorioPorCodigoONombre(
          item.consultorioCodigoSugerido,
          profMatch,
          consultorios
        );

        const turnosLimpios = (Array.isArray(item.turnos) ? item.turnos : [])
          .filter((t) => Number.isInteger(t.dia) && t.dia >= 1 && t.dia <= 31)
          .sort((a, b) => a.dia - b.dia);

        return {
          key: `row-${idx}-${item.nombrePdf}`,
          incluir: Boolean(profMatch),
          nombrePdf: item.nombrePdf,
          dniPdf: item.dniPdf,
          profesionalId: profMatch?.id || '',
          consultorioId: consMatch?.id || consultorios[0]?.id || '',
          turnos: turnosLimpios,
        };
      });

      setFilas(mappedFilas);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al analizar el PDF del rol de turnos.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmarAsignacion = () => {
    const diasEnMes = getDaysInMonth(targetAnio, targetMes);
    let acumulados: AsignacionTurnoDia[] = [];
    let turnosAplicadosCount = 0;

    for (const fila of filas) {
      if (!fila.incluir || !fila.profesionalId) continue;
      const prof = profesionalesActivos.find((p) => p.id === fila.profesionalId);

      for (const turno of fila.turnos) {
        if (turno.dia < 1 || turno.dia > diasEnMes) continue;
        const codigo = mapTipoTurnoACodigo(turno.tipoTurno, turno.codigoOriginal);
        if (!codigo) continue;

        const consDia = turno.consultorioCodigo
          ? matchConsultorioPorCodigoONombre(turno.consultorioCodigo, prof, consultorios)
          : undefined;
        const targetConsultorioId = consDia?.id || fila.consultorioId || consultorios[0]?.id || '';
        const fecha = formatFechaIso(targetAnio, targetMes, turno.dia);

        acumulados = aplicarCodigoTurnoProfesional({
          turnos: acumulados,
          fecha,
          profesionalId: fila.profesionalId,
          profesionalNombre: prof?.apellidos_nombres || fila.nombrePdf,
          consultorioId: targetConsultorioId,
          codigo,
        });
        turnosAplicadosCount++;
      }
    }

    if (acumulados.length === 0) {
      setErrorMsg(
        'No hay turnos válidos para asignar. Verifica que al menos una fila esté marcada y vinculada a un profesional.'
      );
      return;
    }

    importarTurnosMasivo(
      acumulados,
      reemplazarMes ? { reemplazarMes: { anio: targetAnio, mes: targetMes } } : undefined
    );

    if (onApplied) {
      onApplied(targetAnio, targetMes, turnosAplicadosCount);
    }
    resetModalState();
    onClose();
  };

  const filasListas = filas.filter((f) => f.incluir && f.profesionalId);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#1A2B4A] to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Detección Rápida de Rol de Turnos desde PDF</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  Exclusivo Desarrollador
                </span>
              </div>
              <p className="text-xs text-white/80">
                Sube el rol mensual en PDF y el sistema reconocerá automáticamente días, turnos (M / T / MT) y profesionales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isAnalyzing}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white cursor-pointer disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Zona de carga PDF */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) procesarPdf(droppedFile);
            }}
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) procesarPdf(selected);
                e.target.value = '';
              }}
            />

            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Analizando "{fileName}"...
                </p>
                <p className="text-xs text-slate-500">
                  Extrayendo tabla de días, siglas de turno (M, T, MT, L, D, V) y coincidencia de profesionales
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  <FileUp size={24} />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {fileName ? `Archivo cargado: ${fileName}` : 'Haz clic o arrastra aquí el archivo PDF del Rol de Turnos'}
                </p>
                <p className="text-xs text-slate-500 max-w-xl">
                  Compatible con cuadros mensuales MINSA / CSMC (días 01–31, códigos M, T, MT, L, D, V). Podrás revisar y ajustar antes de guardar.
                </p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {filas.length > 0 && (
            <div className="space-y-4">
              {/* Configuración de destino */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Mes detectado:
                    </span>
                    <select
                      value={targetMes}
                      onChange={(e) => setTargetMes(Number(e.target.value))}
                      className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                    >
                      {MESES_NOMBRES.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={2020}
                      max={2040}
                      value={targetAnio}
                      onChange={(e) => setTargetAnio(Number(e.target.value) || anioActual)}
                      className="w-20 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reemplazarMes}
                      onChange={(e) => setReemplazarMes(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Reemplazar todos los turnos previos de este mes</span>
                  </label>
                </div>

                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>
                    {filasListas.length} de {filas.length} profesional(es) listos para asignar
                  </span>
                </div>
              </div>

              {observacionesPdf && (
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                  <FileText size={14} className="shrink-0 mt-0.5 text-indigo-600" />
                  <span>{observacionesPdf}</span>
                </div>
              )}

              {/* Tabla de revisión */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Usar</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Detectado en PDF</th>
                        <th className="py-2.5 px-3 min-w-[220px]">
                          <span className="inline-flex items-center gap-1">
                            <UserCheck size={12} /> Profesional en Sistema
                          </span>
                        </th>
                        <th className="py-2.5 px-3 min-w-[200px]">
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={12} /> Consultorio
                          </span>
                        </th>
                        <th className="py-2.5 px-3 min-w-[260px]">Turnos Detectados por Día</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {filas.map((fila) => {
                        const sinMatch = !fila.profesionalId;
                        return (
                          <tr
                            key={fila.key}
                            className={`${
                              !fila.incluir ? 'opacity-50 bg-slate-50/50 dark:bg-slate-900/20' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={fila.incluir}
                                onChange={(e) =>
                                  setFilas((prev) =>
                                    prev.map((item) =>
                                      item.key === fila.key
                                        ? { ...item, incluir: e.target.checked }
                                        : item
                                    )
                                  )
                                }
                                className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {fila.nombrePdf}
                              </div>
                              {fila.dniPdf && (
                                <div className="text-[10px] font-mono text-slate-500">
                                  Doc: {fila.dniPdf}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={fila.profesionalId}
                                onChange={(e) => {
                                  const nextProfId = e.target.value;
                                  const prof = profesionalesActivos.find((p) => p.id === nextProfId);
                                  setFilas((prev) =>
                                    prev.map((item) =>
                                      item.key === fila.key
                                        ? {
                                            ...item,
                                            profesionalId: nextProfId,
                                            incluir: Boolean(nextProfId),
                                            consultorioId:
                                              prof?.consultorioAsignado || item.consultorioId,
                                          }
                                        : item
                                    )
                                  );
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-medium bg-white dark:bg-slate-900 ${
                                  sinMatch
                                    ? 'border-amber-400 text-amber-800 dark:text-amber-300'
                                    : 'border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <option value="">-- Seleccionar profesional (o omitir) --</option>
                                {profesionalesActivos.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.apellidos_nombres} ({p.profesion})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={fila.consultorioId}
                                onChange={(e) =>
                                  setFilas((prev) =>
                                    prev.map((item) =>
                                      item.key === fila.key
                                        ? { ...item, consultorioId: e.target.value }
                                        : item
                                    )
                                  )
                                }
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px] font-medium"
                              >
                                {consultorios.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.codigo} — {c.nombre}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1">
                                {fila.turnos.slice(0, 31).map((t, tIdx) => {
                                  const cod = mapTipoTurnoACodigo(t.tipoTurno, t.codigoOriginal);
                                  const badgeStyle =
                                    cod === 'M'
                                      ? 'bg-teal-100 text-teal-800 border-teal-300'
                                      : cod === 'T'
                                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                        : cod === 'MT'
                                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                                          : 'bg-slate-100 text-slate-600 border-slate-300';
                                  return (
                                    <span
                                      key={`${t.dia}-${tIdx}`}
                                      title={`Día ${t.dia}: ${t.tipoTurno} (${t.codigoOriginal})`}
                                      className={`px-1.5 py-0.5 rounded border font-mono text-[10px] font-bold ${badgeStyle}`}
                                    >
                                      {String(t.dia).padStart(2, '0')}:{cod || t.codigoOriginal}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500">
            Los turnos confirmados se reflejan inmediatamente en el Rol por Fecha y en la atención del día.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isAnalyzing}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-xl cursor-pointer disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarAsignacion}
              disabled={isAnalyzing || filasListas.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={15} />
              <span>Confirmar y Asignar Turnos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
