export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE' | 'INDOCUMENTADO';

export type Sexo = 'M' | 'F';

export type EstadoPaciente = 'activo' | 'inactivo';

export type TipoSeguro = 'SIS' | 'ESSALUD' | 'EPS' | 'PRIVADO' | 'NINGUNO' | 'OTRO';

export type PrioridadTriaje = 'ROJO' | 'AMARILLO' | 'VERDE' | 'AZUL';

export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'ATENDIDA' | 'CANCELADA' | 'NO_SHOW';

export type EstadoTriaje = 'EN_ESPERA' | 'LLAMADO' | 'ATENDIDO';

export type RolUsuario = 'administrador' | 'medico' | 'psicologo' | 'enfermero' | 'admision' | 'general';

export type ModuleId =
  | 'dashboard'
  | 'pacientes'
  | 'ficha_paciente'
  | 'fua'
  | 'agenda'
  | 'triaje'
  | 'atencion'
  | 'display_turnos'
  | 'profesionales'
  | 'programacion_turnos'
  | 'programacion_anual'
  | 'reportes'
  | 'gestion_usuarios';

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  icon: string;
  description: string;
}

export interface Usuario {
  id: string;
  usuario: string;
  contrasena?: string;
  nombres: string;
  apellidos: string;
  rol: RolUsuario;
  correo?: string;
  telefono?: string;
  estado: 'activo' | 'inactivo';
  permisosModulos: ModuleId[];
  ultimoAcceso?: string;
  fechaCreacion: string;
}

export interface Paciente {
  id: string;
  tipo_documento: TipoDocumento;
  numero_documento?: string;
  codigo_temporal?: string;
  hcl?: string;
  apellidos_nombres: string;
  fecha_nacimiento?: string;
  sexo?: Sexo;
  edad?: number;
  estado_civil?: string;
  grado_instruccion?: string;
  seguro?: TipoSeguro;
  seguro_otro_especificar?: string;
  direccion?: string;
  distrito?: string;
  distrito_otro_especificar?: string;
  celular?: string;
  estado: EstadoPaciente;
  fecha_ingreso: string;
  etnia?: string;
  origen_caso?: string;
  // Tutor
  tiene_tutor?: boolean;
  tutor_nombres?: string;
  tutor_tipo_documento?: string;
  tutor_numero_documento?: string;
  tutor_celular?: string;
  tutor_direccion?: string;
  tutor_parentesco?: string;
}

export type TipoProfesion =
  | 'PSICOLOGO'
  | 'PSIQUIATRA'
  | 'TRABAJADOR_SOCIAL'
  | 'ENFERMERO'
  | 'MEDICO'
  | 'TERAPEUTA_OCUPACIONAL'
  | 'TERAPEUTA_LENGUAJE'
  | 'FARMACEUTICO'
  | 'ADMISION_SOPORTE'
  | 'OTRO';

export interface Profesional {
  id: string;
  dni?: string;
  apellidos_nombres: string;
  profesion: TipoProfesion | string;
  especialidad?: string;
  colegiatura?: string;
  telefono?: string;
  correo?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  consultorioAsignado?: string;
  turnoHabitual?: 'MAÑANA' | 'TARDE' | 'ROTATIVO';
  diasTurno?: string[];
}

export interface Cita {
  id: string;
  paciente_id: string;
  profesional_id?: string;
  consultorio_id?: string;
  fecha_cita: string;
  hora_cita: string;
  tipo_cita: 'CONSULTA' | 'TRIAJE' | 'EMERGENCIA' | 'TELECONSULTA' | 'VISITA_DOMICILIARIA';
  estado: EstadoCita;
  motivo_consulta?: string;
  observaciones?: string;
  triaje_completado?: boolean;
  atencion_completada?: boolean;
  llamado_pantalla?: boolean;
}

export interface Triaje {
  id: string;
  cita_id?: string;
  paciente_id: string;
  profesional_id?: string;
  consultorio_id: string;
  fecha: string;
  hora_llegada: string;
  hora_llamado?: string;
  hora_fin_atencion?: string;
  estado: EstadoTriaje;
  peso?: number;
  talla?: number;
  presion_arterial?: string;
  imc?: number;
  frecuencia_cardiaca?: number;
  frecuencia_respiratoria?: number;
  temperatura?: number;
  spo2?: number;
  clasificacion_riesgo: PrioridadTriaje;
  motivo_consulta: string;
}

export interface MedicamentoPrescrito {
  id?: string;
  codigo_sismed?: string;
  nombre?: string;
  medicamento?: string;
  concentracion?: string;
  presentacion?: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidad?: number;
  indicaciones?: string;
}

