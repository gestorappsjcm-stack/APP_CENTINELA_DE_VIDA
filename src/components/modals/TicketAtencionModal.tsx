import React, { useRef } from 'react';
import { Cita, Paciente, Profesional, Consultorio } from '../../types';
import { useApp } from '../../context/AppContext';
import { ESCUDO_PERU_DATA_URL } from '../../assets/escudoPeruBase64';
import {
  X,
  Printer,
  Calendar,
  Clock,
  User,
  CheckCircle,
  Copy,
  Share2,
  FileText,
  AlertCircle,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

interface TicketAtencionModalProps {
  cita: Cita;
  onClose: () => void;
  isRecienCreada?: boolean;
}

export const TicketAtencionModal: React.FC<TicketAtencionModalProps> = ({
  cita,
  onClose,
  isRecienCreada = false,
}) => {
  const { pacientes, profesionales, consultorios } = useApp();
  const [copiado, setCopiado] = React.useState(false);

  const paciente = pacientes.find((p) => String(p.id) === String(cita.paciente_id));
  const profesional = profesionales.find((pr) => String(pr.id) === String(cita.profesional_id));
  const consultorio = consultorios.find(
    (c) =>
      String(c.id) === String(cita.consultorio_id) ||
      (profesional?.consultorioAsignado &&
        (String(c.id) === String(profesional.consultorioAsignado) ||
          c.nombre.toLowerCase().includes(profesional.consultorioAsignado.toLowerCase())))
  );

  const numeroTicket = cita.numero_ticket || `TKT-${cita.id.replace('cita-', '')}`;
  const fechaEmision = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaEmision = new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopiarResumen = () => {
    const texto = `*TICKET DE CITA - CSMC CENTINELA DE VIDA*
Ticket N°: ${numeroTicket}
Paciente: ${paciente?.apellidos_nombres || 'No registrado'}
DNI: ${paciente?.numero_documento || paciente?.codigo_temporal || '-'}
Fecha Cita: ${cita.fecha_cita} a las ${cita.hora_cita}
Tipo: ${cita.tipo_cita}
Profesional: ${profesional?.apellidos_nombres || 'Por asignar'}
Consultorio: ${consultorio?.nombre || 'Admisión / Triaje'}
Indicación: Presentarse 15 min antes con DNI físico y pasar primero por Triaje.`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Cabecera Superior del Modal (Oculto en Impresión) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-lg">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ticket de Atención de Cita
              </h3>
              <p className="text-[11px] text-slate-500">Comprobante oficial para el paciente</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notificación de creación exitosa si aplica */}
        {isRecienCreada && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/50 px-5 py-2.5 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-semibold print:hidden">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>¡Cita programada con éxito! Se ha generado su ticket de atención.</span>
          </div>
        )}

        {/* CUERPO DEL TICKET (Estilo Ticket Térmico / Voucher Médico) */}
        <div className="p-5 max-h-[75vh] overflow-y-auto print:max-h-none print:p-0 print:overflow-visible">
          <div
            id="ticket-imprimible"
            className="mx-auto bg-white text-black p-5 rounded-xl border border-dashed border-slate-300 shadow-xs text-xs font-sans print:border-none print:p-2 print:shadow-none print:w-[80mm] print:mx-auto"
          >
            {/* ENCABEZADO INSTITUCIONAL */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <img
                  src={ESCUDO_PERU_DATA_URL}
                  alt="Escudo Nacional"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="font-extrabold text-[11px] tracking-wide text-slate-900 uppercase">
                REPÚBLICA DEL PERÚ
              </div>
              <div className="text-[10px] font-bold text-slate-700 leading-tight">
                GOBIERNO REGIONAL DE ICA • DIRESA
              </div>
              <div className="text-[10px] text-slate-600 font-semibold">
                HOSPITAL SAN JOSÉ DE CHINCHA
              </div>
              <div className="text-[11px] font-black text-teal-800 uppercase tracking-tight">
                CSMC CENTINELA DE VIDA
              </div>
              <div className="text-[9px] text-slate-500">
                Av. Prolongación San Martín S/N - Chincha Alta
              </div>
            </div>

            {/* IDENTIFICACIÓN DEL TICKET */}
            <div className="py-3 text-center border-b border-dashed border-slate-300">
              <div className="inline-block bg-slate-900 text-white font-mono font-black text-sm px-3 py-1 rounded-md tracking-wider">
                {numeroTicket}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                TICKET DE ATENCIÓN AMBULATORIA
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                Emisión: {fechaEmision} • {horaEmision}
              </div>
            </div>

            {/* FECHA Y HORA CITADA (DESTACADO) */}
            <div className="my-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                HORA Y FECHA PROGRAMADA
              </div>
              <div className="text-base font-black text-teal-900 tracking-tight mt-0.5">
                {cita.fecha_cita}
              </div>
              <div className="text-lg font-black text-slate-900">
                {cita.hora_cita} <span className="text-xs font-semibold text-slate-500">HRS</span>
              </div>
              <div className="inline-block mt-1 px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase">
                {cita.tipo_cita.replace('_', ' ')}
              </div>
            </div>

            {/* DATOS DEL PACIENTE */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                DATOS DEL PACIENTE
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-medium">Nombre:</span>
                <span className="font-bold text-slate-900 text-right uppercase">
                  {paciente?.apellidos_nombres || 'Paciente No Encontrado'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{paciente?.tipo_documento || 'DOC'}:</span>
                <span className="font-mono font-bold text-slate-900">
                  {paciente?.numero_documento || paciente?.codigo_temporal || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Historia Clínica:</span>
                <span className="font-mono font-bold text-slate-900">
                  {paciente?.hcl || paciente?.numero_documento || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Tipo de Seguro:</span>
                <span className="font-bold text-teal-800">
                  {paciente?.seguro || 'SIS GRATUITO'}
                </span>
              </div>
            </div>

            {/* DATOS DEL SERVICIO Y PROFESIONAL */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                SERVICIO ASIGNADO
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-medium">Profesional:</span>
                <span className="font-bold text-slate-900 text-right">
                  {profesional?.apellidos_nombres || 'Profesional de Guardia / Turno'}
                </span>
              </div>
              {profesional?.profesion && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Especialidad:</span>
                  <span className="font-semibold text-slate-700">
                    {profesional.profesion}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Ambiente / Consultorio:</span>
                <span className="font-bold text-slate-900">
                  {consultorio?.nombre || 'Admisión / Triaje Central'}
                </span>
              </div>
              {cita.motivo_consulta && (
                <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded mt-1">
                  <span className="font-bold">Motivo: </span>
                  {cita.motivo_consulta}
                </div>
              )}
            </div>

            {/* INSTRUCCIONES OBLIGATORIAS AL PACIENTE */}
            <div className="pt-3 pb-2 space-y-1.5 text-[10px] text-slate-600 leading-snug">
              <div className="font-black text-slate-800 uppercase flex items-center gap-1">
                <AlertCircle size={12} className="text-amber-600" />
                <span>INSTRUCCIONES IMPORTANTES:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  Presentarse <strong>15 minutos antes</strong> de su hora con su <strong>DNI físico</strong>.
                </li>
                <li>
                  Pasar obligatoriamente primero por <strong>Triaje</strong> para control de funciones vitales.
                </li>
                <li>
                  Estar atento al llamado por <strong>pantalla / altavoz</strong> en sala de espera.
                </li>
                <li>
                  En caso de no poder asistir, comunicar su cancelación con anticipación.
                </li>
              </ul>
            </div>

            {/* CÓDIGO DE BARRAS TÉRMICO DECORATIVO */}
            <div className="pt-2 text-center">
              <div className="flex justify-center items-center gap-[2px] h-9 my-1">
                {[3, 1, 4, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 1, 2, 4, 1, 3].map(
                  (w, i) => (
                    <div
                      key={i}
                      className="bg-black h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  )
                )}
              </div>
              <div className="font-mono text-[9px] text-slate-500 tracking-widest">
                *{numeroTicket}*
              </div>
              <div className="text-[9px] text-slate-400 italic mt-1">
                Centinela de Vida • Cuidando tu bienestar emocional
              </div>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN INFERIOR (Ocultos en impresión) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <button
            onClick={handleCopiarResumen}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
          >
            <Copy size={15} />
            <span>{copiado ? '¡Copiado!' : 'Copiar Datos'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
            >
              Cerrar
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-xl shadow-md cursor-pointer transition-all"
            >
              <Printer size={16} />
              <span>Imprimir Ticket</span>
            </button>
          </div>
        </div>

        {/* ESTILOS DE IMPRESIÓN AISLADA PARA TICKET */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #ticket-imprimible, #ticket-imprimible * {
              visibility: visible;
            }
            #ticket-imprimible {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm !important;
              max-width: 100% !important;
              padding: 4mm !important;
              margin: 0 auto !important;
              border: none !important;
              box-shadow: none !important;
              background: #fff !important;
              color: #000 !important;
            }
            @page {
              size: auto;
              margin: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
