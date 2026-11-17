export interface DistritoOption {
  value: string;
  label: string;
}

export const DISTRITOS_CHINCHA: DistritoOption[] = [
  { value: 'CHINCHA ALTA', label: 'Chincha Alta' },
  { value: 'ALTO LARAN', label: 'Alto Larán' },
  { value: 'CHAVIN', label: 'Chavín' },
  { value: 'CHINCHA BAJA', label: 'Chincha Baja' },
  { value: 'EL CARMEN', label: 'El Carmen' },
  { value: 'GROCIO PRADO', label: 'Grocio Prado' },
  { value: 'PUEBLO NUEVO', label: 'Pueblo Nuevo' },
  { value: 'SAN JUAN DE YANAC', label: 'San Juan de Yanac' },
  { value: 'SAN PEDRO DE HUACARPANA', label: 'San Pedro de Huacarpana' },
  { value: 'SUNAMPE', label: 'Sunampe' },
  { value: 'TAMBO DE MORA', label: 'Tambo de Mora' },
  { value: 'OTRO', label: 'Otro (especificar procedencia)' },
];

const stripAccents = (val: string): string =>
  val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

export const parseDistritoParaFormulario = (
  rawDistrito?: string,
  rawOtro?: string
): { distrito: string; distritoOtro: string } => {
  const cleanDist = (rawDistrito || '').trim();
  const cleanOtro = (rawOtro || '').trim();

  if (!cleanDist) {
    return { distrito: 'CHINCHA ALTA', distritoOtro: '' };
  }

  const normalized = stripAccents(cleanDist);

  if (normalized === 'OTRO') {
    return { distrito: 'OTRO', distritoOtro: cleanOtro };
  }

  if (normalized.startsWith('OTRO:')) {
    const extracted = cleanDist.slice(cleanDist.indexOf(':') + 1).trim();
    return { distrito: 'OTRO', distritoOtro: cleanOtro || extracted };
  }

  const matched = DISTRITOS_CHINCHA.find(
    (d) => d.value !== 'OTRO' && (d.value === normalized || stripAccents(d.label) === normalized)
  );
  if (matched) {
    return { distrito: matched.value, distritoOtro: '' };
  }

  // Distrito externo guardado directamente en el campo distrito
  return { distrito: 'OTRO', distritoOtro: cleanOtro || cleanDist };
};

export const formatDistritoPaciente = (
  paciente: { distrito?: string; distrito_otro_especificar?: string },
  uppercase = false
): string => {
  const rawDist = (paciente.distrito || '').trim();
  const rawOtro = (paciente.distrito_otro_especificar || '').trim();

  if (!rawDist && !rawOtro) {
    return uppercase ? 'NO ESPECIFICADO' : '-';
  }

  const normalized = stripAccents(rawDist);

  if (normalized === 'OTRO') {
    if (rawOtro) {
      const text = `Otro: ${rawOtro}`;
      return uppercase ? text.toUpperCase() : text;
    }
    return uppercase ? 'OTRO' : 'Otro';
  }

  if (normalized.startsWith('OTRO:')) {
    const extracted = rawOtro || rawDist.slice(rawDist.indexOf(':') + 1).trim();
    if (extracted) {
      const text = `Otro: ${extracted}`;
      return uppercase ? text.toUpperCase() : text;
    }
    return uppercase ? 'OTRO' : 'Otro';
  }

  const matched = DISTRITOS_CHINCHA.find(
    (d) => d.value !== 'OTRO' && (d.value === normalized || stripAccents(d.label) === normalized)
  );
  if (matched) {
    return uppercase ? matched.value : matched.label;
  }

  return uppercase ? rawDist.toUpperCase() : rawDist;
};
