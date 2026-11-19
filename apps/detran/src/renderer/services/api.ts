import { createApi } from '@force/shared/web/api'

// Cliente HTTP do app DETRAN-CE. VITE_API_URL sobrescreve a URL padrão da API local.
export const api = createApi(import.meta.env.VITE_API_URL || 'http://localhost:3334/api')
