import path from 'node:path';
import fs from 'node:fs';

export const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
export const PDF_DIR = path.join(STORAGE_DIR, 'pdfs');
export const DB_PATH = path.join(STORAGE_DIR, 'database.sqlite');

[STORAGE_DIR, PDF_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});