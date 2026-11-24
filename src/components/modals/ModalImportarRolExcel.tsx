import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { AsignacionTurnoDia, CodigoTurnoRol } from '../../types';
import {
  MESES_NOMBRES,
  aplicarCodigoTurnoProfesional,
  formatFechaIso,
  getDaysInMonth,
  getDiaSemanaLetra,
  matchConsultorioPorCodigoONombre,
  matchProfesionalPorNombreODni,
  normalizarTextoComparacion,
} from '../../lib/turnosHelper';
import {
  X,
  FileSpreadsheet,
  FileUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  UserCheck,
  Table2,
} from 'lucide-react';

interface TurnoExcelItem {
  dia: number;
  codigoOriginal: string;
  codigo: CodigoTurnoRol;
}

interface FilaRevisionExcel {
  key: string;
  incluir: boolean;
  nombreExcel: string;
  dniExcel?: string;
  profesionalId: string;
  consultorioId: string;
  turnos: TurnoExcelItem[];
}

interface ModalImportarRolExcelProps {
  isOpen: boolean;
  onClose: () => void;
  anioActual: number;
  mesActual: number;
  onApplied?: (anio: number, mes: number, totalTurnos: number) => void;
}

const MESES_UPPER = MESES_NOMBRES.map((m) => m.toUpperCase());

