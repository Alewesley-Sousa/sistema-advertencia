// controllers/syncController.ts

import { NextFunction, Request, Response } from 'express'
import { sincronizarInfracoesWialon } from '../services/wialonSyncService'

export async function handleSincronizarDados(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Dispara a busca manual/reconexão na API da Wialon
    const resultado = await sincronizarInfracoesWialon()

    res.status(200).json({
      message: 'Sincronização concluída com sucesso.',
      processados: resultado.novosRegistros
    })
  } catch (error) {
    console.error('[Sync Error]', error)
    next(error)
  }
}