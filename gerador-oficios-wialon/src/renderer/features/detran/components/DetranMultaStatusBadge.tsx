// src/renderer/features/detran/components/DetranMultaStatusBadge.tsx

import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { Badge, type BadgeVariant } from '../../../components/ui/Badge'
import type { MultaDetran } from '../../../services/detran'

interface DetranMultaStatusBadgeProps {
  multa: MultaDetran
}

interface StatusConfig {
  variant: BadgeVariant
  label: string
  Icon: typeof CheckCircle2
  iconClass: string
  title?: string
}

function getConfig(multa: MultaDetran): StatusConfig {
  // 1) DETRAN recusou emitir o boleto
  if (multa.erroEmissao) {
    return {
      variant: 'danger',
      label: 'Não emitido',
      Icon: AlertTriangle,
      iconClass: 'w-3.5 h-3.5',
      title: multa.erroEmissao,
    }
  }

  // 2) Boleto baixado agora (tem caminhoPdf e não é jaBaixada)
  if (multa.caminhoPdf && !multa.jaBaixada) {
    return {
      variant: 'success',
      label: 'Boleto baixado',
      Icon: CheckCircle2,
      iconClass: 'w-3.5 h-3.5',
    }
  }

  // 3) Já baixada em execução anterior
  if (multa.jaBaixada) {
    return {
      variant: 'neutral',
      label: 'Já baixada',
      Icon: CheckCircle2,
      iconClass: 'w-3.5 h-3.5',
      title: 'Este boleto já foi baixado em uma consulta anterior.',
    }
  }

  // 4) Não baixada ainda (não deveria acontecer, mas fica seguro)
  return {
    variant: 'info',
    label: 'Pendente',
    Icon: Clock,
    iconClass: 'w-3.5 h-3.5',
  }
}

export function DetranMultaStatusBadge({ multa }: DetranMultaStatusBadgeProps) {
  const { variant, label, Icon, iconClass, title } = getConfig(multa)

  return (
    <Badge variant={variant} title={title}>
      <Icon className={iconClass} />
      {label}
    </Badge>
  )
}