<script setup lang="ts">
import { computed } from 'vue'
import type { Piece } from '../../utils/compta'
import { formatDate, isCompteLettrable } from '../../utils/compta'
import { formatEuros } from '../../utils/montant'

const props = defineProps<{
  pieces: Piece[]
}>()

// Statut de lettrage des lignes 411/512 de la pièce ; aucun statut sans ligne lettrable.
function statut(piece: Piece): { label: string, tone: string } | null {
  const lettrables = piece.lignes.filter((ligne) => isCompteLettrable(ligne.compte))
  const lettrees = lettrables.filter((ligne) => ligne.lettrage !== null).length

  if (lettrables.length === 0) {
    return null
  }
  if (lettrees === lettrables.length) {
    return { label: 'Lettré', tone: 'ok' }
  }
  return lettrees === 0 ? { label: 'À lettrer', tone: 'warn' } : { label: 'Partiel', tone: 'neutral' }
}

const lignes = computed(() => props.pieces.map((piece) => ({ piece, statut: statut(piece) })))
</script>

<template>
  <section class="compta-card" aria-labelledby="pieces-title">
    <header class="compta-card-header">
      <h2 id="pieces-title">Dernières pièces</h2>
      <RouterLink class="journal-link" :to="{ name: 'compta-ecritures' }">Voir le journal</RouterLink>
    </header>

    <p v-if="pieces.length === 0" class="compta-message">Aucune pièce enregistrée.</p>
    <div v-else class="compta-table-scroll">
      <table class="compta-table pieces-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Journal</th>
            <th scope="col">Pièce</th>
            <th scope="col">Libellé</th>
            <th scope="col" class="amount">Montant</th>
            <th scope="col">Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ piece, statut: etat } in lignes" :key="piece.cle" class="piece-row">
            <td>{{ formatDate(piece.date) }}</td>
            <td>{{ piece.journal }}</td>
            <td>{{ piece.piece }}</td>
            <td class="wrap">{{ piece.libelle }}</td>
            <td class="amount">{{ formatEuros(piece.montant) }}</td>
            <td>
              <span v-if="etat" class="compta-badge" :class="etat.tone">{{ etat.label }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.journal-link {
  color: var(--brand);
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.pieces-table {
  min-width: 720px;
}

.pieces-table th,
.pieces-table td {
  padding-inline: 16px;
}

.pieces-table td {
  padding-block: 12px;
}
</style>
