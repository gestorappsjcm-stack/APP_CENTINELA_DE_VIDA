import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { Paciente, TipoDocumento, TipoSeguro } from '../../types';
import {
  X,
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  CopyCheck,
  Loader2,
  Trash2,
} from 'lucide-react';
import { parseDistritoParaFormulario } from '../../lib/distritosHelper';
import {
  buscarConflictoPaciente,
  calcularEdadDesdeFecha,
  normalizarDocumento,
  normalizarHcl,
} from '../../lib/pacientesHelper';

interface ParsedRow {
  rowIndex: number;
  paciente: Omit<Paciente, 'id' | 'fecha_ingreso'>;
  status: 'nuevo' | 'duplicado_bloque' | 'ya_registrado' | 'invalido';
  statusDetail: string;
}

const cleanSpaces = (s: unknown): string =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeHeaderKey = (h: unknown): string =>
  cleanSpaces(h)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const parseFechaToIso = (raw: unknown): string | undefined => {
  if (raw === null || raw === undefined || raw === '') return undefined;

  // Número serial de fecha de Excel
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 1000 && raw < 100000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = cleanSpaces(raw);
  if (!str) return undefined;

  // Excel serial como string numérico puro
  if (/^\d{4,5}(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (num > 1000 && num < 100000) {
      const parsed = XLSX.SSF.parse_date_code(num);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  return undefined;
};

const normalizeSexo = (raw: unknown): 'M' | 'F' | undefined => {
  const s = cleanSpaces(raw).toUpperCase();
  if (!s) return undefined;
  if (s === 'F' || s.startsWith('FEM')) return 'F';
  if (s === 'M' || s.startsWith('MAS')) return 'M';
  return undefined;
};

const normalizeSeguro = (raw: unknown): { seguro: TipoSeguro; otro?: string } => {
  const s = cleanSpaces(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (!s || s === '-' || s === 'NINGUNO' || s === 'PARTICULAR' || s === 'SIN SEGURO') {
    return { seguro: 'NINGUNO' };
  }
  if (s.includes('SIS')) return { seguro: 'SIS' };
  if (s.includes('ESSALUD') || s.includes('ES SALUD')) return { seguro: 'ESSALUD' };
  if (s.includes('EPS')) return { seguro: 'EPS' };
  if (s.includes('PRIV')) return { seguro: 'PRIVADO' };
  return { seguro: 'OTRO', otro: cleanSpaces(raw).toUpperCase() };
};

const detectTipoDoc = (doc: string): TipoDocumento => {
  if (!doc) return 'INDOCUMENTADO';
  if (/^\d{8}$/.test(doc)) return 'DNI';
  if (/^\d{9}$/.test(doc)) return 'CE';
  return 'PASAPORTE';
};

const normalizeTipoDoc = (raw: unknown, doc: string): TipoDocumento => {
  const s = cleanSpaces(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (s.includes('INDOC') || s.includes('SIN DOC')) return 'INDOCUMENTADO';
  if (s === 'CE' || s.includes('EXTRANJ') || s.includes('CARNET')) return 'CE';
  if (s.includes('PASA')) return 'PASAPORTE';
  if (s.includes('DNI')) return 'DNI';
  return detectTipoDoc(doc);
};

const normalizeEstadoPaciente = (raw: unknown): 'activo' | 'inactivo' => {
  const s = cleanSpaces(raw).toUpperCase();
  if (s === 'INACTIVO' || s === 'BAJA' || s === 'PASIVO') return 'inactivo';
  return 'activo';
};

const isHeaderRow = (cells: string[]): boolean => {
  const joined = cells.map(normalizeHeaderKey).join(' ');
  return (
    joined.includes('APELLIDOS Y NOMBRES') ||
    joined.includes('NOMBRES Y APELLIDOS') ||
    (joined.includes('APELLIDO') && joined.includes('NOMBRE')) ||
    ((joined.includes('DNI') || joined.includes('DOCUMENTO')) &&
      (joined.includes('HCL') ||
        joined.includes('HISTORIA') ||
        joined.includes('PACIENTE') ||
        joined.includes('NOMBRE'))) ||
    joined.includes('FECHA DE NACIMIENTO')
  );
};

interface ColumnMap {
  tipoDoc: number;
  doc: number;
  nombres: number;
  apellidoPaterno: number;
  apellidoMaterno: number;
  soloNombres: number;
  hcl: number;
  fechaNac: number;
  edad: number;
  sexo: number;
  estadoCivil: number;
  gradoInstruccion: number;
  seguro: number;
  distrito: number;
  direccion: number;
  celular: number;
  estado: number;
  tutorNombres: number;
  tutorDoc: number;
  tutorCelular: number;
  tutorParentesco: number;
}

const DEFAULT_COL_MAP: ColumnMap = {
  tipoDoc: -1,
  doc: 0,
  nombres: 1,
  apellidoPaterno: -1,
  apellidoMaterno: -1,
  soloNombres: -1,
  hcl: 2,
  fechaNac: 3,
  edad: 4,
  sexo: 5,
  estadoCivil: -1,
  gradoInstruccion: -1,
  seguro: 6,
  distrito: 7,
  direccion: 8,
  celular: 9,
  estado: -1,
  tutorNombres: -1,
  tutorDoc: -1,
  tutorCelular: -1,
  tutorParentesco: -1,
};

const EMPTY_COL_MAP: ColumnMap = {
  tipoDoc: -1,
  doc: -1,
  nombres: -1,
  apellidoPaterno: -1,
  apellidoMaterno: -1,
  soloNombres: -1,
  hcl: -1,
  fechaNac: -1,
  edad: -1,
  sexo: -1,
  estadoCivil: -1,
  gradoInstruccion: -1,
  seguro: -1,
  distrito: -1,
  direccion: -1,
  celular: -1,
  estado: -1,
  tutorNombres: -1,
  tutorDoc: -1,
  tutorCelular: -1,
  tutorParentesco: -1,
};

const detectColumnMap = (headerCells: string[]): ColumnMap => {
  const map: ColumnMap = { ...EMPTY_COL_MAP };
  headerCells.forEach((cell, idx) => {
    const k = normalizeHeaderKey(cell);
    if (!k) return;

    if (k.includes('TUTOR') || k.includes('APODERADO')) {
      if (k.includes('DNI') || k.includes('DOC')) map.tutorDoc = idx;
      else if (k.includes('CEL') || k.includes('TEL')) map.tutorCelular = idx;
      else if (k.includes('PARENT')) map.tutorParentesco = idx;
      else map.tutorNombres = idx;
      return;
    }

    if (k.includes('TIPO') && k.includes('DOC')) map.tipoDoc = idx;
    else if (
      k === 'DNI' ||
      k.includes('NRO DOC') ||
      k.includes('N° DOC') ||
      k.includes('NUMERO DOC') ||
      k.includes('DOCUMENTO') ||
      k.includes('PASAPORTE')
    ) {
      map.doc = idx;
    } else if (k.includes('APELLIDO PATERNO') || k === 'AP. PATERNO' || k === 'PATERNO') {
      map.apellidoPaterno = idx;
    } else if (k.includes('APELLIDO MATERNO') || k === 'AP. MATERNO' || k === 'MATERNO') {
      map.apellidoMaterno = idx;
    } else if (k.includes('APELLIDOS Y NOMBRES') || k.includes('NOMBRES Y APELLIDOS') || k.includes('PACIENTE')) {
      map.nombres = idx;
    } else if (k === 'APELLIDOS') {
      map.apellidoPaterno = idx;
    } else if (k === 'NOMBRES' || k === 'NOMBRE') {
      map.soloNombres = idx;
    } else if (k.includes('HCL') || k.includes('HISTORIA')) {
      map.hcl = idx;
    } else if (k.includes('NACIM') || k.includes('F. NAC') || k.includes('FNAC') || k.includes('F.NAC')) {
      map.fechaNac = idx;
    } else if (k === 'EDAD' || k.startsWith('EDAD ')) {
      map.edad = idx;
    } else if (k.includes('SEXO') || k.includes('GENERO')) {
      map.sexo = idx;
    } else if (k.includes('ESTADO CIVIL')) {
      map.estadoCivil = idx;
    } else if (k.includes('INSTRUCC') || k.includes('ESCOLAR')) {
      map.gradoInstruccion = idx;
    } else if (k.includes('SEGURO') || k.includes('IAFAS') || k.includes('FINANC')) {
      map.seguro = idx;
    } else if (k.includes('DISTRITO') || k.includes('PROCEDENCIA')) {
      map.distrito = idx;
    } else if (k.includes('DIRECCION') || k.includes('DOMICILIO')) {
      map.direccion = idx;
    } else if (k.includes('TELEF') || k.includes('CELUL')) {
      map.celular = idx;
    } else if (k === 'ESTADO') {
      map.estado = idx;
    } else if (k.includes('PARENTESCO')) {
      map.tutorParentesco = idx;
    }
  });

  if (map.nombres === -1 && map.soloNombres !== -1 && map.apellidoPaterno === -1) {
    map.nombres = map.soloNombres;
    map.soloNombres = -1;
  }
  return map;
};

const getCell = (row: unknown[], idx: number): unknown => (idx >= 0 ? row[idx] : undefined);

const splitTextLine = (line: string, sep: '\t' | ';' | ','): string[] => {
  if (sep === '\t') return line.split('\t').map((c) => cleanSpaces(c));
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(cleanSpaces(current));
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(cleanSpaces(current));
  return result;
};

export const ModalImportarPacientes: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    pacientes,
    importarPacientesMasivo,
    deleteAllPacientes,
    currentUser,
    isDeveloperMode,
  } = useApp();
  const isDeveloper = isDeveloperMode || currentUser.rol === 'desarrollador';

  const [rawText, setRawText] = useState('');
  const [matrixRows, setMatrixRows] = useState<unknown[][]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmClearDb, setConfirmClearDb] = useState(false);
  const [isClearingDb, setIsClearingDb] = useState(false);
  const [clearDbMsg, setClearDbMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    skippedDuplicates: number;
    errors: string[];
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleClose = () => {
    if (isImporting || isClearingDb) return;
    setConfirmClearDb(false);
    setClearDbMsg(null);
    setActiveModal(null);
  };

  const handleClearDbNow = async () => {
    if (!isDeveloper || isClearingDb || isImporting) return;
    setIsClearingDb(true);
    setClearDbMsg(null);
    const res = await deleteAllPacientes();
    setIsClearingDb(false);
    setConfirmClearDb(false);
    if (res.success) {
      setImportResult(null);
      setClearDbMsg({
        type: 'ok',
        text: 'Padrón anterior eliminado correctamente. Todos los registros del nuevo Excel figuran listos para importar.',
      });
    } else {
      setClearDbMsg({
        type: 'err',
        text: res.error || 'No se pudo vaciar la tabla de pacientes.',
      });
    }
  };

  const handlePasteTextChange = (text: string) => {
    setRawText(text);
    setFileName(null);
    setImportResult(null);
    setParseError(null);

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
      setMatrixRows([]);
      return;
    }

    const first = lines[0];
    const sep: '\t' | ';' | ',' = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ',';
    const parsed = lines.map((line) => splitTextLine(line, sep));
    setMatrixRows(parsed);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setParseError(null);
    setImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setParseError('El archivo Excel no contiene hojas legibles.');
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
      const nonEmptyRows = rows.filter(
        (r) => Array.isArray(r) && r.some((cell) => cleanSpaces(cell).length > 0)
      );
      if (nonEmptyRows.length === 0) {
        setParseError('No se encontraron filas con datos en el archivo.');
        return;
      }
      setFileName(file.name);
      setRawText('');
      setMatrixRows(nonEmptyRows);
    } catch (err: any) {
      setParseError(`No se pudo leer el archivo: ${err?.message || 'formato inválido'}`);
    }
  };

  const parsedRows: ParsedRow[] = useMemo(() => {
    if (matrixRows.length === 0) return [];

    let startIdx = 0;
    let colMap = DEFAULT_COL_MAP;

    const firstRowCells = matrixRows[0].map((c) => cleanSpaces(c));
    if (isHeaderRow(firstRowCells)) {
      colMap = detectColumnMap(firstRowCells);
      startIdx = 1;
    }

    const seenInBlockDocs = new Set<string>();
    const seenInBlockHcls = new Set<string>();
    const results: ParsedRow[] = [];

    for (let i = startIdx; i < matrixRows.length; i++) {
      const row = matrixRows[i];
      const docRaw = normalizarDocumento(cleanSpaces(getCell(row, colMap.doc)));
      const nombreDirecto = cleanSpaces(getCell(row, colMap.nombres)).toUpperCase();
      const nombreCombinado = [
        cleanSpaces(getCell(row, colMap.apellidoPaterno)),
        cleanSpaces(getCell(row, colMap.apellidoMaterno)),
        cleanSpaces(getCell(row, colMap.soloNombres)),
      ]
        .filter(Boolean)
        .join(' ')
        .toUpperCase();
      const nombres = nombreDirecto || nombreCombinado;

      const hcl = normalizarHcl(cleanSpaces(getCell(row, colMap.hcl)));
      const fechaNac = parseFechaToIso(getCell(row, colMap.fechaNac));
      const edadAuto = calcularEdadDesdeFecha(fechaNac);
      const edadRawNum = Number(cleanSpaces(getCell(row, colMap.edad)));
      const edadFinal =
        typeof edadAuto === 'number'
          ? edadAuto
          : Number.isFinite(edadRawNum) && edadRawNum >= 0
          ? Math.round(edadRawNum)
          : undefined;
      const sexo = normalizeSexo(getCell(row, colMap.sexo));
      const segNorm = normalizeSeguro(getCell(row, colMap.seguro));
      const distParsed = parseDistritoParaFormulario(cleanSpaces(getCell(row, colMap.distrito)));
      const direccion = cleanSpaces(getCell(row, colMap.direccion)).toUpperCase();
      const celular = cleanSpaces(getCell(row, colMap.celular));
      const estadoCivil = cleanSpaces(getCell(row, colMap.estadoCivil)).toUpperCase() || 'SOLTERO';
      const gradoInstruccion = cleanSpaces(getCell(row, colMap.gradoInstruccion)).toUpperCase() || 'SECUNDARIA';
      const estadoPac = normalizeEstadoPaciente(getCell(row, colMap.estado));
      const tutorNombres = cleanSpaces(getCell(row, colMap.tutorNombres)).toUpperCase();
      const tutorDoc = normalizarDocumento(cleanSpaces(getCell(row, colMap.tutorDoc)));
      const tutorCelular = cleanSpaces(getCell(row, colMap.tutorCelular));
      const tutorParentesco = cleanSpaces(getCell(row, colMap.tutorParentesco)).toUpperCase() || 'PADRE';
      const tieneTutor = Boolean(tutorNombres || tutorDoc);

      if (!nombres && !docRaw && !hcl) continue;

      const tipoDoc = normalizeTipoDoc(getCell(row, colMap.tipoDoc), docRaw);
      const pacienteObj: Omit<Paciente, 'id' | 'fecha_ingreso'> = {
        tipo_documento: tipoDoc,
        numero_documento: tipoDoc !== 'INDOCUMENTADO' ? docRaw : undefined,
        codigo_temporal:
          tipoDoc === 'INDOCUMENTADO'
            ? `IND-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`
            : undefined,
        hcl: hcl || undefined,
        apellidos_nombres: nombres,
        fecha_nacimiento: fechaNac,
        edad: edadFinal,
        sexo,
        estado_civil: estadoCivil,
        grado_instruccion: gradoInstruccion,
        seguro: segNorm.seguro,
        seguro_otro_especificar: segNorm.otro,
        direccion: direccion || undefined,
        distrito: distParsed.distrito,
        distrito_otro_especificar: distParsed.distrito === 'OTRO' ? distParsed.distritoOtro : undefined,
        celular: celular || undefined,
        estado: estadoPac,
        tiene_tutor: tieneTutor,
        ...(tieneTutor
          ? {
              tutor_nombres: tutorNombres || undefined,
              tutor_tipo_documento: tutorDoc ? detectTipoDoc(tutorDoc) : 'DNI',
              tutor_numero_documento: tutorDoc || undefined,
              tutor_celular: tutorCelular || undefined,
              tutor_parentesco: tutorParentesco,
            }
          : {}),
      };

      if (!nombres) {
        results.push({
          rowIndex: i + 1,
          paciente: pacienteObj,
          status: 'invalido',
          statusDetail: 'Falta Apellidos y Nombres',
        });
        continue;
      }

      // Verificar duplicado contra pacientes ya existentes en el sistema
      const conflictoSistema = buscarConflictoPaciente(
        {
          tipo_documento: tipoDoc,
          numero_documento: docRaw,
          hcl,
        },
        pacientes
      );
      if (conflictoSistema) {
        results.push({
          rowIndex: i + 1,
          paciente: pacienteObj,
          status: 'ya_registrado',
          statusDetail: `Ya existe (${conflictoSistema.field === 'hcl' ? `HCL ${hcl}` : `Doc ${docRaw}`})`,
        });
        continue;
      }

      // Verificar duplicado dentro del mismo bloque pegado/cargado
      if ((docRaw && seenInBlockDocs.has(docRaw)) || (hcl && seenInBlockHcls.has(hcl))) {
        results.push({
          rowIndex: i + 1,
          paciente: pacienteObj,
          status: 'duplicado_bloque',
          statusDetail: `Duplicado repetido en el bloque (${hcl ? `HCL ${hcl}` : `Doc ${docRaw}`})`,
        });
        continue;
      }

      if (docRaw) seenInBlockDocs.add(docRaw);
      if (hcl) seenInBlockHcls.add(hcl);

      results.push({
        rowIndex: i + 1,
        paciente: pacienteObj,
        status: 'nuevo',
        statusDetail: 'Único listo para guardar',
      });
    }

    return results;
  }, [matrixRows, pacientes]);

  const nuevosUnicos = useMemo(
    () => parsedRows.filter((r) => r.status === 'nuevo').map((r) => r.paciente),
    [parsedRows]
  );

  const countDuplicados = parsedRows.filter(
    (r) => r.status === 'duplicado_bloque' || r.status === 'ya_registrado'
  ).length;

  const handleImportar = async () => {
    if (!isDeveloper || nuevosUnicos.length === 0 || isImporting) return;
    setIsImporting(true);
    setImportResult(null);
    const res = await importarPacientesMasivo(nuevosUnicos);
    setIsImporting(false);
    setImportResult(res);
  };

  const limpiarTodo = () => {
    setRawText('');
    setMatrixRows([]);
    setFileName(null);
    setImportResult(null);
    setParseError(null);
  };

  if (activeModal !== 'importarPacientes' || !isDeveloper) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Importar / Pegar Bloque de Pacientes desde Excel
              </h3>
              <p className="text-xs text-slate-500">
                Cálculo automático de edad desde fecha de nacimiento y eliminación automática de duplicados (DNI / HCL único)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isImporting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Opción de reemplazo limpio del padrón anterior (Exclusivo Desarrollador) */}
          {pacientes.length > 0 && (
            <div className="p-3 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200">
                <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                <span>
                  Actualmente hay <strong>{pacientes.length}</strong> paciente(s) registrado(s). Si vas a cargar un Excel completo desde cero, limpia primero el padrón anterior.
                </span>
              </div>
              {confirmClearDb ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isClearingDb}
                    onClick={handleClearDbNow}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isClearingDb ? 'Limpiando...' : `Sí, vaciar ${pacientes.length} registros`}
                  </button>
                  <button
                    type="button"
                    disabled={isClearingDb}
                    onClick={() => setConfirmClearDb(false)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setClearDbMsg(null);
                    setConfirmClearDb(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg font-bold cursor-pointer shrink-0 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Limpiar Tabla ({pacientes.length})</span>
                </button>
              )}
            </div>
          )}

          {clearDbMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium ${
                clearDbMsg.type === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {clearDbMsg.text}
            </div>
          )}

          {/* Opciones de carga */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <ClipboardPaste size={14} className="text-teal-600" />
                  <span>Pegar filas copiadas directamente desde Excel (Ctrl+V):</span>
                </label>
                {(rawText || matrixRows.length > 0) && (
                  <button
                    type="button"
                    onClick={limpiarTodo}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => handlePasteTextChange(e.target.value)}
                placeholder={
                  'Seleccione sus filas en Excel (con o sin encabezado) y presione Ctrl+V aquí.\nOrden esperado: DNI/Pasaporte | Apellidos y Nombres | HCL | Fecha Nac. (dd/mm/aaaa) | Edad | Sexo | Seguro | Distrito | Dirección | Teléfono'
                }
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex flex-col justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Upload size={14} className="text-emerald-600" />
                  <span>O subir archivo Excel / CSV</span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Soporta archivos <span className="font-mono font-semibold">.xlsx</span>,{' '}
                  <span className="font-mono font-semibold">.xls</span> y{' '}
                  <span className="font-mono font-semibold">.csv</span>.
                </p>
                {fileName && (
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                    Archivo cargado: {fileName}
                  </p>
                )}
              </div>

              <label className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                <Upload size={14} />
                <span>Seleccionar Archivo Excel</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {parseError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-600" />
              <span>{parseError}</span>
            </div>
          )}

          {importResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                importResult.errors.length > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>
                  Importación completada: {importResult.inserted} paciente(s) único(s) guardado(s) en la base de datos
                  {importResult.skippedDuplicates > 0
                    ? ` • ${importResult.skippedDuplicates} duplicado(s) omitido(s)`
                    : ''}
                  .
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <ul className="list-disc pl-6 text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Resumen de previsualización */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/80 dark:bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Filas leídas: {parsedRows.length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold">
                    Únicos nuevos a guardar: {nuevosUnicos.length}
                  </span>
                  {countDuplicados > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-bold flex items-center gap-1">
                      <CopyCheck size={12} />
                      Duplicados detectados y omitidos: {countDuplicados}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  * La edad mostrada es calculada automáticamente a la fecha de hoy
                </span>
              </div>

              {/* Tabla Preview */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Estado Único</th>
                        <th className="py-2 px-3">Documento</th>
                        <th className="py-2 px-3">Apellidos y Nombres</th>
                        <th className="py-2 px-3">HCL</th>
                        <th className="py-2 px-3">F. Nac. / Edad Auto</th>
                        <th className="py-2 px-3">Sexo</th>
                        <th className="py-2 px-3">Seguro</th>
                        <th className="py-2 px-3">Distrito</th>
                        <th className="py-2 px-3">Teléfono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {parsedRows.map((item) => {
                        const p = item.paciente;
                        const badgeClass =
                          item.status === 'nuevo'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : item.status === 'duplicado_bloque'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : item.status === 'ya_registrado'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                            : 'bg-rose-100 text-rose-800';

                        return (
                          <tr
                            key={`${item.rowIndex}-${p.numero_documento || p.hcl || p.apellidos_nombres}`}
                            className={item.status !== 'nuevo' ? 'bg-slate-50/70 dark:bg-slate-900/40 opacity-75' : ''}
                          >
                            <td className="py-2 px-3 text-slate-400 font-mono">{item.rowIndex}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${badgeClass}`}>
                                {item.statusDetail}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold">
                              {p.numero_documento || p.codigo_temporal || '-'}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                              {p.apellidos_nombres || '-'}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                              {p.hcl || '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {p.fecha_nacimiento || '-'} •{' '}
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {typeof p.edad === 'number' ? `${p.edad}a` : '-'}
                              </span>
                            </td>
                            <td className="py-2 px-3">{p.sexo || '-'}</td>
                            <td className="py-2 px-3 font-bold">{p.seguro}</td>
                            <td className="py-2 px-3">
                              {p.distrito === 'OTRO' && p.distrito_otro_especificar
                                ? `Otro: ${p.distrito_otro_especificar}`
                                : p.distrito}
                            </td>
                            <td className="py-2 px-3 font-mono">{p.celular || '-'}</td>
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
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-850 shrink-0">
          <span className="text-[11px] text-slate-500">
            Los registros repetidos se descartan automáticamente para mantener 1 solo registro único por paciente.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleImportar}
              disabled={nuevosUnicos.length === 0 || isImporting}
              className="px-5 py-2 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] disabled:opacity-50 text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Guardando en Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Importar {nuevosUnicos.length} Paciente(s) Único(s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
