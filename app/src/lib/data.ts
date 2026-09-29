import AsyncStorage from "@react-native-async-storage/async-storage";
import { today } from "./format";

export const CATS = ["Equipos", "Caja chica", "Movilidad", "Material", "Sueldo", "Oficina", "Fletes", "Viáticos"] as const;
export const TIPOS = ["Obra / Proyecto", "Venta", "Otro"] as const;
export const CIUDADES = ["Moquegua", "Arequipa"];

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

/** The bank account the balance belongs to. */
export type Cuenta = { nombre: string; numero: string };

export type Store = { balance: number; cuenta: Cuenta; movs: Mov[] };

export const DEFAULT_CUENTA: Cuenta = { nombre: "Cuenta corriente", numero: "" };

const KEY = "cajaobra.v1";

const seed = (): Store => ({ balance: 0, cuenta: DEFAULT_CUENTA, movs: [] });

/** Movements that shipped as demo data in early builds (ids 1-4); dropped from phones that saved them. */
const isDemoMov = (m: Mov) => m.id >= 1 && m.id <= 4;

export async function loadStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : null;
    if (s && typeof s.balance === "number" && Array.isArray(s.movs)) return { ...s, cuenta: s.cuenta ?? DEFAULT_CUENTA, movs: s.movs.filter((m: Mov) => !isDemoMov(m)) };
  } catch {}
  return seed();
}

export async function saveStore(s: Store) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
