import { describe, expect, it } from 'vitest'
import { formatMontant, toCents } from './montant'

describe('montant', () => {
  it.each([
    ['0.00', '0,00'],
    ['1200.5', '1 200,50'],
    ['-760.00', '-760,00'],
    ['9999999999.99', '9 999 999 999,99'],
  ])('formate %s en %s', (value, expected) => {
    expect(formatMontant(value)).toBe(expected)
  })

  it('additionne au centime près', () => {
    expect(formatMontant(toCents('0.10') + toCents('0.20'))).toBe('0,30')
    expect(toCents('-0.05')).toBe(-5n)
  })

  it('refuse un texte qui n’est pas un montant', () => {
    expect(() => toCents('1e3')).toThrow()
  })
})
