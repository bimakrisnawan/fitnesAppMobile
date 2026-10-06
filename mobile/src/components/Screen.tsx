import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  centered?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Screens under a navigation header don't need top padding for the status bar. */
  edges?: Edge[];
  /** Rendered above the scrolling content (e.g. a PageHeader on tab screens). */
  header?: ReactNode;
  /** Pinned below the scrolling content (e.g. a primary action). */
  footer?: ReactNode;
}

/** Safe-area, keyboard-aware, scrollable page container with optional pull-to-refresh. */
export function Screen({ children, centered = false, onRefresh, refreshing = false, edges = ["bottom", "left", "right"], header, footer }: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, centered && styles.centered]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
        {footer && <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16, width: "100%", maxWidth: 720, alignSelf: "center" },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  centered: { flexGrow: 1, justifyContent: "center" },
});
