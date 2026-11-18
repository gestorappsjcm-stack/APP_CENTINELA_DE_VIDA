import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TipoDocumento, TipoSeguro } from '../../types';
import {
  X,
  Search,
  Check,
  AlertTriangle,
  UserCog,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { DISTRITOS_CHINCHA, parseDistritoParaFormulario } from '../../lib/distritosHelper';
import { buscarConflictoPaciente, calcularEdadDesdeFecha } from '../../lib/pacientesHelper';

export const ModalEditarPaciente: React.FC = () => {
  const { editingPaciente, setEditingPaciente, updatePaciente, pacientes } = useApp();

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
  const [estado, setEstado] = useState<'activo' | 'inactivo'>('activo');

  // Tutor
  const [tieneTutor, setTieneTutor] = useState(false);
  const [tutorNombres, setTutorNombres] = useState('');
  const [tutorTipoDoc, setTutorTipoDoc] = useState('DNI');
  const [tutorNumDoc, setTutorNumDoc] = useState('');
  const [tutorCelular, setTutorCelular] = useState('');
  const [tutorParentesco, setTutorParentesco] = useState('PADRE');
  const [isSearchingTutorDNI, setIsSearchingTutorDNI] = useState(false);
  const [tutorSearchStatus, setTutorSearchStatus] = useState<'found' | 'not_found' | null>(null);

  // Validaciones y estado de guardado
  const [isSearchingDNI, setIsSearchingDNI] = useState(false);
  const [dniSearchStatus, setDniSearchStatus] = useState<'found' | 'not_found' | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar datos del paciente cuando se abre el modal
  useEffect(() => {
    if (!editingPaciente) return;
    setTipoDoc(editingPaciente.tipo_documento || 'DNI');
    setNumDoc(editingPaciente.numero_documento || '');
    setCodigoTemporal(editingPaciente.codigo_temporal || '');
    setApellidosNombres(editingPaciente.apellidos_nombres || '');
    setHcl(editingPaciente.hcl || '');
    setFechaNacimiento(editingPaciente.fecha_nacimiento || '');
    setEdad(typeof editingPaciente.edad === 'number' ? editingPaciente.edad : '');
    setSexo(editingPaciente.sexo || '');
    setEstadoCivil(editingPaciente.estado_civil || 'SOLTERO');
    setGradoInstruccion(editingPaciente.grado_instruccion || 'SECUNDARIA');
    setSeguro(editingPaciente.seguro || 'SIS');
    setSeguroOtro(editingPaciente.seguro_otro_especificar || '');
    setDireccion(editingPaciente.direccion || '');
    const parsedDist = parseDistritoParaFormulario(
      editingPaciente.distrito,
      editingPaciente.distrito_otro_especificar
    );
    setDistrito(parsedDist.distrito);
    setDistritoOtro(parsedDist.distritoOtro);
    setCelular(editingPaciente.celular || '');
    setEstado(editingPaciente.estado || 'activo');

    setTieneTutor(Boolean(editingPaciente.tiene_tutor));
    setTutorNombres(editingPaciente.tutor_nombres || '');
    setTutorTipoDoc(editingPaciente.tutor_tipo_documento || 'DNI');
    setTutorNumDoc(editingPaciente.tutor_numero_documento || '');
    setTutorCelular(editingPaciente.tutor_celular || '');
    setTutorParentesco(editingPaciente.tutor_parentesco || 'PADRE');

    setDniSearchStatus(null);
    setTutorSearchStatus(null);
    setDuplicateWarning(null);
    setFormError(null);
    setFormSuccess(null);
    setIsSaving(false);
  }, [editingPaciente]);

  // Generar código temporal si cambia a INDOCUMENTADO y no tenía uno
  useEffect(() => {
    if (!editingPaciente) return;
    if (tipoDoc === 'INDOCUMENTADO' && !codigoTemporal) {
      const now = new Date();
      const fechaStr =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 900) + 100;
      setCodigoTemporal(`IND-${fechaStr}-${random}`);
    }
  }, [tipoDoc, editingPaciente, codigoTemporal]);

  // Verificar duplicados contra OTROS pacientes (por Documento o por HCL en cualquier tipo de documento)
  useEffect(() => {
    if (!editingPaciente) return;
    setDuplicateWarning(null);

    const docAConsultar = tipoDoc !== 'INDOCUMENTADO' && numDoc.trim().length >= 4 ? numDoc.trim() : '';
    const hclAConsultar = hcl.trim().length > 0 ? hcl.trim() : '';
    if (!docAConsultar && !hclAConsultar) return;

    const conflicto = buscarConflictoPaciente(
      {
        tipo_documento: tipoDoc,
        numero_documento: docAConsultar,
        hcl: hclAConsultar,
      },
      pacientes,
      editingPaciente.id
    );
    if (conflicto) {
      setDuplicateWarning(conflicto.message);
    }
  }, [tipoDoc, numDoc, hcl, pacientes, editingPaciente]);

  if (!editingPaciente) return null;

  const handleFechaNacimientoChange = (fecha: string) => {
    setFechaNacimiento(fecha);
    const calculada = calcularEdadDesdeFecha(fecha);
    setEdad(typeof calculada === 'number' ? calculada : '');
  };

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
        setDniSearchStatus('not_found');
      }
    } catch (e) {
      console.warn('Error al buscar DNI:', e);
      setDniSearchStatus('not_found');
    } finally {
      setIsSearchingDNI(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (duplicateWarning) {
      setFormError(duplicateWarning);
      return;
    }

    if (!apellidosNombres.trim()) {
      setFormError('Los apellidos y nombres son obligatorios.');
      return;
    }

    if (tipoDoc !== 'INDOCUMENTADO' && !numDoc.trim()) {
      setFormError('El número de documento es obligatorio.');
      return;
    }

    if (tipoDoc === 'DNI' && numDoc.trim().length !== 8) {
      setFormError('El DNI debe tener exactamente 8 dígitos.');
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
    const res = await updatePaciente(editingPaciente.id, {
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
      seguro,
      seguro_otro_especificar: seguro === 'OTRO' ? seguroOtro.trim() : undefined,
      direccion: direccion.trim() || undefined,
      distrito,
      distrito_otro_especificar: distrito === 'OTRO' ? distritoOtro.trim().toUpperCase() : undefined,
      celular: celular.trim() || undefined,
      estado,
      tiene_tutor: tieneTutor,
      tutor_nombres: tieneTutor ? tutorNombres.trim().toUpperCase() : undefined,
      tutor_tipo_documento: tieneTutor ? tutorTipoDoc : undefined,
      tutor_numero_documento: tieneTutor ? tutorNumDoc.trim() : undefined,
      tutor_celular: tieneTutor ? tutorCelular.trim() : undefined,
      tutor_parentesco: tieneTutor ? tutorParentesco : undefined,
    });
    setIsSaving(false);

    if (!res.success) {
      setFormError(res.error || 'No se pudo actualizar el paciente.');
      return;
    }

    setFormSuccess('¡Datos del paciente actualizados correctamente!');
    setTimeout(() => {
      setEditingPaciente(null);
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-lg">
              <UserCog size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Editar Registro de Paciente
              </h3>
              <p className="text-xs text-slate-500">
                Corrección de DNI, HCL, nombres, seguro o datos de contacto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingPaciente(null)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <Check size={16} className="shrink-0 text-emerald-600" />
              <span>{formSuccess}</span>
            </div>
          )}

          {duplicateWarning && !formError && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
              <span>{duplicateWarning}</span>
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
                <option value="INDOCUMENTADO">INDOCUMENTADO (Código Temporal)</option>
              </select>
            </div>

            {tipoDoc === 'INDOCUMENTADO' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Código Temporal
                </label>
                <div className="px-3 py-2 text-xs font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg">
                  {codigoTemporal}
                </div>
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
                    maxLength={tipoDoc === 'DNI' ? 8 : 15}
                    value={numDoc}
                    onChange={(e) => {
                      const val =
                        tipoDoc === 'DNI' ? e.target.value.replace(/\D/g, '') : e.target.value.toUpperCase();
                      setNumDoc(val);
                      if (val.length !== 8) {
                        setDniSearchStatus(null);
                      }
                    }}
                    className="w-full px-3 py-2 pr-20 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                  />
                  {tipoDoc === 'DNI' && (
                    <button
                      type="button"
                      onClick={buscarDNIInterno}
                      disabled={isSearchingDNI || numDoc.length !== 8}
                      title="Consultar y actualizar nombres desde el padrón por DNI"
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded text-[10px] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      {isSearchingDNI ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          <span>Buscando</span>
                        </>
                      ) : (
                        <>
                          <Search size={10} />
                          <span>Validar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {dniSearchStatus === 'found' && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <Check size={12} className="text-emerald-500 shrink-0" />
                    Datos actualizados desde padrón por DNI
                  </span>
                )}

                {dniSearchStatus === 'not_found' && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} className="text-amber-500 shrink-0" />
                    DNI no encontrado en padrón; conserve o edite los datos manualmente
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Fila 2: Apellidos y Nombres + Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="sm:col-span-3">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estado del Paciente
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as 'activo' | 'inactivo')}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
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
                placeholder="Ej: HCL-10492"
                value={hcl}
                onChange={(e) => setHcl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
              />
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

          {/* Fila 4: Sexo, Estado Civil, Grado de Instrucción y Seguro */}
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Condición de Seguro *
              </label>
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

              <div className="mt-2 flex items-center gap-2">
                <a
                  href="https://cel.sis.gob.pe/SisConsultaEnLinea"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                >
                  <ExternalLink size={11} />
                  <span>Consulta SIS</span>
                </a>
                <a
                  href="https://dondemeatiendo.essalud.gob.pe/#/consulta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors"
                >
                  <ExternalLink size={11} />
                  <span>Consulta EsSalud</span>
                </a>
              </div>
            </div>
          </div>

          {seguro === 'OTRO' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Especifique Otro Seguro
              </label>
              <input
                type="text"
                value={seguroOtro}
                onChange={(e) => setSeguroOtro(e.target.value)}
                placeholder="Nombre del seguro"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>
          )}

          {/* Fila 5: Distrito, Dirección y Celular */}
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
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
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={buscarTutorDNIInterno}
                      disabled={isSearchingTutorDNI || tutorNumDoc.length !== 8}
                      className="px-2 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    >
                      {isSearchingTutorDNI ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    </button>
                  </div>
                  {tutorSearchStatus === 'found' && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                      Tutor encontrado
                    </span>
                  )}
                  {tutorSearchStatus === 'not_found' && (
                    <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
                      No encontrado
                    </span>
                  )}
                </div>

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

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Celular del Tutor
                  </label>
                  <input
                    type="text"
                    placeholder="999999999"
                    maxLength={9}
                    value={tutorCelular}
                    onChange={(e) => setTutorCelular(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setEditingPaciente(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={Boolean(duplicateWarning) || isSaving}
              className="px-5 py-2 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] disabled:opacity-50 text-white rounded-lg shadow-md cursor-pointer transition-all"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
