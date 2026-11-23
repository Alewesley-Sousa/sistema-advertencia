// apps/detran/src/main/seguranca/backupAgendador.ts
import path from 'node:path'
import cron from 'node-cron'

import { db } from '../database/db'
import { backupRecente, fazerBackup } from './backup'
import { STORAGE_DIR } from './caminhoSeguro'

function opcoes() {
  const e = process.env
  const dias = Number(e.BACKUP_RETENCAO_DIAS ?? 14)
  return {
    ativo: (e.BACKUP_ATIVO ?? 'true').toLowerCase() !== 'false',
    cron: e.BACKUP_CRON || '30 2 * * *',
    timeZone: e.BACKUP_TZ || 'America/Fortaleza',
    pasta: path.resolve(e.BACKUP_DIR || path.join(STORAGE_DIR, 'backups')),
    retencaoDias: Number.isFinite(dias) && dias >= 1 ? dias : 14,
    incluirArquivos: (e.BACKUP_INCLUIR_ARQUIVOS ?? 'true').toLowerCase() !== 'false',
  }
}

export async function executarBackup(): Promise<string> {
  const o = opcoes()
  const r = await fazerBackup(db as any, {
    pasta: o.pasta,
    retencaoDias: o.retencaoDias,
    timeZone: o.timeZone,
    pastaArquivos: o.incluirArquivos ? path.join(STORAGE_DIR, 'documentos') : undefined,
    verificar: async (arquivo) => {
      const { default: Database } = await import('better-sqlite3')
      const copia = new Database(arquivo, { readonly: true })
      try {
        const res = copia.pragma('quick_check', { simple: true })
        if (res !== 'ok') throw new Error(`verificação da cópia falhou: ${String(res)}`)
      } finally {
        copia.close()
      }
    },
  })
  const msg = `Backup ok: ${path.basename(r.arquivo)} (${Math.round(r.tamanho / 1024)} KB), ` +
    `${r.arquivosCopiados} arquivo(s) novo(s) copiado(s), ${r.removidos.length} backup(s) antigo(s) removido(s).`
  console.log(`[Backup] ${msg}`)
  return msg
}

export function iniciarBackup() {
  const o = opcoes()
  if (!o.ativo) {
    console.log('[Backup] Desativado (BACKUP_ATIVO=false).')
    return
  }
  if (!cron.validate(o.cron)) {
    console.error(`[Backup] BACKUP_CRON inválido ("${o.cron}"). Backup NÃO agendado.`)
    return
  }
  cron.schedule(o.cron, () => {
    executarBackup().catch((e) => console.error('[Backup] FALHOU:', e?.message))
  }, { timezone: o.timeZone })
  console.log(`[Backup] Agendado: "${o.cron}" (${o.timeZone}) → ${o.pasta}, retenção ${o.retencaoDias} dia(s).`)

  // Se o servidor ficou desligado na hora marcada, faz um backup logo depois de subir.
  if (!backupRecente(o.pasta, 24)) {
    setTimeout(() => {
      executarBackup().catch((e) => console.error('[Backup] FALHOU:', e?.message))
    }, 60_000).unref()
  }
}
