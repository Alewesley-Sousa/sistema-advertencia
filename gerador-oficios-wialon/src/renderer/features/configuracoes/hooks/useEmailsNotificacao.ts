// src/renderer/features/configuracoes/hooks/useEmailsNotificacao.ts

import { useCallback, useEffect, useState } from 'react'
import {
  salvarConfiguracao,
  type Configuracao,
} from '../../../features/configuracoes/services/configuracoes'
import { showToast } from '../../../components/ui/Toast'

const CHAVE_EMAIL = 'email_notificacao'

interface UseEmailsNotificacaoOptions {
  configs: Configuracao[]
  recarregarConfigs: () => Promise<void> | void
}

export function useEmailsNotificacao({
  configs,
  recarregarConfigs,
}: UseEmailsNotificacaoOptions) {
  const [emails, setEmails] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const lista = Array.isArray(configs) ? configs : []
    const configEmail = lista.find((c) => c.chave === CHAVE_EMAIL)

    if (configEmail?.valor) {
      setEmails(
        configEmail.valor
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean)
      )
    } else {
      setEmails([])
    }
  }, [configs])

  const persistir = useCallback(
    async (novaLista: string[]) => {
      setSalvando(true)
      const toastId = showToast.loading('Salvando destinatários...')

      try {
        await salvarConfiguracao(CHAVE_EMAIL, novaLista.join(', '))
        await recarregarConfigs()

        showToast.dismiss(toastId)
        showToast.success('Destinatários salvos com sucesso!')
      } catch (error: any) {
        console.error('[useEmailsNotificacao] Erro ao salvar:', error)

        showToast.dismiss(toastId)
        showToast.error(error.message || 'Falha ao salvar as alterações.')
      } finally {
        setSalvando(false)
      }
    },
    [recarregarConfigs]
  )

  const adicionar = useCallback(
    (emailBruto: string): boolean => {
      const email = emailBruto.trim().toLowerCase()

      if (!email) return false

      if (!email.includes('@') || !email.includes('.')) {
        showToast.error('Por favor, informe um e-mail válido.')
        return false
      }

      if (emails.includes(email)) {
        showToast.error('Este e-mail já está cadastrado.')
        return false
      }

      const novaLista = [...emails, email]
      setEmails(novaLista)
      persistir(novaLista)
      return true
    },
    [emails, persistir]
  )

  /* ═══ NOVO ═══
     Atualização atômica: mapeia a lista uma única vez e persiste
     uma única vez. Evita o race condition de "remover + adicionar"
     sequenciais, que capturariam closures diferentes de `emails`. */
  const editar = useCallback(
    (emailOriginal: string, emailNovoBruto: string): boolean => {
      const emailNovo = emailNovoBruto.trim().toLowerCase()

      if (!emailNovo) return false

      if (!emailNovo.includes('@') || !emailNovo.includes('.')) {
        showToast.error('Por favor, informe um e-mail válido.')
        return false
      }

      // Mesmo endereço após normalização — nada a fazer.
      if (emailNovo === emailOriginal) return true

      if (emails.includes(emailNovo)) {
        showToast.error('Este e-mail já está cadastrado.')
        return false
      }

      const novaLista = emails.map((e) =>
        e === emailOriginal ? emailNovo : e
      )
      setEmails(novaLista)
      persistir(novaLista)
      return true
    },
    [emails, persistir]
  )

  const remover = useCallback(
    (email: string) => {
      const novaLista = emails.filter((e) => e !== email)
      setEmails(novaLista)
      persistir(novaLista)
    },
    [emails, persistir]
  )

  return { emails, salvando, adicionar, editar, remover }
}