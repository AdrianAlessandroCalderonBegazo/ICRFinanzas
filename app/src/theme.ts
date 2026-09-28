import type { TextStyle, ViewStyle } from "react-native";

export const C = {
  bg: "#0A1B2A",
  text: "#fff",
  muted: "rgba(255,255,255,.7)",
  placeholder: "rgba(255,255,255,.45)",
  cyan: "#7FE3EE",
  cyanStrong: "#12A3B8",
  teal: "#0E7490",
  navy: "#124C8C",
  blueSoft: "#B8D2F5",
  red: "#FFA3A3",
  mint: "#7DFFD6",
  ink: "#0D2233",
  divider: "rgba(255,255,255,.1)",
};

// Layered radial gradients from the design's phone frame.
export const APP_BACKGROUND =
  "radial-gradient(circle at 12% 8%, #12A3B8 0%, transparent 42%), radial-gradient(circle at 95% 38%, #2a5fb0 0%, transparent 46%), radial-gradient(circle at 10% 78%, #0E7490 0%, transparent 40%), radial-gradient(circle at 85% 100%, #1c7fa0 0%, transparent 38%)";

type Weight = 400 | 500 | 600 | 700 | 800;
const FAMILY: Record<Weight, string> = {
  400: "Manrope_400Regular",
  500: "Manrope_500Medium",
  600: "Manrope_600SemiBold",
  700: "Manrope_700Bold",
  800: "Manrope_800ExtraBold",
};

/** Text style with Manrope at the given weight (Android needs one family per weight). */
export const t = (size: number, weight: Weight = 400, color: string = C.text, extra: TextStyle = {}): TextStyle => ({
  fontFamily: FAMILY[weight],
  fontSize: size,
  color,
  includeFontPadding: false,
  ...extra,
});

/** Uppercase tracked label used above every field ("FECHA", "MONTO"...). */
export const kicker = (color: string = C.muted, size = 10.5): TextStyle =>
  t(size, 800, color, { letterSpacing: size * 0.1 });

export const glass = (fill = 0.09, border = 0.16, radius = 16): ViewStyle => ({
  backgroundColor: `rgba(255,255,255,${fill})`,
  borderWidth: 1,
  borderColor: `rgba(255,255,255,${border})`,
  borderRadius: radius,
});

export const inputBox: ViewStyle = {
  ...glass(0.09, 0.22, 12),
  height: 48,
  paddingHorizontal: 14,
  justifyContent: "center",
};

export const primaryButton: ViewStyle = {
  height: 54,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  experimental_backgroundImage: "linear-gradient(135deg, #12A3B8, #0E7490)",
  boxShadow: "0px 10px 28px rgba(18,163,184,0.45), inset 0px 1px 0px rgba(255,255,255,0.3)",
};

export const secondaryButton: ViewStyle = {
  height: 50,
  borderRadius: 14,
  borderWidth: 1.5,
  borderColor: "rgba(255,255,255,.35)",
  backgroundColor: "rgba(255,255,255,.09)",
  alignItems: "center",
  justifyContent: "center",
};
