import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import JournalTable from './JournalTable.vue'
import type { Ecriture } from '../../types/comptabilite'

let nextId = 1
function ligne(journal: string, piece: string, compte: string, libelle: string, debit: string, credit: string, lettrage: string | null = null): Ecriture {
  return { id: nextId++, date: '2026-10-02', journal, piece, compte, libelle, debit, credit, lettrage }
}

// 12 pièces de 2 lignes : 24 lignes, donc 2 pages de 10 pièces.
const ecritures = Array.from({ length: 12 }, (_, index) => {
  const journal = index % 2 === 0 ? 'VT' : 'BQ'
  const piece = `${journal}-${String(index + 1).padStart(3, '0')}`
  return [
    ligne(journal, piece, '411001', `Client ${index + 1}`, '100.00', '0.00', index === 0 ? 'A' : null),
    ligne(journal, piece, journal === 'VT' ? '707000' : '512000', `Contrepartie ${index + 1}`, '0.00', '100.00'),
  ]
}).flat()

function mountTable() {
  return mount(JournalTable, { props: { ecritures, loading: false, error: '' } })
}

describe('JournalTable', () => {
  it('pagine par pièces entières et résume la page', async () => {
    const wrapper = mountTable()

    expect(wrapper.findAll('.journal-row')).toHaveLength(20)
    expect(wrapper.get('.journal-summary').text()).toBe('20 lignes sur 24 · 10 pièces sur 12')
    expect(wrapper.findAll('.journal-pager button')[0].attributes('disabled')).toBeDefined()

    await wrapper.findAll('.journal-pager button')[1].trigger('click')

    expect(wrapper.get('.journal-summary').text()).toBe('4 lignes sur 24 · 2 pièces sur 12')
    expect(wrapper.findAll('.journal-pager button')[1].attributes('disabled')).toBeDefined()
  })

  it('affiche le libellé du compte, le code de lettrage ou « À lettrer »', () => {
    const cells = mountTable().findAll('.journal-row')[0].findAll('td').map((cell) => cell.text())

    expect(cells).toEqual(['02/10', 'VT', 'VT-001', '411001 Clients', 'Client 1', '100,00', '', 'A'])
    expect(mountTable().findAll('.journal-row')[2].findAll('td')[7].text()).toBe('À lettrer')
  })

  it('filtre par journal et revient à la première page', async () => {
    const wrapper = mountTable()
    await wrapper.findAll('.journal-pager button')[1].trigger('click')

    const chips = wrapper.findAll('.chip')
    expect(chips.map((chip) => chip.text())).toEqual(['Tous', 'VT · Ventes', 'BQ · Banque'])

    await chips[2].trigger('click')

    expect(chips[2].attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.journal-summary').text()).toBe('12 lignes sur 12 · 6 pièces sur 6')
  })

  it('recherche dans la pièce, le compte et le libellé', async () => {
    const wrapper = mountTable()

    await wrapper.get('.journal-search').setValue('banque')
    expect(wrapper.get('.journal-summary').text()).toBe('6 lignes sur 6 · 6 pièces sur 6')

    await wrapper.get('.journal-search').setValue('introuvable')
    expect(wrapper.text()).toContain('Aucune écriture ne correspond à ces filtres.')
  })
})
