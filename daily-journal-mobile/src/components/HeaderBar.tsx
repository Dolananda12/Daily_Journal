import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface HeaderBarProps {
  missedDays: number;
  onOpenCalendar: () => void;
  onOpenCommandments: () => void;
  onOpenSettings: () => void;
}

export function HeaderBar({
  missedDays,
  onOpenCalendar,
  onOpenCommandments,
  onOpenSettings,
}: HeaderBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brandTitle}>Daily Journal</Text>
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenCommandments}
          accessibilityLabel="Commandments"
          activeOpacity={0.7}
        >
          <Ionicons name="book-outline" size={18} color={theme.colors.accentDark} />
          <Text style={styles.commandmentLabel}>Rules</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenCalendar}
          accessibilityLabel="Calendar"
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={18} color={theme.colors.text} />
          {missedDays > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{missedDays}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onOpenSettings}
          accessibilityLabel="Settings"
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color={theme.colors.text2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: theme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    gap: 5,
  },
  commandmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
  settingsButton: {
    padding: 7,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.danger,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
