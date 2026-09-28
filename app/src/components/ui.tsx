import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { C, glass, inputBox, kicker, primaryButton, secondaryButton, t } from "../theme";
import { inputDate, isoDate, parseIso } from "../lib/format";

/** Full-screen container that fades in on mount (design: `animation: fadeIn .2s`). */
export function Screen({ children }: { children: ReactNode }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [o]);
  return <Animated.View style={{ flex: 1, opacity: o }}>{children}</Animated.View>;
}

export function Header({ kicker: k, title, sub, onBack, topInset }: { kicker: string; title: string; sub: string; onBack: () => void; topInset: number }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,.07)",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,.14)",
        paddingTop: 20 + topInset,
        paddingHorizontal: 22,
        paddingBottom: 22,
      }}
    >
      <Pressable
        onPress={onBack}
        accessibilityLabel="Volver"
        hitSlop={8}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}
      >
        <Text style={t(22, 600, C.text, { marginTop: -3 })}>‹</Text>
      </Pressable>
      <Text style={kicker("rgba(255,255,255,.75)")}>{k}</Text>
      <Text style={t(24, 800, C.text, { marginTop: 4 })}>{title}</Text>
      <Text style={t(12, 400, "rgba(255,255,255,.75)", { marginTop: 4 })}>{sub}</Text>
    </View>
  );
}

export function FieldLabel({ children, auto, optional }: { children: string; auto?: boolean; optional?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
      <Text style={kicker()}>
        {children}
        {optional ? <Text style={t(10.5, 600, C.muted)}> (opcional)</Text> : null}
      </Text>
      {auto ? (
        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: "rgba(18,163,184,.24)" }}>
          <Text style={t(9, 800, C.cyan, { letterSpacing: 0.9 })}>AUTO</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text style={t(11.5, 400, C.red, { marginTop: 6 })}>{children}</Text>;
}

export function TextField(props: TextInputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={C.placeholder}
      selectionColor={C.cyan}
      cursorColor={C.cyan}
      {...props}
      onFocus={(e) => {
        setFocus(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        props.onBlur?.(e);
      }}
      style={[inputBox, t(14, 600), focus && focusRing, props.style]}
    />
  );
}

const focusRing: ViewStyle = { borderColor: "rgba(127,227,238,.8)", boxShadow: "0px 0px 0px 3px rgba(127,227,238,0.18)" };

export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const open = () =>
    DateTimePickerAndroid.open({
      value: value ? parseIso(value) : new Date(),
      mode: "date",
      onChange: (e, d) => {
        if (e.type === "set" && d) onChange(isoDate(d));
      },
    });
  return (
    <Pressable onPress={open} style={[inputBox, { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }]}>
      <Text style={t(13.5, 600, value ? C.text : C.placeholder, { flex: 1 })}>{value ? inputDate(value) : "dd/mm/aaaa"}</Text>
      <CalendarIcon />
    </Pressable>
  );
}

function CalendarIcon() {
  return (
    <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: "rgba(255,255,255,.7)", borderTopWidth: 4 }} />
  );
}

export function AmountField({ value, onChangeText, accent }: { value: string; onChangeText: (v: string) => void; accent: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[glass(0.09, 0.22, 14), { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 16 }, focus && focusRing]}>
      <Text style={t(22, 800, accent)}>S/</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChangeText}
        placeholder="0.00"
        placeholderTextColor={C.placeholder}
        selectionColor={C.cyan}
        cursorColor={C.cyan}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[t(28, 800), { flex: 1, minWidth: 0, height: 52, padding: 0 }]}
      />
    </View>
  );
}

/** Grid of selectable options (tipo de ingreso / categoría). */
export function OptionGrid<T extends string>({ options, value, onPick, columns, height, fontSize }: {
  options: readonly T[];
  value: string;
  onPick: (v: T) => void;
  columns: number;
  height: number;
  fontSize: number;
}) {
  const gap = 8;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -gap / 2, rowGap: gap }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <View key={o} style={{ width: `${100 / columns}%`, paddingHorizontal: gap / 2 }}>
            <Pressable
              onPress={() => onPick(o)}
              style={{
                height,
                borderRadius: columns > 3 ? 11 : 12,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
                borderWidth: 1,
                backgroundColor: active ? "rgba(18,163,184,.55)" : "rgba(255,255,255,.08)",
                borderColor: active ? C.cyan : "rgba(255,255,255,.22)",
              }}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit style={t(fontSize, 700)}>
                {o}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [primaryButton, pressed && { filter: "brightness(1.12)" }]}>
      <Text style={t(14, 800, C.text, { letterSpacing: 0.56 })}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, color = C.blueSoft, borderColor }: { label: string; onPress: () => void; color?: string; borderColor?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [secondaryButton, borderColor ? { borderColor } : null, pressed && { opacity: 0.8 }]}>
      <Text style={t(13.5, 800, color)}>{label}</Text>
    </Pressable>
  );
}

/** Sticky bottom action bar used by both forms. */
export function BottomBar({ children, bottomInset }: { children: ReactNode; bottomInset: number }) {
  return (
    <View
      style={{
        paddingTop: 14,
        paddingHorizontal: 20,
        paddingBottom: 22 + bottomInset,
        backgroundColor: "rgba(10,27,42,.35)",
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,.12)",
        gap: 10,
      }}
    >
      {children}
    </View>
  );
}

/** Green dot with the "livePulse" ring. */
export function LiveDot() {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [p]);
  const ringOpacity = p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.7, 0, 0] });
  const ringScale = p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 3, 3] });
  return (
    <View style={{ width: 7, height: 7 }}>
      <Animated.View style={{ position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: C.mint, opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.mint }} />
    </View>
  );
}
