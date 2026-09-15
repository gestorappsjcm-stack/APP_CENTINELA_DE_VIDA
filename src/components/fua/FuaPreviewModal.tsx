import React, { useState } from 'react';
import { FUA, Paciente, Profesional } from '../../types';
import { useApp } from '../../context/AppContext';
import { Printer, ArrowLeft, Eye } from 'lucide-react';
import { parseMedicamentosList } from '../../lib/medicamentosHelper';

interface FuaPreviewModalProps {
  fua: FUA;
  onClose: () => void;
}

export const FuaPreviewModal: React.FC<FuaPreviewModalProps> = ({ fua, onClose }) => {
  const { pacientes, profesionales, triajes } = useApp();
  const [caraActiva, setCaraActiva] = useState<'anverso' | 'reverso'>('anverso');

  const paciente = pacientes.find((p) => String(p.id) === String(fua.paciente_id));
  const profesional =
    profesionales.find((pr) => String(pr.id) === String(fua.profesional_id)) ||
    profesionales[0];
  const triaje = fua.triaje_id
    ? triajes.find((t) => String(t.id) === String(fua.triaje_id))
    : triajes.find((t) => String(t.paciente_id) === String(fua.paciente_id));

  // Descomponer número FUA
  const partesFua = fua.numero_fua ? String(fua.numero_fua).split('-') : [];
  const renaiess = fua.renaiess || fua.codigo_renaes || partesFua[0] || '00003414';
  const anioFua = fua.anio_fua ? String(fua.anio_fua) : (partesFua[1] || '2026');
  const correlativo = fua.correlativo || partesFua[2] || '00000001';

  // Fecha de atención
  const rawFechaAtn = String(fua.fecha || new Date().toISOString().split('T')[0]).split(' ')[0].split('T')[0];
  let anioAtn = '2026', mesAtn = '09', diaAtn = '10';
  if (rawFechaAtn.includes('-')) {
    const p = rawFechaAtn.split('-');
    anioAtn = p[0] || '2026';
    mesAtn = p[1] || '01';
    diaAtn = p[2] || '01';
  } else if (rawFechaAtn.includes('/')) {
    const p = rawFechaAtn.split('/');
    if (p[0].length === 4) {
      anioAtn = p[0];
      mesAtn = p[1] || '01';
      diaAtn = p[2] || '01';
    } else {
      diaAtn = p[0] || '01';
      mesAtn = p[1] || '01';
      anioAtn = p[2] || '2026';
    }
  }

  // Fecha de nacimiento del paciente
  let diaNac = '', mesNac = '', anioNac = '';
  if (paciente?.fecha_nacimiento) {
    const rawFn = String(paciente.fecha_nacimiento).split(' ')[0].split('T')[0];
    if (rawFn.includes('-')) {
      const p = rawFn.split('-');
      anioNac = p[0] || '';
      mesNac = p[1] || '';
      diaNac = p[2] || '';
    } else if (rawFn.includes('/')) {
      const p = rawFn.split('/');
      if (p[0].length === 4) {
        anioNac = p[0] || '';
        mesNac = p[1] || '';
        diaNac = p[2] || '';
      } else {
        diaNac = p[0] || '';
        mesNac = p[1] || '';
        anioNac = p[2] || '';
      }
    }
  }

  const sexo = (paciente?.sexo || 'M').toUpperCase();
  const esMasculino = sexo === 'M' || sexo === 'MASCULINO';
  const esFemenino = sexo === 'F' || sexo === 'FEMENINO';

  // Diagnósticos seguros (hasta 10)
  const rawDiags = Array.isArray(fua.diagnosticos) ? fua.diagnosticos : [];
  const diags = rawDiags.map((d: any) => {
    if (typeof d === 'string') {
      const parts = (d as string).split(':');
      return {
        codigo: parts[0]?.trim() || 'F32.9',
        descripcion: parts[1]?.trim() || d,
        tipo: 'D',
        tipo_ingreso: 'D',
        cie_ingreso: parts[0]?.trim() || 'F32.9',
        tipo_egreso: 'D',
        cie_egreso: parts[0]?.trim() || 'F32.9',
      };
    }
    return d || { codigo: 'F32.9', descripcion: 'DIAGNÓSTICO', tipo: 'D' };
  });
  const nDiags = diags.length;

  // Clase de escala del anverso según cantidad de diagnósticos (z1 a z5)
  let zoomClass = 'z1';
  if (nDiags <= 2) zoomClass = 'z1';
  else if (nDiags <= 4) zoomClass = 'z2';
  else if (nDiags <= 6) zoomClass = 'z3';
  else if (nDiags <= 8) zoomClass = 'z4';
  else zoomClass = 'z5';

  // Medicamentos (hasta 10) - normalizado seguro
  const medicamentos = Array.isArray(fua.medicamentos)
    ? fua.medicamentos
    : parseMedicamentosList(fua.medicamentos);

  // Procedimientos (hasta 8)
  const rawProcs = Array.isArray(fua.procedimientos) ? fua.procedimientos : [];
  const procedimientos = rawProcs.length > 0 ? rawProcs : [
    { cpms: '90806', descripcion: 'PSICOTERAPIA INDIVIDUAL', ind: '1', eje: '1', dx: '1', res: 'COMPLETO' },
    { cpms: '96101', descripcion: 'EVALUACIÓN PSICOLÓGICA', ind: '1', eje: '1', dx: '1', res: 'INFORME' },
  ];

  // IMC y constantes
  const peso = fua.peso_kg || triaje?.peso || 65;
  const talla = fua.talla_cm || triaje?.talla || 165;
  const pa = fua.presion_arterial || triaje?.presion_arterial || '120/80';
  const imc = fua.imc || (talla > 0 ? (peso / Math.pow(talla / 100, 2)).toFixed(1) : '23.8');

  // Documento
  const tipoDoc = paciente?.tipo_documento || 'DNI';
  const numDoc = tipoDoc === 'INDOCUMENTADO' ? (paciente?.codigo_temporal || '') : (paciente?.numero_documento || '');
  const codigoTdi = tipoDoc === 'DNI' ? '1' : tipoDoc === 'CE' ? '2' : '3';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* ===== BOTONES DE ACCION (SOLO PANTALLA) ===== */}
      <div className="no-print w-full max-w-5xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 mb-4 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 sticky top-2 z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
          >
            <ArrowLeft size={16} />
            <span>Volver a Gestión FUA</span>
          </button>
          <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
            FUA N° {fua.numero_fua}
          </span>
        </div>

        {/* NAVEGACIÓN ANVERSO / REVERSO */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setCaraActiva('anverso')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              caraActiva === 'anverso'
                ? 'bg-[#1e3a5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            ◀ 📄 Anverso
          </button>
          <button
            onClick={() => setCaraActiva('reverso')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              caraActiva === 'reverso'
                ? 'bg-[#1e3a5f] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            📄 Reverso ▶
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2 bg-[#1e3a5f] hover:bg-[#284f80] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
        >
          <Printer size={16} />
          <span>🖨️ Imprimir FUA Completo (Doble Cara)</span>
        </button>
      </div>

      <div className="no-print text-center text-xs text-slate-300 mb-3 font-medium">
        En pantalla ves una cara a la vez · al imprimir salen ambas en orden (doble cara oficial A4)
      </div>

      {/* CONTENEDOR DOCUMENTO FUA FÍSICO */}
      <div className="w-full max-w-[978px] bg-white text-black print:max-w-none shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-0">
        {/* ========================================================================= */}
        {/* CARA A: ANVERSO */}
        {/* ========================================================================= */}
        <div
          id="cara-anverso"
          className={`hoja-anverso ${zoomClass} ${caraActiva === 'anverso' ? 'block' : 'hidden'} print:!block`}
        >
          {/* ENCABEZADO */}
          <div className="encabezado">
            <div className="caja-escudo">
              <svg width="28" height="32" viewBox="0 0 100 120" className="inline-block">
                <rect width="100" height="120" rx="10" fill="#dc2626" />
                <rect x="25" width="50" height="120" fill="#ffffff" />
                <circle cx="50" cy="60" r="22" fill="#eab308" stroke="#15803d" strokeWidth="3" />
                <path d="M 50 42 L 54 52 L 64 52 L 56 59 L 59 70 L 50 64 L 41 70 L 44 59 L 36 52 L 46 52 Z" fill="#b45309" />
              </svg>
            </div>
            <div className="caja-peru">PERÚ</div>
            <div className="caja-minsa">
              Ministerio<br />de Salud
            </div>
            <div className="caja-sis">Seguro Integral de Salud</div>
            <div className="anexo">ANEXO 1</div>
          </div>

          <div className="barra-fua">FORMATO ÚNICO DE ATENCIÓN - FUA</div>

          {/* NÚMERO DE FORMATO */}
          <div className="zona-numero">
            <table className="numero">
              <thead>
                <tr>
                  <th colSpan={3}>NÚMERO DE FORMATO</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="c1" style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px', textAlign: 'center' }}>
                    {renaiess}
                  </td>
                  <td className="c2" style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px', textAlign: 'center' }}>
                    {anioFua}
                  </td>
                  <td className="c3" style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px', textAlign: 'center' }}>
                    {correlativo}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* IPRESS */}
          <div className="seccion-barra">DE LA INSTITUCIÓN PRESTADORA DE SERVICIOS DE SALUD</div>

          <table className="ipress">
            <thead>
              <tr>
                <th className="col-codigo">CÓDIGO RENIPRESS DE LA IPRESS</th>
                <th className="col-nombre">NOMBRE DE LA IPRESS QUE REALIZA LA ATENCIÓN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>{renaiess}</td>
                <td style={{ fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center' }}>
                  {fua.establecimiento || 'HOSPITAL SAN JOSÉ DE CHINCHA / CSMC CENTINELA DE VIDA'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* PERSONAL / LUGAR / ATENCIÓN / REFERENCIA */}
          <table className="atencion">
            <colgroup>
              <col style={{ width: '90px' }} />
              <col style={{ width: '26px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '26px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '26px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '180px' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={3}>PERSONAL QUE ATIENDE</th>
                <th colSpan={2}>LUGAR DE<br />ATENCIÓN</th>
                <th colSpan={2}>ATENCIÓN</th>
                <th colSpan={3}>REFERENCIA REALIZADA POR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="gl">DE LA IPRESS</td>
                <td className="mark">X</td>
                <td className="gc" rowSpan={2}>CÓDIGO DE AISPED</td>
                <td className="gl">INTRAMURAL</td>
                <td className="mark">X</td>
                <td className="gl">AMBULATORIA</td>
                <td className="mark">{fua.tipo_atencion === 'AMBULATORIA' ? 'X' : ''}</td>
                <td className="gc" rowSpan={2}>CÓD. RENIPRESS</td>
                <td className="gc" rowSpan={2}>NOMBRE DE LA IPRESS</td>
                <td className="gc" rowSpan={2}>N° HOJA DE REFERENCIA</td>
              </tr>
              <tr>
                <td className="gl">ITINERANTE</td>
                <td className="mark">{fua.personal_atiende === 'ITINERANTE' ? 'X' : ''}</td>
                <td className="gl">EXTRAMURAL</td>
                <td className="mark">{fua.lugar_atencion === 'EXTRAMURAL' ? 'X' : ''}</td>
                <td className="gl">REFERENCIA</td>
                <td className="mark">{fua.tipo_atencion === 'REFERENCIA' ? 'X' : ''}</td>
              </tr>
              <tr>
                <td className="gl">AISPED</td>
                <td className="mark">{fua.personal_atiende === 'AISPED' ? 'X' : ''}</td>
                <td></td>
                <td></td>
                <td className="mark"></td>
                <td className="gl">EMERGENCIA</td>
                <td className="mark">{fua.tipo_atencion === 'EMERGENCIA' ? 'X' : ''}</td>
                <td className="gc">{fua.ref_cod_renipress || ''}</td>
                <td className="gc">{fua.ref_nombre_ipress || ''}</td>
                <td className="gc">{fua.ref_nro_hoja || ''}</td>
              </tr>
            </tbody>
          </table>

          {/* DEL ASEGURADO */}
          <table className="asegurado">
            <colgroup>
              <col style={{ width: '90px' }} />
              <col style={{ width: '115px' }} />
              <col style={{ width: '55px' }} />
              <col style={{ width: '65px' }} />
              <col style={{ width: '125px' }} />
              <col style={{ width: '90px' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={7}>DEL ASEGURADO</th>
              </tr>
              <tr>
                <th colSpan={2}>IDENTIFICACIÓN</th>
                <th colSpan={3}>CÓDIGO DEL ASEGURADO SIS</th>
                <th colSpan={2}>ASEGURADO DE OTRA IAFAS</th>
              </tr>
              <tr>
                <th>TDI</th>
                <th>N° DOCUMENTO DE IDENTIDAD</th>
                <th>DIRESA/ OTROS</th>
                <th colSpan={2}>NÚMERO</th>
                <td className="gl">INSTITUCIÓN</td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="dato-supabase">{tipoDoc}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="dato-supabase">{numDoc}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="dato-supabase">150</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="dato-supabase">{codigoTdi}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }} className="dato-supabase">{numDoc}</td>
                <td className="gl">COD. SEGURO</td>
                <td>{paciente?.seguro || 'SIS'}</td>
              </tr>
              <tr>
                <th colSpan={7}>APELLIDOS Y NOMBRES</th>
              </tr>
              <tr>
                <td colSpan={7} style={{ fontSize: '10.5px', fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">
                  {paciente?.apellidos_nombres || 'NO ESPECIFICADO'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* SEXO / FECHA / HCL / ETNIA / SALUD MATERNA */}
          <table className="datos">
            <colgroup>
              <col style={{ width: '90px' }} />
              <col style={{ width: '26px' }} />
              <col style={{ width: '115px' }} />
              <col style={{ width: '56px' }} />
              <col style={{ width: '64px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '200px' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={2}>SEXO</th>
                <th>FECHA</th>
                <th>DIA</th>
                <th>MES</th>
                <th>AÑO</th>
                <th>N° DE HISTORIA CLÍNICA</th>
                <th>ETNIA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="gl">MASCULINO</td>
                <td className="mark">{esMasculino ? 'X' : ''}</td>
                <td className="gc" rowSpan={2}>
                  FECHA PROBABLE DE<br />PARTO / FECHA DE<br />PARTO
                </td>
                <td rowSpan={2}></td>
                <td rowSpan={2}></td>
                <td rowSpan={2}></td>
                <td rowSpan={4} style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">
                  {paciente?.hcl || 'S/N'}
                </td>
                <td rowSpan={4} style={{ textAlign: 'center', fontSize: '9px' }}>
                  {paciente?.etnia || ''}
                </td>
              </tr>
              <tr>
                <td className="gl">FEMENINO</td>
                <td className="mark">{esFemenino ? 'X' : ''}</td>
              </tr>
              <tr>
                <td className="gc" rowSpan={2} colSpan={2}>
                  SALUD<br />MATERNA
                </td>
                <td className="gc" rowSpan={2}>
                  FECHA DE<br />NACIMIENTO
                </td>
                <td rowSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }} className="dato-supabase">
                  {diaNac}
                </td>
                <td rowSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }} className="dato-supabase">
                  {mesNac}
                </td>
                <td rowSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }} className="dato-supabase">
                  {anioNac}
                </td>
              </tr>
              <tr></tr>
              <tr>
                <td className="gl">GESTANTE</td>
                <td className="mark"></td>
                <td className="gc" rowSpan={2}>
                  FECHA DE<br />FALLECIMIENTO
                </td>
                <td rowSpan={2}></td>
                <td rowSpan={2}></td>
                <td rowSpan={2}></td>
                <td colSpan={2} rowSpan={4} className="conten">
                  <table className="nested">
                    <tbody>
                      <tr>
                        <td style={{ width: '200px' }}>DNI / CNV / AFILIACIÓN DEL RN 1</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>DNI / CNV / AFILIACIÓN DEL RN 2</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>DNI / CNV / AFILIACIÓN DEL RN 3</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td className="gl">PUERPERA</td>
                <td className="mark"></td>
              </tr>
            </tbody>
          </table>

          {/* DE LA ATENCION */}
          <div className="barra-atencion">DE LA ATENCIÓN</div>

          <div className="banda-atencion">
            <table className="izq">
              <colgroup>
                <col style={{ width: '55px' }} />
                <col style={{ width: '35px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '28px' }} />
                <col style={{ width: '45px' }} />
                <col style={{ width: '45px' }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={3}>FECHA DE ATENCIÓN</th>
                  <th>HORA</th>
                  <th>UPS</th>
                  <th>CÓD.<br />PRESTA -</th>
                  <th>CÓD. PRESTACIÓN<br />(E5) ADICIONAL</th>
                </tr>
                <tr>
                  <th>DIA</th>
                  <th>MES</th>
                  <th>AÑO</th>
                  <td rowSpan={2} style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">
                    {fua.hora || '08:30'}
                  </td>
                  <td rowSpan={2} style={{ fontWeight: 'bold', textAlign: 'center' }}>
                    302303
                  </td>
                  <td rowSpan={2} style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '11px' }} className="dato-supabase">
                    {fua.codigo_prestacional || '056'}
                  </td>
                  <td rowSpan={2}></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">{diaAtn}</td>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">{mesAtn}</td>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">{anioAtn}</td>
                </tr>
                <tr>
                  <td className="gl">REPORTE VINCULADO</td>
                  <th colSpan={3}>CÓD. AUTORIZACIÓN</th>
                  <th colSpan={3}>N° FUA A VINCULAR</th>
                </tr>
                <tr>
                  <td></td>
                  <td colSpan={3}></td>
                  <td colSpan={3}></td>
                </tr>
              </thead>
            </table>

            <table className="der">
              <colgroup>
                <col style={{ width: '16px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '45px' }} />
                <col style={{ width: '45px' }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <td rowSpan={4} className="vert">HOSPITALIZACIÓN</td>
                  <th>FECHA</th>
                  <th>DIA</th>
                  <th>MES</th>
                  <th>AÑO</th>
                </tr>
                <tr>
                  <td className="gc">DE INGRESO</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="gc">DE ALTA</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td className="gc">DE CORTE<br />ADMINISTRATIVO</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </thead>
            </table>
          </div>

          {/* CONCEPTO PRESTACIONAL */}
          <table className="concepto">
            <colgroup>
              <col style={{ width: '85px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '385px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '25px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '25px' }} />
              <col style={{ width: '45px' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={3}>CONCEPTO PRESTACIONAL</th>
                <th colSpan={6}>SEPELIO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="gl">ATENCIÓN<br />DIRECTA</td>
                <td className="mark">X</td>
                <td></td>
                <td className="gc">NATIMUERTO</td>
                <td className="mark"></td>
                <td className="gc">OBITO</td>
                <td className="mark"></td>
                <td className="gc">OTRO</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* DESTINO */}
          <table className="destino">
            <colgroup>
              <col style={{ width: '30px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '40px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '75px' }} />
              <col style={{ width: '20px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '20px' }} />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={18}>DEL DESTINO DEL ASEGURADO/USUARIO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="gl" rowSpan={2}>ALTA</td>
                <td className="mark" rowSpan={2}>{fua.destino === 'ALTA' ? 'X' : ''}</td>
                <td className="gl" rowSpan={2}>CITA</td>
                <td className="mark" rowSpan={2}>X</td>
                <td className="gl" rowSpan={2}>HOSPITALIZACIÓN</td>
                <td className="mark" rowSpan={2}>{fua.destino === 'HOSPITALIZACION' ? 'X' : ''}</td>
                <th colSpan={6}>REFERIDO</th>
                <td className="gl" rowSpan={2}>CONTRA<br />REFERIDO</td>
                <td className="mark" rowSpan={2}>{fua.destino === 'CONTRAREFERIDO' ? 'X' : ''}</td>
                <td className="gl" rowSpan={2}>FALLECIDO</td>
                <td className="mark" rowSpan={2}>{fua.destino === 'FALLECIDO' ? 'X' : ''}</td>
                <td className="gl" rowSpan={2}>CORTE<br />ADMINIS -</td>
                <td className="mark" rowSpan={2}>{fua.destino === 'CORTE_ADMIN' ? 'X' : ''}</td>
              </tr>
              <tr>
                <td className="gl">EMERGENCIA</td>
                <td className="mark">{fua.destino_referido === 'EMERGENCIA' ? 'X' : ''}</td>
                <td className="gl">CONSULTA<br />EXTERNA</td>
                <td className="mark">{fua.destino_referido === 'CONSULTA_EXTERNA' ? 'X' : ''}</td>
                <td className="gl">ACUDIÓ AL<br />DIAGNÓSTICO</td>
                <td className="mark">{fua.destino_referido === 'APOYO_DIAGNOSTICO' ? 'X' : ''}</td>
              </tr>
            </tbody>
          </table>

          {/* REFERENCIA / CONTRARREFERENCIA */}
          <table className="refiere">
            <colgroup>
              <col style={{ width: '290px' }} />
              <col style={{ width: '398px' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={3}>SE REFIERE / CONTRARREFIERE A:</th>
              </tr>
              <tr>
                <th>CÓDIGO RENIPRESS DE LA IPRESS</th>
                <th>NOMBRE DE LA IPRESS A LA QUE SE REFIERE /<br />CONTRARREFIERE</th>
                <th>N° HOJA DE REFER / CONTRARR.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '4px 3px' }} className="dato-supabase">{fua.ref_cod_renipress || ''}</td>
                <td style={{ padding: '4px 3px' }} className="dato-supabase">{fua.ref_nombre_ipress || ''}</td>
                <td style={{ padding: '4px 3px' }} className="dato-supabase">{fua.ref_nro_hoja || ''}</td>
              </tr>
            </tbody>
          </table>

          {/* ACTIVIDADES PREVENTIVAS + VACUNAS */}
          <div className="banda-act">
            <table className="act">
              <colgroup>
                <col style={{ width: '60px' }} />
                <col style={{ width: '35px' }} />
                <col style={{ width: '60px' }} />
                <col style={{ width: '35px' }} />
                <col style={{ width: '14px' }} />
                <col style={{ width: '14px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '35px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '35px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '32px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={12}>ACTIVIDADES PREVENTIVAS Y OTROS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="gc">PESO (Kg)</td>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">{peso}</td>
                  <td className="gc">TALLA (cm)</td>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">{talla}</td>
                  <td className="gc" colSpan={3}>P.A. (mmHg)</td>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">{pa}</td>
                  <td className="gc">IMC(Kg/m2)</td>
                  <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">{imc}</td>
                  <td className="gc">P.AB (cm)</td>
                  <td></td>
                </tr>
                <tr>
                  <th colSpan={2}>DE LA GESTANTE</th>
                  <th colSpan={4}>DEL RECIEN NACIDO</th>
                  <th colSpan={4}>GESTANTE / RN / NIÑO / ADOLESCENTE / ADULTO</th>
                  <th colSpan={2}>JOVEN Y ADULTO</th>
                </tr>
                <tr>
                  <td className="gl" rowSpan={2}>CPN (N°)</td>
                  <td rowSpan={2}></td>
                  <td className="gc">EDAD GEST RN<br />(SEM)</td>
                  <td colSpan={3}></td>
                  <td className="gc">CRED N°</td>
                  <td></td>
                  <td colSpan={2}></td>
                  <td className="gc">EVALUACIÓN<br />INTEGRAL</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={10}></td>
                </tr>
                <tr>
                  <td className="gl">EDAD GEST</td>
                  <td rowSpan={2}></td>
                  <td className="gc" colSpan={2} rowSpan={2}>APGAR</td>
                  <td className="gc" rowSpan={2}>1'</td>
                  <td className="gc" rowSpan={2}>5'</td>
                  <td className="gc">R.N.<br />PREMATURO</td>
                  <td></td>
                  <td className="gc">TAP/ EEDP o<br />TEP/SI</td>
                  <td></td>
                  <td className="gc" colSpan={2}>JOVEN Y ADULTO</td>
                </tr>
                <tr>
                  <td className="gl">ALTURA<br />UTERINA</td>
                  <td className="gc">BAJO PESO AL<br />NACER</td>
                  <td></td>
                  <td className="gc">CONSEJERIA<br />NUTRICIONAL</td>
                  <td></td>
                  <td className="gc">VACAM</td>
                  <td></td>
                </tr>
                <tr>
                  <td className="gl">PARTO<br />VERTICAL</td>
                  <td></td>
                  <td className="gc" colSpan={2}>Corte Tardío de<br />Cordón (2 a 3 min)</td>
                  <td colSpan={2}></td>
                  <td className="gc">Enfer. Congenita<br />Secuela al Nacer</td>
                  <td></td>
                  <td className="gc">CONSEJERIA<br />INTEGRAL</td>
                  <td></td>
                  <td className="gc" colSpan={2}>TAMIZAJE DE SALUD<br />MENTAL</td>
                </tr>
                <tr>
                  <td className="gl" rowSpan={2}>CONTROL<br />PUERP (N°)</td>
                  <td rowSpan={2}></td>
                  <th colSpan={10}>TAMIZAJE DE PATOLOGÍAS CRÓNICAS</th>
                </tr>
                <tr>
                  <td className="gc" colSpan={2}>HB GLICOSILADA<br />(mg/dL)</td>
                  <td></td>
                  <td className="gc" colSpan={3}>Dosaje Albumina Orina<br />(ug/mL)</td>
                  <td></td>
                  <td className="gc" colSpan={2}>DEPURACION CREAT.<br />(mL/min)</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <table className="vac">
              <colgroup>
                <col style={{ width: '90px' }} />
                <col style={{ width: '25px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '25px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '30px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={6}>VACUNAS N° DE DOSIS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="gc">BCG</td><td></td>
                  <td className="gc">INFLUENZA</td><td></td>
                  <td className="gc">ANTIAMARILICA</td><td></td>
                </tr>
                <tr>
                  <td className="gc">DPT</td><td></td>
                  <td className="gc">PAROTID</td><td></td>
                  <td className="gc">ANTINEUMOC</td><td></td>
                </tr>
                <tr>
                  <td className="gc">APO</td><td></td>
                  <td className="gc">RUBEOLA</td><td></td>
                  <td className="gc">ANTITETANICA</td><td></td>
                </tr>
                <tr>
                  <td className="gc">ASA</td><td></td>
                  <td className="gc">ROTAVIRUS</td><td></td>
                  <td className="gc">COMPLETAS<br />EDAD (410)</td><td></td>
                </tr>
                <tr>
                  <td className="gc">SPR</td><td></td>
                  <td className="gc">DT ADULTO</td><td></td>
                  <td className="gc">VPH</td><td></td>
                </tr>
                <tr>
                  <td className="gc">SR</td><td></td>
                  <td className="gc">IPV</td><td></td>
                  <td className="gc">OTRA VACUNA</td><td></td>
                </tr>
                <tr>
                  <td className="gc">HVB</td><td></td>
                  <td className="gc">PENTAVAL</td><td></td>
                  <td className="nota" colSpan={2} rowSpan={2}>
                    GRUPO DE RIESGO HVB: 1. TRAB. SALUD 2. TRAB. SEXUALES 3. HSH 4. PRIV. LIBERTAD 5. FFAA 6. PNP 7. ESTUD. SALUD
                  </td>
                </tr>
                <tr>
                  <td className="gc">RIESGO RVB</td><td></td>
                  <td className="gc"></td><td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* DIAGNÓSTICOS (DINÁMICO, HASTA 10) */}
          <table className="diag">
            <colgroup>
              <col style={{ width: '25px' }} />
              <col style={{ width: '480px' }} />
              <col style={{ width: '24px' }} />
              <col style={{ width: '24px' }} />
              <col style={{ width: '24px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '32px' }} />
              <col style={{ width: '32px' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th colSpan={9}>DIAGNÓSTICOS</th>
              </tr>
              <tr>
                <th rowSpan={3}>N°</th>
                <th rowSpan={3}>DESCRIPCIÓN</th>
                <th colSpan={4}>INGRESO</th>
                <th colSpan={3}>EGRESO</th>
              </tr>
              <tr>
                <th colSpan={3}>TIPO DE DX</th>
                <th rowSpan={2}>CIE - 10</th>
                <th colSpan={2}>TIPO DE DX</th>
                <th rowSpan={2}>CIE - 10</th>
              </tr>
              <tr>
                <th>P</th>
                <th>D</th>
                <th>R</th>
                <th>D</th>
                <th>R</th>
              </tr>
            </thead>
            <tbody>
              {diags.length === 0 ? (
                <tr>
                  <td>1</td>
                  <td style={{ textAlign: 'left' }}></td>
                  <td></td><td></td><td></td>
                  <td></td>
                  <td></td><td></td><td></td>
                </tr>
              ) : (
                diags.slice(0, 10).map((d, index) => {
                  const tipo = d.tipo_ingreso || d.tipo || 'D';
                  return (
                    <tr key={index}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ textAlign: 'left' }} className="dato-supabase">{d.descripcion}</td>
                      <td style={{ textAlign: 'center' }}>{tipo === 'P' ? 'X' : ''}</td>
                      <td style={{ textAlign: 'center' }}>{tipo === 'D' ? 'X' : ''}</td>
                      <td style={{ textAlign: 'center' }}>{tipo === 'R' ? 'X' : ''}</td>
                      <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">
                        {d.cie_ingreso || d.codigo}
                      </td>
                      <td style={{ textAlign: 'center' }}>{d.tipo_egreso === 'D' ? 'X' : ''}</td>
                      <td style={{ textAlign: 'center' }}>{d.tipo_egreso === 'R' ? 'X' : ''}</td>
                      <td style={{ textAlign: 'center' }}>{d.cie_egreso || ''}</td>
                    </tr>
                  );
                })
              )}
              {/* Filas vacías hasta completar al menos 3 filas para formato estético */}
              {diags.length > 0 && diags.length < 3 && Array.from({ length: 3 - diags.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td style={{ textAlign: 'center' }}>{diags.length + i + 1}</td>
                  <td></td>
                  <td></td><td></td><td></td>
                  <td></td>
                  <td></td><td></td><td></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* RESPONSABLE */}
          <table className="resp">
            <colgroup>
              <col style={{ width: '180px' }} />
              <col style={{ width: '500px' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th>N° DE DNI</th>
                <th>NOMBRE DEL RESPONSABLE DE LA ATENCIÓN</th>
                <th>N° DE COLEGIATURA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '4px 3px', fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">
                  {profesional?.dni || '42567891'}
                </td>
                <td style={{ padding: '4px 3px', fontWeight: 'bold', textAlign: 'left', paddingLeft: '10px' }} className="dato-supabase">
                  {profesional?.apellidos_nombres || 'DRA. MARÍA ELENA VÁSQUEZ RÍOS'}
                </td>
                <td style={{ padding: '4px 3px', fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">
                  {profesional?.colegiatura || 'CMP 048291'}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="final">
            <colgroup>
              <col style={{ width: '180px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '120px' }} />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="gl">RESPONSABLE DE LA ATENCIÓN</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>1</td>
                <td className="gc">ESPECIALIDAD</td>
                <td style={{ fontWeight: 'bold', textAlign: 'left', paddingLeft: '5px' }} className="dato-supabase">
                  {profesional?.especialidad || 'PSIQUIATRÍA / SALUD MENTAL'}
                </td>
                <td className="gc">N° RNE</td>
                <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">029412</td>
                <td className="gc">EGRESADO</td>
                <td style={{ fontWeight: 'bold', textAlign: 'center' }} className="dato-supabase">SI</td>
              </tr>
            </tbody>
          </table>

          {/* FIRMAS ANVERSO */}
          <table className="firmas" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
            <tbody>
              <tr>
                <td colSpan={3} style={{ fontSize: '6.5px', fontWeight: 'bold', padding: '3px 5px', lineHeight: 1.35, borderBottom: '1px solid #000' }}>
                  1. MEDICO 2. FARMACEUTICO 3. CIRUJANO DENTISTA 4. BIOLOGO 5. OBSTETRIZ 6. ENFERMERA 7. TRABAJADORA SOCIAL 8. PSICOLOGO 9. TECNOLOGO MEDICO<br />
                  10. NUTRICION 11. TECNICO ENFERMERIA 12. AUXILIAR DE ENFERMERIA 13. OTRO
                </td>
              </tr>
              <tr>
                <td style={{ width: '40%', textAlign: 'center', padding: '12px 10px', borderRight: '1px solid #000', verticalAlign: 'bottom' }}>
                  <div style={{ borderBottom: '1px solid #000', width: '85%', margin: '0 auto 4px' }}></div>
                  <div style={{ fontSize: '9px', fontWeight: 'bold' }}>FIRMA Y SELLO DEL RESPONSABLE DE LA ATENCION</div>
                </td>
                <td style={{ width: '35%', padding: '8px 10px', borderRight: '1px solid #000', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>FIRMA</div>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>
                    ASEGURADO <span style={{ display: 'inline-block', width: '30px', height: '13px', border: '1px solid #000', verticalAlign: 'middle' }}></span>
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}>
                    REPRESENTAN <span style={{ display: 'inline-block', width: '30px', height: '13px', border: '1px solid #000', verticalAlign: 'middle' }}></span>
                  </div>
                  <div style={{ borderBottom: '1px solid #000', width: '85%', margin: '4px 0' }}></div>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>REPRESENTANTE DEL ASEGURADO:</div>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '2px' }}>
                    NOMBRES Y APELLIDOS <span style={{ display: 'inline-block', width: '120px', borderBottom: '1px solid #000' }}></span>
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>
                    DNI o CE DEL REPRESENTANTE: <span style={{ display: 'inline-block', width: '100px', borderBottom: '1px solid #000' }}></span>
                  </div>
                </td>
                <td style={{ width: '25%', textAlign: 'center', padding: '8px 8px', verticalAlign: 'top' }}>
                  <div className="huella-box" style={{ width: '95px', height: '70px', border: '1px solid #000', margin: '0 auto 4px' }}></div>
                  <div style={{ fontSize: '8px' }}>
                    Huella Digital del Asegurado o<br />del Representante
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SALTO DE PÁGINA (SOLO IMPRESIÓN PARA DUPLEX) */}
        <div className="page-break"></div>

        {/* ========================================================================= */}
        {/* CARA B: REVERSO */}
        {/* ========================================================================= */}
        <div
          id="cara-reverso"
          className={`hoja-reverso ${caraActiva === 'reverso' ? 'block' : 'hidden'} print:!block`}
        >
          {/* FRAGMENTO 1 */}
          <div className="fila-inicial">
            <div className="titulo-terapeutica">
              TERAPEUTICA, INSUMOS, PROCEDIMIENTOS Y APOYO AL DIAGNOSTICO
            </div>
            <table className="num-atencion">
              <thead>
                <tr>
                  <th colSpan={3}>FORMATO DE ATENCIÓN N°</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="c1">{renaiess}</td>
                  <td className="c2">{anioFua}</td>
                  <td className="c3">{correlativo}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PRODUCTOS FARMACEUTICOS / MEDICAMENTOS */}
          <div className="seccion-barra">PRODUCTOS FARMACEUTICOS / MEDICAMENTOS</div>

          <table className="tabla-reverso medicamentos">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="th-left">CÓDIGO SISMED</th>
                <th>NOMBRE</th>
                <th>FF</th>
                <th>CONCENTR</th>
                <th>PRES</th>
                <th>ENTR</th>
                <th>DX</th>
              </tr>
            </thead>
            <tbody>
              {medicamentos.length > 0 ? (
                <>
                  {medicamentos.slice(0, 10).map((m, idx) => (
                    <tr key={idx}>
                      <td className="td-center dato-supabase">{m.codigo_sismed}</td>
                      <td className="td-left dato-supabase">{m.descripcion}</td>
                      <td className="td-center dato-supabase">{m.forma_farmaceutica || 'TAB'}</td>
                      <td className="td-center dato-supabase">{m.concentracion || '10mg'}</td>
                      <td className="td-center dato-supabase">{m.cantidad_prescrita || m.cantidad}</td>
                      <td className="td-center dato-supabase">{m.cantidad_entregada || m.cantidad}</td>
                      <td className="td-center dato-supabase">{m.diagnostico_relacionado || '1'}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 10 - medicamentos.length) }).map((_, i) => (
                    <tr key={`empty-med-${i}`}>
                      <td className="td-empty"></td>
                      <td className="td-empty"></td>
                      <td className="td-empty"></td>
                      <td className="td-empty"></td>
                      <td className="td-empty"></td>
                      <td className="td-empty"></td>
                      <td className="td-empty"></td>
                    </tr>
                  ))}
                </>
              ) : (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`empty-med-${i}`}>
                    <td className="td-empty"></td>
                    <td className="td-empty"></td>
                    <td className="td-empty"></td>
                    <td className="td-empty"></td>
                    <td className="td-empty"></td>
                    <td className="td-empty"></td>
                    <td className="td-empty"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* DISPOSITIVOS MÉDICOS */}
          <div className="seccion-barra">DISPOSITIVOS MÉDICOS / PRODUCTOS SANITARIOS</div>

          <table className="tabla-reverso dispositivos">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="th-left">CÓDIGO</th>
                <th>NOMBRE</th>
                <th>PR</th>
                <th>CARACT</th>
                <th>PRES</th>
                <th>ENTR</th>
                <th>DX</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td></tr>
              <tr><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td></tr>
            </tbody>
          </table>

          {/* PROCEDIMIENTOS */}
          <div className="seccion-barra">PROCEDIMIENTOS / DIAGNOSTICO POR IMÁGENES / LABORATORIO</div>

          <table className="tabla-reverso procedimientos">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="th-left">CÓDIGO</th>
                <th>NOMBRE</th>
                <th>IND</th>
                <th>EJE</th>
                <th>DX</th>
                <th>RES</th>
              </tr>
            </thead>
            <tbody>
              {procedimientos.slice(0, 8).map((proc, i) => (
                <tr key={i}>
                  <td className="td-center dato-supabase">{proc.cpms}</td>
                  <td className="td-left dato-supabase">{proc.descripcion}</td>
                  <td className="td-center dato-supabase">{proc.ind || '1'}</td>
                  <td className="td-center dato-supabase">{proc.eje || '1'}</td>
                  <td className="td-center dato-supabase">{proc.dx || '1'}</td>
                  <td className="td-center dato-supabase">{proc.res || ''}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 8 - procedimientos.length) }).map((_, i) => (
                <tr key={`empty-proc-${i}`}>
                  <td className="td-empty"></td>
                  <td className="td-empty"></td>
                  <td className="td-empty"></td>
                  <td className="td-empty"></td>
                  <td className="td-empty"></td>
                  <td className="td-empty"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* SUB COMPONENTE PRESTACIONAL */}
          <div className="seccion-barra">SUB COMPONENTE PRESTACIONAL (PROCEDIMIENTOS)</div>

          <table className="tabla-reverso subcomponente">
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '39%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '4%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="th-left">CÓDIGO</th>
                <th>NOMBRE</th>
                <th>CARACT</th>
                <th>INDI<br />PRES</th>
                <th>EJE/<br />ENTR</th>
                <th>DX</th>
                <th>RES</th>
                <th>N°<br />TICKET</th>
                <th>PO</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td></tr>
              <tr><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td><td className="td-empty"></td></tr>
            </tbody>
          </table>

          {/* OBSERVACIONES */}
          <div className="seccion-barra">OBSERVACIONES</div>
          <table className="tabla-reverso observaciones">
            <tbody>
              <tr>
                <td className="td-empty" style={{ padding: '4px 6px', fontSize: '9px', verticalAlign: 'top' }}>
                  {fua.observaciones ? `1. ${fua.observaciones}` : ''}
                </td>
              </tr>
              <tr><td className="td-empty"></td></tr>
              <tr><td className="td-empty"></td></tr>
              <tr><td className="td-empty"></td></tr>
            </tbody>
          </table>

          {/* FIRMAS DEL REVERSO */}
          <table className="tabla-reverso firmas-reverso">
            <tbody>
              <tr>
                <td className="firma-upss">
                  <div className="linea-firma"></div>
                  <div className="f-titulo">Firma y Sello del Responsable de UPSS de apoyo diagnóstico</div>
                  <div className="f-sub">(Procedimiento y/o Farmacia y/o Laboratorio o el que corresponda)</div>
                </td>
                <td className="firma-asegurado">
                  <div className="f-firma">FIRMA</div>
                  <div className="f-row">
                    <span className="f-label">ASEGURADO</span>
                    <span className="boxf"></span>
                  </div>
                  <div className="f-row">
                    <span className="f-label">REPRESENTANTE</span>
                    <span className="boxf"></span>
                  </div>
                  <div className="linea-firma" style={{ width: '100%', margin: '8px 0' }}></div>
                  <div className="f-row2">
                    NOMBRES Y APELLIDOS <span className="linea-inline" style={{ width: '55%' }}></span>
                  </div>
                  <div className="f-row2" style={{ marginTop: '10px' }}>
                    DNI o CE DEL REPRESENTANTE <span className="linea-inline" style={{ width: '45%' }}></span>
                  </div>
                </td>
                <td className="firma-huella">
                  <div className="huella-box"></div>
                  <div className="f-sub">Huella Digital del<br />Asegurado o Representante</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ESTILOS EXACTOS MINSA/SIS DEL TEMPLATE */}
      <style>{`
        /* ===== ESTILOS BASE FUA ===== */
        .hoja-anverso, .hoja-reverso {
          width: 978px;
          max-width: 100%;
          margin: 0 auto;
          border-top: 1px solid #000;
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.15;
          box-sizing: border-box;
        }

        .encabezado, .barra-fua, .zona-numero, .seccion-barra {
          border-left: 1px solid #000;
          border-right: 1px solid #000;
        }

        .encabezado {
          display: flex;
          align-items: stretch;
          height: 40px;
          border-bottom: 2px solid #000;
        }

        .caja-escudo {
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          border-right: 1px solid #000;
        }

        .caja-peru {
          background: #000;
          color: #fff;
          font-weight: bold;
          font-size: 10.5px;
          letter-spacing: .5px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 9px;
        }

        .caja-minsa {
          background: #595959;
          color: #fff;
          font-weight: bold;
          font-size: 10px;
          line-height: 1.15;
          display: flex;
          align-items: center;
          padding: 0 8px;
        }

        .caja-sis {
          background: #b3b3b3;
          color: #fff;
          font-weight: bold;
          font-size: 10px;
          display: flex;
          align-items: center;
          padding: 0 12px;
        }

        .anexo {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: bold;
        }

        .barra-fua {
          background: #d9d9d9;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          padding: 2px 0;
          border-bottom: 1px solid #000;
        }

        .zona-numero {
          display: flex;
          justify-content: center;
          padding-bottom: 5px;
          border-bottom: 3px solid #000;
        }

        table.numero {
          border-collapse: collapse;
          width: 306px;
        }

        table.numero th {
          background: #d9d9d9;
          border: 1px solid #000;
          font-size: 9px;
          padding: 2px 0;
          text-align: center;
        }

        table.numero td {
          border: 1px solid #000;
          padding: 4px 2px;
        }

        table.numero td.c1 { width: 105px; }
        table.numero td.c2 { width: 60px; }
        table.numero td.c3 { width: 141px; }

        .seccion-barra {
          background: #d9d9d9;
          text-align: center;
          font-weight: bold;
          font-size: 9px;
          padding: 2px 0;
          border-bottom: 1px solid #000;
        }

        table.ipress { width: 100%; border-collapse: collapse; }
        table.ipress th { background: #d9d9d9; border: 1px solid #000; font-size: 9px; padding: 3px 4px; }
        table.ipress th.col-codigo { width: 25%; text-align: left; }
        table.ipress th.col-nombre { width: 75%; text-align: center; }
        table.ipress td { border: 1px solid #000; padding: 4px 2px; }

        table.atencion, table.asegurado, table.datos, table.izq, table.der, table.concepto,
        table.destino, table.refiere, table.act, table.vac, table.diag, table.resp, table.final {
          width: 100%;
          border-collapse: collapse;
        }

        table.asegurado, table.datos, .barra-atencion, table.act, table.vac, table.diag, table.resp, table.final {
          border-top: 3px solid #000;
        }

        table.atencion th, table.atencion td, table.asegurado th, table.asegurado td,
        table.datos th, table.datos td, table.izq th, table.izq td, table.der th, table.der td,
        table.concepto th, table.concepto td, table.destino th, table.destino td,
        table.refiere th, table.refiere td, table.act th, table.act td,
        table.vac th, table.vac td, table.diag th, table.diag td,
        table.resp th, table.resp td, table.final th, table.final td {
          border: 1px solid #000;
          font-size: 9px;
          padding: 1px 3px;
          line-height: 1.15;
        }

        table.atencion th, table.asegurado th, table.datos th, table.izq th, table.der th,
        table.concepto th, table.destino th, table.refiere th, table.act th, table.vac th,
        table.diag th, table.resp th, table.final th, td.gc {
          background: #d9d9d9;
          font-weight: bold;
          text-align: center;
        }

        td.gl { background: #d9d9d9; font-weight: bold; text-align: left; }
        td.mark { padding: 0; text-align: center; font-weight: bold; font-size: 9.5px; }

        .dato-supabase { font-size: 11px !important; }

        .banda-atencion, .banda-act {
          display: flex;
          align-items: stretch;
          border-left: 1px solid #000;
          border-right: 1px solid #000;
        }

        .banda-atencion .izq tr > *:first-child, .banda-act .act tr > *:first-child { border-left: 0; }
        .banda-atencion .der tr > *:last-child,  .banda-act .vac tr > *:last-child  { border-right: 0; }
        .banda-atencion .izq { width: 55%; }
        .banda-atencion .der { width: 45%; }
        .banda-act .act { width: 63%; }
        .banda-act .vac { width: 37%; }

        table.act th, table.act td { font-size: 8.5px; padding: 1px 3px; }
        table.vac th, table.vac td { font-size: 8px; padding: 1px 3px; }

        td.vert {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-weight: bold;
          font-size: 8px;
          padding: 0;
          width: 14px;
          max-width: 14px;
          white-space: nowrap;
          text-align: center;
          background: #fff;
          border-left: 0;
        }

        td.conten { padding: 0; }
        table.nested { width: 100%; border-collapse: collapse; }
        table.nested td { border: 0; border-bottom: 1px solid #000; font-size: 8.5px; padding: 2px 3px; }
        table.nested tr:last-child td { border-bottom: 0; }
        table.nested td:first-child { border-right: 1px solid #000; background: #d9d9d9; font-weight: bold; text-align: center; }
        td.nota { font-size: 6px; text-align: left; line-height: 1.15; }

        .barra-atencion {
          background: #d9d9d9;
          text-align: center;
          font-weight: bold;
          font-size: 9px;
          padding: 2px 0;
          border-bottom: 1px solid #000;
          border-left: 1px solid #000;
          border-right: 1px solid #000;
        }

        .page-break {
          page-break-after: always;
          break-after: page;
          height: 0;
          border: none;
          margin: 0;
          padding: 0;
        }

        /* ===== REVERSO ===== */
        .fila-inicial {
          display: flex;
          align-items: center;
          border-left: 1px solid #000;
          border-right: 1px solid #000;
          padding: 6px 0;
        }

        .titulo-terapeutica {
          flex: 1;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          padding: 0 10px;
        }

        table.num-atencion {
          width: 300px;
          border-collapse: collapse;
          margin-right: 4px;
        }

        table.num-atencion th {
          background: #d9d9d9;
          border: 1px solid #000;
          font-size: 8.5px;
          padding: 2px 0;
          text-align: center;
        }

        table.num-atencion td {
          border: 1px solid #000;
          padding: 4px 2px;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 3px;
          text-align: center;
        }

        table.num-atencion td.c1 { width: 90px; }
        table.num-atencion td.c2 { width: 60px; }
        table.num-atencion td.c3 { width: 150px; }

        .tabla-reverso { width: 100%; border-collapse: collapse; }
        .tabla-reverso th, .tabla-reverso td { border: 1px solid #000; font-size: 9px; padding: 2px 3px; line-height: 1.15; }
        .tabla-reverso th { background: #d9d9d9; font-weight: bold; text-align: center; }
        .tabla-reverso th.th-left { text-align: left; padding-left: 6px; }
        .tabla-reverso td.td-center { text-align: center; }
        .tabla-reverso td.td-left { text-align: left; }
        .tabla-reverso td.td-empty { height: 20px; }
        table.observaciones td.td-empty { height: 18px; }

        table.firmas-reverso {
          border-left: 1px solid #000;
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
        }

        table.firmas-reverso td {
          border: none !important;
          vertical-align: top;
          padding: 8px;
        }

        .firma-upss {
          width: 38%;
          text-align: center;
          padding: 10px 14px 12px !important;
          vertical-align: bottom !important;
        }

        .firma-asegurado { width: 42%; padding: 8px 10px !important; }
        .firma-huella { width: 20%; text-align: center; padding: 6px 8px !important; }

        .linea-firma {
          border-bottom: 1px solid #000;
          height: 1px;
          width: 95%;
          margin: 0 auto 4px;
        }

        .linea-inline {
          display: inline-block;
          border-bottom: 1px solid #000;
          height: 1px;
        }

        .f-titulo { font-size: 8.5px; font-weight: bold; }
        .f-sub { font-size: 8px; }
        .f-firma { font-size: 8.5px; font-weight: bold; margin-bottom: 5px; }
        .f-row { display: flex; align-items: center; margin-bottom: 4px; }
        .f-label { width: 60%; font-size: 8.5px; font-weight: bold; }
        .f-row2 { font-size: 8.5px; font-weight: bold; white-space: nowrap; }
        .boxf { display: inline-block; width: 55px; height: 15px; border: 1px solid #000; background: #fff; }
        .huella-box { width: 90px; height: 100px; border: 1px solid #000; margin: 0 auto 5px; }

        /* ===== IMPRESIÓN OFICIAL DUPLEX (A4) ===== */
        @page {
          size: A4 portrait;
          margin: 0.8cm;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: #fff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }

          #cara-anverso, #cara-reverso {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          .page-break {
            page-break-after: always;
            break-after: page;
            height: 0;
            border: none;
            margin: 0;
            padding: 0;
          }

          #cara-anverso.z1 { zoom: 0.90; width: 111.1%; }
          #cara-anverso.z2 { zoom: 0.87; width: 114.9%; }
          #cara-anverso.z3 { zoom: 0.85; width: 117.6%; }
          #cara-anverso.z4 { zoom: 0.83; width: 120.5%; }
          #cara-anverso.z5 { zoom: 0.80; width: 125%; }
          #cara-reverso { zoom: 0.92; width: 108.7%; }
        }

        @supports not (zoom: 1) {
          @media print {
            #cara-anverso, #cara-reverso { width: 100% !important; }
          }
        }
      `}</style>
    </div>
  );
};
