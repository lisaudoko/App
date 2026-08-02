import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Fires a local (on-device) notification — no push server involved. */
export async function notifyPersonalBest(athleteName: string, mark: number, unit: string) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    if (requested !== 'granted') return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New PB, ${athleteName}! 🎉`,
      body: `${mark}${unit} — new season best.`,
    },
    trigger: null,
  });
}
