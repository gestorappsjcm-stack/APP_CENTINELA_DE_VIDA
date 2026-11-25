import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

interface ProfesionalCatalogItem {
  id: string;
  apellidos_nombres: string;
  dni?: string;
  profesion?: string;
  consultorioAsignado?: string;
}

interface ConsultorioCatalogItem {
  id: string;
  codigo: string;
  nombre: string;
}

interface ParsePdfRequestBody {
  pdfBase64?: string;
  fileName?: string;
  anioHint?: number;
  mesHint?: number;
  profesionales?: ProfesionalCatalogItem[];
  consultorios?: ConsultorioCatalogItem[];
}

type VercelLikeRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
};

type VercelLikeResponse = ServerResponse & {
  status?: (code: number) => VercelLikeResponse;
  json?: (data: unknown) => void;
};

const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25 MB

const sendJson = (res: VercelLikeResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

const readRequestBody = async (req: VercelLikeRequest): Promise<ParsePdfRequestBody> => {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return req.body.trim() ? (JSON.parse(req.body) as ParsePdfRequestBody) : {};
    }
    if (Buffer.isBuffer(req.body)) {
      const str = req.body.toString('utf8').trim();
      return str ? (JSON.parse(str) as ParsePdfRequestBody) : {};
    }
    if (typeof req.body === 'object') {
      return req.body as ParsePdfRequestBody;
    }
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw Object.assign(new Error('El archivo PDF excede el límite permitido (25 MB).'), {
        status: 413,
      });
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as ParsePdfRequestBody;
};

const getGeminiClient = () => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractApiErrorInfo = (err: any): { status: number; message: string } => {
  let status = Number(err?.status || err?.code || err?.error?.code || 0);
  let rawMsg = String(err?.message || err?.error?.message || 'Error procesando el PDF con Gemini.');

  if (rawMsg.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error) {
        status = status || Number(parsed.error.code || 0);
        rawMsg = String(parsed.error.message || rawMsg);
      }
    } catch {
      // Keep original rawMsg
    }
  }

  return { status, message: rawMsg };
};

const isTransientOverloadError = (err: any): boolean => {
  const { status, message } = extractApiErrorInfo(err);
  const lower = message.toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    lower.includes('high demand') ||
    lower.includes('unavailable') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('rate limit')
  );
};

