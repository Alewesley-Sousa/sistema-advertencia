import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { WialonTaskMessage, parseWialonMessage } from '../services/wialon'
import { infracaoRepository } from '../repositories/infracaoRepository'
import { obterEnderecoPorCoordenadas } from '../services/geocoding'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Lista de motoristas para o mock
const MOTORISTAS_MOCK = [
  'João Silva',
  'Maria Santos',
  'Carlos Oliveira',
  'Ana Souza',
  'Pedro Lima',
  'Fernanda Costa',
  'Lucas Pereira',
  'Beatriz Rodrigues',
  'Gabriel Alves',
  'Juliana Ferreira'
]

// Mapeia cada placa para o seu respectivo condutor (Garante placa igual -> mesmo motorista)
const mapaPlacaCondutor = new Map<string, string>()

function obterOuAtribuirCondutor(placa: string): string {
  const placaUpper = placa.toUpperCase().trim()

  if (mapaPlacaCondutor.has(placaUpper)) {
    return mapaPlacaCondutor.get(placaUpper)!
  }

  // Pega um motorista aleatório da lista caso a placa seja nova
  const motoristaAleatorio = MOTORISTAS_MOCK[Math.floor(Math.random() * MOTORISTAS_MOCK.length)]
  mapaPlacaCondutor.set(placaUpper, motoristaAleatorio)

  return motoristaAleatorio
}

export async function testarWebhookMock(): Promise<void> {
  console.log('[Mock Test] Iniciando teste com lote de dados...')

  const jsonPath = path.join(__dirname, 'dados_teste.json')
  let listaPayloads: WialonTaskMessage[] = []

  if (fs.existsSync(jsonPath)) {
    try {
      const rawData = fs.readFileSync(jsonPath, 'utf-8')
      listaPayloads = JSON.parse(rawData)
      console.log(`[Mock Test] ✅ ${listaPayloads.length} registros carregados do JSON.`)
    } catch (err: any) {
      console.error('[Mock Test Error] Erro ao abrir JSON:', err?.message)
      return
    }
  } else {
    console.log('[Mock Test] ⚠️ Arquivo JSON não encontrado.')
    return
  }

  let inseridosCount = 0

  for (let i = 0; i < listaPayloads.length; i++) {
    const wialonMockPayload = listaPayloads[i]

    try {
      const infracao = parseWialonMessage(wialonMockPayload)

      if (!infracao || !infracao.placa) {
        console.warn(`[Mock Test Skip] Item ${i} descartado: dados insuficientes.`)
        continue
      }

      // Garante a atribuição de condutor consistente por placa
      const condutorConsistente = obterOuAtribuirCondutor(infracao.placa)

      let endereco = 'Endereço de teste'
      try {
        endereco = await obterEnderecoPorCoordenadas(
          infracao.latitude ?? undefined,
          infracao.longitude ?? undefined
        )
      } catch {
        // Fallback para falha de geocoding
      }

      const result = infracaoRepository.salvar({
        task_id: infracao.task_id,
        item_id: infracao.item_id,
        placa: infracao.placa,
        condutor: condutorConsistente, // Utiliza o condutor mapeado
        velocidade: infracao.velocidade,
        limite_via: infracao.limite_via,
        latitude: infracao.latitude,
        longitude: infracao.longitude,
        endereco,
        data_evento_wialon: infracao.data_evento_wialon,
        status: 'REGISTRADO'
      })

      if (result.changes === 0) {
        console.warn(`[Mock Test Ignorado] Item index ${i} (task_id: ${infracao.task_id}) foi ignorado pelo banco.`)
        continue
      }

      inseridosCount++
      console.log(`[Mock Test] ✅ Inserido de fato no BD [${inseridosCount}/${listaPayloads.length}]:`, {
        infracao_id: Number(result.lastInsertRowid),
        task_id: infracao.task_id,
        placa: infracao.placa,
        condutor: condutorConsistente,
        data_evento: infracao.data_evento_wialon
      })
    } catch (error: any) {
      console.error(`[Mock Test Error] Falha na inserção do item ${i}:`, error?.message || error)
    }
  }

  console.log(`[Mock Test Concluído] ${inseridosCount} registros inseridos com sucesso no SQLite.`)
}