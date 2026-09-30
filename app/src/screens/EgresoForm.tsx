import { Image, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import { C, t } from "../theme";
import { AmountField, BottomBar, DateField, ErrorText, FieldLabel, Header, OptionGrid, PrimaryButton, Screen, TextField } from "../components/ui";
import { cleanAmt, money, num } from "../lib/format";
import { CATS, CIUDADES, SUBCATS, type Egreso } from "../lib/data";
import type { Errors } from "./IngresoForm";

export function EgresoForm({ egr, set, err, balance, fromCapture, autoVals, thumbUri, onBack, onReview, topInset, bottomInset }: {
  egr: Egreso;
  set: <K extends keyof Egreso>(k: K, v: Egreso[K]) => void;
  err: Errors;
  balance: number;
  fromCapture: boolean;
  autoVals: Partial<Egreso>;
  thumbUri: string | null;
  onBack: () => void;
  onReview: () => void;
  topInset: number;
  bottomInset: number;
}) {
  // A field keeps its AUTO badge while it still holds the value read from the photo.
  const auto = (k: keyof Egreso) => fromCapture && autoVals[k] !== undefined && autoVals[k] !== "" && autoVals[k] === egr[k];
  const amt = num(egr.monto);
  // Quick picks for the two cities where the company works; hidden once one is chosen.
  const citySuggestions = CIUDADES.filter((c) => c.toLowerCase().startsWith(egr.ciudad.trim().toLowerCase()) && c !== egr.ciudad);

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <Header
          kicker={fromCapture ? "EGRESO · DESDE CAPTURA" : "EGRESO · MANUAL"}
          title="Datos del egreso"
          sub={`Saldo actual ${money(balance)}`}
          onBack={onBack}
          topInset={topInset}
        />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          {fromCapture ? (
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: C.tint, borderRadius: 14, padding: 12 }}>
              <View style={{ width: 46, height: 56, borderRadius: 8, overflow: "hidden", backgroundColor: C.stripeB }}>
                {thumbUri ? <Image source={{ uri: thumbUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
              </View>
              <Text style={t(12, 400, C.ink, { flex: 1, lineHeight: 17 })}>
                <Text style={t(12, 800, C.ink)}>Datos detectados automáticamente.</Text> Revisa y corrige lo que sea necesario.
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <FieldLabel auto={auto("fecha")}>FECHA</FieldLabel>
              <DateField value={egr.fecha} onChange={(v) => set("fecha", v)} />
              <ErrorText>{err.fecha}</ErrorText>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <FieldLabel auto={auto("ciudad")}>CIUDAD</FieldLabel>
              <TextField
                value={egr.ciudad}
                onChangeText={(v) => set("ciudad", v)}
                placeholder="Ej. Moquegua"
                style={{ paddingHorizontal: 12 }}
              />
              <ErrorText>{err.ciudad}</ErrorText>
            </View>
          </View>
          {citySuggestions.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: -6 }}>
              {citySuggestions.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => set("ciudad", c)}
                  style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}
                >
                  <Text style={t(12, 700, C.ink)}>{c}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View>
            <FieldLabel auto={auto("persona")}>PERSONA</FieldLabel>
            <TextField value={egr.persona} onChangeText={(v) => set("persona", v)} placeholder="¿A quién se pagó?" />
            <ErrorText>{err.persona}</ErrorText>
          </View>
          <View>
            <FieldLabel auto={auto("desc")}>DESCRIPCIÓN</FieldLabel>
            <TextField value={egr.desc} onChangeText={(v) => set("desc", v)} placeholder="Ej. Compra de cemento para losa" />
            <ErrorText>{err.desc}</ErrorText>
          </View>
          <View>
            <FieldLabel auto={auto("categoria")}>CATEGORÍA</FieldLabel>
            <OptionGrid
              options={CATS}
              value={egr.categoria}
              onPick={(v) => {
                set("categoria", v);
                if (v !== "Gastos fijos") set("subcategoria", "");
              }}
              columns={3}
              height={42}
              fontSize={12}
            />
            <ErrorText>{err.categoria}</ErrorText>
          </View>
          {egr.categoria === "Gastos fijos" ? (
            <View>
              <FieldLabel auto={auto("subcategoria")}>TIPO DE GASTO FIJO</FieldLabel>
              <OptionGrid options={SUBCATS["Gastos fijos"]} value={egr.subcategoria} onPick={(v) => set("subcategoria", v)} columns={3} height={42} fontSize={12} />
              <ErrorText>{err.subcategoria}</ErrorText>
            </View>
          ) : null}
          <View>
            <FieldLabel auto={auto("monto")}>MONTO</FieldLabel>
            <AmountField value={egr.monto} onChangeText={(v) => set("monto", cleanAmt(v))} accent={C.navy} />
            <ErrorText>{err.monto}</ErrorText>
            {amt > 0 ? (
              <Text style={t(12, 700, balance - amt < 0 ? C.red : C.navy, { marginTop: 8 })}>Nuevo saldo: {money(balance - amt)}</Text>
            ) : null}
          </View>
        </ScrollView>
        <BottomBar bottomInset={bottomInset}>
          <PrimaryButton label="CONFIRMAR EGRESO" onPress={onReview} />
        </BottomBar>
      </KeyboardAvoidingView>
    </Screen>
  );
}
