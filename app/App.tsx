import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";

import { C } from "./src/theme";
import { money, num, fdate } from "./src/lib/format";
import { catLabel, DEFAULT_CUENTA, emptyEgr, emptyIng, loadStore, saveStore, type Cuenta, type Egreso, type Ingreso, type Mov } from "./src/lib/data";
import { leerComprobante } from "./src/lib/ocr";
import { Home } from "./src/screens/Home";
import { IngresoForm, type Errors } from "./src/screens/IngresoForm";
import { EgresoMetodo } from "./src/screens/EgresoMetodo";
import { Captura, type CapState } from "./src/screens/Captura";
import { EgresoForm } from "./src/screens/EgresoForm";
import { CuentaForm } from "./src/screens/CuentaForm";
import { ConfirmSheet, SuccessToast, type SheetData } from "./src/components/Overlays";

type ScreenName = "home" | "cuenta" | "ingreso" | "metodo" | "captura" | "egreso";
type Filter = "Todos" | "Ingresos" | "Egresos";

const IDLE_CAP: CapState = { status: "idle", uri: null, step: 0, error: null };
const MAX_SIDE = 2000; // plenty for OCR, keeps memory use low on big camera photos
const MIN_SCAN_MS = 1800; // OCR is near-instant; keep the scan checklist visible long enough to read

export default function App() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="light" />
        {fontsLoaded ? <CajaDeObra /> : null}
      </View>
    </SafeAreaProvider>
  );
}

