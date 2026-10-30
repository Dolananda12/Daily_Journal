import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { apiFetch } from '../lib/apiClient';
import { Calendar } from 'react-native-calendars';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayStr(): string {
  return formatDate(new Date());
}

function getRelativeLabel(eventDateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(eventDateStr + 'T00:00:00');
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `In ${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  const months = Math.floor(diffDays / 30);
  return `In ${months} month${months > 1 ? 's' : ''}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function EventsScreen() {
  const today = getTodayStr();

  // Calendar display month
  const [calMonth, setCalMonth] = useState(today);

  // Events
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  // Add event modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMonthEvents = useCallback(async (monthStr: string) => {
    setLoadingMonth(true);
    try {
      const [y, m] = monthStr.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      const startStr = formatDate(start);
      const endStr = formatDate(end);
      const res = await apiFetch(`/api/events?start=${startStr}&end=${endStr}`);
      if (res.ok) {
        const data = await res.json();
        setMonthEvents(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  const fetchUpcomingEvents = useCallback(async () => {
    setLoadingUpcoming(true);
    try {
      const res = await apiFetch(`/api/events/upcoming?from=${today}`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingUpcoming(false);
    }
  }, [today]);

  // Load on mount and on focus
  useEffect(() => {
    fetchMonthEvents(calMonth);
    fetchUpcomingEvents();
  }, [calMonth, fetchMonthEvents, fetchUpcomingEvents]);

  useFocusEffect(
    useCallback(() => {
      fetchMonthEvents(calMonth);
      fetchUpcomingEvents();
    }, [calMonth, fetchMonthEvents, fetchUpcomingEvents])
  );

  // ── Marked dates for calendar ──────────────────────────────────────────────
  const markedDates: Record<string, any> = {};
  monthEvents.forEach((ev) => {
    markedDates[ev.event_date] = {
      ...(markedDates[ev.event_date] || {}),
      marked: true,
      dotColor: theme.colors.accentDark,
    };
  });
  if (selectedDay) {
    markedDates[selectedDay] = {
      ...(markedDates[selectedDay] || {}),
      selected: true,
      selectedColor: theme.colors.accentDark,
    };
  }
  markedDates[today] = {
    ...(markedDates[today] || {}),
    today: true,
  };

  // ── Add Event ──────────────────────────────────────────────────────────────
  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !selectedDay) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newEventTitle.trim(), event_date: selectedDay }),
      });
      if (res.ok) {
        setNewEventTitle('');
        setAddModalVisible(false);
        await fetchMonthEvents(calMonth);
        await fetchUpcomingEvents();
      } else {
        Alert.alert('Error', 'Failed to save event. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete Event ──────────────────────────────────────────────────────────
  const handleDeleteEvent = (ev: CalendarEvent) => {
    Alert.alert(
      'Delete Event',
      `Remove "${ev.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiFetch(`/api/events/${ev.id}`, { method: 'DELETE' });
              if (res.ok) {
                setMonthEvents((prev) => prev.filter((e) => e.id !== ev.id));
                setUpcomingEvents((prev) => prev.filter((e) => e.id !== ev.id));
              }
            } catch {
              Alert.alert('Error', 'Could not delete event.');
            }
          },
        },
      ]
    );
  };

  // ── Events for selected day ───────────────────────────────────────────────
  const dayEvents = selectedDay
    ? monthEvents.filter((ev) => ev.event_date === selectedDay)
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Calendar ──────────────────────────────────────────────────── */}
        <View style={styles.calendarCard}>
          <Calendar
            current={calMonth}
            onDayPress={(day: { dateString: string }) => {
              setSelectedDay(day.dateString);
            }}
            onMonthChange={(month: { dateString: string }) => {
              const [y, m] = month.dateString.split('-');
              setCalMonth(`${y}-${m}-01`);
            }}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.colors.surface,
              calendarBackground: theme.colors.surface,
              textSectionTitleColor: theme.colors.text2,
              selectedDayBackgroundColor: theme.colors.accentDark,
              selectedDayTextColor: '#ffffff',
              todayTextColor: theme.colors.accentDark,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.borderStrong,
              dotColor: theme.colors.accentDark,
              selectedDotColor: '#ffffff',
              arrowColor: theme.colors.accentDark,
              monthTextColor: theme.colors.text,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 15,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>

        {/* ── Selected Day Panel ────────────────────────────────────────── */}
        {selectedDay && (
          <View style={styles.dayPanel}>
            <View style={styles.dayPanelHeader}>
              <View>
                <Text style={styles.dayPanelTitle}>{formatDisplayDate(selectedDay)}</Text>
                <Text style={styles.dayPanelSub}>{getRelativeLabel(selectedDay)}</Text>
              </View>
              <TouchableOpacity
                style={styles.addEventBtn}
                onPress={() => {
                  setNewEventTitle('');
                  setAddModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addEventBtnText}>Add Event</Text>
              </TouchableOpacity>
            </View>

            {dayEvents.length === 0 ? (
              <Text style={styles.noDayEvents}>No events on this day. Tap "Add Event" to schedule one.</Text>
            ) : (
              dayEvents.map((ev) => (
                <View key={ev.id} style={styles.dayEventRow}>
                  <Ionicons name="bookmark" size={14} color={theme.colors.accentDark} style={{ marginTop: 2 }} />
                  <Text style={styles.dayEventTitle}>{ev.title}</Text>
                  <TouchableOpacity onPress={() => handleDeleteEvent(ev)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Upcoming Events ───────────────────────────────────────────── */}
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionHeading}>📅  Upcoming Events</Text>
          {loadingUpcoming ? (
            <ActivityIndicator size="small" color={theme.colors.accentDark} style={{ marginVertical: 16 }} />
          ) : upcomingEvents.length === 0 ? (
            <View style={styles.emptyUpcoming}>
              <Text style={styles.emptyUpcomingText}>
                No upcoming events scheduled.{'\n'}Tap any date on the calendar above to add one!
              </Text>
            </View>
          ) : (
            upcomingEvents.map((ev) => {
              const isToday = ev.event_date === today;
              const isPast = ev.event_date < today;
              return (
                <View key={ev.id} style={[styles.upcomingCard, isPast && styles.upcomingCardPast]}>
                  <View style={styles.upcomingLeft}>
                    <View style={[styles.datePill, isToday && styles.datePillToday, isPast && styles.datePillPast]}>
                      <Text style={[styles.datePillText, isToday && styles.datePillTextToday]}>
                        {formatDisplayDate(ev.event_date)}
                      </Text>
                    </View>
                    <Text style={styles.upcomingTitle} numberOfLines={2}>{ev.title}</Text>
                    <Text style={[styles.upcomingRelative, isToday && { color: theme.colors.accentDark, fontWeight: '700' }]}>
                      {getRelativeLabel(ev.event_date)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteEvent(ev)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── Add Event Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Event</Text>
            {selectedDay && (
              <Text style={styles.modalDate}>{formatDisplayDate(selectedDay)}</Text>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Event title…"
              placeholderTextColor={theme.colors.textMuted}
              value={newEventTitle}
              onChangeText={setNewEventTitle}
              onSubmitEditing={handleAddEvent}
              autoFocus
              returnKeyType="done"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setAddModalVisible(false); setNewEventTitle(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!newEventTitle.trim() || submitting) && styles.saveBtnDisabled]}
                onPress={handleAddEvent}
                disabled={!newEventTitle.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Event</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingBottom: 40,
  },

  // Calendar
  calendarCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },

  // Selected Day Panel
  dayPanel: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    padding: 14,
    ...theme.shadow.sm,
  },
  dayPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dayPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  dayPanelSub: {
    fontSize: 12,
    color: theme.colors.accentDark,
    fontWeight: '600',
    marginTop: 2,
  },
  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentDark,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: theme.radius.round,
  },
  addEventBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  noDayEvents: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  dayEventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dayEventTitle: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },

  // Upcoming Section
  upcomingSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 0.3,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  emptyUpcoming: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    alignItems: 'center',
  },
  emptyUpcomingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  upcomingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  upcomingCardPast: {
    opacity: 0.55,
    borderLeftColor: theme.colors.borderStrong,
  },
  upcomingLeft: {
    flex: 1,
    gap: 4,
  },
  datePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentFaint,
    borderRadius: theme.radius.round,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  datePillToday: {
    backgroundColor: theme.colors.accentDark,
  },
  datePillPast: {
    backgroundColor: theme.colors.surface2,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
  datePillTextToday: {
    color: '#fff',
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 20,
  },
  upcomingRelative: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },

  // Add Event Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: 24,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 13,
    color: theme.colors.accentDark,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text2,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentDark,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
