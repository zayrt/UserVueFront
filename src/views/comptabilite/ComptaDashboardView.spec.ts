import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ComptaDashboardView from './ComptaDashboardView.vue'
import { balance, comptaRouter, ecriture, texte } from './testing'
import { getBalance, getJournal } from '../../services/comptabiliteService'

vi.mock('../../services/comptabiliteService', () => ({ getBalance: vi.fn(), getJournal: vi.fn() }))

const journal = [
  ecriture({ date: '2026-10-02', journal: 'VT', piece: 'VT-001', compte: '411001', libelle: 'Facture Dupont', debit: '1200.00', lettrage: 'A' }),
  ecriture({ date: '2026-10-02', journal: 'VT', piece: 'VT-001', compte: '707000', credit: '1000.00' }),
  ecriture({ date: '2026-10-02', journal: 'VT', piece: 'VT-001', compte: '44571', credit: '200.00' }),
  ecriture({ date: '2026-10-06', journal: 'AC', piece: 'AC-001', compte: '606000', libelle: 'Fournitures', debit: '200.00' }),
  ecriture({ date: '2026-10-06', journal: 'AC', piece: 'AC-001', compte: '44566', debit: '40.00' }),
  ecriture({ date: '2026-10-06', journal: 'AC', piece: 'AC-001', compte: '401000', credit: '240.00' }),
  ecriture({ date: '2026-10-15', journal: 'BQ', piece: 'BQ-001', compte: '512000', libelle: 'Virement Dupont', debit: '1200.00' }),
  ecriture({ date: '2026-10-15', journal: 'BQ', piece: 'BQ-001', compte: '411001', credit: '1200.00', lettrage: 'A' }),
  ecriture({ date: '2026-10-25', journal: 'BQ', piece: 'BQ-002', compte: '401000', libelle: 'Paiement Bureau Plus', debit: '240.00' }),
  ecriture({ date: '2026-10-25', journal: 'BQ', piece: 'BQ-002', compte: '512000', credit: '240.00' }),
]

async function mountView() {
  const router = await comptaRouter()
  const wrapper = mount(ComptaDashboardView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getJournal).mockResolvedValue(journal)
  vi.mocked(getBalance).mockResolvedValue({
    ...balance([
      ['401000', '240.00', '240.00', '0.00'],
      ['411001', '1200.00', '1200.00', '0.00'],
      ['44566', '40.00', '0.00', '40.00'],
      ['44571', '0.00', '200.00', '-200.00'],
      ['512000', '1200.00', '240.00', '960.00'],
      ['606000', '200.00', '0.00', '200.00'],
      ['707000', '0.00', '1000.00', '-1000.00'],
    ]),
    totaux: { debit: '2880.00', credit: '2880.00', solde: '0.00' },
  })
})

describe('ComptaDashboardView', () => {
  it('calcule les indicateurs à partir de la balance', async () => {
    const wrapper = await mountView()

    expect(texte(wrapper.get('.compta-page-context').text())).toBe('Octobre 2026 · 4 pièce(s)')
    const kpis = wrapper.findAll('.kpi').map((kpi) => [
      kpi.get('.kpi-label').text(),
      texte(kpi.get('.kpi-value').text()),
      texte(kpi.get('.kpi-detail').text()),
    ])
    expect(kpis).toEqual([
      ['Trésorerie · 512', '960,00 €', '2 mouvement(s) bancaire(s)'],
      ['Créances clients · 411', '0,00 €', 'Toutes les lignes sont lettrées'],
      ['Dettes fournisseurs · 401', '0,00 €', '1 facture(s) fournisseur'],
      ['TVA à reverser', '160,00 €', 'Collectée 200,00 − déductible 40,00'],
      ['Résultat provisoire', '800,00 €', 'Produits 1 000,00 − charges 200,00'],
    ])
  })

  it('trace les flux bancaires du dernier mois', async () => {
    const wrapper = await mountView()

    expect(wrapper.get('#flux-title').text()).toBe('Flux bancaires d’octobre')
    expect(wrapper.findAll('.flux-amount').map((cell) => texte(cell.text()))).toEqual(['+1 200,00', '−240,00'])
    expect(wrapper.findAll('.flux-bar').map((bar) => bar.attributes('style'))).toEqual(['width: 100%;', 'width: 20%;'])
    expect(wrapper.find('.flux-bar.outflow').exists()).toBe(true)
  })

  it('propose de lettrer les mouvements bancaires ouverts', async () => {
    const wrapper = await mountView()

    const items = wrapper.findAll('.todo-item')
    expect(items).toHaveLength(1)
    expect(items[0].get('.todo-title').text()).toBe('2 mouvement(s) bancaire(s) à lettrer')
    expect(items[0].get('a').attributes('href')).toBe('/comptabilite/lettrage?compte=512000')
    expect(texte(wrapper.get('.balance-check').text())).toBe('Balance équilibrée D 2 880,00 = C 2 880,00')
  })

  it('liste les dernières pièces, les plus récentes d’abord, avec leur statut de lettrage', async () => {
    const wrapper = await mountView()

    const rows = wrapper.findAll('.piece-row').map((row) => row.findAll('td').map((cell) => texte(cell.text())))
    expect(rows).toEqual([
      ['25/10/2026', 'BQ', 'BQ-002', 'Paiement Bureau Plus', '240,00 €', 'À lettrer'],
      ['15/10/2026', 'BQ', 'BQ-001', 'Virement Dupont', '1 200,00 €', 'Partiel'],
      ['06/10/2026', 'AC', 'AC-001', 'Fournitures', '240,00 €', ''],
      ['02/10/2026', 'VT', 'VT-001', 'Facture Dupont', '1 200,00 €', 'Lettré'],
    ])
  })

  it('invite à importer quand le journal est vide', async () => {
    vi.mocked(getJournal).mockResolvedValue([])
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Aucune écriture pour le moment')
    expect(wrapper.find('.kpis').exists()).toBe(false)
  })

  it('affiche l’erreur et relance le chargement', async () => {
    vi.mocked(getBalance).mockRejectedValueOnce(new Error('Impossible de joindre le serveur.'))
    const wrapper = await mountView()

    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de joindre le serveur.')

    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.kpis').exists()).toBe(true)
  })
})
