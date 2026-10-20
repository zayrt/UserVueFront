import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUsersGrowth } from '../services/statsService'
import type { UserGrowthResponse } from '../types/stats'
import UsersGrowthChart from './UsersGrowthChart.vue'

vi.mock('../services/statsService', () => ({ getUsersGrowth: vi.fn() }))
vi.mock('vue-chartjs', async () => {
  const { defineComponent, h } = await import('vue')

  return {
    Line: defineComponent({
      name: 'Line',
      props: ['data', 'options'],
      setup(props) {
        return () => h('div', {
          'data-test': 'line-chart',
          'data-chart': JSON.stringify(props.data),
          'data-options': JSON.stringify(props.options),
        })
      },
    }),
  }
})

const mockGetUsersGrowth = vi.mocked(getUsersGrowth)

const response: UserGrowthResponse = {
  period: 7,
  timezone: 'Europe/Paris',
  data: [
    { date: '2026-10-14', total: 10, created: 1, updated: 2, deleted: 0 },
    { date: '2026-10-15', total: 12, created: 2, updated: 1, deleted: 0 },
    { date: '2026-10-16', total: 12, created: 0, updated: 0, deleted: 0 },
    { date: '2026-10-17', total: 13, created: 1, updated: 3, deleted: 0 },
    { date: '2026-10-18', total: 12, created: 0, updated: 1, deleted: 1 },
    { date: '2026-10-19', total: 14, created: 2, updated: 2, deleted: 0 },
    { date: '2026-10-20', total: 15, created: 1, updated: 1, deleted: 0 },
  ],
}

function mountChart() {
  return mount(UsersGrowthChart)
}

function renderedChart(wrapper: ReturnType<typeof mountChart>) {
  const element = wrapper.get('[data-test="line-chart"]')
  return {
    data: JSON.parse(element.attributes('data-chart') ?? '{}'),
    options: JSON.parse(element.attributes('data-options') ?? '{}'),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUsersGrowth.mockResolvedValue(response)
})

describe('UsersGrowthChart', () => {
  it('charge les sept jours dans l’ordre chronologique et trace les quatre séries', async () => {
    const wrapper = mountChart()
    await flushPromises()

    expect(mockGetUsersGrowth).toHaveBeenCalledWith(7)
    const chart = renderedChart(wrapper)
    expect(chart.data.labels).toHaveLength(7)
    expect(chart.data.labels[0]).toBe('14 oct.')
    expect(chart.data.labels[6]).toBe('20 oct.')
    expect(chart.data.datasets.map((dataset: { label: string }) => dataset.label)).toEqual([
      'Total utilisateurs',
      'Utilisateurs créés',
      'Utilisateurs modifiés',
      'Utilisateurs supprimés',
    ])
    expect(chart.data.datasets.map((dataset: { data: number[] }) => dataset.data)).toEqual([
      [10, 12, 12, 13, 12, 14, 15],
      [1, 2, 0, 1, 0, 2, 1],
      [2, 1, 0, 3, 1, 2, 1],
      [0, 0, 0, 0, 1, 0, 0],
    ])
  })

  it('configure deux axes entiers non négatifs', async () => {
    const wrapper = mountChart()
    await flushPromises()
    const { data, options } = renderedChart(wrapper)

    expect(data.datasets[0].yAxisID).toBe('yTotal')
    expect(data.datasets.slice(1).every((dataset: { yAxisID: string }) => dataset.yAxisID === 'yActivity')).toBe(true)
    expect(options.scales.yTotal.position).toBe('left')
    expect(options.scales.yActivity.position).toBe('right')
    expect(options.scales.yTotal.min).toBe(0)
    expect(options.scales.yActivity.min).toBe(0)
    expect(options.scales.yTotal.ticks.precision).toBe(0)
    expect(options.scales.yActivity.ticks.precision).toBe(0)
    expect(options.plugins.legend.display).toBe(true)
  })

  it('rafraîchit les données avec le bouton Actualiser', async () => {
    const wrapper = mountChart()
    await flushPromises()
    mockGetUsersGrowth.mockResolvedValueOnce({
      ...response,
      data: response.data.map((point) => ({ ...point, total: point.total + 1 })),
    })

    await wrapper.get('.refresh-button').trigger('click')
    await flushPromises()

    expect(mockGetUsersGrowth).toHaveBeenCalledTimes(2)
    expect(renderedChart(wrapper).data.datasets[0].data[0]).toBe(11)
  })

  it('affiche une erreur API et permet de réessayer', async () => {
    mockGetUsersGrowth.mockRejectedValueOnce(new Error('API indisponible'))
    const wrapper = mountChart()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('API indisponible')
    mockGetUsersGrowth.mockResolvedValueOnce(response)
    await wrapper.get('.retry-button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="line-chart"]').exists()).toBe(true)
  })

  it('affiche des données vides sans créer de valeurs fictives', async () => {
    mockGetUsersGrowth.mockResolvedValueOnce({ period: 7, timezone: 'Europe/Paris', data: [] })
    const wrapper = mountChart()
    await flushPromises()

    expect(wrapper.text()).toContain('Aucune donnée disponible')
    expect(wrapper.find('[data-test="line-chart"]').exists()).toBe(false)
  })

  it('trace les valeurs nulles réelles sans les remplacer', async () => {
    mockGetUsersGrowth.mockResolvedValueOnce({
      period: 7,
      timezone: 'Europe/Paris',
      data: response.data.map((point) => ({ ...point, total: 0, created: 0, updated: 0, deleted: 0 })),
    })
    const wrapper = mountChart()
    await flushPromises()

    expect(renderedChart(wrapper).data.datasets.every((dataset: { data: number[] }) => dataset.data.every((value) => value === 0))).toBe(true)
  })

  it('affiche et retire l’état de chargement', async () => {
    let resolveRequest!: (value: UserGrowthResponse) => void
    mockGetUsersGrowth.mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve }))
    const wrapper = mountChart()

    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('Chargement')
    resolveRequest(response)
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
