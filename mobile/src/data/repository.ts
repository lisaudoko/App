import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSeedDatabase, PROGRAMME_JOIN_CODE, type Database } from './seed';
import type { Athlete, Role, UserAccount, WeeklyLog } from './types';

const DB_KEY = 'tru.db.v1';

let cachedDb: Database | null = null;

async function loadDb(): Promise<Database> {
  if (cachedDb) return cachedDb;
  const raw = await AsyncStorage.getItem(DB_KEY);
  cachedDb = raw ? (JSON.parse(raw) as Database) : createSeedDatabase();
  if (!raw) await persistDb();
  return cachedDb;
}

async function persistDb(): Promise<void> {
  if (!cachedDb) return;
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(cachedDb));
}

/** Simulated network latency so optimistic-update UI has something to demonstrate. */
function simulateLatency<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class AuthError extends Error {}

export const repository = {
  async resetToSeed(): Promise<void> {
    cachedDb = createSeedDatabase();
    await persistDb();
  },

  async login(email: string, password: string): Promise<UserAccount> {
    const db = await loadDb();
    const account = db.accounts.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
    );
    await simulateLatency(null);
    if (!account) throw new AuthError('Incorrect email or password.');
    const { password: _pw, ...safe } = account;
    return safe;
  },

  async signupCoach(input: { name: string; email: string; password: string; programmeName: string }): Promise<UserAccount> {
    const db = await loadDb();
    if (db.accounts.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) {
      throw new AuthError('An account with that email already exists.');
    }
    const account: UserAccount & { password: string } = {
      id: `usr-${Date.now()}`,
      name: input.name,
      email: input.email,
      password: input.password,
      role: 'coach',
      programmeName: input.programmeName,
    };
    db.accounts.push(account);
    await persistDb();
    await simulateLatency(null);
    const { password: _pw, ...safe } = account;
    return safe;
  },

  async signupAthlete(input: {
    name: string;
    email: string;
    password: string;
    joinCode: string;
    event: string;
  }): Promise<UserAccount> {
    const db = await loadDb();
    if (input.joinCode.trim().toUpperCase() !== PROGRAMME_JOIN_CODE) {
      throw new AuthError('Invalid programme join code.');
    }
    if (db.accounts.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) {
      throw new AuthError('An account with that email already exists.');
    }
    const athleteId = `ath-${Date.now()}`;
    const athlete: Athlete = {
      id: athleteId,
      userId: `usr-${Date.now()}`,
      name: input.name,
      event: input.event,
      group: 'Unassigned',
      status: 'active',
      unit: 'm',
      baselineMark: 0,
      personalBest: 0,
      currentMaxes: { squat: 0, clean: 0, bench: 0 },
      targetMaxes: { squat: 0, clean: 0, bench: 0 },
      qualifyingStandard: 0,
      joinedAt: new Date().toISOString(),
    };
    const account: UserAccount & { password: string } = {
      id: athlete.userId,
      name: input.name,
      email: input.email,
      password: input.password,
      role: 'athlete',
      programmeName: 'Throwers R Us',
      athleteId,
    };
    db.athletes.push(athlete);
    db.weeklyLogs[athleteId] = [];
    db.strengthTests[athleteId] = [];
    db.accounts.push(account);
    await persistDb();
    await simulateLatency(null);
    const { password: _pw, ...safe } = account;
    return safe;
  },

  async deleteAccount(userId: string): Promise<void> {
    const db = await loadDb();
    const account = db.accounts.find((a) => a.id === userId);
    if (!account) return;

    db.accounts = db.accounts.filter((a) => a.id !== userId);
    if (account.role === 'athlete' && account.athleteId) {
      const athleteId = account.athleteId;
      db.athletes = db.athletes.filter((a) => a.id !== athleteId);
      delete db.weeklyLogs[athleteId];
      delete db.strengthTests[athleteId];
      delete db.workoutProgress[athleteId];
      db.notifications = db.notifications.filter((n) => n.athleteId !== athleteId);
    }
    await persistDb();
    await simulateLatency(null, 500);
  },

  async listAthletes(): Promise<Athlete[]> {
    const db = await loadDb();
    return simulateLatency([...db.athletes]);
  },

  async getAthlete(athleteId: string): Promise<Athlete | undefined> {
    const db = await loadDb();
    return db.athletes.find((a) => a.id === athleteId);
  },

  async getWeeklyLogs(athleteId: string): Promise<WeeklyLog[]> {
    const db = await loadDb();
    return simulateLatency(db.weeklyLogs[athleteId] ?? []);
  },

  async submitWeeklyResult(
    athleteId: string,
    entry: { mark: number | null; rpe: number | null; sleep: number | null; soreness: number | null; energy: number | null },
  ): Promise<{ log: WeeklyLog; isNewPersonalBest: boolean }> {
    const db = await loadDb();
    const logs = db.weeklyLogs[athleteId] ?? (db.weeklyLogs[athleteId] = []);
    const nextWeek = (logs[logs.length - 1]?.week ?? 0) + 1;
    const newLog: WeeklyLog = {
      week: nextWeek,
      label: `W${nextWeek}`,
      mark: entry.mark,
      rpe: entry.rpe,
      volumeLoad: entry.rpe != null ? Math.round(1500 + entry.rpe * 100) : null,
      sleep: entry.sleep,
      soreness: entry.soreness,
      energy: entry.energy,
      isCompetition: false,
      loggedAt: new Date().toISOString(),
    };
    logs.push(newLog);

    const athlete = db.athletes.find((a) => a.id === athleteId);
    let isNewPersonalBest = false;
    if (athlete && entry.mark != null && entry.mark > athlete.personalBest) {
      isNewPersonalBest = true;
      athlete.personalBest = entry.mark;
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        athleteId,
        title: `New PB — ${athlete.name}`,
        body: `${athlete.event} ${entry.mark}${athlete.unit} · New season best`,
        severity: 'success',
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    await persistDb();
    await simulateLatency(newLog);
    return { log: newLog, isNewPersonalBest };
  },

  async getStrengthTests(athleteId: string) {
    const db = await loadDb();
    return db.strengthTests[athleteId] ?? [];
  },

  async getMeets() {
    const db = await loadDb();
    return simulateLatency([...db.meets]);
  },

  async getNotifications() {
    const db = await loadDb();
    return simulateLatency([...db.notifications]);
  },

  async markNotificationRead(id: string) {
    const db = await loadDb();
    const notif = db.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    await persistDb();
  },

  async getMesocycleWeek(): Promise<number> {
    const db = await loadDb();
    return db.mesocycleWeek;
  },

  async getWorkoutProgress(athleteId: string, week: number): Promise<string[]> {
    const db = await loadDb();
    return db.workoutProgress[athleteId]?.[week] ?? [];
  },

  async toggleWorkoutExercise(athleteId: string, week: number, exerciseId: string): Promise<string[]> {
    const db = await loadDb();
    const forAthlete = db.workoutProgress[athleteId] ?? (db.workoutProgress[athleteId] = {});
    const done = new Set(forAthlete[week] ?? []);
    if (done.has(exerciseId)) done.delete(exerciseId);
    else done.add(exerciseId);
    forAthlete[week] = Array.from(done);
    await persistDb();
    return forAthlete[week];
  },

  async getFullContext() {
    const db = await loadDb();
    return {
      athletes: db.athletes,
      weeklyLogs: db.weeklyLogs,
      strengthTests: db.strengthTests,
      meets: db.meets,
    };
  },
};

export type { Role };
