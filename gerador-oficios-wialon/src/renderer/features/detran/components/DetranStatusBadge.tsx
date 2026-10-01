// src/renderer/features/detran/components/DetranStatusBadge.tsx

import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { Badge, type BadgeVariant } from '../../../components/ui/Badge'

interface DetranStatusBadgeProps {
  status: string
}

interface StatusConfig {
  variant: BadgeVariant
  label: string
  Icon: typeof CheckCircle2
  iconClass: string
}

function getConfig(status: string): StatusConfig {
  switch (status) {
    case 'QUITADO':
      return {
        variant: 'success',
        label: 'Quitado / Sem Multas',
        Icon: CheckCircle2,
        iconClass: 'w-3.5 h-3.5',
      }
    case 'COM_DEBITO':
      return {
        variant: 'warning',
        label: 'Com Multas',
        Icon: AlertTriangle,
        iconClass: 'w-3.5 h-3.5',
      }
    case 'PROCESSANDO':
    case 'PENDENTE':
      return {
        variant: 'petrol',
        label: 'Em Processamento',
        Icon: Clock,
        iconClass: 'w-3.5 h-3.5 animate-spin',
      }
    case 'ERRO':
    default:
      return {
        variant: 'danger',
        label: 'Erro na Consulta',
        Icon: AlertTriangle,
        iconClass: 'w-3.5 h-3.5',
      }
  }
}

export function DetranStatusBadge({ status }: DetranStatusBadgeProps) {
  const { variant, label, Icon, iconClass } = getConfig(status)

  return (
    <Badge variant={variant}>
      <Icon className={iconClass} />
      {label}
    </Badge>
  )
}