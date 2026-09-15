export interface WialonWebhookPayload {
  task_id?: string
  item_id?: number
  placa: string
  condutor?: string
  velocidade: number
  limite_via: number
  timestamp?: string
  latitude?: number
  longitude?: number
}