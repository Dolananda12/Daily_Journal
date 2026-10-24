import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { apiFetch } from '../lib/apiClient';
import { formatDisplayDate } from '../lib/dateUtils';

interface FailureEntry {
  id: number;
  entryDate: string;
  description: string;
  tag: 'Academic' | 'Life';
  lesson: string;
  createdAt: string;
}

interface FailureRegisterModalProps {
  visible: boolean;
  onClose: () => void;
  defaultDate: string;
}

const LOCAL_FALLBACK_QUOTES = [
  { text: 'Failure is simply the opportunity to begin again, this time more intelligently.', author: 'Henry Ford' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: 'Thomas Edison' },
  { text: 'Failure is the condiment that gives success its flavor.', author: 'Truman Capote' },
  { text: 'The only real mistake is the one from which we learn nothing.', author: 'Henry Ford' },
];

export function FailureRegisterModal({ visible, onClose, defaultDate }: FailureRegisterModalProps) {
  const [entries, setEntries] = useState<FailureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [tag, setTag] = useState<'Academic' | 'Life'>('Academic');
  const [description, setDescription] = useState('');
  const [lesson, setLesson] = useState('');
  const [saving, setSaving] = useState(false);

  // Quote
  const [quoteIndex, setQuoteIndex] = useState(0);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/failures');
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchEntries();
      setShowAddForm(false);
    }
  }, [visible, fetchEntries]);

  const cycleQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % LOCAL_FALLBACK_QUOTES.length);
  };

  const handleSaveFailure = async () => {
    if (!description.trim() || !lesson.trim()) return;

    setSaving(true);
    try {
      const res = await apiFetch('/api/failures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate: defaultDate,
          tag,
          description: description.trim(),
          lesson: lesson.trim(),
        }),
      });

      if (res.ok) {
        setDescription('');
        setLesson('');
        setShowAddForm(false);
        fetchEntries();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const quote = LOCAL_FALLBACK_QUOTES[quoteIndex];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerIcon}>📕</Text>
            <Text style={styles.headerTitle}>Failure Register</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Motivational quote card */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <View style={styles.quoteFooter}>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
            <TouchableOpacity onPress={cycleQuote} style={styles.quoteRefreshBtn}>
              <Ionicons name="refresh" size={14} color={theme.colors.accentDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sub-header with Add Toggle */}
        <View style={styles.toolbar}>
          <Text style={styles.countText}>{entries.length} reflections recorded</Text>
          <TouchableOpacity
            style={styles.addToggleBtn}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Ionicons
              name={showAddForm ? 'chevron-up' : 'add'}
              size={16}
              color={theme.colors.accentDark}
            />
            <Text style={styles.addToggleText}>
              {showAddForm ? 'Cancel' : 'Log Setback'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Form */}
        {showAddForm && (
          <View style={styles.formCard}>
            <View style={styles.tagSelector}>
              <TouchableOpacity
                style={[styles.tagBtn, tag === 'Academic' && styles.tagBtnActive]}
                onPress={() => setTag('Academic')}
              >
                <Text
                  style={[styles.tagBtnText, tag === 'Academic' && styles.tagBtnTextActive]}
                >
                  📚 Academic
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tagBtn, tag === 'Life' && styles.tagBtnActive]}
                onPress={() => setTag('Life')}
              >
                <Text
                  style={[styles.tagBtnText, tag === 'Life' && styles.tagBtnTextActive]}
                >
                  🌱 Life
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="What went wrong / what was the setback?"
              placeholderTextColor={theme.colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              placeholder="What lesson or rule do you extract from this?"
              placeholderTextColor={theme.colors.textMuted}
              value={lesson}
              onChangeText={setLesson}
              multiline
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveFailure}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Record & Extract Lesson</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Entries list */}
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={theme.colors.accentDark} />
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={[styles.badge, item.tag === 'Academic' ? styles.badgeAcademic : styles.badgeLife]}>
                    <Text style={styles.badgeText}>{item.tag}</Text>
                  </View>
                  <Text style={styles.entryDate}>{formatDisplayDate(item.entryDate)}</Text>
                </View>

                <Text style={styles.entryDesc}>{item.description}</Text>

                <View style={styles.lessonBox}>
                  <Text style={styles.lessonLabel}>💡 LESSON EXTRACTED</Text>
                  <Text style={styles.lessonText}>{item.lesson}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>✨</Text>
                <Text style={styles.emptyTitle}>No setbacks recorded yet</Text>
                <Text style={styles.emptySub}>
                  When things don't go according to plan, turn the breakdown into a breakthrough.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  closeBtn: {
    padding: 6,
  },
  quoteCard: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.accentFaint,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: theme.colors.text,
    lineHeight: 20,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  quoteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  quoteAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
  quoteRefreshBtn: {
    padding: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  countText: {
    fontSize: 13,
    color: theme.colors.text2,
    fontWeight: '500',
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.round,
  },
  addToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
  formCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  tagSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagBtnActive: {
    backgroundColor: theme.colors.accentFaint,
    borderColor: theme.colors.accent,
  },
  tagBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text2,
  },
  tagBtnTextActive: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 10,
    minHeight: 44,
  },
  saveBtn: {
    backgroundColor: theme.colors.accentDark,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  entryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.round,
  },
  badgeAcademic: {
    backgroundColor: '#E0E7FF',
  },
  badgeLife: {
    backgroundColor: '#DCFCE7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
  },
  entryDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  entryDesc: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  lessonBox: {
    backgroundColor: theme.colors.surface2,
    padding: 12,
    borderRadius: theme.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  lessonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accentDark,
    marginBottom: 4,
    letterSpacing: 1,
  },
  lessonText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
