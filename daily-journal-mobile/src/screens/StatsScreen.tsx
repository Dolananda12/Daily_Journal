import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
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

export function StatsScreen() {
  const [range, setRange] = useState<Range>('7');
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState<DayData[]>([]);

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

      // Generate date array
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

  // Streak
  let curStreak = 0;
  for (let i = dayData.length - 1; i >= 0; i--) {
    if (dayData[i].hours > 0) curStreak++;
    else break;
  }

  return (
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
                <View key={d.date} style={styles.barCol}>
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
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
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
    marginBottom: 20,
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
    marginTop: 6,
  },
  barLabelToday: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
});
