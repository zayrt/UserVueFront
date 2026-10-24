import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, onUnauthorized } from './api'

function respondWith(status: number): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    const response = { status, statusText: '', headers: {}, config, data: { error: { message: 'Authentification requise.' } } }
    if (status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response)
    }
    return response
  }
}

afterEach(() => {
  onUnauthorized(null)
})

describe('apiClient', () => {
  it('envoie les cookies de session (withCredentials)', () => {
    expect(apiClient.defaults.withCredentials).toBe(true)
  })

  it('signale une session expirée sur un 401 d’une route métier', async () => {
    const handler = vi.fn()
    onUnauthorized(handler)

    await expect(apiClient.get('/api/users', { adapter: respondWith(401) })).rejects.toBeInstanceOf(AxiosError)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('ignore les 401 de /api/auth (identifiants invalides, session absente)', async () => {
    const handler = vi.fn()
    onUnauthorized(handler)

    await expect(apiClient.post('/api/auth/login', {}, { adapter: respondWith(401) })).rejects.toBeInstanceOf(AxiosError)
    await expect(apiClient.get('/api/auth/me', { adapter: respondWith(401) })).rejects.toBeInstanceOf(AxiosError)
    expect(handler).not.toHaveBeenCalled()
  })

  it('n’appelle pas le handler pour les autres erreurs', async () => {
    const handler = vi.fn()
    onUnauthorized(handler)

    await expect(apiClient.get('/api/users', { adapter: respondWith(500) })).rejects.toBeInstanceOf(AxiosError)
    await expect(apiClient.get('/api/users', { adapter: respondWith(200) })).resolves.toMatchObject({ status: 200 })
    expect(handler).not.toHaveBeenCalled()
  })
})
