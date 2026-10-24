import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { apiFetch } from '../lib/apiClient';
import { getTodayString, formatDisplayDate } from '../lib/dateUtils';

interface Entry {
  entry_date: string;
  academics_notes: string;
  life_notes: string;
  hours_studied: number;
  diary_notes: string;
}

type FilterType = 'all' | 'academics' | 'life' | 'diary' | 'hours';

function getDefaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface BrowseScreenProps {
  onSelectDate: (date: string) => void;
}

export function BrowseScreen({ onSelectDate }: BrowseScreenProps) {
  const today = getTodayString();
  const [from, setFrom] = useState(getDefaultFrom());
  const [to, setTo] = useState(today);
  const [filter, setFilter] = useState<FilterType>('all');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/entries?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const totalHours = entries.reduce((sum, e) => sum + (e.hours_studied ?? 0), 0);
  const entriesWithAcademics = entries.filter((e) => e.academics_notes?.trim());
  const entriesWithLife = entries.filter((e) => e.life_notes?.trim());

  const filteredEntries = entries.filter((e) => {
    if (filter === 'academics') return !!e.academics_notes?.trim();
    if (filter === 'life') return !!e.life_notes?.trim();
    if (filter === 'diary') return !!e.diary_notes?.trim();
    if (filter === 'hours') return (e.hours_studied ?? 0) > 0;
    return true;
  });

  const filterButtons: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '✦' },
    { key: 'academics', label: 'Academics', icon: '📚' },
    { key: 'life', label: 'Life', icon: '🌱' },
    { key: 'diary', label: 'Diary', icon: '📓' },
    { key: 'hours', label: 'Hours', icon: '⏱' },
  ];

  return (
    <View style={styles.container}>
      {/* Filter pills */}
      <View style={styles.filterPillsRow}>
        {filterButtons.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            style={[styles.pill, filter === btn.key && styles.pillActive]}
            onPress={() => setFilter(btn.key)}
          >
            <Text style={styles.pillIcon}>{btn.icon}</Text>
            <Text style={[styles.pillText, filter === btn.key && styles.pillTextActive]}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary KPI Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statChip}>
          <Text style={styles.statVal}>{entries.length}</Text>
          <Text style={styles.statLbl}>entries</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statVal}>{totalHours.toFixed(1)}</Text>
          <Text style={styles.statLbl}>hrs studied</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statVal}>{entriesWithAcademics.length}</Text>
          <Text style={styles.statLbl}>academics</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statVal}>{entriesWithLife.length}</Text>
          <Text style={styles.statLbl}>life lessons</Text>
        </View>
      </View>

      {/* Entries List */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={theme.colors.accentDark} />
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.entry_date}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => onSelectDate(item.entry_date)}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardDate}>{formatDisplayDate(item.entry_date)}</Text>
                  <Text style={styles.cardDateSub}>{item.entry_date}</Text>
                </View>
                {item.hours_studied > 0 && (
                  <View style={styles.hoursBadge}>
                    <Text style={styles.hoursNum}>{item.hours_studied}</Text>
                    <Text style={styles.hoursUnit}>hrs</Text>
                  </View>
                )}
              </View>

              {item.academics_notes?.trim() ? (
                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionTitle}>📚 ACADEMICS</Text>
                  <Text style={styles.sectionBody} numberOfLines={3}>
                    {item.academics_notes}
                  </Text>
                </View>
              ) : null}

              {item.life_notes?.trim() ? (
                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionTitle}>🌱 LIFE</Text>
                  <Text style={styles.sectionBody} numberOfLines={3}>
                    {item.life_notes}
                  </Text>
                </View>
              ) : null}

              {item.diary_notes?.trim() ? (
                <View style={[styles.sectionWrap, styles.diarySection]}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.accentDark }]}>
                    📓 DEAR DIARY
                  </Text>
                  <Text style={[styles.sectionBody, styles.diaryBody]} numberOfLines={3}>
                    {item.diary_notes}
                  </Text>
                </View>
              ) : null}

              {!item.academics_notes?.trim() &&
                !item.life_notes?.trim() &&
                !item.diary_notes?.trim() && (
                  <Text style={styles.emptyNote}>No written reflections recorded.</Text>
                )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No entries found</Text>
              <Text style={styles.emptySub}>
                Try adjusting the category filter or range.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: theme.colors.accentFaint,
    borderColor: theme.colors.accent,
  },
  pillIcon: {
    fontSize: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text2,
  },
  pillTextActive: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLbl: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  cardDateSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  hoursBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: theme.colors.accentFaint,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.round,
    gap: 2,
  },
  hoursNum: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
  hoursUnit: {
    fontSize: 11,
    color: theme.colors.accentDark,
  },
  sectionWrap: {
    marginTop: 10,
    backgroundColor: theme.colors.surface2,
    padding: 10,
    borderRadius: theme.radius.sm,
  },
  diarySection: {
    backgroundColor: '#FAF5EE',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text2,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  diaryBody: {
    fontStyle: 'italic',
  },
  emptyNote: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
