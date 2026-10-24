import axios from 'axios'

interface ApiErrorResponse {
  error?: { message?: string }
  message?: string
}

const apiUrl = (import.meta.env?.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')
let unauthorizedHandler: (() => void) | null = null

export const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
  withCredentials: true,
})

// Une réponse 401 hors /api/auth signifie que la session a expiré ou a été révoquée.
apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (
    axios.isAxiosError(error)
    && error.response?.status === 401
    && !error.config?.url?.startsWith('/api/auth/')
  ) {
    unauthorizedHandler?.()
  }

  return Promise.reject(error)
})

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export function toRequestError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const apiMessage = error.response?.data?.error?.message ?? error.response?.data?.message

    if (apiMessage) {
      return new Error(apiMessage)
    }

    if (!error.response) {
      return new Error('Impossible de joindre le serveur. Vérifiez que le backend est démarré.')
    }
  }

  return new Error(fallback)
}
