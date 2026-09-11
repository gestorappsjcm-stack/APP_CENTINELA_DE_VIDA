import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { Paciente, Cita, Triaje, AtencionClinica, Profesional, Usuario, FUA } from '../types';

export interface SupabaseDashboardStats {
  totalPacientes?: number;
  atencionesHoy?: number;
  citasPendientes?: number;
  profesionalesActivos?: number;
  citasHoy?: number;
  citasPorAtender?: number;
}

export const supabaseService = {
  // Test de conexión
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
      // Intentar leer de v_cv_dashboard_resumen o cv_configuracion o cv_pacientes
      const { data, error } = await client.from('v_cv_dashboard_resumen').select('*').limit(1);
      if (!error) {
        return { connected: true, message: 'Conectado a Supabase (Vista v_cv_dashboard_resumen activa)', details: data };
      }

      // Probar cv_pacientes si la vista no tiene datos o permisos
      const { data: pacData, error: pacError } = await client.from('cv_pacientes').select('id').limit(1);
      if (!pacError) {
        return { connected: true, message: 'Conectado a Supabase (Tabla cv_pacientes activa)', details: pacData };
      }

      // Si hay error en ambas
      return {
        connected: false,
        message: `Error al consultar Supabase: ${error?.message || pacError?.message}`,
        details: { error, pacError },
      };
    } catch (err: any) {
      return { connected: false, message: `Fallo de red o configuración: ${err?.message || err}` };
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
      const { data, error } = await client.from('cv_pacientes').select('*').order('apellidos_nombres', { ascending: true });
      if (error) {
        // Intentar tabla pac_datos_personales como alternativa
        const { data: altData, error: altErr } = await client.from('pac_datos_personales').select('*');
        if (!altErr && altData) {
          return altData.map((p: any) => ({
            id: p.id ? String(p.id) : `pac-${Date.now()}`,
            tipo_documento: p.tipo_documento || 'DNI',
            numero_documento: p.numero_documento || p.dni || '',
            codigo_temporal: p.codigo_temporal || '',
            hcl: p.hcl || p.historia_clinica || '',
            apellidos_nombres: p.apellidos_nombres || `${p.apellidos || ''} ${p.nombres || ''}`.trim(),
            fecha_nacimiento: p.fecha_nacimiento || '',
            sexo: p.sexo || 'M',
            edad: p.edad || 0,
            seguro: p.seguro || p.tipo_seguro || 'SIS',
            direccion: p.direccion || '',
            distrito: p.distrito || 'Chincha Alta',
            celular: p.celular || p.telefono || '',
            estado: p.estado || 'activo',
            fecha_ingreso: p.fecha_ingreso || new Date().toISOString().split('T')[0],
          }));
        }
        return null;
      }

      if (data) {
        return data.map((p: any) => ({
          id: String(p.id),
          tipo_documento: p.tipo_documento || 'DNI',
          numero_documento: p.numero_documento || '',
          codigo_temporal: p.codigo_temporal || '',
          hcl: p.hcl || '',
          apellidos_nombres: p.apellidos_nombres || '',
          fecha_nacimiento: p.fecha_nacimiento || '',
          sexo: p.sexo || 'M',
          edad: p.edad || 0,
          estado_civil: p.estado_civil || 'Soltero(a)',
          grado_instruccion: p.grado_instruccion || 'Secundaria',
          seguro: p.seguro || 'SIS',
          direccion: p.direccion || '',
          distrito: p.distrito || 'Chincha Alta',
          celular: p.celular || '',
          estado: p.estado || 'activo',
          fecha_ingreso: p.fecha_ingreso || new Date().toISOString().split('T')[0],
          tiene_tutor: Boolean(p.tiene_tutor),
          tutor_nombres: p.tutor_nombres || '',
          tutor_celular: p.tutor_celular || '',
          tutor_parentesco: p.tutor_parentesco || '',
        }));
      }
    } catch (err) {
      console.warn('Error al obtener pacientes de Supabase:', err);
    }
    return null;
  },

  async insertPaciente(paciente: Paciente): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_pacientes').insert([
        {
          id: paciente.id,
          tipo_documento: paciente.tipo_documento,
          numero_documento: paciente.numero_documento,
          codigo_temporal: paciente.codigo_temporal,
          hcl: paciente.hcl,
          apellidos_nombres: paciente.apellidos_nombres,
          fecha_nacimiento: paciente.fecha_nacimiento,
          sexo: paciente.sexo,
          edad: paciente.edad,
          estado_civil: paciente.estado_civil,
          grado_instruccion: paciente.grado_instruccion,
          seguro: paciente.seguro,
          direccion: paciente.direccion,
          distrito: paciente.distrito,
          celular: paciente.celular,
          estado: paciente.estado,
          fecha_ingreso: paciente.fecha_ingreso,
          tiene_tutor: paciente.tiene_tutor,
          tutor_nombres: paciente.tutor_nombres,
          tutor_celular: paciente.tutor_celular,
          tutor_parentesco: paciente.tutor_parentesco,
        },
      ]);
      return !error;
    } catch (err) {
      console.warn('Error insertando paciente en Supabase:', err);
      return false;
    }
  },

  async updatePaciente(id: string, data: Partial<Paciente>): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_pacientes').update(data).eq('id', id);
      return !error;
    } catch (err) {
      console.warn('Error actualizando paciente en Supabase:', err);
      return false;
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
      const { data, error } = await client.from('cv_citas').select('*').order('fecha_cita', { ascending: false });
      if (!error && data) {
        return data.map((c: any) => ({
          id: String(c.id),
          paciente_id: String(c.paciente_id),
          profesional_id: c.profesional_id ? String(c.profesional_id) : undefined,
          fecha_cita: c.fecha_cita,
          hora_cita: c.hora_cita,
          tipo_cita: c.tipo_cita || 'CONSULTA',
          estado: c.estado || 'PENDIENTE',
          motivo_consulta: c.motivo_consulta,
          observaciones: c.observaciones,
          triaje_completado: Boolean(c.triaje_completado),
          atencion_completada: Boolean(c.atencion_completada),
        }));
      }
    } catch (err) {
      console.warn('Error al obtener citas de Supabase:', err);
    }
    return null;
  },

  async insertCita(cita: Cita): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_citas').insert([cita]);
      return !error;
    } catch (err) {
      console.warn('Error insertando cita en Supabase:', err);
      return false;
    }
  },

  async updateCita(id: string, data: Partial<Cita>): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_citas').update(data).eq('id', id);
      return !error;
    } catch (err) {
      console.warn('Error actualizando cita en Supabase:', err);
      return false;
    }
  },

  // 4. ATENCIONES: cv_atenciones y vista v_cv_atenciones_hoy
  async getAtenciones(): Promise<AtencionClinica[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await client.from('cv_atenciones').select('*').order('fecha_atencion', { ascending: false });
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
          medicamentos: a.medicamentos || a.receta_medicamentos || [],
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
      const { data, error } = await client.from('cv_triajes').select('*').order('fecha', { ascending: false });
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
      const { data, error } = await client.from('cv_profesionales').select('*').order('apellidos_nombres', { ascending: true });
      if (!error && data) {
        return data.map((pr: any) => ({
          id: String(pr.id),
          dni: pr.dni || '',
          apellidos_nombres: pr.apellidos_nombres || '',
          profesion: pr.profesion || 'MEDICO',
          especialidad: pr.especialidad || '',
          colegiatura: pr.colegiatura || '',
          telefono: pr.telefono || '',
          correo: pr.correo || '',
          estado: pr.estado || 'ACTIVO',
          consultorioAsignado: pr.consultorioAsignado || pr.consultorio_id,
        }));
      }
    } catch (err) {
      console.warn('Error al obtener profesionales de Supabase:', err);
    }
    return null;
  },

  // 7. USUARIOS: cv_usuarios
  async getUsuarios(): Promise<Usuario[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
      const { data, error } = await client.from('cv_usuarios').select('*');
      if (!error && data) {
        return data.map((u: any) => ({
          id: String(u.id),
          usuario: u.usuario,
          contrasena: u.contrasena || u.password,
          nombres: u.nombres || '',
          apellidos: u.apellidos || '',
          rol: u.rol || 'general',
          correo: u.correo,
          telefono: u.telefono,
          estado: u.estado || 'activo',
          permisosModulos: Array.isArray(u.permisosModulos || u.permisos_modulos)
            ? (u.permisosModulos || u.permisos_modulos)
            : ['dashboard', 'pacientes', 'atencion'],
          ultimoAcceso: u.ultimoAcceso || u.ultimo_acceso,
          fechaCreacion: u.fechaCreacion || u.fecha_creacion || new Date().toISOString().split('T')[0],
        }));
      }
    } catch (err) {
      console.warn('Error al obtener usuarios de Supabase:', err);
    }
    return null;
  },

  async insertUsuario(usuario: Usuario): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const payload = {
        id: usuario.id,
        usuario: usuario.usuario,
        contrasena: usuario.contrasena || '123456',
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        correo: usuario.correo || null,
        telefono: usuario.telefono || null,
        estado: usuario.estado,
        permisos_modulos: usuario.permisosModulos,
        fecha_creacion: usuario.fechaCreacion,
        ultimo_acceso: usuario.ultimoAcceso || null,
      };
      const { error } = await client.from('cv_usuarios').insert([payload]);
      if (error) {
        console.warn('Error insertando en cv_usuarios:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Excepción insertando en cv_usuarios:', err);
      return false;
    }
  },

  async updateUsuario(id: string, data: Partial<Usuario>): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const payload: Record<string, any> = {};
      if (data.usuario !== undefined) payload.usuario = data.usuario;
      if (data.contrasena !== undefined) payload.contrasena = data.contrasena;
      if (data.nombres !== undefined) payload.nombres = data.nombres;
      if (data.apellidos !== undefined) payload.apellidos = data.apellidos;
      if (data.rol !== undefined) payload.rol = data.rol;
      if (data.correo !== undefined) payload.correo = data.correo;
      if (data.telefono !== undefined) payload.telefono = data.telefono;
      if (data.estado !== undefined) payload.estado = data.estado;
      if (data.permisosModulos !== undefined) payload.permisos_modulos = data.permisosModulos;
      if (data.ultimoAcceso !== undefined) payload.ultimo_acceso = data.ultimoAcceso;

      const { error } = await client.from('cv_usuarios').update(payload).eq('id', id);
      return !error;
    } catch (err) {
      console.warn('Error actualizando en cv_usuarios:', err);
      return false;
    }
  },

  async deleteUsuario(id: string): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('cv_usuarios').delete().eq('id', id);
      return !error;
    } catch (err) {
      console.warn('Error eliminando en cv_usuarios:', err);
      return false;
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
      const { data, error } = await client.from('cv_fua_historial').select('*').order('fecha', { ascending: false });
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
      const { error } = await client.from('cv_fua_historial').insert([fua]);
      return !error;
    } catch (err) {
      console.warn('Error insertando FUA en Supabase:', err);
      return false;
    }
  },
};
