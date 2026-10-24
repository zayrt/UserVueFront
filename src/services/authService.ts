import axios from 'axios'
import { apiClient, toRequestError } from './api'

export interface Account {
  id: number
  name: string
  email: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  name: string
}

export async function login(payload: LoginPayload): Promise<Account> {
  try {
    const response = await apiClient.post<{ data: Account }>('/api/auth/login', payload)
    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Connexion impossible.')
  }
}

export async function register(payload: RegisterPayload): Promise<Account> {
  try {
    const response = await apiClient.post<{ data: Account }>('/api/auth/register', payload)
    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Inscription impossible.')
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout')
  } catch (error: unknown) {
    throw toRequestError(error, 'Déconnexion impossible.')
  }
}

export async function fetchCurrentAccount(): Promise<Account | null> {
  try {
    const response = await apiClient.get<{ data: Account }>('/api/auth/me')
    return response.data.data
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null
    }

    throw toRequestError(error, 'Impossible de vérifier la session.')
  }
}
