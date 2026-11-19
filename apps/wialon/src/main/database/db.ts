import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const storageDir = path.resolve(rootDir, 'storage')

if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true })
}

const dbPath = path.join(storageDir, 'database.sqlite')
export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')