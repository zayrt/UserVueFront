import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Balance, BalanceCompte, Ecriture } from '../../types/comptabilite'

// Routeur réduit aux pages du module, pour résoudre les RouterLink des vues testées.
export async function comptaRouter(path = '/comptabilite') {
  const empty = defineComponent({ render: () => null })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/comptabilite', name: 'comptabilite', component: empty },
      { path: '/comptabilite/ecritures', name: 'compta-ecritures', component: empty },
      { path: '/comptabilite/balance', name: 'compta-balance', component: empty },
      { path: '/comptabilite/lettrage', name: 'compta-lettrage', component: empty },
    ],
  })
  await router.push(path)
  return router
}

let nextId = 1
export function ecriture(fields: Partial<Ecriture> & Pick<Ecriture, 'piece' | 'compte'>): Ecriture {
  return { id: nextId++, date: '2026-10-02', journal: 'VT', libelle: fields.piece, debit: '0.00', credit: '0.00', lettrage: null, ...fields }
}

export function balance(comptes: [string, string, string, string][], equilibree = true): Balance {
  const lignes: BalanceCompte[] = comptes.map(([compte, debit, credit, solde]) => ({ compte, debit, credit, solde }))
  return { comptes: lignes, totaux: { debit: '0.00', credit: '0.00', solde: '0.00' }, equilibree }
}

// Les montants sont formatés avec des espaces insécables.
export function texte(value: string): string {
  return value.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}
