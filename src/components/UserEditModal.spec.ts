import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UserEditModal from './UserEditModal.vue'
import { updateUser, uploadUserAvatar, type User } from '../services/userService'

vi.mock('../services/userService', () => ({
  updateUser: vi.fn(),
  uploadUserAvatar: vi.fn(),
}))

const mockUpdateUser = vi.mocked(updateUser)
const mockUploadUserAvatar = vi.mocked(uploadUserAvatar)
const avatarUrl = 'https://res.cloudinary.com/demo/image/upload/v1/vueapp/avatars/user_7.png'
const user: User = { id: 7, name: 'Karim Benali', email: 'karim@example.com', avatarUrl: null }
const mountedWrappers: Array<{ unmount: () => void }> = []

function mountModal(props: { user: User } = { user }) {
  const wrapper = mount(UserEditModal, { props, attachTo: document.body })
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

async function chooseFile(file: File) {
  const input = getElement<HTMLInputElement>('#edit-user-avatar')
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change'))
  await flushPromises()
}

async function submitForm() {
  getElement<HTMLFormElement>('.edit-form').dispatchEvent(new Event('submit', { cancelable: true }))
  await flushPromises()
}

function imageFile(type = 'image/png', size = 1024) {
  return new File([new Uint8Array(size)], 'photo.png', { type })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
  mockUpdateUser.mockResolvedValue(user)
  mockUploadUserAvatar.mockResolvedValue({ ...user, avatarUrl })
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('UserEditModal photo de profil', () => {
  it('conserve le flux existant sans photo : un seul PUT et événement saved', async () => {
    const wrapper = mountModal()

    await submitForm()

    expect(mockUpdateUser).toHaveBeenCalledWith(7, { name: 'Karim Benali', email: 'karim@example.com' })
    expect(mockUploadUserAvatar).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toEqual([[user]])
  })

  it('affiche les initiales sans avatar et la miniature Cloudinary avec avatar', async () => {
    mountModal()
    expect(getElement('.avatar-fallback').textContent?.trim()).toBe('KB')
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())

    mountModal({ user: { ...user, avatarUrl } })
    expect(getElement<HTMLImageElement>('.avatar-preview').src)
      .toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_144,h_144,f_auto,q_auto/v1/vueapp/avatars/user_7.png')
  })

  it('affiche un aperçu puis n’envoie que la photo si nom et email sont inchangés', async () => {
    const wrapper = mountModal()
    const file = imageFile()

    await chooseFile(file)
    expect(getElement<HTMLImageElement>('.avatar-preview').src).toBe('blob:preview')
    expect(getElement('.field-hint').textContent).toContain('photo.png')

    await submitForm()

    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(mockUploadUserAvatar).toHaveBeenCalledWith(7, file)
    expect(wrapper.emitted('saved')).toEqual([[{ ...user, avatarUrl }]])
  })

  it('enregistre nom/email puis la photo quand les deux changent', async () => {
    mockUpdateUser.mockResolvedValue({ ...user, name: 'Karim B.' })
    mountModal()
    const nameInput = getElement<HTMLInputElement>('#edit-user-name')
    nameInput.value = 'Karim B.'
    nameInput.dispatchEvent(new Event('input'))
    await chooseFile(imageFile('image/webp'))

    await submitForm()

    expect(mockUpdateUser).toHaveBeenCalledWith(7, { name: 'Karim B.', email: 'karim@example.com' })
    expect(mockUploadUserAvatar).toHaveBeenCalledOnce()
    expect(mockUpdateUser.mock.invocationCallOrder[0]).toBeLessThan(mockUploadUserAvatar.mock.invocationCallOrder[0])
  })

  it('refuse un format non autorisé ou un fichier de plus de 2 Mo', async () => {
    mountModal()

    await chooseFile(imageFile('image/gif'))
    expect(getElement('#edit-user-avatar-error').textContent).toContain('JPG, PNG ou WebP')
    expect(document.body.querySelector('img.avatar-preview')).toBeNull()

    await chooseFile(imageFile('image/jpeg', 2 * 1024 * 1024 + 1))
    expect(getElement('#edit-user-avatar-error').textContent).toContain('2 Mo')

    await submitForm()
    expect(mockUploadUserAvatar).not.toHaveBeenCalled()
  })

  it('accepte une image d’exactement 2 Mo', async () => {
    mountModal()

    await chooseFile(imageFile('image/jpeg', 2 * 1024 * 1024))

    expect(document.body.querySelector('#edit-user-avatar-error')).toBeNull()
    expect(getElement<HTMLImageElement>('.avatar-preview').src).toBe('blob:preview')
  })

  it('signale un échec partiel et transmet les données enregistrées à la fermeture', async () => {
    const renamed = { ...user, name: 'Karim B.' }
    mockUpdateUser.mockResolvedValue(renamed)
    mockUploadUserAvatar.mockRejectedValue(new Error('La photo ne doit pas dépasser 2 Mo.'))
    const wrapper = mountModal()
    const nameInput = getElement<HTMLInputElement>('#edit-user-name')
    nameInput.value = 'Karim B.'
    nameInput.dispatchEvent(new Event('input'))
    await chooseFile(imageFile())

    await submitForm()

    expect(getElement('.request-error').textContent)
      .toContain('Nom et e-mail enregistrés, mais la photo n’a pas pu être envoyée')
    expect(wrapper.emitted('saved')).toBeUndefined()

    getElement<HTMLButtonElement>('.cancel-button').click()
    expect(wrapper.emitted('saved')).toEqual([[renamed]])
  })

  it('libère l’URL d’aperçu à l’annulation et au démontage', async () => {
    const wrapper = mountModal()
    await chooseFile(imageFile())

    getElement<HTMLButtonElement>('.avatar-reset').click()
    await flushPromises()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    expect(document.body.querySelector('img.avatar-preview')).toBeNull()

    await chooseFile(imageFile())
    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })
})
