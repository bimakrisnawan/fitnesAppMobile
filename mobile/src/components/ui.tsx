// Small building blocks for a consistent look across screens.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Platform, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { initials } from "../lib/format";
import { haptic } from "../lib/haptics";
import { useAuth } from "../stores/auth";
import { radius } from "../theme";
import { ScalePressable } from "./motion";
import { NotificationBell } from "./NotificationBell";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export const shadow = Platform.select<ViewStyle>({
  web: { boxShadow: "0 1px 2px rgba(16,24,40,0.06), 0 4px 12px rgba(16,24,40,0.05)" } as ViewStyle,
  default: { shadowColor: "#101828", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
});

/** White rounded card. */
export function Panel({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const theme = useTheme();
  const base = [styles.panel, { backgroundColor: theme.colors.surface }, !theme.dark && shadow, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <ScalePressable onPress={onPress} style={base}>
      {children}
    </ScalePressable>
  );
}

/** Large title for tab screens, with avatar and notification bell. */
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.colors.background }]}>
      <View style={{ flex: 1 }}>
        {subtitle && (
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        )}
        <Text variant={title.length > 18 ? "headlineSmall" : "headlineMedium"} style={styles.headerTitle} numberOfLines={2}>
          {title}
        </Text>
      </View>
      {right}
      <NotificationBell />
      {user && (
        <Pressable onPress={() => router.navigate("/profile")} accessibilityLabel="Profile">
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>{initials(user.fullName)}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

export function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.sectionHead}>
        <Text variant="titleMedium" style={{ fontWeight: "700" }}>
          {title}
        </Text>
        {action && (
          <Text variant="labelLarge" style={{ color: theme.colors.primary }} onPress={onAction} suppressHighlighting>
            {action}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

/** Selectable rounded filter chip. */
export function Pill({ label, icon, selected, onPress, count }: { label: string; icon?: IconName; selected?: boolean; onPress: () => void; count?: number }) {
  const theme = useTheme();
  const fg = selected ? theme.colors.onPrimary : theme.colors.onSurface;
  return (
    <TouchableRipple
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      borderless
      style={[
        styles.pill,
        { backgroundColor: selected ? theme.colors.primary : theme.colors.surface, borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant },
      ]}
    >
      <View style={styles.pillInner}>
        {icon && <MaterialCommunityIcons name={icon} size={16} color={fg} />}
        <Text variant="labelLarge" style={{ color: fg }}>
          {label}
        </Text>
        {!!count && (
          <View style={[styles.count, { backgroundColor: selected ? theme.colors.onPrimary : theme.colors.primary }]}>
            <Text style={{ color: selected ? theme.colors.primary : theme.colors.onPrimary, fontSize: 11, fontWeight: "700" }}>{count}</Text>
          </View>
        )}
      </View>
    </TouchableRipple>
  );
}

export function ProgressLine({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const theme = useTheme();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: theme.colors.surfaceVariant, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`, height, borderRadius: height, backgroundColor: color ?? theme.colors.primary }} />
    </View>
  );
}

export function IconBubble({ icon, color, size = 40, tint }: { icon: IconName; color?: string; size?: number; tint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: tint ?? theme.colors.primaryContainer }}>
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={color ?? theme.colors.primary} />
    </View>
  );
}

/** Small "icon + text" fact, e.g. ⏱ 30 min. */
export function Meta({ icon, label, color }: { icon: IconName; label: string; color?: string }) {
  const theme = useTheme();
  const c = color ?? theme.colors.onSurfaceVariant;
  return (
    <View style={styles.meta}>
      <MaterialCommunityIcons name={icon} size={15} color={c} />
      <Text variant="labelMedium" style={{ color: c }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.md, padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 20, paddingBottom: 8, width: "100%", maxWidth: 720, alignSelf: "center" },
  headerTitle: { fontWeight: "700", letterSpacing: -0.5 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 2 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: { borderRadius: radius.pill, borderWidth: 1, overflow: "hidden" },
  pillInner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  count: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
});
