import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Button, Modal, Portal, Searchbar, Text, useTheme } from "react-native-paper";
import { BodyMap } from "../../../components/BodyMap";
import { MUSCLE_IDS, MUSCLE_LABEL, type MuscleId } from "../../../components/body-map-data";
import { Skeleton } from "../../../components/motion";
import { EmptyState, ErrorState } from "../../../components/States";
import { PageHeader, Panel, Pill } from "../../../components/ui";
import { WorkoutCard } from "../../../components/WorkoutCard";
import { useEntitlements } from "../../../lib/billing";
import { CATEGORY_ICON, CATEGORY_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL } from "../../../lib/format";
import type { Category, Difficulty, EquipmentSetting, Paginated, WorkoutSummary } from "../../../lib/types";
import { useFetch } from "../../../lib/useFetch";
import { radius } from "../../../theme";

const CATEGORIES: Category[] = ["STRENGTH", "CARDIO", "FLEXIBILITY", "SPORT_SPECIFIC"];
const EQUIPMENT: EquipmentSetting[] = ["HOME", "NONE", "GYM"];
const LEVELS: Difficulty[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const EQUIPMENT_ICON = { HOME: "home-outline", NONE: "human-handsup", GYM: "weight-lifter" } as const;

export default function WorkoutsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ muscle?: string }>();
  const entitlements = useEntitlements();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<Category>();
  const [equipment, setEquipment] = useState<EquipmentSetting>();
  const [difficulty, setDifficulty] = useState<Difficulty>();
  const [muscle, setMuscle] = useState<MuscleId | undefined>();
  const [sheet, setSheet] = useState(false);

  // "Train by muscle" on Home links here with ?muscle=…
  useEffect(() => {
    if (params.muscle && (MUSCLE_IDS as readonly string[]).includes(params.muscle)) setMuscle(params.muscle as MuscleId);
  }, [params.muscle]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, error, loading, refreshing, refresh } = useFetch<Paginated<WorkoutSummary>>("/workouts", {
    q: debounced || undefined,
    category,
    equipment,
    difficulty,
    muscle,
    pageSize: 50,
  });
  const filterCount = [equipment, difficulty, muscle].filter(Boolean).length;
  const anyFilter = !!(debounced || category || filterCount);
  const clearAll = () => {
    setQuery("");
    setCategory(undefined);
    setEquipment(undefined);
    setDifficulty(undefined);
    setMuscle(undefined);
  };

  const header = (
    <View style={styles.headerBody}>
      {entitlements && !entitlements.library && (
        <Panel onPress={() => router.push("/subscribe")} style={[styles.upsell, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer, flex: 1 }}>
            🔓 Browse free. Subscribe to watch videos and track workouts.
          </Text>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            See plans
          </Text>
        </Panel>
      )}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search workouts or exercises"
          value={query}
          onChangeText={setQuery}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
          inputStyle={{ minHeight: 0 }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        <Pill label="Filters" icon="tune-variant" selected={filterCount > 0} count={filterCount} onPress={() => setSheet(true)} />
        <Pill label="All" selected={!category} onPress={() => setCategory(undefined)} />
        {CATEGORIES.map((c) => (
          <Pill key={c} label={CATEGORY_LABEL[c]} icon={CATEGORY_ICON[c] as never} selected={category === c} onPress={() => setCategory(category === c ? undefined : c)} />
        ))}
      </ScrollView>
      {muscle && (
        <Panel style={styles.muscleBanner}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Targeting
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              {MUSCLE_LABEL[muscle]}
            </Text>
          </View>
          <BodyMap primary={[muscle]} height={110} showLegend={false} showNames={false} />
          <Button compact onPress={() => setMuscle(undefined)}>
            Clear
          </Button>
        </Panel>
      )}
      <View style={styles.resultRow}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {data ? `${data.total} workout${data.total === 1 ? "" : "s"}` : " "}
        </Text>
        <View style={styles.row}>
          {anyFilter && (
            <Button compact onPress={clearAll}>
              Clear all
            </Button>
          )}
          <Button compact icon="history" onPress={() => router.push("/workout-history")}>
            History
          </Button>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <PageHeader title="Workouts" />
      <FlatList
        contentContainerStyle={styles.list}
        data={data?.items ?? []}
        keyExtractor={(w) => w.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <WorkoutCard workout={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        onRefresh={refresh}
        refreshing={refreshing}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 14 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ gap: 8 }}>
                  <Skeleton height={150} radius={radius.md} />
                  <Skeleton height={14} width="60%" />
                </View>
              ))}
            </View>
          ) : error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : (
            <EmptyState
              icon="magnify-close"
              title="No workouts match"
              body={anyFilter ? "Try fewer filters or a different search." : undefined}
              action={anyFilter ? <Button onPress={clearAll}>Clear filters</Button> : undefined}
            />
          )
        }
      />

      <Portal>
        <Modal visible={sheet} onDismiss={() => setSheet(false)} contentContainerStyle={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text variant="titleLarge" style={{ fontWeight: "700" }}>
              Filters
            </Text>
            <View style={{ gap: 8 }}>
              <Text variant="titleSmall">Where are you training?</Text>
              <View style={styles.wrap}>
                {EQUIPMENT.map((e) => (
                  <Pill key={e} label={EQUIPMENT_LABEL[e]} icon={EQUIPMENT_ICON[e]} selected={equipment === e} onPress={() => setEquipment(equipment === e ? undefined : e)} />
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Text variant="titleSmall">Level</Text>
              <View style={styles.wrap}>
                {LEVELS.map((l) => (
                  <Pill key={l} label={DIFFICULTY_LABEL[l]} selected={difficulty === l} onPress={() => setDifficulty(difficulty === l ? undefined : l)} />
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Text variant="titleSmall">Target muscle</Text>
              <View style={styles.wrap}>
                {MUSCLE_IDS.map((m) => (
                  <Pill key={m} label={MUSCLE_LABEL[m]} selected={muscle === m} onPress={() => setMuscle(muscle === m ? undefined : m)} />
                ))}
              </View>
              {muscle && <BodyMap primary={[muscle]} height={150} showLegend={false} showNames={false} />}
            </View>
            <View style={styles.row}>
              <Button
                onPress={() => {
                  setEquipment(undefined);
                  setDifficulty(undefined);
                  setMuscle(undefined);
                }}
              >
                Reset
              </Button>
              <Button mode="contained" style={{ flex: 1 }} onPress={() => setSheet(false)}>
                Show {data?.total ?? ""} workouts
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 32, width: "100%", maxWidth: 720, alignSelf: "center" },
  headerBody: { gap: 12, marginBottom: 14 },
  upsell: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  searchRow: { flexDirection: "row", gap: 8 },
  search: { flex: 1, borderRadius: radius.md, elevation: 0 },
  pills: { gap: 8, paddingRight: 8, paddingVertical: 2 },
  muscleBanner: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sheet: { margin: 16, padding: 20, borderRadius: radius.lg, maxHeight: "85%", width: "92%", maxWidth: 560, alignSelf: "center" },
});
