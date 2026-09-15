export interface MedicamentoParsed {
  id?: string;
  medicamento: string;
  nombre?: string;
  presentacion?: string;
  concentracion?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  cantidad?: number;
  indicaciones?: string;
}

/**
 * Normaliza cualquier formato de medicamentos (array, JSON string, string simple u objeto)
 * en un array homogéneo y seguro de MedicamentoParsed.
 */
export function parseMedicamentosList(raw: any): MedicamentoParsed[] {
  if (!raw) return [];

  // Si ya es un array
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: `med-${idx}`,
          medicamento: item,
          nombre: item,
          presentacion: '',
          concentracion: '',
          dosis: '',
          frecuencia: '',
          duracion: '',
          cantidad: 1,
        };
      }
      if (typeof item === 'object' && item !== null) {
        return {
          ...item,
          id: item.id || `med-${idx}`,
          medicamento: item.medicamento || item.nombre || item.descripcion || 'Medicamento',
          nombre: item.nombre || item.medicamento || item.descripcion || 'Medicamento',
          presentacion: item.presentacion || item.forma_farmaceutica || '',
          concentracion: item.concentracion || '',
          dosis: item.dosis || item.indicacion || '',
          frecuencia: item.frecuencia || '',
          duracion: item.duracion || '',
          cantidad: Number(item.cantidad) || Number(item.cantidad_prescrita) || 1,
        };
      }
      return {
        id: `med-${idx}`,
        medicamento: String(item),
        nombre: String(item),
        presentacion: '',
        concentracion: '',
        dosis: '',
        frecuencia: '',
        duracion: '',
        cantidad: 1,
      };
    });
  }

  // Si es un string (puede ser JSON serializado o texto)
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseMedicamentosList(parsed);
      } catch {
        // Fallback si no es JSON válido
      }
    }
    // Dividir por líneas o comas si contiene múltiples nombres
    const parts = trimmed.split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
    return parts.map((part, idx) => ({
      id: `med-${idx}`,
      medicamento: part,
      nombre: part,
      presentacion: '',
      concentracion: '',
      dosis: '',
      frecuencia: '',
      duracion: '',
      cantidad: 1,
    }));
  }

  // Si es un objeto individual
  if (typeof raw === 'object') {
    return [{
      id: raw.id || 'med-0',
      medicamento: raw.medicamento || raw.nombre || raw.descripcion || 'Medicamento',
      nombre: raw.nombre || raw.medicamento || raw.descripcion || 'Medicamento',
      presentacion: raw.presentacion || '',
      concentracion: raw.concentracion || '',
      dosis: raw.dosis || '',
      frecuencia: raw.frecuencia || '',
      duracion: raw.duracion || '',
      cantidad: Number(raw.cantidad) || 1,
    }];
  }

  return [];
}