function CajaDeObra() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<ScreenName>("home");
  const [balance, setBalance] = useState(0);
  const [cuenta, setCuenta] = useState<Cuenta>(DEFAULT_CUENTA);
  const [display, setDisplay] = useState(0);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [ing, setIng] = useState<Ingreso>(emptyIng);
  const [egr, setEgr] = useState<Egreso>(emptyEgr);
  const [err, setErr] = useState<Errors>({});
  const [sheet, setSheet] = useState<"in" | "out" | null>(null);
  const [cap, setCap] = useState<CapState>(IDLE_CAP);
  const [fromCapture, setFromCapture] = useState(false);
  const [autoVals, setAutoVals] = useState<Partial<Egreso>>({});
  const [success, setSuccess] = useState<{ title: string; sub: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("Todos");
  const [hlId, setHlId] = useState<number | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const raf = useRef(0);
  const job = useRef<AbortController | null>(null);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    loadStore().then((s) => {
      setBalance(s.balance);
      setCuenta(s.cuenta);
      setDisplay(s.balance);
      setMovs(s.movs);
      setReady(true);
    });
    return () => {
      timers.current.forEach(clearTimeout);
      cancelAnimationFrame(raf.current);
      job.current?.abort();
    };
  }, []);

  /** Animates the live balance from one value to another (ease-out cubic, 1.1 s). */
  const tween = (from: number, to: number) => {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const go = (s: ScreenName) => {
    setScreen(s);
    setErr({});
  };

  const setIngField = <K extends keyof Ingreso>(k: K, v: Ingreso[K]) => {
    setIng((s) => ({ ...s, [k]: v }));
    setErr((e) => ({ ...e, [k]: null }));
  };
  const setEgrField = <K extends keyof Egreso>(k: K, v: Egreso[K]) => {
    setEgr((s) => ({ ...s, [k]: v }));
    setErr((e) => ({ ...e, [k]: null }));
  };

  const reviewIngreso = () => {
    const e: Errors = {};
    if (!ing.fecha) e.fecha = "Selecciona la fecha";
    if (!ing.tipo) e.tipo = "Elige el tipo de ingreso";
    if (num(ing.monto) <= 0) e.monto = "Ingresa un monto mayor a 0";
    if (Object.keys(e).length) return setErr(e);
    setSheet("in");
  };

  const reviewEgreso = () => {
    const e: Errors = {};
    if (!egr.fecha) e.fecha = "Selecciona la fecha";
    if (!egr.ciudad.trim()) e.ciudad = "Indica la ciudad";
    if (!egr.persona.trim()) e.persona = "Indica la persona";
    if (!egr.desc.trim()) e.desc = "Agrega una descripción";
    if (!egr.categoria) e.categoria = "Elige una categoría";
    else if (egr.categoria === "Gastos fijos" && !egr.subcategoria) e.subcategoria = "Elige el tipo de gasto fijo";
    if (num(egr.monto) <= 0) e.monto = "Ingresa un monto mayor a 0";
    if (Object.keys(e).length) return setErr(e);
    setSheet("out");
  };

  const confirm = () => {
    const kind = sheet;
    if (!kind) return;
    const id = Date.now();
    let mov: Mov;
    let amt: number;
    if (kind === "in") {
      amt = num(ing.monto);
      mov = { id, kind, title: ing.detalle.trim() || ing.tipo, cat: ing.tipo, date: ing.fecha, amount: amt };
    } else {
      amt = num(egr.monto);
      mov = { id, kind, title: egr.desc.trim(), cat: catLabel(egr.categoria, egr.subcategoria), date: egr.fecha, amount: amt, persona: egr.persona.trim(), ciudad: egr.ciudad.trim(), captura: fromCapture };
    }
    const from = balance;
    const to = +(from + (kind === "in" ? amt : -amt)).toFixed(2);
    const nextMovs = [mov, ...movs];
    saveStore({ balance: to, cuenta, movs: nextMovs });

    setScreen("home");
    setSheet(null);
    setBalance(to);
    setDisplay(from);
    setMovs(nextMovs);
    setHlId(id);
    setFilter("Todos");
    setIng(emptyIng());
    setEgr(emptyEgr());
    setErr({});
    setFromCapture(false);
    setAutoVals({});
    setCap(IDLE_CAP);
    setSuccess({ title: kind === "in" ? "Ingreso registrado" : "Egreso registrado", sub: `${kind === "in" ? "+" : "−"}${money(amt)} · saldo actualizado` });
    later(() => tween(from, to), 250);
    later(() => setSuccess(null), 2600);
    later(() => setHlId(null), 3000);
  };

  /** Saves the account data; a new balance replaces the old one (no movement is recorded). */
  const saveCuenta = (next: Cuenta, nextBalance: number) => {
    const from = balance;
    saveStore({ balance: nextBalance, cuenta: next, movs });
    setCuenta(next);
    setBalance(nextBalance);
    setDisplay(from);
    go("home");
    setSuccess({ title: "Cuenta actualizada", sub: `${next.nombre} · saldo ${money(nextBalance)}` });
    if (nextBalance !== from) later(() => tween(from, nextBalance), 250);
    later(() => setSuccess(null), 2600);
  };

  // ---- Captura -------------------------------------------------------------

  const cancelCapture = useCallback(() => {
    job.current?.abort();
    job.current = null;
    setCap(IDLE_CAP);
  }, []);

  /** Shows the scan animation while `work` runs, then opens the pre-filled egreso form. */
  const runCapture = async (uri: string | null, work: (signal: AbortSignal) => Promise<Egreso>) => {
    job.current?.abort();
    const ctrl = new AbortController();
    job.current = ctrl;
    setCap({ status: "busy", uri, step: 0, error: null });

    // Advance the checklist while waiting; the last step completes when the answer arrives.
    let step = 0;
    const tick = setInterval(() => {
      if (step < 3) setCap((c) => (c.status === "busy" ? { ...c, step: ++step } : c));
    }, 650);

    try {
      const [data] = await Promise.all([work(ctrl.signal), new Promise((r) => setTimeout(r, MIN_SCAN_MS))]);
      if (ctrl.signal.aborted) return;
      clearInterval(tick);
      setCap((c) => ({ ...c, step: 4 }));
      await new Promise((r) => setTimeout(r, 400));
      if (ctrl.signal.aborted) return;
      setEgr(data);
      setAutoVals({ ...data });
      setFromCapture(true);
      setErr({});
      setScreen("egreso");
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setCap({ ...IDLE_CAP, error: e instanceof Error ? e.message : "No se pudo analizar el comprobante." });
    } finally {
      clearInterval(tick);
    }
  };

  const analyzeAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const longSide = Math.max(asset.width, asset.height);
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (longSide > MAX_SIDE) ctx.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    const img = await (await ctx.renderAsync()).saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
    runCapture(img.uri, () => leerComprobante(img.uri));
  };

  const readError = () => setCap({ ...IDLE_CAP, error: "No se pudo leer la imagen." });

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!res.canceled && res.assets[0]) analyzeAsset(res.assets[0]).catch(readError);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setCap({ ...IDLE_CAP, error: "Necesitamos permiso de cámara para tomar la foto." });
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    if (!res.canceled && res.assets[0]) analyzeAsset(res.assets[0]).catch(readError);
  };

  // ---- Navigation ----------------------------------------------------------

  const backToMetodo = () => {
    cancelCapture();
    go("metodo");
  };
  const backFromEgreso = () => {
    setCap(IDLE_CAP);
    go(fromCapture ? "captura" : "metodo");
  };

  // Android hardware back mirrors the on-screen "‹" buttons.
  const onBack = useRef<() => boolean>(() => false);
  onBack.current = () => {
    if (sheet) {
      setSheet(null);
      return true;
    }
    if (screen === "ingreso" || screen === "metodo" || screen === "cuenta") go("home");
    else if (screen === "captura") backToMetodo();
    else if (screen === "egreso") backFromEgreso();
    else return false;
    return true;
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => onBack.current());
    return () => sub.remove();
  }, []);

  if (!ready) return null;

  const iAmt = num(ing.monto);
  const eAmt = num(egr.monto);
  const cuentaLabel = cuenta.numero ? `${cuenta.nombre} · ${cuenta.numero}` : cuenta.nombre;
  let sheetData: SheetData | null = null;
  if (sheet === "in") {
    const rows: [string, string][] = [["Cuenta", cuentaLabel], ["Fecha", fdate(ing.fecha)], ["Tipo", ing.tipo]];
    if (ing.detalle.trim()) rows.push(["Detalle", ing.detalle.trim()]);
    sheetData = { kicker: "CONFIRMA TU INGRESO", amount: `+${money(iAmt)}`, amountColor: C.teal, rows, newBalance: money(balance + iAmt), cta: "REGISTRAR INGRESO" };
  } else if (sheet === "out") {
    sheetData = {
      kicker: "CONFIRMA TU EGRESO",
      amount: `−${money(eAmt)}`,
      amountColor: C.red,
      rows: [
        ["Cuenta", cuentaLabel],
        ["Fecha", fdate(egr.fecha)],
        ["Persona", egr.persona],
        ["Descripción", egr.desc],
        ["Ciudad", egr.ciudad],
        ["Categoría", catLabel(egr.categoria, egr.subcategoria)],
        ["Origen", fromCapture ? "Captura de pantalla" : "Manual"],
      ],
      newBalance: money(balance - eAmt),
      cta: "REGISTRAR EGRESO",
    };
  }

  const inset = { topInset: insets.top, bottomInset: insets.bottom };

  return (
    <View style={{ flex: 1 }}>
      {screen === "home" && (
        <Home
          display={display}
          cuenta={cuenta}
          onCuenta={() => go("cuenta")}
          movs={movs}
          hlId={hlId}
          filter={filter}
          setFilter={setFilter}
          onIngreso={() => {
            setIng(emptyIng());
            go("ingreso");
          }}
          onEgreso={() => {
            setCap(IDLE_CAP);
            go("metodo");
          }}
          {...inset}
        />
      )}
      {screen === "cuenta" && <CuentaForm cuenta={cuenta} balance={balance} onBack={() => go("home")} onSave={saveCuenta} {...inset} />}
      {screen === "ingreso" && <IngresoForm ing={ing} set={setIngField} err={err} balance={balance} onBack={() => go("home")} onReview={reviewIngreso} {...inset} />}
      {screen === "metodo" && (
        <EgresoMetodo
          onBack={() => go("home")}
          onManual={() => {
            setEgr(emptyEgr());
            setFromCapture(false);
            setAutoVals({});
            go("egreso");
          }}
          onCaptura={() => go("captura")}
          {...inset}
        />
      )}
      {screen === "captura" && (
        <Captura cap={cap} onBack={backToMetodo} onGallery={pickFromGallery} onCamera={takePhoto} onCancel={cancelCapture} {...inset} />
      )}
      {screen === "egreso" && (
        <EgresoForm
          egr={egr}
          set={setEgrField}
          err={err}
          balance={balance}
          fromCapture={fromCapture}
          autoVals={autoVals}
          thumbUri={cap.uri}
          onBack={backFromEgreso}
          onReview={reviewEgreso}
          {...inset}
        />
      )}
      {sheetData && <ConfirmSheet data={sheetData} onConfirm={confirm} onClose={() => setSheet(null)} bottomInset={insets.bottom} />}
      {success && <SuccessToast title={success.title} sub={success.sub} topInset={insets.top} />}
    </View>
  );
}
