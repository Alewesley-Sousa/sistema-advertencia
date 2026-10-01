/**
 * @fileoverview Agendador de tarefas automatizadas (Cron Jobs).
 * 
 * Finalidade:
 * Executar periodicamente a busca/sincronização de infrações da API Wialon
 * e a consolidação de ofícios pendentes a cada 1 hora.
 */

import cron from 'node-cron'
import { consolidarInfracoesPendentes } from '../domains/infracoes/services/consolidaçãoService'
import { sincronizarInfracoesWialon } from '../domains/wialon/services/wialonSyncService'

export function iniciarCronJobs(): void {
  console.log('[CronJob] Agendador de tarefas inicializado.')

  // Expressão Cron: '0 * * * *' = Executa no minuto 0 de cada hora (ex: 01:00, 02:00, 03:00)
  cron.schedule('0 * * * *', async () => {
    const dataHoraAtual = new Date().toLocaleString('pt-BR')
    console.log(`\n[CronJob - ${dataHoraAtual}] ⏰ Executando rotina horária...`)

    try {
      // 1. Opcional: Sincronizar dados da API Wialon
       console.log('[CronJob] Sincronizando infrações com a API Wialon...')
       await sincronizarInfracoesWialon()

      // 2. Consolidar infrações pendentes em ofícios
      console.log('[CronJob] Iniciando consolidação de infrações e ofícios...')
      await consolidarInfracoesPendentes()

      console.log(`[CronJob - ${dataHoraAtual}] ✅ Rotina concluída com sucesso!`)
    } catch (error: any) {
      console.error(`[CronJob Error - ${dataHoraAtual}] Erro ao executar tarefa:`, error?.message || error)
    }
  })
}