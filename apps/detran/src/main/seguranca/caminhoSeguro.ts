// apps/detran/src/main/seguranca/caminhoSeguro.ts
import path from 'node:path'

/** Pasta onde o app guarda arquivos (PDFs, banco, backups). Nada fora dela é servido. */
export const STORAGE_DIR = path.resolve(process.cwd(), 'storage')

/** true só se `alvo` estiver DENTRO de `base` (resolve `..`, caminhos absolutos e variações de barra). */
export function estaDentroDe(base: string, alvo: string): boolean {
  if (!alvo || typeof alvo !== 'string' || alvo.includes('\0')) return false
  const rel = path.relative(path.resolve(base), path.resolve(alvo))
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}
