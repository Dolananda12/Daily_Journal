import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { apiFetch } from '../lib/apiClient';
import {
  isToday,
  isPastDate,
  formatDisplayDate,
  formatShortDate,
} from '../lib/dateUtils';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface Entry {
  entry_date: string;
  academics_notes: string;
  life_notes: string;
  hours_studied: number;
  diary_notes: string;
  todos: TodoItem[];
}

interface Quote {
  q: string;
  a: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
}

interface TodayScreenProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenFailureRegister: () => void;
  onEntrySaved?: (entry: Entry) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function TodayScreen({
  selectedDate,
  onSelectDate,
  onOpenFailureRegister,
  onEntrySaved,
}: TodayScreenProps) {
  // Quote
  const [quote, setQuote] = useState<Quote | null>(null);

  // Entry states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [carriedOver, setCarriedOver] = useState(0);

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [academics, setAcademics] = useState('');
  const [life, setLife] = useState('');
  const [diary, setDiary] = useState('');
  const [hours, setHours] = useState(0);
  const [journalOpen, setJournalOpen] = useState(true);

  // Approaching events
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  const viewingToday = isToday(selectedDate);
  const viewingPast = isPastDate(selectedDate);

  // Fetch Quote
  useEffect(() => {
    apiFetch('/api/quote')
      .then((r) => r.json())
      .then((data) => setQuote(data))
      .catch(() =>
        setQuote({ q: 'Every day is a new beginning. Make it count.', a: 'Marcus Aurelius' })
      );
  }, []);

  // Fetch Upcoming Events
  useEffect(() => {
    const baseDate = new Date(selectedDate + 'T00:00:00');
    const oneWeekLater = new Date(baseDate);
    oneWeekLater.setDate(baseDate.getDate() + 7);

    apiFetch(`/api/events/upcoming?from=${selectedDate}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CalendarEvent[]) => {
        if (!Array.isArray(data)) {
          setUpcomingEvents([]);
          return;
        }
        const filtered = data.filter((ev) => {
          const evDate = new Date(ev.event_date + 'T00:00:00');
          return evDate >= baseDate && evDate <= oneWeekLater;
        });
        setUpcomingEvents(filtered);
      })
      .catch(() => setUpcomingEvents([]));
  }, [selectedDate]);

  // Load selected date's entry
  const loadEntry = useCallback(async () => {
    setLoading(true);
    setCarriedOver(0);
    try {
      const res = await apiFetch(`/api/entries/${selectedDate}`);
      if (res.ok) {
        const data: Entry = await res.json();
        const loadedTodos = data?.todos ?? [];
        setTodos(loadedTodos);
        setAcademics(data?.academics_notes ?? '');
        setLife(data?.life_notes ?? '');
        setDiary(data?.diary_notes ?? '');
        setHours(data?.hours_studied ?? 0);
        setJournalOpen(
          !!(data?.academics_notes || data?.life_notes || data?.diary_notes || (data?.hours_studied ?? 0) > 0)
        );

        // If today and no tasks recorded yet, check yesterday for carryover
        if (viewingToday && loadedTodos.length === 0 && !data?.academics_notes && !data?.life_notes) {
          const todayD = new Date(selectedDate + 'T00:00:00');
          const prevD = new Date(todayD);
          prevD.setDate(todayD.getDate() - 1);
          const prevStr = [
            prevD.getFullYear(),
            String(prevD.getMonth() + 1).padStart(2, '0'),
            String(prevD.getDate()).padStart(2, '0'),
          ].join('-');

          try {
            const prevRes = await apiFetch(`/api/entries/${prevStr}`);
            if (prevRes.ok) {
              const prevData = await prevRes.json();
              const unfinished = (prevData?.todos ?? [])
                .filter((t: TodoItem) => !t.done)
                .map((t: TodoItem) => ({ ...t, id: uid(), done: false }));
              if (unfinished.length > 0) {
                setTodos(unfinished);
                setCarriedOver(unfinished.length);
              }
            }
          } catch {
            // ignore carryover error
          }
        }
      } else {
        // Empty entry
        setTodos([]);
        setAcademics('');
        setLife('');
        setDiary('');
        setHours(0);
        setJournalOpen(true);
      }
    } catch {
      setTodos([]);
      setAcademics('');
      setLife('');
      setDiary('');
      setHours(0);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewingToday]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  // Task operations
  const toggleTodo = (id: string) => {
    if (viewingPast) return;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const updateTodoText = (id: string, text: string) => {
    if (viewingPast) return;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text } : t))
    );
  };

  const deleteTodo = (id: string) => {
    if (viewingPast) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const addTodo = () => {
    if (viewingPast) return;
    setTodos((prev) => [...prev, { id: uid(), text: '', done: false }]);
  };

  const adjustHours = (delta: number) => {
    if (viewingPast) return;
    setHours((h) => Math.max(0, Math.min(24, parseFloat((h + delta).toFixed(1)))));
  };

  // Save entry
  const handleSave = async () => {
    if (viewingPast) return;
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await apiFetch(`/api/entries/${selectedDate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academics_notes: academics,
          life_notes: life,
          hours_studied: hours,
          diary_notes: diary,
          todos,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Save Failed', err.error || 'Could not save entry.');
        return;
      }

      const updated = await res.json();
      onEntrySaved?.(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to connect to backend.');
    } finally {
      setSaving(false);
    }
  };

  const doneCount = todos.filter((t) => t.done).length;
  const totalCount = todos.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Quote card (Only on Today) */}
      {viewingToday && quote && (
        <View style={styles.quoteCard}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.quoteText}>{quote.q}</Text>
          <View style={styles.quoteDivider} />
          <Text style={styles.quoteAuthor}>— {quote.a}</Text>
        </View>
      )}

      {/* Date Header */}
      <View style={styles.dateHeader}>
        <View>
          <Text style={styles.dateTitle}>
            {viewingToday ? 'Today' : formatDisplayDate(selectedDate)}
          </Text>
          <Text style={styles.dateSub}>
            {viewingToday
              ? formatDisplayDate(selectedDate)
              : viewingPast
              ? 'This entry is locked and read-only.'
              : ''}
          </Text>
        </View>

        {!viewingToday && (
          <TouchableOpacity
            style={styles.returnTodayBtn}
            onPress={() => onSelectDate(selectedDate)}
          >
            <Ionicons name="arrow-back" size={14} color={theme.colors.accentDark} />
            <Text style={styles.returnTodayText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Approaching Events (Next 7 Days) */}
      {upcomingEvents.length > 0 && (
        <View style={styles.eventsCard}>
          <View style={styles.eventsCardHeader}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.accentDark} />
            <Text style={styles.eventsCardTitle}>Approaching Events (Next 7 Days)</Text>
          </View>
          {upcomingEvents.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {ev.title}
              </Text>
              <Text style={styles.eventDate}>{formatShortDate(ev.event_date)}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={theme.colors.accentDark} />
        </View>
      ) : (
        <View style={styles.card}>
          {/* Tasks Section */}
          {carriedOver > 0 && (
            <View style={styles.carryoverBanner}>
              <Ionicons name="return-down-forward" size={14} color={theme.colors.accentDark} />
              <Text style={styles.carryoverBannerText}>
                {carriedOver} unfinished task{carriedOver !== 1 ? 's' : ''} carried over from yesterday
              </Text>
            </View>
          )}

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionLabelWrap}>
              <Text style={styles.sectionIcon}>✅</Text>
              <Text style={styles.sectionTitle}>Tasks</Text>
            </View>
            {totalCount > 0 && (
              <View style={styles.progressPill}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(doneCount / totalCount) * 100}%` },
                  ]}
                />
                <Text style={styles.progressText}>
                  {doneCount}/{totalCount}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.todoList}>
            {todos.map((item) => (
              <View
                key={item.id}
                style={[styles.todoItem, item.done && styles.todoItemDone]}
              >
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleTodo(item.id)}
                  disabled={viewingPast}
                >
                  <Ionicons
                    name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={item.done ? theme.colors.accent : theme.colors.borderStrong}
                  />
                </TouchableOpacity>

                <TextInput
                  style={[styles.todoInput, item.done && styles.todoInputDone]}
                  value={item.text}
                  onChangeText={(text) => updateTodoText(item.id, text)}
                  placeholder="Add a task…"
                  placeholderTextColor={theme.colors.textMuted}
                  editable={!viewingPast}
                />

                {!viewingPast && (
                  <TouchableOpacity
                    style={styles.deleteTodoBtn}
                    onPress={() => deleteTodo(item.id)}
                  >
                    <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {!viewingPast && (
            <TouchableOpacity style={styles.addTodoBtn} onPress={addTodo}>
              <Ionicons name="add" size={16} color={theme.colors.accentDark} />
              <Text style={styles.addTodoText}>Add task</Text>
            </TouchableOpacity>
          )}

          {/* Accordion: Journal & Hours */}
          <View style={styles.accordionContainer}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setJournalOpen(!journalOpen)}
            >
              <View style={styles.accordionLabelWrap}>
                <Text style={styles.sectionIcon}>📖</Text>
                <Text style={styles.accordionTitle}>Journal & Hours</Text>
              </View>
              <Ionicons
                name={journalOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.text2}
              />
            </TouchableOpacity>

            {journalOpen && (
              <View style={styles.accordionBody}>
                {/* Academics */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldIcon}>📚</Text>
                    <Text style={styles.fieldLabel}>What I Learnt — Academics</Text>
                  </View>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="What concepts, topics, or skills did you study today?"
                    placeholderTextColor={theme.colors.textMuted}
                    value={academics}
                    onChangeText={setAcademics}
                    editable={!viewingPast}
                  />
                </View>

                {/* Life Lessons */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldIcon}>🌱</Text>
                    <Text style={styles.fieldLabel}>What I Learnt — Life</Text>
                  </View>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="What life lessons, observations, or insights did today bring?"
                    placeholderTextColor={theme.colors.textMuted}
                    value={life}
                    onChangeText={setLife}
                    editable={!viewingPast}
                  />
                </View>

                {/* Dear Diary */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldIcon}>📓</Text>
                    <Text style={styles.fieldLabel}>Dear Diary</Text>
                  </View>
                  <TextInput
                    style={[styles.textArea, styles.diaryArea]}
                    multiline
                    numberOfLines={5}
                    placeholder="Write freely — how was your day? What's on your mind?"
                    placeholderTextColor={theme.colors.textMuted}
                    value={diary}
                    onChangeText={setDiary}
                    editable={!viewingPast}
                  />
                </View>

                {/* Hours Studied */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldIcon}>⏱</Text>
                    <Text style={styles.fieldLabel}>Hours Studied</Text>
                  </View>
                  <View style={styles.hoursRow}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => adjustHours(-0.5)}
                      disabled={viewingPast}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </TouchableOpacity>

                    <Text style={styles.hoursValueText}>{hours.toFixed(1)}</Text>

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => adjustHours(0.5)}
                      disabled={viewingPast}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </TouchableOpacity>

                    <Text style={styles.hoursUnit}>hours</Text>
                  </View>
                </View>

                {/* Failure Register shortcut */}
                <TouchableOpacity
                  style={styles.failureLinkRow}
                  onPress={onOpenFailureRegister}
                >
                  <View style={styles.failureLinkLeft}>
                    <Text style={styles.failureLinkIcon}>📕</Text>
                    <Text style={styles.failureLinkTitle}>Failure Register</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Save Button */}
          {!viewingPast && (
            <View style={styles.saveContainer}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Entry</Text>
                  </>
                )}
              </TouchableOpacity>

              {savedSuccess && (
                <View style={styles.savedFeedback}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.success} />
                  <Text style={styles.savedFeedbackText}>Entry Saved</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  quoteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  quoteMark: {
    fontSize: 28,
    color: theme.colors.accent,
    lineHeight: 28,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: theme.colors.text,
    lineHeight: 22,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    marginTop: -8,
  },
  quoteDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
    width: 32,
  },
  quoteAuthor: {
    fontSize: 12,
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  dateSub: {
    fontSize: 13,
    color: theme.colors.text2,
    marginTop: 2,
  },
  returnTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.round,
  },
  returnTodayText: {
    fontSize: 12,
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  eventsCard: {
    backgroundColor: theme.colors.accentFaint,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  eventsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  eventsCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 169, 110, 0.2)',
  },
  eventTitle: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  eventDate: {
    fontSize: 12,
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  loadingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 32,
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  carryoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentFaint,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  carryoverBannerText: {
    fontSize: 12,
    color: theme.colors.accentDark,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.round,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
    position: 'relative',
    minWidth: 44,
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(72, 187, 120, 0.2)',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text2,
  },
  todoList: {
    marginBottom: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface2,
  },
  todoItemDone: {
    opacity: 0.6,
  },
  checkbox: {
    paddingRight: 8,
  },
  todoInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 4,
  },
  todoInputDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  deleteTodoBtn: {
    padding: 4,
  },
  addTodoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 4,
  },
  addTodoText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
  accordionContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  accordionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  accordionBody: {
    marginTop: 12,
    gap: 16,
  },
  fieldGroup: {},
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldIcon: {
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text2,
  },
  textArea: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    fontSize: 14,
    color: theme.colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  diaryArea: {
    fontStyle: 'italic',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  hoursValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  hoursUnit: {
    fontSize: 14,
    color: theme.colors.text2,
  },
  failureLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface2,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  failureLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  failureLinkIcon: {
    fontSize: 16,
  },
  failureLinkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saveContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentDark,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  savedFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedFeedbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.success,
  },
});
