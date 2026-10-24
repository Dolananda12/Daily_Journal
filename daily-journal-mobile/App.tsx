import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, Image, Platform, Animated } from 'react-native';
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

import {
  getEffectiveTodayString,
  getMissedDaysThisWeek,
} from './src/lib/dateUtils';
import { apiFetch } from './src/lib/apiClient';

const Tab = createBottomTabNavigator();

export default function App() {
  const [selectedDate, setSelectedDate] = useState(() => getEffectiveTodayString());
  const [entryDates, setEntryDates] = useState<string[]>([]);

  // Modals state
  const [commandmentsVisible, setCommandmentsVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [failuresVisible, setFailuresVisible] = useState(false);

  const [appIsReady, setAppIsReady] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Load entry metadata (for calendar dots & missed days count)
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
        const lastShown = await AsyncStorage.getItem(SPLASH_STORAGE_KEY);

        // Once per day: If already shown today or already in RAM, skip splash instantly
        if (hasShownSplashInRam || lastShown === today) {
          await refreshEntryMetas();
          setAppIsReady(true);
          await SplashScreen.hideAsync().catch(() => {});
          return;
        }

        // First launch of the day:
        // Wait at least 5.0s OR whatever time is required to preload tasks, quote, and events
        const minTimerPromise = new Promise((resolve) => setTimeout(resolve, 5000));

        const preloadDataPromise = Promise.all([
          refreshEntryMetas(),
          apiFetch('/api/quote').catch(() => {}),
          apiFetch(`/api/entries/${today}`).catch(() => {}),
          apiFetch(`/api/events/upcoming?from=${today}`).catch(() => {}),
        ]);

        await Promise.all([minTimerPromise, preloadDataPromise]);

        // Persist so it only shows once today
        hasShownSplashInRam = true;
        await AsyncStorage.setItem(SPLASH_STORAGE_KEY, today);
      } catch (e) {
        console.warn(e);
      } finally {
        // Fade out splash
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
                height: 60,
                paddingBottom: 8,
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
                } else if (route.name === 'Browse') {
                  iconName = focused ? 'search' : 'search-outline';
                } else if (route.name === 'Stats') {
                  iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                } else if (route.name === 'Photos') {
                  iconName = focused ? 'images' : 'images-outline';
                } else if (route.name === 'Targets') {
                  iconName = focused ? 'flag' : 'flag-outline';
                } else if (route.name === 'Board') {
                  iconName = focused ? 'pin' : 'pin-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Today">
              {() => (
                <TodayScreen
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onOpenFailureRegister={() => setFailuresVisible(true)}
                  onEntrySaved={() => refreshEntryMetas()}
                />
              )}
            </Tab.Screen>

            <Tab.Screen name="Browse">
              {() => <BrowseScreen onSelectDate={setSelectedDate} />}
            </Tab.Screen>

            <Tab.Screen name="Stats" component={StatsScreen} />

            <Tab.Screen name="Photos" component={PhotosScreen} />

            <Tab.Screen name="Targets" component={TargetsScreen} />

            <Tab.Screen name="Board" component={BoardScreen} />
          </Tab.Navigator>
        </NavigationContainer>

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
});
