# ICR Finanzas — Caja de Obra

App Android para registrar **ingresos y egresos** de obra con el saldo de la cuenta **en vivo**, en estilo *glassmorphism* (diseño "Caja de Obra Glass"). Funciona **sin internet**.

```
app/      App Android (Expo · React Native · TypeScript)
design/   Diseño original exportado de Claude Design (prototipo HTML + conversación)
.github/  GitHub Actions que genera el APK
```

## Qué hace

- **Inicio**: saldo en cuenta con indicador *EN VIVO* y animación al cambiar, nombre y número de la cuenta bancaria, totales de ingresos/egresos del mes, lista de movimientos con filtro (Todos / Ingresos / Egresos).
- **Cuenta y saldo**: toca la tarjeta del saldo (✎ Editar) para cambiar el nombre de la cuenta, el número de cuenta y el saldo actual. Cambiar el saldo no crea un movimiento.
- **Ingreso**: fecha, tipo (Obra / Proyecto, Venta, Otro), detalle opcional y monto. Muestra el nuevo saldo antes de confirmar.
- **Egreso** — dos formas:
  - **Manual**: fecha, ciudad (sugerencias: Moquegua y Arequipa), persona, descripción, categoría (Equipos, Caja chica, Movilidad, Material, Sueldo, Oficina, Fletes, Viáticos) y monto.
  - **Con captura**: sube una foto (galería o cámara) de la boleta, factura, ticket o captura de Yape/Plin/transferencia. El texto se lee **en el teléfono** con Google ML Kit (OCR, sin internet ni costo) y el formulario se llena solo; los campos detectados llevan la marca **AUTO** y se pueden corregir.
- Ambos formularios terminan en una **hoja de confirmación** con el resumen y el saldo resultante antes de registrar.
- Los datos se guardan en el teléfono (AsyncStorage).

### Qué detecta el OCR

| Campo | Cómo |
|---|---|
| Monto | Línea de *TOTAL / IMPORTE TOTAL / Yapeaste…* (ignora subtotal, IGV, vuelto); si no hay, el mayor monto con `S/` |
| Fecha | `dd/mm/aaaa`, `aaaa-mm-dd`, `27 set. 2026`, `24 de septiembre de 2026`… (prioriza la línea "Fecha/Emisión") |
| Persona | Destinatario en Yape/Plin/transferencias; razón social (S.A.C., E.I.R.L., …) en boletas y facturas |
| Ciudad | Ciudades del Perú y distritos de Lima que aparezcan en la dirección |
| Categoría | Palabras clave (cemento → Material, combustible → Movilidad, flete → Fletes, menú → Viáticos, …) |
| Descripción | Primera línea de producto relacionada con la categoría, o "Transferencia a …" |

Las reglas están en `app/src/lib/parseComprobante.ts` y tienen pruebas en `parseComprobante.test.ts`.

## Descargar el APK (GitHub Actions)

Cada `push` a `main` que toque `app/` genera el APK automáticamente:

1. En GitHub abre la pestaña **Actions → APK Android** y entra a la última ejecución.
2. Baja el archivo en **Artifacts** (`ICR-Finanzas-apk-N`), descomprime el `.zip` y pasa el `.apk` al teléfono.
3. En Android, permite "instalar apps de origen desconocido" y ábrelo.

También puedes lanzarlo a mano con **Run workflow**. Si subes un tag `v1.0.0`, el APK además queda adjunto en **Releases**.

> El APK está firmado con la clave de depuración: sirve para instalarlo directamente en los teléfonos del equipo. Para publicarlo en Google Play habría que configurar una clave de firma propia.

## Desarrollo

```bash
cd app
npm install
npm run typecheck
npm test
npx expo run:android     # requiere Android Studio / SDK instalado
```

El OCR usa un módulo nativo, por eso la app **no funciona en Expo Go**; usa el APK o `expo run:android`.
