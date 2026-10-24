import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routerKey } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import { createUser, getUsers, type User } from '../services/userService'
import { getUsersGrowth } from '../services/statsService'
import { getUsersStats } from '../services/usersStatsService'
import UserCreateModal from './UserCreateModal.vue'

vi.mock('../services/userService', () => ({
  createUser: vi.fn(),
  getUsers: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))

vi.mock('../services/statsService', () => ({ getUsersGrowth: vi.fn() }))
vi.mock('../services/usersStatsService', () => ({ getUsersStats: vi.fn() }))

const createdUser: User = { id: 104, name: 'Karim', email: 'karim@example.com' }
function usersPage(data: User[], totalItems = data.length) {
  const totalPages = Math.ceil(totalItems / 10)
  return {
    data,
    pagination: {
      currentPage: 1,
      totalItems,
      totalPages,
    },
  }
}

const mockCreateUser = vi.mocked(createUser)
const mockGetUsers = vi.mocked(getUsers)
const mockGetUsersGrowth = vi.mocked(getUsersGrowth)
const mockGetUsersStats = vi.mocked(getUsersStats)
const mountedWrappers: Array<{ unmount: () => void }> = []

function mountModal() {
  const wrapper = mount(UserCreateModal, { attachTo: document.body })
  mountedWrappers.push(wrapper)
  return wrapper
}

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.body.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Élément introuvable : ${selector}`)
  }
  return element
}

async function fillField(id: string, value: string) {
  const input = getElement<HTMLInputElement>(`#${id}`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

async function submitForm() {
  getElement<HTMLFormElement>('.create-form').dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  )
  await flushPromises()
}

function makeRefreshStub(name: string, refresh: () => Promise<void>) {
  return defineComponent({
    name,
    setup(_props, { expose }) {
      expose({ refresh })
      return () => h('div')
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateUser.mockResolvedValue(createdUser)
  mockGetUsers.mockResolvedValue(usersPage([]))
  mockGetUsersGrowth.mockResolvedValue({ period: 7, timezone: 'Europe/Paris', data: [] })
  mockGetUsersStats.mockResolvedValue({ totalUsers: 0, modifiedUsers: 0, deletedUsers: 0, period: 7 })
})

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0).reverse()) {
    wrapper.unmount()
  }
  document.body.innerHTML = ''
})

