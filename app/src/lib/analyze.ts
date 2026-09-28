import { CATS, type Egreso } from "./data";
import { today } from "./format";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? "";

export const analysisConfigured = API_URL.length > 0;

type Result = { fecha: string; persona: string; descripcion: string; ciudad: string; categoria: string; monto: number };

/** Sends the receipt photo to the ICR Finanzas server, which reads it with Claude. */
export async function analizarComprobante(base64: string, mediaType: string, signal: AbortSignal): Promise<Egreso> {
  if (!analysisConfigured) throw new Error("Configura EXPO_PUBLIC_API_URL para analizar comprobantes.");

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/analizar-comprobante`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(APP_TOKEN ? { "x-app-token": APP_TOKEN } : {}) },
      body: JSON.stringify({ image: base64, mediaType }),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new Error("No se pudo conectar con el servidor de análisis.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Error ${res.status} al analizar el comprobante.`);

  const r = body as Result;
  const categoria = (CATS as readonly string[]).includes(r.categoria) ? (r.categoria as Egreso["categoria"]) : "";
  return {
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? r.fecha : today(),
    persona: r.persona ?? "",
    desc: r.descripcion ?? "",
    ciudad: r.ciudad ?? "",
    categoria,
    monto: r.monto > 0 ? r.monto.toFixed(2) : "",
  };
}
