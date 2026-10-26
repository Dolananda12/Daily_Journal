import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { syncTaskNotifications } from '../lib/notificationService';

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

interface TargetItem {
  id: string;
  text: string;
  done: boolean;
}

interface TodayScreenProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenFailureRegister: () => void;
  onEntrySaved?: (entry: Entry) => void;
  onUncompletedTasksChange?: (count: number) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getMonday(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function currentWeekKey(d: Date = new Date()): string {
  const m = getMonday(d);
  const y = m.getFullYear();
  const mo = String(m.getMonth() + 1).padStart(2, '0');
  const da = String(m.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function weekLabel(key: string): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = mon.toLocaleDateString('en-US', opts);
  const endStr = sun.toLocaleDateString('en-US', opts);
  return `${startStr} – ${endStr}`;
}

export function TodayScreen({
  selectedDate,
  onSelectDate,
  onOpenFailureRegister,
  onEntrySaved,
  onUncompletedTasksChange,
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

  const viewingToday = isToday(selectedDate);
  const viewingPast = isPastDate(selectedDate);

  // Sync notification badge, live 24/7 notification, and daily reminder when tasks change
  useEffect(() => {
    if (viewingToday && !loading) {
      const pending = todos.filter((t) => !t.done);
      const uncompleted = pending.length;
      const titles = pending.map((t) => t.text);
      syncTaskNotifications(uncompleted, titles);
      onUncompletedTasksChange?.(uncompleted);
    }
  }, [todos, viewingToday, loading, onUncompletedTasksChange]);

  // Approaching events
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

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
      let data: Entry | null = null;
      if (res.ok) {
        const text = await res.text();
        data = text ? JSON.parse(text) : null;
      }

      const loadedTodos = Array.isArray(data?.todos) ? data!.todos : [];
      setTodos(loadedTodos);
      setAcademics(data?.academics_notes ?? '');
      setLife(data?.life_notes ?? '');
      setDiary(data?.diary_notes ?? '');
      setHours(data?.hours_studied ?? 0);
      setJournalOpen(
        !!(data?.academics_notes || data?.life_notes || data?.diary_notes || (data?.hours_studied ?? 0) > 0)
      );

      // If today and no tasks recorded yet in this entry, check previous entry for undone tasks
      if (viewingToday && loadedTodos.length === 0) {
        try {
          const todayD = new Date(selectedDate + 'T00:00:00');
          const prevD = new Date(todayD);
          prevD.setDate(todayD.getDate() - 1);
          const prevStr = [
            prevD.getFullYear(),
            String(prevD.getMonth() + 1).padStart(2, '0'),
            String(prevD.getDate()).padStart(2, '0'),
          ].join('-');

          let carried: TodoItem[] = [];

          // 1. Try yesterday
          const prevRes = await apiFetch(`/api/entries/${prevStr}`);
          if (prevRes.ok) {
            const prevText = await prevRes.text();
            const prevData = prevText ? JSON.parse(prevText) : null;
            const unfinished = (prevData?.todos ?? [])
              .filter((t: TodoItem) => !t.done)
              .map((t: TodoItem) => ({ ...t, id: uid(), done: false }));
            if (unfinished.length > 0) {
              carried = unfinished;
            }
          }

          // 2. If yesterday had no undone tasks, check most recent past entry
          if (carried.length === 0) {
            const listRes = await apiFetch('/api/entries');
            if (listRes.ok) {
              const listText = await listRes.text();
              const listData = listText ? JSON.parse(listText) : [];
              if (Array.isArray(listData)) {
                const pastDates = listData
                  .map((e: { entry_date: string }) => e.entry_date)
                  .filter((d: string) => d < selectedDate)
                  .sort((a: string, b: string) => b.localeCompare(a));

                if (pastDates.length > 0 && pastDates[0] !== prevStr) {
                  const mRes = await apiFetch(`/api/entries/${pastDates[0]}`);
                  if (mRes.ok) {
                    const mText = await mRes.text();
                    const mData = mText ? JSON.parse(mText) : null;
                    const unfinished = (mData?.todos ?? [])
                      .filter((t: TodoItem) => !t.done)
                      .map((t: TodoItem) => ({ ...t, id: uid(), done: false }));
                    if (unfinished.length > 0) {
                      carried = unfinished;
                    }
                  }
                }
              }
            }
          }

          if (carried.length > 0) {
            setTodos(carried);
            setCarriedOver(carried.length);
          }
        } catch {
          // ignore carryover network error
        }
      }
    } catch {
      setTodos([]);
      setAcademics('');
      setLife('');
      setDiary('');
      setHours(0);
      setJournalOpen(true);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewingToday]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  // Weekly targets state & fetch
  const [weeklyTargets, setWeeklyTargets] = useState<TargetItem[]>([]);
  const [weekKey, setWeekKey] = useState('');

  const fetchWeeklyTargets = useCallback(async (dateStr: string) => {
    const baseDate = new Date(dateStr + 'T00:00:00');
    const wKey = currentWeekKey(baseDate);
    setWeekKey(wKey);

    try {
      const r = await apiFetch(`/api/targets?type=weekly&key=${encodeURIComponent(wKey)}`);
      if (!r.ok) {
        setWeeklyTargets([]);
        return;
      }
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      setWeeklyTargets(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setWeeklyTargets([]);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyTargets(selectedDate);
  }, [selectedDate, fetchWeeklyTargets]);

  // Refetch weekly targets every time the user navigates back to Today/home
  useFocusEffect(
    useCallback(() => {
      fetchWeeklyTargets(selectedDate);
    }, [selectedDate, fetchWeeklyTargets])
  );

  const toggleWeeklyTarget = async (id: string) => {
    const updated = weeklyTargets.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setWeeklyTargets(updated);
    try {
      await apiFetch(`/api/targets?type=weekly&key=${encodeURIComponent(weekKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      });
    } catch {
      // ignore
    }
  };

  const [newWeeklyText, setNewWeeklyText] = useState('');
  const [addingWeekly, setAddingWeekly] = useState(false);

  const addWeeklyTarget = async () => {
    const trimmed = newWeeklyText.trim();
    if (!trimmed) return;
    const newItem: TargetItem = { id: uid(), text: trimmed, done: false };
    const updated = [...weeklyTargets, newItem];
    setWeeklyTargets(updated);
    setNewWeeklyText('');
    setAddingWeekly(false);

    try {
      await apiFetch(`/api/targets?type=weekly&key=${encodeURIComponent(weekKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      });
    } catch {
      // rollback or ignore
    }
  };

  const deleteWeeklyTarget = async (id: string) => {
    const updated = weeklyTargets.filter((t) => t.id !== id);
    setWeeklyTargets(updated);
    try {
      await apiFetch(`/api/targets?type=weekly&key=${encodeURIComponent(weekKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      });
    } catch {
      // ignore
    }
  };

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

      {/* Weekly Targets (Displayed on TOP of Approaching Events) */}
      <View style={styles.weeklyCard}>
        <View style={styles.weeklyCardHeader}>
          <View style={styles.weeklyTitleWrap}>
            <Text style={styles.weeklyIcon}>⚡</Text>
            <Text style={styles.weeklyCardTitle}>Weekly Targets</Text>
            <Text style={styles.weeklyRange}>({weekLabel(weekKey)})</Text>
          </View>
          {weeklyTargets.length > 0 && (
            <View style={styles.weeklyBadge}>
              <Text style={styles.weeklyBadgeText}>
                {weeklyTargets.filter((t) => t.done).length}/{weeklyTargets.length}
              </Text>
            </View>
          )}
        </View>

        {weeklyTargets.map((target) => (
          <View key={target.id} style={[styles.weeklyRow, target.done && styles.weeklyRowDone]}>
            <TouchableOpacity
              style={styles.weeklyCheckbox}
              onPress={() => toggleWeeklyTarget(target.id)}
            >
              <Ionicons
                name={target.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={target.done ? theme.colors.accent : theme.colors.borderStrong}
              />
            </TouchableOpacity>
            <Text style={[styles.weeklyText, target.done && styles.weeklyTextDone]}>
              {target.text}
            </Text>
            <TouchableOpacity
              style={styles.weeklyDeleteBtn}
              onPress={() => deleteWeeklyTarget(target.id)}
            >
              <Ionicons name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}

        {weeklyTargets.length === 0 && !addingWeekly && (
          <Text style={styles.weeklyEmptyText}>No weekly targets defined yet.</Text>
        )}

        {/* Inline Add Target directly on Today view */}
        {addingWeekly ? (
          <View style={styles.weeklyAddRow}>
            <TextInput
              style={styles.weeklyAddInput}
              placeholder="Enter weekly target..."
              placeholderTextColor={theme.colors.textMuted}
              value={newWeeklyText}
              onChangeText={setNewWeeklyText}
              onSubmitEditing={addWeeklyTarget}
              autoFocus
            />
            <TouchableOpacity style={styles.weeklyAddSubmitBtn} onPress={addWeeklyTarget}>
              <Text style={styles.weeklyAddSubmitText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.weeklyAddCancelBtn}
              onPress={() => {
                setAddingWeekly(false);
                setNewWeeklyText('');
              }}
            >
              <Ionicons name="close" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.weeklyAddBtn}
            onPress={() => setAddingWeekly(true)}
          >
            <Ionicons name="add" size={15} color={theme.colors.accentDark} />
            <Text style={styles.weeklyAddBtnText}>Add weekly target</Text>
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
                  multiline={true}
                  scrollEnabled={false}
                  textAlignVertical="top"
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
  // Weekly targets card styles (on top of approaching events)
  weeklyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.45)',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    ...theme.shadow.sm,
  },
  weeklyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weeklyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  weeklyIcon: {
    fontSize: 14,
  },
  weeklyCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  weeklyRange: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  weeklyBadge: {
    backgroundColor: theme.colors.accentFaint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.round,
  },
  weeklyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface2,
  },
  weeklyRowDone: {
    opacity: 0.6,
  },
  weeklyText: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 18,
  },
  weeklyTextDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  weeklyCheckbox: {
    paddingRight: 8,
    paddingTop: 1,
  },
  weeklyDeleteBtn: {
    padding: 2,
    marginLeft: 6,
  },
  weeklyEmptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  weeklyAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface2,
  },
  weeklyAddInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface2,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
  },
  weeklyAddSubmitBtn: {
    backgroundColor: theme.colors.accentDark,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
  },
  weeklyAddSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  weeklyAddCancelBtn: {
    padding: 6,
  },
  weeklyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface2,
  },
  weeklyAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accentDark,
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
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface2,
  },
  todoItemDone: {
    opacity: 0.6,
  },
  checkbox: {
    paddingRight: 8,
    paddingTop: 3,
  },
  todoInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 2,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  todoInputDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  deleteTodoBtn: {
    padding: 4,
    paddingTop: 3,
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