async function generateWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (!isTransientOverloadError(err) || attempt === maxRetries) {
        throw err;
      }
      await sleep(800 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método no permitido. Utiliza POST para analizar el PDF.' });
    return;
  }

  try {
    let body: ParsePdfRequestBody;
    try {
      body = await readRequestBody(req);
    } catch (parseErr: any) {
      const status = Number(parseErr?.status || 400);
      sendJson(res, status, {
        error: parseErr?.message || 'Cuerpo de solicitud JSON inválido.',
      });
      return;
    }

    const rawBase64 = String(body.pdfBase64 || '')
      .replace(/^data:application\/pdf;base64,/i, '')
      .trim();

    if (!rawBase64) {
      sendJson(res, 400, { error: 'No se recibió el contenido del archivo PDF.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      const vercelEnv = process.env.VERCEL_ENV || 'servidor';
      sendJson(res, 500, {
        error:
          `No se encontró la variable GEMINI_API_KEY en el entorno "${vercelEnv}". ` +
          (vercelEnv === 'preview'
            ? 'Edita la variable en Vercel para incluir también el entorno Preview y haz Redeploy.'
            : 'Si acabas de agregarla en Vercel Production, ejecuta un Redeploy en Deployments para que este despliegue la cargue.'),
      });
      return;
    }

    const profesionalesLista = Array.isArray(body.profesionales) ? body.profesionales : [];
    const consultoriosLista = Array.isArray(body.consultorios) ? body.consultorios : [];

    const now = new Date();
    const anioHintNum = Number(body.anioHint);
    const mesHintNum = Number(body.mesHint);
    const anioDefault =
      Number.isInteger(anioHintNum) && anioHintNum >= 2020 && anioHintNum <= 2040
        ? anioHintNum
        : now.getFullYear();
    const mesDefault =
      Number.isInteger(mesHintNum) && mesHintNum >= 1 && mesHintNum <= 12
        ? mesHintNum
        : now.getMonth() + 1;

    const profesionalesResumen = profesionalesLista
      .slice(0, 120)
      .map(
        (p) =>
          `- id="${String(p.id || '')}" | nombre="${String(p.apellidos_nombres || '')}" | dni="${String(p.dni || '')}" | profesion="${String(p.profesion || '')}" | consultorio="${String(p.consultorioAsignado || '')}"`
      )
      .join('\n');

    const consultoriosResumen = consultoriosLista
      .slice(0, 50)
      .map(
        (c) =>
          `- id="${String(c.id || '')}" | codigo="${String(c.codigo || '')}" | nombre="${String(c.nombre || '')}"`
      )
      .join('\n');

    const safeFileName = String(body.fileName || 'rol_turnos.pdf').slice(0, 120);

    const promptText = `Analiza visualmente este PDF de "Rol de Turnos / Rol de Trabajo" de un Centro de Salud Mental Comunitario (CSMC / MINSA Perú).
Extrae todos los profesionales/personal que aparecen en el cuadro y sus turnos REALES día por día del mes (columnas 1 a 31).

Contexto de referencia (si el PDF no especifica año o mes, usa por defecto año=${anioDefault}, mes=${mesDefault}):
Nombre archivo: ${safeFileName}

Catálogo de profesionales registrados en el sistema (llena profesionalIdSugerido SOLO si apellidos Y nombres coinciden inequívocamente; si solo coincide un apellido como "VENTURA", déjalo vacío ""):
${profesionalesResumen || '(sin catálogo previo)'}

Catálogo de consultorios registrados (úsalos para llenar consultorioCodigoSugerido usando el campo "codigo"):
${consultoriosResumen || '(sin catálogo previo)'}

Reglas CRÍTICAS de lectura visual e interpretación (PROHIBIDO INVENTAR O ADIVINAR):
1. ALINEACIÓN VISUAL EXACTA: Lee la tabla respetando estrictamente la posición vertical de cada celda respecto a los encabezados numéricos 1..31 y la fila superior de días (D, L, M, X/M, J, V, S). Las celdas vacías o columnas rojas de domingo NO deben desplazar las letras siguientes hacia la izquierda ni hacia la derecha.
2. PROHIBIDO RELLENAR AL AZAR: Si una celda está visualmente en blanco y NO está cubierta por una barra horizontal de vacaciones/licencia, OMITE ese día por completo. NUNCA extrapoles, completes ni inventes turnos para igualar 150h ni para rellenar huecos.
3. VERIFICACIÓN CON LA COLUMNA "HORAS": En las columnas de la derecha figura "HORAS" (ej. 150, 78, 06, 00). Cada M o T suma 6h, cada MT (M/T) suma 12h, cada N suma 12h, y las barras de VACACIONES / LICENCIA / L / D / F suman 0h. Verifica antes de emitir cada fila que la suma de horas de sus turnos extraídos coincida exactamente con su columna "HORAS" (por ejemplo, si HORAS = 78 solo puede haber 13 turnos de 6h + los días de la barra VACACIONES 2026). No incluyas el número de HORAS, N° ni CONDICION LABORAL como turnos.
4. CELDAS O BARRAS COMBINADAS HORIZONTALMENTE: Si una fila tiene una barra de color o celda combinada horizontalmente (por ejemplo "VACACIONES", "VACACIONES 2026", "LICENCIA POR MATERNIDAD", "DESCANSO MEDICO"), identifica con precisión el primer día numérico y el último día numérico cubiertos visualmente por esa barra (donde empiezan y terminan sus bordes izquierdo y derecho respecto a los encabezados 1..31) y genera tipoTurno = "VACACIONES" con codigoOriginal exacto para CADA día dentro de ese rango, SIN poner M ni T en ninguno de esos días de vacaciones/licencia.
5. CÓDIGOS DE TURNO CSMC/MINSA:
   - M, MAÑANA, AM, M1, M2, 08-14 -> tipoTurno = "MAÑANA"
   - T, TARDE, PM, T1, T2, 14-20 -> tipoTurno = "TARDE"
   - MT, M/T, M-T, M+T, MAÑANA Y TARDE, GD, G, 12H, 08-20 -> tipoTurno = "MAÑANA_TARDE"
   - L, FR, LIBRE, H, ROTACION HOSPITAL -> tipoTurno = "LIBRE" (conservando codigoOriginal, ej. "H" o "L")
   - F, FER, FERIADO -> tipoTurno = "FERIADO"
   - D, DESC, DESCANSO, DOM -> tipoTurno = "DESCANSO"
   - V, VAC, VACACIONES, LIC, LICENCIA, MATERNIDAD, PERM, DM -> tipoTurno = "VACACIONES"
   - N, NOCHE -> tipoTurno = "OTRO" (conserva codigoOriginal exacto, ej. "N")`;

    const buildRequestParams = (modelName: string) => ({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: rawBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction:
          'Eres un lector OCR tabular de alta precisión para cuadros de Rol de Turnos MINSA/CSMC. Extrae ÚNICAMENTE lo que está impreso en cada columna 1..31 y verifica la suma contra la columna HORAS. Nunca inventes ni completes celdas vacías al azar.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            anio: {
              type: Type.INTEGER,
              description: 'Año del rol de turnos detectado en el documento (ej. 2026).',
            },
            mes: {
              type: Type.INTEGER,
              description: 'Mes del 1 al 12 detectado en el documento.',
            },
            observaciones: {
              type: Type.STRING,
              description:
                'Breve resumen de lo detectado o notas relevantes del PDF (máximo 2 oraciones).',
            },
            profesionalesDetectados: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nombrePdf: {
                    type: Type.STRING,
                    description: 'Apellidos y nombres tal como aparecen en el PDF.',
                  },
                  dniPdf: {
                    type: Type.STRING,
                    description: 'DNI o documento si aparece en el PDF, o cadena vacía.',
                  },
                  profesionalIdSugerido: {
                    type: Type.STRING,
                    description:
                      'ID del profesional del catálogo que mejor coincide, o cadena vacía si no coincide.',
                  },
                  consultorioCodigoSugerido: {
                    type: Type.STRING,
                    description:
                      'Código de consultorio (ej. C-PSI-01) si se deduce del área/servicio del PDF, o cadena vacía.',
                  },
                  turnos: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        dia: {
                          type: Type.INTEGER,
                          description: 'Número de día del mes (1 a 31).',
                        },
                        codigoOriginal: {
                          type: Type.STRING,
                          description:
                            'Texto o sigla original en la celda (ej. M, T, MT, M/T, H, N, L, D, VACACIONES).',
                        },
                        tipoTurno: {
                          type: Type.STRING,
                          description:
                            'Clasificación normalizada: MAÑANA | TARDE | MAÑANA_TARDE | LIBRE | DESCANSO | VACACIONES | FERIADO | OTRO',
                        },
                        consultorioCodigo: {
                          type: Type.STRING,
                          description:
                            'Código de consultorio específico para ese día si difiere, o cadena vacía.',
                        },
                      },
                      required: ['dia', 'codigoOriginal', 'tipoTurno'],
                    },
                  },
                },
                required: ['nombrePdf', 'turnos'],
              },
            },
          },
          required: ['anio', 'mes', 'profesionalesDetectados'],
        },
      },
    });

    let response;
    try {
      response = await generateWithRetry(
        () => ai.models.generateContent(buildRequestParams('gemini-4-hydrogen')),
        1
      );
    } catch (primaryErr: any) {
      if (!isTransientOverloadError(primaryErr)) {
        throw primaryErr;
      }
      response = await generateWithRetry(
        () => ai.models.generateContent(buildRequestParams('gemini-3.1-flash-lite')),
        1
      );
    }

    const rawText = (response.text || '').trim();
    if (!rawText) {
      sendJson(res, 502, { error: 'El modelo no devolvió contenido al analizar el PDF.' });
      return;
    }

    const parsed = JSON.parse(rawText);
    sendJson(res, 200, parsed);
  } catch (err: any) {
    console.error('Error en /api/turnos/parse-pdf:', err);
    const { status, message: rawMsg } = extractApiErrorInfo(err);
    const lower = rawMsg.toLowerCase();

    if (status === 403 || (status === 400 && lower.includes('api key'))) {
      sendJson(res, 403, {
        error:
          'Clave de API inválida o sin permisos. Verifica GEMINI_API_KEY en la configuración del servidor.',
      });
      return;
    }

    if (status === 429) {
      sendJson(res, 429, {
        error:
          'Límite de solicitudes alcanzado temporalmente en Gemini API. Espera unos segundos e intenta nuevamente.',
      });
      return;
    }

    if (status === 503 || lower.includes('high demand') || lower.includes('unavailable')) {
      sendJson(res, 503, {
        error:
          'El servicio de análisis de PDF está experimentando alta demanda temporal (503). Espera unos segundos y pulsa "Reintentar análisis".',
      });
      return;
    }

    sendJson(res, status >= 400 && status < 600 ? status : 500, {
      error: rawMsg,
    });
  }
}
