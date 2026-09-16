import { Request, Response } from 'express'
import { configuracaoRepository } from '../repositories/configuracaoRepository'

export const configuracoesController = {
  listar: (_req: Request, res: Response) => {
    try {
      const configs = configuracaoRepository.listar()
      return res.status(200).json(configs)
    } catch (error) {
      console.error('[ConfigController] Erro ao listar:', error)
      return res.status(500).json({ error: 'Erro ao buscar configurações.' })
    }
  },

  salvar: (req: Request, res: Response) => {
    try {
      const { chave, valor } = req.body

      if (!chave || valor === undefined || valor === null) {
        return res.status(400).json({ error: 'Campos "chave" e "valor" são obrigatórios.' })
      }

      configuracaoRepository.salvar(String(chave), String(valor))
      return res.status(200).json({ chave, valor })
    } catch (error) {
      console.error('[ConfigController] Erro ao salvar:', error)
      return res.status(500).json({ error: 'Erro ao salvar configuração.' })
    }
  },

  deletar: (req: Request, res: Response) => {
    try {
      const { chave } = req.params

      if (!chave || typeof chave !== 'string') {
        return res.status(400).json({ error: 'Parâmetro "chave" inválido.' })
      }

      const info = configuracaoRepository.deletar(chave)

      if (info.changes === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada.' })
      }

      return res.status(200).json({ message: 'Configuração removida com sucesso.' })
    } catch (error) {
      console.error('[ConfigController] Erro ao deletar:', error)
      return res.status(500).json({ error: 'Erro ao deletar configuração.' })
    }
  }
}