import { ModuleId, Profesional, RolUsuario, Usuario } from '../types';

const PARTICULAS_APELLIDO = new Set([
  'DE',
  'DEL',
  'LA',
  'LAS',
  'LOS',
  'SAN',
  'SANTA',
  'VAN',
  'VON',
  'MC',
  'MAC',
]);

const PARTICULAS_MINUS = new Set(['de', 'del', 'la', 'las', 'los']);

const aTitleCase = (texto: string): string => {
  return texto
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && PARTICULAS_MINUS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
};

export const normalizarTextoNombre = (texto?: string): string => {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

/**
 * Separa un nombre completo peruano en Nombres y Apellidos.
 * Soporta "APELLIDOS, NOMBRES" y "APELLIDO1 APELLIDO2 NOMBRES..."
 * respetando partículas compuestas como DE LA, DE LOS, DEL, SAN.
 */
export const splitApellidosNombres = (
  fullName: string
): { nombres: string; apellidos: string } => {
  const raw = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { nombres: '', apellidos: '' };

  if (raw.includes(',')) {
    const [apPart, nomPart] = raw.split(',');
    return {
      apellidos: aTitleCase(apPart || ''),
      nombres: aTitleCase(nomPart || ''),
    };
  }

  const tokens = raw.split(' ').filter(Boolean);
  if (tokens.length === 1) {
    return { nombres: aTitleCase(tokens[0]), apellidos: aTitleCase(tokens[0]) };
  }
  if (tokens.length === 2) {
    return { apellidos: aTitleCase(tokens[0]), nombres: aTitleCase(tokens[1]) };
  }

  // Consumir 2 unidades de apellido desde la izquierda
  let idx = 0;
  let apellidosCount = 0;
  const apTokens: string[] = [];

  while (idx < tokens.length - 1 && apellidosCount < 2) {
    const unit: string[] = [];
    while (idx < tokens.length - 1 && PARTICULAS_APELLIDO.has(tokens[idx].toUpperCase())) {
      unit.push(tokens[idx]);
      idx++;
    }
    if (idx < tokens.length) {
      unit.push(tokens[idx]);
      idx++;
    }
    apTokens.push(...unit);
    apellidosCount++;
  }

  const nomTokens = tokens.slice(idx);
  if (nomTokens.length === 0 && apTokens.length > 1) {
    const last = apTokens.pop()!;
    return {
      apellidos: aTitleCase(apTokens.join(' ')),
      nombres: aTitleCase(last),
    };
  }

  return {
    apellidos: aTitleCase(apTokens.join(' ')),
    nombres: aTitleCase(nomTokens.join(' ')),
  };
};

const limpiarParaUsername = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

export const sugerirUsuarioLogin = (
  nombres: string,
  apellidos: string,
  existentes: Usuario[],
  dni?: string
): string => {
  const primerNombre = limpiarParaUsername((nombres || '').trim().split(/\s+/)[0] || '');
  const apTokens = (apellidos || '').trim().split(/\s+/).filter(Boolean);
  const primerApellidoRaw =
    apTokens.find((t) => !PARTICULAS_APELLIDO.has(t.toUpperCase())) || apTokens[0] || '';
  const primerApellido = limpiarParaUsername(primerApellidoRaw);

  const tomados = new Set(existentes.map((u) => u.usuario.toLowerCase()));
  tomados.add('dev');

  const candidatos: string[] = [];
  if (primerNombre && primerApellido) {
    candidatos.push(`${primerNombre[0]}${primerApellido}`);
    candidatos.push(`${primerNombre}.${primerApellido}`);
    candidatos.push(`${primerNombre.slice(0, 2)}${primerApellido}`);
  } else if (primerNombre) {
    candidatos.push(primerNombre);
  }
  if (dni) {
    const docLimpio = limpiarParaUsername(dni);
    if (docLimpio) candidatos.push(docLimpio);
  }

  for (const cand of candidatos) {
    if (cand && !tomados.has(cand)) return cand;
  }

  const base = candidatos[0] || 'usuario';
  let suffix = 2;
  while (tomados.has(`${base}${suffix}`)) {
    suffix++;
  }
  return `${base}${suffix}`;
};

export const mapProfesionToRolYPermisos = (
  profesion: string
): { rol: RolUsuario; permisosModulos: ModuleId[] } => {
  const p = (profesion || '').toUpperCase();

  if (p === 'PSIQUIATRA' || p === 'MEDICO') {
    return {
      rol: 'medico',
      permisosModulos: [
        'dashboard',
        'pacientes',
        'ficha_paciente',
        'fua',
        'agenda',
        'atencion',
        'programacion_anual',
        'reportes',
      ],
    };
  }

  if (
    p === 'PSICOLOGO' ||
    p === 'TERAPEUTA_OCUPACIONAL' ||
    p === 'TERAPEUTA_LENGUAJE' ||
    p === 'TRABAJADOR_SOCIAL'
  ) {
    return {
      rol: 'psicologo',
      permisosModulos: [
        'dashboard',
        'pacientes',
        'ficha_paciente',
        'fua',
        'agenda',
        'atencion',
        'programacion_anual',
        'reportes',
      ],
    };
  }

  if (p === 'ENFERMERO') {
    return {
      rol: 'enfermero',
      permisosModulos: [
        'dashboard',
        'pacientes',
        'ficha_paciente',
        'agenda',
        'triaje',
        'display_turnos',
        'reportes',
      ],
    };
  }

  if (p === 'ADMISION_SOPORTE') {
    return {
      rol: 'admision',
      permisosModulos: [
        'dashboard',
        'pacientes',
        'ficha_paciente',
        'agenda',
        'programacion_turnos',
        'display_turnos',
        'fua',
      ],
    };
  }

  return {
    rol: 'general',
    permisosModulos: ['dashboard', 'agenda', 'atencion'],
  };
};

export const findUsuarioParaProfesional = (
  prof: Profesional,
  usuarios: Usuario[]
): Usuario | undefined => {
  const target = normalizarTextoNombre(prof.apellidos_nombres);
  if (!target) return undefined;

  return usuarios.find((u) => {
    if (u.rol === 'desarrollador' || u.id === 'usr-dev') return false;
    const apNom = normalizarTextoNombre(`${u.apellidos} ${u.nombres}`);
    const nomAp = normalizarTextoNombre(`${u.nombres} ${u.apellidos}`);
    if (apNom === target || nomAp === target) return true;
    const doc = (prof.dni || '').trim().toLowerCase();
    if (doc && u.usuario.toLowerCase() === doc) return true;
    return false;
  });
};
