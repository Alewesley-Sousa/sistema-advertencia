/**
 * @fileoverview Repository para persistência e leitura das consultas e lotes do DETRAN.
 */

import { db } from '../../../database/db'
import type { MultaDetran, SituacaoDebitosVeiculo } from '../types'
import { chaveMulta } from '../utils'

/* ============================================================================
 * TIPOS
 * ==========================================================================*/

export interface InfracaoDetranRecord {
  id?: number
  lote_id?: number | null
  placa: string
  chassi: string
  modelo?: string | null
  contrato?: string | null
  status_consulta: 'PENDENTE' | 'PROCESSANDO' | 'QUITADO' | 'COM_DEBITO' | 'ERRO' | string
  tipo_debito?: string | null
  caminho_pdf?: string | null
  mensagem_erro?: string | null
}

export interface MultaDetranRecord {
  id: number
  ait: string
  dataInfracao: string
  dataVencimento?: string | null
  motivo?: string | null
  valor?: string | null
  valorPagar?: string | null
  caminhoPdf?: string | null
  erroEmissao?: string | null
  createdAt: string
}

/** Resultado de `salvarMultas` */
export interface SalvarMultasResult {
  inseridas: number
  atualizadas: number
}

function valorDetranEmCentavos(valor: string | null | undefined): number {
  const limpo = String(valor ?? '').replace(/[^\d,.-]/g, '')
  if (!limpo) return 0

  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const numero = Number(normalizado)

  return Number.isFinite(numero) ? Math.round(numero * 100) : 0
}

