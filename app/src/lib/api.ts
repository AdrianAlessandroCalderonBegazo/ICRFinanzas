/**
 * Cliente contra la API del ERP (ICR-LOGISTICA) — "el cerebro de todo": cada
 * ingreso y egreso que esta app registra pasa por acá para quedar en
 * Postgres, visible al instante en Contabilidad → Flujo de caja del ERP, en
 * vez de quedarse encerrado en el AsyncStorage del teléfono.
 *
 * A diferencia de ICR-TIENDA (que llama al ERP solo desde su backend de
 * Next.js con un token de servicio "actuando como" un usuario fijo), esta
 * app corre también en el navegador público — así que no hay un secreto de
 * servicio que proteger acá. En su lugar, cada persona de campo entra con su
 * propia cuenta real del ERP (rol ALMACENERO/VENTAS/COMPRAS/SUPERVISOR, que
 * ya trae permisos income.* y expenses.*) y el JWT de SU sesión es el único
 * token que esta app usa — ni más ni menos acceso que el que tendría usando
 * el ERP directamente desde un navegador.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Categoria, Egreso, Ingreso, Subcategoria } from "./data";

const BASE_URL = (process.env.EXPO_PUBLIC_ERP_API_URL || "https://erp.inversionesicr.com/api").replace(/\/+$/, "");
const SESSION_KEY = "cajaobra.session.v1";

export type Session = { token: string; nombre: string; email: string; rolCodigo: string };

let session: Session | null = null;

export async function loadSession(): Promise<Session | null> {
  if (session) return session;
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    session = raw ? JSON.parse(raw) : null;
  } catch {
    session = null;
  }
  return session;
}

async function saveSession(next: Session | null) {
  session = next;
  try {
    if (next) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(SESSION_KEY);
  } catch {}
}

export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

async function erpFetch(path: string, init?: RequestInit): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) };
  if (session?.token && !headers.Authorization) headers.Authorization = `Bearer ${session.token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Sin conexión con el servidor. Se guardó localmente y se sincronizará solo.", "NETWORK");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.status !== "success") {
    throw new ApiError(body?.error?.message || `El servidor respondió ${res.status}`, body?.error?.code);
  }
  return body.data;
}

export async function login(email: string, password: string): Promise<Session> {
  const data = await erpFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  const next: Session = { token: data.token, nombre: data.user.nombre_completo, email: data.user.email, rolCodigo: data.user.rol_codigo };
  await saveSession(next);
  return next;
}

export async function logout() {
  await saveSession(null);
}

export function currentSession(): Session | null {
  return session;
}

// ---- Mapeo de categorías/tipos locales a los valores que acepta el ERP -----

const CATEGORIA_ERP: Record<Categoria, string> = {
  Equipos: "EQUIPOS_OBRA",
  "Caja chica": "OTROS",
  Movilidad: "MOVILIDAD",
  Material: "MATERIAL",
  Oficina: "OFICINA",
  Fletes: "FLETES",
  "Viáticos": "VIATICOS",
  Proveedores: "OTROS",
  "Gastos fijos": "OTROS", // solo si viniera sin subcategoría (no debería pasar la validación del formulario)
};
const SUBCATEGORIA_ERP: Record<Subcategoria, string> = { Sueldos: "SUELDO", Alquiler: "ALQUILER", Servicios: "SERVICIOS" };
const TIPO_INGRESO_ERP: Record<string, string> = { "Obra / Proyecto": "OBRA_PROYECTO", Venta: "VENTA", Otro: "OTRO" };

/** Registra el egreso en /expenses del ERP. Lanza ApiError si no hay sesión, red o el ERP lo rechaza. */
export async function registrarEgreso(egr: Egreso): Promise<{ gasto_id: string }> {
  if (!session) throw new ApiError("No hay una sesión activa.", "NO_SESSION");
  const categoria = egr.categoria && egr.subcategoria ? SUBCATEGORIA_ERP[egr.subcategoria] : CATEGORIA_ERP[egr.categoria as Categoria];
  const data = await erpFetch("/expenses", {
    method: "POST",
    body: JSON.stringify({
      categoria, descripcion: egr.desc, monto: Number(egr.monto), fecha: egr.fecha,
      persona_texto: egr.persona || null, ciudad: egr.ciudad || null, channel: "web",
    }),
  });
  return { gasto_id: data.gasto.gasto_id };
}

/** Registra el ingreso en /income del ERP. Lanza ApiError si no hay sesión, red o el ERP lo rechaza. */
export async function registrarIngreso(ing: Ingreso): Promise<{ ingreso_id: string }> {
  if (!session) throw new ApiError("No hay una sesión activa.", "NO_SESSION");
  const data = await erpFetch("/income", {
    method: "POST",
    body: JSON.stringify({
      tipo: TIPO_INGRESO_ERP[ing.tipo] || "OTRO", detalle: ing.detalle || ing.tipo, monto: Number(ing.monto), fecha: ing.fecha, channel: "web",
    }),
  });
  return { ingreso_id: data.ingreso.ingreso_id };
}
