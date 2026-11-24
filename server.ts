import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

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
  let lastErr: any;
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

const app = express();
app.use(express.json({ limit: '25mb' }));

app.post('/api/turnos/parse-pdf', async (req, res) => {
  try {
    const body = (req.body || {}) as ParsePdfRequestBody;
    const rawBase64 = String(body.pdfBase64 || '')
      .replace(/^data:application\/pdf;base64,/i, '')
      .trim();

    if (!rawBase64) {
      res.status(400).json({ error: 'No se recibió el contenido del archivo PDF.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(500).json({
        error:
          'No se encontró la variable GEMINI_API_KEY en el servidor local/AI Studio. Configura la clave en Settings > Secrets de AI Studio para habilitar la lectura inteligente de PDF.',
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
Extrae todos los profesionales/personal que aparecen en el cuadro y sus turnos asignados día por día del mes (columnas 1 a 31).

Contexto de referencia (si el PDF no especifica año o mes, usa por defecto año=${anioDefault}, mes=${mesDefault}):
Nombre archivo: ${safeFileName}

Catálogo de profesionales registrados en el sistema (úsalos para llenar profesionalIdSugerido cuando coincida nombre o DNI):
${profesionalesResumen || '(sin catálogo previo)'}

Catálogo de consultorios registrados (úsalos para llenar consultorioCodigoSugerido usando el campo "codigo"):
${consultoriosResumen || '(sin catálogo previo)'}

Reglas críticas de lectura de tabla e interpretación:
1. ALINEACIÓN VISUAL EXACTA: Lee la tabla respetando estrictamente la posición vertical de cada celda respecto a los encabezados numéricos 1..31. Las celdas en blanco (por ejemplo domingos o días libres sin letra) NO deben desplazar los días siguientes hacia la izquierda.
2. IGNORAR COLUMNAS NO DIARIAS: No confundas la columna "Nº", "CARGO", "HORAS" (ej. 150, 78, 06, 00) ni "CONDICION LABORAL" con días o turnos.
3. CELDAS COMBINADAS HORIZONTALMENTE: Si una fila tiene una barra o celda combinada horizontalmente (por ejemplo "VACACIONES", "VACACIONES 2026", "LICENCIA POR MATERNIDAD", "DESCANSO MEDICO"), identifica el primer día y el último día cubiertos visualmente por esa barra y genera un registro de turno para CADA día numérico dentro de ese rango con tipoTurno = "VACACIONES" y codigoOriginal exacto (ej. "VACACIONES 2026" o "LICENCIA POR MATERNIDAD").
4. CÓDIGOS DE TURNO CSMC/MINSA:
   - M, MAÑANA, AM, M1, M2, 08-14 -> tipoTurno = "MAÑANA"
   - T, TARDE, PM, T1, T2, 14-20 -> tipoTurno = "TARDE"
   - MT, M/T, M-T, M+T, MAÑANA Y TARDE, GD, G, 12H, 08-20 -> tipoTurno = "MAÑANA_TARDE"
   - L, FR, LIBRE, H, ROTACION HOSPITAL -> tipoTurno = "LIBRE" (conservando codigoOriginal, ej. "H" o "L")
   - F, FER, FERIADO -> tipoTurno = "FERIADO"
   - D, DESC, DESCANSO, DOM -> tipoTurno = "DESCANSO"
   - V, VAC, VACACIONES, LIC, LICENCIA, MATERNIDAD, PERM, DM -> tipoTurno = "VACACIONES"
   - N, NOCHE, u otro código especial legible -> tipoTurno = "OTRO" (conserva codigoOriginal exacto, ej. "N")
5. Omite días completamente vacíos o con "-" / sin programación para mantener el JSON compacto.`;

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
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'Eres un asistente especializado en digitalizar cuadros visuales de Rol de Turnos asistenciales del sector salud peruano (MINSA/CSMC) con precisión exacta por fila (profesional) y columna (día del mes 1..31), incluyendo celdas combinadas de vacaciones o licencias. Devuelve siempre JSON válido siguiendo el esquema.',
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
              description: 'Breve resumen de lo detectado o notas relevantes del PDF (máximo 2 oraciones).',
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
                    description: 'ID del profesional del catálogo que mejor coincide, o cadena vacía si no coincide.',
                  },
                  consultorioCodigoSugerido: {
                    type: Type.STRING,
                    description: 'Código de consultorio (ej. PSICO-01) si se deduce del área/servicio del PDF, o cadena vacía.',
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
                          description: 'Texto o sigla original en la celda (ej. M, T, MT, L, D, V).',
                        },
                        tipoTurno: {
                          type: Type.STRING,
                          description:
                            'Clasificación normalizada: MAÑANA | TARDE | MAÑANA_TARDE | LIBRE | DESCANSO | VACACIONES | FERIADO | OTRO',
                        },
                        consultorioCodigo: {
                          type: Type.STRING,
                          description: 'Código de consultorio específico para ese día si difiere, o cadena vacía.',
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
      res.status(502).json({ error: 'El modelo no devolvió contenido al analizar el PDF.' });
      return;
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Error en /api/turnos/parse-pdf:', err);
    const { status, message: rawMsg } = extractApiErrorInfo(err);
    const lower = rawMsg.toLowerCase();

    if (status === 403 || (status === 400 && lower.includes('api key'))) {
      res.status(403).json({
        error:
          'Clave de API inválida o sin permisos. Verifica GEMINI_API_KEY en Settings > Secrets.',
      });
      return;
    }

    if (status === 429) {
      res.status(429).json({
        error:
          'Límite de solicitudes alcanzado temporalmente en Gemini API. Espera unos segundos e intenta nuevamente.',
      });
      return;
    }

    if (status === 503 || lower.includes('high demand') || lower.includes('unavailable')) {
      res.status(503).json({
        error:
          'El servicio de análisis de PDF está experimentando alta demanda temporal (503). Espera unos segundos y pulsa "Reintentar análisis".',
      });
      return;
    }

    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: rawMsg,
    });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CSMC Centinela de Vida server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Error iniciando el servidor:', err);
  process.exit(1);
});
