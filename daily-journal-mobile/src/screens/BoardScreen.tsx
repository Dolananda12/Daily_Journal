import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { apiFetch } from '../lib/apiClient';

interface BoardNote {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple'];

export function BoardScreen() {
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/board-notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(Array.isArray(data) ? data : []);
      }
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/board-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent.trim(),
          color: selectedColor,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setNotes([created, ...notes]);
        setNewContent('');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiFetch(`/api/board-notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getStyleForColor = (colorName: string) => {
    const key = (colorName in theme.stickyColors ? colorName : 'yellow') as keyof typeof theme.stickyColors;
    return theme.stickyColors[key];
  };

  return (
    <View style={styles.container}>
      {/* Board Header Toolbar */}
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.title}>📌 Thoughts Board</Text>
          <Text style={styles.subTitle}>Quick brainstorms, mantras, and ideas</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setIsModalOpen(true)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Post Note</Text>
        </TouchableOpacity>
      </View>

      {/* Notes Grid */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={theme.colors.accentDark} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.notesGrid}>
          {notes.map((note) => {
            const colStyle = getStyleForColor(note.color);
            return (
              <View
                key={note.id}
                style={[
                  styles.stickyCard,
                  { backgroundColor: colStyle.bg, borderColor: colStyle.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.pinIconWrap}>
                    <Text style={styles.pinIcon}>📌</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cardDeleteBtn}
                    onPress={() => handleDeleteNote(note.id)}
                  >
                    <Ionicons name="close" size={16} color={colStyle.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.cardText, { color: colStyle.text }]}>
                  {note.content}
                </Text>
              </View>
            );
          })}

          {notes.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>Board is empty</Text>
              <Text style={styles.emptySub}>
                Tap "Post Note" to stick your first idea onto the board.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Note Modal */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Sticky Note</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputArea}
              placeholder="Write your note, idea or reminder..."
              placeholderTextColor={theme.colors.textMuted}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              autoFocus
            />

            <Text style={styles.colorLabel}>Select Color:</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => {
                const s = getStyleForColor(c);
                const isSelected = selectedColor === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: s.bg, borderColor: s.border },
                      isSelected && styles.colorDotSelected,
                    ]}
                    onPress={() => setSelectedColor(c)}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={s.text} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.postBtn, submitting && styles.postBtnDisabled]}
              onPress={handleCreateNote}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postBtnText}>Post to Board</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  notesGrid: {
    padding: 16,
    gap: 14,
    paddingBottom: 48,
  },
  stickyCard: {
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    ...theme.shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinIconWrap: {
    transform: [{ rotate: '-15deg' }],
  },
  pinIcon: {
    fontSize: 16,
  },
  cardDeleteBtn: {
    padding: 4,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
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
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  inputArea: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text2,
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    transform: [{ scale: 1.15 }],
  },
  postBtn: {
    backgroundColor: theme.colors.accentDark,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.7,
  },
  postBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
