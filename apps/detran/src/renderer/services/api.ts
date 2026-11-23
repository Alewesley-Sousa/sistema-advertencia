import { createApi } from '../shared/api/createApi'

// Cliente HTTP do app DETRAN-CE. VITE_API_URL sobrescreve a URL padrão da API local.
export const api = createApi(
  import.meta.env.VITE_API_URL ||
    // Build de produção: a interface é servida pelo próprio backend, então '/api' funciona de qualquer PC.
    (import.meta.env.PROD ? '/api' : 'http://localhost:3334/api')
)
