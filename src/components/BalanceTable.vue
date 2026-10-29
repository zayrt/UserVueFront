<script setup lang="ts">
import { computed } from 'vue'
import type { Balance } from '../types/comptabilite'
import { formatMontant, toCents } from '../utils/montant'

const props = defineProps<{
  balance: Balance | null
  loading: boolean
  error: string
}>()

defineEmits<{
  retry: []
}>()

// Solde positif = débiteur, négatif = créditeur : chaque côté a sa colonne.
function soldeDebiteur(solde: string): string {
  const cents = toCents(solde)
  return cents > 0n ? formatMontant(cents) : ''
}

function soldeCrediteur(solde: string): string {
  const cents = toCents(solde)
  return cents < 0n ? formatMontant(-cents) : ''
}

const ecart = computed(() => {
  const cents = props.balance ? toCents(props.balance.totaux.solde) : 0n
  return formatMontant(cents < 0n ? -cents : cents)
})
</script>

<template>
  <section class="compta-card" aria-labelledby="balance-title" :aria-busy="loading">
    <header class="compta-card-header">
      <div>
        <p class="compta-eyebrow">Balance</p>
        <h2 id="balance-title">Balance générale</h2>
        <p class="compta-subtitle">Totaux et solde par compte, toutes écritures confondues.</p>
      </div>
      <span
        v-if="balance && balance.comptes.length > 0"
        class="compta-badge balance-status"
        :class="balance.equilibree ? 'ok' : 'ko'"
      >
        {{ balance.equilibree ? 'Équilibrée' : `Déséquilibrée : écart ${ecart}` }}
      </span>
    </header>

    <p v-if="loading && !balance" class="compta-message" role="status">Chargement de la balance…</p>
    <div v-else-if="error" class="compta-message balance-error" role="alert">
      <p>{{ error }}</p>
      <button class="compta-button" type="button" @click="$emit('retry')">Réessayer</button>
    </div>
    <p v-else-if="!balance || balance.comptes.length === 0" class="compta-message" role="status">
      Aucune écriture : importez un fichier CSV pour construire la balance.
    </p>
    <div v-else class="compta-table-scroll">
      <table class="compta-table balance-table">
        <thead>
          <tr>
            <th scope="col">Compte</th>
            <th scope="col" class="amount">Débit</th>
            <th scope="col" class="amount">Crédit</th>
            <th scope="col" class="amount">Solde débiteur</th>
            <th scope="col" class="amount">Solde créditeur</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ligne in balance.comptes" :key="ligne.compte" class="balance-row">
            <th scope="row">{{ ligne.compte }}</th>
            <td class="amount">{{ formatMontant(ligne.debit) }}</td>
            <td class="amount">{{ formatMontant(ligne.credit) }}</td>
            <td class="amount">{{ soldeDebiteur(ligne.solde) }}</td>
            <td class="amount">{{ soldeCrediteur(ligne.solde) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="balance-total">
            <td>Total général</td>
            <td class="amount">{{ formatMontant(balance.totaux.debit) }}</td>
            <td class="amount">{{ formatMontant(balance.totaux.credit) }}</td>
            <td class="amount">{{ soldeDebiteur(balance.totaux.solde) }}</td>
            <td class="amount">{{ soldeCrediteur(balance.totaux.solde) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

<style scoped>
.balance-table tbody th {
  color: #263634;
  font-weight: 650;
}

.balance-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #a23e37;
}

.balance-error p {
  margin: 0;
}
</style>
