import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Platform,
  Animated,
  Modal,
  TouchableOpacity,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_STORAGE_KEY = 'daily_journal_last_splash_date';
let hasShownSplashInRam = false;

import { theme } from './src/theme';
import { HeaderBar } from './src/components/HeaderBar';
import { CommandmentsModal } from './src/components/CommandmentsModal';
import { CalendarModal } from './src/components/CalendarModal';
import { SettingsModal } from './src/components/SettingsModal';
import { FailureRegisterModal } from './src/components/FailureRegisterModal';

import { TodayScreen } from './src/screens/TodayScreen';
import { BrowseScreen } from './src/screens/BrowseScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { PhotosScreen } from './src/screens/PhotosScreen';
import { TargetsScreen } from './src/screens/TargetsScreen';
import { BoardScreen } from './src/screens/BoardScreen';
import { EventsScreen } from './src/screens/EventsScreen';

import {
  getEffectiveTodayString,
  getMissedDaysThisWeek,
} from './src/lib/dateUtils';
import { apiFetch } from './src/lib/apiClient';
import { requestNotificationPermissions } from './src/lib/notificationService';

const Tab = createBottomTabNavigator();

// ─── More Drawer ──────────────────────────────────────────────────────────────
interface MoreDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: 'Browse' | 'Stats' | 'Photos' | 'Board') => void;
}

