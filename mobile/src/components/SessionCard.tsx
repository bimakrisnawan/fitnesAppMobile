import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Linking, StyleSheet, View } from "react-native";
import { Avatar, Button, Card, Chip, Text, useTheme } from "react-native-paper";
import { formatTime, relativeDay } from "../lib/format";
import { countdownLabel, useNow } from "../lib/motion";
import { COACH_GRADIENT, radius } from "../theme";
import type { Session } from "../lib/types";

/** A coaching session: Google Meet button for online sessions, map link for in-person ones. */
export function SessionCard({ session, onComplete }: { session: Session; onComplete?: () => void }) {
  const theme = useTheme();
  const online = session.type === "ONLINE";
  const past = new Date(session.endsAt) < new Date();
  return (
    <Card mode="outlined">
      <Card.Title
        title={`${relativeDay(session.startsAt)}, ${formatTime(session.startsAt)}–${formatTime(session.endsAt)}`}
        subtitle={`${online ? "Video call" : "In person"} · ${session.durationMinutes} min${session.coach ? ` · ${session.coach.fullName}` : ""}`}
        left={(p) => <Avatar.Icon {...p} icon={online ? "video" : "map-marker"} />}
        right={() =>
          session.status !== "SCHEDULED" ? (
            <Chip compact style={styles.chip} icon={session.status === "COMPLETED" ? "check" : "close"}>
              {session.status === "COMPLETED" ? "Done" : "Cancelled"}
            </Chip>
          ) : null
        }
      />
      {(session.location || session.notes) && (
        <Card.Content style={styles.content}>
          {!online && session.location && <Text variant="bodyMedium">{session.location}</Text>}
          {session.notes && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {session.notes}
            </Text>
          )}
        </Card.Content>
      )}
      {session.status === "SCHEDULED" && (
        <Card.Actions>
          {online && session.meetUrl && (
            <Button mode={session.joinable ? "contained" : "outlined"} icon="video" onPress={() => Linking.openURL(session.meetUrl!)}>
              {session.joinable ? "Join now" : "Open Google Meet"}
            </Button>
          )}
          {!online && session.location && (
            <Button
              icon="directions"
              onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location!)}`)}
            >
              Directions
            </Button>
          )}
          {past && onComplete && <Button onPress={onComplete}>Mark attended</Button>}
        </Card.Actions>
      )}
    </Card>
  );
}

/** Highlighted card for the next session (Home and My Coach). */
export function NextSessionCard({ session }: { session: Session }) {
  const online = session.type === "ONLINE";
  // Live "starts in 2h 14m" label, refreshed every 30 seconds.
  const now = useNow(30_000);
  const live = session.joinable || (now >= new Date(session.startsAt).getTime() && now <= new Date(session.endsAt).getTime());
  return (
    <LinearGradient colors={COACH_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sessionCard}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.row}>
            <Text variant="labelLarge" style={styles.onDarkMuted}>
              NEXT SESSION
            </Text>
            <View style={[styles.when, live && styles.live]}>
              {live && <View style={styles.liveDot} />}
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{live ? "LIVE NOW" : `STARTS ${countdownLabel(new Date(session.startsAt).getTime(), now).toUpperCase()}`}</Text>
            </View>
          </View>
          <Text variant="titleLarge" style={styles.onDark}>
            {relativeDay(session.startsAt)}, {formatTime(session.startsAt)}
          </Text>
          <Text variant="bodyMedium" style={styles.onDarkMuted}>
            {online ? "Video call" : session.location} · {session.durationMinutes} min{session.coach ? ` with ${session.coach.fullName}` : ""}
          </Text>
        </View>
        <MaterialCommunityIcons name={online ? "video" : "map-marker"} size={36} color="rgba(255,255,255,0.9)" />
      </View>
      {session.notes && (
        <Text variant="bodySmall" style={styles.onDarkMuted} numberOfLines={2}>
          {session.notes}
        </Text>
      )}
      <View style={styles.row}>
        {online && session.meetUrl ? (
          <Button mode="contained" buttonColor="#fff" textColor="#3A4FE0" icon="video" onPress={() => Linking.openURL(session.meetUrl!)}>
            {session.joinable ? "Join now" : "Open Google Meet"}
          </Button>
        ) : (
          session.location && (
            <Button mode="contained" buttonColor="#fff" textColor="#3A4FE0" icon="directions"
              onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location!)}`)}>
              Directions
            </Button>
          )
        )}
        <Button textColor="#fff" onPress={() => router.push("/sessions")}>
          All sessions
        </Button>
      </View>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  sessionCard: { borderRadius: radius.lg, padding: 18, gap: 12 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  onDark: { color: "#fff" },
  onDarkMuted: { color: "rgba(255,255,255,0.85)" },
  when: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  live: { backgroundColor: "#DC2626" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  chip: { marginRight: 12 },
  content: { gap: 4 },
});
