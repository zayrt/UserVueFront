import { apiClient, toRequestError } from './userService'
import type { UsersStatsResponse } from '../types/usersStats'

export async function getUsersStats(days: number = 7): Promise<UsersStatsResponse> {
  try {
    const response = await apiClient.get<UsersStatsResponse>('/api/stats/users-summary', {
      params: { days },
    })

    return response.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de récupérer les statistiques utilisateurs.')
  }
}