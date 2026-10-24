import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const COMMANDMENTS = [
  'The universe is transient; the only permanent thing is change — both in the personal and professional spheres.',
  'I am the chosen one. I shall never give up the visions I have received, or continue to receive.',
  'I shall compare myself with myself, and myself only — it does not matter if I am competing with 1, 1,000, or 1 million.',
  'Worrying about the future will not make us feel better, nor will it solve anything.',
  'Be the magnanimous Sun that holds the planets — the people we care about: parents and friends.',
  'We have a lot to improve, both in skills and in body, with only three years of time.',
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

interface CommandmentsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CommandmentsModal({ visible, onClose }: CommandmentsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>THE COMMANDMENTS</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topAccentBar} />

          {COMMANDMENTS.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.numeralBox}>
                <Text style={styles.numeralText}>{ROMAN[index]}</Text>
              </View>
              <Text style={styles.commandmentText}>{item}</Text>
            </View>
          ))}

          <View style={styles.footerContainer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerTag}>Non-negotiable.</Text>
            <View style={styles.footerLine} />
          </View>
        </ScrollView>
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
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: theme.colors.accentDark,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  topAccentBar: {
    height: 3,
    backgroundColor: theme.colors.accent,
    width: 48,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 28,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
  },
  numeralBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentFaint,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeralText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accentDark,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  commandmentText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  footerTag: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
});
