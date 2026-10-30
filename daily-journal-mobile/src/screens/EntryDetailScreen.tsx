import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface Entry {
  entry_date: string;
  academics_notes?: string;
  life_notes?: string;
  diary_notes?: string;
  hours_studied?: number;
  todos?: TodoItem[];
}

interface EntryDetailScreenProps {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
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

export function EntryDetailScreen({ visible, entry, onClose }: EntryDetailScreenProps) {
  if (!entry) return null;

  const doneTasks = (entry.todos ?? []).filter((t) => t.done).length;
  const totalTasks = (entry.todos ?? []).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.root}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.headerDate} numberOfLines={1}>
              {formatDisplayDate(entry.entry_date)}
            </Text>
            {(entry.hours_studied ?? 0) > 0 && (
              <View style={styles.hoursBadge}>
                <Text style={styles.hoursBadgeText}>{entry.hours_studied} hrs studied</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tasks */}
          {totalTasks > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>✅</Text>
                <Text style={styles.sectionTitle}>Tasks</Text>
                <View style={styles.progressPill}>
                  <Text style={styles.progressText}>{doneTasks}/{totalTasks}</Text>
                </View>
              </View>
              {(entry.todos ?? []).map((todo) => (
                <View key={todo.id} style={styles.todoRow}>
                  <Ionicons
                    name={todo.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={17}
                    color={todo.done ? theme.colors.accent : theme.colors.borderStrong}
                  />
                  <Text style={[styles.todoText, todo.done && styles.todoDone]}>
                    {todo.text}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Academics */}
          {entry.academics_notes?.trim() ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📚</Text>
                <Text style={styles.sectionTitle}>Academics</Text>
              </View>
              <Text style={styles.bodyText}>{entry.academics_notes}</Text>
            </View>
          ) : null}

          {/* Life */}
          {entry.life_notes?.trim() ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🌱</Text>
                <Text style={styles.sectionTitle}>Life Lessons</Text>
              </View>
              <Text style={styles.bodyText}>{entry.life_notes}</Text>
            </View>
          ) : null}

          {/* Diary */}
          {entry.diary_notes?.trim() ? (
            <View style={[styles.section, styles.diarySection]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📓</Text>
                <Text style={[styles.sectionTitle, { color: theme.colors.accentDark }]}>
                  Dear Diary
                </Text>
              </View>
              <Text style={[styles.bodyText, styles.diaryText]}>
                {entry.diary_notes}
              </Text>
            </View>
          ) : null}

          {/* Empty */}
          {!entry.academics_notes?.trim() &&
            !entry.life_notes?.trim() &&
            !entry.diary_notes?.trim() &&
            totalTasks === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No reflections recorded for this day.</Text>
              </View>
            )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerMid: {
    flex: 1,
    gap: 4,
  },
  headerDate: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  hoursBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentFaint,
    borderRadius: theme.radius.round,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  hoursBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 14,
  },

  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 10,
    ...theme.shadow.sm,
  },
  diarySection: {
    backgroundColor: '#FAF5EE',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  progressPill: {
    backgroundColor: theme.colors.accentFaint,
    borderRadius: theme.radius.round,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
  bodyText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 24,
  },
  diaryText: {
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    lineHeight: 26,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  todoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 21,
  },
  todoDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});
