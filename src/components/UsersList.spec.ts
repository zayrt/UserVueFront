import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UsersList from './UsersList.vue'
import { createUser, deleteUser, getUsers, updateUser, type User } from '../services/userService'

const services = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  getUsers: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../services/userService', () => services)

const testUser: User = { id: 104, name: 'Test User', email: 'test@example.com' }
function usersPage(data: User[], currentPage = 1, totalItems = data.length, totalPages = Math.ceil(totalItems / 10)) {
  return {
    data,
    pagination: {
      currentPage,
      totalItems,
      totalPages,
    },
  }
}

const mockCreateUser = vi.mocked(createUser)
const mockDeleteUser = vi.mocked(deleteUser)
const mockGetUsers = vi.mocked(getUsers)
const mockUpdateUser = vi.mocked(updateUser)

const CreateModalStub = defineComponent({
  name: 'UserCreateModal',
  emits: ['close', 'created'],
  setup(_props, { emit }) {
    return () => h('button', {
      class: 'mock-created',
      onClick: () => emit('created', testUser),
    }, 'Create successfully')
  },
})

const EditModalStub = defineComponent({
  name: 'UserEditModal',
  emits: ['close', 'saved'],
  setup(_props, { emit }) {
    return () => h('button', {
      class: 'mock-saved',
      onClick: () => emit('saved', testUser),
    }, 'Update successfully')
  },
})

const DeleteModalStub = defineComponent({
  name: 'UserDeleteModal',
  emits: ['close', 'confirm'],
  setup(_props, { emit }) {
    return () => h('button', {
      class: 'mock-confirm-delete',
      onClick: () => emit('confirm'),
    }, 'Confirm deletion')
  },
})

function mountUsersList() {
  return mount(UsersList, {
    global: {
      stubs: {
        UserCreateModal: CreateModalStub,
        UserEditModal: EditModalStub,
        UserDeleteModal: DeleteModalStub,
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateUser.mockResolvedValue(testUser)
  mockDeleteUser.mockResolvedValue(undefined)
  mockGetUsers.mockResolvedValue(usersPage([testUser]))
  mockUpdateUser.mockResolvedValue(testUser)
})

describe('UsersList statistics refresh events', () => {
  it('emits statsChanged after successful creation and refreshes the table', async () => {
    mockGetUsers
      .mockResolvedValueOnce(usersPage([]))
      .mockResolvedValueOnce(usersPage([testUser]))
    const wrapper = mountUsersList()
    await flushPromises()

    await wrapper.get('.create-button').trigger('click')
    await wrapper.get('.mock-created').trigger('click')
    await flushPromises()

    expect(mockCreateUser).not.toHaveBeenCalled()
    expect(mockGetUsers).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('statsChanged')).toHaveLength(1)
    expect(wrapper.text()).toContain('Test User a été créé avec succès.')
    expect(wrapper.find('.create-modal').exists()).toBe(false)
  })

  it('emits statsChanged after successful modification', async () => {
    const wrapper = mountUsersList()
    await flushPromises()

    await wrapper.get('.user-row').trigger('click')
    await wrapper.get('.mock-saved').trigger('click')
    await flushPromises()

    expect(mockGetUsers).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('statsChanged')).toHaveLength(1)
    expect(wrapper.text()).toContain('Test User a été modifié avec succès.')
  })

  it('emits statsChanged only after successful deletion', async () => {
    const wrapper = mountUsersList()
    await flushPromises()

    await wrapper.get('.delete-row-button').trigger('click')
    await wrapper.get('.mock-confirm-delete').trigger('click')
    await flushPromises()

    expect(mockDeleteUser).toHaveBeenCalledWith(testUser.id)
    expect(mockGetUsers).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('deleted')).toHaveLength(1)
    expect(wrapper.emitted('statsChanged')).toHaveLength(1)
  })

  it('does not refresh statistics when deletion fails', async () => {
    mockDeleteUser.mockRejectedValue(new Error('delete failed'))
    const wrapper = mountUsersList()
    await flushPromises()

    await wrapper.get('.delete-row-button').trigger('click')
    await wrapper.get('.mock-confirm-delete').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('statsChanged')).toBeUndefined()
  })
})

describe('UsersList avatars', () => {
  it('affiche la miniature Cloudinary ou les initiales, puis les initiales si l’image échoue', async () => {
    const avatarUrl = 'https://res.cloudinary.com/demo/image/upload/v1/vueapp/avatars/user_1.png'
    mockGetUsers.mockResolvedValue(usersPage([
      { id: 1, name: 'Alice Martin', email: 'alice@example.com', avatarUrl },
      { id: 2, name: 'Bilal Dupont', email: 'bilal@example.com', avatarUrl: null },
    ]))
    const wrapper = mountUsersList()
    await flushPromises()

    const image = wrapper.get('img.user-avatar')
    expect(image.attributes('src'))
      .toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_64,h_64,f_auto,q_auto/v1/vueapp/avatars/user_1.png')
    expect(wrapper.findAll('.avatar-fallback').map((element) => element.text())).toEqual(['BD'])

    await image.trigger('error')
    expect(wrapper.find('img.user-avatar').exists()).toBe(false)
    expect(wrapper.findAll('.avatar-fallback').map((element) => element.text())).toEqual(['AM', 'BD'])
  })
})

