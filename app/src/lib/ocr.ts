import { recognizeText } from "@infinitered/react-native-mlkit-text-recognition";
import type { Egreso } from "./data";
import { parseComprobante, rowsFromLines } from "./parseComprobante";

/**
 * Reads a receipt photo on the device with Google ML Kit (bundled model, works offline)
 * and turns the text into egreso fields.
 */
export async function leerComprobante(uri: string): Promise<Egreso> {
  const result = await recognizeText(uri);
  const lines = result.blocks.flatMap((b) => b.lines);
  if (!lines.length) throw new Error("No se detectó texto. Intenta con una foto más nítida y bien iluminada.");

  // Parse the rebuilt visual rows; fall back to ML Kit's own block order for anything still missing.
  const byRows = parseComprobante(rowsFromLines(lines));
  const byBlocks = parseComprobante(lines.map((l) => l.text));
  const pick = <K extends keyof Egreso>(k: K) => byRows[k] || byBlocks[k];
  const categoria = pick("categoria");
  return {
    fecha: byRows.fecha,
    persona: pick("persona"),
    desc: pick("desc"),
    ciudad: pick("ciudad"),
    categoria,
    subcategoria: categoria === "Gastos fijos" ? pick("subcategoria") : "",
    monto: pick("monto"),
  };
}
