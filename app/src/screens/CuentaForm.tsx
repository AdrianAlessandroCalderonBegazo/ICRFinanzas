import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { C, t } from "../theme";
import { AmountField, BottomBar, ErrorText, FieldLabel, Header, PrimaryButton, Screen, TextField } from "../components/ui";
import { cleanAmt, money, num } from "../lib/format";
import type { Cuenta } from "../lib/data";
import type { Errors } from "./IngresoForm";

/** Edits which bank account the app tracks and its current balance. */
export function CuentaForm({ cuenta, balance, onBack, onSave, topInset, bottomInset }: {
  cuenta: Cuenta;
  balance: number;
  onBack: () => void;
  onSave: (cuenta: Cuenta, balance: number) => void;
  topInset: number;
  bottomInset: number;
}) {
  const [nombre, setNombre] = useState(cuenta.nombre);
  const [numero, setNumero] = useState(cuenta.numero);
  const [saldo, setSaldo] = useState(balance.toFixed(2));
  const [err, setErr] = useState<Errors>({});

  const save = () => {
    const e: Errors = {};
    if (!nombre.trim()) e.nombre = "Indica el nombre de la cuenta";
    if (!numero.trim()) e.numero = "Indica el número de cuenta";
    if (saldo.trim() === "" || isNaN(parseFloat(saldo))) e.saldo = "Ingresa el saldo actual";
    if (Object.keys(e).length) return setErr(e);
    onSave({ nombre: nombre.trim(), numero: numero.trim() }, +num(saldo).toFixed(2));
  };

  const nuevo = num(saldo);
  const diff = +(nuevo - balance).toFixed(2);

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <Header kicker="CONFIGURACIÓN" title="Cuenta y saldo" sub="A qué cuenta bancaria pertenece el saldo" onBack={onBack} topInset={topInset} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
          <View>
            <FieldLabel>NOMBRE DE LA CUENTA</FieldLabel>
            <TextField
              value={nombre}
              onChangeText={(v) => {
                setNombre(v);
                setErr((x) => ({ ...x, nombre: null }));
              }}
              placeholder="Ej. Cuenta corriente BCP"
            />
            <ErrorText>{err.nombre}</ErrorText>
          </View>
          <View>
            <FieldLabel>NÚMERO DE CUENTA</FieldLabel>
            <TextField
              value={numero}
              onChangeText={(v) => {
                setNumero(v.replace(/[^\d\s-]/g, ""));
                setErr((x) => ({ ...x, numero: null }));
              }}
              placeholder="Ej. 191-12345678-0-21"
              keyboardType="phone-pad"
            />
            <ErrorText>{err.numero}</ErrorText>
          </View>
          <View>
            <FieldLabel>SALDO ACTUAL</FieldLabel>
            <AmountField
              value={saldo}
              onChangeText={(v) => {
                setSaldo(cleanAmt(v));
                setErr((x) => ({ ...x, saldo: null }));
              }}
              accent={C.teal}
            />
            <ErrorText>{err.saldo}</ErrorText>
            {diff !== 0 && !err.saldo ? (
              <Text style={t(12, 700, diff > 0 ? C.teal : C.red, { marginTop: 8 })}>
                {diff > 0 ? "+" : "−"}
                {money(Math.abs(diff))} respecto al saldo actual ({money(balance)})
              </Text>
            ) : null}
          </View>
          <Text style={t(11.5, 400, C.muted, { lineHeight: 16 })}>
            Cambiar el saldo reemplaza el monto actual; no crea un ingreso ni un egreso en los movimientos.
          </Text>
        </ScrollView>
        <BottomBar bottomInset={bottomInset}>
          <PrimaryButton label="GUARDAR CAMBIOS" onPress={save} />
        </BottomBar>
      </KeyboardAvoidingView>
    </Screen>
  );
}
