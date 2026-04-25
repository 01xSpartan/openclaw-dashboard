import Database from 'better-sqlite3';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';

const DB_PATH = join(homedir(), '.openclaw', 'tasks', 'runs.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database | null {
  if (db) return db;
  if (!existsSync(DB_PATH)) return null;
  try {
    db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    db.pragma('journal_mode = WAL');
    return db;
  } catch {
    return null;
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export interface TaskRun {
  id: string;
  status: string;
  agent_id: string;
  created_at: number;
  finished_at: number | null;
  result: string | null;
  error: string | null;
}

export function getRunningTasks(): TaskRun[] {
  const database = getDb();
  if (!database) return [];
  try {
    const rows = database.prepare(
      `SELECT id, status, agent_id, created_at, finished_at, result, error
       FROM task_runs WHERE status IN ('running', 'pending', 'queued')
       ORDER BY created_at DESC`
    ).all() as TaskRun[];
    return rows;
  } catch {
    return [];
  }
}

export function getRecentTasks(limit = 50): TaskRun[] {
  const database = getDb();
  if (!database) return [];
  try {
    const rows = database.prepare(
      `SELECT id, status, agent_id, created_at, finished_at, result, error
       FROM task_runs ORDER BY created_at DESC LIMIT ?`
    ).all(limit) as TaskRun[];
    return rows;
  } catch {
    return [];
  }
}

export function getTasksByAgent(agentId: string, limit = 20): TaskRun[] {
  const database = getDb();
  if (!database) return [];
  try {
    const rows = database.prepare(
      `SELECT id, status, agent_id, created_at, finished_at, result, error
       FROM task_runs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(agentId, limit) as TaskRun[];
    return rows;
  } catch {
    return [];
  }
}

export function getTaskRun(runId: string): TaskRun | null {
  const database = getDb();
  if (!database) return null;
  try {
    const row = database.prepare(
      `SELECT id, status, agent_id, created_at, finished_at, result, error
       FROM task_runs WHERE id = ?`
    ).get(runId) as TaskRun | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}

export function getTodayActivity(): { running: number; completedToday: number; failedToday: number } {
  const database = getDb();
  if (!database) return { running: 0, completedToday: 0, failedToday: 0 };
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const running = database.prepare(
      `SELECT COUNT(*) as count FROM task_runs WHERE status IN ('running', 'pending', 'queued')`
    ).get() as { count: number };

    const completed = database.prepare(
      `SELECT COUNT(*) as count FROM task_runs WHERE status = 'completed' AND finished_at >= ?`
    ).get(todayMs) as { count: number };

    const failed = database.prepare(
      `SELECT COUNT(*) as count FROM task_runs WHERE status IN ('failed', 'error') AND finished_at >= ?`
    ).get(todayMs) as { count: number };

    return {
      running: running?.count ?? 0,
      completedToday: completed?.count ?? 0,
      failedToday: failed?.count ?? 0,
    };
  } catch {
    return { running: 0, completedToday: 0, failedToday: 0 };
  }
}
