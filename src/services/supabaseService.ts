import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { AsignacionTurnoDia, Paciente, Cita, Triaje, AtencionClinica, Profesional, Usuario, FUA } from '../types';
import { parseMedicamentosList } from '../lib/medicamentosHelper';
import {
  calcularEdadDesdeFecha,
  calcularSiguienteHcl,
  deduplicarPacientes,
  normalizarDocumento,
  normalizarHcl,
} from '../lib/pacientesHelper';

export interface SupabaseDashboardStats {
  totalPacientes?: number;
  atencionesHoy?: number;
  citasPendientes?: number;
  profesionalesActivos?: number;
  citasHoy?: number;
  citasPorAtender?: number;
}

const formatSupabaseWriteError = (
  table: string,
  err: any,
  fallbackMsg: string
): { isRls: boolean; message: string } => {
  const rawMsg = String(err?.message || '');
  const isRls =
    err?.code === '42501' ||
    rawMsg.toLowerCase().includes('row-level security') ||
    rawMsg.toLowerCase().includes('violates row-level security');
  if (isRls) {
    return {
      isRls: true,
      message: `Permiso denegado por política RLS en "${table}" (${rawMsg}). Abre "Supabase Conectado" en la barra superior para copiar el script SQL de políticas RLS y ejecútalo en el SQL Editor de Supabase.`,
    };
  }
  return { isRls: false, message: rawMsg || fallbackMsg };
};

const extractMissingSchemaColumn = (err: any): string | null => {
  const msg = String(err?.message || '');
  const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = msg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
};

const SUPABASE_PAGE_SIZE = 1000;
const SUPABASE_MAX_PAGES = 50;

