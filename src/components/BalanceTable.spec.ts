import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BalanceTable from './BalanceTable.vue'
import type { Balance } from '../types/comptabilite'

const balance: Balance = {
  comptes: [
    { compte: '411002', debit: '600.00', credit: '400.00', solde: '200.00' },
    { compte: '512000', debit: '1960.00', credit: '0.00', solde: '1960.00' },
    { compte: '706000', debit: '0.00', credit: '2160.00', solde: '-2160.00' },
  ],
  totaux: { debit: '2560.00', credit: '2560.00', solde: '0.00' },
  equilibree: true,
}

function cells(wrapper: ReturnType<typeof mount>, selector: string) {
  return wrapper.findAll(selector).map((row) => row.findAll('th, td').map((cell) => cell.text()))
}

describe('BalanceTable', () => {
  it('affiche une ligne par compte, les soldes du bon côté et le total général', () => {
    const wrapper = mount(BalanceTable, { props: { balance, loading: false, error: '' } })

    expect(cells(wrapper, '.balance-row')).toEqual([
      ['411002', '600,00', '400,00', '200,00', ''],
      ['512000', '1 960,00', '0,00', '1 960,00', ''],
      ['706000', '0,00', '2 160,00', '', '2 160,00'],
    ])
    expect(cells(wrapper, '.balance-total')).toEqual([['Total général', '2 560,00', '2 560,00', '', '']])
    expect(wrapper.get('.balance-status').text()).toBe('Équilibrée')
    expect(wrapper.get('.balance-status').classes()).toContain('ok')
  })

  it('signale une balance déséquilibrée avec l’écart', () => {
    const wrapper = mount(BalanceTable, {
      props: {
        balance: { ...balance, totaux: { debit: '2560.00', credit: '2560.01', solde: '-0.01' }, equilibree: false },
        loading: false,
        error: '',
      },
    })

    expect(wrapper.get('.balance-status').text()).toBe('Déséquilibrée : écart 0,01')
    expect(wrapper.get('.balance-status').classes()).toContain('ko')
  })

  it('affiche un état vide, une erreur avec relance, et le chargement initial', async () => {
    const empty = mount(BalanceTable, {
      props: { balance: { comptes: [], totaux: { debit: '0.00', credit: '0.00', solde: '0.00' }, equilibree: true }, loading: false, error: '' },
    })
    expect(empty.text()).toContain('Aucune écriture')
    expect(empty.find('.balance-status').exists()).toBe(false)

    const failed = mount(BalanceTable, { props: { balance: null, loading: false, error: 'Serveur injoignable.' } })
    await failed.get('.balance-error button').trigger('click')
    expect(failed.get('[role="alert"]').text()).toContain('Serveur injoignable.')
    expect(failed.emitted('retry')).toHaveLength(1)

    const loading = mount(BalanceTable, { props: { balance: null, loading: true, error: '' } })
    expect(loading.text()).toContain('Chargement de la balance')
  })
})
