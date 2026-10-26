import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests push / local notification permissions from the OS.
 * On Android, creates the required Notification Channel.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('live-tasks-channel', {
        name: 'Live Tasks (24/7)',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('tasks-reminder', {
        name: 'Task Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A96E',
      });
    }

    return true;
  } catch (error) {
    console.warn('Notification permission request error:', error);
    return false;
  }
}

/**
 * Updates the app icon badge count on the device home screen.
 */
export async function updateTaskBadgeCount(uncompletedCount: number): Promise<void> {
  try {
    const count = Math.max(0, uncompletedCount);
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Badging may not be supported on some devices/emulators
  }
}

/**
 * Sends an immediate notification with the count of uncompleted tasks.
 */
export async function sendTaskNotificationNow(uncompletedCount: number): Promise<void> {
  if (uncompletedCount <= 0) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Daily Journal Tasks',
        body: `You have ${uncompletedCount} uncompleted task${uncompletedCount !== 1 ? 's' : ''} remaining for today.`,
        sound: true,
        badge: uncompletedCount,
        data: { count: uncompletedCount },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Could not send immediate notification:', error);
  }
}

/**
 * Schedules a daily recurring reminder (default 8:00 PM) if tasks remain uncompleted.
 * Replaces existing reminder notifications to avoid duplicate alerts.
 */
export async function scheduleDailyTaskReminder(
  uncompletedCount: number,
  hour = 20,
  minute = 0
): Promise<void> {
  try {
    // Cancel existing reminder
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'daily-task-reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    if (uncompletedCount <= 0) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Uncompleted Tasks Reminder',
        body: `You have ${uncompletedCount} uncompleted task${uncompletedCount !== 1 ? 's' : ''} remaining for today. Don't forget to wrap up your journal!`,
        data: { type: 'daily-task-reminder', count: uncompletedCount },
        sound: true,
        badge: uncompletedCount,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (error) {
    console.warn('Could not schedule daily reminder:', error);
  }
}

const LIVE_NOTIFICATION_ID = 'daily-journal-live-tasks-247';

/**
 * Updates or sets a persistent 24/7 live notification in the notification bar
 * showing the exact number of uncompleted tasks and preview.
 */
export async function updateLiveTaskNotification(
  uncompletedCount: number,
  taskTitles: string[] = []
): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('live-tasks-channel', {
        name: 'Live Tasks (24/7)',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      });
    }

    const title =
      uncompletedCount > 0
        ? `📋 Tasks Today: ${uncompletedCount} pending`
        : `✅ All daily tasks completed!`;

    let body = '';
    if (uncompletedCount > 0) {
      const preview = taskTitles
        .filter((t) => t.trim().length > 0)
        .slice(0, 3)
        .map((t) => `• ${t}`)
        .join('\n');
      body =
        preview +
        (taskTitles.length > 3 ? `\n(+${taskTitles.length - 3} more tasks)` : '');
      if (!body) {
        body = `${uncompletedCount} task${uncompletedCount !== 1 ? 's' : ''} left for today. Tap to view.`;
      }
    } else {
      body = 'All done for today! Tap to open your Daily Journal.';
    }

    await Notifications.scheduleNotificationAsync({
      identifier: LIVE_NOTIFICATION_ID,
      content: {
        title,
        body,
        sticky: true,
        autoDismiss: false,
        sound: false,
        badge: uncompletedCount,
        color: '#C9A96E',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'live-tasks-247', count: uncompletedCount },
      },
      trigger: Platform.OS === 'android' ? ({ channelId: 'live-tasks-channel' } as any) : null,
    });
  } catch (error) {
    console.warn('Could not update live 24/7 task notification:', error);
  }
}

/**
 * Synchronizes the notification service with the current count of uncompleted tasks:
 * 1. Sets the app icon badge count.
 * 2. Pushes/updates the live 24/7 persistent notification in the notification shade.
 * 3. Schedules or updates the daily 8:00 PM evening reminder.
 */
export async function syncTaskNotifications(
  uncompletedCount: number,
  taskTitles: string[] = []
): Promise<void> {
  await updateTaskBadgeCount(uncompletedCount);
  await updateLiveTaskNotification(uncompletedCount, taskTitles);
  await scheduleDailyTaskReminder(uncompletedCount, 20, 0);
}
