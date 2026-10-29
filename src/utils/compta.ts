import type { BalanceCompte, Ecriture } from '../types/comptabilite'
import { toCents } from './montant'

export interface Piece {
  cle: string
  date: string
  journal: string
  piece: string
  libelle: string
  lignes: Ecriture[]
  // Total débit de la pièce (égal au total crédit quand elle est équilibrée).
  montant: bigint
}

// Du plus précis au plus général : le premier préfixe qui correspond l'emporte.
const libellesComptes: [string, string][] = [
  ['44571', 'TVA collectée'],
  ['44566', 'TVA déductible'],
  ['401', 'Fournisseurs'],
  ['411', 'Clients'],
  ['512', 'Banque'],
  ['606', 'Fournitures'],
  ['613', 'Locations'],
  ['706', 'Prestations'],
  ['707', 'Ventes'],
]

export const libellesJournaux: Record<string, string> = {
  VT: 'Ventes',
  AC: 'Achats',
  BQ: 'Banque',
  OD: 'Opérations diverses',
}

export function libelleCompte(compte: string): string {
  return libellesComptes.find(([prefixe]) => compte.startsWith(prefixe))?.[1] ?? ''
}

export function isCompteLettrable(compte: string): boolean {
  return compte.startsWith('411') || compte.startsWith('512')
}

// « 2026-10-28 » → « 28/10/2026 »
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

// « 2026-10-28 » → « 28/10 »
export function formatJourMois(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

// « 2026-10-28 » → « Octobre 2026 »
export function formatMois(date: string): string {
  const [year, month] = date.split('-').map(Number)
  const label = new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function groupPieces(ecritures: Ecriture[]): Piece[] {
  const pieces = new Map<string, Piece>()

  for (const ecriture of ecritures) {
    const cle = `${ecriture.journal} ${ecriture.piece}`
    let piece = pieces.get(cle)
    if (!piece) {
      piece = { cle, date: ecriture.date, journal: ecriture.journal, piece: ecriture.piece, libelle: ecriture.libelle, lignes: [], montant: 0n }
      pieces.set(cle, piece)
    }
    piece.lignes.push(ecriture)
    piece.montant += toCents(ecriture.debit)
  }

  return [...pieces.values()]
}

// Somme des soldes (débit − crédit) des comptes commençant par le préfixe.
export function soldePrefixe(comptes: BalanceCompte[], prefixe: string): bigint {
  return comptes
    .filter((ligne) => ligne.compte.startsWith(prefixe))
    .reduce((sum, ligne) => sum + toCents(ligne.solde), 0n)
}