describe('UsersList pagination', () => {
  it('charge la première page, navigue suivant/précédent et affiche les métadonnées', async () => {
    const firstPageUsers = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
    }))
    const secondPageUsers = Array.from({ length: 10 }, (_, index) => ({
      id: index + 11,
      name: `User ${index + 11}`,
      email: `user${index + 11}@example.com`,
    }))
    mockGetUsers
      .mockResolvedValueOnce(usersPage(firstPageUsers, 1, 25, 3))
      .mockResolvedValueOnce(usersPage(secondPageUsers, 2, 25, 3))
      .mockResolvedValueOnce(usersPage(firstPageUsers, 1, 25, 3))

    const wrapper = mountUsersList()
    await flushPromises()

    expect(mockGetUsers).toHaveBeenNthCalledWith(1, 1)
    expect(wrapper.findAll('.user-row')).toHaveLength(10)
    expect(wrapper.text()).toContain('Affichage de 1 à 10 sur 25 utilisateurs')
    expect((wrapper.get('.previous-page') as unknown as { element: HTMLButtonElement }).element.disabled).toBe(true)

    await wrapper.get('.next-page').trigger('click')
    await flushPromises()
    expect(mockGetUsers).toHaveBeenNthCalledWith(2, 2)
    expect(wrapper.text()).toContain('Page 2 sur 3')
    expect(wrapper.text()).toContain('Affichage de 11 à 20 sur 25 utilisateurs')
    expect(wrapper.text()).toContain('User 11')

    await wrapper.get('.previous-page').trigger('click')
    await flushPromises()
    expect(mockGetUsers).toHaveBeenNthCalledWith(3, 1)
    expect(wrapper.text()).toContain('Page 1 sur 3')
  })

  it('désactive Suivant sur la dernière page et masque la pagination si vide', async () => {
    mockGetUsers
      .mockResolvedValueOnce(usersPage(Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        name: `User ${index + 1}`,
        email: `user${index + 1}@example.com`,
      })), 1, 11, 2))
      .mockResolvedValueOnce(usersPage([testUser], 2, 11, 2))
      .mockResolvedValueOnce(usersPage([], 1, 0, 0))
      .mockResolvedValueOnce(usersPage([], 1, 0, 0))
    const wrapper = mountUsersList()
    await flushPromises()
    await wrapper.get('.next-page').trigger('click')
    await flushPromises()

    expect((wrapper.get('.next-page') as unknown as { element: HTMLButtonElement }).element.disabled).toBe(true)
    expect((wrapper.get('.previous-page') as unknown as { element: HTMLButtonElement }).element.disabled).toBe(false)

    await wrapper.get('.refresh-button').trigger('click')
    await flushPromises()
    expect(mockGetUsers.mock.calls.map(([page]) => page)).toEqual([1, 2, 2, 1])
    expect(wrapper.text()).toContain('Aucun utilisateur pour le moment.')
    expect(wrapper.find('.pagination-controls').exists()).toBe(false)
  })

  it('ignore une réponse ancienne reçue après un rafraîchissement plus récent', async () => {
    const staleUser = { ...testUser, name: 'Ancienne réponse' }
    const freshUser = { ...testUser, name: 'Réponse récente' }
    let resolveInitial!: (value: ReturnType<typeof usersPage>) => void
    let resolveRefresh!: (value: ReturnType<typeof usersPage>) => void
    mockGetUsers
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve }))

    const wrapper = mountUsersList()
    await wrapper.get('.create-button').trigger('click')
    await wrapper.get('.mock-created').trigger('click')
    await wrapper.get('.refresh-button').trigger('click')
    resolveRefresh(usersPage([freshUser]))
    await flushPromises()
    resolveInitial(usersPage([staleUser]))
    await flushPromises()

    expect(wrapper.text()).toContain('Réponse récente')
    expect(wrapper.text()).not.toContain('Ancienne réponse')
  })

  it('revient à la page précédente si la suppression vide la dernière page', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
    }))
    const lastUser = { id: 11, name: 'Dernier utilisateur', email: 'last@example.com' }
    mockGetUsers
      .mockResolvedValueOnce(usersPage(firstPage, 1, 11, 2))
      .mockResolvedValueOnce(usersPage([lastUser], 2, 11, 2))
      .mockResolvedValueOnce(usersPage([], 2, 10, 1))
      .mockResolvedValueOnce(usersPage(firstPage, 1, 10, 1))

    const wrapper = mountUsersList()
    await flushPromises()
    await wrapper.get('.next-page').trigger('click')
    await flushPromises()
    await wrapper.get('.delete-row-button').trigger('click')
    await wrapper.get('.mock-confirm-delete').trigger('click')
    await flushPromises()

    expect(mockDeleteUser).toHaveBeenCalledWith(11)
    expect(mockGetUsers.mock.calls.map(([page]) => page)).toEqual([1, 2, 2, 1])
    expect(wrapper.text()).toContain('Page 1 sur 1')
    expect(wrapper.findAll('.user-row')).toHaveLength(10)
  })
})
