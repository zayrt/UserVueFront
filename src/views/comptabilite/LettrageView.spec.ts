import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LettrageView from './LettrageView.vue'
import { balance, comptaRouter, ecriture, texte } from './testing'
import { delettrer, getBalance, getEcrituresCompte, lettrer } from '../../services/comptabiliteService'

vi.mock('../../services/comptabiliteService', () => ({
  delettrer: vi.fn(),
  getBalance: vi.fn(),
  getEcrituresCompte: vi.fn(),
  lettrer: vi.fn(),
}))

const facture = ecriture({ date: '2026-10-02', piece: 'VT-001', compte: '411001', libelle: 'Facture Dupont', debit: '1200.00' })
const acompteFacture = ecriture({ date: '2026-10-05', piece: 'VT-002', compte: '411001', libelle: 'Facture Martin', debit: '600.00' })
const reglement = ecriture({ date: '2026-10-15', piece: 'BQ-001', compte: '411001', libelle: 'Virement Dupont', credit: '1200.00' })
const acompte = ecriture({ date: '2026-10-20', piece: 'BQ-002', compte: '411001', libelle: 'Virement Martin', credit: '300.00' })
const ancienneFacture = ecriture({ date: '2026-09-02', piece: 'VT-000', compte: '411001', debit: '50.00', lettrage: 'A' })
const ancienReglement = ecriture({ date: '2026-09-10', piece: 'BQ-000', compte: '411001', credit: '50.00', lettrage: 'A' })
const ecritures = [ancienneFacture, ancienReglement, facture, acompteFacture, reglement, acompte]

async function mountView(path = '/comptabilite/lettrage') {
  const router = await comptaRouter(path)
  const wrapper = mount(LettrageView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getBalance).mockResolvedValue(balance([
    ['411001', '1850.00', '1550.00', '300.00'],
    ['512000', '1500.00', '0.00', '1500.00'],
    ['707000', '0.00', '1800.00', '-1800.00'],
  ]))
  vi.mocked(getEcrituresCompte).mockResolvedValue(ecritures)
  vi.mocked(lettrer).mockResolvedValue({ compte: '411001', code: 'B', ecritureIds: [facture.id, reglement.id] })
  vi.mocked(delettrer).mockResolvedValue(undefined)
})

describe('LettrageView', () => {
  it('ouvre le premier compte lettrable et résume son solde', async () => {
    const { wrapper, router } = await mountView()

    expect(getEcrituresCompte).toHaveBeenCalledWith('411001')
    expect(router.currentRoute.value.query).toEqual({ compte: '411001' })
    expect(texte(wrapper.get('.compta-page-context').text())).toBe('Compte 411001 · Clients · solde 300,00 € débiteur')
    expect(wrapper.findAll('.compte-select option').map((option) => texte(option.text()))).toEqual(['411001 Clients', '512000 Banque'])
    expect(wrapper.get('.stat-value').text()).toBe('2 / 6')
  })

  it('ouvre le compte demandé dans l’URL', async () => {
    vi.mocked(getEcrituresCompte).mockResolvedValue([])
    await mountView('/comptabilite/lettrage?compte=512000')

    expect(getEcrituresCompte).toHaveBeenCalledWith('512000')
  })

  it('propose les paires de même montant et signale les lignes restantes', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.findAll('.proposition').map((item) => [
      item.get('.proposition-title').text(),
      texte(item.get('.proposition-detail').text()),
    ])).toEqual([['Facture Dupont', 'VT-001 ↔ BQ-001 · 1 200,00 €']])
    expect(wrapper.get('#non-lettrable-title').text()).toBe('2 ligne(s) sans contrepartie exacte')
    expect(texte(wrapper.get('.non-lettrable p').text())).toContain('Reste 300,00 € dû sur ces lignes.')
  })

  it('applique une proposition puis recharge le compte', async () => {
    const { wrapper } = await mountView()

    await wrapper.get('.appliquer-button').trigger('click')
    await flushPromises()

    expect(lettrer).toHaveBeenCalledWith([facture.id, reglement.id])
    expect(wrapper.get('.lettrage-success').text()).toBe('2 écritures lettrées avec le code B.')
    expect(getEcrituresCompte).toHaveBeenCalledTimes(2)
  })

  it('délettre un code depuis le tableau', async () => {
    const { wrapper } = await mountView()

    await wrapper.get('.code-button').trigger('click')
    await flushPromises()

    expect(delettrer).toHaveBeenCalledWith('411001', 'A')
    expect(wrapper.get('.lettrage-success').text()).toBe('Lettrage A annulé.')
  })

  it('« Tout délettrer » demande confirmation puis annule chaque code', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const { wrapper } = await mountView()

    await wrapper.get('.tout-delettrer').trigger('click')
    await flushPromises()
    expect(delettrer).not.toHaveBeenCalled()

    await wrapper.get('.tout-delettrer').trigger('click')
    await flushPromises()
    expect(confirm).toHaveBeenLastCalledWith('Annuler les 1 lettrage(s) du compte 411001 ?')
    expect(delettrer).toHaveBeenCalledWith('411001', 'A')
    expect(wrapper.get('.lettrage-success').text()).toBe('1 lettrage(s) annulé(s) sur le compte 411001.')
  })

  it('affiche l’erreur renvoyée par le serveur', async () => {
    vi.mocked(lettrer).mockRejectedValue(new Error('Une ou plusieurs écritures sélectionnées sont déjà lettrées.'))
    const { wrapper } = await mountView()

    await wrapper.get('.appliquer-button').trigger('click')
    await flushPromises()

    expect(wrapper.get('.lettrage-action-error').text()).toBe('Une ou plusieurs écritures sélectionnées sont déjà lettrées.')
  })

  it('change de compte et met l’URL à jour', async () => {
    const { wrapper, router } = await mountView()
    vi.mocked(getEcrituresCompte).mockResolvedValue([])

    await wrapper.get('.compte-select').setValue('512000')
    await flushPromises()

    expect(getEcrituresCompte).toHaveBeenLastCalledWith('512000')
    expect(router.currentRoute.value.query).toEqual({ compte: '512000' })
  })

  it('indique qu’il n’y a rien à lettrer sans compte 411 ou 512', async () => {
    vi.mocked(getBalance).mockResolvedValue(balance([['707000', '0.00', '100.00', '-100.00']]))
    const { wrapper } = await mountView()

    expect(getEcrituresCompte).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Aucun compte 411 ou 512 à lettrer')
  })
})
