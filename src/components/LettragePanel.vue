<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Ecriture } from '../types/comptabilite'
import { formatJourMois } from '../utils/compta'
import { formatEuros, toCents } from '../utils/montant'

const props = defineProps<{
  compte: string
  ecritures: Ecriture[]
  busy: boolean
}>()

const emit = defineEmits<{
  lettrer: [ecritureIds: number[]]
  delettrer: [code: string]
}>()

const selection = ref<number[]>([])

const selected = computed(() => props.ecritures.filter((ecriture) => selection.value.includes(ecriture.id)))
const totalDebit = computed(() => selected.value.reduce((sum, ecriture) => sum + toCents(ecriture.debit), 0n))
const totalCredit = computed(() => selected.value.reduce((sum, ecriture) => sum + toCents(ecriture.credit), 0n))
const ecart = computed(() => totalDebit.value - totalCredit.value)
const canLettrer = computed(() => selected.value.length >= 2 && ecart.value === 0n && !props.busy)

const aide = computed(() => {
  if (selected.value.length < 2) {
    return 'Sélectionnez au moins une facture et un règlement'
  }
  return ecart.value === 0n ? 'Sélection équilibrée : vous pouvez la lettrer.' : 'Le débit et le crédit de la sélection doivent s’équilibrer'
})

// Nouvelle liste (changement de compte, rechargement après lettrage) : la sélection n'a plus de sens.
watch(() => props.ecritures, () => {
  selection.value = []
})

function montant(value: string): string {
  return toCents(value) > 0n ? formatEuros(value) : ''
}

function handleLettrer() {
  if (canLettrer.value) {
    emit('lettrer', [...selection.value])
  }
}
</script>

<template>
  <section class="compta-card" aria-labelledby="lettrage-title">
    <header class="compta-card-header">
      <div>
        <h2 id="lettrage-title">Lignes du compte {{ compte }}</h2>
        <p class="compta-subtitle">Cochez une facture et son règlement : si la somme est nulle, vous pouvez les lettrer.</p>
      </div>
    </header>

    <p v-if="ecritures.length === 0" class="compta-message" role="status">Aucune écriture sur ce compte.</p>
    <div v-else class="compta-table-scroll">
      <table class="compta-table shaded lettrage-table">
        <thead>
          <tr>
            <th scope="col" class="select-cell"><span class="visually-hidden">Sélection</span></th>
            <th scope="col">Date</th>
            <th scope="col">Pièce</th>
            <th scope="col">Libellé</th>
            <th scope="col" class="amount">Débit</th>
            <th scope="col" class="amount">Crédit</th>
            <th scope="col">Code</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ecriture in ecritures"
            :key="ecriture.id"
            class="lettrage-row"
            :class="{ lettree: ecriture.lettrage, selected: selection.includes(ecriture.id) }"
          >
            <td class="select-cell">
              <input
                :id="`ecriture-${ecriture.id}`"
                v-model="selection"
                class="lettrage-checkbox"
                type="checkbox"
                :value="ecriture.id"
                :disabled="ecriture.lettrage !== null || busy"
              >
            </td>
            <td>{{ formatJourMois(ecriture.date) }}</td>
            <td>{{ ecriture.piece }}</td>
            <td class="wrap">
              <label :for="`ecriture-${ecriture.id}`">{{ ecriture.libelle }}</label>
            </td>
            <td class="amount">{{ montant(ecriture.debit) }}</td>
            <td class="amount">{{ montant(ecriture.credit) }}</td>
            <td>
              <button
                v-if="ecriture.lettrage"
                class="compta-code code-button"
                type="button"
                :title="`Délettrer le code ${ecriture.lettrage}`"
                :aria-label="`Délettrer le code ${ecriture.lettrage}`"
                :disabled="busy"
                @click="emit('delettrer', ecriture.lettrage)"
              >
                {{ ecriture.lettrage }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="selection-bar">
      <div>
        <p class="selection-summary" aria-live="polite">
          {{ selected.length }} ligne(s) sélectionnée(s) · écart
          <span class="mono" :class="{ 'ecart-non-nul': ecart !== 0n }">{{ formatEuros(ecart) }}</span>
        </p>
        <p class="selection-hint">{{ aide }}</p>
      </div>
      <button class="compta-button primary large lettrer-button" type="button" :disabled="!canLettrer" @click="handleLettrer">
        {{ busy ? 'Enregistrement…' : 'Lettrer la sélection' }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.lettrage-table {
  min-width: 640px;
}

.lettrage-table td {
  padding-block: 14px;
}

.select-cell {
  width: 40px;
  padding-left: 18px;
}

.lettrage-checkbox {
  display: block;
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--brand);
  cursor: pointer;
}

.lettrage-checkbox:disabled {
  cursor: not-allowed;
}

.lettrage-table label {
  cursor: pointer;
}

.lettrage-row.lettree td {
  color: var(--subtle);
}

.lettrage-row.selected td {
  background: var(--brand-wash);
}

.code-button {
  border: 0;
  cursor: pointer;
}

.code-button:hover:not(:disabled) {
  background: var(--warn-wash);
  color: var(--warn-ink);
  text-decoration: line-through;
}

.selection-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 24px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface-alt);
}

.selection-summary {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 600;
}

.selection-summary .mono {
  font-weight: 500;
}

.ecart-non-nul {
  color: var(--warn);
}

.selection-hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 700px) {
  .selection-bar {
    padding: 14px 18px;
  }
}
</style>
