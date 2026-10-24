import { apiClient, toRequestError } from './userService'
import type { UserGrowthResponse } from '../types/stats'

export async function getUsersGrowth(days: number = 7): Promise<UserGrowthResponse> {
  try {
    const response = await apiClient.get<UserGrowthResponse>('/api/stats/users-growth', {
      params: { days },
    })
    return response.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de récupérer l’évolution des utilisateurs.')
  }
}