async function fetchAllRows<T = any>(
  buildPageQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<{ data: T[] | null; error: any }> {
  const allRows: T[] = [];

  for (let page = 0; page < SUPABASE_MAX_PAGES; page++) {
    const from = page * SUPABASE_PAGE_SIZE;
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error } = await buildPageQuery(from, to);

    if (error) {
      return { data: null, error };
    }

    const batch = Array.isArray(data) ? data : [];
    allRows.push(...batch);

    if (batch.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return { data: allRows, error: null };
}

export const supabaseService = {
  // Test de conexión robusto multivariable
  async checkConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
    if (!isSupabaseConfigured()) {
      return {
        connected: false,
        message: 'Credenciales de Supabase no configuradas (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).',
      };
    }

    const client = getSupabase();
    if (!client) {
      return { connected: false, message: 'No se pudo instanciar el cliente Supabase.' };
    }

    try {
      // 1. Probar vista principal de dashboard
      const { data: viewData, error: viewError } = await client.from('v_cv_dashboard_resumen').select('*').limit(1);
      if (!viewError) {
        return {
          connected: true,
          message: 'Conectado a Supabase (Vista v_cv_dashboard_resumen activa y sincronizada)',
          details: viewData,
        };
      }

      // 2. Probar tabla cv_pacientes
      const { data: pacData, error: pacError } = await client.from('cv_pacientes').select('id').limit(1);
      if (!pacError) {
        return {
          connected: true,
          message: 'Conectado a Supabase (Tabla cv_pacientes activa)',
          details: pacData,
        };
      }

      // 3. Probar tabla cv_atenciones
      const { data: atnData, error: atnError } = await client.from('cv_atenciones').select('id').limit(1);
      if (!atnError) {
        return {
          connected: true,
          message: 'Conectado a Supabase (Tabla cv_atenciones activa)',
          details: atnData,
        };
      }

      // 4. Probar tabla cv_citas
      const { data: citasData, error: citasError } = await client.from('cv_citas').select('id').limit(1);
      if (!citasError) {
        return {
          connected: true,
          message: 'Conectado a Supabase (Tabla cv_citas activa)',
          details: citasData,
        };
      }

      // 5. Probar tabla cv_usuarios
      const { data: usrData, error: usrError } = await client.from('cv_usuarios').select('id').limit(1);
      if (!usrError) {
        return {
          connected: true,
          message: 'Conectado a Supabase (Tabla cv_usuarios activa)',
          details: usrData,
        };
      }

      // Si ninguna tabla respondió con éxito
      const ultimoError = viewError?.message || pacError?.message || atnError?.message || citasError?.message || 'Error de permisos o esquema';
      return {
        connected: false,
        message: `Fallo al consultar tablas en Supabase: ${ultimoError}`,
        details: { viewError, pacError, atnError, citasError },
      };
    } catch (err: any) {
      return { connected: false, message: `Fallo de red o conexión: ${err?.message || err}` };
    }
  },

  // 1. OBTENER ESTADÍSTICAS DESDE VISTAS SUPABASE (v_cv_dashboard_resumen, v_cv_stats_resumen, v_cv_atenciones_hoy, v_cv_citas_hoy)
  async getDashboardResumen(): Promise<SupabaseDashboardStats | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
      // Probar v_cv_dashboard_resumen
      const { data: dashData } = await client.from('v_cv_dashboard_resumen').select('*').single();
      if (dashData) {
        return {
          totalPacientes: dashData.total_pacientes ?? dashData.totalPacientes,
          atencionesHoy: dashData.atenciones_hoy ?? dashData.atencionesHoy,
          citasPendientes: dashData.citas_pendientes ?? dashData.citasPendientes,
          profesionalesActivos: dashData.profesionales_activos ?? dashData.profesionalesActivos,
          citasHoy: dashData.citas_hoy ?? dashData.citasHoy,
        };
      }

      // Probar v_cv_stats_resumen
      const { data: statsData } = await client.from('v_cv_stats_resumen').select('*').single();
      if (statsData) {
        return {
          totalPacientes: statsData.total_pacientes ?? statsData.totalPacientes,
          atencionesHoy: statsData.atenciones_hoy ?? statsData.atencionesHoy,
          citasPendientes: statsData.citas_pendientes ?? statsData.citasPendientes,
          profesionalesActivos: statsData.profesionales_activos ?? statsData.profesionalesActivos,
        };
      }
    } catch (err) {
      console.warn('Error consultando vistas de resumen de Supabase:', err);
    }
    return null;
  },

  // 2. PACIENTES: cv_pacientes y pac_datos_personales
  async getPacientes(): Promise<Paciente[] | null> {
    const client = getSupabase();
    if (!client) return null;

    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_pacientes')
          .select('*')
          .order('apellidos_nombres', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (error) {
        // Intentar tabla pac_datos_personales como alternativa
        const { data: altData, error: altErr } = await fetchAllRows((from, to) =>
          client
            .from('pac_datos_personales')
            .select('*')
            .order('apellidos_nombres', { ascending: true })
            .range(from, to)
        );
        if (!altErr && altData) {
          const mappedAlt: Paciente[] = altData.map((p: any) => ({
            id: p.id ? String(p.id) : `pac-${Date.now()}`,
            tipo_documento: p.tipo_documento || 'DNI',
            numero_documento: p.numero_documento || p.dni || '',
            codigo_temporal: p.codigo_temporal || '',
            hcl: p.hcl || p.historia_clinica || '',
            apellidos_nombres: p.apellidos_nombres || `${p.apellidos || ''} ${p.nombres || ''}`.trim(),
            fecha_nacimiento: p.fecha_nacimiento || '',
            sexo: p.sexo || 'M',
            edad: p.edad ?? calcularEdadDesdeFecha(p.fecha_nacimiento) ?? 0,
            seguro: p.seguro || p.tipo_seguro || 'SIS',
            direccion: p.direccion || '',
            distrito: p.distrito || 'Chincha Alta',
            celular: p.celular || p.telefono || '',
            estado: p.estado || 'activo',
            fecha_ingreso: p.fecha_ingreso || new Date().toISOString().split('T')[0],
          }));
          return deduplicarPacientes(mappedAlt);
        }
        return null;
      }

      if (data) {
        const mapped: Paciente[] = data.map((p: any) => ({
          id: String(p.id),
          tipo_documento: p.tipo_documento || 'DNI',
          numero_documento: p.numero_documento ? String(p.numero_documento).trim() : '',
          codigo_temporal: p.codigo_temporal || '',
          hcl: p.hcl ? String(p.hcl).trim() : '',
          apellidos_nombres: p.apellidos_nombres || '',
          fecha_nacimiento: p.fecha_nacimiento || '',
          sexo: p.sexo || 'M',
          edad: p.edad ?? calcularEdadDesdeFecha(p.fecha_nacimiento),
          estado_civil: p.estado_civil || 'SOLTERO',
          grado_instruccion: p.grado_instruccion || 'SECUNDARIA',
          seguro: p.seguro || 'SIS',
          seguro_otro_especificar: p.seguro_otro_especificar || '',
          direccion: p.direccion || '',
          distrito: p.distrito || 'CHINCHA ALTA',
          distrito_otro_especificar: p.distrito_otro_especificar || '',
          celular: p.celular || '',
          estado: p.estado || 'activo',
          fecha_ingreso: p.fecha_ingreso || new Date().toISOString().split('T')[0],
          tiene_tutor: Boolean(p.tiene_tutor || p.tutor_nombres || p.tutor_numero_documento),
          tutor_nombres: p.tutor_nombres || '',
          tutor_tipo_documento: p.tutor_tipo_documento || 'DNI',
          tutor_numero_documento: p.tutor_numero_documento || '',
          tutor_celular: p.tutor_celular || '',
          tutor_parentesco: p.tutor_parentesco || 'PADRE',
        }));
        return deduplicarPacientes(mapped);
      }
    } catch (err) {
      console.warn('Error al obtener pacientes de Supabase:', err);
    }
    return null;
  },

  async getPacientesHclAuditRaw(): Promise<
    Array<{ id: string; hcl?: string; numero_documento?: string; apellidos_nombres: string }> | null
  > {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_pacientes')
          .select('id, hcl, numero_documento, apellidos_nombres')
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (!error && data) {
        return data.map((p: any) => ({
          id: String(p.id),
          hcl: p.hcl ? String(p.hcl).trim() : '',
          numero_documento: p.numero_documento ? String(p.numero_documento).trim() : '',
          apellidos_nombres: p.apellidos_nombres || '',
        }));
      }
    } catch (err) {
      console.warn('Error consultando HCL para auditoría en Supabase:', err);
    }
    return null;
  },

  async getSiguienteHcl(): Promise<string | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_pacientes')
          .select('hcl, id')
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (!error && data) {
        return calcularSiguienteHcl(data as Array<{ hcl?: string | null }>);
      }
    } catch (err) {
      console.warn('Error obteniendo siguiente HCL de Supabase:', err);
    }
    return null;
  },

  async findPacienteDuplicado(params: {
    tipo_documento?: string;
    numero_documento?: string | null;
    hcl?: string | null;
    excludeId?: string;
  }): Promise<{
    field: 'numero_documento' | 'hcl';
    existing: { id: string; apellidos_nombres: string; numero_documento?: string; hcl?: string };
  } | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const docNorm = params.tipo_documento !== 'INDOCUMENTADO' ? normalizarDocumento(params.numero_documento) : '';
      const hclNorm = normalizarHcl(params.hcl);

      if (docNorm) {
        const { data } = await client
          .from('cv_pacientes')
          .select('id, apellidos_nombres, numero_documento, hcl')
          .ilike('numero_documento', docNorm.replace(/[%_]/g, ''))
          .limit(5);
        const match = (data || []).find(
          (r: any) =>
            String(r.id) !== params.excludeId &&
            normalizarDocumento(r.numero_documento) === docNorm
        );
        if (match) {
          return {
            field: 'numero_documento',
            existing: {
              id: String(match.id),
              apellidos_nombres: match.apellidos_nombres || '',
              numero_documento: match.numero_documento || undefined,
              hcl: match.hcl || undefined,
            },
          };
        }
      }

      if (hclNorm) {
        const { data } = await client
          .from('cv_pacientes')
          .select('id, apellidos_nombres, numero_documento, hcl')
          .ilike('hcl', hclNorm.replace(/[%_]/g, ''))
          .limit(5);
        const match = (data || []).find(
          (r: any) =>
            String(r.id) !== params.excludeId &&
            normalizarHcl(r.hcl) === hclNorm
        );
        if (match) {
          return {
            field: 'hcl',
            existing: {
              id: String(match.id),
              apellidos_nombres: match.apellidos_nombres || '',
              numero_documento: match.numero_documento || undefined,
              hcl: match.hcl || undefined,
            },
          };
        }
      }
    } catch (err) {
      console.warn('Error verificando duplicado de paciente en Supabase:', err);
    }
    return null;
  },

  async insertPaciente(paciente: Paciente): Promise<{ id: string | null; error?: string }> {
    const client = getSupabase();
    if (!client) return { id: paciente.id };
    try {
      const generatedUuid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : undefined;

      const distritoFallback =
        paciente.distrito === 'OTRO' && paciente.distrito_otro_especificar?.trim()
          ? `OTRO: ${paciente.distrito_otro_especificar.trim().toUpperCase()}`
          : paciente.distrito || null;

      const bareMinimal: Record<string, any> = {
        tipo_documento: paciente.tipo_documento,
        numero_documento: paciente.numero_documento || null,
        codigo_temporal: paciente.codigo_temporal || null,
        hcl: paciente.hcl || null,
        apellidos_nombres: paciente.apellidos_nombres,
        fecha_nacimiento: paciente.fecha_nacimiento || null,
        sexo: paciente.sexo || null,
        seguro: paciente.seguro || 'SIS',
        direccion: paciente.direccion || null,
        distrito: distritoFallback,
        celular: paciente.celular || null,
        estado: paciente.estado || 'activo',
      };

      const edadCalculada =
        typeof paciente.edad === 'number'
          ? paciente.edad
          : calcularEdadDesdeFecha(paciente.fecha_nacimiento) ?? null;

      const corePayload: Record<string, any> = {
        ...bareMinimal,
        edad: edadCalculada,
        estado_civil: paciente.estado_civil || null,
        grado_instruccion: paciente.grado_instruccion || null,
        fecha_ingreso: paciente.fecha_ingreso,
        tutor_nombres: paciente.tutor_nombres || null,
        tutor_celular: paciente.tutor_celular || null,
        tutor_parentesco: paciente.tutor_parentesco || null,
      };

      const fullPayload: Record<string, any> = {
        ...corePayload,
        ...(generatedUuid ? { id: generatedUuid } : {}),
        distrito: paciente.distrito || null,
        seguro_otro_especificar: paciente.seguro_otro_especificar || null,
        distrito_otro_especificar: paciente.distrito_otro_especificar || null,
        tutor_tipo_documento: paciente.tutor_tipo_documento || null,
        tutor_numero_documento: paciente.tutor_numero_documento || null,
      };

      const workingPayload: Record<string, any> = { ...fullPayload };
      let lastError: any = null;

      for (let attempt = 0; attempt < 16; attempt++) {
        const { data, error } = await client.from('cv_pacientes').insert([workingPayload]).select('id');
        if (!error) {
          const savedId = data?.[0]?.id ? String(data[0].id) : generatedUuid || null;
          if (savedId) return { id: savedId };
        }
        lastError = error;

        if (error) {
          const rlsCheck = formatSupabaseWriteError('cv_pacientes', error, '');
          if (rlsCheck.isRls) return { id: null, error: rlsCheck.message };

          const missingCol = extractMissingSchemaColumn(error);
          if (missingCol && missingCol in workingPayload) {
            if (missingCol === 'distrito_otro_especificar' && 'distrito' in workingPayload) {
              workingPayload.distrito = distritoFallback;
            }
            delete workingPayload[missingCol];
            continue;
          }
        }
        break;
      }

      // Fallback final con columnas mínimas y sin id explícito (por si el schema requiere default)
      const minimalWithId = generatedUuid ? { ...bareMinimal, id: generatedUuid } : bareMinimal;
      const { data: d3, error: err3 } = await client.from('cv_pacientes').insert([minimalWithId]).select('id');
      if (!err3) {
        const savedId = d3?.[0]?.id ? String(d3[0].id) : generatedUuid || null;
        if (savedId) return { id: savedId };
      }

      const { data: d4, error: err4 } = await client.from('cv_pacientes').insert([bareMinimal]).select('id');
      if (!err4 && d4 && d4[0]?.id) {
        return { id: String(d4[0].id) };
      }

      const finalErr = err4 || err3 || lastError;
      console.warn('Error insertando paciente en Supabase:', finalErr);
      return {
        id: null,
        error: formatSupabaseWriteError('cv_pacientes', finalErr, 'No se pudo guardar el paciente en Supabase.').message,
      };
    } catch (err: any) {
      console.warn('Error insertando paciente en Supabase:', err);
      return {
        id: null,
        error: formatSupabaseWriteError('cv_pacientes', err, 'Error al insertar paciente en Supabase.').message,
      };
    }
  },

  async updatePaciente(id: string, data: Partial<Paciente>): Promise<{ ok: boolean; error?: string }> {
    const client = getSupabase();
    if (!client) return { ok: true };
    try {
      const corePayload: Record<string, any> = {};
      if (data.tipo_documento !== undefined) corePayload.tipo_documento = data.tipo_documento;
      if (data.numero_documento !== undefined) corePayload.numero_documento = data.numero_documento || null;
      if (data.codigo_temporal !== undefined) corePayload.codigo_temporal = data.codigo_temporal || null;
      if (data.hcl !== undefined) corePayload.hcl = data.hcl || null;
      if (data.apellidos_nombres !== undefined) corePayload.apellidos_nombres = data.apellidos_nombres;
      if (data.fecha_nacimiento !== undefined) corePayload.fecha_nacimiento = data.fecha_nacimiento || null;
      if (data.sexo !== undefined) corePayload.sexo = data.sexo || null;
      if (data.edad !== undefined) corePayload.edad = typeof data.edad === 'number' ? data.edad : null;
      if (data.estado_civil !== undefined) corePayload.estado_civil = data.estado_civil || null;
      if (data.grado_instruccion !== undefined) corePayload.grado_instruccion = data.grado_instruccion || null;
      if (data.seguro !== undefined) corePayload.seguro = data.seguro || null;
      if (data.direccion !== undefined) corePayload.direccion = data.direccion || null;
      if (data.distrito !== undefined) corePayload.distrito = data.distrito || null;
      if (data.celular !== undefined) corePayload.celular = data.celular || null;
      if (data.estado !== undefined) corePayload.estado = data.estado;
      if (data.tutor_nombres !== undefined) corePayload.tutor_nombres = data.tutor_nombres || null;
      if (data.tutor_celular !== undefined) corePayload.tutor_celular = data.tutor_celular || null;
      if (data.tutor_parentesco !== undefined) corePayload.tutor_parentesco = data.tutor_parentesco || null;

      const workingPayload: Record<string, any> = { ...corePayload };
      if (data.seguro_otro_especificar !== undefined) workingPayload.seguro_otro_especificar = data.seguro_otro_especificar || null;
      if (data.distrito_otro_especificar !== undefined) workingPayload.distrito_otro_especificar = data.distrito_otro_especificar || null;
      if (data.tutor_tipo_documento !== undefined) workingPayload.tutor_tipo_documento = data.tutor_tipo_documento || null;
      if (data.tutor_numero_documento !== undefined) workingPayload.tutor_numero_documento = data.tutor_numero_documento || null;

      let lastError: any = null;
      for (let attempt = 0; attempt < 16; attempt++) {
        if (Object.keys(workingPayload).length === 0) {
          return { ok: true };
        }
        const { error } = await client.from('cv_pacientes').update(workingPayload).eq('id', id);
        if (!error) return { ok: true };

        lastError = error;
        const rlsCheck = formatSupabaseWriteError('cv_pacientes', error, '');
        if (rlsCheck.isRls) return { ok: false, error: rlsCheck.message };

        const missingCol = extractMissingSchemaColumn(error);
        if (missingCol && missingCol in workingPayload) {
          if (
            missingCol === 'distrito_otro_especificar' &&
            data.distrito === 'OTRO' &&
            data.distrito_otro_especificar?.trim()
          ) {
            workingPayload.distrito = `OTRO: ${data.distrito_otro_especificar.trim().toUpperCase()}`;
          }
          delete workingPayload[missingCol];
          continue;
        }
        break;
      }

      console.warn('Error actualizando paciente en Supabase:', lastError);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_pacientes', lastError, 'No se pudo actualizar el paciente en Supabase.').message,
      };
    } catch (err: any) {
      console.warn('Error actualizando paciente en Supabase:', err);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_pacientes', err, 'Error al actualizar paciente en Supabase').message,
      };
    }
  },

  async deletePaciente(id: string): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_pacientes').delete().eq('id', id);
      return !error;
    } catch (err) {
      console.warn('Error eliminando paciente en Supabase:', err);
      return false;
    }
  },

  // 3. CITAS: cv_citas y vistas v_cv_citas_hoy, v_cv_citas_por_atender, v_cv_citas_proximas
  async getCitas(): Promise<Cita[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_citas')
          .select('*')
          .order('fecha_cita', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (!error && data) {
        return data.map((c: any) => ({
          id: String(c.id),
          paciente_id: String(c.paciente_id),
          profesional_id: c.profesional_id
            ? String(c.profesional_id)
            : c.medico_id
              ? String(c.medico_id)
              : undefined,
          consultorio_id: c.consultorio_id ? String(c.consultorio_id) : undefined,
          fecha_cita: c.fecha_cita,
          hora_cita: c.hora_cita,
          tipo_cita: c.tipo_cita || c.tipo_atencion || 'CONSULTA',
          estado: c.estado || 'PENDIENTE',
          motivo_consulta: c.motivo_consulta,
          observaciones: c.observaciones || c.notas,
          numero_ticket: c.numero_ticket || `TKT-${c.fecha_cita ? c.fecha_cita.split('-')[0] : '2026'}-${String(c.id).replace(/\D/g, '').slice(-4).padStart(4, '0') || '0001'}`,
          seguro_cita: c.seguro_cita,
          triaje_completado: Boolean(c.triaje_completado),
          atencion_completada: Boolean(c.atencion_completada),
        }));
      }
    } catch (err) {
      console.warn('Error al obtener citas de Supabase:', err);
    }
    return null;
  },

  async insertCita(cita: Cita): Promise<{ ok: boolean; id?: string; error?: string }> {
    const client = getSupabase();
    if (!client) return { ok: false };
    try {
      const isUuid = (val?: string) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      const workingPayload: Record<string, any> = {
        paciente_id: cita.paciente_id,
        fecha_cita: cita.fecha_cita ? cita.fecha_cita.split('T')[0] : cita.fecha_cita,
        hora_cita: cita.hora_cita,
        tipo_cita: cita.tipo_cita || 'CONSULTA',
        estado: cita.estado || 'PENDIENTE',
        motivo_consulta: cita.motivo_consulta || null,
        seguro_cita: cita.seguro_cita || 'SIS',
      };
      if (isUuid(cita.id)) workingPayload.id = cita.id;
      if (cita.profesional_id) workingPayload.profesional_id = cita.profesional_id;
      if (cita.consultorio_id) workingPayload.consultorio_id = cita.consultorio_id;
      if (cita.observaciones) workingPayload.observaciones = cita.observaciones;
      if (cita.numero_ticket) workingPayload.numero_ticket = cita.numero_ticket;

      let lastErr: any = null;
      for (let attempt = 0; attempt < 14; attempt++) {
        const { data, error } = await client.from('cv_citas').insert([workingPayload]).select('id');
        if (!error) {
          const savedId = data?.[0]?.id ? String(data[0].id) : workingPayload.id || cita.id;
          if (savedId) cita.id = savedId;
          return { ok: true, id: savedId };
        }
        lastErr = error;

        const rlsCheck = formatSupabaseWriteError('cv_citas', error, '');
        if (rlsCheck.isRls) return { ok: false, error: rlsCheck.message };

        const missingCol = extractMissingSchemaColumn(error);
        if (missingCol && missingCol in workingPayload) {
          if (missingCol === 'profesional_id' && !('medico_id' in workingPayload)) {
            workingPayload.medico_id = workingPayload.profesional_id;
          }
          if (missingCol === 'tipo_cita' && !('tipo_atencion' in workingPayload)) {
            workingPayload.tipo_atencion = workingPayload.tipo_cita;
          }
          delete workingPayload[missingCol];
          continue;
        }

        const msg = String(error?.message || '').toLowerCase();
        const details = String(error?.details || '').toLowerCase();
        const combined = `${msg} ${details}`;

        // Si consultorio_id es tipo uuid/FK en BD pero el id local es 'cons-1', descartarlo sin perder profesional_id
        if ('consultorio_id' in workingPayload && (!isUuid(String(workingPayload.consultorio_id)) || combined.includes('consultorio'))) {
          delete workingPayload.consultorio_id;
          continue;
        }

        // Si profesional_id local no es UUID pero la columna en BD exige UUID, evitar que aborte toda la inserción
        if ('profesional_id' in workingPayload && !isUuid(String(workingPayload.profesional_id)) && combined.includes('uuid')) {
          delete workingPayload.profesional_id;
          continue;
        }

        // Si id explícito falla por tipo/secuencia, dejar que Postgres genere el id
        if ('id' in workingPayload && (combined.includes('uuid') || combined.includes('integer') || combined.includes('bigint'))) {
          delete workingPayload.id;
          continue;
        }

        break;
      }

      console.warn('Error insertando cita en Supabase:', lastErr);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_citas', lastErr, 'No se pudo guardar la cita en Supabase.').message,
      };
    } catch (err: any) {
      console.warn('Error insertando cita en Supabase:', err);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_citas', err, 'Error al insertar cita en Supabase.').message,
      };
    }
  },

  async updateCita(id: string, data: Partial<Cita>): Promise<{ ok: boolean; error?: string }> {
    const client = getSupabase();
    if (!client) return { ok: false };
    try {
      const isUuid = (val?: string) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      const workingPayload: Record<string, any> = {};
      if (data.profesional_id !== undefined) workingPayload.profesional_id = data.profesional_id || null;
      if (data.consultorio_id !== undefined) workingPayload.consultorio_id = data.consultorio_id || null;
      if (data.estado !== undefined) workingPayload.estado = data.estado;
      if (data.fecha_cita !== undefined) workingPayload.fecha_cita = data.fecha_cita.split('T')[0];
      if (data.hora_cita !== undefined) workingPayload.hora_cita = data.hora_cita;
      if (data.tipo_cita !== undefined) workingPayload.tipo_cita = data.tipo_cita;
      if (data.motivo_consulta !== undefined) workingPayload.motivo_consulta = data.motivo_consulta || null;
      if (data.observaciones !== undefined) workingPayload.observaciones = data.observaciones || null;
      if (data.seguro_cita !== undefined) workingPayload.seguro_cita = data.seguro_cita;
      if (data.triaje_completado !== undefined) workingPayload.triaje_completado = data.triaje_completado;
      if (data.atencion_completada !== undefined) workingPayload.atencion_completada = data.atencion_completada;

      let lastErr: any = null;
      for (let attempt = 0; attempt < 12; attempt++) {
        if (Object.keys(workingPayload).length === 0) return { ok: true };
        const { error } = await client.from('cv_citas').update(workingPayload).eq('id', id);
        if (!error) return { ok: true };

        lastErr = error;
        const rlsCheck = formatSupabaseWriteError('cv_citas', error, '');
        if (rlsCheck.isRls) return { ok: false, error: rlsCheck.message };

        const missingCol = extractMissingSchemaColumn(error);
        if (missingCol && missingCol in workingPayload) {
          if (missingCol === 'profesional_id' && !('medico_id' in workingPayload)) {
            workingPayload.medico_id = workingPayload.profesional_id;
          }
          if (missingCol === 'tipo_cita' && !('tipo_atencion' in workingPayload)) {
            workingPayload.tipo_atencion = workingPayload.tipo_cita;
          }
          delete workingPayload[missingCol];
          continue;
        }

        const combined = `${String(error?.message || '')} ${String(error?.details || '')}`.toLowerCase();
        if ('consultorio_id' in workingPayload && (!isUuid(String(workingPayload.consultorio_id)) || combined.includes('consultorio'))) {
          delete workingPayload.consultorio_id;
          continue;
        }

        break;
      }

      console.warn('Error actualizando cita en Supabase:', lastErr);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_citas', lastErr, 'No se pudo actualizar la cita en Supabase.').message,
      };
    } catch (err: any) {
      console.warn('Error actualizando cita en Supabase:', err);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_citas', err, 'Error al actualizar cita en Supabase.').message,
      };
    }
  },

  // 4. ATENCIONES: cv_atenciones y vista v_cv_atenciones_hoy
  async getAtenciones(): Promise<AtencionClinica[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_atenciones')
          .select('*')
          .order('fecha_atencion', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (!error && data) {
        return data.map((a: any) => ({
          id: String(a.id),
          paciente_id: String(a.paciente_id),
          cita_id: a.cita_id ? String(a.cita_id) : undefined,
          triaje_id: a.triaje_id ? String(a.triaje_id) : undefined,
          profesional_id: a.profesional_id ? String(a.profesional_id) : undefined,
          consultorio_id: a.consultorio_id ? String(a.consultorio_id) : undefined,
          fecha_atencion: a.fecha_atencion,
          hora_atencion: a.hora_atencion,
          presion_arterial: a.presion_arterial,
          frecuencia_cardiaca: a.frecuencia_cardiaca,
          frecuencia_respiratoria: a.frecuencia_respiratoria,
          peso: a.peso,
          talla: a.talla,
          motivo_consulta: a.motivo_consulta || '',
          examen_mental: a.examen_mental || '',
          diagnostico_1: a.diagnostico_1 || '',
          cie10_1: a.cie10_1 || '',
          diagnostico_2: a.diagnostico_2,
          cie10_2: a.cie10_2,
          plan_tratamiento: a.plan_tratamiento || a.plan_trabajo || '',
          recomendaciones: a.recomendaciones,
          medicamentos: parseMedicamentosList(a.medicamentos ?? a.receta_medicamentos ?? []),
          estado: 'COMPLETADA',
        }));
      }
    } catch (err) {
      console.warn('Error al obtener atenciones de Supabase:', err);
    }
    return null;
  },

  async insertAtencion(atencion: AtencionClinica): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_atenciones').insert([atencion]);
      return !error;
    } catch (err) {
      console.warn('Error insertando atención en Supabase:', err);
      return false;
    }
  },

  // 5. TRIAJES: cv_triajes
  async getTriajes(): Promise<Triaje[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_triajes')
          .select('*')
          .order('fecha', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (!error && data) {
        return data.map((t: any) => ({
          id: String(t.id),
          cita_id: t.cita_id ? String(t.cita_id) : undefined,
          paciente_id: String(t.paciente_id),
          profesional_id: t.profesional_id ? String(t.profesional_id) : undefined,
          consultorio_id: t.consultorio_id ? String(t.consultorio_id) : 'cons-1',
          fecha: t.fecha,
          hora_llegada: t.hora_llegada,
          hora_llamado: t.hora_llamado,
          hora_fin_atencion: t.hora_fin_atencion,
          estado: t.estado || 'ATENDIDO',
          peso: t.peso ? Number(t.peso) : undefined,
          talla: t.talla ? Number(t.talla) : undefined,
          presion_arterial: t.presion_arterial,
          imc: t.imc ? Number(t.imc) : undefined,
          frecuencia_cardiaca: t.frecuencia_cardiaca ? Number(t.frecuencia_cardiaca) : undefined,
          frecuencia_respiratoria: t.frecuencia_respiratoria ? Number(t.frecuencia_respiratoria) : undefined,
          temperatura: t.temperatura ? Number(t.temperatura) : undefined,
          spo2: t.spo2 ? Number(t.spo2) : undefined,
          clasificacion_riesgo: t.clasificacion_riesgo || t.prioridad || 'VERDE',
          motivo_consulta: t.motivo_consulta || '',
        }));
      }
    } catch (err) {
      console.warn('Error al obtener triajes de Supabase:', err);
    }
    return null;
  },

  async insertTriaje(triaje: Triaje): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_triajes').insert([triaje]);
      return !error;
    } catch (err) {
      console.warn('Error insertando triaje en Supabase:', err);
      return false;
    }
  },

  // 6. PROFESIONALES: cv_profesionales
  async getProfesionales(): Promise<Profesional[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_profesionales')
          .select('*')
          .order('apellidos_nombres', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (!error && data) {
        return data.map((pr: any) => {
          const doc = String(pr.dni || '').trim();
          const rawTipo = String(pr.tipo_documento || '').trim().toUpperCase();
          const tipoInferido: 'DNI' | 'CE' | 'PASAPORTE' =
            rawTipo === 'CE'
              ? 'CE'
              : rawTipo === 'PASAPORTE'
                ? 'PASAPORTE'
                : rawTipo === 'DNI'
                  ? 'DNI'
                  : doc && !/^\d{8}$/.test(doc)
                    ? 'CE'
                    : 'DNI';
          const rawCol = String(pr.colegiatura || '').trim();
          const rawRne = String(pr.rne || '').trim();
          let colegiaturaParsed = rawCol;
          let rneParsed = rawRne;
          if (!rneParsed && rawCol) {
            const matchPipe = rawCol.match(/^(.*?)\s*\|\s*RNE:\s*(.+)$/i);
            if (matchPipe) {
              colegiaturaParsed = matchPipe[1].trim();
              rneParsed = matchPipe[2].trim();
            } else if (/^RNE:\s*(.+)$/i.test(rawCol)) {
              colegiaturaParsed = '';
              rneParsed = rawCol.replace(/^RNE:\s*/i, '').trim();
            }
          } else if (rneParsed && rawCol) {
            colegiaturaParsed = rawCol.replace(/\s*\|\s*RNE:\s*.+$/i, '').trim();
          }
          return {
            id: String(pr.id),
            tipo_documento: tipoInferido,
            dni: doc,
            apellidos_nombres: pr.apellidos_nombres || '',
            profesion: pr.profesion || 'MEDICO',
            especialidad: pr.especialidad || '',
            colegiatura: colegiaturaParsed,
            rne: rneParsed,
            telefono: pr.telefono || '',
            correo: pr.correo || '',
            estado: pr.estado || 'ACTIVO',
            consultorioAsignado: pr.consultorioAsignado || pr.consultorio_id || pr.consultorio_asignado || undefined,
            turnoHabitual: pr.turnoHabitual || pr.turno_habitual || 'MAÑANA',
          };
        });
      }
    } catch (err) {
      console.warn('Error al obtener profesionales de Supabase:', err);
    }
    return null;
  },

  async insertProfesional(prof: Profesional): Promise<{ id: string | null; error?: string }> {
    const client = getSupabase();
    if (!client) return { id: prof.id };
    try {
      const generatedUuid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : undefined;

      const baseCol = (prof.colegiatura || '').trim();
      const baseRne = (prof.rne || '').trim();
      const packedCol = baseRne ? (baseCol ? `${baseCol} | RNE: ${baseRne}` : `RNE: ${baseRne}`) : baseCol;

      const minimalPayload: Record<string, any> = {
        dni: prof.dni || null,
        apellidos_nombres: prof.apellidos_nombres,
        profesion: prof.profesion,
        especialidad: prof.especialidad || null,
        colegiatura: baseCol || null,
        telefono: prof.telefono || null,
        correo: prof.correo || null,
        estado: prof.estado || 'ACTIVO',
      };

      const workingPayload: Record<string, any> = {
        ...minimalPayload,
        ...(generatedUuid ? { id: generatedUuid } : {}),
      };
      if (baseRne) {
        workingPayload.rne = baseRne;
      }
      if (prof.tipo_documento) {
        workingPayload.tipo_documento = prof.tipo_documento;
      }
      if (prof.consultorioAsignado) {
        workingPayload.consultorio_id = prof.consultorioAsignado;
      }
      if (prof.turnoHabitual) {
        workingPayload.turno_habitual = prof.turnoHabitual;
      }

      // 1. Intento progresivo descartando solo columnas opcionales inexistentes
      let lastErr: any = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data, error } = await client.from('cv_profesionales').insert([workingPayload]).select('id');
        if (!error) {
          const savedId = data?.[0]?.id ? String(data[0].id) : generatedUuid || null;
          if (savedId) return { id: savedId };
        }
        lastErr = error;
        const rlsCheck = formatSupabaseWriteError('cv_profesionales', error, '');
        if (rlsCheck.isRls) return { id: null, error: rlsCheck.message };

        const missingCol = extractMissingSchemaColumn(error);
        if (missingCol && missingCol in workingPayload) {
          delete workingPayload[missingCol];
          if (missingCol === 'rne' && baseRne) {
            workingPayload.colegiatura = packedCol || null;
            minimalPayload.colegiatura = packedCol || null;
          }
          continue;
        }
        break;
      }

      // 2. Fallback sin columnas extendidas, conservando UUID explícito
      const minimalWithId = generatedUuid ? { ...minimalPayload, id: generatedUuid } : minimalPayload;
      const { data: d2, error: err2 } = await client
        .from('cv_profesionales')
        .insert([minimalWithId])
        .select('id');
      if (!err2) {
        const savedId = d2?.[0]?.id ? String(d2[0].id) : generatedUuid || null;
        if (savedId) return { id: savedId };
      }

      // 3. Fallback sin campo id (dejar que PostgreSQL use su default)
      const { data: d3, error: err3 } = await client
        .from('cv_profesionales')
        .insert([minimalPayload])
        .select('id');
      if (!err3 && d3 && d3[0]?.id) {
        return { id: String(d3[0].id) };
      }

      const finalErr = err3 || err2 || lastErr;
      console.warn('Error insertando profesional en Supabase:', finalErr);
      return {
        id: null,
        error: formatSupabaseWriteError('cv_profesionales', finalErr, 'No se pudo guardar el profesional en Supabase.').message,
      };
    } catch (err: any) {
      console.warn('Error insertando profesional en Supabase:', err);
      return {
        id: null,
        error: formatSupabaseWriteError('cv_profesionales', err, 'Error al insertar profesional en Supabase.').message,
      };
    }
  },

  async updateProfesional(id: string, data: Partial<Profesional>): Promise<{ ok: boolean; error?: string }> {
    const client = getSupabase();
    if (!client) return { ok: true };
    try {
      const minimalPayload: Record<string, any> = {};
      if (data.dni !== undefined) minimalPayload.dni = data.dni || null;
      if (data.apellidos_nombres !== undefined) minimalPayload.apellidos_nombres = data.apellidos_nombres;
      if (data.profesion !== undefined) minimalPayload.profesion = data.profesion;
      if (data.especialidad !== undefined) minimalPayload.especialidad = data.especialidad || null;
      if (data.colegiatura !== undefined) minimalPayload.colegiatura = data.colegiatura || null;
      if (data.telefono !== undefined) minimalPayload.telefono = data.telefono || null;
      if (data.correo !== undefined) minimalPayload.correo = data.correo || null;
      if (data.estado !== undefined) minimalPayload.estado = data.estado;

      const workingPayload: Record<string, any> = { ...minimalPayload };
      if (data.rne !== undefined) workingPayload.rne = data.rne || null;
      if (data.tipo_documento !== undefined) workingPayload.tipo_documento = data.tipo_documento || null;
      if (data.consultorioAsignado !== undefined) workingPayload.consultorio_id = data.consultorioAsignado || null;
      if (data.turnoHabitual !== undefined) workingPayload.turno_habitual = data.turnoHabitual || null;

      let lastErr: any = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        if (Object.keys(workingPayload).length === 0) return { ok: true };
        const { error } = await client.from('cv_profesionales').update(workingPayload).eq('id', id);
        if (!error) return { ok: true };

        lastErr = error;
        const rlsCheck = formatSupabaseWriteError('cv_profesionales', error, '');
        if (rlsCheck.isRls) return { ok: false, error: rlsCheck.message };

        const missingCol = extractMissingSchemaColumn(error);
        if (missingCol && missingCol in workingPayload) {
          if (missingCol === 'consultorio_id' && !('consultorio_asignado' in workingPayload)) {
            workingPayload.consultorio_asignado = workingPayload.consultorio_id;
          }
          delete workingPayload[missingCol];
          if (missingCol === 'rne' && data.rne !== undefined) {
            const baseCol = (data.colegiatura ?? '').trim();
            const baseRne = (data.rne ?? '').trim();
            const packedCol = baseRne ? (baseCol ? `${baseCol} | RNE: ${baseRne}` : `RNE: ${baseRne}`) : baseCol;
            if (data.colegiatura !== undefined || baseRne) {
              workingPayload.colegiatura = packedCol || null;
              minimalPayload.colegiatura = packedCol || null;
            }
          }
          continue;
        }
        const combined = `${String(error?.message || '')} ${String(error?.details || '')}`.toLowerCase();
        if ('consultorio_id' in workingPayload && combined.includes('uuid')) {
          if (!('consultorio_asignado' in workingPayload)) {
            workingPayload.consultorio_asignado = workingPayload.consultorio_id;
          }
          delete workingPayload.consultorio_id;
          continue;
        }
        break;
      }

      // Fallback mínimo si fallaron columnas extendidas
      if (Object.keys(minimalPayload).length > 0) {
        const { error: err2 } = await client.from('cv_profesionales').update(minimalPayload).eq('id', id);
        if (!err2) return { ok: true };
        console.warn('Error actualizando profesional en Supabase:', err2);
        return {
          ok: false,
          error: formatSupabaseWriteError('cv_profesionales', err2, 'No se pudo actualizar el profesional en Supabase.').message,
        };
      }
      console.warn('Error actualizando profesional en Supabase:', lastErr);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_profesionales', lastErr, 'No se pudo actualizar el profesional en Supabase.').message,
      };
    } catch (err: any) {
      console.warn('Error actualizando profesional en Supabase:', err);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_profesionales', err, 'Error al actualizar profesional en Supabase.').message,
      };
    }
  },

  async deleteProfesional(id: string): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_profesionales').delete().eq('id', id);
      return !error;
    } catch (err) {
      console.warn('Error eliminando profesional en Supabase:', err);
      return false;
    }
  },

  async deleteAllProfesionales(): Promise<{ ok: boolean; error?: string }> {
    const client = getSupabase();
    if (!client) return { ok: true };
    try {
      const { error } = await client.from('cv_profesionales').delete().not('id', 'is', null);
      if (error) {
        console.warn('Error eliminando todos los profesionales en Supabase:', error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err: any) {
      console.warn('Excepción eliminando todos los profesionales en Supabase:', err);
      return { ok: false, error: err?.message || 'Error al eliminar profesionales en Supabase' };
    }
  },

  // 7. USUARIOS: cv_usuarios
  async getUsuarios(): Promise<Usuario[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_usuarios')
          .select('*')
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (!error && data) {
        return data.map((u: any) => {
          const rawPerms = u.permisosModulos || u.permisos_modulos;
          const rol = (u.rol || 'general') as Usuario['rol'];
          const defaultPerms: Usuario['permisosModulos'] =
            rol === 'desarrollador'
              ? [
                  'dashboard',
                  'pacientes',
                  'ficha_paciente',
                  'fua',
                  'agenda',
                  'triaje',
                  'atencion',
                  'display_turnos',
                  'profesionales',
                  'programacion_turnos',
                  'programacion_anual',
                  'reportes',
                  'gestion_usuarios',
                ]
              : rol === 'administrador'
                ? [
                    'dashboard',
                    'pacientes',
                    'ficha_paciente',
                    'fua',
                    'agenda',
                    'triaje',
                    'atencion',
                    'display_turnos',
                    'profesionales',
                    'programacion_turnos',
                    'programacion_anual',
                    'reportes',
                    'gestion_usuarios',
                  ]
                : ['dashboard', 'agenda'];

          return {
            id: String(u.id),
            usuario: u.usuario,
            contrasena: u['contraseña'] ?? u.contrasena ?? u.password,
            nombres: u.nombres || '',
            apellidos: u.apellidos || '',
            rol,
            correo: u.correo || undefined,
            telefono: u.telefono || undefined,
            estado: u.estado || 'activo',
            permisosModulos: Array.isArray(rawPerms) ? rawPerms : defaultPerms,
            ultimoAcceso: u.ultimoAcceso || u.ultimo_acceso || undefined,
            fechaCreacion: u.fechaCreacion || u.fecha_creacion || new Date().toISOString().split('T')[0],
          };
        });
      }
    } catch (err) {
      console.warn('Error al obtener usuarios de Supabase:', err);
    }
    return null;
  },

  async insertUsuario(usuario: Usuario): Promise<{ id: string | null; error?: string }> {
    const client = getSupabase();
    if (!client) return { id: usuario.id };
    try {
      const generatedUuid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : undefined;

      const baseMinimal: Record<string, any> = {
        usuario: usuario.usuario,
        contraseña: usuario.contrasena || '123456',
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        estado: usuario.estado,
      };
      if (generatedUuid) baseMinimal.id = generatedUuid;

      const fullPayload: Record<string, any> = {
        ...baseMinimal,
        correo: usuario.correo || null,
        telefono: usuario.telefono || null,
        permisos_modulos: usuario.permisosModulos,
        fecha_creacion: usuario.fechaCreacion,
        ultimo_acceso: usuario.ultimoAcceso || null,
      };

      const { data, error } = await client.from('cv_usuarios').insert([fullPayload]).select('id');
      if (!error) {
        const savedId = data?.[0]?.id ? String(data[0].id) : generatedUuid || null;
        if (savedId) return { id: savedId };
      }
      if (error) {
        const rlsCheck = formatSupabaseWriteError('cv_usuarios', error, '');
        if (rlsCheck.isRls) return { id: null, error: rlsCheck.message };
      }

      // Fallback 1: solo columnas base con contraseña (por si faltan columnas opcionales)
      const { data: d2, error: err2 } = await client.from('cv_usuarios').insert([baseMinimal]).select('id');
      if (!err2) {
        const savedId = d2?.[0]?.id ? String(d2[0].id) : generatedUuid || null;
        if (savedId) return { id: savedId };
      }

      // Fallback 2: usando columna contrasena sin ñ
      const { contraseña: passVal, ...restMinimal } = baseMinimal;
      const { data: d3, error: err3 } = await client
        .from('cv_usuarios')
        .insert([{ ...restMinimal, contrasena: passVal }])
        .select('id');
      if (!err3) {
        const savedId = d3?.[0]?.id ? String(d3[0].id) : generatedUuid || null;
        if (savedId) return { id: savedId };
      }

      const lastErr = err3 || err2 || error;
      console.warn('Error insertando en cv_usuarios:', lastErr);
      return {
        id: null,
        error: formatSupabaseWriteError('cv_usuarios', lastErr, 'No se pudo guardar el usuario en Supabase.').message,
      };
    } catch (err: any) {
      console.warn('Excepción insertando en cv_usuarios:', err);
      return {
        id: null,
        error: formatSupabaseWriteError('cv_usuarios', err, 'Error al insertar usuario en Supabase.').message,
      };
    }
  },

  async updateUsuario(id: string, data: Partial<Usuario>): Promise<{ ok: boolean; error?: string }> {
    const client = getSupabase();
    if (!client) return { ok: true };
    try {
      const payload: Record<string, any> = {};
      if (data.usuario !== undefined) payload.usuario = data.usuario;
      if (data.contrasena !== undefined) payload['contraseña'] = data.contrasena;
      if (data.nombres !== undefined) payload.nombres = data.nombres;
      if (data.apellidos !== undefined) payload.apellidos = data.apellidos;
      if (data.rol !== undefined) payload.rol = data.rol;
      if (data.correo !== undefined) payload.correo = data.correo || null;
      if (data.telefono !== undefined) payload.telefono = data.telefono || null;
      if (data.estado !== undefined) payload.estado = data.estado;
      if (data.permisosModulos !== undefined) payload.permisos_modulos = data.permisosModulos;
      if (data.ultimoAcceso !== undefined) payload.ultimo_acceso = data.ultimoAcceso;

      const { error } = await client.from('cv_usuarios').update(payload).eq('id', id);
      if (!error) return { ok: true };

      const rlsCheck = formatSupabaseWriteError('cv_usuarios', error, '');
      if (rlsCheck.isRls) return { ok: false, error: rlsCheck.message };

      // Fallback sin columnas opcionales
      const minimalPayload: Record<string, any> = {};
      if (data.usuario !== undefined) minimalPayload.usuario = data.usuario;
      if (data.contrasena !== undefined) minimalPayload['contraseña'] = data.contrasena;
      if (data.nombres !== undefined) minimalPayload.nombres = data.nombres;
      if (data.apellidos !== undefined) minimalPayload.apellidos = data.apellidos;
      if (data.rol !== undefined) minimalPayload.rol = data.rol;
      if (data.estado !== undefined) minimalPayload.estado = data.estado;

      if (Object.keys(minimalPayload).length > 0) {
        const { error: err2 } = await client.from('cv_usuarios').update(minimalPayload).eq('id', id);
        if (!err2) return { ok: true };
        console.warn('Error actualizando en cv_usuarios:', err2);
        return {
          ok: false,
          error: formatSupabaseWriteError('cv_usuarios', err2, 'No se pudo actualizar el usuario en Supabase.').message,
        };
      }
      console.warn('Error actualizando en cv_usuarios:', error);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_usuarios', error, 'No se pudo actualizar el usuario en Supabase.').message,
      };
    } catch (err: any) {
      console.warn('Error actualizando en cv_usuarios:', err);
      return {
        ok: false,
        error: formatSupabaseWriteError('cv_usuarios', err, 'Error al actualizar usuario en Supabase.').message,
      };
    }
  },

  async deleteUsuario(id: string): Promise<{ ok: boolean; error?: string }> {
    const client = getSupabase();
    if (!client) return { ok: true };
    try {
      const { error } = await client.from('cv_usuarios').delete().eq('id', id);
      if (error) {
        console.warn('Error eliminando en cv_usuarios:', error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err: any) {
      console.warn('Excepción eliminando en cv_usuarios:', err);
      return { ok: false, error: err?.message || 'Error al eliminar usuario en Supabase' };
    }
  },

  // 7.1 Búsqueda real de identidad en padrón / pac_datos_personales
  async buscarPersonaPorDni(dni: string): Promise<{
    dni: string;
    apellidos_nombres: string;
    fecha_nacimiento?: string;
    sexo?: 'M' | 'F';
  } | null> {
    const client = getSupabase();
    if (!client) {
      console.warn('Cliente Supabase no configurado para consulta en pac_datos_personales');
      return null;
    }
    try {
      const cleanDni = dni.trim();
      const { data, error } = await client
        .from('pac_datos_personales')
        .select('dni, apellidos_nombres, fecha_nacimiento, sexo')
        .eq('dni', cleanDni)
        .maybeSingle();

      if (error) {
        console.warn('Error consultando pac_datos_personales:', error);
        return null;
      }

      if (data && data.apellidos_nombres) {
        let sexoNormalizado: 'M' | 'F' | undefined = undefined;
        if (data.sexo) {
          const s = String(data.sexo).trim().toUpperCase();
          if (s === 'F' || s.startsWith('FEM')) sexoNormalizado = 'F';
          else if (s === 'M' || s.startsWith('MAS')) sexoNormalizado = 'M';
        }

        return {
          dni: String(data.dni || cleanDni),
          apellidos_nombres: String(data.apellidos_nombres).trim(),
          fecha_nacimiento: data.fecha_nacimiento ? String(data.fecha_nacimiento).trim() : undefined,
          sexo: sexoNormalizado,
        };
      }
      return null;
    } catch (err) {
      console.warn('Excepción buscando en pac_datos_personales:', err);
      return null;
    }
  },

  // 8. FUA: cv_fua_historial y cv_fua_contador
  async getFuas(): Promise<FUA[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from('cv_fua_historial')
          .select('*')
          .order('fecha', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      if (!error && data) {
        return data.map((f: any) => ({
          id: String(f.id),
          numero_fua: f.numero_fua,
          fecha: f.fecha,
          hora: f.hora,
          paciente_id: String(f.paciente_id),
          codigo_renaes: f.codigo_renaes || '00028492',
          diresa: f.diresa || 'DIRESA ICA - RED DE SALUD CHINCHA',
          establecimiento: f.establecimiento || 'CSMC CENTINELA DE VIDA',
          componente_sis: f.componente_sis || 'SUBSIDIADO',
          codigo_afiliacion_sis: f.codigo_afiliacion_sis || '',
          tipo_atencion: f.tipo_atencion || 'AMBULATORIA',
          codigo_prestacional: f.codigo_prestacional || '056',
          profesional_id: String(f.profesional_id),
          triaje_id: f.triaje_id ? String(f.triaje_id) : undefined,
          atencion_id: f.atencion_id ? String(f.atencion_id) : undefined,
          presion_arterial: f.presion_arterial,
          frecuencia_cardiaca: f.frecuencia_cardiaca,
          frecuencia_respiratoria: f.frecuencia_respiratoria,
          peso_kg: f.peso_kg,
          talla_cm: f.talla_cm,
          diagnosticos: Array.isArray(f.diagnosticos) ? f.diagnosticos : [],
          medicamentos: Array.isArray(f.medicamentos) ? f.medicamentos : [],
          observaciones: f.observaciones,
          estado: f.estado || 'REGISTRADO',
        }));
      }
    } catch (err) {
      console.warn('Error al obtener FUA de Supabase:', err);
    }
    return null;
  },

  async insertFua(fua: FUA): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      // Construir payload limpio con las columnas estándar de la tabla cv_fua_historial
      const payload: Record<string, any> = {
        numero_fua: fua.numero_fua,
        fecha: fua.fecha,
        hora: fua.hora,
        paciente_id: fua.paciente_id,
        codigo_renaes: fua.codigo_renaes || fua.renaiess || '00003414',
        diresa: fua.diresa || 'DIRESA ICA / RED CHINCHA',
        establecimiento: fua.establecimiento || 'HOSPITAL SAN JOSÉ DE CHINCHA',
        componente_sis: fua.componente_sis || 'SUBSIDIADO',
        codigo_afiliacion_sis: fua.codigo_afiliacion_sis || '',
        tipo_atencion: fua.tipo_atencion || 'AMBULATORIA',
        codigo_prestacional: fua.codigo_prestacional || '056',
        profesional_id: fua.profesional_id,
        triaje_id: fua.triaje_id || null,
        atencion_id: fua.atencion_id || null,
        presion_arterial: fua.presion_arterial || null,
        frecuencia_cardiaca: fua.frecuencia_cardiaca || null,
        frecuencia_respiratoria: fua.frecuencia_respiratoria || null,
        peso_kg: fua.peso_kg || null,
        talla_cm: fua.talla_cm || null,
        diagnosticos: Array.isArray(fua.diagnosticos) ? fua.diagnosticos : [],
        medicamentos: Array.isArray(fua.medicamentos) ? fua.medicamentos : [],
        observaciones: fua.observaciones || null,
        estado: fua.estado || 'REGISTRADO',
      };

      // Si el id es generado en base de datos o numérico, no enviar prefijo local 'fua-'
      if (fua.id && !fua.id.startsWith('fua-')) {
        payload.id = fua.id;
      }

      const { error } = await client.from('cv_fua_historial').insert([payload]);
      if (error) {
        console.warn('Error insertando en cv_fua_historial:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Excepción insertando FUA en Supabase:', err);
      return false;
    }
  },

  async updateAtencionFua(atencionId: string, fuaId: string): Promise<boolean> {
    const client = getSupabase();
    if (!client || !atencionId) return false;
    try {
      const { error } = await client
        .from('cv_atenciones')
        .update({ fua_generado: true, fua_id: fuaId })
        .eq('id', atencionId);
      return !error;
    } catch (err) {
      console.warn('No se pudo actualizar fua_id en cv_atenciones:', err);
      return false;
    }
  },

  // 10. CATALOGOS OFICIALES: diagnosticospico y pac_procedimientos (SIN PUNTOS EN CÓDIGOS)
  async getDiagnosticosPsico(): Promise<Array<{ codigo: string; nombre: string; sexo?: string; condicion_materna?: string; percapita?: string }> | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      // 1. Intentar tabla principal diagnosticospico
      let { data, error } = await fetchAllRows((from, to) =>
        client
          .from('diagnosticospico')
          .select('*')
          .order('codigo', { ascending: true })
          .range(from, to)
      );

      // 2. Si falla o no existe, intentar tablas alternativas posibles
      if (error || !data || data.length === 0) {
        const altQuery = await client.from('diagnosticos').select('*').limit(500);
        if (!altQuery.error && altQuery.data && altQuery.data.length > 0) {
          data = altQuery.data;
          error = null;
        }
      }

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          codigo: String(d.codigo || d.cie10 || '').replace(/\./g, '').trim(),
          nombre: String(d.nombre || d.descripcion || '').trim(),
          sexo: d['Sexo:_Ambos_A_Hombre_H_Mujer_M_'] || d.sexo || 'A',
          condicion_materna: d.condicion_materna,
          percapita: d.percapita,
        }));
      }
    } catch (err) {
      console.warn('Error al obtener diagnosticospico de Supabase:', err);
    }
    return null;
  },

  async getProcedimientos(): Promise<Array<{ cpms: string; descripcion: string; estrategia_sis?: string; condicion?: string }> | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      // 1. Intentar tabla principal pac_procedimientos
      let { data, error } = await fetchAllRows((from, to) =>
        client
          .from('pac_procedimientos')
          .select('*')
          .order('cpms', { ascending: true })
          .range(from, to)
      );

      // 2. Si falla o no existe, intentar tablas alternativas posibles
      if (error || !data || data.length === 0) {
        const altQuery = await client.from('procedimientos').select('*').limit(500);
        if (!altQuery.error && altQuery.data && altQuery.data.length > 0) {
          data = altQuery.data;
          error = null;
        }
      }

      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          cpms: String(p.cpms || p.codigo || '').replace(/\./g, '').trim(),
          descripcion: String(p.descripcion || p.nombre || '').trim(),
          estrategia_sis: p.estrategia_sis || p.estrategia,
          condicion: p.condicion,
        }));
      }
    } catch (err) {
      console.warn('Error al obtener pac_procedimientos de Supabase:', err);
    }
    return null;
  },

  // 11. PROGRAMACION DE TURNOS POR FECHA (cv_configuracion y/o cv_turnos_programados)
  async getTurnosProgramados(): Promise<{
    turnos: AsignacionTurnoDia[];
    consultoriosPorProf?: Record<string, string>;
  } | null> {
    const client = getSupabase();
    if (!client) return null;

    const parsePayload = (
      raw: any
    ): { turnos: AsignacionTurnoDia[]; consultoriosPorProf?: Record<string, string> } | null => {
      if (raw == null) return null;
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          return { turnos: parsed as AsignacionTurnoDia[] };
        }
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.turnos)) {
          return {
            turnos: parsed.turnos as AsignacionTurnoDia[],
            consultoriosPorProf:
              parsed.consultoriosPorProf && typeof parsed.consultoriosPorProf === 'object'
                ? parsed.consultoriosPorProf
                : undefined,
          };
        }
      } catch {
        return null;
      }
      return null;
    };

    try {
      const { data: rows, error } = await client.from('cv_configuracion').select('*').limit(100);
      if (!error && Array.isArray(rows)) {
        const keyCols = ['clave', 'key', 'nombre', 'parametro', 'codigo'];
        const valCols = ['valor', 'valor_json', 'datos', 'config', 'value', 'contenido', 'turnos_programados'];

        const matchingRow = rows.find((r: any) =>
          keyCols.some((kc) => String(r?.[kc] || '').trim() === 'programacion_turnos_mensual')
        );
        if (matchingRow) {
          for (const vc of valCols) {
            const parsed = parsePayload(matchingRow[vc]);
            if (parsed) return parsed;
          }
        }

        // Si es una tabla de configuración de una sola fila (con columna turnos_programados)
        for (const r of rows) {
          const parsed = parsePayload((r as any)?.turnos_programados);
          if (parsed) return parsed;
        }
      }
    } catch (err) {
      console.warn('No se pudo leer programación de turnos desde cv_configuracion:', err);
    }

    // Fallback: tabla dedicada cv_turnos_programados si el usuario la creó
    try {
      const { data: tRows, error: tErr } = await client
        .from('cv_turnos_programados')
        .select('*')
        .limit(100);
      if (!tErr && Array.isArray(tRows) && tRows.length > 0) {
        const cfgRow = tRows.find((r: any) => r.clave === 'programacion_turnos_mensual' || r.datos);
        if (cfgRow) {
          const parsed = parsePayload(cfgRow.datos ?? cfgRow.valor ?? cfgRow.turnos);
          if (parsed) return parsed;
        }
      }
    } catch {
      // Tabla opcional
    }

    return null;
  },

  async saveTurnosProgramados(
    turnos: AsignacionTurnoDia[],
    consultoriosPorProf?: Record<string, string>
  ): Promise<{ ok: boolean; error?: string; needsSql?: boolean }> {
    const client = getSupabase();
    if (!client) return { ok: false, error: 'Supabase no está configurado.' };

    const payloadObj =
      consultoriosPorProf && Object.keys(consultoriosPorProf).length > 0
        ? { turnos, consultoriosPorProf }
        : turnos;
    const serialized = JSON.stringify(payloadObj);

    const keyCols = ['clave', 'key', 'nombre', 'parametro', 'codigo'];
    const valCols = ['valor', 'valor_json', 'datos', 'config', 'value', 'contenido', 'turnos_programados'];
    const jsonPreferredCols = new Set(['valor_json', 'datos', 'config', 'turnos_programados']);

    let lastError: any = null;

    try {
      // 1. Leer filas existentes de cv_configuracion para detectar columnas reales y evitar ON CONFLICT
      const { data: rows, error: readErr } = await client.from('cv_configuracion').select('*').limit(50);

      if (readErr) {
        const rlsCheck = formatSupabaseWriteError('cv_configuracion', readErr, '');
        if (rlsCheck.isRls) {
          return { ok: false, error: rlsCheck.message, needsSql: true };
        }
        lastError = readErr;
      } else if (Array.isArray(rows)) {
        const sampleCols = rows[0] ? Object.keys(rows[0]) : [];
        const detectedKeyCol = keyCols.find((kc) => sampleCols.includes(kc));
        const detectedValCols = valCols.filter((vc) => sampleCols.includes(vc));

        const matchingRow = rows.find((r: any) =>
          keyCols.some((kc) => String(r?.[kc] || '').trim() === 'programacion_turnos_mensual')
        );

        const tryWriteValue = async (
          mode: 'update' | 'insert',
          keyCol: string,
          valCol: string,
          matchCol?: string,
          matchVal?: any
        ): Promise<{ ok: boolean; rlsErr?: string; error?: any }> => {
          const candidates = jsonPreferredCols.has(valCol)
            ? [payloadObj, serialized]
            : [serialized, payloadObj];

          for (const val of candidates) {
            const body: Record<string, any> =
              mode === 'insert'
                ? { [keyCol]: 'programacion_turnos_mensual', [valCol]: val }
                : { [valCol]: val };

            const query =
              mode === 'insert'
                ? client.from('cv_configuracion').insert([body])
                : client.from('cv_configuracion').update(body).eq(matchCol!, matchVal);

            const { error } = await query;
            if (!error) return { ok: true };

            const rls = formatSupabaseWriteError('cv_configuracion', error, '');
            if (rls.isRls) return { ok: false, rlsErr: rls.message };
            lastError = error;

            const missing = extractMissingSchemaColumn(error);
            if (missing) break; // columna no existe, probar siguiente columna
          }
          return { ok: false, error: lastError };
        };

        // Caso A: La fila ya existe en cv_configuracion -> UPDATE directo sin ON CONFLICT
        if (matchingRow) {
          const matchCol =
            'id' in matchingRow && matchingRow.id != null
              ? 'id'
              : keyCols.find((kc) => String(matchingRow[kc] || '').trim() === 'programacion_turnos_mensual') || 'clave';
          const matchVal = matchingRow[matchCol];
          const colsToTry = detectedValCols.length > 0 ? detectedValCols : valCols;

          for (const vc of colsToTry) {
            const res = await tryWriteValue('update', matchCol, vc, matchCol, matchVal);
            if (res.ok) return { ok: true };
            if (res.rlsErr) return { ok: false, error: res.rlsErr, needsSql: true };
          }
        }

        // Caso B: La tabla tiene filas sin columna clave (ej. tabla 1 fila de establecimiento con turnos_programados)
        if (!matchingRow && rows.length > 0 && !detectedKeyCol) {
          const rowTarget = rows[0];
          const idCol = 'id' in rowTarget ? 'id' : Object.keys(rowTarget)[0];
          const singleRowValCols = ['turnos_programados', 'valor_json', 'datos', 'config'].filter((c) =>
            sampleCols.includes(c)
          );
          for (const vc of singleRowValCols) {
            const res = await tryWriteValue('update', idCol, vc, idCol, rowTarget[idCol]);
            if (res.ok) return { ok: true };
            if (res.rlsErr) return { ok: false, error: res.rlsErr, needsSql: true };
          }
        }

        // Caso C: Insertar nueva fila en cv_configuracion
        if (!matchingRow) {
          const keyCandidates = detectedKeyCol ? [detectedKeyCol] : ['clave', 'key', 'nombre'];
          const valCandidates = detectedValCols.length > 0 ? detectedValCols : ['valor', 'valor_json', 'datos', 'value'];

          for (const kc of keyCandidates) {
            for (const vc of valCandidates) {
              const res = await tryWriteValue('insert', kc, vc);
              if (res.ok) return { ok: true };
              if (res.rlsErr) return { ok: false, error: res.rlsErr, needsSql: true };
            }
          }
        }
      }
    } catch (err: any) {
      lastError = err;
    }

    // 2. Fallback: intentar tabla dedicada cv_turnos_programados (por si existe en BD)
    try {
      const { data: existingT, error: errT } = await client
        .from('cv_turnos_programados')
        .select('*')
        .eq('clave', 'programacion_turnos_mensual')
        .maybeSingle();

      if (!errT) {
        const writeRes = existingT
          ? await client
              .from('cv_turnos_programados')
              .update({ datos: payloadObj })
              .eq('clave', 'programacion_turnos_mensual')
          : await client
              .from('cv_turnos_programados')
              .insert([{ clave: 'programacion_turnos_mensual', datos: payloadObj }]);
        if (!writeRes.error) return { ok: true };
        lastError = writeRes.error;
      }
    } catch {
      // Tabla opcional no creada aún
    }

    const msg = formatSupabaseWriteError(
      'cv_configuracion',
      lastError,
      'La tabla cv_configuracion en Supabase no tiene columnas compatibles (clave/valor o turnos_programados) o tiene escritura bloqueada por RLS.'
    ).message;
    console.warn('No se pudo guardar programación de turnos en Supabase:', lastError || msg);
    return { ok: false, error: msg, needsSql: true };
  },
};
