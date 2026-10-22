'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function ensureDirectory(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function initializeSchema(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_ip TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT,
            attendance_time TEXT NOT NULL,
            attendance_date TEXT NOT NULL,
            status TEXT,
            raw_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(device_ip, user_id, attendance_time)
        )
    `);
}

function createDatabase(databasePath) {
    ensureDirectory(databasePath);

    const database = new Database(databasePath);
    database.pragma('journal_mode = WAL');
    database.pragma('busy_timeout = 5000');
    initializeSchema(database);

    return database;
}

module.exports = { createDatabase };
