// Calculs en centimes (bigint) et formatage à partir du texte : aucun passage par un float.

const decimalPattern = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

export function toCents(value: string): bigint {
  const match = decimalPattern.exec(value)
  if (!match) {
    throw new Error(`Montant invalide : ${value}`)
  }

  const cents = BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
  return match[1] === '-' ? -cents : cents
}

// « 1234.5 » ou 123450n → « 1 234,50 » (espace insécable comme Intl en fr-FR).
export function formatMontant(value: string | bigint): string {
  const cents = typeof value === 'bigint' ? value : toCents(value)
  const absolute = cents < 0n ? -cents : cents
  const units = String(absolute / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${cents < 0n ? '-' : ''}${units},${String(absolute % 100n).padStart(2, '0')}`
}

export function formatEuros(value: string | bigint): string {
  return `${formatMontant(value)} €`
}

// Flux signé : « +1 200,00 » ou « −240,00 » (vrai signe moins typographique).
export function formatSigne(value: string | bigint): string {
  const cents = typeof value === 'bigint' ? value : toCents(value)
  return `${cents < 0n ? '−' : '+'}${formatMontant(cents < 0n ? -cents : cents)}`
}