export interface AtencionClinica {
  id: string;
  paciente_id: string;
  cita_id?: string;
  triaje_id?: string;
  profesional_id?: string;
  consultorio_id?: string;
  fecha_atencion: string;
  hora_atencion: string;
  peso?: string;
  talla?: string;
  presion_arterial?: string;
  imc?: string;
  temperatura?: string;
  saturacion_o2?: string;
  frecuencia_cardiaca?: string;
  frecuencia_respiratoria?: string;
  motivo_consulta: string;
  examen_mental: string;
  diagnostico_1: string;
  cie10_1: string;
  diagnostico_2?: string;
  cie10_2?: string;
  diagnostico_3?: string;
  cie10_3?: string;
  procedimientos?: string;
  escala_gad7?: number;
  escala_phq9?: number;
  riesgo_suicida?: 'NO_EVALUADO' | 'NINGUNO' | 'BAJO' | 'MEDIO' | 'ALTO';
  plan_tratamiento?: string;
  recomendaciones?: string;
  proxima_cita_fecha?: string;
  medicamentos?: MedicamentoPrescrito[];
  finaliza_proceso?: boolean;
  fua_generado?: boolean;
  fua_id?: string;
  estado: 'COMPLETADA';
}

export interface Consultorio {
  id: string;
  codigo: string;
  nombre: string;
  servicio_tipo?:
    | 'TRIAJE'
    | 'PSICOLOGIA'
    | 'TERAPIA_OCUPACIONAL'
    | 'TERAPIA_LENGUAJE'
    | 'TRABAJO_SOCIAL'
    | 'MEDICINA'
    | 'PSIQUIATRIA'
    | 'SOPORTE';
  profesional_id?: string;
  profesional_nombre?: string;
  profesional_tarde_id?: string;
  profesional_tarde_nombre?: string;
  piso?: string;
  activo: boolean;
  color?: string;
}

export interface DatosProgramacionMes {
  mesNumero: number;
  mesNombre: string;
  citasProgramadas: number;
  pacientesAtendidos: number;
  pacientesNoAsistieron: number;
  porcentajeCumplimiento: number;
  desgloseSeguro: {
    SIS: number;
    ESSALUD: number;
    EPS: number;
    PRIVADO: number;
    NINGUNO: number;
    OTRO: number;
  };
  totalPorSeguro: number;
}

export type TipoDiagnostico = 'PRESUNTIVO' | 'DEFINITIVO' | 'REPETIDO';

export interface CIE10Item {
  codigo: string;
  descripcion: string;
  tipo?: TipoDiagnostico;
}

export interface MedicamentoReceta {
  id: string;
  medicamento: string;
  presentacion: string;
  concentracion: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidad: number;
  indicaciones?: string;
}

export interface FuaConfig {
  codigo_renipress: string;
  anio: number;
  rango_maximo: number;
  ultimo_numero: number;
  nombre_ipress: string;
}

export interface FUA {
  id: string;
  numero_fua: string;
  fecha: string;
  hora: string;
  paciente_id: string;
  codigo_renaes: string;
  diresa: string;
  establecimiento: string;
  componente_sis: 'SUBSIDIADO' | 'SEMISUBSIDIADO';
  codigo_afiliacion_sis: string;
  tipo_atencion: 'AMBULATORIA' | 'EMERGENCIA' | 'REFERENCIA';
  codigo_prestacional: '056' | '065' | '071' | '011';
  profesional_id: string;
  triaje_id?: string;
  atencion_id?: string;
  presion_arterial?: string;
  frecuencia_cardiaca?: number;
  frecuencia_respiratoria?: number;
  peso_kg?: number;
  talla_cm?: number;
  imc?: number;
  diagnosticos: Array<{
    codigo: string;
    descripcion: string;
    tipo: 'I' | 'D' | 'R' | 'P';
    tipo_ingreso?: 'P' | 'D' | 'R';
    cie_ingreso?: string;
    tipo_egreso?: 'D' | 'R';
    cie_egreso?: string;
  }>;
  medicamentos: Array<{
    codigo_sismed: string;
    descripcion: string;
    cantidad: number;
    indicacion: string;
    forma_farmaceutica?: string;
    concentracion?: string;
    cantidad_prescrita?: number;
    cantidad_entregada?: number;
    diagnostico_relacionado?: string;
  }>;
  procedimientos?: Array<{
    cpms: string;
    descripcion: string;
    ind?: string;
    eje?: string;
    dx?: string;
    res?: string;
  }>;
  observaciones?: string;
  estado: 'REGISTRADO' | 'ENVIADO_SIS' | 'APROBADO' | 'OBSERVADO';
  renaiess?: string;
  anio_fua?: number;
  correlativo?: string | number;
  personal_atiende?: 'IPRESS' | 'ITINERANTE' | 'AISPED';
  lugar_atencion?: 'INTRAMURAL' | 'EXTRAMURAL';
  atencion_directa?: boolean;
  destino?: 'ALTA' | 'CITA' | 'HOSPITALIZACION' | 'CONTRAREFERIDO' | 'FALLECIDO' | 'CORTE_ADMIN';
  destino_referido?: 'EMERGENCIA' | 'CONSULTA_EXTERNA' | 'APOYO_DIAGNOSTICO';
  ref_cod_renipress?: string;
  ref_nombre_ipress?: string;
  ref_nro_hoja?: string;
}
