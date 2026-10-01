/**
 * @fileoverview Controller para gerenciamento de configurações do sistema.
 *
 * Finalidade:
 * Expor os endpoints REST da API para leitura, criação/atualização (upsert)
 * e remoção de pares chave-valor de configuração persistidos no banco de dados
 * (ex: tokens da API Wialon, parâmetros de busca, limites operacionais).
 *
 * Endpoints gerenciados:
 * - GET /configuracoes         -> Lista todas as configurações
 * - POST /configuracoes        -> Salva ou atualiza uma configuração (chave, valor)
 * - DELETE /configuracoes/:chave -> Remove uma configuração existente
 */

import { Request, Response } from 'express'
import { configuracaoRepository } from '../repositories/configuracaoRepository'
import { sendResponse } from '../../../utils/response'
import { parseStringParam } from '../../../utils/requestHelpers'
import { AppError } from '../../../shared/errors/AppError'

export const configuracoesController = {
  listar: (_req: Request, res: Response) => {
    const configs = configuracaoRepository.listar()

    return sendResponse.success(res, configs)
  },

  salvar: (req: Request, res: Response) => {
    const { chave, valor } = req.body

    if (!chave || valor === undefined || valor === null) {
      return sendResponse.validationError(
        res,
        'Dados inválidos para a configuração.',
        [
          {
            field: 'chave',
            message: 'O campo "chave" é obrigatório.'
          },
          {
            field: 'valor',
            message: 'O campo "valor" é obrigatório.'
          }
        ]
      )
    }

    const chaveStr = String(chave).trim()
    const valorStr = String(valor).trim()

    if (!chaveStr) {
      return sendResponse.validationError(
        res,
        'A chave não pode ser vazia.',
        [
          {
            field: 'chave',
            message: 'Informe um identificador válido para a chave.'
          }
        ]
      )
    }

    configuracaoRepository.salvar(chaveStr, valorStr)

    return sendResponse.success(res, {
      chave: chaveStr,
      valor: valorStr
    })
  },

  deletar: (req: Request, res: Response) => {
    const chave = parseStringParam(req, res, 'chave')
    if (!chave) return

    const info = configuracaoRepository.deletar(chave)

    if (info.changes === 0) {
      throw new AppError(
        'Configuração não encontrada.',
        404,
        'CONFIG_NOT_FOUND'
      )
    }

    return sendResponse.success(res, {
      message: 'Configuração removida com sucesso.'
    })
  }
}