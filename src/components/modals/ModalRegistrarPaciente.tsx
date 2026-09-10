import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TipoDocumento, TipoSeguro } from '../../types';
import { X, Search, Check, AlertTriangle, UserPlus, ShieldAlert } from 'lucide-react';

export const ModalRegistrarPaciente: React.FC = () => {
  const { activeModal, setActiveModal, addPaciente, pacientes } = useApp();

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

  // Estados de validación
  const [isSearchingDNI, setIsSearchingDNI] = useState(false);
  const [dniFound, setDniFound] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
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
  }, [tipoDoc, numDoc, hcl]);

  // Cálculo automático de edad
  const handleFechaNacimientoChange = (fecha: string) => {
    setFechaNacimiento(fecha);
    if (!fecha) {
      setEdad('');
      return;
    }
    const hoy = new Date();
    const nacimiento = new Date(fecha + 'T00:00:00');
    let diff = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      diff--;
    }
    setEdad(Math.max(0, diff));
  };

  // Simulación de búsqueda en RENIEC interna (pac_datos_personales)
  const buscarDNIInterno = () => {
    if (tipoDoc !== 'DNI' || numDoc.length !== 8) return;
    setIsSearchingDNI(true);
    setDniFound(false);

    setTimeout(() => {
      setIsSearchingDNI(false);
      // DNI demo conocidos o generados
      if (numDoc === '45123890') {
        setApellidosNombres('SANCHEZ LOPEZ, MARIA ELENA');
        handleFechaNacimientoChange('1988-04-12');
        setSexo('F');
        setDniFound(true);
      } else if (numDoc === '71239845') {
        setApellidosNombres('CASTILLO MENDOZA, JUAN CARLOS');
        handleFechaNacimientoChange('2001-09-24');
        setSexo('M');
        setDniFound(true);
      } else {
        // Generador simulado para cualquier DNI válido de 8 dígitos
        const apellidosDemo = ['ALVAREZ MENDOZA', 'QUISPE TORRES', 'GARCIA ROJAS', 'CHAVEZ PALOMINO', 'FLORES DIAZ'];
        const nombresDemo = ['JUAN LUIS', 'ANA MARIA', 'CARLOS ENRIQUE', 'ROSA ELENA', 'PEDRO PABLO'];
        const randomAp = apellidosDemo[parseInt(numDoc.slice(-1), 10) % apellidosDemo.length];
        const randomNom = nombresDemo[parseInt(numDoc.slice(-2), 10) % nombresDemo.length];
        setApellidosNombres(`${randomAp}, ${randomNom}`);
        handleFechaNacimientoChange('1994-06-15');
        setSexo(parseInt(numDoc.slice(-1), 10) % 2 === 0 ? 'F' : 'M');
        setDniFound(true);
      }
    }, 400);
  };

  // Verificar si ya existe en el padrón
  const verificarDuplicado = () => {
    setDuplicateWarning(null);
    if (tipoDoc === 'INDOCUMENTADO') {
      if (hcl && hcl.trim().length > 2) {
        const existe = pacientes.find((p) => p.hcl?.toLowerCase() === hcl.trim().toLowerCase());
        if (existe) {
          setDuplicateWarning(`YA REGISTRADO: ${existe.apellidos_nombres} con HCL ${existe.hcl}`);
        }
      }
    } else if (numDoc && numDoc.trim().length >= 8) {
      const existe = pacientes.find((p) => p.tipo_documento === tipoDoc && p.numero_documento === numDoc.trim());
      if (existe) {
        setDuplicateWarning(`YA REGISTRADO: ${existe.apellidos_nombres} (${tipoDoc}: ${existe.numero_documento})`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    const res = addPaciente({
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
      distrito_otro_especificar: distrito === 'OTRO' ? distritoOtro : undefined,
      celular: celular.trim() || undefined,
      estado: 'activo',
      tiene_tutor: tieneTutor,
      tutor_nombres: tieneTutor ? tutorNombres.trim().toUpperCase() : undefined,
      tutor_tipo_documento: tieneTutor ? tutorTipoDoc : undefined,
      tutor_numero_documento: tieneTutor ? tutorNumDoc.trim() : undefined,
      tutor_celular: tieneTutor ? tutorCelular.trim() : undefined,
      tutor_parentesco: tieneTutor ? tutorParentesco : undefined,
    });

    if (!res.success) {
      setFormError(res.error || 'Error al registrar paciente');
      return;
    }

    setFormSuccess('¡Paciente registrado con éxito!');
    setTimeout(() => {
      setActiveModal(null);
    }, 1200);
  };

  if (activeModal !== 'registrarPaciente') return null;

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
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
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
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center gap-2 font-medium">
              <ShieldAlert size={16} className="shrink-0 text-amber-600" />
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
                    onChange={(e) => setNumDoc(e.target.value.replace(/\D/g, ''))}
                    onBlur={buscarDNIInterno}
                    className="w-full px-3 py-2 pr-20 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                  />
                  {tipoDoc === 'DNI' && (
                    <button
                      type="button"
                      onClick={buscarDNIInterno}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Search size={10} />
                      {isSearchingDNI ? 'Buscando...' : 'Buscar'}
                    </button>
                  )}
                </div>
                {dniFound && (
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <Check size={11} /> Datos obtenidos de RENIEC / Padrón
                  </span>
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
                placeholder={tipoDoc === 'INDOCUMENTADO' ? 'HCL OBLIGATORIO' : 'Ej: HCL-10492'}
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
                onChange={(e) => setDistrito(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="CHINCHA ALTA">Chincha Alta</option>
                <option value="PUEBLO NUEVO">Pueblo Nuevo</option>
                <option value="SUNAMPE">Sunampe</option>
                <option value="GROCIO PRADO">Grocio Prado</option>
                <option value="ALTO LARAN">Alto Larán</option>
                <option value="EL CARMEN">El Carmen</option>
                <option value="TAMBO DE MORA">Tambo de Mora</option>
                <option value="CHAVIN">Chavín</option>
                <option value="OTRO">Otro</option>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nombres del Tutor
                  </label>
                  <input
                    type="text"
                    placeholder="Apellidos y nombres"
                    value={tutorNombres}
                    onChange={(e) => setTutorNombres(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    DNI del Tutor
                  </label>
                  <input
                    type="text"
                    placeholder="8 dígitos"
                    maxLength={8}
                    value={tutorNumDoc}
                    onChange={(e) => setTutorNumDoc(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Parentesco
                  </label>
                  <select
                    value={tutorParentesco}
                    onChange={(e) => setTutorParentesco(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
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
              disabled={!!duplicateWarning}
              className="px-5 py-2 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] disabled:opacity-50 text-white rounded-lg shadow-md cursor-pointer transition-all"
            >
              Guardar Paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
