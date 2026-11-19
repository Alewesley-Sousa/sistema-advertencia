import { createApi } from '@force/shared/web/api'

// Cliente HTTP do app Wialon. VITE_API_URL sobrescreve a URL padrão da API local.
export const api = createApi(import.meta.env.VITE_API_URL || 'http://localhost:3333/api')
