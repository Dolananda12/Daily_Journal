import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { getTodayString } from '../lib/dateUtils';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  entryDates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  missedDays: number;
}

export function CalendarModal({
  visible,
  onClose,
  entryDates,
  selectedDate,
  onSelectDate,
  missedDays,
}: CalendarModalProps) {
  const today = getTodayString();

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    entryDates.forEach((d) => {
      marks[d] = {
        marked: true,
        dotColor: theme.colors.accent,
      };
    });

    if (marks[selectedDate]) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: theme.colors.accentDark,
      };
    } else {
      marks[selectedDate] = {
        selected: true,
        selectedColor: theme.colors.accentDark,
      };
    }

    return marks;
  }, [entryDates, selectedDate]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Calendar</Text>
              {missedDays > 0 ? (
                <Text style={styles.missedText}>
                  {missedDays} missed day{missedDays > 1 ? 's' : ''} this week
                </Text>
              ) : (
                <Text style={styles.streakText}>All caught up this week!</Text>
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarWrap}>
            <Calendar
              current={selectedDate || today}
              maxDate={today}
              onDayPress={(day: { dateString: string }) => {
                onSelectDate(day.dateString);
                onClose();
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
                dotColor: theme.colors.accent,
                selectedDotColor: '#ffffff',
                arrowColor: theme.colors.accentDark,
                monthTextColor: theme.colors.text,
                indicatorColor: theme.colors.accent,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 15,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13,
              }}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => {
                onSelectDate(today);
                onClose();
              }}
            >
              <Ionicons name="today-outline" size={16} color={theme.colors.accentDark} />
              <Text style={styles.todayButtonText}>Jump to Today</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  missedText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 2,
    fontWeight: '600',
  },
  streakText: {
    fontSize: 12,
    color: theme.colors.success,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  calendarWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: theme.colors.accentFaint,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
});
