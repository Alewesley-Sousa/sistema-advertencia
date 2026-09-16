// controllers/syncController.ts
import { Request, Response } from 'express'
import { sincronizarInfracoesWialon } from '../services/wialonSyncService'

export async function handleSincronizarDados(req: Request, res: Response): Promise<void> {
  try {
    // Dispara a busca manual/reconexão na API da Wialon
    const resultado = await sincronizarInfracoesWialon()

    res.status(200).json({
      message: 'Sincronização concluída com sucesso.',
      processados: resultado.novosRegistros
    })
  } catch (error: any) {
    console.error('[Sync Error]', error)
    res.status(500).json({ error: 'Falha ao sincronizar dados com a Wialon.' })
  }
}