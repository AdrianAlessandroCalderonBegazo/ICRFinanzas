import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, Text, View } from "react-native";
import { C, TEAL_GRADIENT, card, kicker, raisedCard, t } from "../theme";
import { Chip, LiveDot } from "../components/ui";
import { clock, fdate, money, today } from "../lib/format";
import type { Cuenta, Mov } from "../lib/data";

type Filter = "Todos" | "Ingresos" | "Egresos";

export function Home({ display, cuenta, onCuenta, movs, hlId, filter, setFilter, onIngreso, onEgreso, topInset, bottomInset }: {
  display: number;
  cuenta: Cuenta;
  onCuenta: () => void;
  movs: Mov[];
  hlId: number | null;
  filter: Filter;
  setFilter: (f: Filter) => void;
  onIngreso: () => void;
  onEgreso: () => void;
  topInset: number;
  bottomInset: number;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const ym = today().slice(0, 7);
  const monthIn = movs.filter((m) => m.kind === "in" && m.date.slice(0, 7) === ym).reduce((a, m) => a + m.amount, 0);
  const monthOut = movs.filter((m) => m.kind === "out" && m.date.slice(0, 7) === ym).reduce((a, m) => a + m.amount, 0);
  const list = movs.filter((m) => filter === "Todos" || (filter === "Ingresos" ? m.kind === "in" : m.kind === "out"));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 28 + bottomInset }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: 24 + topInset, paddingHorizontal: 22, paddingBottom: 78, backgroundColor: C.teal, experimental_backgroundImage: TEAL_GRADIENT }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image source={require("../../assets/icon.png")} style={{ width: 34, height: 34, borderRadius: 10 }} accessibilityLabel="ICR" />
            <View>
              <Text style={t(11.5, 400, "rgba(255,255,255,.85)")}>Bienvenido a</Text>
              <Text style={t(14, 700, C.white)}>ICR Finanzas</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(13,34,51,.22)" }}>
            <LiveDot />
            <Text style={t(10, 800, C.white, { letterSpacing: 0.8 })}>EN VIVO</Text>
          </View>
        </View>

        <Pressable onPress={onCuenta} accessibilityLabel="Editar cuenta y saldo">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={kicker("rgba(255,255,255,.9)", 10.5)}>SALDO EN CUENTA</Text>
            <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,.2)" }}>
              <Text style={t(10.5, 800, C.white, { letterSpacing: 0.5 })}>✎ Editar</Text>
            </View>
          </View>
          <Text style={t(36, 800, C.white, { letterSpacing: -0.72, marginTop: 6, marginBottom: 4, fontVariant: ["tabular-nums"] })} adjustsFontSizeToFit numberOfLines={1}>
            {money(display)}
          </Text>
          <Text style={t(12, 700, C.white)} numberOfLines={1}>
            {cuenta.nombre}
            {cuenta.numero ? (
              <Text style={t(12, 400, "rgba(255,255,255,.85)")}> · N° {cuenta.numero}</Text>
            ) : (
              <Text style={t(12, 400, C.mint)}> · Toca para agregar el número</Text>
            )}
          </Text>
          <Text style={t(11.5, 400, "rgba(255,255,255,.8)", { marginTop: 2 })}>Actualizado {clock(now)}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 18, marginTop: -54 }}>
        <ActionCard sign="+" iconBg={C.teal} title="INGRESO" sub="Obra, venta u otro" onPress={onIngreso} />
        <ActionCard sign="−" iconBg={C.navy} title="EGRESO" sub="Manual o con captura" onPress={onEgreso} />
      </View>

      <View style={{ flexDirection: "row", gap: 12, paddingTop: 14, paddingHorizontal: 18 }}>
        <View style={{ flex: 1, backgroundColor: C.tint, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Text style={kicker(C.teal)}>INGRESOS · MES</Text>
          <Text style={t(15, 800, C.teal, { marginTop: 4 })} adjustsFontSizeToFit numberOfLines={1}>{money(monthIn)}</Text>
        </View>
        <View style={[card(14), { flex: 1, paddingVertical: 12, paddingHorizontal: 14 }]}>
          <Text style={kicker()}>EGRESOS · MES</Text>
          <Text style={t(15, 800, C.red, { marginTop: 4 })} adjustsFontSizeToFit numberOfLines={1}>{money(monthOut)}</Text>
        </View>
      </View>

      <View style={{ paddingTop: 22, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={kicker(C.ink, 12)}>MOVIMIENTOS</Text>
          <Text style={t(11.5, 400, C.muted)}>{movs.length} registros</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          {(["Todos", "Ingresos", "Egresos"] as const).map((f) => (
            <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>
        <View style={[card(16), { overflow: "hidden" }]}>
          {list.map((m, i) => (
            <MovRow key={m.id} m={m} first={i === 0} flash={m.id === hlId} />
          ))}
          {list.length === 0 ? (
            <Text style={t(12, 400, C.muted, { paddingVertical: 28, paddingHorizontal: 16, textAlign: "center" })}>
              {movs.length === 0 ? "Aún no hay movimientos." : "Aún no hay movimientos en este filtro."}
            </Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function ActionCard({ sign, iconBg, title, sub, onPress }: { sign: string; iconBg: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [raisedCard(18), { flex: 1, padding: 16, gap: 12 }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={t(24, 700, C.white, { marginTop: -2 })}>{sign}</Text>
      </View>
      <View>
        <Text style={t(13, 800, C.ink, { letterSpacing: 0.52 })}>{title}</Text>
        <Text style={t(11.5, 400, C.muted, { marginTop: 2 })}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function MovRow({ m, first, flash }: { m: Mov; first: boolean; flash: boolean }) {
  const a = useRef(new Animated.Value(flash ? 1 : 0)).current;
  useEffect(() => {
    if (!flash) return;
    a.setValue(1);
    Animated.timing(a, { toValue: 0, duration: 2400, useNativeDriver: false }).start();
  }, [flash, a]);
  const bg = a.interpolate({ inputRange: [0, 1], outputRange: ["rgba(216,243,244,0)", "rgba(216,243,244,1)"] });
  const isIn = m.kind === "in";
  return (
    <Animated.View
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderTopWidth: first ? 0 : 1, borderTopColor: C.stripeA, backgroundColor: bg }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: isIn ? C.tint : C.outIcon }}>
        <Text style={t(18, 800, isIn ? C.teal : C.navy)}>{isIn ? "+" : "−"}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={t(13, 700)}>{m.title}</Text>
        <Text numberOfLines={1} style={t(11.5, 400, C.muted, { marginTop: 2 })}>
          {m.cat} · {fdate(m.date)}
          {m.persona ? ` · ${m.persona}` : ""}
        </Text>
      </View>
      <Text style={t(13.5, 800, isIn ? C.teal : C.red, { fontVariant: ["tabular-nums"] })}>
        {isIn ? "+" : "−"}
        {money(m.amount)}
      </Text>
    </Animated.View>
  );
}
