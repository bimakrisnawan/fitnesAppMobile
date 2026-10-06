import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { BACK, FRONT, MUSCLE_LABEL, type MuscleId, SILHOUETTE } from "./body-map-data";

interface Props {
  primary?: string[];
  secondary?: string[];
  /** Heat-map mode: muscle id → 0..1. Overrides primary/secondary colouring. */
  heat?: Record<string, number>;
  /** Height of each figure in px. */
  height?: number;
  showLegend?: boolean;
  /** List the targeted muscles under the figures. */
  showNames?: boolean;
  /** "dark" forces the dark palette (e.g. on the always-dark workout player). */
  tone?: "auto" | "dark";
}

function usePalette(tone: "auto" | "dark" = "auto") {
  const theme = useTheme();
  const dark = tone === "dark" || theme.dark;
  return {
    text: tone === "dark" ? "rgba(255,255,255,0.75)" : theme.colors.onSurfaceVariant,
    body: dark ? "#2A2F3B" : "#E7E9EF",
    idle: dark ? "#3B4252" : "#CBD0DA",
    soft: dark ? "#8A3A26" : "#FFB59F",
    strong: theme.colors.primary,
    // Heat steps from "a little" to "a lot".
    heat: dark ? ["#5A2A1E", "#9A3E26", "#D9512F", theme.colors.primary] : ["#FFE1D7", "#FFB59F", "#FF8A66", theme.colors.primary],
    stroke: tone === "dark" ? "#1C1F26" : theme.colors.surface,
  };
}

function Figure({ regions, colorFor, height, label, tone }: { regions: Partial<Record<MuscleId, string[]>>; colorFor: (id: MuscleId) => string; height: number; label: string; tone: "auto" | "dark" }) {
  const c = usePalette(tone);
  const mirrored = (d: string, fill: string, key: string, withStroke = false) => (
    <G key={key}>
      <Path d={d} fill={fill} stroke={withStroke ? c.stroke : undefined} strokeWidth={withStroke ? 1 : 0} />
      <Path d={d} fill={fill} stroke={withStroke ? c.stroke : undefined} strokeWidth={withStroke ? 1 : 0} transform="translate(200 0) scale(-1 1)" />
    </G>
  );

  return (
    <View style={styles.figure}>
      <Svg width={height / 2} height={height} viewBox="0 0 200 400">
        <Circle cx={100} cy={30} r={18} fill={c.body} />
        <Rect x={92} y={44} width={16} height={16} rx={4} fill={c.body} />
        {SILHOUETTE.map((d, i) => mirrored(d, c.body, `s${i}`))}
        <Ellipse cx={36} cy={210} rx={7} ry={10} fill={c.body} />
        <Ellipse cx={164} cy={210} rx={7} ry={10} fill={c.body} />
        <Ellipse cx={78} cy={386} rx={11} ry={7} fill={c.body} />
        <Ellipse cx={122} cy={386} rx={11} ry={7} fill={c.body} />
        {(Object.entries(regions) as [MuscleId, string[]][]).flatMap(([id, paths]) => paths.map((d, i) => mirrored(d, colorFor(id), `${id}${i}`, true)))}
      </Svg>
      <Text variant="labelSmall" style={{ color: c.text }}>
        {label}
      </Text>
    </View>
  );
}

/** Front and back muscle map: primary muscles in the brand colour, secondary in a lighter tint, or a heat map. */
export function BodyMap({ primary = [], secondary = [], heat, height = 220, showLegend = true, showNames = true, tone = "auto" }: Props) {
  const theme = useTheme();
  const c = usePalette(tone);
  const p = new Set(primary);
  const s = new Set(secondary.filter((m) => !p.has(m)));
  const names = (ids: Iterable<string>) => [...ids].map((m) => MUSCLE_LABEL[m as MuscleId] ?? m).join(", ");

  const colorFor = (id: MuscleId) => {
    if (heat) {
      const v = heat[id] ?? 0;
      if (v <= 0) return c.idle;
      return c.heat[Math.min(c.heat.length - 1, Math.floor(v * c.heat.length - 0.0001))]!;
    }
    return p.has(id) ? c.strong : s.has(id) ? c.soft : c.idle;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Figure regions={FRONT} colorFor={colorFor} height={height} label="Front" tone={tone} />
        <Figure regions={BACK} colorFor={colorFor} height={height} label="Back" tone={tone} />
      </View>
      {showLegend &&
        (heat ? (
          <View style={styles.legend}>
            <Text variant="bodySmall" style={{ color: c.text }}>
              Less
            </Text>
            {[c.idle, ...c.heat].map((color) => (
              <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
            ))}
            <Text variant="bodySmall" style={{ color: c.text }}>
              More
            </Text>
          </View>
        ) : (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: c.strong }]} />
              <Text variant="bodySmall" style={{ color: tone === "dark" ? c.text : theme.colors.onSurface }}>
                Main focus
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: c.soft }]} />
              <Text variant="bodySmall" style={{ color: tone === "dark" ? c.text : theme.colors.onSurface }}>
                Also works
              </Text>
            </View>
          </View>
        ))}
      {showNames && !heat && (p.size > 0 || s.size > 0) && (
        <View style={styles.names}>
          {p.size > 0 && (
            <Text variant="bodyMedium">
              <Text style={{ fontWeight: "700" }}>Main focus: </Text>
              {names(p)}
            </Text>
          )}
          {s.size > 0 && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              <Text style={{ fontWeight: "700", color: theme.colors.onSurfaceVariant }}>Also works: </Text>
              {names(s)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10 },
  row: { flexDirection: "row", justifyContent: "center", gap: 24 },
  figure: { alignItems: "center", gap: 4 },
  legend: { flexDirection: "row", gap: 6, alignItems: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  swatch: { width: 16, height: 10, borderRadius: 3 },
  names: { alignSelf: "stretch", gap: 2 },
});
