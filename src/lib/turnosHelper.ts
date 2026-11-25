import { AsignacionTurnoDia, CodigoTurnoRol, Consultorio, Profesional } from '../types';

export const MESES_NOMBRES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_SEMANA_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_SEMANA_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export const getDaysInMonth = (anio: number, mes1a12: number): number => {
  return new Date(anio, mes1a12, 0).getDate();
};

export const formatFechaIso = (anio: number, mes1a12: number, dia: number): string => {
  return `${anio}-${String(mes1a12).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

export const getTodayIso = (): string => {
  const now = new Date();
  return formatFechaIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

export const getDayOfWeekIndex = (anio: number, mes1a12: number, dia: number): number => {
  return new Date(anio, mes1a12 - 1, dia).getDay();
};

export const getDiaSemanaCorto = (anio: number, mes1a12: number, dia: number): string => {
  return DIAS_SEMANA_CORTOS[getDayOfWeekIndex(anio, mes1a12, dia)];
};

export const getDiaSemanaLetra = (anio: number, mes1a12: number, dia: number): string => {
  return DIAS_SEMANA_LETRA[getDayOfWeekIndex(anio, mes1a12, dia)];
};

export interface SemanaDelMes {
  index: number;
  label: string;
  dias: Array<{
    dia: number;
    fecha: string;
    diaSemanaCorto: string;
    esDomingo: boolean;
  }>;
}

export const getSemanasDelMes = (
  anio: number,
  mes1a12: number,
  incluirDomingos = false
): SemanaDelMes[] => {
  const totalDias = getDaysInMonth(anio, mes1a12);
  const semanas: SemanaDelMes[] = [];
  let currentDays: SemanaDelMes['dias'] = [];

  for (let dia = 1; dia <= totalDias; dia++) {
    const dow = getDayOfWeekIndex(anio, mes1a12, dia); // 0=Dom..6=Sáb
    const fecha = formatFechaIso(anio, mes1a12, dia);
    const esDomingo = dow === 0;

    if (!esDomingo || incluirDomingos) {
      currentDays.push({
        dia,
        fecha,
        diaSemanaCorto: DIAS_SEMANA_CORTOS[dow],
        esDomingo,
      });
    }

    // Cerrar semana en domingo (si se incluye) o sábado (si no se incluye domingo)
    const cerrar = incluirDomingos ? dow === 0 || dia === totalDias : dow === 6 || dia === totalDias;
    if (cerrar && currentDays.length > 0) {
      const primero = String(currentDays[0].dia).padStart(2, '0');
      const ultimo = String(currentDays[currentDays.length - 1].dia).padStart(2, '0');
      semanas.push({
        index: semanas.length,
        label: `Sem ${semanas.length + 1} (${primero}–${ultimo})`,
        dias: currentDays,
      });
      currentDays = [];
    }
  }

  return semanas;
};

export const getSlotId = (fecha: string, consultorioId: string, turno: 'MAÑANA' | 'TARDE') =>
  `${fecha}__${consultorioId}__${turno}`;

export const getAusenciaId = (fecha: string, profesionalId: string) =>
  `aus__${fecha}__${profesionalId}`;

export const asignarSlotConsultorioFecha = (params: {
  turnos: AsignacionTurnoDia[];
  fecha: string;
  consultorioId: string;
  turno: 'MAÑANA' | 'TARDE';
  profesionalId: string;
  profesionalNombre?: string;
}): AsignacionTurnoDia[] => {
  const { turnos, fecha, consultorioId, turno, profesionalId, profesionalNombre } = params;
  const slotId = getSlotId(fecha, consultorioId, turno);

  // Eliminar asignación anterior de ese mismo consultorio/fecha/turno y cualquier ausencia ese día para el profesional elegido
  const filtered = turnos.filter((item) => {
    const sameSlot =
      item.id === slotId ||
      (item.fecha === fecha && item.consultorio_id === consultorioId && item.turno === turno);
    if (sameSlot) return false;
    if (
      profesionalId &&
      item.fecha === fecha &&
      item.profesional_id === profesionalId &&
      item.turno === 'AUSENCIA'
    ) {
      return false;
    }
    return true;
  });

  if (!profesionalId) {
    return filtered;
  }

  return [
    ...filtered,
    {
      id: slotId,
      fecha,
      consultorio_id: consultorioId,
      turno,
      profesional_id: profesionalId,
      profesional_nombre: profesionalNombre,
      codigo_rol: turno === 'MAÑANA' ? 'M' : 'T',
    },
  ];
};

export const aplicarCodigoTurnoProfesional = (params: {
  turnos: AsignacionTurnoDia[];
  fecha: string;
  profesionalId: string;
  profesionalNombre?: string;
  consultorioId: string;
  codigo: CodigoTurnoRol | '';
}): AsignacionTurnoDia[] => {
  const { turnos, fecha, profesionalId, profesionalNombre, consultorioId, codigo } = params;

  // Eliminar únicamente las asignaciones previas de ese mismo profesional en esa fecha (sin borrar turnos de otros profesionales)
  const next = turnos.filter(
    (item) => !(item.fecha === fecha && item.profesional_id === profesionalId)
  );

  if (!codigo) {
    return next;
  }

  if (codigo === 'L' || codigo === 'D' || codigo === 'V' || codigo === 'F') {
    return [
      ...next,
      {
        id: getAusenciaId(fecha, profesionalId),
        fecha,
        consultorio_id: '',
        turno: 'AUSENCIA',
        profesional_id: profesionalId,
        profesional_nombre: profesionalNombre,
        codigo_rol: codigo,
      },
    ];
  }

  if (!consultorioId) {
    return next;
  }

  if (codigo === 'M' || codigo === 'MT') {
    next.push({
      id: `${fecha}__${consultorioId}__MAÑANA__${profesionalId}`,
      fecha,
      consultorio_id: consultorioId,
      turno: 'MAÑANA',
      profesional_id: profesionalId,
      profesional_nombre: profesionalNombre,
      codigo_rol: codigo,
    });
  }

  if (codigo === 'T' || codigo === 'MT') {
    next.push({
      id: `${fecha}__${consultorioId}__TARDE__${profesionalId}`,
      fecha,
      consultorio_id: consultorioId,
      turno: 'TARDE',
      profesional_id: profesionalId,
      profesional_nombre: profesionalNombre,
      codigo_rol: codigo,
    });
  }

  return next;
};

export const getCodigoTurnoProfesionalEnFecha = (
  turnos: AsignacionTurnoDia[],
  profesionalId: string,
  fecha: string
): CodigoTurnoRol | '' => {
  const delDia = turnos.filter((t) => t.fecha === fecha && t.profesional_id === profesionalId);
  if (delDia.length === 0) return '';

  const hasM = delDia.some((t) => t.turno === 'MAÑANA');
  const hasT = delDia.some((t) => t.turno === 'TARDE');
  if (hasM && hasT) return 'MT';
  if (hasM) return 'M';
  if (hasT) return 'T';

  const ausencia = delDia.find((t) => t.turno === 'AUSENCIA');
  return ausencia?.codigo_rol || '';
};

export const getConsultorioProfesionalEnFecha = (
  turnos: AsignacionTurnoDia[],
  profesionalId: string,
  fecha: string
): string => {
  const turnoActivo = turnos.find(
    (t) =>
      t.fecha === fecha &&
      t.profesional_id === profesionalId &&
      (t.turno === 'MAÑANA' || t.turno === 'TARDE') &&
      t.consultorio_id
  );
  return turnoActivo?.consultorio_id || '';
};

export const getHorasMesProfesional = (
  turnos: AsignacionTurnoDia[],
  profesionalId: string,
  anio: number,
  mes1a12: number
): number => {
  const prefix = `${anio}-${String(mes1a12).padStart(2, '0')}-`;
  return turnos.reduce((acc, t) => {
    if (
      t.profesional_id === profesionalId &&
      t.fecha.startsWith(prefix) &&
      (t.turno === 'MAÑANA' || t.turno === 'TARDE')
    ) {
      return acc + 6;
    }
    return acc;
  }, 0);
};

export const normalizarTextoComparacion = (val?: string): string =>
  (val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(DR|DRA|LIC|PS|PSIC|MG|MED|ENF|TEC|MC|SR|SRA)\.?\b/g, ' ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const simplificarFonetica = (val: string): string =>
  val
    .replace(/\b(DE|DEL|LA|LOS|LAS|Y)\b/g, ' ')
    .replace(/([A-Z])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

export const matchProfesionalPorNombreODni = (
  nombrePdf: string,
  dniPdf: string | undefined,
  sugeridoId: string | undefined,
  profesionales: Profesional[]
): Profesional | undefined => {
  const target = normalizarTextoComparacion(nombrePdf);
  const targetPhonetic = simplificarFonetica(target);
  const targetJoined = targetPhonetic.replace(/\s+/g, '');
  const targetTokens = targetPhonetic.split(' ').filter((t) => t.length >= 2);

  if (sugeridoId) {
    const exactById = profesionales.find((p) => p.id === sugeridoId);
    if (exactById) {
      const profDni = (exactById.dni || '').replace(/\D/g, '');
      const dniCleanCheck = (dniPdf || '').replace(/\D/g, '');
      const profNorm = normalizarTextoComparacion(exactById.apellidos_nombres);
      const profPhon = simplificarFonetica(profNorm);
      const profToks = profPhon.split(' ').filter((t) => t.length >= 2);
      const commonSug = targetTokens.filter((t) => profToks.includes(t));
      const apellidoCoincide =
        targetTokens.length === 0 ||
        commonSug.length >= 2 ||
        (dniCleanCheck && profDni === dniCleanCheck) ||
        profNorm.includes(target) ||
        target.includes(profNorm);
      if (apellidoCoincide) {
        return exactById;
      }
    }
  }

  const dniClean = (dniPdf || '').replace(/\D/g, '');
  if (dniClean) {
    const exactByDni = profesionales.find(
      (p) => (p.dni || '').replace(/\D/g, '') === dniClean
    );
    if (exactByDni) return exactByDni;
  }

  if (!target) return undefined;

  const exactByName = profesionales.find(
    (p) => normalizarTextoComparacion(p.apellidos_nombres) === target
  );
  if (exactByName) return exactByName;

  if (targetTokens.length === 0) return undefined;

  let bestMatch: Profesional | undefined;
  let bestScore = 0;

  for (const prof of profesionales) {
    const profNorm = normalizarTextoComparacion(prof.apellidos_nombres);
    if (!profNorm) continue;
    const profPhonetic = simplificarFonetica(profNorm);
    const profJoined = profPhonetic.replace(/\s+/g, '');

    if (
      profNorm.includes(target) ||
      target.includes(profNorm) ||
      profPhonetic === targetPhonetic ||
      profJoined.includes(targetJoined) ||
      targetJoined.includes(profJoined)
    ) {
      return prof;
    }

    const profTokens = profPhonetic.split(' ').filter((t) => t.length >= 2);
    const common = targetTokens.filter(
      (t) =>
        profTokens.includes(t) ||
        profTokens.some((pt) => pt.length >= 4 && t.length >= 4 && (pt.startsWith(t) || t.startsWith(pt)))
    );

    const sameTwoSurnames =
      targetTokens.length >= 2 &&
      profTokens.length >= 2 &&
      targetTokens[0] === profTokens[0] &&
      targetTokens[1] === profTokens[1];

    const denom = sameTwoSurnames
      ? Math.min(targetTokens.length, profTokens.length)
      : Math.max(targetTokens.length, profTokens.length);
    const score = common.length / Math.max(1, denom);

    if (common.length >= 2 && score > bestScore) {
      bestScore = score;
      bestMatch = prof;
    }
  }

  return bestScore >= 0.6 || (bestMatch && bestScore >= 0.45) ? bestMatch : undefined;
};

export const matchConsultorioPorCodigoONombre = (
  codigoPdf: string | undefined,
  profesional: Profesional | undefined,
  consultorios: Consultorio[],
  usadosPsicoIds?: Set<string>
): Consultorio | undefined => {
  if (codigoPdf) {
    const norm = normalizarTextoComparacion(codigoPdf);
    const byCodigo = consultorios.find(
      (c) =>
        normalizarTextoComparacion(c.codigo) === norm ||
        normalizarTextoComparacion(c.id) === norm ||
        normalizarTextoComparacion(c.nombre).includes(norm)
    );
    if (byCodigo) return byCodigo;
  }

  if (profesional?.consultorioAsignado) {
    const byProf = consultorios.find(
      (c) => c.id === profesional.consultorioAsignado || c.codigo === profesional.consultorioAsignado
    );
    if (byProf) {
      if (byProf.servicio_tipo === 'PSICOLOGIA' && usadosPsicoIds) {
        usadosPsicoIds.add(byProf.id);
      }
      return byProf;
    }
  }

  if (profesional?.profesion) {
    const profTipo = profesional.profesion.toUpperCase();
    if (profTipo === 'MEDICO') {
      const c = consultorios.find((x) => x.servicio_tipo === 'MEDICINA');
      if (c) return c;
    } else if (profTipo === 'PSIQUIATRA') {
      const c = consultorios.find((x) => x.servicio_tipo === 'PSIQUIATRIA');
      if (c) return c;
    } else if (profTipo === 'TRABAJADOR_SOCIAL') {
      const c = consultorios.find((x) => x.servicio_tipo === 'TRABAJO_SOCIAL');
      if (c) return c;
    } else if (profTipo === 'TERAPEUTA_OCUPACIONAL') {
      const c = consultorios.find((x) => x.servicio_tipo === 'TERAPIA_OCUPACIONAL');
      if (c) return c;
    } else if (profTipo === 'TERAPEUTA_LENGUAJE') {
      const c = consultorios.find((x) => x.servicio_tipo === 'TERAPIA_LENGUAJE');
      if (c) return c;
    } else if (profTipo === 'PSICOLOGO') {
      const psicos = consultorios.filter((x) => x.servicio_tipo === 'PSICOLOGIA');
      if (psicos.length > 0) {
        const libre = usadosPsicoIds ? psicos.find((x) => !usadosPsicoIds.has(x.id)) : undefined;
        const elegido = libre || psicos[0];
        if (usadosPsicoIds) usadosPsicoIds.add(elegido.id);
        return elegido;
      }
    } else if (profTipo === 'ENFERMERO' || profTipo === 'ADMISION_SOPORTE') {
      const c = consultorios.find((x) => x.servicio_tipo === 'TRIAJE' || x.servicio_tipo === 'SOPORTE');
      if (c) return c;
    }
  }

  return consultorios[0];
};
