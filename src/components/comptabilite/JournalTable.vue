<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Ecriture } from '../../types/comptabilite'
import { formatJourMois, groupPieces, isCompteLettrable, libelleCompte, libellesJournaux } from '../../utils/compta'
import { formatMontant, toCents } from '../../utils/montant'

const props = defineProps<{
  ecritures: Ecriture[]
  loading: boolean
  error: string
}>()

defineEmits<{
  retry: []
}>()

// La pagination avance par pièces entières : une pièce n'est jamais coupée entre deux pages.
const piecesParPage = 10

const journal = ref('')
const recherche = ref('')
const page = ref(0)

const journaux = computed(() => {
  const codes = new Set(props.ecritures.map((ecriture) => ecriture.journal))
  const connus = Object.keys(libellesJournaux).filter((code) => codes.has(code))
  return [...connus, ...[...codes].filter((code) => !connus.includes(code)).sort()]
})

const filtrees = computed(() => {
  const terme = recherche.value.trim().toLowerCase()
  return props.ecritures.filter((ecriture) => (!journal.value || ecriture.journal === journal.value)
    && (!terme || [ecriture.piece, ecriture.compte, libelleCompte(ecriture.compte), ecriture.libelle]
      .some((champ) => champ.toLowerCase().includes(terme))))
})

const pieces = computed(() => groupPieces(filtrees.value))
const pageCount = computed(() => Math.max(1, Math.ceil(pieces.value.length / piecesParPage)))
const piecesPage = computed(() => pieces.value.slice(page.value * piecesParPage, (page.value + 1) * piecesParPage))
const lignesPage = computed(() => piecesPage.value.flatMap((piece) => piece.lignes.map((ligne, index) => ({ ligne, debutPiece: index === 0 }))))

watch([journal, recherche, () => props.ecritures], () => {
  page.value = 0
})

function montant(value: string): string {
  return toCents(value) > 0n ? formatMontant(value) : ''
}
</script>

<template>
  <section class="compta-card" aria-labelledby="journal-title" :aria-busy="loading">
    <header class="compta-card-header">
      <h2 id="journal-title">Journal</h2>
      <div class="journal-filters">
        <div class="journal-chips" role="group" aria-label="Filtrer par journal">
          <button class="chip" type="button" :aria-pressed="journal === ''" @click="journal = ''">Tous</button>
          <button
            v-for="code in journaux"
            :key="code"
            class="chip"
            type="button"
            :aria-pressed="journal === code"
            @click="journal = code"
          >
            {{ code }}<template v-if="libellesJournaux[code]"> · {{ libellesJournaux[code] }}</template>
          </button>
        </div>
        <input
          v-model="recherche"
          class="journal-search"
          type="search"
          placeholder="Pièce, compte, libellé…"
          aria-label="Rechercher une pièce, un compte ou un libellé"
        >
      </div>
    </header>

    <p v-if="loading && ecritures.length === 0" class="compta-message" role="status">Chargement du journal…</p>
    <div v-else-if="error" class="compta-message compta-error" role="alert">
      <p>{{ error }}</p>
      <button class="compta-button" type="button" @click="$emit('retry')">Réessayer</button>
    </div>
    <p v-else-if="ecritures.length === 0" class="compta-message" role="status">
      Aucune écriture : importez un fichier CSV pour alimenter le journal.
    </p>
    <p v-else-if="pieces.length === 0" class="compta-message" role="status">Aucune écriture ne correspond à ces filtres.</p>
    <template v-else>
      <div class="compta-table-scroll">
        <table class="compta-table shaded journal-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Jnl</th>
              <th scope="col">Pièce</th>
              <th scope="col">Compte</th>
              <th scope="col">Libellé</th>
              <th scope="col" class="amount">Débit</th>
              <th scope="col" class="amount">Crédit</th>
              <th scope="col">Lettrage</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="{ ligne, debutPiece } in lignesPage"
              :key="ligne.id"
              class="journal-row"
              :class="{ 'piece-start': debutPiece }"
            >
              <td>{{ formatJourMois(ligne.date) }}</td>
              <td>{{ ligne.journal }}</td>
              <td>{{ ligne.piece }}</td>
              <td>{{ ligne.compte }} {{ libelleCompte(ligne.compte) }}</td>
              <td class="wrap">{{ ligne.libelle }}</td>
              <td class="amount">{{ montant(ligne.debit) }}</td>
              <td class="amount">{{ montant(ligne.credit) }}</td>
              <td>
                <span v-if="ligne.lettrage" class="compta-code">{{ ligne.lettrage }}</span>
                <span v-else-if="isCompteLettrable(ligne.compte)" class="a-lettrer">À lettrer</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="journal-footer">
        <p class="journal-summary">
          {{ lignesPage.length }} lignes sur {{ filtrees.length }} · {{ piecesPage.length }} pièces sur {{ pieces.length }}
        </p>
        <div class="journal-pager">
          <button class="compta-button small" type="button" :disabled="page === 0" @click="page--">Précédent</button>
          <button class="compta-button small" type="button" :disabled="page >= pageCount - 1" @click="page++">Suivant</button>
        </div>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.journal-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.journal-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--field);
  border-radius: 999px;
  background: #fff;
  color: var(--ink-soft);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease;
}

.chip:hover {
  border-color: var(--brand);
}

.chip[aria-pressed='true'] {
  border-color: var(--brand);
  background: var(--brand);
  color: #fff;
  font-weight: 600;
}

.journal-search {
  box-sizing: border-box;
  width: 220px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--field);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 14px;
}

.journal-table {
  min-width: 860px;
}

.journal-row.piece-start td {
  border-top: 1px solid var(--line);
}

.a-lettrer {
  color: var(--muted);
  font-size: 12px;
}

.journal-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--line-soft);
}

.journal-summary {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.journal-pager {
  display: flex;
  gap: 8px;
}

@media (max-width: 700px) {
  .journal-search {
    width: 100%;
  }

  .journal-footer {
    padding: 14px 18px;
  }
}
</style>
