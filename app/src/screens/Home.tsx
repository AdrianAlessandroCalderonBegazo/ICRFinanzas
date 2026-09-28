import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { C, glass, kicker, t } from "../theme";
import { LiveDot } from "../components/ui";
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
      <View style={{ paddingTop: 24 + topInset, paddingHorizontal: 18, paddingBottom: 70 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,.2)", alignItems: "center", justifyContent: "center" }}>
              <Text style={t(14, 800)}>A</Text>
            </View>
            <View>
              <Text style={t(11.5, 400, "rgba(255,255,255,.85)")}>Hola,</Text>
              <Text style={t(14, 700)}>Adrián Alessandro</Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,.2)",
            }}
          >
            <LiveDot />
            <Text style={t(10, 800, C.text, { letterSpacing: 0.8 })}>EN VIVO</Text>
          </View>
        </View>

        <Pressable
          onPress={onCuenta}
          accessibilityLabel="Editar cuenta y saldo"
          style={({ pressed }) => [
            glass(0.1, 0.22, 22),
            { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16, boxShadow: "inset 0px 1px 0px rgba(255,255,255,0.25)" },
            pressed && { backgroundColor: "rgba(255,255,255,.14)" },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={kicker("rgba(255,255,255,.9)")}>SALDO EN CUENTA</Text>
            <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,.14)", borderWidth: 1, borderColor: "rgba(255,255,255,.22)" }}>
              <Text style={t(10.5, 800, C.text, { letterSpacing: 0.5 })}>✎ Editar</Text>
            </View>
          </View>
          <Text style={t(36, 800, C.text, { letterSpacing: -0.72, marginTop: 6, marginBottom: 4, fontVariant: ["tabular-nums"] })} adjustsFontSizeToFit numberOfLines={1}>
            {money(display)}
          </Text>
          <Text style={t(12, 700, C.text)} numberOfLines={1}>
            {cuenta.nombre}
            {cuenta.numero ? <Text style={t(12, 400, "rgba(255,255,255,.85)")}> · N° {cuenta.numero}</Text> : <Text style={t(12, 400, C.cyan)}> · Toca para agregar el número</Text>}
          </Text>
          <Text style={t(11.5, 400, "rgba(255,255,255,.7)", { marginTop: 2 })}>Actualizado {clock(now)}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 18, marginTop: -54 }}>
        <ActionCard sign="+" iconBg={C.teal} title="INGRESO" sub="Obra, venta u otro" onPress={onIngreso} />
        <ActionCard sign="−" iconBg={C.navy} title="EGRESO" sub="Manual o con captura" onPress={onEgreso} />
      </View>

      <View style={{ flexDirection: "row", gap: 12, paddingTop: 14, paddingHorizontal: 18 }}>
        <View style={{ flex: 1, backgroundColor: "rgba(18,163,184,.24)", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Text style={kicker(C.cyan)}>INGRESOS · MES</Text>
          <Text style={t(15, 800, C.cyan, { marginTop: 4 })} adjustsFontSizeToFit numberOfLines={1}>{money(monthIn)}</Text>
        </View>
        <View style={[glass(0.09, 0.16, 14), { flex: 1, paddingVertical: 12, paddingHorizontal: 14 }]}>
          <Text style={kicker()}>EGRESOS · MES</Text>
          <Text style={t(15, 800, C.red, { marginTop: 4 })} adjustsFontSizeToFit numberOfLines={1}>{money(monthOut)}</Text>
        </View>
      </View>

      <View style={{ paddingTop: 22, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={kicker(C.text, 12)}>MOVIMIENTOS</Text>
          <Text style={t(11.5, 400, C.muted)}>{movs.length} registros</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          {(["Todos", "Ingresos", "Egresos"] as const).map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: active ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.08)",
                  borderColor: active ? "#fff" : "rgba(255,255,255,.22)",
                }}
              >
                <Text style={t(12, 700, active ? C.ink : C.text)}>{f}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[glass(0.09, 0.16, 16), { overflow: "hidden" }]}>
          {list.map((m, i) => (
            <MovRow key={m.id} m={m} first={i === 0} flash={m.id === hlId} />
          ))}
          {list.length === 0 ? (
            <Text style={t(12, 400, C.muted, { paddingVertical: 28, paddingHorizontal: 16, textAlign: "center" })}>Aún no hay movimientos en este filtro.</Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function ActionCard({ sign, iconBg, title, sub, onPress }: { sign: string; iconBg: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        glass(0.09, 0.2, 18),
        { flex: 1, padding: 16, gap: 12, boxShadow: "0px 8px 30px rgba(0,0,0,0.18)" },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={t(24, 700, C.text, { marginTop: -2 })}>{sign}</Text>
      </View>
      <View>
        <Text style={t(13, 800, C.text, { letterSpacing: 0.52 })}>{title}</Text>
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
  const bg = a.interpolate({ inputRange: [0, 1], outputRange: ["rgba(127,227,238,0)", "rgba(127,227,238,0.3)"] });
  const isIn = m.kind === "in";
  return (
    <Animated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: C.divider,
        backgroundColor: bg,
      }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: isIn ? "rgba(18,163,184,.3)" : "rgba(120,160,230,.22)" }}>
        <Text style={t(18, 800, isIn ? C.cyan : C.blueSoft)}>{isIn ? "+" : "−"}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={t(13, 700)}>{m.title}</Text>
        <Text numberOfLines={1} style={t(11.5, 400, C.muted, { marginTop: 2 })}>
          {m.cat} · {fdate(m.date)}
          {m.persona ? ` · ${m.persona}` : ""}
        </Text>
      </View>
      <Text style={t(13.5, 800, isIn ? C.cyan : C.red, { fontVariant: ["tabular-nums"] })}>
        {isIn ? "+" : "−"}
        {money(m.amount)}
      </Text>
    </Animated.View>
  );
}
