export interface UserGrowthPoint {
  date: string
  total: number
  created: number
  updated: number
  deleted: number
}

export interface UserGrowthResponse {
  period: number
  timezone: string
  data: UserGrowthPoint[]
}