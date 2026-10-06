import { router } from "expo-router";
import { List } from "react-native-paper";
import { Screen } from "../../components/Screen";
import { EmptyState, ErrorState, Loading } from "../../components/States";
import { CATEGORY_ICON, formatDateTime } from "../../lib/format";
import type { CompletedWorkout, Paginated } from "../../lib/types";
import { useFetch } from "../../lib/useFetch";

export default function WorkoutHistoryScreen() {
  const { data, error, loading, refreshing, refresh } = useFetch<Paginated<CompletedWorkout>>("/users/completed-workouts", { pageSize: 50 });

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : !data?.items.length ? (
        <EmptyState icon="calendar-check" title="No workouts logged yet" body="Finish a workout and tap “Mark as complete” to build your history." />
      ) : (
        data.items.map((c) => (
          <List.Item
            key={c.id}
            title={c.workout.title}
            description={`${formatDateTime(c.completedAt)} · ${c.workout.durationMinutes} min${c.notes ? `\n“${c.notes}”` : ""}`}
            descriptionNumberOfLines={3}
            left={(p) => <List.Icon {...p} icon={CATEGORY_ICON[c.workout.category]} />}
            onPress={() => router.push({ pathname: "/workout/[id]", params: { id: c.workout.id } })}
          />
        ))
      )}
    </Screen>
  );
}
