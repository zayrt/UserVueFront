import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UsersStatsCards from './UsersStatsCards.vue'
import { getUsersStats } from '../services/usersStatsService'

vi.mock('../services/usersStatsService', () => ({ getUsersStats: vi.fn() }))

const mockGetUsersStats = vi.mocked(getUsersStats)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUsersStats.mockResolvedValue({ totalUsers: 1234, modifiedUsers: 5, deletedUsers: 2, period: 7 })
})

describe('UsersStatsCards', () => {
  it('affiche un squelette pendant le chargement', () => {
    mockGetUsersStats.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(UsersStatsCards)

    expect(wrapper.findAll('.skeleton-card')).toHaveLength(3)
    expect(wrapper.get('section').attributes('aria-busy')).toBe('true')
  })

  it('affiche les trois cards avec les valeurs formatées et la période', async () => {
    const wrapper = mount(UsersStatsCards)
    await flushPromises()

    expect(mockGetUsersStats).toHaveBeenCalledWith(7)
    const cards = wrapper.findAll('.stat-card')
    expect(cards.map((card) => card.get('h2').text())).toEqual([
      'Total utilisateurs',
      'Utilisateurs modifiés',
      'Utilisateurs supprimés',
    ])
    expect(cards.map((card) => card.get('.stat-value').text())).toEqual(['1 234', '5', '2'])
    expect(cards[1].get('.stat-subtitle').text()).toBe('7 derniers jours')
  })

  it('affiche l’erreur et réessaie au clic', async () => {
    mockGetUsersStats.mockRejectedValueOnce(new Error('Impossible de récupérer les statistiques utilisateurs.'))
    const wrapper = mount(UsersStatsCards)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de récupérer les statistiques utilisateurs.')

    await wrapper.get('.retry-button').trigger('click')
    await flushPromises()

    expect(mockGetUsersStats).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('.stat-card')).toHaveLength(3)
  })

  it('expose refresh() pour être rafraîchi après une modification', async () => {
    const wrapper = mount(UsersStatsCards)
    await flushPromises()
    mockGetUsersStats.mockResolvedValue({ totalUsers: 1235, modifiedUsers: 5, deletedUsers: 2, period: 7 })

    await (wrapper.vm as unknown as { refresh: () => Promise<void> }).refresh()
    await flushPromises()

    expect(wrapper.findAll('.stat-value')[0].text()).toBe('1 235')
  })
})