function MoreDrawer({ visible, onClose, onNavigate }: MoreDrawerProps) {
  const items: {
    key: 'Browse' | 'Stats' | 'Photos' | 'Board';
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    desc: string;
  }[] = [
    { key: 'Browse', icon: 'search-outline', label: 'Browse Entries', desc: 'Read all your past journal entries' },
    { key: 'Stats', icon: 'bar-chart-outline', label: 'Stats', desc: 'Study hours, streaks and KPIs' },
    { key: 'Photos', icon: 'images-outline', label: 'Photos', desc: 'Your photo memories gallery' },
    { key: 'Board', icon: 'pin-outline', label: 'Thoughts Board', desc: 'Corkboard of sticky notes & ideas' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={drawerStyles.backdrop}>
        <RNSafeAreaView style={drawerStyles.sheet}>
          <View style={drawerStyles.handle} />
          <Text style={drawerStyles.title}>More</Text>
          <Text style={drawerStyles.subtitle}>All features of your journal</Text>

          <View style={drawerStyles.grid}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={drawerStyles.item}
                activeOpacity={0.7}
                onPress={() => {
                  onClose();
                  onNavigate(item.key);
                }}
              >
                <View style={drawerStyles.itemIconWrap}>
                  <Ionicons name={item.icon} size={26} color={theme.colors.accentDark} />
                </View>
                <Text style={drawerStyles.itemLabel}>{item.label}</Text>
                <Text style={drawerStyles.itemDesc} numberOfLines={2}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={drawerStyles.closeBtn} onPress={onClose}>
            <Text style={drawerStyles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </RNSafeAreaView>
      </View>
    </Modal>
  );
}

const drawerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  item: {
    width: '47%',
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 8,
    ...theme.shadow.sm,
  },
  itemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  itemDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text2,
  },
});

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [selectedDate, setSelectedDate] = useState(() => getEffectiveTodayString());
  const [entryDates, setEntryDates] = useState<string[]>([]);
  const [uncompletedCount, setUncompletedCount] = useState<number>(0);

  // More drawer
  const [moreVisible, setMoreVisible] = useState(false);
  const [moreScreen, setMoreScreen] = useState<'Browse' | 'Stats' | 'Photos' | 'Board' | null>(null);

  // Global modals
  const [commandmentsVisible, setCommandmentsVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [failuresVisible, setFailuresVisible] = useState(false);

  const [appIsReady, setAppIsReady] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  const refreshEntryMetas = useCallback(async () => {
    try {
      const res = await apiFetch('/api/entries');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEntryDates(data.map((e: any) => e.entry_date));
        }
      }
    } catch {
      // offline or not reached yet
    }
  }, []);

  useEffect(() => {
    async function prepare() {
      const today = getEffectiveTodayString();
      try {
        await requestNotificationPermissions();
        const lastShown = await AsyncStorage.getItem(SPLASH_STORAGE_KEY);

        if (hasShownSplashInRam || lastShown === today) {
          await refreshEntryMetas();
          setAppIsReady(true);
          await SplashScreen.hideAsync().catch(() => {});
          return;
        }

        const minTimerPromise = new Promise((resolve) => setTimeout(resolve, 5000));
        const preloadDataPromise = Promise.all([
          refreshEntryMetas(),
          apiFetch('/api/quote').catch(() => {}),
          apiFetch(`/api/entries/${today}`).catch(() => {}),
          apiFetch(`/api/events/upcoming?from=${today}`).catch(() => {}),
        ]);

        await Promise.all([minTimerPromise, preloadDataPromise]);
        hasShownSplashInRam = true;
        await AsyncStorage.setItem(SPLASH_STORAGE_KEY, today);
      } catch (e) {
        console.warn(e);
      } finally {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setAppIsReady(true);
        });
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, [refreshEntryMetas, fadeAnim]);

  const missedDays = getMissedDaysThisWeek(entryDates);

  if (!appIsReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="dark" />
        <Animated.View style={[styles.splashInner, { opacity: fadeAnim }]}>
          <Image
            source={require('./assets/splash-icon.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
          <Text style={styles.splashBrand}>Daily Journal</Text>
          <Text style={styles.splashMotto}>Log. Learn. Evolve.</Text>
        </Animated.View>
      </View>
    );
  }

  // ── More screen renderer ─────────────────────────────────────────────────
  function renderMoreContent() {
    if (!moreScreen) return null;
    switch (moreScreen) {
      case 'Browse':
        return <BrowseScreen />;
      case 'Stats':
        return <StatsScreen />;
      case 'Photos':
        return <PhotosScreen />;
      case 'Board':
        return <BoardScreen />;
    }
  }

  const moreScreenTitle: Record<string, string> = {
    Browse: 'Browse Entries',
    Stats: 'Stats',
    Photos: 'Photos',
    Board: 'Thoughts Board',
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        {/* Global Editorial Header */}
        <HeaderBar
          missedDays={missedDays}
          onOpenCalendar={() => setCalendarVisible(true)}
          onOpenCommandments={() => setCommandmentsVisible(true)}
          onOpenSettings={() => setSettingsVisible(true)}
        />

        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: theme.colors.accentDark,
              tabBarInactiveTintColor: theme.colors.textMuted,
              tabBarStyle: {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
                borderTopWidth: 1,
                height: 62,
                paddingBottom: 10,
                paddingTop: 6,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
              },
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: keyof typeof Ionicons.glyphMap = 'book-outline';
                if (route.name === 'Today') {
                  iconName = focused ? 'book' : 'book-outline';
                } else if (route.name === 'Targets') {
                  iconName = focused ? 'flag' : 'flag-outline';
                } else if (route.name === 'Events') {
                  iconName = focused ? 'calendar' : 'calendar-outline';
                } else if (route.name === 'More') {
                  iconName = focused ? 'grid' : 'grid-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            {/* ── Core 3 tabs ── */}
            <Tab.Screen
              name="Today"
              options={{
                tabBarBadge: uncompletedCount > 0 ? uncompletedCount : undefined,
                tabBarBadgeStyle: {
                  backgroundColor: theme.colors.accent,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: '700',
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  lineHeight: 16,
                },
              }}
            >
              {() => (
                <TodayScreen
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onOpenFailureRegister={() => setFailuresVisible(true)}
                  onEntrySaved={() => refreshEntryMetas()}
                  onUncompletedTasksChange={setUncompletedCount}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="Targets" component={TargetsScreen} />

            <Tab.Screen name="Events" component={EventsScreen} />

            {/* ── More tab ── */}
            <Tab.Screen
              name="More"
              options={{ tabBarLabel: 'More' }}
              listeners={{
                tabPress: (e) => {
                  e.preventDefault();
                  setMoreVisible(true);
                },
              }}
            >
              {() => <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>

        {/* ── More Drawer ── */}
        <MoreDrawer
          visible={moreVisible}
          onClose={() => setMoreVisible(false)}
          onNavigate={(screen) => {
            setMoreScreen(screen);
          }}
        />

        {/* ── More Screen Full-Screen Modal ── */}
        <Modal
          visible={moreScreen !== null}
          animationType="slide"
          onRequestClose={() => setMoreScreen(null)}
        >
          <SafeAreaView style={styles.moreScreenRoot} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.moreScreenHeader}>
              <TouchableOpacity
                style={styles.moreBackBtn}
                onPress={() => setMoreScreen(null)}
              >
                <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.moreScreenTitle}>
                {moreScreen ? moreScreenTitle[moreScreen] : ''}
              </Text>
            </View>

            {/* Screen content */}
            <View style={{ flex: 1 }}>
              {renderMoreContent()}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Global Modals */}
        <CommandmentsModal
          visible={commandmentsVisible}
          onClose={() => setCommandmentsVisible(false)}
        />

        <CalendarModal
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
          entryDates={entryDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          missedDays={missedDays}
        />

        <SettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          onUrlChanged={refreshEntryMetas}
        />

        <FailureRegisterModal
          visible={failuresVisible}
          onClose={() => setFailuresVisible(false)}
          defaultDate={selectedDate}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FAF8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  splashBrand: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D2A26',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  splashMotto: {
    fontSize: 13,
    color: '#A8885A',
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // More screen
  moreScreenRoot: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  moreScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  moreBackBtn: {
    padding: 4,
  },
  moreScreenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
});
