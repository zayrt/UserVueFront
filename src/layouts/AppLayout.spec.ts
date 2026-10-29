import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { useAuth } from '../composables/useAuth'
import { createAppRouter } from '../router'
import { fetchCurrentAccount } from '../services/authService'

vi.mock('../services/authService', () => ({
  fetchCurrentAccount: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

// Les pages du module restent en chargement : seul le shell est testé ici.
vi.mock('../services/comptabiliteService', () => ({
  getBalance: vi.fn(() => new Promise(() => {})),
  getJournal: vi.fn(() => new Promise(() => {})),
}))

const stub = (name: string) => defineComponent({ name, setup: (_props, { expose }) => {
  expose({ refresh: vi.fn() })
  return () => h('div', { class: name })
} })

async function mountAt(path: string) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  const wrapper = mount(App, {
    global: {
      plugins: [router],
      stubs: Object.fromEntries([
        'UsersStatsCards', 'UsersGrowthChart', 'UsersList', 'EcrituresImport', 'BalanceTable', 'LettragePanel',
      ].map((name) => [name, stub(name)])),
    },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth().forgetSession()
  vi.mocked(fetchCurrentAccount).mockResolvedValue({ id: 1, name: 'Admin', email: 'admin@example.com' })
})

describe('onglets', () => {
  it('affiche « Gestion utilisateur » et « Comptabilité », le premier actif sur /', async () => {
    const { wrapper } = await mountAt('/')
    const tabs = wrapper.findAll('.app-tab')

    expect(tabs.map((tab) => tab.text())).toEqual(['Gestion utilisateur', 'Comptabilité'])
    expect(tabs.map((tab) => tab.attributes('href'))).toEqual(['/', '/comptabilite'])
    expect(tabs[0].attributes('aria-current')).toBe('page')
    expect(tabs[1].attributes('aria-current')).toBeUndefined()
  })

  it('passe d’un onglet à l’autre sans perdre l’en-tête de session', async () => {
    const { wrapper, router } = await mountAt('/')

    await wrapper.findAll('.app-tab')[1].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('comptabilite')
    expect(wrapper.get('h1').text()).toBe('Tableau de bord')
    expect(wrapper.findAll('.compta-nav-link').map((link) => link.text())).toEqual(['Tableau de bord', 'Écritures', 'Balance', 'Lettrage'])
    expect(wrapper.find('.UsersList').exists()).toBe(false)
    expect(wrapper.findAll('.app-tab')[1].attributes('aria-current')).toBe('page')
    expect(wrapper.get('.account-name').text()).toBe('Admin')

    await wrapper.findAll('.app-tab')[0].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(wrapper.find('.UsersList').exists()).toBe(true)
  })

  it('garde l’onglet Comptabilité actif sur les sous-pages du module', async () => {
    const { wrapper } = await mountAt('/comptabilite/lettrage')
    const tabs = wrapper.findAll('.app-tab')

    expect(tabs[1].classes()).toContain('active')
    expect(tabs[0].classes()).not.toContain('active')
    expect(wrapper.get('.compta-nav-link.active').text()).toBe('Lettrage')
    expect(wrapper.get('.app-header').classes()).toContain('wide')
  })
})
