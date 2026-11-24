import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

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

async function generateWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = Number(err?.status || err?.code || 0);
      const msg = String(err?.message || '').toLowerCase();
      const isTransient =
        status === 429 ||
        status === 503 ||
        msg.includes('temporarily unavailable') ||
        msg.includes('rate limit');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await sleep(700 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

const app = express();
app.use(express.json({ limit: '25mb' }));

app.post('/api/turnos/parse-pdf', async (req, res) => {
  try {
    const body = (req.body || {}) as ParsePdfRequestBody;
    const rawBase64 = (body.pdfBase64 || '').replace(/^data:application\/pdf;base64,/, '').trim();

    if (!rawBase64) {
      res.status(400).json({ error: 'No se recibió el contenido del archivo PDF.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(500).json({
        error:
          'No se encontró la variable GEMINI_API_KEY en el servidor. Configura la clave en Settings > Secrets para habilitar la lectura inteligente de PDF.',
      });
      return;
    }

    const profesionalesLista = Array.isArray(body.profesionales) ? body.profesionales : [];
    const consultoriosLista = Array.isArray(body.consultorios) ? body.consultorios : [];

    const now = new Date();
    const anioDefault = Number(body.anioHint) || now.getFullYear();
    const mesDefault = Number(body.mesHint) || now.getMonth() + 1;

    const profesionalesResumen = profesionalesLista
      .slice(0, 120)
      .map(
        (p) =>
          `- id="${p.id}" | nombre="${p.apellidos_nombres}" | dni="${p.dni || ''}" | profesion="${p.profesion || ''}" | consultorio="${p.consultorioAsignado || ''}"`
      )
      .join('\n');

    const consultoriosResumen = consultoriosLista
      .slice(0, 50)
      .map((c) => `- id="${c.id}" | codigo="${c.codigo}" | nombre="${c.nombre}"`)
      .join('\n');

    const promptText = `Analiza este PDF de "Rol de Turnos" de un Centro de Salud Mental Comunitario (CSMC / MINSA Perú).
Extrae todos los profesionales que aparecen en el cuadro/rol y sus turnos asignados día por día del mes.

Contexto de referencia (si el PDF no especifica año o mes, usa por defecto año=${anioDefault}, mes=${mesDefault}):
Nombre archivo: ${body.fileName || 'rol_turnos.pdf'}

Catálogo de profesionales registrados en el sistema (úsalos para llenar profesionalIdSugerido cuando coincida nombre o DNI):
${profesionalesResumen || '(sin catálogo previo)'}

Catálogo de consultorios registrados (úsalos para llenar consultorioCodigoSugerido usando el campo "codigo"):
${consultoriosResumen || '(sin catálogo previo)'}

Reglas de interpretación para códigos comunes de Rol de Turnos MINSA/CSMC:
- M, MAÑANA, AM, M1, M2, 08-14 -> tipoTurno = "MAÑANA"
- T, TARDE, PM, T1, T2, 14-20 -> tipoTurno = "TARDE"
- MT, M/T, M-T, MAÑANA Y TARDE, GD, G, 12H, 08-20 -> tipoTurno = "MAÑANA_TARDE"
- L, FR, LIBRE, F, FER, FERIADO -> tipoTurno = "LIBRE" (o "FERIADO" si indica F/FER)
- D, DESC, DESCANSO, DOM -> tipoTurno = "DESCANSO"
- V, VAC, VACACIONES, LIC, PERM, DM -> tipoTurno = "VACACIONES"
- Si el código en la celda es otro texto legible relevante, usa tipoTurno = "OTRO" y conserva codigoOriginal exacto.
- Omite días vacíos o con "-" / sin programación para mantener el JSON compacto.
- Asegúrate de devolver exactamente el día numérico del mes (1..31) correspondiente a cada columna.`;

    const response = await generateWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
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
          systemInstruction:
            'Eres un asistente especializado en digitalizar cuadros de Rol de Turnos asistenciales del sector salud peruano (MINSA/CSMC) con precisión exacta por fila (profesional) y columna (día del mes). Devuelve siempre JSON válido siguiendo el esquema.',
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
      })
    );

    const rawText = (response.text || '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'El modelo no devolvió contenido al analizar el PDF.' });
      return;
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Error en /api/turnos/parse-pdf:', err);
    const status = Number(err?.status || err?.code || 500);
    const rawMsg = String(err?.message || 'Error procesando el PDF con Gemini.');

    if (status === 403 || status === 400 && rawMsg.toLowerCase().includes('api key')) {
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
