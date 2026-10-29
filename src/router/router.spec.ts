import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { fetchCurrentAccount } from '../services/authService'
import { createAppRouter } from '.'
import { safeRedirect } from './redirect'

vi.mock('../services/authService', () => ({
  fetchCurrentAccount: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

const mockFetchCurrentAccount = vi.mocked(fetchCurrentAccount)
const account = { id: 1, name: 'Admin', email: 'admin@example.com' }

async function navigate(path: string) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  return router.currentRoute.value
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth().forgetSession()
})

describe('navigation guard', () => {
  it('redirige vers /login sans session', async () => {
    mockFetchCurrentAccount.mockResolvedValue(null)

    const route = await navigate('/')

    expect(route.name).toBe('login')
    expect(route.query).toEqual({})
  })

  it('conserve la page demandée dans ?redirect', async () => {
    mockFetchCurrentAccount.mockResolvedValue(null)

    expect((await navigate('/?tab=1')).query).toEqual({ redirect: '/?tab=1' })
  })

  it('ouvre le dashboard avec une session valide', async () => {
    mockFetchCurrentAccount.mockResolvedValue(account)

    expect((await navigate('/')).name).toBe('dashboard')
    expect(useAuth().account.value).toEqual(account)
  })

  it('renvoie vers le dashboard un utilisateur connecté qui ouvre /login ou /register', async () => {
    mockFetchCurrentAccount.mockResolvedValue(account)

    expect((await navigate('/login')).name).toBe('dashboard')
    useAuth().forgetSession()
    expect((await navigate('/register')).name).toBe('dashboard')
  })

  it('considère un backend injoignable comme « non connecté »', async () => {
    mockFetchCurrentAccount.mockRejectedValue(new Error('network'))

    expect((await navigate('/')).name).toBe('login')
  })

  it('ne vérifie la session qu’une fois pour plusieurs navigations', async () => {
    mockFetchCurrentAccount.mockResolvedValue(account)
    const router = createAppRouter(createMemoryHistory())

    await router.push('/')
    await router.push('/login')
    await router.push('/')

    expect(mockFetchCurrentAccount).toHaveBeenCalledOnce()
  })

  it('redirige une route inconnue vers le dashboard (donc vers /login sans session)', async () => {
    mockFetchCurrentAccount.mockResolvedValue(null)

    expect((await navigate('/inconnue')).name).toBe('login')
  })

  it('réserve l’onglet Comptabilité aux utilisateurs connectés', async () => {
    mockFetchCurrentAccount.mockResolvedValue(null)

    const route = await navigate('/comptabilite')

    expect(route.name).toBe('login')
    expect(route.query).toEqual({ redirect: '/comptabilite' })
  })

  it('ouvre l’onglet Comptabilité avec une session valide', async () => {
    mockFetchCurrentAccount.mockResolvedValue(account)

    const route = await navigate('/comptabilite')

    expect(route.name).toBe('comptabilite')
    expect(document.title).toBe('Comptabilité · Gestion Utilisateurs')
  })

  it('bloque de nouveau le dashboard après clearSession (session expirée)', async () => {
    mockFetchCurrentAccount.mockResolvedValue(account)
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')

    useAuth().clearSession()
    await router.push('/login')
    await router.push('/')

    expect(router.currentRoute.value.name).toBe('login')
  })
})

describe('safeRedirect', () => {
  it.each([
    ['/', '/'],
    ['/?page=2', '/?page=2'],
    ['//evil.example', '/'],
    ['https://evil.example', '/'],
    [undefined, '/'],
    [['/a'], '/'],
  ])('%o → %s', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected)
  })
})
