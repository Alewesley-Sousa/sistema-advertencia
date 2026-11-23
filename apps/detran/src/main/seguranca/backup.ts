// apps/detran/src/main/seguranca/backup.ts
//
// Backup do banco (cópia consistente via API de backup do SQLite — segura com o app em uso)
// e dos arquivos (PDFs dos boletos), com retenção por dias.

import fs from 'node:fs'
import path from 'node:path'

export interface DbComBackup {
  backup(destino: string): Promise<unknown>
}

const NOME_RE = /^database-(\d{8})-(\d{4})\.sqlite$/

/** "20261123" e "0230" no fuso informado. */
export function carimbo(data: Date, timeZone: string): { dia: string; hora: string } {
  const partes = new Intl.DateTimeFormat('sv-SE', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(data)
  const g = (t: string) => partes.find((p) => p.type === t)!.value
  return { dia: `${g('year')}${g('month')}${g('day')}`, hora: `${g('hour')}${g('minute')}` }
}

export interface OpcoesBackup {
  pasta: string
  retencaoDias: number
  timeZone: string
  /** Pasta com os PDFs a espelhar (opcional). */
  pastaArquivos?: string
  /** Validação extra da cópia (ex.: PRAGMA quick_check). Deve lançar em caso de problema. */
  verificar?: (arquivo: string) => void | Promise<void>
  agora?: Date
}

export interface ResultadoBackup {
  arquivo: string
  tamanho: number
  removidos: string[]
  arquivosCopiados: number
}

export async function fazerBackup(db: DbComBackup, o: OpcoesBackup): Promise<ResultadoBackup> {
  const agora = o.agora ?? new Date()
  fs.mkdirSync(o.pasta, { recursive: true })

  const { dia, hora } = carimbo(agora, o.timeZone)
  const arquivo = path.join(o.pasta, `database-${dia}-${hora}.sqlite`)
  const tmp = `${arquivo}.parcial`

  try {
    await db.backup(tmp)
    if (!fs.existsSync(tmp) || fs.statSync(tmp).size === 0) throw new Error('backup gerou arquivo vazio')
    if (o.verificar) await o.verificar(tmp)
    fs.renameSync(tmp, arquivo) // só vira "backup válido" depois de verificado
  } catch (e) {
    fs.rmSync(tmp, { force: true })
    throw e
  }

  const arquivosCopiados = o.pastaArquivos ? espelharPasta(o.pastaArquivos, path.join(o.pasta, 'arquivos')) : 0
  const removidos = aplicarRetencao(o.pasta, o.retencaoDias, o.timeZone, agora)
  return { arquivo, tamanho: fs.statSync(arquivo).size, removidos, arquivosCopiados }
}

/** Apaga backups de banco mais antigos que `dias`, mantendo sempre os 3 mais recentes. */
export function aplicarRetencao(pasta: string, dias: number, timeZone: string, agora: Date): string[] {
  const corte = carimbo(new Date(agora.getTime() - Math.max(1, dias) * 86_400_000), timeZone).dia
  const backups = fs.readdirSync(pasta).filter((n) => NOME_RE.test(n)).sort() // ordem cronológica
  const protegidos = new Set(backups.slice(-3))
  const removidos: string[] = []
  for (const nome of backups) {
    const dia = NOME_RE.exec(nome)![1]
    if (dia < corte && !protegidos.has(nome)) {
      fs.rmSync(path.join(pasta, nome), { force: true })
      removidos.push(nome)
    }
  }
  return removidos
}

/** Copia só o que é novo ou mudou de tamanho. Nunca apaga nada no destino (arquivos de auditoria). */
export function espelharPasta(origem: string, destino: string): number {
  if (!fs.existsSync(origem)) return 0
  let copiados = 0
  const andar = (de: string, para: string) => {
    fs.mkdirSync(para, { recursive: true })
    for (const e of fs.readdirSync(de, { withFileTypes: true })) {
      const a = path.join(de, e.name)
      const b = path.join(para, e.name)
      if (e.isDirectory()) { andar(a, b); continue }
      if (!e.isFile()) continue
      if (fs.existsSync(b) && fs.statSync(b).size === fs.statSync(a).size) continue
      fs.copyFileSync(a, b)
      copiados++
    }
  }
  andar(origem, destino)
  return copiados
}

/** Existe backup de banco feito nas últimas `horas` horas? (para o "catch-up" na partida) */
export function backupRecente(pasta: string, horas: number, agora = Date.now()): boolean {
  if (!fs.existsSync(pasta)) return false
  return fs.readdirSync(pasta).some((n) => NOME_RE.test(n) && agora - fs.statSync(path.join(pasta, n)).mtimeMs < horas * 3_600_000)
}
