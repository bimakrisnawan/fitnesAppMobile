import { useState } from "react";
import { SegmentedButtons, Snackbar } from "react-native-paper";
import { Screen } from "../../components/Screen";
import { SessionCard } from "../../components/SessionCard";
import { EmptyState, ErrorState, Loading } from "../../components/States";
import { api, errorMessage } from "../../lib/api";
import type { Session } from "../../lib/types";
import { useFetch } from "../../lib/useFetch";

export default function SessionsScreen() {
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const { data, error, loading, refreshing, refresh } = useFetch<{ sessions: Session[] }>("/coaching/sessions", { scope });
  const [message, setMessage] = useState<string | null>(null);

  async function markAttended(id: string) {
    try {
      await api.post(`/coaching/sessions/${id}/complete`);
      await refresh();
    } catch (err) {
      setMessage(errorMessage(err));
    }
  }

  return (
    <>
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <SegmentedButtons
          value={scope}
          onValueChange={(v) => setScope(v as typeof scope)}
          buttons={[
            { value: "upcoming", label: "Upcoming", icon: "calendar-clock" },
            { value: "past", label: "Past", icon: "history" },
          ]}
        />
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : !data?.sessions.length ? (
          <EmptyState
            icon="calendar-blank"
            title={scope === "upcoming" ? "No sessions scheduled" : "No past sessions yet"}
            body={scope === "upcoming" ? "Your coach schedules your weekly 45-minute session. You'll get a notification." : undefined}
          />
        ) : (
          data.sessions.map((s) => <SessionCard key={s.id} session={s} onComplete={() => markAttended(s.id)} />)
        )}
      </Screen>
      <Snackbar visible={!!message} onDismiss={() => setMessage(null)}>
        {message}
      </Snackbar>
    </>
  );
}
