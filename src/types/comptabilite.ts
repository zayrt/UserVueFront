// Les montants circulent en texte décimal (« 1200.00 ») pour ne jamais passer par un float.

export interface LigneErreur {
  ligne: number
  piece: string | null
  type: 'erreur' | 'doublon'
  message: string
}

export interface ImportReport {
  importId: number | null
  fichier: string
  lignesLues: number
  lignesImportees: number
  lignesRejetees: number
  doublons: number
  piecesImportees: number
  piecesRejetees: number
  erreurs: LigneErreur[]
}

export interface BalanceCompte {
  compte: string
  debit: string
  credit: string
  solde: string
}

export interface Balance {
  comptes: BalanceCompte[]
  totaux: { debit: string, credit: string, solde: string }
  equilibree: boolean
}

export interface Ecriture {
  id: number
  date: string
  journal: string
  piece: string
  compte: string
  libelle: string
  debit: string
  credit: string
  lettrage: string | null
}

export interface Lettrage {
  compte: string
  code: string
  ecritureIds: number[]
}
