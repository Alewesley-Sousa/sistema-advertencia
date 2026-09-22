import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:3333/api',
  timeout: 30000,
})

// Remove params vazios
api.interceptors.request.use((config) => {
  if (config.params) {
    Object.keys(config.params).forEach((key) => {
      if (config.params[key] === '' || config.params[key] === undefined) {
        delete config.params[key]
      }
    })
  }
  return config
})

// ---------------------------------------------------------------------------
// Interceptor de resposta: desembrulha { success, data, meta } → { data, meta }
// e joga erros do backend como Error normal do JS com mensagem legível.
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    const body = response.data

    // Se não tem o envelope esperado, devolve como veio
    if (!body || typeof body !== 'object' || !('success' in body)) {
      return response
    }

    if (body.success === false) {
      const message = body.error?.message || 'Erro desconhecido na API'
      const code = body.error?.code || 'API_ERROR'
      const err: any = new Error(message)
      err.code = code
      err.details = body.error?.details
      return Promise.reject(err)
    }

    // Sucesso → devolve só o conteúdo útil
    // response.data passa a ser o payload já desembrulhado
    response.data = body.data
    // expõe meta num campo próprio pra ficar acessível
    ;(response as any).meta = body.meta
    return response
  },
  (error) => {
    // Erro de rede / HTTP 4xx / 5xx
    const backendError = error?.response?.data?.error
    if (backendError) {
      const err: any = new Error(backendError.message || 'Erro na requisição')
      err.code = backendError.code
      err.details = backendError.details
      err.status = error.response.status
      return Promise.reject(err)
    }
    return Promise.reject(error)
  }
)