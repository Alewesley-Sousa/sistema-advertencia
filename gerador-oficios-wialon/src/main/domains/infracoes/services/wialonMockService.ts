// src/main/domains/infracoes/services/wialonMockService.ts

/**
 * @fileoverview Gerador de infrações mock simulando o webhook da Wialon.
 *
 * NÃO USAR EM PRODUÇÃO. As rotas que chamam este serviço são gated
 * por NODE_ENV !== 'production'.
 */

import { infracaoRepository } from '../repositories/infracaoRepository'
import type { StatusInfracao } from '../repositories/infracaoRepository'
import { db } from '../../../database/db'

/* ── Pool de dados realistas ─────────────────────────────────────── */

const CONDUTORES = [
  'DAVINO DOS SANTOS NASCIMENTO',
  'FRANCISCO REWLLE DA SILVA',
  'CARLOS HENRIQUE MOTA',
  'JOÃO PEDRO ALVES',
  'ANA PAULA RODRIGUES',
  'RAFAEL LIMA COSTA',
  'MARCOS VINÍCIUS PEREIRA',
  'JOSÉ ANTÔNIO FERREIRA',
  'PATRÍCIA GOMES DE SOUSA',
  'EDUARDO NASCIMENTO LOPES',
]

const PLACAS_ANTIGAS = ['ABC1D23', 'DEF4G56', 'GHI7J89', 'JKL0M12', 'NOP3Q45']
const PLACAS_MERCOSUL = ['RNG7H21', 'SAT2B56', 'TRH3I14', 'XYZ9A87', 'QRS4B56']
const PLACAS = [...PLACAS_ANTIGAS, ...PLACAS_MERCOSUL]

const ENDERECOS = [
  'Avenida Bezerra de Menezes, 961, São Gerardo, Fortaleza, CE',
  'Rua Paulo Graciano, Itapipoca, CE, 62500-000',
  'Avenida João de Araújo Lima, 280, Mondubim, Fortaleza, CE',
  'BR-116, Km 22, Messejana, Fortaleza, CE',
  'Avenida Washington Soares, 4200, Edson Queiroz, Fortaleza, CE',
  'Rua Raimunda Nogueira Martins, 1230, Parque das Flores, Aquiraz, CE',
  'CE-040, Km 12, Eusébio, CE',
  'Avenida dos Expedicionários, 3500, Centro, Fortaleza, CE',
  'Rua Barão de Aracati, 1400, Aldeota, Fortaleza, CE',
  'Avenida Dom Luís, 500, Meireles, Fortaleza, CE',
]

const VELOCIDADES = [103, 108, 112, 115, 118, 121, 124, 128, 132, 137, 141, 148]

/* ── Helpers ─────────────────────────────────────────────────────── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function dataRecente(diasAtras = 0, horaAleatoria = true): string {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  if (horaAleatoria) {
    d.setHours(randInt(6, 22), randInt(0, 59), randInt(0, 59), 0)
  }
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

function taskIdFake(): string {
  let s = ''
  for (let i = 0; i < 72; i++) {
    s += '0123456789abcdef'[Math.floor(Math.random() * 16)]
  }
  return s
}

/* ── Interface pública ───────────────────────────────────────────── */

export interface MockOptions {
  quantidade?: number
  distribuicao?: Partial<Record<StatusInfracao, number>>
  concentrarHoje?: boolean
  placaFixa?: string
  condutorFixo?: string
}

const DISTRIBUICAO_PADRAO: Record<StatusInfracao, number> = {
  REGISTRADO: 0.55,
  ERRO: 0.15,
  GERADO: 0.15,
  ENVIADO: 0.10,
  PENDENTE: 0.05,
  IGNORADO_MENOR_GRAVIDADE: 0,
}

