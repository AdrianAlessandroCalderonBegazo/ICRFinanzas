import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 8787);
// Optional shared secret. If set, the app must send it in the `x-app-token` header.
const APP_TOKEN = process.env.APP_TOKEN ?? "";
const MAX_BODY = 12 * 1024 * 1024; // ~12 MB of base64

export const CATEGORIAS = ["Equipos", "Caja chica", "Movilidad", "Material", "Sueldo", "Oficina", "Fletes", "Viáticos"] as const;
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const Comprobante = z.object({
  fecha: z.string().describe("Fecha del comprobante en formato YYYY-MM-DD, o cadena vacía si no se lee"),
  persona: z.string().describe("A quién se pagó: proveedor, razón social o beneficiario"),
  descripcion: z.string().describe("Descripción breve del gasto (máx. ~60 caracteres)"),
  ciudad: z.string().describe("Ciudad donde se emitió el comprobante, o cadena vacía"),
  categoria: z.enum(CATEGORIAS).describe("Categoría más adecuada para el gasto"),
  monto: z.number().describe("Importe total pagado en soles (PEN), sin símbolo; 0 si no se lee"),
});
export type ComprobanteData = z.infer<typeof Comprobante>;

const SYSTEM = `Eres un asistente contable para una empresa de construcción en Perú.
Recibes la foto de un comprobante de pago (boleta, factura, voucher, ticket o captura de una transferencia/Yape/Plin)
y extraes los datos para registrar un egreso de caja.
- "monto": el importe TOTAL pagado (incluye IGV). Si hay varias cifras, usa el total final.
- "persona": el emisor/proveedor en boletas y facturas; el destinatario en transferencias.
- "categoria": elige entre Equipos (alquiler o compra de maquinaria/herramientas), Caja chica (gastos menores varios),
  Movilidad (combustible, taxis, pasajes, peajes), Material (materiales de construcción), Sueldo (planillas, pagos a personal),
  Oficina (útiles, servicios, internet), Fletes (transporte de carga), Viáticos (alimentación, hospedaje en viaje).
- Si un dato no aparece o no se lee, deja la cadena vacía (o 0 en el monto). No inventes datos.`;

const client = new Anthropic();

async function analizar(data: string, mediaType: (typeof MEDIA_TYPES)[number]): Promise<ComprobanteData> {
  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: "Extrae los datos de este comprobante." },
        ],
      },
    ],
    output_config: { effort: "low", format: betaZodOutputFormat(Comprobante) },
  });

  if (response.stop_reason === "refusal") throw new HttpError(422, "No se pudo analizar la imagen.");
  if (!response.parsed_output) throw new HttpError(502, "La respuesta del análisis no tuvo el formato esperado.");
  return response.parsed_output;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, x-app-token",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "La imagen es demasiado grande.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON inválido.");
  }
}

const Body = z.object({
  image: z.string().min(1),
  mediaType: z.enum(MEDIA_TYPES).default("image/jpeg"),
});

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, null);
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    if (req.method !== "POST" || req.url !== "/api/analizar-comprobante") throw new HttpError(404, "No encontrado.");
    if (APP_TOKEN && req.headers["x-app-token"] !== APP_TOKEN) throw new HttpError(401, "No autorizado.");

    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError(400, "Falta la imagen del comprobante.");
    const image = parsed.data.image.replace(/^data:[^;]+;base64,/, "");

    const data = await analizar(image, parsed.data.mediaType);
    send(res, 200, data);
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: "Demasiadas solicitudes, intenta en un momento." });
    if (err instanceof Anthropic.APIConnectionError) return send(res, 503, { error: "Sin conexión con el servicio de análisis." });
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return send(res, 502, { error: "El servicio de análisis falló." });
    }
    console.error(err);
    send(res, 500, { error: "Error interno." });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor de análisis escuchando en http://0.0.0.0:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn("Aviso: ANTHROPIC_API_KEY no está definida; el análisis de comprobantes fallará.");
});
