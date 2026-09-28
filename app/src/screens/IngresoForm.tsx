import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { C, t } from "../theme";
import { AmountField, BottomBar, DateField, ErrorText, FieldLabel, Header, OptionGrid, PrimaryButton, Screen, TextField } from "../components/ui";
import { cleanAmt, money, num } from "../lib/format";
import { TIPOS, type Ingreso } from "../lib/data";

export type Errors = Partial<Record<string, string | null>>;

export function IngresoForm({ ing, set, err, balance, onBack, onReview, topInset, bottomInset }: {
  ing: Ingreso;
  set: <K extends keyof Ingreso>(k: K, v: Ingreso[K]) => void;
  err: Errors;
  balance: number;
  onBack: () => void;
  onReview: () => void;
  topInset: number;
  bottomInset: number;
}) {
  const amt = num(ing.monto);
  const placeholder = ing.tipo === "Venta" ? "Ej. Venta de material sobrante" : ing.tipo === "Otro" ? "Ej. Devolución de garantía" : "Ej. Torre Aurora — Etapa 2";
  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <Header kicker="NUEVO REGISTRO" title="Registrar ingreso" sub={`Saldo actual ${money(balance)}`} onBack={onBack} topInset={topInset} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
          <View>
            <FieldLabel>FECHA</FieldLabel>
            <DateField value={ing.fecha} onChange={(v) => set("fecha", v)} />
            <ErrorText>{err.fecha}</ErrorText>
          </View>
          <View>
            <FieldLabel>TIPO DE INGRESO</FieldLabel>
            <OptionGrid options={TIPOS} value={ing.tipo} onPick={(v) => set("tipo", v)} columns={3} height={46} fontSize={12.5} />
            <ErrorText>{err.tipo}</ErrorText>
          </View>
          <View>
            <FieldLabel optional>DETALLE</FieldLabel>
            <TextField value={ing.detalle} onChangeText={(v) => set("detalle", v)} placeholder={placeholder} />
          </View>
          <View>
            <FieldLabel>MONTO</FieldLabel>
            <AmountField value={ing.monto} onChangeText={(v) => set("monto", cleanAmt(v))} accent={C.cyan} />
            <ErrorText>{err.monto}</ErrorText>
            {amt > 0 ? <Text style={t(12, 700, C.cyan, { marginTop: 8 })}>Nuevo saldo: {money(balance + amt)}</Text> : null}
          </View>
        </ScrollView>
        <BottomBar bottomInset={bottomInset}>
          <PrimaryButton label="CONFIRMAR INGRESO" onPress={onReview} />
        </BottomBar>
      </KeyboardAvoidingView>
    </Screen>
  );
}