function sortearStatus(
  dist: Record<StatusInfracao, number>
): StatusInfracao {
  const r = Math.random()
  let acc = 0
  for (const [status, prob] of Object.entries(dist) as [StatusInfracao, number][]) {
    acc += prob
    if (r <= acc) return status
  }
  return 'REGISTRADO'
}

/* ── API principal: gerar N infrações ────────────────────────────── */

export function gerarInfracoesMock(options: MockOptions = {}) {
  const {
    quantidade = 12,
    distribuicao = DISTRIBUICAO_PADRAO,
    concentrarHoje = false,
    placaFixa,
    condutorFixo,
  } = options

  const distCompleta: Record<StatusInfracao, number> = {
    ...DISTRIBUICAO_PADRAO,
    ...distribuicao,
  }

  const idsCriados: number[] = []
  const resumo: Record<StatusInfracao, number> = {
    REGISTRADO: 0,
    PENDENTE: 0,
    GERADO: 0,
    ENVIADO: 0,
    IGNORADO_MENOR_GRAVIDADE: 0,
    ERRO: 0,
  }

  for (let i = 0; i < quantidade; i++) {
    const status = sortearStatus(distCompleta)
    const placa = placaFixa ?? pick(PLACAS)
    const condutor = condutorFixo ?? pick(CONDUTORES)
    const velocidade = pick(VELOCIDADES)

    const diasAtras = concentrarHoje ? 0 : randInt(0, 6)
    const dataHora = dataRecente(diasAtras)

    const result = infracaoRepository.salvar({
      task_id: taskIdFake(),
      item_id: randInt(1000, 9999),
      placa,
      condutor,
      velocidade,
      latitude: -3.7 + Math.random() * 0.2,
      longitude: -38.5 + Math.random() * 0.2,
      endereco: pick(ENDERECOS),
      data_evento_wialon: dataHora,
      status,
    })

    const id = Number(result.lastInsertRowid)
    idsCriados.push(id)
    resumo[status]++
  }

  return { ids: idsCriados, resumo, total: quantidade }
}

/* ── API: limpar mocks criados nas últimas 24h ───────────────────── */

export function limparInfracoesMock(): number {
  const result = db
    .prepare(`
      DELETE FROM infracoes
      WHERE created_at >= datetime('now', '-1 day')
    `)
    .run()
  return Number(result.changes)
}

/* ── API: contagem de registros ──────────────────────────────────── */

export function contarInfracoes(): number {
  const row = db
    .prepare('SELECT COUNT(*) AS total FROM infracoes')
    .get() as { total: number }
  return row.total
}

/* ── API: seed automático no boot ────────────────────────────────── */

/**
 * Popula o banco automaticamente na inicialização, apenas em dev.
 *
 *  - NODE_ENV=production     → não faz nada (silencioso)
 *  - Tabela já tem registros → não faz nada, a menos que SEED_FORCE=true
 *  - SEED_FORCE=true         → limpa tudo e recria do zero
 */
export function seedInfracoesDev(): void {
  // 1. Guarda de produção
  if (process.env.NODE_ENV === 'production') {
    return
  }

  const force = process.env.SEED_FORCE === 'true'

  // 2. Se forçar, limpa tudo antes
  if (force) {
    db.prepare('DELETE FROM infracoes').run()
    console.log('[Seed] SEED_FORCE=true → tabela infracoes limpa.')
  } else {
    // 3. Se não forçar e já existir dado, sai silenciosamente
    const total = contarInfracoes()
    if (total > 0) {
      console.log(
        `[Seed] Tabela infracoes já possui ${total} registro(s). ` +
          `Use SEED_FORCE=true para recriar.`
      )
      return
    }
  }

  // 4. Popula
  const resultado = gerarInfracoesMock({ quantidade: 18 })
  console.log(
    `[Seed] ${resultado.total} infrações mock criadas (` +
      Object.entries(resultado.resumo)
        .filter(([, n]) => n > 0)
        .map(([s, n]) => `${s}: ${n}`)
        .join(' · ') +
      `)`
  )
}