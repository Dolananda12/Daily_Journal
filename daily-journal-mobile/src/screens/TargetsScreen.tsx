import React, { useState, useEffect, useCallback, useRef } from 'react';
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

interface TargetItem {
  id: string;
  text: string;
  done: boolean;
}

type SubTab = 'weekly' | 'monthly' | 'semester';

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

function currentWeekKey(): string {
  const m = getMonday();
  const y = m.getFullYear();
  const mo = String(m.getMonth() + 1).padStart(2, '0');
  const da = String(m.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function shiftWeek(key: string, deltaWeeks: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaWeeks * 7);
  const ry = date.getFullYear();
  const rm = String(date.getMonth() + 1).padStart(2, '0');
  const rd = String(date.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

function weekLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = mon.toLocaleDateString('en-US', opts);
  const endStr = sun.toLocaleDateString('en-US', opts);
  return `${startStr} – ${endStr}, ${sun.getFullYear()}`;
}

function currentMonthKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function TargetsScreen() {
  const [subTab, setSubTab] = useState<SubTab>('weekly');
  const [weekKey, setWeekKey] = useState(currentWeekKey());
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [semesterKey, setSemesterKey] = useState('current');
  const [items, setItems] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const type = subTab;
      const key = subTab === 'weekly' ? weekKey : subTab === 'monthly' ? monthKey : semesterKey;
      const url = `/api/targets?type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data?.items ?? []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [subTab, weekKey, monthKey, semesterKey]);

  const dirtyRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const subTabRef = useRef(subTab);
  subTabRef.current = subTab;
  const keyRef = useRef('');
  keyRef.current = subTab === 'weekly' ? weekKey : subTab === 'monthly' ? monthKey : semesterKey;

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  useFocusEffect(
    useCallback(() => {
      fetchTargets();
      return () => {
        // Auto-save on blur if user modified targets
        if (dirtyRef.current) {
          const type = subTabRef.current;
          const key = keyRef.current;
          const url = `/api/targets?type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}`;
          apiFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsRef.current }),
          }).catch(() => {});
          dirtyRef.current = false;
        }
      };
    }, [fetchTargets])
  );

  const toggleItem = (id: string) => {
    const next = items.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setItems(next);
    itemsRef.current = next;
    const type = subTab;
    const key = subTab === 'weekly' ? weekKey : subTab === 'monthly' ? monthKey : semesterKey;
    apiFetch(`/api/targets?type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: next }),
    }).catch(() => {});
  };

  const updateItemText = (id: string, text: string) => {
    dirtyRef.current = true;
    setItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text } : t))
    );
  };

  const deleteItem = (id: string) => {
    const next = items.filter((t) => t.id !== id);
    setItems(next);
    itemsRef.current = next;
    const type = subTab;
    const key = subTab === 'weekly' ? weekKey : subTab === 'monthly' ? monthKey : semesterKey;
    apiFetch(`/api/targets?type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: next }),
    }).catch(() => {});
  };

  const addItem = () => {
    dirtyRef.current = true;
    setItems((prev) => [...prev, { id: uid(), text: '', done: false }]);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      const type = subTab;
      const key = subTab === 'weekly' ? weekKey : subTab === 'monthly' ? monthKey : semesterKey;
      const url = `/api/targets?type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}`;

      const res = await apiFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
        }),
      });

      if (res.ok) {
        dirtyRef.current = false;
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } else {
        const errText = await res.text();
        Alert.alert('Save Failed', `Could not save targets: ${errText || res.status}`);
      }
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Could not connect to backend.');
    } finally {
      setSaving(false);
    }
  };

  const doneCount = items.filter((t) => t.done).length;
  const totalCount = items.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Sub Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, subTab === 'weekly' && styles.tabActive]}
          onPress={() => setSubTab('weekly')}
        >
          <Text style={[styles.tabText, subTab === 'weekly' && styles.tabTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, subTab === 'monthly' && styles.tabActive]}
          onPress={() => setSubTab('monthly')}
        >
          <Text style={[styles.tabText, subTab === 'monthly' && styles.tabTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, subTab === 'semester' && styles.tabActive]}
          onPress={() => setSubTab('semester')}
        >
          <Text style={[styles.tabText, subTab === 'semester' && styles.tabTextActive]}>
            Semester
          </Text>
        </TouchableOpacity>
      </View>

      {/* Week Navigator */}
      {subTab === 'weekly' && (
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setWeekKey((prev) => shiftWeek(prev, -1))}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.monthLabelText}>{weekLabel(weekKey)}</Text>

          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setWeekKey((prev) => shiftWeek(prev, 1))}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Month Navigator */}
      {subTab === 'monthly' && (
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setMonthKey((prev) => shiftMonth(prev, -1))}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.monthLabelText}>{monthLabel(monthKey)}</Text>

          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setMonthKey((prev) => shiftMonth(prev, 1))}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>🎯 Objectives</Text>
            <Text style={styles.cardSub}>
              {subTab === 'weekly'
                ? `Focus for ${weekLabel(weekKey)}`
                : subTab === 'monthly'
                ? `Core goals for ${monthLabel(monthKey)}`
                : 'Overarching semester priorities'}
            </Text>
          </View>

          {totalCount > 0 && (
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                {doneCount}/{totalCount}
              </Text>
            </View>
          )}
        </View>

        {totalCount > 0 && (
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(doneCount / totalCount) * 100}%` },
              ]}
            />
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={theme.colors.accentDark} />
          </View>
        ) : (
          <View style={styles.objectivesBox}>
            {/* Scrollable Objectives List */}
            <ScrollView
              style={styles.scrollList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {items.map((item) => (
                <View
                  key={item.id}
                  style={[styles.itemRow, item.done && styles.itemRowDone]}
                >
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleItem(item.id)}
                  >
                    <Ionicons
                      name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={item.done ? theme.colors.accent : theme.colors.borderStrong}
                    />
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.itemInput, item.done && styles.itemInputDone]}
                    value={item.text}
                    onChangeText={(text) => updateItemText(item.id, text)}
                    placeholder="Enter target..."
                    placeholderTextColor={theme.colors.textMuted}
                    multiline={true}
                    scrollEnabled={false}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteItem(item.id)}
                  >
                    <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}

              {items.length === 0 && (
                <View style={styles.emptyItemsWrap}>
                  <Text style={styles.emptyItemsText}>
                    No targets defined yet for this period.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.addBtn} onPress={addItem}>
              <Ionicons name="add" size={16} color={theme.colors.accentDark} />
              <Text style={styles.addBtnText}>Add new target</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Save button */}
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
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Targets</Text>
              </>
            )}
          </TouchableOpacity>

          {savedSuccess && (
            <View style={styles.savedFeedback}>
              <Ionicons name="checkmark" size={16} color={theme.colors.success} />
              <Text style={styles.savedFeedbackText}>Saved</Text>
            </View>
          )}
        </View>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadow.sm,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text2,
  },
  tabTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  navArrow: {
    padding: 6,
  },
  monthLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  progressBadge: {
    backgroundColor: theme.colors.accentFaint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.round,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.surface2,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  loadingWrap: {
    padding: 32,
    alignItems: 'center',
  },
  objectivesBox: {
    borderRadius: theme.radius.sm,
  },
  scrollList: {
    maxHeight: 320,
    marginBottom: 8,
  },
  emptyItemsWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface2,
  },
  itemRowDone: {
    opacity: 0.6,
  },
  checkbox: {
    paddingRight: 8,
    paddingTop: 3,
  },
  itemInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 2,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  itemInputDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  deleteBtn: {
    padding: 4,
    paddingTop: 3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accentDark,
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
