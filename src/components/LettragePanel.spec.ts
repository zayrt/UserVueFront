import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LettragePanel from './LettragePanel.vue'
import type { Ecriture } from '../types/comptabilite'

function ecriture(id: number, piece: string, debit: string, credit: string, lettrage: string | null = null): Ecriture {
  return { id, date: '2026-09-02', journal: 'VT', piece, compte: '411001', libelle: `Pièce ${piece}`, debit, credit, lettrage }
}

const ecritures = [
  ecriture(1, 'F1', '1200.00', '0.00'),
  ecriture(2, 'E1', '0.00', '400.00'),
  ecriture(3, 'E2', '0.00', '800.00'),
  ecriture(4, 'F0', '50.00', '0.00', 'A'),
  ecriture(5, 'E0', '0.00', '50.00', 'A'),
]

function mountPanel(props: Partial<{ ecritures: Ecriture[], busy: boolean }> = {}) {
  return mount(LettragePanel, { props: { compte: '411001', ecritures, busy: false, ...props } })
}

async function check(wrapper: ReturnType<typeof mountPanel>, ...indexes: number[]) {
  const boxes = wrapper.findAll<HTMLInputElement>('.lettrage-checkbox')
  for (const index of indexes) {
    await boxes[index].setValue(true)
  }
}

describe('LettragePanel', () => {
  it('liste les lignes du compte et bloque celles déjà lettrées', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('h2').text()).toBe('Lignes du compte 411001')
    expect(wrapper.findAll('.lettrage-row')).toHaveLength(5)
    const disabled = wrapper.findAll('.lettrage-checkbox').map((box) => box.attributes('disabled') !== undefined)
    expect(disabled).toEqual([false, false, false, true, true])
    expect(wrapper.findAll('.code-button').map((button) => button.text())).toEqual(['A', 'A'])
  })

  it('n’autorise le lettrage que si la somme de la sélection est nulle', async () => {
    const wrapper = mountPanel()
    const button = wrapper.get('.lettrer-button')

    expect(wrapper.get('.selection-hint').text()).toBe('Sélectionnez au moins une facture et un règlement')

    await check(wrapper, 0, 1)
    expect(wrapper.get('.selection-summary').text()).toContain('2 ligne(s) sélectionnée(s) · écart 800,00')
    expect(button.attributes('disabled')).toBeDefined()

    await check(wrapper, 2)
    expect(wrapper.get('.selection-summary').text()).toContain('écart 0,00')
    expect(button.attributes('disabled')).toBeUndefined()

    await button.trigger('click')
    expect(wrapper.emitted('lettrer')).toEqual([[[1, 2, 3]]])
  })

  it('relie chaque libellé à sa case à cocher', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('label[for="ecriture-1"]').text()).toBe('Pièce F1')
  })

  it('émet delettrer avec le code cliqué', async () => {
    const wrapper = mountPanel()

    await wrapper.get('.code-button').trigger('click')

    expect(wrapper.emitted('delettrer')).toEqual([['A']])
  })

  it('vide la sélection quand la liste change', async () => {
    const wrapper = mountPanel()
    await check(wrapper, 0)

    await wrapper.setProps({ ecritures: ecritures.slice(1) })

    expect(wrapper.get('.selection-summary').text()).toContain('0 ligne(s) sélectionnée(s)')
  })

  it('bloque toute action pendant un enregistrement', () => {
    const wrapper = mountPanel({ busy: true })

    expect(wrapper.findAll('.lettrage-checkbox').every((box) => box.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.get('.lettrer-button').text()).toBe('Enregistrement…')
  })
})
