import AsyncStorage from "@react-native-async-storage/async-storage";
import { daysAgo, today } from "./format";

export const CATS = ["Equipos", "Caja chica", "Movilidad", "Material", "Sueldo", "Oficina", "Fletes", "Viáticos"] as const;
export const TIPOS = ["Obra / Proyecto", "Venta", "Otro"] as const;
export const CIUDADES = ["Lima", "Arequipa", "Trujillo", "Cusco", "Piura", "Chiclayo"];

export type Categoria = (typeof CATS)[number];
export type TipoIngreso = (typeof TIPOS)[number];

export type Mov = {
  id: number;
  kind: "in" | "out";
  title: string;
  cat: string;
  date: string;
  amount: number;
  persona?: string;
  ciudad?: string;
  captura?: boolean;
};

export type Ingreso = { fecha: string; tipo: TipoIngreso | ""; detalle: string; monto: string };
export type Egreso = { fecha: string; persona: string; desc: string; ciudad: string; categoria: Categoria | ""; monto: string };

export const emptyIng = (): Ingreso => ({ fecha: today(), tipo: "", detalle: "", monto: "" });
export const emptyEgr = (): Egreso => ({ fecha: today(), persona: "", desc: "", ciudad: "", categoria: "", monto: "" });

export type Store = { balance: number; movs: Mov[] };

const KEY = "cajaobra.v1";

const seed = (): Store => ({
  balance: 48250,
  movs: [
    { id: 1, kind: "in", title: "Torre Aurora — Etapa 2", cat: "Obra / Proyecto", date: daysAgo(1), amount: 12500 },
    { id: 2, kind: "out", title: 'Fierro corrugado 1/2"', cat: "Material", date: daysAgo(2), amount: 3480, persona: "Aceros del Sur", ciudad: "Lima" },
    { id: 3, kind: "out", title: "Planilla quincenal", cat: "Sueldo", date: daysAgo(4), amount: 6200, persona: "Personal de obra", ciudad: "Lima" },
    { id: 4, kind: "in", title: "Venta de excedente de ladrillo", cat: "Venta", date: daysAgo(6), amount: 1850 },
  ],
});

export async function loadStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : null;
    if (s && typeof s.balance === "number" && Array.isArray(s.movs)) return s;
  } catch {}
  return seed();
}

export async function saveStore(s: Store) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** Offline demo receipts for "Probar con comprobante de ejemplo". */
export const SAMPLES: Omit<Egreso, "fecha">[] = [
  { persona: "Ferretería El Constructor SAC", desc: "Cemento Portland x 40 bolsas", ciudad: "Lima", categoria: "Material", monto: "1240.00" },
  { persona: "Transportes Rímac EIRL", desc: "Flete de agregados a obra", ciudad: "Lima", categoria: "Fletes", monto: "680.00" },
  { persona: "Grifo Santa Rosa", desc: "Combustible camioneta de obra", ciudad: "Arequipa", categoria: "Movilidad", monto: "215.50" },
  { persona: "Alquileres Maq. Andina", desc: "Alquiler de mezcladora 3 días", ciudad: "Trujillo", categoria: "Equipos", monto: "450.00" },
];
