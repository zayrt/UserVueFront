import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { createAppRouter } from '../router'
import { fetchCurrentAccount, login, register } from '../services/authService'
import LoginView from './LoginView.vue'
import RegisterView from './RegisterView.vue'

vi.mock('../services/authService', () => ({
  fetchCurrentAccount: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}))

const account = { id: 1, name: 'Admin', email: 'admin@example.com' }
const mockLogin = vi.mocked(login)
const mockRegister = vi.mocked(register)

async function mountAt(component: typeof LoginView | typeof RegisterView, path: string) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  const wrapper = mount(component, { global: { plugins: [router] } })
  return { wrapper, router }
}

async function fill(wrapper: ReturnType<typeof mount>, values: Record<string, string>) {
  for (const [selector, value] of Object.entries(values)) {
    await wrapper.get(selector).setValue(value)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth().forgetSession()
  vi.mocked(fetchCurrentAccount).mockResolvedValue(null)
  mockLogin.mockResolvedValue(account)
  mockRegister.mockResolvedValue(account)
})

describe('LoginView', () => {
  it('valide les champs sans appeler l’API', async () => {
    const { wrapper } = await mountAt(LoginView, '/login')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('L’adresse e-mail est obligatoire.')
    expect(wrapper.text()).toContain('Le mot de passe est obligatoire.')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('connecte puis ouvre la page demandée', async () => {
    const { wrapper, router } = await mountAt(LoginView, '/login?redirect=/%3Fpage%3D2')
    await fill(wrapper, { '#login-email': ' admin@example.com ', '#login-password': 'motdepasse-solide' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockLogin).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'motdepasse-solide' })
    expect(useAuth().isAuthenticated.value).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe('/?page=2')
  })

  it('ignore une redirection vers un site externe', async () => {
    const { wrapper, router } = await mountAt(LoginView, '/login?redirect=//evil.example')
    await fill(wrapper, { '#login-email': 'admin@example.com', '#login-password': 'motdepasse-solide' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('affiche l’erreur 401, vide le mot de passe et reste sur /login', async () => {
    mockLogin.mockRejectedValue(new Error('Email ou mot de passe incorrect.'))
    const { wrapper, router } = await mountAt(LoginView, '/login')
    await fill(wrapper, { '#login-email': 'admin@example.com', '#login-password': 'mauvais' })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Email ou mot de passe incorrect.')
    expect((wrapper.get('#login-password').element as HTMLInputElement).value).toBe('')
    expect(router.currentRoute.value.name).toBe('login')
    expect(useAuth().isAuthenticated.value).toBe(false)
  })

  it('prévient quand la session a expiré et propose l’inscription', async () => {
    const { wrapper } = await mountAt(LoginView, '/login?expired=1')

    expect(wrapper.text()).toContain('Votre session a expiré.')
    expect(wrapper.get('a').attributes('href')).toBe('/register')
  })
})

describe('RegisterView', () => {
  it.each([
    [{ '#register-name': '', '#register-email': 'a@example.com', '#register-password': 'motdepasse', '#register-confirmation': 'motdepasse' }, 'Le nom est obligatoire.'],
    [{ '#register-name': 'Admin', '#register-email': 'invalide', '#register-password': 'motdepasse', '#register-confirmation': 'motdepasse' }, 'adresse e-mail valide'],
    [{ '#register-name': 'Admin', '#register-email': 'a@example.com', '#register-password': 'court', '#register-confirmation': 'court' }, 'entre 8 et 72 caractères'],
    [{ '#register-name': 'Admin', '#register-email': 'a@example.com', '#register-password': 'motdepasse', '#register-confirmation': 'autre-chose' }, 'ne correspondent pas'],
  ])('refuse un formulaire invalide (%#)', async (values, message) => {
    const { wrapper } = await mountAt(RegisterView, '/register')
    await fill(wrapper, values)

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain(message)
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('crée le compte, ouvre la session et affiche le dashboard', async () => {
    const { wrapper, router } = await mountAt(RegisterView, '/register')
    await fill(wrapper, {
      '#register-name': ' Admin ',
      '#register-email': 'admin@example.com',
      '#register-password': 'motdepasse-solide',
      '#register-confirmation': 'motdepasse-solide',
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockRegister).toHaveBeenCalledWith({ name: 'Admin', email: 'admin@example.com', password: 'motdepasse-solide' })
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('affiche le conflit 409 sans quitter la page', async () => {
    mockRegister.mockRejectedValue(new Error('Un compte existe déjà avec cette adresse e-mail.'))
    const { wrapper, router } = await mountAt(RegisterView, '/register')
    await fill(wrapper, {
      '#register-name': 'Admin',
      '#register-email': 'admin@example.com',
      '#register-password': 'motdepasse-solide',
      '#register-confirmation': 'motdepasse-solide',
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Un compte existe déjà avec cette adresse e-mail.')
    expect(router.currentRoute.value.name).toBe('register')
  })
})
