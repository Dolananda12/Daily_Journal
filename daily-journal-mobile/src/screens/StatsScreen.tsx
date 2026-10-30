import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { apiFetch } from '../lib/apiClient';
import { getEffectiveTodayString } from '../lib/dateUtils';

type Range = '7' | '30' | 'all';

interface DayData {
  date: string;
  label: string;
  hours: number;
  hasEntry: boolean;
}

interface EntryDetail {
  entry_date: string;
  academics_notes?: string;
  life_notes?: string;
  diary_notes?: string;
  hours_studied?: number;
  todos?: { id: string; text: string; done: boolean }[];
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function StatsScreen() {
  const [range, setRange] = useState<Range>('7');
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState<DayData[]>([]);

  // Entry detail modal
  const [detailEntry, setDetailEntry] = useState<EntryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const today = getEffectiveTodayString();
      const numDays = range === '7' ? 7 : range === '30' ? 30 : 90;

      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() - (numDays - 1));
      const from = d.toISOString().split('T')[0];

      const res = await apiFetch(`/api/entries?from=${from}&to=${today}`);
      const entries = res.ok ? await res.json() : [];

      const entryMap = new Map<string, number>();
      if (Array.isArray(entries)) {
        entries.forEach((e: any) => {
          entryMap.set(e.entry_date, e.hours_studied ?? 0);
        });
      }

      const results: DayData[] = [];
      const cur = new Date(from + 'T00:00:00');
      const end = new Date(today + 'T00:00:00');

      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        const hrs = entryMap.get(dateStr) ?? 0;
        const label =
          range === '7'
            ? cur.toLocaleDateString('en-US', { weekday: 'narrow' })
            : cur.toLocaleDateString('en-US', { day: 'numeric' });

