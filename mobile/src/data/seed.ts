import type {
  Athlete,
  AppNotification,
  Meet,
  StrengthTest,
  UserAccount,
  WeeklyLog,
} from './types';

export interface Database {
  accounts: (UserAccount & { password: string })[];
  athletes: Athlete[];
  weeklyLogs: Record<string, WeeklyLog[]>;
  strengthTests: Record<string, StrengthTest[]>;
  meets: Meet[];
  notifications: AppNotification[];
  workoutProgress: Record<string, Record<number, string[]>>;
  mesocycleWeek: number;
}

const WEEK_LABELS = ['W35', 'W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42'];

function buildLogs(
  athleteId: string,
  marks: (number | null)[],
  rpes: (number | null)[],
  volumeLoads: number[],
): WeeklyLog[] {
  return WEEK_LABELS.map((label, i) => ({
    week: i + 1,
    label,
    mark: marks[i] ?? null,
    rpe: rpes[i] ?? null,
    volumeLoad: rpes[i] != null ? volumeLoads[i] : null,
    sleep: rpes[i] != null ? 7 : null,
    soreness: rpes[i] != null ? 4 : null,
    energy: rpes[i] != null ? 7 : null,
    isCompetition: false,
    loggedAt: rpes[i] != null ? new Date(2026, 6, 1 + i * 7).toISOString() : null,
  }));
}

function buildStrengthTests(squatEnd: number, cleanEnd: number, benchEnd: number): StrengthTest[] {
  const labels = ['Sep', 'Nov', 'Jan', 'Apr'];
  const dates = ['2025-09-15', '2025-11-15', '2026-01-15', '2026-04-15'];
  const steps = 4;
  return labels.map((label, i) => {
    const t = i / (steps - 1);
    return {
      date: dates[i],
      label,
      squat: Math.round(squatEnd - (squatEnd - squatEnd * 0.89) * (1 - t)),
      clean: Math.round(cleanEnd - (cleanEnd - cleanEnd * 0.89) * (1 - t)),
      bench: Math.round(benchEnd - (benchEnd - benchEnd * 0.89) * (1 - t)),
    };
  });
}

