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
