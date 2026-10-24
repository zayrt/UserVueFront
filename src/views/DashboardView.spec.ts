import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { useAuth } from '../composables/useAuth'
import { createAppRouter } from '../router'
import { fetchCurrentAccount, logout } from '../services/authService'

vi.mock('../services/authService', () => ({
  fetchCurrentAccount: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

const account = { id: 1, name: 'Admin', email: 'admin@example.com' }
const mockLogout = vi.mocked(logout)
const stub = (name: string) => defineComponent({ name, setup: (_props, { expose }) => {
  expose({ refresh: vi.fn() })
  return () => h('div', { class: name })
} })

async function mountDashboard() {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/')
  const wrapper = mount(App, {
    global: {
      plugins: [router],
      stubs: {
        UsersStatsCards: stub('UsersStatsCards'),
        UsersGrowthChart: stub('UsersGrowthChart'),
        UsersList: stub('UsersList'),
      },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth().forgetSession()
  vi.mocked(fetchCurrentAccount).mockResolvedValue(account)
  mockLogout.mockResolvedValue(undefined)
})

describe('DashboardView', () => {
  it('affiche les cards, le graphe, le tableau et le compte connecté', async () => {
    const { wrapper } = await mountDashboard()

    expect(wrapper.get('h1').text()).toBe('Tableau de bord')
    expect(wrapper.get('.account-name').text()).toBe('Admin')
    for (const name of ['UsersStatsCards', 'UsersGrowthChart', 'UsersList']) {
      expect(wrapper.find(`.${name}`).exists()).toBe(true)
    }
  })

  it('déconnecte puis affiche la page de connexion', async () => {
    const { wrapper, router } = await mountDashboard()

    await wrapper.get('.logout-button').trigger('click')
    await flushPromises()

    expect(mockLogout).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('login')
    expect(useAuth().isAuthenticated.value).toBe(false)
    expect(wrapper.find('#login-email').exists()).toBe(true)

    await router.push('/')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('reste sur le dashboard et affiche l’erreur si la déconnexion échoue', async () => {
    mockLogout.mockRejectedValue(new Error('Impossible de joindre le serveur.'))
    const { wrapper, router } = await mountDashboard()

    await wrapper.get('.logout-button').trigger('click')
    await flushPromises()

    expect(wrapper.get('.logout-error').text()).toBe('Impossible de joindre le serveur.')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('n’affiche pas le dashboard sans session', async () => {
    vi.mocked(fetchCurrentAccount).mockResolvedValue(null)
    const { wrapper, router } = await mountDashboard()

    expect(router.currentRoute.value.name).toBe('login')
    expect(wrapper.find('.UsersList').exists()).toBe(false)
  })
})
