import axios from 'axios'

export interface User {
  id: number
  name: string
  email: string
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

interface ApiErrorResponse {
  error?: { message?: string }
  message?: string
}

const apiUrl = (import.meta.env?.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

export const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
})

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

export async function deleteUser(id: number): Promise<void> {
  try {
    await apiClient.delete<void>(`/api/users/${id}`)
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de supprimer cet utilisateur.')
  }
}