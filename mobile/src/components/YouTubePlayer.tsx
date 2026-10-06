import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createElement } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { WebView } from "react-native-webview";

const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1`;

/**
 * 16:9 YouTube embed. Web renders a plain iframe; phones use a WebView that loads the iframe from an
 * HTML page with a base URL, because YouTube refuses embeds that arrive without a referrer.
 */
export function YouTubePlayer({ videoId }: { videoId: string }) {
  if (Platform.OS === "web") {
    return (
      <View style={styles.frame}>
        {createElement("iframe", {
          src: embedUrl(videoId),
          style: { border: 0, width: "100%", height: "100%" },
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowFullScreen: true,
          title: "Exercise video",
        })}
      </View>
    );
  }
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="${embedUrl(videoId)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>`;
  return (
    <View style={styles.frame}>
      <WebView
        source={{ html, baseUrl: "https://fitnessapp.local" }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        style={{ backgroundColor: "#000" }}
      />
    </View>
  );
}

/** Shown when there's no video yet, or the viewer needs a plan to watch it. */
export function VideoPlaceholder({ locked = false, color, onUnlock }: { locked?: boolean; color?: string; onUnlock?: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.frame, styles.placeholder, { backgroundColor: color ?? theme.colors.surfaceVariant }]}>
      <MaterialCommunityIcons name={locked ? "lock" : "video-off-outline"} size={36} color="#fff" />
      <Text variant="titleSmall" style={styles.placeholderText}>
        {locked ? "Members-only video" : "Video coming soon"}
      </Text>
      {locked && onUnlock && (
        <Button mode="contained" buttonColor="#fff" textColor="#111" onPress={onUnlock} compact>
          Unlock with a plan
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 8 },
  placeholderText: { color: "#fff" },
});