const parseCodigoTurnoExcel = (rawVal: string): CodigoTurnoRol | '' => {
  const val = String(rawVal || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  if (!val || val === '-' || val === '--' || val === '0') return '';

  if (
    val === 'MT' ||
    val === 'M/T' ||
    val === 'M-T' ||
    val === 'M+T' ||
    val === 'MAÑANA Y TARDE' ||
    val === 'MANANA Y TARDE' ||
    val === 'GD' ||
    val === '12H' ||
    val === '08-20'
  ) {
    return 'MT';
  }
  if (val === 'M' || val === 'MANANA' || val === 'AM' || val === 'M1' || val === 'M2' || val === '08-14') {
    return 'M';
  }
  if (val === 'T' || val === 'TARDE' || val === 'PM' || val === 'T1' || val === 'T2' || val === '14-20') {
    return 'T';
  }
  if (val === 'F' || val === 'FER' || val.includes('FERIADO')) {
    return 'F';
  }
  if (
    val === 'V' ||
    val.includes('VAC') ||
    val.includes('LIC') ||
    val.includes('MATERNIDAD') ||
    val === 'PERM' ||
    val === 'DM'
  ) {
    return 'V';
  }
  if (val === 'D' || val === 'DESC' || val.includes('DESCANSO') || val === 'DOM') {
    return 'D';
  }
  if (val === 'L' || val === 'FR' || val.includes('LIBRE') || val === 'H' || val.includes('HOSPITAL')) {
    return 'L';
  }
  return '';
};

const esTextoPieORegla = (textoNorm: string): boolean => {
  if (!textoNorm) return true;
  const bloqueados = [
    'DIRECTOR',
    'JEFE DE PERSONAL',
    'JEFE DEL EE SS',
    'AREA DE CONTROL',
    'TURNO MANANA',
    'TURNO TARDE',
    'TURNO NOCHE',
    'ROTACION HOSPITAL',
    'TOTAL HORAS',
    'LEYENDA',
    'OBSERVACIONES',
  ];
  return bloqueados.some((b) => textoNorm.startsWith(b) || textoNorm === b);
};

export const ModalImportarRolExcel: React.FC<ModalImportarRolExcelProps> = ({
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

  const canImportExcel =
    isDeveloperMode ||
    currentUser.rol === 'desarrollador' ||
    currentUser.rol === 'administrador';

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);

  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoResumen, setInfoResumen] = useState<string>('');
  const [targetAnio, setTargetAnio] = useState<number>(anioActual);
  const [targetMes, setTargetMes] = useState<number>(mesActual);
  const [reemplazarMes, setReemplazarMes] = useState<boolean>(false);
  const [filas, setFilas] = useState<FilaRevisionExcel[]>([]);

  const profesionalesActivos = useMemo(
    () => profesionales.filter((p) => p.estado === 'ACTIVO'),
    [profesionales]
  );

  if (!isOpen || !canImportExcel) return null;

  const resetModalState = () => {
    workbookRef.current = null;
    setFileName('');
    setSheetNames([]);
    setSelectedSheet('');
    setErrorMsg(null);
    setInfoResumen('');
    setFilas([]);
    setTargetAnio(anioActual);
    setTargetMes(mesActual);
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const parseSheetFromWorkbook = (wb: XLSX.WorkBook, sheetName: string) => {
    setErrorMsg(null);
    setInfoResumen('');
    setFilas([]);

    const ws = wb.Sheets[sheetName];
    if (!ws) {
      setErrorMsg(`No se encontró la hoja "${sheetName}" en el archivo Excel.`);
      return;
    }

    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      defval: '',
      raw: true,
    });

    if (!rawRows || rawRows.length < 2) {
      setErrorMsg('La hoja seleccionada no contiene datos suficientes para importar.');
      return;
    }

    // Copiar matriz para expandir merges sin mutar el objeto original
    const grid: string[][] = rawRows.map((row) =>
      Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []
    );

    // 1. Detectar fila encabezado con columnas numéricas 1..31
    let headerRowIdx = -1;
    let bestDayColMap = new Map<number, number>(); // colIdx -> dia (1..31)

    const maxHeaderScan = Math.min(grid.length, 30);
    for (let r = 0; r < maxHeaderScan; r++) {
      const row = grid[r];
      const tempMap = new Map<number, number>();
      const seenDays = new Set<number>();

      for (let c = 0; c < row.length; c++) {
        const cell = row[c].trim();
        if (/^0?[1-9]$|^[12][0-9]$|^3[01]$/.test(cell)) {
          const dayNum = Number(cell);
          if (dayNum >= 1 && dayNum <= 31 && !seenDays.has(dayNum)) {
            seenDays.add(dayNum);
            tempMap.set(c, dayNum);
          }
        }
      }

      if (tempMap.size >= 12 && tempMap.size > bestDayColMap.size) {
        bestDayColMap = tempMap;
        headerRowIdx = r;
      }
    }

    if (headerRowIdx < 0 || bestDayColMap.size === 0) {
      setErrorMsg(
        'No se detectaron columnas numéricas de días (1 al 31) en esta hoja. Verifica el formato o descarga la plantilla Excel.'
      );
      return;
    }

    const dayCols = Array.from(bestDayColMap.keys());
    const minDayCol = Math.min(...dayCols);
    const maxDayCol = Math.max(...dayCols);

    // 2. Expandir celdas combinadas (ej. VACACIONES 2026 o LICENCIA POR MATERNIDAD) sobre las columnas de días
    const merges = ws['!merges'] || [];
    for (const m of merges) {
      if (m.e.r <= headerRowIdx) continue;
      if (m.e.c < minDayCol || m.s.c > maxDayCol) continue;

      const anchorVal = String(grid[m.s.r]?.[m.s.c] ?? '').trim();
      if (!anchorVal) continue;

      const startR = Math.max(m.s.r, headerRowIdx + 1);
      const endR = Math.min(m.e.r, grid.length - 1);
      const startC = Math.max(m.s.c, minDayCol);
      const endC = Math.min(m.e.c, maxDayCol);

      for (let rr = startR; rr <= endR; rr++) {
        if (!grid[rr]) continue;
        for (let cc = startC; cc <= endC; cc++) {
          if (!grid[rr][cc]) {
            grid[rr][cc] = anchorVal;
          }
        }
      }
    }

    // 3. Detectar Mes y Año en encabezados superiores o nombre de hoja
    let detectedMes = mesActual;
    let detectedAnio = anioActual;
    const headerContextStrings: string[] = [sheetName];
    for (let r = 0; r <= headerRowIdx; r++) {
      headerContextStrings.push((grid[r] || []).join(' '));
    }
    const headerContextUpper = normalizarTextoComparacion(headerContextStrings.join(' '));

    for (let i = 0; i < MESES_UPPER.length; i++) {
      if (headerContextUpper.includes(MESES_UPPER[i])) {
        detectedMes = i + 1;
        break;
      }
    }
    const yearMatch = headerContextUpper.match(/\b(202[0-9]|203[0-9])\b/);
    if (yearMatch) {
      detectedAnio = Number(yearMatch[1]);
    }
    setTargetMes(detectedMes);
    setTargetAnio(detectedAnio);

    // 4. Ubicar columnas de Nombre, DNI y Consultorio
    let nameCol = -1;
    let dniCol = -1;
    let consultorioCol = -1;

    const headerSearchStart = Math.max(0, headerRowIdx - 2);
    for (let r = headerSearchStart; r <= headerRowIdx; r++) {
      const row = grid[r] || [];
      for (let c = 0; c < row.length; c++) {
        if (bestDayColMap.has(c)) continue;
        const hNorm = normalizarTextoComparacion(row[c]);
        if (!hNorm) continue;

        if (
          nameCol === -1 &&
          c < minDayCol &&
          (hNorm.includes('APELLIDO') ||
            hNorm.includes('NOMBRE') ||
            hNorm.includes('PERSONAL') ||
            hNorm.includes('PROFESIONAL') ||
            hNorm.includes('TRABAJADOR'))
        ) {
          nameCol = c;
        }
        if (
          dniCol === -1 &&
          c < minDayCol &&
          (hNorm === 'DNI' || hNorm.includes('DOCUMENTO') || hNorm.includes('NRO DOC'))
        ) {
          dniCol = c;
        }
        if (
          consultorioCol === -1 &&
          !hNorm.includes('CONDICION') &&
          (hNorm.includes('CONSULTORIO') || hNorm.includes('SERVICIO') || hNorm.includes('AMBIENTE'))
        ) {
          consultorioCol = c;
        }
      }
    }

    // Fallback para nameCol: columna antes del primer día con más textos de nombres
    if (nameCol === -1) {
      let bestScore = 0;
      for (let c = 0; c < minDayCol; c++) {
        let score = 0;
        for (let r = headerRowIdx + 1; r < grid.length; r++) {
          const val = (grid[r]?.[c] || '').trim();
          if (val.length >= 6 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(val) && !/^\d+$/.test(val)) {
            score++;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          nameCol = c;
        }
      }
    }

    if (nameCol === -1) {
      setErrorMsg('No se pudo identificar la columna de Apellidos y Nombres en el Excel.');
      return;
    }

    // 5. Leer filas de profesionales y sus turnos
    const parsedFilas: FilaRevisionExcel[] = [];
    for (let r = headerRowIdx + 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const nombreRaw = (row[nameCol] || '').trim();
      const nombreNorm = normalizarTextoComparacion(nombreRaw);

      if (!nombreRaw || nombreRaw.length < 4 || /^\d+$/.test(nombreRaw)) continue;
      if (esTextoPieORegla(nombreNorm)) continue;

      const dniRaw = dniCol >= 0 ? (row[dniCol] || '').trim() : '';
      const consRaw = consultorioCol >= 0 ? (row[consultorioCol] || '').trim() : '';

      const turnosFila: TurnoExcelItem[] = [];
      for (const [colIdx, dia] of bestDayColMap.entries()) {
        const cellRaw = (row[colIdx] || '').trim();
        if (!cellRaw) continue;
        const codigo = parseCodigoTurnoExcel(cellRaw);
        if (!codigo) continue;
        turnosFila.push({
          dia,
          codigoOriginal: cellRaw,
          codigo,
        });
      }

      if (turnosFila.length === 0) continue;

      turnosFila.sort((a, b) => a.dia - b.dia);

      const profMatch = matchProfesionalPorNombreODni(
        nombreRaw,
        dniRaw,
        undefined,
        profesionalesActivos
      );
      const consMatch = matchConsultorioPorCodigoONombre(consRaw, profMatch, consultorios);

      parsedFilas.push({
        key: `xlsx-${r}-${nombreRaw}`,
        incluir: Boolean(profMatch),
        nombreExcel: nombreRaw,
        dniExcel: dniRaw || undefined,
        profesionalId: profMatch?.id || '',
        consultorioId: consMatch?.id || consultorios[0]?.id || '',
        turnos: turnosFila,
      });
    }

    if (parsedFilas.length === 0) {
      setErrorMsg(
        'No se encontraron filas con códigos de turno válidos (M, T, MT, L, D, V, F) debajo del encabezado.'
      );
      return;
    }

    const totalTurnosDetectados = parsedFilas.reduce((acc, f) => acc + f.turnos.length, 0);
    setInfoResumen(
      `Hoja "${sheetName}": ${parsedFilas.length} fila(s) detectadas con ${totalTurnosDetectados} turno(s) para ${MESES_NOMBRES[detectedMes - 1]} ${detectedAnio}.`
    );
    setFilas(parsedFilas);
  };

  const procesarArchivoExcel = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
      setErrorMsg('Por favor selecciona un archivo Excel (.xlsx, .xls o .csv).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('El archivo supera el límite de 15 MB.');
      return;
    }

    setFileName(file.name);
    setErrorMsg(null);
    setFilas([]);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        setErrorMsg('El archivo Excel no contiene hojas válidas.');
        return;
      }

      workbookRef.current = wb;
      setSheetNames(wb.SheetNames);

      // Preferir hoja cuyo nombre coincida con el mes actual si hay varias
      const mesBuscado = MESES_UPPER[mesActual - 1];
      const matchingSheet =
        wb.SheetNames.find((s) => normalizarTextoComparacion(s).includes(mesBuscado)) ||
        wb.SheetNames[0];

      setSelectedSheet(matchingSheet);
      parseSheetFromWorkbook(wb, matchingSheet);
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo leer el archivo Excel seleccionado.');
    }
  };

  const handleDescargarPlantilla = () => {
    const diasMes = getDaysInMonth(targetAnio, targetMes);
    const mesNombre = MESES_NOMBRES[targetMes - 1].toUpperCase();

    const tituloRow = [`ROL DE TURNOS CSMC CENTINELA DE VIDA — ${mesNombre} ${targetAnio}`];
    const leyendaRow = [
      'Códigos válidos: M (Mañana 08-14h), T (Tarde 14-20h), MT o M/T (Mañana y Tarde), L (Libre/H), D (Descanso), V (Vacaciones/Licencia), F (Feriado)',
    ];
    const headerRow = [
      'N°',
      'APELLIDOS Y NOMBRES',
      'DNI',
      'CONSULTORIO',
      ...Array.from({ length: diasMes }, (_, idx) => idx + 1),
    ];
    const subHeaderRow = [
      '',
      '',
      '',
      '',
      ...Array.from({ length: diasMes }, (_, idx) =>
        getDiaSemanaLetra(targetAnio, targetMes, idx + 1)
      ),
    ];

    const dataRows = profesionalesActivos.map((p, idx) => {
      const cons = consultorios.find(
        (c) => c.id === p.consultorioAsignado || c.codigo === p.consultorioAsignado
      );
      return [
        idx + 1,
        p.apellidos_nombres,
        p.dni || '',
        cons?.codigo || '',
        ...Array.from({ length: diasMes }, () => ''),
      ];
    });

    const aoa = [tituloRow, leyendaRow, headerRow, subHeaderRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 36 },
      { wch: 11 },
      { wch: 14 },
      ...Array.from({ length: diasMes }, () => ({ wch: 4 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mesNombre.slice(0, 31));
    XLSX.writeFile(wb, `Plantilla_Rol_${mesNombre}_${targetAnio}.xlsx`);
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
        const targetConsultorioId = fila.consultorioId || consultorios[0]?.id || '';
        const fecha = formatFechaIso(targetAnio, targetMes, turno.dia);

        acumulados = aplicarCodigoTurnoProfesional({
          turnos: acumulados,
          fecha,
          profesionalId: fila.profesionalId,
          profesionalNombre: prof?.apellidos_nombres || fila.nombreExcel,
          consultorioId: targetConsultorioId,
          codigo: turno.codigo,
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
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#1A2B4A] to-emerald-700 text-white flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-xs">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base">Importar Rol de Turnos desde Excel</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  Admin y Desarrollador
                </span>
              </div>
              <p className="text-xs text-white/80">
                Compatible con tu cuadro mensual de Excel CSMC (.xlsx / .xls) y con celdas combinadas de vacaciones o licencias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDescargarPlantilla}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              <Download size={14} />
              <span>Descargar Plantilla</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Zona de carga Excel */}
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
              if (droppedFile) procesarArchivoExcel(droppedFile);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 bg-slate-50/60 dark:bg-slate-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) procesarArchivoExcel(selected);
                e.target.value = '';
              }}
            />

            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <FileUp size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {fileName
                  ? `Archivo cargado: ${fileName}`
                  : 'Haz clic o arrastra aquí el archivo Excel (.xlsx / .xls) del Rol de Turnos'}
              </p>
              <p className="text-xs text-slate-500 max-w-xl">
                Lee automáticamente columnas del 1 al 31, códigos M, T, MT, M/T, H, L, D, V, F y rangos combinados (Vacaciones / Licencias). Carga instantánea sin límite de API.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDescargarPlantilla();
                }}
                className="sm:hidden mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold cursor-pointer"
              >
                <Download size={13} />
                <span>Descargar Plantilla (.xlsx)</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {sheetNames.length > 1 && workbookRef.current && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <Table2 size={14} className="text-emerald-600" />
                Hoja del libro Excel:
              </span>
              <select
                value={selectedSheet}
                onChange={(e) => {
                  const nextSheet = e.target.value;
                  setSelectedSheet(nextSheet);
                  if (workbookRef.current) {
                    parseSheetFromWorkbook(workbookRef.current, nextSheet);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-semibold"
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filas.length > 0 && (
            <div className="space-y-4">
              {/* Configuración de destino */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Mes destino:
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
                      className="rounded border-slate-300 text-emerald-600"
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

              {infoResumen && (
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                  <FileSpreadsheet size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span>{infoResumen}</span>
                </div>
              )}

              {/* Tabla de revisión */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Usar</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Detectado en Excel</th>
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
                                className="rounded border-slate-300 text-emerald-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {fila.nombreExcel}
                              </div>
                              {fila.dniExcel && (
                                <div className="text-[10px] font-mono text-slate-500">
                                  Doc: {fila.dniExcel}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={fila.profesionalId}
                                onChange={(e) => {
                                  const nextProfId = e.target.value;
                                  const prof = profesionalesActivos.find(
                                    (p) => p.id === nextProfId
                                  );
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
                                <option value="">-- Seleccionar profesional (u omitir) --</option>
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
                                  const badgeStyle =
                                    t.codigo === 'M'
                                      ? 'bg-teal-100 text-teal-800 border-teal-300'
                                      : t.codigo === 'T'
                                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                        : t.codigo === 'MT'
                                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                                          : t.codigo === 'V'
                                            ? 'bg-sky-100 text-sky-800 border-sky-300'
                                            : 'bg-slate-100 text-slate-600 border-slate-300';
                                  return (
                                    <span
                                      key={`${t.dia}-${tIdx}`}
                                      title={`Día ${t.dia}: ${t.codigoOriginal}`}
                                      className={`px-1.5 py-0.5 rounded border font-mono text-[10px] font-bold ${badgeStyle}`}
                                    >
                                      {String(t.dia).padStart(2, '0')}:{t.codigo}
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarAsignacion}
              disabled={filasListas.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
