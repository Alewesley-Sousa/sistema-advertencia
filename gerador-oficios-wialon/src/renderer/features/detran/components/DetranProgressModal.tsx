// src/renderer/features/detran/components/DetranProgressModal.tsx

import { Modal } from '../../../components/ui/Modal'
import { DetranProgressCard } from './DetranProgressCard'
import type { DetranProgresso } from '../types'

interface DetranProgressModalProps {
  open: boolean
  progresso: DetranProgresso | null
  onCancelar?: () => void
  onFechar: () => void
}

export function DetranProgressModal({
  open,
  progresso,
  onCancelar,
  onFechar,
}: DetranProgressModalProps) {
  if (!progresso) return null

  const terminou =
    progresso.status === 'CONCLUIDO' || progresso.status === 'CANCELADO'

  /**
   * Enquanto está rodando, ignoramos fechamentos externos (ESC, overlay, X)
   * pra evitar que o usuário feche sem querer no meio do processamento.
   */
  const handleClose = () => {
    if (!terminou) return
    onFechar()
  }

  return (
    <Modal open={open} onClose={handleClose} size="lg">
      <DetranProgressCard
        progresso={progresso}
        onCancelar={onCancelar}
        onFechar={terminou ? onFechar : undefined}
      />
    </Modal>
  )
}