export function createSeedDatabase(): Database {
  const athletes: Athlete[] = [
    {
      id: 'ath-marcus',
      userId: 'usr-marcus',
      name: 'Marcus Thompson',
      event: 'Shot Put',
      group: 'HS Seniors',
      status: 'active',
      unit: 'm',
      baselineMark: 15.8,
      personalBest: 16.4,
      currentMaxes: { squat: 220, clean: 185, bench: 165 },
      targetMaxes: { squat: 250, clean: 210, bench: 190 },
      qualifyingStandard: 17.0,
      joinedAt: '2025-09-01',
    },
    {
      id: 'ath-simone',
      userId: 'usr-simone',
      name: 'Simone Clarke',
      event: 'Discus',
      group: 'Seniors',
      status: 'active',
      unit: 'm',
      baselineMark: 44.0,
      personalBest: 44.9,
      currentMaxes: { squat: 205, clean: 150, bench: 130 },
      targetMaxes: { squat: 225, clean: 165, bench: 145 },
      qualifyingStandard: 46.0,
      joinedAt: '2025-09-01',
    },
    {
      id: 'ath-kezia',
      userId: 'usr-kezia',
      name: 'Kezia Campbell',
      event: 'Discus',
      group: 'HS Seniors',
      status: 'active',
      unit: 'm',
      baselineMark: 41.0,
      personalBest: 42.1,
      currentMaxes: { squat: 195, clean: 140, bench: 120 },
      targetMaxes: { squat: 210, clean: 155, bench: 135 },
      qualifyingStandard: 46.0,
      joinedAt: '2025-09-01',
    },
    {
      id: 'ath-devon',
      userId: 'usr-devon',
      name: 'Devon Reid',
      event: 'Shot Put',
      group: 'HS Juniors',
      status: 'active',
      unit: 'm',
      baselineMark: 14.0,
      personalBest: 14.8,
      currentMaxes: { squat: 165, clean: 120, bench: 100 },
      targetMaxes: { squat: 190, clean: 135, bench: 115 },
      qualifyingStandard: 17.0,
      joinedAt: '2025-09-01',
    },
    {
      id: 'ath-andre',
      userId: 'usr-andre',
      name: 'André Brown',
      event: 'Hammer',
      group: 'Seniors',
      status: 'active',
      unit: 'm',
      baselineMark: 50.0,
      personalBest: 52.3,
      currentMaxes: { squat: 240, clean: 175, bench: 175 },
      targetMaxes: { squat: 260, clean: 190, bench: 190 },
      qualifyingStandard: 55.0,
      joinedAt: '2025-09-01',
    },
    {
      id: 'ath-tiana',
      userId: 'usr-tiana',
      name: 'Tiana Lewis',
      event: 'Javelin',
      group: 'HS Seniors',
      status: 'active',
      unit: 'm',
      baselineMark: 37.0,
      personalBest: 38.7,
      currentMaxes: { squat: 160, clean: 110, bench: 95 },
      targetMaxes: { squat: 175, clean: 120, bench: 105 },
      qualifyingStandard: 42.0,
      joinedAt: '2025-09-01',
    },
  ];

  const weeklyLogs: Record<string, WeeklyLog[]> = {
    'ath-marcus': buildLogs(
      'ath-marcus',
      [15.8, 15.95, 16.05, 16.15, 16.2, 16.3, 16.35, 16.4],
      [5, 6, 7, 8, 6, 7, 7, 7],
      [1600, 1800, 2000, 2350, 1900, 2100, 2200, 2250],
    ),
    'ath-simone': buildLogs(
      'ath-simone',
      [44.0, 44.2, 44.3, 44.5, 44.6, 44.7, 44.8, 44.9],
      [6, 5, 6, 7, 7, 6, 7, 6],
      [1700, 1650, 1800, 1950, 2000, 1850, 1950, 1900],
    ),
    'ath-kezia': buildLogs(
      'ath-kezia',
      [41.0, 41.5, 42.0, 42.1, 42.1, 42.1, 42.1, 42.1],
      [5, 5, 5, 5, 5, 5, 5, 5],
      [1500, 1500, 1550, 1500, 1550, 1500, 1500, 1500],
    ),
    'ath-devon': buildLogs(
      'ath-devon',
      [14.0, 14.3, 14.5, 14.8, null, null, null, null],
      [7, 6, 8, 7, null, null, null, null],
      [1600, 1500, 1750, 1650, 0, 0, 0, 0],
    ),
    'ath-andre': buildLogs(
      'ath-andre',
      [50.0, 50.5, 51.0, 51.5, 51.8, 52.0, 52.2, 52.3],
      [6, 7, 7, 8, 8, 9, 9, 9],
      [1900, 2000, 2050, 2200, 2250, 2350, 2300, 2350],
    ),
    'ath-tiana': buildLogs(
      'ath-tiana',
      [37.0, 37.3, 37.6, 37.9, 38.1, 38.3, 38.5, 38.7],
      [5, 6, 6, 7, 6, 6, 7, 7],
      [1500, 1600, 1650, 1750, 1650, 1700, 1800, 1800],
    ),
  };

  const strengthTests: Record<string, StrengthTest[]> = {
    'ath-marcus': buildStrengthTests(220, 185, 165),
    'ath-simone': buildStrengthTests(205, 150, 130),
    'ath-kezia': buildStrengthTests(195, 140, 120),
    'ath-devon': buildStrengthTests(165, 120, 100),
    'ath-andre': buildStrengthTests(240, 175, 175),
    'ath-tiana': buildStrengthTests(160, 110, 95),
  };

  const meets: Meet[] = [
    {
      id: 'meet-bg-champs',
      name: 'ISSA Boys & Girls Champs',
      date: '2026-03-27',
      standards: { 'Shot Put': 17.0, Discus: 46.0, Hammer: 55.0, Javelin: 42.0 },
    },
    {
      id: 'meet-carifta',
      name: 'Carifta Games',
      date: '2026-04-11',
      standards: { 'Shot Put': 17.4, Discus: 47.5, Hammer: 57.0, Javelin: 43.5 },
    },
    {
      id: 'meet-world-jnr',
      name: 'World Junior Championships',
      date: '2026-08-02',
      standards: { 'Shot Put': 18.2, Discus: 51.0, Hammer: 62.0, Javelin: 47.0 },
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      athleteId: 'ath-simone',
      title: 'New PB — Simone Clarke',
      body: 'Discus 44.9m · Season best by 0.3m',
      severity: 'success',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'notif-2',
      athleteId: 'ath-kezia',
      title: 'Anomaly — Kezia Campbell',
      body: "Squat +12kg but throws flat 4 weeks. Technique regression?",
      severity: 'warning',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'notif-3',
      athleteId: 'ath-devon',
      title: 'Missing log — Devon Reid',
      body: '2 consecutive weeks without submission',
      severity: 'danger',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'notif-4',
      athleteId: 'ath-andre',
      title: 'High load — André Brown',
      body: 'RPE 9 for 3 weeks. A:C ratio elevated — consider deload.',
      severity: 'warning',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
  ];

  const accounts: (UserAccount & { password: string })[] = [
    {
      id: 'usr-coach',
      name: 'H. Michael Vassell',
      email: 'coach@tru.app',
      password: 'password123',
      role: 'coach',
      programmeName: 'Throwers R Us',
    },
    ...athletes.map((a) => ({
      id: a.userId,
      name: a.name,
      email: `${a.name.split(' ')[0].toLowerCase()}@tru.app`,
      password: 'password123',
      role: 'athlete' as const,
      programmeName: 'Throwers R Us',
      athleteId: a.id,
    })),
  ];

  return {
    accounts,
    athletes,
    weeklyLogs,
    strengthTests,
    meets,
    notifications,
    workoutProgress: {},
    mesocycleWeek: 2,
  };
}

export const PROGRAMME_JOIN_CODE = 'TRU2026';
export const MESOCYCLE_INTENSITY = [0.9, 0.85, 0.82, 0.95];
export const MESOCYCLE_SCHEME = [
  { sets: 4, reps: 6 },
  { sets: 5, reps: 5 },
  { sets: 5, reps: 4 },
  { sets: 3, reps: 3 },
];
