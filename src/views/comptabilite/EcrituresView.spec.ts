import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EcrituresView from './EcrituresView.vue'
import { ecriture, texte } from './testing'
import { getJournal, importEcritures } from '../../services/comptabiliteService'
import type { ImportReport } from '../../types/comptabilite'

vi.mock('../../services/comptabiliteService', () => ({ getJournal: vi.fn(), importEcritures: vi.fn() }))

const report: ImportReport = {
  importId: 4,
  fichier: 'ecritures_avec_erreurs.csv',
  lignesLues: 28,
  lignesImportees: 23,
  lignesRejetees: 4,
  doublons: 1,
  piecesImportees: 9,
  piecesRejetees: 1,
  erreurs: [
    { ligne: 25, piece: 'VT-001', type: 'doublon', message: 'Ligne identique déjà présente en base, non importée.' },
    { ligne: 26, piece: 'VT-004', type: 'erreur', message: 'Débit 500,00 ≠ crédit 480,00.' },
  ],
}

async function importer(wrapper: ReturnType<typeof mount>) {
  const input = wrapper.get<HTMLInputElement>('#import-file')
  Object.defineProperty(input.element, 'files', { value: [new File(['…'], 'e.csv')], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getJournal).mockResolvedValue([
    ecriture({ date: '2026-10-02', journal: 'VT', piece: 'VT-001', compte: '411001', debit: '100.00' }),
    ecriture({ date: '2026-10-12', journal: 'BQ', piece: 'BQ-001', compte: '512000', debit: '100.00' }),
  ])
  vi.mocked(importEcritures).mockResolvedValue(report)
})

describe('EcrituresView', () => {
  it('résume la période et les journaux, sans rapport avant le premier import', async () => {
    const wrapper = mount(EcrituresView)
    await flushPromises()

    expect(wrapper.get('.compta-page-context').text()).toBe('Octobre 2026 · 2 journaux')
    expect(wrapper.findAll('.journal-row')).toHaveLength(2)
    expect(wrapper.text()).toContain('Aucun import pendant cette session')
  })

  it('affiche le rapport ligne par ligne et recharge le journal après un import', async () => {
    const wrapper = mount(EcrituresView)
    await flushPromises()

    await importer(wrapper)

    expect(wrapper.get('.report-file').text()).toContain('ecritures_avec_erreurs.csv · ')
    expect(wrapper.findAll('.stat').map((stat) => [stat.get('dd').text(), stat.get('dt').text()])).toEqual([
      ['23', 'lignes importées'],
      ['1', 'doublon ignoré'],
      ['1', 'pièce rejetée'],
    ])
    expect(wrapper.findAll('.stat').map((stat) => stat.classes()[1])).toEqual(['ok', 'neutral', 'warn'])
    expect(wrapper.findAll('.report-error-row').map((row) => ['.error-line', '.error-title', '.error-message']
      .map((selector) => texte(row.get(selector).text())))).toEqual([
      ['Ligne 25', 'Doublon · VT-001', 'Ligne identique déjà présente en base, non importée.'],
      ['Ligne 26', 'Rejet · VT-004', 'Débit 500,00 ≠ crédit 480,00.'],
    ])
    expect(wrapper.findAll('.error-title.rejet')).toHaveLength(1)
    expect(getJournal).toHaveBeenCalledTimes(2)
  })

  it('ne recharge pas le journal quand rien n’a été importé', async () => {
    vi.mocked(importEcritures).mockResolvedValue({ ...report, importId: null, lignesImportees: 0, erreurs: [] })
    const wrapper = mount(EcrituresView)
    await flushPromises()

    await importer(wrapper)

    expect(wrapper.find('.report-clean').exists()).toBe(true)
    expect(getJournal).toHaveBeenCalledOnce()
  })
})
