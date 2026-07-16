import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationRoutine {
  id: number;
  title: string;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  date: string;       // "YYYY-MM-DD"
  status: string;
}

export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function syncRoutineNotifications(routines: NotificationRoutine[]) {
  // Cancel all previously scheduled local notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  for (const routine of routines) {
    if (routine.status === 'Completed' || routine.status === 'Skipped' || routine.status === 'Missed') {
      continue;
    }

    // Parse the routine's calendar date (YYYY-MM-DD) and times (HH:MM) into
    // Date objects in the DEVICE's local timezone. Using individual date/time
    // components makes the constructor timezone-aware automatically (IST, etc.),
    // instead of `new Date("YYYY-MM-DD")` which parses as UTC midnight and would
    // shift the notification by the local UTC offset.
    const [year, month, day] = routine.date.split('-').map(Number);

    // Parse start time
    const [startH, startM] = routine.start_time.split(':').map(Number);
    const startDate = new Date(year, month - 1, day, startH, startM, 0, 0);

    // Parse end time
    const [endH, endM] = routine.end_time.split(':').map(Number);
    const endDate = new Date(year, month - 1, day, endH, endM, 0, 0);

    // Schedule Start Notification
    if (startDate > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Routine Starting \u23F0",
          body: `It's time for: ${routine.title}`,
          sound: true,
          data: { routineId: routine.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: startDate,
        },
      });
    }

    // Schedule 5-Minute Warning Notification
    const warningDate = new Date(endDate.getTime() - 5 * 60 * 1000); // 5 mins before end
    if (warningDate > now && warningDate > startDate) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Wrapping Up \u23F3",
          body: `${routine.title} ends in 5 minutes.`,
          sound: true,
          data: { routineId: routine.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: warningDate,
        },
      });
    }
  }
}