        results.push({
          date: dateStr,
          label,
          hours: hrs,
          hasEntry: entryMap.has(dateStr),
        });
        cur.setDate(cur.getDate() + 1);
      }

      setDayData(results);
    } catch {
      setDayData([]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Computations
  const totalHours = dayData.reduce((s, d) => s + d.hours, 0);
  const avgHours = dayData.length > 0 ? totalHours / dayData.length : 0;
  const maxHours = dayData.length > 0 ? Math.max(...dayData.map((d) => d.hours), 1) : 1;

  let curStreak = 0;
  for (let i = dayData.length - 1; i >= 0; i--) {
    if (dayData[i].hours > 0) curStreak++;
    else break;
  }

  // Tap a bar → fetch full entry and open modal
  const handleBarPress = useCallback(async (day: DayData) => {
    if (!day.hasEntry) return;
    setDetailLoading(true);
    setDetailEntry(null);
    setDetailVisible(true);
    try {
      const res = await apiFetch(`/api/entries/${day.date}`);
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        setDetailEntry(data);
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <View style={styles.outer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Range switch */}
        <View style={styles.rangeTabs}>
          {(['7', '30', 'all'] as Range[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeTab, range === r && styles.rangeTabActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangeTabText, range === r && styles.rangeTabTextActive]}>
                {r === '7' ? 'Last 7 Days' : r === '30' ? 'Last 30 Days' : 'Quarter'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI 4-grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{totalHours.toFixed(1)}</Text>
            <Text style={styles.kpiLbl}>Total Hours</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{avgHours.toFixed(1)}</Text>
            <Text style={styles.kpiLbl}>Daily Average</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{curStreak}d</Text>
            <Text style={styles.kpiLbl}>Active Streak</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{maxHours > 1 ? maxHours.toFixed(1) : 0}</Text>
            <Text style={styles.kpiLbl}>Best Day (hrs)</Text>
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Study Hours Distribution</Text>
          <Text style={styles.chartHint}>Tap a bar to read that day's full entry</Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={theme.colors.accentDark} />
            </View>
          ) : (
            <View style={styles.barsContainer}>
              {dayData.map((d, index) => {
                const heightPercent = Math.min(100, Math.round((d.hours / maxHours) * 100));
                const isTodayBar = index === dayData.length - 1;

                return (
                  <TouchableOpacity
                    key={d.date}
                    style={styles.barCol}
                    activeOpacity={d.hasEntry ? 0.6 : 1}
                    onPress={() => handleBarPress(d)}
                  >
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${Math.max(heightPercent, d.hours > 0 ? 8 : 0)}%` },
                          isTodayBar && styles.barFillToday,
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isTodayBar && styles.barLabelToday]}>
                      {d.label}
                    </Text>
                    {d.hasEntry && (
                      <View style={styles.entryDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Entry Detail Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {detailEntry ? formatDisplayDate(detailEntry.entry_date) : '…'}
                  </Text>
                  {detailEntry?.hours_studied ? (
                    <Text style={styles.modalSubtitle}>{detailEntry.hours_studied} hrs studied</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setDetailVisible(false)}
                >
                  <Ionicons name="close" size={22} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentInner}
              showsVerticalScrollIndicator={false}
            >
              {detailLoading ? (
                <View style={styles.detailLoading}>
                  <ActivityIndicator size="large" color={theme.colors.accentDark} />
                  <Text style={styles.detailLoadingText}>Loading entry…</Text>
                </View>
              ) : detailEntry ? (
                <>
                  {/* Tasks */}
                  {detailEntry.todos && detailEntry.todos.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>✅  Tasks</Text>
                      {detailEntry.todos.map((todo) => (
                        <View key={todo.id} style={styles.todoRow}>
                          <Ionicons
                            name={todo.done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={todo.done ? theme.colors.accent : theme.colors.borderStrong}
                          />
                          <Text
                            style={[
                              styles.todoText,
                              todo.done && styles.todoDone,
                            ]}
                          >
                            {todo.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Academics */}
                  {detailEntry.academics_notes?.trim() ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>📚  Academics</Text>
                      <Text style={styles.detailBody}>{detailEntry.academics_notes}</Text>
                    </View>
                  ) : null}

                  {/* Life */}
                  {detailEntry.life_notes?.trim() ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>🌱  Life Lessons</Text>
                      <Text style={styles.detailBody}>{detailEntry.life_notes}</Text>
                    </View>
                  ) : null}

                  {/* Diary */}
                  {detailEntry.diary_notes?.trim() ? (
                    <View style={[styles.detailSection, styles.diarySection]}>
                      <Text style={[styles.detailSectionTitle, { color: theme.colors.accentDark }]}>
                        📓  Dear Diary
                      </Text>
                      <Text style={[styles.detailBody, styles.diaryBody]}>
                        {detailEntry.diary_notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Empty state */}
                  {!detailEntry.academics_notes?.trim() &&
                    !detailEntry.life_notes?.trim() &&
                    !detailEntry.diary_notes?.trim() &&
                    (!detailEntry.todos || detailEntry.todos.length === 0) && (
                      <Text style={styles.detailEmpty}>No written reflections recorded for this day.</Text>
                    )}
                </>
              ) : (
                <Text style={styles.detailEmpty}>Could not load entry.</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // Range tabs
  rangeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: 16,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  rangeTabActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadow.sm,
  },
  rangeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text2,
  },
  rangeTabTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },

  // KPI grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  kpiVal: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  kpiLbl: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },

  // Chart
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  chartHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  loadingWrap: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barsContainer: {
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
    gap: 4,
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: 8,
    backgroundColor: theme.colors.surface2,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 4,
  },
  barFillToday: {
    backgroundColor: theme.colors.accentDark,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  barLabelToday: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
  entryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accentDark,
    marginTop: 2,
  },

  // Entry detail modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    lineHeight: 24,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.accentDark,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  // Detail sections
  detailLoading: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  detailLoadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  detailSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  diarySection: {
    backgroundColor: '#FAF5EE',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailBody: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
  },
  diaryBody: {
    fontStyle: 'italic',
    lineHeight: 24,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  detailEmpty: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
  },

  // Todos
  todoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  todoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  todoDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
});
