import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Paciente, TipoDocumento, TipoSeguro } from '../../types';
import {
  X,
  Search,
  Check,
  AlertTriangle,
  UserPlus,
  ShieldAlert,
  AlertCircle,
  Loader2,
  ExternalLink,
  Calendar,
  FileText,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { DISTRITOS_CHINCHA } from '../../lib/distritosHelper';
import {
  buscarConflictoPaciente,
  calcularEdadDesdeFecha,
  calcularSiguienteHcl,
} from '../../lib/pacientesHelper';

export const ModalRegistrarPaciente: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    addPaciente,
    pacientes,
    setCurrentTab,
    setSelectedPacienteFichaId,
    currentUser,
    isDeveloperMode,
    canAccess,
  } = useApp();
  const isDeveloper = isDeveloperMode || currentUser.rol === 'desarrollador';

  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>('DNI');
  const [numDoc, setNumDoc] = useState('');
  const [codigoTemporal, setCodigoTemporal] = useState('');
  const [apellidosNombres, setApellidosNombres] = useState('');
  const [hcl, setHcl] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [edad, setEdad] = useState<number | ''>('');
  const [sexo, setSexo] = useState<'M' | 'F' | ''>('');
  const [estadoCivil, setEstadoCivil] = useState('SOLTERO');
  const [gradoInstruccion, setGradoInstruccion] = useState('SECUNDARIA');
  const [seguro, setSeguro] = useState<TipoSeguro>('SIS');
  const [seguroOtro, setSeguroOtro] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('CHINCHA ALTA');
  const [distritoOtro, setDistritoOtro] = useState('');
  const [celular, setCelular] = useState('');

  // Tutor
  const [tieneTutor, setTieneTutor] = useState(false);
  const [tutorNombres, setTutorNombres] = useState('');
  const [tutorTipoDoc, setTutorTipoDoc] = useState('DNI');
  const [tutorNumDoc, setTutorNumDoc] = useState('');
  const [tutorCelular, setTutorCelular] = useState('');
  const [tutorParentesco, setTutorParentesco] = useState('PADRE');
  const [isSearchingTutorDNI, setIsSearchingTutorDNI] = useState(false);
  const [tutorSearchStatus, setTutorSearchStatus] = useState<'found' | 'not_found' | null>(null);

  // Estados de validación del paciente
  const [isSearchingDNI, setIsSearchingDNI] = useState(false);
  const [dniSearchStatus, setDniSearchStatus] = useState<'found' | 'not_found' | null>(null);
  const [pacienteExistente, setPacienteExistente] = useState<Paciente | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const hclEditadoRef = useRef(false);

  const resetFormFields = (keepSuccessMessage = false) => {
    setTipoDoc('DNI');
    setNumDoc('');
    setCodigoTemporal('');
    setApellidosNombres('');
    setHcl(calcularSiguienteHcl(pacientes));
    hclEditadoRef.current = false;
    setFechaNacimiento('');
    setEdad('');
    setSexo('');
    setEstadoCivil('SOLTERO');
    setGradoInstruccion('SECUNDARIA');
    setSeguro('SIS');
    setSeguroOtro('');
    setDireccion('');
    setDistrito('CHINCHA ALTA');
    setDistritoOtro('');
    setCelular('');
    setTieneTutor(false);
    setTutorNombres('');
    setTutorTipoDoc('DNI');
    setTutorNumDoc('');
    setTutorCelular('');
    setTutorParentesco('PADRE');
    setIsSearchingDNI(false);
    setDniSearchStatus(null);
    setIsSearchingTutorDNI(false);
    setTutorSearchStatus(null);
    setPacienteExistente(null);
    setDuplicateWarning(null);
    setFormError(null);
    if (!keepSuccessMessage) {
      setFormSuccess(null);
    }
    setIsSaving(false);
  };

  // Reiniciar el formulario cada vez que se abre el modal de registro y calcular siguiente HCL
  useEffect(() => {
    if (activeModal !== 'registrarPaciente') return;
    resetFormFields(false);

    if (!isSupabaseConfigured()) return;
    let active = true;
    const localNext = parseInt(calcularSiguienteHcl(pacientes), 10) || 100;
    supabaseService.getSiguienteHcl().then((remoteNext) => {
      if (!active || !remoteNext || hclEditadoRef.current) return;
      const remoteNum = parseInt(remoteNext, 10);
      const bestNext = Number.isFinite(remoteNum) ? String(Math.max(remoteNum, localNext)) : String(localNext);
      setHcl(bestNext);
    });

    return () => {
      active = false;
    };
  }, [activeModal]);

  useEffect(() => {
    if (activeModal !== 'registrarPaciente' || formSuccess) return;
    if (tipoDoc === 'INDOCUMENTADO') {
      const now = new Date();
      const fechaStr =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 900) + 100;
      setCodigoTemporal(`IND-${fechaStr}-${random}`);
      setNumDoc('');
    } else {
      setCodigoTemporal('');
    }
    verificarDuplicado();
  }, [tipoDoc, numDoc, hcl, activeModal, formSuccess, pacientes]);

  // Cálculo automático de edad
  const handleFechaNacimientoChange = (fecha: string) => {
    setFechaNacimiento(fecha);
    const calculada = calcularEdadDesdeFecha(fecha);
    setEdad(typeof calculada === 'number' ? calculada : '');
  };

  // Búsqueda real de identidad en la base de datos (tabla pac_datos_personales)
  const buscarDNIInterno = async () => {
    if (tipoDoc !== 'DNI' || numDoc.trim().length !== 8) return;
    setIsSearchingDNI(true);
    setDniSearchStatus(null);

    try {
      const persona = await supabaseService.buscarPersonaPorDni(numDoc);
      if (persona && persona.apellidos_nombres) {
        setApellidosNombres(persona.apellidos_nombres);
        if (persona.fecha_nacimiento) {
          handleFechaNacimientoChange(persona.fecha_nacimiento);
        }
        if (persona.sexo) {
          setSexo(persona.sexo);
        }
        setDniSearchStatus('found');
      } else {
        // No inventar datos ficticios: indicar no encontrado y pedir ingreso manual
        setDniSearchStatus('not_found');
      }
    } catch (e) {
      console.warn('Error al buscar DNI:', e);
      setDniSearchStatus('not_found');
    } finally {
      setIsSearchingDNI(false);
    }
  };

  // Búsqueda real de identidad del tutor en pac_datos_personales
  const buscarTutorDNIInterno = async () => {
    if (tutorNumDoc.trim().length !== 8) return;
    setIsSearchingTutorDNI(true);
    setTutorSearchStatus(null);

    try {
      const persona = await supabaseService.buscarPersonaPorDni(tutorNumDoc.trim());
      if (persona && persona.apellidos_nombres) {
        setTutorNombres(persona.apellidos_nombres);
        setTutorSearchStatus('found');
      } else {
        setTutorSearchStatus('not_found');
      }
    } catch (e) {
      console.warn('Error al buscar DNI del tutor:', e);
      setTutorSearchStatus('not_found');
    } finally {
      setIsSearchingTutorDNI(false);
    }
  };

  // Verificar si ya existe en el padrón (por Documento o por HCL en cualquier tipo de documento)
  const verificarDuplicado = () => {
    setDuplicateWarning(null);
    setPacienteExistente(null);

    const docAConsultar = tipoDoc !== 'INDOCUMENTADO' && numDoc.trim().length >= 4 ? numDoc.trim() : '';
    const hclAConsultar = hcl.trim().length > 0 ? hcl.trim() : '';
    if (!docAConsultar && !hclAConsultar) return;

    const conflicto = buscarConflictoPaciente(
      {
        tipo_documento: tipoDoc,
        numero_documento: docAConsultar,
        hcl: hclAConsultar,
      },
      pacientes
    );

    if (conflicto) {
      setDuplicateWarning(
        `REGISTRO DE PACIENTE YA EXISTE (${conflicto.field === 'hcl' ? 'HCL DUPLICADA' : 'DOCUMENTO DUPLICADO'}) - CONTINUE CON LA CONSULTA O CITA`
      );
      setPacienteExistente(conflicto.existing);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);
    setFormSuccess(null);

    if (duplicateWarning) {
      setFormError('No se puede guardar: el paciente ya se encuentra registrado.');
      return;
    }

    if (!apellidosNombres.trim()) {
      setFormError('Los apellidos y nombres son obligatorios.');
      return;
    }

    if (tipoDoc === 'INDOCUMENTADO' && !hcl.trim()) {
      setFormError('Para pacientes indocumentados, el número de HCL es OBLIGATORIO.');
      return;
    }

    if (distrito === 'OTRO' && !distritoOtro.trim()) {
      setFormError('Por favor especifique el distrito o lugar de procedencia del paciente.');
      return;
    }

    setIsSaving(true);
    const res = await addPaciente({
      tipo_documento: tipoDoc,
      numero_documento: tipoDoc !== 'INDOCUMENTADO' ? numDoc.trim() : undefined,
      codigo_temporal: tipoDoc === 'INDOCUMENTADO' ? codigoTemporal : undefined,
      hcl: hcl.trim() || undefined,
      apellidos_nombres: apellidosNombres.trim().toUpperCase(),
      fecha_nacimiento: fechaNacimiento || undefined,
      edad: typeof edad === 'number' ? edad : undefined,
      sexo: sexo || undefined,
      estado_civil: estadoCivil,
      grado_instruccion: gradoInstruccion,
      seguro: seguro,
      seguro_otro_especificar: seguro === 'OTRO' ? seguroOtro : undefined,
      direccion: direccion.trim() || undefined,
      distrito: distrito,
      distrito_otro_especificar: distrito === 'OTRO' ? distritoOtro.trim().toUpperCase() : undefined,
      celular: celular.trim() || undefined,
      estado: 'activo',
      tiene_tutor: tieneTutor,
      tutor_nombres: tieneTutor ? tutorNombres.trim().toUpperCase() : undefined,
      tutor_tipo_documento: tieneTutor ? tutorTipoDoc : undefined,
      tutor_numero_documento: tieneTutor ? tutorNumDoc.trim() : undefined,
      tutor_celular: tieneTutor ? tutorCelular.trim() : undefined,
      tutor_parentesco: tieneTutor ? tutorParentesco : undefined,
    });
    setIsSaving(false);

    if (!res.success) {
      setFormError(res.error || 'Error al registrar paciente');
      return;
    }

    resetFormFields(true);
    setFormSuccess('¡Paciente registrado con éxito!');
    setTimeout(() => {
      setFormSuccess(null);
      setActiveModal(null);
    }, 1000);
  };

  if (activeModal !== 'registrarPaciente' || !canAccess('pacientes')) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 rounded-lg">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Registrar Nuevo Paciente
              </h3>
              <p className="text-xs text-slate-500">
                Ingreso al CSMC Centinela de Vida con validación de identidad
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDeveloper && (
              <button
                type="button"
                onClick={() => setActiveModal('importarPacientes')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <Upload size={13} />
                <span>Importar Excel / Pegar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <Check size={16} className="shrink-0 text-emerald-600" />
              <span>{formSuccess}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 rounded-xl space-y-3 animate-in fade-in duration-200 shadow-sm">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <ShieldAlert size={20} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="font-extrabold text-xs sm:text-sm tracking-wide">
                  REGISTRO DE PACIENTE YA EXISTE - CONTINUE CON LA CONSULTA O CITA
                </span>
              </div>
              {pacienteExistente && (
                <div className="text-xs bg-white dark:bg-slate-850 p-3 rounded-lg border border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {pacienteExistente.apellidos_nombres}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {pacienteExistente.tipo_documento}: <span className="font-mono font-semibold">{pacienteExistente.numero_documento || pacienteExistente.codigo_temporal}</span> • HCL: <span className="font-semibold text-teal-700 dark:text-teal-400">{pacienteExistente.hcl || 'Sin HCL'}</span> • Seguro: <span className="font-semibold">{pacienteExistente.seguro}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        setCurrentTab('agenda');
                      }}
                      className="px-3.5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Calendar size={14} />
                      <span>Continuar con Cita</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPacienteFichaId(pacienteExistente.id);
                        setCurrentTab('ficha_paciente');
                        setActiveModal(null);
                      }}
                      className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:text-white text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-300 dark:border-slate-700"
                    >
                      <FileText size={14} />
                      <span>Ver Ficha</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fila 1: Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Documento *
              </label>
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value as TipoDocumento)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="DNI">DNI (Documento Nacional de Identidad)</option>
                <option value="CE">CE (Carnet de Extranjería)</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="INDOCUMENTADO">INDOCUMENTADO (Generar Código Temporal)</option>
              </select>
            </div>

            {tipoDoc === 'INDOCUMENTADO' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Código Temporal Auto-Generado
                </label>
                <div className="px-3 py-2 text-xs font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg">
                  {codigoTemporal}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Identificador temporal para personas indocumentadas
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Número de Documento *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={tipoDoc === 'DNI' ? '8 dígitos' : 'Número de documento'}
                    maxLength={tipoDoc === 'DNI' ? 8 : 12}
                    value={numDoc}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNumDoc(val);
                      if (val.length !== 8) {
                        setDniSearchStatus(null);
                      }
                    }}
                    onBlur={() => {
                      if (tipoDoc === 'DNI' && numDoc.trim().length === 8 && !dniSearchStatus && !isSearchingDNI) {
                        buscarDNIInterno();
                      }
                    }}
                    className="w-full px-3 py-2 pr-20 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                  />
                  {tipoDoc === 'DNI' && (
                    <button
                      type="button"
                      onClick={buscarDNIInterno}
                      disabled={isSearchingDNI || numDoc.length !== 8}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded text-[10px] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      {isSearchingDNI ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Search size={10} />
                          <span>Buscar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Mensaje de consulta en curso */}
                {isSearchingDNI && (
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-1 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> Consultando base de datos...
                  </span>
                )}

                {/* Mensaje de coincidencia encontrada */}
                {dniSearchStatus === 'found' && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                    <Check size={12} className="text-emerald-500 shrink-0" />
                    paciente encontrado en nuestra base de datos
                  </span>
                )}

                {/* Mensaje de no encontrado y solicitud de ingreso manual */}
                {dniSearchStatus === 'not_found' && (
                  <div className="mt-1 space-y-0.5 animate-in fade-in duration-150">
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <AlertCircle size={12} className="text-amber-500 shrink-0" />
                      no encontrado en nuestra base de datos
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block pl-4">
                      Por favor, complete los datos del paciente de manera manual.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fila 2: Apellidos y Nombres */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Apellidos y Nombres *
            </label>
            <input
              type="text"
              required
              placeholder="APELLIDO PATERNO MATERNO, NOMBRES"
              value={apellidosNombres}
              onChange={(e) => setApellidosNombres(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 uppercase"
            />
          </div>

          {/* Fila 3: HCL y Nacimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                HCL (Historia Clínica) {tipoDoc === 'INDOCUMENTADO' && <span className="text-rose-600">*</span>}
              </label>
              <input
                type="text"
                required={tipoDoc === 'INDOCUMENTADO'}
                placeholder={tipoDoc === 'INDOCUMENTADO' ? 'HCL OBLIGATORIO' : 'Correlativo automático'}
                value={hcl}
                onChange={(e) => {
                  hclEditadoRef.current = true;
                  setHcl(e.target.value);
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold text-teal-800 dark:text-teal-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 block">
                Asignado automáticamente (+1 al último HCL)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => handleFechaNacimientoChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Edad (calculada)
              </label>
              <input
                type="text"
                readOnly
                placeholder="Auto-calculada"
                value={typeof edad === 'number' ? `${edad} años` : ''}
                className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
              />
            </div>
          </div>

          {/* Fila 4: Sexo, Estado Civil, Grado de Instrucción */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sexo
              </label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as 'M' | 'F')}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="">Seleccione...</option>
                <option value="M">Masculino (♂)</option>
                <option value="F">Femenino (♀)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estado Civil
              </label>
              <select
                value={estadoCivil}
                onChange={(e) => setEstadoCivil(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="SOLTERO">Soltero(a)</option>
                <option value="CASADO">Casado(a)</option>
                <option value="CONVIVIENTE">Conviviente</option>
                <option value="DIVORCIADO">Divorciado(a)</option>
                <option value="VIUDO">Viudo(a)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Condición de Seguro *
                </label>
              </div>
              <select
                value={seguro}
                onChange={(e) => setSeguro(e.target.value as TipoSeguro)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer font-bold text-teal-800 dark:text-teal-300"
              >
                <option value="SIS">SIS (Seguro Integral de Salud)</option>
                <option value="ESSALUD">EsSalud</option>
                <option value="EPS">EPS</option>
                <option value="PRIVADO">Privado</option>
                <option value="NINGUNO">Ninguno (Particular)</option>
                <option value="OTRO">Otro</option>
              </select>

              {/* Enlaces de consulta en línea SIS y EsSalud lado a lado */}
              <div className="mt-2 flex items-center gap-2">
                <a
                  href="https://cel.sis.gob.pe/SisConsultaEnLinea"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer"
                  title="Abrir Consulta SIS en Línea (cel.sis.gob.pe)"
                >
                  <ExternalLink size={12} />
                  <span>Consulta SIS</span>
                </a>
                <a
                  href="https://dondemeatiendo.essalud.gob.pe/#/consulta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors shadow-2xs cursor-pointer"
                  title="Abrir Consulta EsSalud - Dónde me atiendo"
                >
                  <ExternalLink size={12} />
                  <span>Consulta EsSalud</span>
                </a>
              </div>
            </div>
          </div>

          {/* Fila 5: Dirección, Distrito y Celular */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Distrito
              </label>
              <select
                value={distrito}
                onChange={(e) => {
                  const val = e.target.value;
                  setDistrito(val);
                  if (val !== 'OTRO') setDistritoOtro('');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {DISTRITOS_CHINCHA.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dirección / Domicilio
              </label>
              <input
                type="text"
                placeholder="Av. Principal 123"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Celular / Teléfono
              </label>
              <input
                type="text"
                placeholder="999999999"
                maxLength={9}
                value={celular}
                onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          {distrito === 'OTRO' && (
            <div className="p-3 bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl">
              <label className="block text-xs font-semibold text-teal-900 dark:text-teal-200 mb-1">
                Especifique distrito / provincia / procedencia *
              </label>
              <input
                type="text"
                required
                value={distritoOtro}
                onChange={(e) => setDistritoOtro(e.target.value)}
                placeholder="Ej: Pisco, San Clemente, Cañete, Ica, Lima..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg focus:outline-none focus:border-teal-500 uppercase"
              />
            </div>
          )}

          {/* Sección Tutor / Familiar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tieneTutor}
                onChange={(e) => setTieneTutor(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                El paciente cuenta con Tutor o Familiar Acompañante
              </span>
            </label>

            {tieneTutor && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Primero DNI del Tutor con búsqueda */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      DNI del Tutor
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="8 dígitos"
                        maxLength={8}
                        value={tutorNumDoc}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setTutorNumDoc(val);
                          setTutorSearchStatus(null);
                        }}
                        onBlur={() => {
                          if (tutorNumDoc.trim().length === 8 && !tutorNombres) {
                            buscarTutorDNIInterno();
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={buscarTutorDNIInterno}
                        disabled={isSearchingTutorDNI || tutorNumDoc.length !== 8}
                        className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        title="Buscar DNI en tabla de consultas pac_datos_personales"
                      >
                        {isSearchingTutorDNI ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Search size={13} />
                        )}
                      </button>
                    </div>

                    {/* Estados de búsqueda del tutor */}
                    {isSearchingTutorDNI && (
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-1 mt-1">
                        <Loader2 size={10} className="animate-spin" />
                        Consultando base de datos...
                      </span>
                    )}
                    {tutorSearchStatus === 'found' && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <Check size={11} className="text-emerald-600" />
                        tutor encontrado en nuestra base de datos
                      </span>
                    )}
                    {tutorSearchStatus === 'not_found' && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={11} className="text-amber-500 shrink-0" />
                        no encontrado en nuestra base de datos (ingresar manualmente)
                      </span>
                    )}
                  </div>

                  {/* 2. Luego Apellidos y Nombres del Tutor */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Apellidos y Nombres del Tutor
                    </label>
                    <input
                      type="text"
                      placeholder="APELLIDOS Y NOMBRES"
                      value={tutorNombres}
                      onChange={(e) => setTutorNombres(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg uppercase focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* 3. Parentesco */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Parentesco
                    </label>
                    <select
                      value={tutorParentesco}
                      onChange={(e) => setTutorParentesco(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer focus:outline-none focus:border-teal-500"
                    >
                      <option value="MADRE">Madre</option>
                      <option value="PADRE">Padre</option>
                      <option value="CONYUGE">Cónyuge / Pareja</option>
                      <option value="HIJO">Hijo(a)</option>
                      <option value="HERMANO">Hermano(a)</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!!duplicateWarning || isSaving}
              className="px-5 py-2 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] disabled:opacity-50 text-white rounded-lg shadow-md cursor-pointer transition-all"
            >
              {isSaving ? 'Guardando...' : 'Guardar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
