import { apiClient, toRequestError } from './api'

export { apiClient, toRequestError }

export interface User {
  id: number
  name: string
  email: string
  avatarUrl?: string | null
}

export interface CreateUserPayload {
  name: string
  email: string
}

export interface UsersPagination {
  currentPage: number
  totalItems: number
  totalPages: number
}

export interface UsersPageResponse {
  data: User[]
  pagination: UsersPagination
}

export async function getUsers(page: number = 1): Promise<UsersPageResponse> {
  try {
    const response = await apiClient.get<UsersPageResponse>('/api/users', {
      params: { page },
    })
    return response.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de récupérer la liste des utilisateurs.')
  }
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  try {
    const response = await apiClient.post<{ data: User }>('/api/users', {
      name: payload.name,
      email: payload.email,
    })

    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de créer cet utilisateur.')
  }
}

export async function updateUser(id: number, data: Pick<User, 'name' | 'email'>): Promise<User> {
  try {
    const response = await apiClient.put<{ data: User }>(`/api/users/${id}`, {
      name: data.name,
      email: data.email,
    })

    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de modifier cet utilisateur.')
  }
}

export async function uploadUserAvatar(id: number, file: File): Promise<User> {
  const formData = new FormData()
  formData.append('avatar', file)

  try {
    const response = await apiClient.put<{ data: User }>(`/api/users/${id}/avatar`, formData, {
      timeout: 30000,
    })

    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible d’envoyer la photo de profil.')
  }
}

export async function deleteUser(id: number): Promise<void> {
  try {
    await apiClient.delete<void>(`/api/users/${id}`)
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de supprimer cet utilisateur.')
  }
}