describe('UserCreateModal', () => {
  it('affiche les champs Nom et Email et les boutons attendus', () => {
    mountModal()
    return nextTick().then(() => {
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
      expect(document.querySelector('label[for="create-user-name"]')?.textContent).toBe('Nom')
      expect(document.querySelector('label[for="create-user-email"]')?.textContent).toBe('Email')
      expect(document.body.textContent).toContain('Annuler')
      expect(document.body.textContent).toContain('Enregistrer')
      expect(document.activeElement).toBe(getElement('#create-user-name'))
    })
  })

  it('signale un nom vide sans appeler l’API', async () => {
    mountModal()
    await fillField('create-user-email', 'karim@example.com')
    await submitForm()

    expect(document.body.textContent).toContain('Le nom est obligatoire.')
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('signale un email invalide sans appeler l’API', async () => {
    mountModal()
    await fillField('create-user-name', 'Karim')
    await fillField('create-user-email', 'email-invalide')
    await submitForm()

    expect(document.body.textContent).toContain('Saisissez une adresse e-mail valide.')
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('envoie les valeurs normalisées, émet created et se ferme via son parent', async () => {
    const created = vi.fn()
    const closed = vi.fn()
    const Parent = defineComponent({
      setup() {
        const open = ref(true)
        return () => open.value
          ? h(UserCreateModal, {
              onCreated: (user: User) => {
                created(user)
                open.value = false
              },
              onClose: () => {
                closed()
                open.value = false
              },
            })
          : h('p', { class: 'closed' }, 'Modal fermée')
      },
    })
    const wrapper = mount(Parent, { attachTo: document.body })
    mountedWrappers.push(wrapper)

    await fillField('create-user-name', '  Karim  ')
    await fillField('create-user-email', '  karim@example.com  ')
    await submitForm()

    expect(mockCreateUser).toHaveBeenCalledWith({ name: 'Karim', email: 'karim@example.com' })
    expect(created).toHaveBeenCalledWith(createdUser)
    expect(document.querySelector('.create-modal')).toBeNull()
    expect(document.body.textContent).toContain('Modal fermée')
    expect(closed).not.toHaveBeenCalled()
  })

  it('conserve les champs et la modal si l’API échoue en 500', async () => {
    mockCreateUser.mockRejectedValue(new Error('Une erreur interne est survenue.'))
    mountModal()
    await fillField('create-user-name', 'Karim')
    await fillField('create-user-email', 'karim@example.com')
    await submitForm()

    expect(document.body.textContent).toContain('Une erreur interne est survenue.')
    expect(getElement<HTMLInputElement>('#create-user-name').value).toBe('Karim')
    expect(getElement<HTMLInputElement>('#create-user-email').value).toBe('karim@example.com')
    expect(document.querySelector('.create-modal')).not.toBeNull()
  })

  it('affiche le conflit HTTP 409 pour un email déjà utilisé', async () => {
    mockCreateUser.mockRejectedValue(new Error('Cette adresse e-mail est déjà utilisée.'))
    mountModal()
    await fillField('create-user-name', 'Karim')
    await fillField('create-user-email', 'karim@example.com')
    await submitForm()

    expect(document.body.textContent).toContain('Cette adresse e-mail est déjà utilisée.')
    expect(document.querySelector('.create-modal')).not.toBeNull()
  })

  it('désactive Enregistrer et ignore les doubles soumissions', async () => {
    let resolveRequest!: (user: User) => void
    mockCreateUser.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    mountModal()
    await fillField('create-user-name', 'Karim')
    await fillField('create-user-email', 'karim@example.com')

    getElement<HTMLFormElement>('.create-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await nextTick()
    expect(getElement<HTMLButtonElement>('.save-button').disabled).toBe(true)

    getElement<HTMLFormElement>('.create-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await nextTick()
    expect(mockCreateUser).toHaveBeenCalledTimes(1)

    resolveRequest(createdUser)
    await flushPromises()
  })

  it('annule sans envoyer de requête', async () => {
    const wrapper = mountModal()
    getElement<HTMLButtonElement>('.cancel-button').click()
    await nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('ferme la modal avec Échap', async () => {
    const wrapper = mountModal()
    getElement<HTMLElement>('.create-modal').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    await nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('rafraîchit le tableau, les cards et le graphique après la création', async () => {
    const statsRefresh = vi.fn().mockResolvedValue(undefined)
    const growthRefresh = vi.fn().mockResolvedValue(undefined)
    mockGetUsers
      .mockResolvedValueOnce(usersPage([]))
      .mockResolvedValueOnce(usersPage([createdUser]))

    const wrapper = mount(DashboardView, {
      attachTo: document.body,
      global: {
        provide: { [routerKey as symbol]: { replace: vi.fn() } },
        stubs: {
          UsersStatsCards: makeRefreshStub('UsersStatsCards', statsRefresh),
          UsersGrowthChart: makeRefreshStub('UsersGrowthChart', growthRefresh),
        },
      },
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    await wrapper.get('.create-button').trigger('click')
    await fillField('create-user-name', 'Karim')
    await fillField('create-user-email', 'karim@example.com')
    await submitForm()

    expect(wrapper.text()).toContain('Karim a été créé avec succès.')
    expect(wrapper.find('.user-row').text()).toContain('Karim')
    expect(mockGetUsers).toHaveBeenCalledTimes(2)
    expect(statsRefresh).toHaveBeenCalledOnce()
    expect(growthRefresh).toHaveBeenCalledOnce()
    expect(document.querySelector('.create-modal')).toBeNull()
  })
})
