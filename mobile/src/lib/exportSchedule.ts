import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { buildIcs, type IcsEvent } from './ics';

/** Writes a `.ics` for the given events and opens the native share sheet — unlike shareWorkout.ts's
 *  plain-text Share.share (fine for a message body), a `.ics` needs to be shared as an actual file
 *  so the OS offers "Add to Calendar" as a target, which Share.share can't do cross-platform. */
export async function exportScheduleAsIcs(events: IcsEvent[]): Promise<void> {
  const ics = buildIcs(events);
  const file = new File(Paths.cache, 'tru-schedule.ics');
  if (file.exists) file.delete();
  file.create();
  file.write(ics);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return;
  await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', dialogTitle: 'Export schedule' });
}
