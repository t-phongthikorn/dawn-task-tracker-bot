import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { TaskItem } from "../utils/embeded/epic";

const dbPath = process.env.DATABASE_PATH ?? './data/taskbot.sqlite';

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

// Configuration
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Database Schema
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS epics (
      id              TEXT PRIMARY KEY,
      channel_id      TEXT NOT NULL,
      author_id       TEXT NOT NULL,
      title           TEXT NOT NULL,
      priority        TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
      message_id      TEXT DEFAULT NULL,
      is_archived     INTEGER NOT NULL DEFAULT 0,
      archived_at     TEXT DEFAULT NULL,
      last_renamed_at TEXT DEFAULT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      epic_id      TEXT NOT NULL,
      author_id    TEXT NOT NULL,
      title        TEXT NOT NULL,
      due_date     TEXT DEFAULT NULL,
      done         INTEGER NOT NULL DEFAULT 0,
      completed_by TEXT DEFAULT NULL,
      completed_at TEXT DEFAULT NULL,
      is_archived  INTEGER NOT NULL DEFAULT 0,
      archived_at  TEXT DEFAULT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_assignees (
      task_id     INTEGER NOT NULL,
      user_id     TEXT NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (task_id, user_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS user_task_trackers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, channel_id)
  );
  CREATE TABLE IF NOT EXISTS status_trackers (
      guild_id   TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_epics_channel_archived ON epics(channel_id, is_archived);
  CREATE INDEX IF NOT EXISTS idx_tasks_epic_archived ON tasks(epic_id, is_archived, done);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE done = 0 AND is_archived = 0 AND due_date IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_assignees_user ON task_assignees(user_id);
`);

// Types & Interfaces
export interface EpicRow {
  id: string;
  channel_id: string;
  author_id: string;
  title: string;
  priority: string;
  message_id: string | null;
  is_archived: number;
  archived_at: string | null;
  last_renamed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  epic_id: string;
  author_id: string;
  title: string;
  due_date: string | null;
  done: number;
  completed_by: string | null;
  completed_at: string | null;
  is_archived: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  task_num?: number;
}

// Epic Functions
export function addEpic(
  epicId: string, 
  channelId: string, 
  authorId: string, 
  title: string,
  priority: string = 'MEDIUM'
): string {
  const stmt = db.prepare(`
    INSERT INTO epics (id, channel_id, author_id, title, priority)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(epicId, channelId, authorId, title, priority.toUpperCase());
  return epicId;
}

export function checkRenameCooldown(epic: EpicRow): { allowed: boolean; remainingMinutes: number } {
  if (!epic.last_renamed_at) {
    return { allowed: true, remainingMinutes: 0 };
  }

  const lastRenamedTime = new Date(epic.last_renamed_at + " UTC").getTime();
  const now = Date.now();
  const cooldownMs = 10 * 60 * 1000; // 10 นาที
  const diffMs = now - lastRenamedTime;

  if (diffMs < cooldownMs) {
    const remainingMs = cooldownMs - diffMs;
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    return { allowed: false, remainingMinutes };
  }

  return { allowed: true, remainingMinutes: 0 };
}



export function getEpicPriorityEmoji(priority?: string): string {
  if (!priority) return "🟡";
  const p = priority.toUpperCase();
  if (p === "HIGH" || p === "URGENT") return "🔴";
  if (p === "MEDIUM") return "🟡";
  if (p === "LOW") return "🟢";
  return "🟡";
}

export function getEpicByIdOrChannelAnyStatus(identifier: string): EpicRow | undefined {
  return db.prepare(`SELECT * FROM epics WHERE id = ? OR channel_id = ? LIMIT 1`).get(identifier, identifier) as EpicRow | undefined;
}
export function updateEpicTitle(epicId: string, newTitle: string): boolean {
  const stmt = db.prepare(`
    UPDATE epics 
    SET title = ?, last_renamed_at = datetime('now'), updated_at = datetime('now') 
    WHERE id = ?
  `);
  const result = stmt.run(newTitle, epicId);
  return result.changes > 0;
}

export function getEpicTaskStats(epicId: string): { completed: number; total: number } {
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as completed
    FROM tasks 
    WHERE epic_id = ?
  `);
  
  const row = stmt.get(epicId) as { total: number; completed: number | null };
  return {
    total: row.total || 0,
    completed: row.completed || 0,
  };
}

export function getEpicById(epicId: string): EpicRow | undefined {
  return db.prepare(`SELECT * FROM epics WHERE id = ? AND is_archived = 0 LIMIT 1`).get(epicId) as EpicRow | undefined;
}

export function getEpicByChannelId(channelId: string): EpicRow | undefined {
  return db.prepare(`SELECT * FROM epics WHERE channel_id = ? AND is_archived = 0 LIMIT 1`).get(channelId) as EpicRow | undefined;
}

export function getArchivedEpicById(epicId: string): EpicRow | undefined {
  return db.prepare(`SELECT * FROM epics WHERE id = ? AND is_archived = 1 LIMIT 1`).get(epicId) as EpicRow | undefined;
}

export function getArchivedEpicByChannelId(channelId: string): EpicRow | undefined {
  return db.prepare(`SELECT * FROM epics WHERE channel_id = ? AND is_archived = 1 LIMIT 1`).get(channelId) as EpicRow | undefined;
}

export function getTasksByEpicId(epicId: string): TaskItem[] {
  const tasksStmt = db.prepare(`SELECT id, title, done, due_date FROM tasks WHERE epic_id = ? AND is_archived = 0 ORDER BY id ASC`);
  const assigneesStmt = db.prepare(`SELECT user_id FROM task_assignees WHERE task_id = ?`);
  const rows = tasksStmt.all(epicId) as Array<{ id: number; title: string; done: number; due_date: string | null }>;

  return rows.map((row, index) => {
    const assigneeRows = assigneesStmt.all(row.id) as Array<{ user_id: string }>;
    return {
      id: row.id,
      task_num: index + 1,
      title: row.title,
      done: Boolean(row.done),
      assignees: assigneeRows.map((a) => a.user_id),
      dueDate: row.due_date ? new Date(row.due_date) : null,
    };
  });
}

export function archiveEpic(epicId: string): any {
  const archiveEpicStmt = db.prepare(`UPDATE epics SET is_archived = 1, archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`);
  const archiveTasksStmt = db.prepare(`UPDATE tasks SET is_archived = 1, archived_at = datetime('now'), updated_at = datetime('now') WHERE epic_id = ?`);
  return db.transaction((id: string) => archiveEpicStmt.run(id) && archiveTasksStmt.run(id))(epicId);
}

export function unarchiveEpic(epicId: string): any {
  const unarchiveEpicStmt = db.prepare(`UPDATE epics SET is_archived = 0, archived_at = NULL, updated_at = datetime('now') WHERE id = ?`);
  const unarchiveTasksStmt = db.prepare(`UPDATE tasks SET is_archived = 0, archived_at = NULL, updated_at = datetime('now') WHERE epic_id = ?`);
  return db.transaction((id: string) => unarchiveEpicStmt.run(id) && unarchiveTasksStmt.run(id))(epicId);
}

export function deleteEpic(epicId: string): boolean {
  const deleteAssignees = db.prepare(`
    DELETE FROM task_assignees 
    WHERE task_id IN (SELECT id FROM tasks WHERE epic_id = ?)
  `);
  const deleteTasks = db.prepare(`DELETE FROM tasks WHERE epic_id = ?`);
  const deleteEpicStmt = db.prepare(`DELETE FROM epics WHERE id = ?`);

  const transaction = db.transaction((id: string) => {
    deleteAssignees.run(id);
    deleteTasks.run(id);
    const result = deleteEpicStmt.run(id);
    return result.changes > 0;
  });

  return transaction(epicId);
}
export interface UserTaskSummary {
  task_id: number;
  task_title: string;
  done: boolean;
  due_date: string | null;
  epic_id: string;
  epic_title: string;
  epic_channel_id: string;
  epic_priority: string;
}
export interface StatusTrackerRow {
  guild_id: string;
  channel_id: string;
  message_id: string;
}

export function getStatusTracker(guildId: string): StatusTrackerRow | undefined {
  return db
    .prepare(`SELECT * FROM status_trackers WHERE guild_id = ?`)
    .get(guildId) as StatusTrackerRow | undefined;
}

export function saveStatusTracker(guildId: string, channelId: string, messageId: string): void {
  db.prepare(`
    INSERT INTO status_trackers (guild_id, channel_id, message_id, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(guild_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      message_id = excluded.message_id,
      updated_at = datetime('now')
  `).run(guildId, channelId, messageId);
}

export function removeStatusTracker(guildId: string): void {
  db.prepare(`DELETE FROM status_trackers WHERE guild_id = ?`).run(guildId);
}
export function getTasksByUserId(userId: string): UserTaskSummary[] {
  return db
    .prepare(
      `
      SELECT 
        t.id as task_id,
        t.title as task_title,
        t.done,
        t.due_date,
        e.id as epic_id,
        e.title as epic_title,
        e.channel_id as epic_channel_id,
        e.priority as epic_priority
      FROM task_assignees ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN epics e ON t.epic_id = e.id
      WHERE ta.user_id = ? 
        AND e.is_archived = 0 
        AND t.is_archived = 0
      ORDER BY t.done ASC, e.id ASC, t.id ASC
    `
    )
    .all(userId) as UserTaskSummary[];
}

export interface UserTrackerRow {
  id: number;
  user_id: string;
  channel_id: string;
  message_id: string;
}

export function getUserTaskTracker(userId: string, channelId: string): UserTrackerRow | undefined {
  return db
    .prepare(`SELECT * FROM user_task_trackers WHERE user_id = ? AND channel_id = ?`)
    .get(userId, channelId) as UserTrackerRow | undefined;
}

export function addUserTaskTracker(userId: string, channelId: string, messageId: string): void {
  db.prepare(
    `INSERT INTO user_task_trackers (user_id, channel_id, message_id) VALUES (?, ?, ?)`
  ).run(userId, channelId, messageId);
}

export function removeUserTaskTracker(userId: string, channelId: string): void {
  db.prepare(`DELETE FROM user_task_trackers WHERE user_id = ? AND channel_id = ?`).run(userId, channelId);
}

export function getAllUserTaskTrackers(): UserTrackerRow[] {
  return db.prepare(`SELECT * FROM user_task_trackers`).all() as UserTrackerRow[];
}

// -----------------------------------------------------------------------------
// UI / MESSAGE ID SYNC HELPERS
// -----------------------------------------------------------------------------

export function editTaskListMessageIdByChannel(channelId: string, messageId: string) {
  const stmt = db.prepare(`
    UPDATE epics 
    SET message_id = ?, updated_at = datetime('now') 
    WHERE channel_id = ? AND is_archived = 0
  `);
  stmt.run(messageId, channelId);
}

export function getTaskListMessageIdByChannel(channelId: string): string | null {
  const stmt = db.prepare(`
    SELECT message_id FROM epics 
    WHERE channel_id = ? AND is_archived = 0 
    LIMIT 1
  `);
  const row = stmt.get(channelId) as { message_id: string | null } | undefined;
  return row?.message_id ?? null;
}

// ==========================================
// Task Functions
// ==========================================

export function getTaskIdByNum(epicId: string, taskNum: number): number | null {
  const row = db
    .prepare(
      `
      WITH numbered_tasks AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) AS task_num
        FROM tasks
        WHERE epic_id = ? AND is_archived = 0
      )
      SELECT id FROM numbered_tasks WHERE task_num = ?
    `
    )
    .get(epicId, taskNum) as { id: number } | undefined;

  return row ? row.id : null;
}

export function addTask(
  epicId: string,
  authorId: string,
  title: string,
  dueDate?: string | null,
  assigneeId?: string | null
): number {
  const stmt = db.prepare(`
    INSERT INTO tasks (epic_id, author_id, title, due_date)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(epicId, authorId, title, dueDate || null);
  const taskId = info.lastInsertRowid as number;

  if (assigneeId) {
    db.prepare(`INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)`).run(taskId, assigneeId);
  }

  return taskId;
}

export function toggleTaskDone(taskId: number, userId: string): boolean {
  const task = db.prepare(`SELECT done FROM tasks WHERE id = ?`).get(taskId) as { done: number } | undefined;
  if (!task) return false;

  const newDone = task.done === 1 ? 0 : 1;
  const stmt = db.prepare(`
    UPDATE tasks 
    SET done = ?, completed_by = ?, completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END, updated_at = datetime('now')
    WHERE id = ?
  `);
  const result = stmt.run(newDone, newDone === 1 ? userId : null, newDone, taskId);
  return result.changes > 0;
}

export function deleteTask(taskId: number): boolean {
  const info = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(taskId);
  return info.changes > 0;
}

export function assignTaskUser(taskId: number, userId: string): boolean {
  const stmt = db.prepare(`INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)`);
  const result = stmt.run(taskId, userId);
  return result.changes > 0;
}

export function updateTaskDueDate(taskId: number, dueDate: string | null): boolean {
  const stmt = db.prepare(`UPDATE tasks SET due_date = ?, updated_at = datetime('now') WHERE id = ?`);
  const result = stmt.run(dueDate, taskId);
  return result.changes > 0;
}



export function listTasks(epicChannelId: number, includeArchived = false): Task[] {
  const sql = includeArchived
    ? `SELECT *, ROW_NUMBER() OVER (ORDER BY id ASC) AS task_num FROM tasks WHERE epic_id = ? ORDER BY done ASC, id ASC`
    : `SELECT *, ROW_NUMBER() OVER (ORDER BY id ASC) AS task_num FROM tasks WHERE epic_id = ? AND is_archived = 0 ORDER BY done ASC, id ASC`;

  return db.prepare(sql).all(epicChannelId) as Task[];
}


export function toggleTaskAssignee(taskId: number, userId: string): { added: boolean } {
  const existing = db
    .prepare(`SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?`)
    .get(taskId, userId);

  if (existing) {
    db.prepare(`DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?`).run(taskId, userId);
    return { added: false };
  } else {
    db.prepare(`INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)`).run(taskId, userId);
    return { added: true };
  }
}

export interface EpicStatusData {
  id: string;
  title: string;
  channel_id: string;
  priority: string;
  completed_count: number;
  total_count: number;
  assignees: string[];
}



export function getAllActiveEpicsStatus(): EpicStatusData[] {
  const epics = db
    .prepare(`SELECT * FROM epics WHERE is_archived = 0 ORDER BY created_at DESC`)
    .all() as EpicRow[];

  return epics.map((epic) => {
    const stats = getEpicTaskStats(epic.id);
    const assigneesRows = db
      .prepare(
        `
        SELECT DISTINCT ta.user_id
        FROM task_assignees ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE t.epic_id = ? AND t.is_archived = 0
      `
      )
      .all(epic.id) as Array<{ user_id: string }>;

    return {
      id: epic.id,
      title: epic.title,
      channel_id: epic.channel_id,
      priority: epic.priority,
      completed_count: stats.completed,
      total_count: stats.total,
      assignees: assigneesRows.map((a) => a.user_id),
    };
  });
}