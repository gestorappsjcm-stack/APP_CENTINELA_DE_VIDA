import { Paciente } from '../types';

/**
 * Calcula la edad exacta en años a partir de una fecha ISO (YYYY-MM-DD).
 */
export const calcularEdadDesdeFecha = (fechaIso?: string): number | undefined => {
  if (!fechaIso) return undefined;
  const clean = fechaIso.trim().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return undefined;
  const nacimiento = new Date(`${clean}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return undefined;
  const hoy = new Date();
  let diff = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    diff--;
  }
  return Math.max(0, diff);
};

export const normalizarDocumento = (doc?: string | null): string =>
  (doc || '').trim().toUpperCase();

export const normalizarHcl = (hcl?: string | null): string =>
  (hcl || '').trim().toUpperCase();

export interface ConflictoDuplicado {
  field: 'numero_documento' | 'hcl' | 'codigo_temporal';
  existing: Paciente;
  message: string;
}

/**
 * Detecta duplicados únicos por Número de Documento, HCL o Código Temporal.
 */
export const buscarConflictoPaciente = (
  candidato: {
    tipo_documento?: string;
    numero_documento?: string | null;
    hcl?: string | null;
    codigo_temporal?: string | null;
  },
  existentes: Paciente[],
  excludeId?: string
): ConflictoDuplicado | null => {
  const docNorm = normalizarDocumento(candidato.numero_documento);
  const hclNorm = normalizarHcl(candidato.hcl);
  const codNorm = normalizarDocumento(candidato.codigo_temporal);

  if (docNorm && candidato.tipo_documento !== 'INDOCUMENTADO') {
    const matchDoc = existentes.find(
      (p) => p.id !== excludeId && normalizarDocumento(p.numero_documento) === docNorm
    );
    if (matchDoc) {
      return {
        field: 'numero_documento',
        existing: matchDoc,
        message: `Ya existe un registro único con Documento ${docNorm}: ${matchDoc.apellidos_nombres}${matchDoc.hcl ? ` (HCL: ${matchDoc.hcl})` : ''}.`,
      };
    }
  }

  if (hclNorm) {
    const matchHcl = existentes.find(
      (p) => p.id !== excludeId && normalizarHcl(p.hcl) === hclNorm
    );
    if (matchHcl) {
      return {
        field: 'hcl',
        existing: matchHcl,
        message: `Ya existe un registro único con HCL ${hclNorm}: ${matchHcl.apellidos_nombres}${matchHcl.numero_documento ? ` (Doc: ${matchHcl.numero_documento})` : ''}.`,
      };
    }
  }

  if (codNorm && candidato.tipo_documento === 'INDOCUMENTADO') {
    const matchCod = existentes.find(
      (p) => p.id !== excludeId && normalizarDocumento(p.codigo_temporal) === codNorm
    );
    if (matchCod) {
      return {
        field: 'codigo_temporal',
        existing: matchCod,
        message: `Ya existe un paciente indocumentado con Código Temporal ${codNorm}: ${matchCod.apellidos_nombres}.`,
      };
    }
  }

  return null;
};

/**
 * Elimina registros duplicados de una lista conservando el primer registro único por Documento / HCL.
 */
export const deduplicarPacientes = (lista: Paciente[]): Paciente[] => {
  const seenDocs = new Set<string>();
  const seenHcls = new Set<string>();
  const result: Paciente[] = [];

  for (const p of lista) {
    const doc = p.tipo_documento !== 'INDOCUMENTADO' ? normalizarDocumento(p.numero_documento) : '';
    const hcl = normalizarHcl(p.hcl);

    if (doc && seenDocs.has(doc)) continue;
    if (hcl && seenHcls.has(hcl)) continue;

    if (doc) seenDocs.add(doc);
    if (hcl) seenHcls.add(hcl);
    result.push(p);
  }

  return result;
};

export interface RegistroHclAudit {
  id: string;
  hcl?: string;
  numero_documento?: string;
  apellidos_nombres: string;
}

export interface AuditoriaHclResult {
  totalRegistros: number;
  unicosEnRango: number;
  esperadosEnRango: number;
  faltantes: number[];
  duplicados: Array<{ hcl: string; registros: RegistroHclAudit[] }>;
  fueraDeRango: Array<RegistroHclAudit & { hclNum: number }>;
  sinHcl: RegistroHclAudit[];
  noNumericos: RegistroHclAudit[];
  maxHclDetectado: number | null;
}

/**
 * Extrae el valor numérico de un HCL (soporta "100", "0100", "HCL-100").
 */
export const extraerNumeroHcl = (hcl?: string | null): number | null => {
  const clean = (hcl || '').trim().toUpperCase();
  if (!clean) return null;
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  const prefixed = clean.match(/^HCL[-\s]?(\d+)$/);
  if (prefixed?.[1]) return parseInt(prefixed[1], 10);
  return null;
};

/**
 * Calcula el siguiente número correlativo de HCL posterior al último registrado.
 * Si no hay registros previos con HCL numérico, inicia en "100".
 */
export const calcularSiguienteHcl = (
  registros: Array<{ hcl?: string | null }>
): string => {
  let maxNum: number | null = null;
  for (const r of registros) {
    const n = extraerNumeroHcl(r.hcl);
    if (n !== null && (maxNum === null || n > maxNum)) {
      maxNum = n;
    }
  }
  return String(maxNum !== null ? maxNum + 1 : 100);
};

/**
 * Audita correlativos de HCL en un rango [desde, hasta] detectando saltos, duplicados y registros fuera de rango.
 */
export const auditarCorrelativoHcl = (
  registros: RegistroHclAudit[],
  desde: number,
  hasta: number
): AuditoriaHclResult => {
  const mapaPorHclNorm = new Map<string, RegistroHclAudit[]>();
  const numerosPresentes = new Set<number>();
  const sinHcl: RegistroHclAudit[] = [];
  const noNumericos: RegistroHclAudit[] = [];
  const fueraDeRango: Array<RegistroHclAudit & { hclNum: number }> = [];
  let maxHclDetectado: number | null = null;

  for (const r of registros) {
    const hclNorm = normalizarHcl(r.hcl);
    if (!hclNorm) {
      sinHcl.push(r);
      continue;
    }

    const lista = mapaPorHclNorm.get(hclNorm) || [];
    lista.push(r);
    mapaPorHclNorm.set(hclNorm, lista);

    const num = extraerNumeroHcl(hclNorm);
    if (num === null) {
      noNumericos.push(r);
      continue;
    }

    if (maxHclDetectado === null || num > maxHclDetectado) {
      maxHclDetectado = num;
    }

    if (num >= desde && num <= hasta) {
      numerosPresentes.add(num);
    } else {
      fueraDeRango.push({ ...r, hclNum: num });
    }
  }

  const faltantes: number[] = [];
  if (hasta >= desde && hasta - desde <= 50000) {
    for (let n = desde; n <= hasta; n++) {
      if (!numerosPresentes.has(n)) {
        faltantes.push(n);
      }
    }
  }

  const duplicados: Array<{ hcl: string; registros: RegistroHclAudit[] }> = [];
  for (const [hcl, lista] of mapaPorHclNorm.entries()) {
    if (lista.length > 1) {
      duplicados.push({ hcl, registros: lista });
    }
  }
  duplicados.sort((a, b) => (extraerNumeroHcl(a.hcl) ?? 0) - (extraerNumeroHcl(b.hcl) ?? 0));
  fueraDeRango.sort((a, b) => a.hclNum - b.hclNum);

  return {
    totalRegistros: registros.length,
    unicosEnRango: numerosPresentes.size,
    esperadosEnRango: hasta >= desde ? hasta - desde + 1 : 0,
    faltantes,
    duplicados,
    fueraDeRango,
    sinHcl,
    noNumericos,
    maxHclDetectado,
  };
};