/** Extrai "AAAA-MM" de datas do Detran (dd/mm/aaaa [hh:mm]) ou ISO (aaaa-mm-dd). */
function mesDaInfracao(data: string | null | undefined): string | null {
  const texto = String(data ?? '').trim()
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  const ano = br ? br[3] : iso?.[1]
  const mes = Number(br ? br[2] : iso?.[2])

  if (!ano || !Number.isInteger(mes) || mes < 1 || mes > 12) return null
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** Lista todos os meses "AAAA-MM" entre início e fim, inclusive. */
function mesesEntre(inicio: string, fim: string): string[] {
  const meses: string[] = []
  let [ano, mes] = inicio.split('-').map(Number)
  const [anoFim, mesFim] = fim.split('-').map(Number)

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`)
    mes++
    if (mes > 12) {
      mes = 1
      ano++
    }
  }
  return meses
}

const FILTRO_SEM_CONTRATO = '__SEM_CONTRATO__'
const ROTULO_SEM_CONTRATO = 'S/C'

function montarFiltroContratos(contratos: string[], alias = 'c') {
  const valores = contratos.filter((contrato) => contrato !== FILTRO_SEM_CONTRATO)
  const incluirSemContrato = contratos.includes(FILTRO_SEM_CONTRATO)
  const partes: string[] = []

  if (valores.length > 0) {
    partes.push(`TRIM(${alias}.contrato) IN (${valores.map(() => '?').join(', ')})`)
  }
  if (incluirSemContrato) {
    partes.push(`(${alias}.contrato IS NULL OR TRIM(${alias}.contrato) = '')`)
  }

  return {
    sql: partes.length > 0 ? `WHERE (${partes.join(' OR ')})` : '',
    params: valores,
  }
}

/* ============================================================================
 * REPOSITORY
 * ==========================================================================*/

export const detranRepository = {
  /* ========================================================================
   * CONSULTAS
   * ======================================================================*/

  criarConsultaIncial(
    placa: string,
    chassi: string,
    metadados?: { modelo?: string; contrato?: string }
  ): number {
    const stmt = db.prepare(`
      INSERT INTO infracoes_detran (placa, chassi, modelo, contrato, status_consulta)
      VALUES (?, ?, ?, ?, 'PROCESSANDO')
    `)
    const result = stmt.run(
      placa,
      chassi,
      metadados?.modelo || null,
      metadados?.contrato || null
    )
    return Number(result.lastInsertRowid)
  },

  /** Busca a consulta existente por (placa, chassi). */
  buscarPorPlacaChassi(placa: string, chassi: string) {
    return db
      .prepare(
        `SELECT id, status_consulta, updated_at
         FROM infracoes_detran
         WHERE placa = ? AND chassi = ?
         LIMIT 1`
      )
      .get(placa.toUpperCase().trim(), chassi.toUpperCase().trim()) as
      | { id: number; status_consulta: string; updated_at: string }
      | undefined
  },

  /**
   * Upsert da consulta: se já existe pra (placa, chassi), reaproveita o ID
   * e volta status pra PROCESSANDO. Senão, cria uma linha nova.
   */
  obterOuCriarConsulta(
    placa: string,
    chassi: string,
    metadados?: { modelo?: string; contrato?: string }
  ): number {
    const placaUp = placa.toUpperCase().trim()
    const chassiUp = chassi.toUpperCase().trim()

    const existente = this.buscarPorPlacaChassi(placaUp, chassiUp)
    if (existente) {
      db.prepare(
        `UPDATE infracoes_detran
         SET status_consulta = 'PROCESSANDO',
             modelo = COALESCE(NULLIF(?, ''), modelo),
             contrato = COALESCE(NULLIF(?, ''), contrato),
             mensagem_erro = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(metadados?.modelo || null, metadados?.contrato || null, existente.id)

      return existente.id
    }

    return this.criarConsultaIncial(placaUp, chassiUp, metadados)
  },

  atualizarResultadoConsulta(
    id: number,
    resultado: {
      statusConsulta: string
      tipoDebito?: string | null
      debitos?: SituacaoDebitosVeiculo
      caminhoPdf?: string | null
      mensagemErro?: string | null
    }
  ) {
    const stmt = db.prepare(`
      UPDATE infracoes_detran
      SET status_consulta = ?,
          tipo_debito = ?,
          ipva_status = COALESCE(?, ipva_status),
          licenciamento_status = COALESCE(?, licenciamento_status),
          caminho_pdf = ?,
          mensagem_erro = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(
      resultado.statusConsulta,
      resultado.tipoDebito || null,
      resultado.debitos?.ipva ?? null,
      resultado.debitos?.licenciamento ?? null,
      resultado.caminhoPdf || null,
      resultado.mensagemErro || null,
      id
    )
  },

  buscarPorId(id: number) {
    const stmt = db.prepare(
      'SELECT id, caminho_pdf, placa FROM infracoes_detran WHERE id = ?'
    )
    return stmt.get(id) as
      | { id: number; caminho_pdf?: string; placa?: string }
      | undefined
  },

  listar({
    busca,
    status,
    limit,
    offset,
  }: {
    busca?: string
    status?: string
    limit: number
    offset: number
  }) {
    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (busca) {
      whereClause += ' AND (c.placa LIKE ? OR c.chassi LIKE ?)'
      params.push(`%${busca}%`, `%${busca}%`)
    }

    if (status) {
      if (status === 'COM_DEBITOS') {
        whereClause +=
          " AND (c.ipva_status = 'DEBITO' OR c.licenciamento_status = 'DEBITO')"
      } else {
        whereClause += ' AND c.status_consulta = ?'
        params.push(status)
      }
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM infracoes_detran c
      ${whereClause}
    `
    const total = (db.prepare(countQuery).get(...params) as { total: number }).total

    // O guard "m.id IS NOT NULL" é obrigatório: com LEFT JOIN, consultas
    // sem multas geram uma linha fantasma com m.* = NULL. Sem o guard,
    // os CASE que testam "vazio/ausente" dariam TRUE nessa linha e
    // inventariam uma falha inexistente.
    const dataQuery = `
      SELECT
        c.id,
        c.placa,
        c.chassi,
        c.modelo,
        c.contrato,
        c.status_consulta AS statusConsulta,
        c.tipo_debito     AS tipoDebito,
        c.ipva_status     AS ipvaStatus,
        c.licenciamento_status AS licenciamentoStatus,
        c.caminho_pdf     AS caminhoPdf,
        c.mensagem_erro   AS mensagemErro,
        c.created_at,
        c.updated_at,

        COUNT(m.id) AS qtdMultas,

        COUNT(m.caminho_pdf) AS qtdBoletosBaixados,

        COALESCE(SUM(
          CASE
            WHEN m.id IS NOT NULL
             AND m.erro_emissao IS NOT NULL
             AND m.erro_emissao <> ''
            THEN 1 ELSE 0
          END
        ), 0) AS qtdBoletosIndisponiveis,

        COALESCE(SUM(
          CASE
            WHEN m.id IS NOT NULL
             AND (m.caminho_pdf IS NULL OR m.caminho_pdf = '')
             AND (m.erro_emissao IS NULL OR m.erro_emissao = '')
            THEN 1 ELSE 0
          END
        ), 0) AS qtdBoletosFalhas

      FROM infracoes_detran c
      LEFT JOIN infracoes_detran_multas m
        ON m.detran_consulta_id = c.id AND m.ativa = 1
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `
    const data = db.prepare(dataQuery).all(...params, limit, offset)

    return { data, total }
  },

  obterRelatorios(contratosSelecionados: string[] = []) {
    const contratosDisponiveis = db.prepare(`
      SELECT DISTINCT TRIM(contrato) AS contrato
      FROM infracoes_detran
      WHERE contrato IS NOT NULL AND TRIM(contrato) <> ''
      ORDER BY TRIM(contrato) COLLATE NOCASE
    `).all() as Array<{ contrato: string }>

    const temVeiculosSemContrato = db.prepare(`
      SELECT 1 AS existe
      FROM infracoes_detran
      WHERE contrato IS NULL OR TRIM(contrato) = ''
      LIMIT 1
    `).get()

    const filtroVeiculos = montarFiltroContratos(contratosSelecionados)
    const resumo = db.prepare(`
      SELECT
        COUNT(*) AS veiculosNoHistorico,
        COALESCE(SUM(CASE WHEN status_consulta IN ('QUITADO', 'COM_DEBITO') THEN 1 ELSE 0 END), 0) AS consultasConcluidas,
        COALESCE(SUM(CASE WHEN status_consulta = 'COM_DEBITO' THEN 1 ELSE 0 END), 0) AS veiculosComMultas,
        COALESCE(SUM(CASE WHEN ipva_status = 'DEBITO' OR licenciamento_status = 'DEBITO' THEN 1 ELSE 0 END), 0) AS veiculosComDebitos,
        COALESCE(SUM(CASE WHEN ipva_status = 'DEBITO' THEN 1 ELSE 0 END), 0) AS ipvaComDebito,
        COALESCE(SUM(CASE WHEN licenciamento_status = 'DEBITO' THEN 1 ELSE 0 END), 0) AS licenciamentoComDebito
      FROM infracoes_detran c
      ${filtroVeiculos.sql}
    `).get(...filtroVeiculos.params) as Record<string, number>

    const filtroSituacoes = montarFiltroContratos(contratosSelecionados)
    const situacoes = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN ipva_status = 'DEBITO' THEN 1 ELSE 0 END), 0) AS ipvaDebito,
        COALESCE(SUM(CASE WHEN ipva_status = 'SEM_DEBITO' THEN 1 ELSE 0 END), 0) AS ipvaRegular,
        COALESCE(SUM(CASE WHEN ipva_status = 'INFORMACAO' THEN 1 ELSE 0 END), 0) AS ipvaInformativo,
        COALESCE(SUM(CASE WHEN ipva_status IS NULL OR ipva_status NOT IN ('DEBITO', 'SEM_DEBITO', 'INFORMACAO') THEN 1 ELSE 0 END), 0) AS ipvaNaoIdentificado,
        COALESCE(SUM(CASE WHEN licenciamento_status = 'DEBITO' THEN 1 ELSE 0 END), 0) AS licenciamentoDebito,
        COALESCE(SUM(CASE WHEN licenciamento_status = 'SEM_DEBITO' THEN 1 ELSE 0 END), 0) AS licenciamentoRegular,
        COALESCE(SUM(CASE WHEN licenciamento_status = 'INFORMACAO' THEN 1 ELSE 0 END), 0) AS licenciamentoInformativo,
        COALESCE(SUM(CASE WHEN licenciamento_status IS NULL OR licenciamento_status NOT IN ('DEBITO', 'SEM_DEBITO', 'INFORMACAO') THEN 1 ELSE 0 END), 0) AS licenciamentoNaoIdentificado
      FROM infracoes_detran c
      ${filtroSituacoes.sql}
    `).get(...filtroSituacoes.params) as Record<string, number>

    const veiculosFiltro = montarFiltroContratos(contratosSelecionados)
    const veiculos = db.prepare(`
      SELECT placa, modelo, contrato
      FROM infracoes_detran c
      ${veiculosFiltro.sql}
      ORDER BY updated_at DESC, id DESC
    `).all(...veiculosFiltro.params) as Array<{
      placa: string
      modelo: string | null
      contrato: string | null
    }>

    const metadadosPorPlaca = new Map<string, {
      placa: string
      modelo: string | null
      contrato: string | null
      qtdMultasAtivas: number
      multasAtivasComValor: number
      valorMultasAtivasCentavos: number
      qtdMultasHistorico: number
      multasHistoricoComValor: number
      valorMultasHistoricoCentavos: number
      multasAtivasComValorPagar: number
      valorTotalParaPagamentoCentavos: number
      boletosDisponiveis: number
    }>()

    for (const veiculo of veiculos) {
      const placa = veiculo.placa.toUpperCase().trim()
      if (!metadadosPorPlaca.has(placa)) {
        metadadosPorPlaca.set(placa, {
          placa,
          modelo: veiculo.modelo,
          contrato: veiculo.contrato,
          qtdMultasAtivas: 0,
          multasAtivasComValor: 0,
          valorMultasAtivasCentavos: 0,
          qtdMultasHistorico: 0,
          multasHistoricoComValor: 0,
          valorMultasHistoricoCentavos: 0,
          multasAtivasComValorPagar: 0,
          valorTotalParaPagamentoCentavos: 0,
          boletosDisponiveis: 0,
        })
      }
    }

    const multasDoFiltro = db.prepare(`
      SELECT m.placa, m.ativa, m.valor, m.valor_pagar AS valorPagar, m.caminho_pdf AS caminhoPdf,
             m.data_infracao AS dataInfracao
      FROM infracoes_detran_multas m
    `).all() as Array<{
      placa: string
      ativa: number
      valor: string | null
      valorPagar: string | null
      caminhoPdf: string | null
      dataInfracao: string | null
    }>

    const todosVeiculos = db.prepare(`
      SELECT placa, contrato
      FROM infracoes_detran
      ORDER BY updated_at DESC, id DESC
    `).all() as Array<{ placa: string; contrato: string | null }>
    const contratoPorPlaca = new Map<string, string | null>()
    for (const veiculo of todosVeiculos) {
      const placa = veiculo.placa.toUpperCase().trim()
      if (!contratoPorPlaca.has(placa)) contratoPorPlaca.set(placa, veiculo.contrato)
    }

    const valoresContrato = new Map<string, {
      id: string
      contrato: string
      valorMultasAtivasCentavos: number
      qtdMultasAtivas: number
    }>()

    for (const veiculo of todosVeiculos) {
      const nomeContrato = veiculo.contrato?.trim()
      const idContrato = nomeContrato || FILTRO_SEM_CONTRATO
      if (!valoresContrato.has(idContrato)) {
        valoresContrato.set(idContrato, {
          id: idContrato,
          contrato: nomeContrato || ROTULO_SEM_CONTRATO,
          valorMultasAtivasCentavos: 0,
          qtdMultasAtivas: 0,
        })
      }
    }

    // mês ("AAAA-MM") → id do contrato → centavos
    const valoresMensais = new Map<string, Map<string, number>>()
    let multasAtivasSemData = 0

    for (const multa of multasDoFiltro) {
      const placa = multa.placa.toUpperCase().trim()
      if (multa.ativa) {
        const nomeContrato = contratoPorPlaca.get(placa)?.trim()
        const idContrato = nomeContrato || FILTRO_SEM_CONTRATO
        const valorContrato = valoresContrato.get(idContrato) ?? {
          id: idContrato,
          contrato: nomeContrato || ROTULO_SEM_CONTRATO,
          valorMultasAtivasCentavos: 0,
          qtdMultasAtivas: 0,
        }
        valorContrato.valorMultasAtivasCentavos += valorDetranEmCentavos(multa.valor)
        valorContrato.qtdMultasAtivas++
        valoresContrato.set(idContrato, valorContrato)

        const mes = mesDaInfracao(multa.dataInfracao)
        if (mes) {
          const contratosDoMes = valoresMensais.get(mes) ?? new Map<string, number>()
          contratosDoMes.set(
            idContrato,
            (contratosDoMes.get(idContrato) ?? 0) + valorDetranEmCentavos(multa.valor)
          )
          valoresMensais.set(mes, contratosDoMes)
        } else {
          multasAtivasSemData++
        }
      }

      const totais = metadadosPorPlaca.get(placa)
      if (!totais) continue

      const temValor = multa.valor != null && multa.valor.trim() !== ''
      const temValorPagar = multa.valorPagar != null && multa.valorPagar.trim() !== ''
      const valorCentavos = valorDetranEmCentavos(multa.valor)
      totais.qtdMultasHistorico++
      if (temValor) {
        totais.multasHistoricoComValor++
        totais.valorMultasHistoricoCentavos += valorCentavos
      }

      if (multa.ativa) {
        totais.qtdMultasAtivas++
        if (temValor) {
          totais.multasAtivasComValor++
          totais.valorMultasAtivasCentavos += valorCentavos
        }
        if (temValorPagar) {
          totais.multasAtivasComValorPagar++
          totais.valorTotalParaPagamentoCentavos += valorDetranEmCentavos(multa.valorPagar)
        }
        if (multa.caminhoPdf) totais.boletosDisponiveis++
      }
    }

    const multasPorVeiculo = Array.from(metadadosPorPlaca.values())
      .map((totais) => ({
        placa: totais.placa,
        modelo: totais.modelo,
        contrato: totais.contrato,
        qtdMultasAtivas: totais.qtdMultasAtivas,
        multasAtivasComValor: totais.multasAtivasComValor,
        valorMultasAtivas: totais.valorMultasAtivasCentavos / 100,
        qtdMultasHistorico: totais.qtdMultasHistorico,
        multasHistoricoComValor: totais.multasHistoricoComValor,
        valorMultasHistorico: totais.valorMultasHistoricoCentavos / 100,
      }))
      .sort((a, b) =>
        b.qtdMultasAtivas - a.qtdMultasAtivas || a.placa.localeCompare(b.placa)
      )

    const resumoMultas = Array.from(metadadosPorPlaca.values()).reduce(
      (total, veiculo) => ({
        multasAtivas: total.multasAtivas + veiculo.qtdMultasAtivas,
        boletosDisponiveis: total.boletosDisponiveis + veiculo.boletosDisponiveis,
        multasComValor: total.multasComValor + veiculo.multasAtivasComValor,
        multasComValorPagar: total.multasComValorPagar + veiculo.multasAtivasComValorPagar,
        valorTotalMultasAtivas: total.valorTotalMultasAtivas + veiculo.valorMultasAtivasCentavos,
        valorTotalParaPagamento: total.valorTotalParaPagamento + veiculo.valorTotalParaPagamentoCentavos,
        veiculosComMultas: total.veiculosComMultas + (veiculo.qtdMultasAtivas > 0 ? 1 : 0),
      }),
      {
        multasAtivas: 0,
        boletosDisponiveis: 0,
        multasComValor: 0,
        multasComValorPagar: 0,
        valorTotalMultasAtivas: 0,
        valorTotalParaPagamento: 0,
        veiculosComMultas: 0,
      }
    )

    const contratosDisponiveisComSemContrato = [
      ...contratosDisponiveis.map(({ contrato }) => ({ id: contrato, nome: contrato })),
      ...(temVeiculosSemContrato
        ? [{ id: FILTRO_SEM_CONTRATO, nome: ROTULO_SEM_CONTRATO }]
        : []),
    ]

    // Preenche os meses sem multa entre o primeiro e o último, para a linha não saltar meses.
    const mesesComMulta = Array.from(valoresMensais.keys()).sort()
    const evolucaoMensalContratos = {
      multasSemData: multasAtivasSemData,
      meses: mesesComMulta.length
        ? mesesEntre(mesesComMulta[0], mesesComMulta[mesesComMulta.length - 1]).map((mes) => ({
          mes,
          valores: Object.fromEntries(
            Array.from(valoresMensais.get(mes) ?? []).map(([id, centavos]) => [id, centavos / 100])
          ) as Record<string, number>,
        }))
        : [],
    }

    return {
      resumo: {
        ...resumo,
        ...resumoMultas,
        valorTotalMultasAtivas: resumoMultas.valorTotalMultasAtivas / 100,
        valorTotalParaPagamento: resumoMultas.valorTotalParaPagamento / 100,
      },
      situacoes,
      multasPorVeiculo,
      contratosDisponiveis: contratosDisponiveisComSemContrato,
      valoresPorContrato: Array.from(valoresContrato.values())
        .map((item) => ({
          id: item.id,
          contrato: item.contrato,
          valorMultasAtivas: item.valorMultasAtivasCentavos / 100,
          qtdMultasAtivas: item.qtdMultasAtivas,
        }))
        .sort((a, b) => b.valorMultasAtivas - a.valorMultasAtivas),
      evolucaoMensalContratos,
    }
  },

  /* ========================================================================
   * LOTES
   * ======================================================================*/

  // repositories/detranRepository.ts

  /**
   * Cria um "lote" — que aqui é só um agrupador pra ter id e contar progresso.
   * Não insere nada em `infracoes_detran` — cada veículo vira uma consulta
   * individual via `obterOuCriarConsulta` na hora de processar.
   */
  criarLote(nomeArquivo: string, totalVeiculos: number): number {
    const stmt = db.prepare(`
    INSERT INTO lotes_consultas (nome_arquivo, status, total_veiculos, processados)
    VALUES (?, 'PROCESSANDO', ?, 0)
  `)
    const result = stmt.run(nomeArquivo, totalVeiculos)
    return Number(result.lastInsertRowid)
  },

  atualizarStatus(id: number, status: string) {
    db.prepare(`UPDATE infracoes_detran SET status_consulta = ? WHERE id = ?`).run(
      status,
      id
    )
  },

  incrementarProgressoLote(loteId: number) {
    return db.prepare(`
    UPDATE lotes_consultas
    SET processados = processados + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(loteId)
  },
  /* ========================================================================
   * MULTAS INDIVIDUAIS
   * ======================================================================*/

  /**
   * Retorna o conjunto de chaves "AIT|DATA_INFRACAO" que já foram baixadas
   * com sucesso pra essa placa.
   *
   * Multas com `erro_emissao` NÃO entram (tentamos de novo).
   */
  buscarChavesJaBaixadas(placa: string): Set<string> {
    const rows = db
      .prepare(
        `SELECT ait, data_infracao
         FROM infracoes_detran_multas
         WHERE placa = ?
           AND caminho_pdf IS NOT NULL
           AND (erro_emissao IS NULL OR erro_emissao = '')`
      )
      .all(placa.toUpperCase().trim()) as Array<{
        ait: string
        data_infracao: string
      }>

    return new Set(rows.map((r) => chaveMulta(r.ait, r.data_infracao)))
  },

  /**
   * Busca, pra uma placa, um mapa de chave ("AIT|DATA") → ID de registro existente.
   *
   * Usado pelo `salvarMultas` pra decidir entre INSERT e UPDATE sem fazer
   * N SELECTs (uma consulta só, depois lookup em memória).
   */
  buscarIdsPorChave(placa: string): Map<string, number> {
    const rows = db
      .prepare(
        `SELECT id, ait, data_infracao
         FROM infracoes_detran_multas
         WHERE placa = ?`
      )
      .all(placa.toUpperCase().trim()) as Array<{
        id: number
        ait: string
        data_infracao: string
      }>

    const mapa = new Map<string, number>()
    for (const r of rows) {
      mapa.set(chaveMulta(r.ait, r.data_infracao), r.id)
    }
    return mapa
  },

  /**
   * Upsert das multas por chave natural (placa, ait, data_infracao).
   *
   * Regras:
   *   - `jaBaixada: true` são ignoradas (já existem no banco com sucesso)
   *   - Chave já existente → UPDATE (re-tentativa após erro, ou
   *     transição erro→sucesso se conseguiu baixar dessa vez)
   *   - Chave nova → INSERT
   *
   * Retorna { inseridas, atualizadas }.
   */
  salvarMultas(
    consultaId: number,
    placa: string,
    multas: MultaDetran[]
  ): SalvarMultasResult {
    const paraSalvar = multas.filter((m) => !m.jaBaixada)
    if (!paraSalvar.length) {
      return { inseridas: 0, atualizadas: 0 }
    }

    const placaUp = placa.toUpperCase().trim()

    const stmtInsert = db.prepare(`
      INSERT INTO infracoes_detran_multas
        (detran_consulta_id, placa, ait, data_infracao, data_vencimento,
         motivo, valor, valor_pagar, caminho_pdf, erro_emissao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const stmtUpdate = db.prepare(`
      UPDATE infracoes_detran_multas
      SET detran_consulta_id = ?,
          data_vencimento = ?,
          motivo = ?,
          valor = ?,
          valor_pagar = ?,
          caminho_pdf = ?,
          erro_emissao = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    // Mapa chave→id existente (uma query só)
    const existentes = this.buscarIdsPorChave(placaUp)

    return db.transaction(() => {
      let inseridas = 0
      let atualizadas = 0

      for (const m of paraSalvar) {
        const chave = chaveMulta(m.ait, m.dataInfracao)
        const idExistente = existentes.get(chave)

        if (idExistente) {
          // UPDATE — mantém o ID, atualiza o resultado
          stmtUpdate.run(
            consultaId,
            m.dataVencimento || null,
            m.motivo || null,
            m.valor || null,
            m.valorPagar || null,
            m.caminhoPdf || null,
            m.erroEmissao || null,
            idExistente
          )
          atualizadas++
        } else {
          // INSERT — primeira vez que vemos essa multa
          stmtInsert.run(
            consultaId,
            placaUp,
            m.ait,
            m.dataInfracao || '',
            m.dataVencimento || null,
            m.motivo || null,
            m.valor || null,
            m.valorPagar || null,
            m.caminhoPdf || null,
            m.erroEmissao || null
          )
          inseridas++
        }
      }

      return { inseridas, atualizadas }
    })()
  },

  /** Atualiza quais multas da placa continuam presentes no resultado confirmado. */
  sincronizarMultasAtivas(
    consultaId: number,
    placa: string,
    multas: MultaDetran[]
  ) {
    const placaUp = placa.toUpperCase().trim()
    const chavesPresentes = new Set(
      multas.map((multa) => chaveMulta(multa.ait, multa.dataInfracao))
    )

    const registros = db
      .prepare(
        `SELECT id, ait, data_infracao, ativa
         FROM infracoes_detran_multas
         WHERE placa = ?`
      )
      .all(placaUp) as Array<{
      id: number
      ait: string
      data_infracao: string
      ativa: number
    }>

    const inativar = db.prepare(`
      UPDATE infracoes_detran_multas
      SET ativa = 0,
          inativada_em = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND ativa = 1
    `)
    const reativar = db.prepare(`
      UPDATE infracoes_detran_multas
      SET detran_consulta_id = ?,
          ativa = 1,
          ultima_consulta_em = CURRENT_TIMESTAMP,
          inativada_em = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    db.transaction(() => {
      const idsPorChave = new Map<string, number>()

      for (const registro of registros) {
        const chave = chaveMulta(registro.ait, registro.data_infracao)
        idsPorChave.set(chave, registro.id)

        if (!chavesPresentes.has(chave)) {
          inativar.run(registro.id)
        }
      }

      for (const chave of chavesPresentes) {
        const id = idsPorChave.get(chave)
        if (id) {
          reativar.run(consultaId, id)
        }
      }
    })()
  },

  listarMultasPorConsulta(consultaId: number): MultaDetranRecord[] {
    return db
      .prepare(
        `SELECT
           id,
           ait,
           data_infracao   AS dataInfracao,
           data_vencimento AS dataVencimento,
           motivo,
           valor,
           valor_pagar     AS valorPagar,
           caminho_pdf     AS caminhoPdf,
           erro_emissao    AS erroEmissao,
           created_at      AS createdAt
         FROM infracoes_detran_multas
         WHERE detran_consulta_id = ? AND ativa = 1
         ORDER BY data_infracao DESC, id DESC`
      )
      .all(consultaId) as MultaDetranRecord[]
  },

  buscarMultaPorId(id: number) {
    return db
      .prepare(
        `SELECT id, placa, ait, data_infracao, caminho_pdf, erro_emissao
         FROM infracoes_detran_multas
         WHERE id = ?`
      )
      .get(id) as
      | {
        id: number
        placa: string
        ait: string
        data_infracao: string
        caminho_pdf?: string | null
        erro_emissao?: string | null
      }
      | undefined
  },

  contarMultasPorConsulta(consultaId: number): number {
    const row = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM infracoes_detran_multas
         WHERE detran_consulta_id = ? AND ativa = 1`
      )
      .get(consultaId) as { total: number }

    return row.total
  },

  /**
 * Busca o lote por ID.
 */
  buscarLotePorId(id: number) {
    return db
      .prepare(
        `SELECT id, nome_arquivo, status, total_veiculos, processados, item_atual, updated_at
       FROM lotes_consultas
       WHERE id = ?`
      )
      .get(id) as
      | {
        id: number
        nome_arquivo: string
        status: 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'
        total_veiculos: number
        processados: number
        item_atual: string | null
        updated_at: string
      }
      | undefined
  },

  /**
   * Marca qual placa está sendo processada agora.
   */
  atualizarItemAtualLote(loteId: number, placa: string) {
    db.prepare(
      `UPDATE lotes_consultas
     SET item_atual = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
    ).run(placa, loteId)
  },

  /**
   * Marca o lote como concluído e limpa `item_atual`.
   */
  finalizarLote(loteId: number) {
    db.prepare(
      `UPDATE lotes_consultas
     SET status = 'CONCLUIDO',
         item_atual = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
    ).run(loteId)
  },

  /**
   * Retorna todas as multas com PDF válido em disco, agrupáveis por placa.
   * Se `ids` for passado, restringe às consultas com esses IDs.
   */
  listarParaExportacao(ids?: number[]): Array<{
    consultaId: number
    placa: string
    chassi: string
    multaId: number
    ait: string
    dataInfracao: string
    caminhoPdf: string
  }> {
    let where = 'WHERE 1=1'
    const params: any[] = []

    if (ids?.length) {
      where += ` AND c.id IN (${ids.map(() => '?').join(',')})`
      params.push(...ids)
    }

    return db.prepare(`
    SELECT
      c.id           AS consultaId,
      c.placa,
      c.chassi,
      m.id           AS multaId,
      m.ait,
      m.data_infracao AS dataInfracao,
      m.caminho_pdf   AS caminhoPdf
    FROM infracoes_detran c
    INNER JOIN infracoes_detran_multas m
      ON m.detran_consulta_id = c.id
    ${where}
      AND m.caminho_pdf IS NOT NULL
      AND m.caminho_pdf <> ''
      AND m.ativa = 1
    ORDER BY c.placa ASC, m.data_infracao DESC, m.id DESC
  `).all(...params) as any
  }

}

