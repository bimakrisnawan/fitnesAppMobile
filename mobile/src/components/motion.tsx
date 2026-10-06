// Motion helpers: springy press, shimmer skeleton, progress ring, confetti.
import { type ReactNode, useEffect, useId, useMemo, useRef } from "react";
import { Animated, Easing, Platform, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

const native = Platform.OS !== "web";

/** Pressable that gently shrinks while held, like a physical button. */
export function ScalePressable({ children, onPress, style, disabled }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: native, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => to(0.97)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Placeholder block that pulses while content loads. */
export function Skeleton({ height = 16, width = "100%", radius = 10, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: native }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: theme.colors.surfaceVariant, opacity }, style]} />;
}

/** Circular progress ring (0–1) with optional gradient and centred content. */
export function ProgressRing({
  progress,
  size = 120,
  stroke = 12,
  colors,
  track,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  colors: readonly [string, string];
  track?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);
  // SVG ids can't contain the colons React puts in useId().
  const id = `ring${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? theme.colors.surfaceVariant} strokeWidth={stroke} fill="none" />
        {p > 0.001 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
            // Start at 12 o'clock and go clockwise.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}

const CONFETTI_COLORS = ["#FF5A36", "#FFB020", "#2F6FED", "#16A34A", "#E8341C", "#A855F7", "#06B6D4"];

/** A one-off confetti burst falling from the top of its container. */
export function Confetti({ count = 60, width = 400, height = 800 }: { count?: number; width?: number; height?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 160,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        delay: Math.random() * 500,
        duration: 1800 + Math.random() * 1400,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
        round: Math.random() > 0.7,
      })),
    [count, width],
  );
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel(
      pieces.map((p, i) =>
        Animated.timing(progress[i]!, { toValue: 1, duration: p.duration, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      ),
    ).start();
  }, [pieces, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const v = progress[i]!;
        return (
          <Animated.View
            key={p.key}
            style={{
              position: "absolute",
              left: p.x,
              top: -20,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity: v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) },
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
