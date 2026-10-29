<script setup lang="ts">
import { computed } from 'vue'
import type { Ecriture } from '../../types/comptabilite'
import { formatJourMois, formatMois } from '../../utils/compta'
import { formatSigne, toCents } from '../../utils/montant'

const props = defineProps<{
  // Lignes des comptes 512, dans l'ordre chronologique.
  mouvements: Ecriture[]
}>()

// On ne montre que le mois du dernier mouvement.
const mois = computed(() => props.mouvements.at(-1)?.date.slice(0, 7) ?? '')

const flux = computed(() => props.mouvements
  .filter((ligne) => ligne.date.startsWith(mois.value))
  .map((ligne) => ({ id: ligne.id, date: ligne.date, montant: toCents(ligne.debit) - toCents(ligne.credit) })))

const plusGrand = computed(() => flux.value.reduce((max, { montant }) => {
  const absolu = montant < 0n ? -montant : montant
  return absolu > max ? absolu : max
}, 0n))

const net = computed(() => flux.value.reduce((sum, { montant }) => sum + montant, 0n))

const titre = computed(() => {
  if (!mois.value) {
    return 'Flux bancaires'
  }
  const nom = formatMois(`${mois.value}-01`).split(' ')[0].toLowerCase()
  return `Flux bancaires ${/^[aeiouéh]/.test(nom) ? 'd’' : 'de '}${nom}`
})

function largeur(montant: bigint): string {
  if (plusGrand.value === 0n) {
    return '0%'
  }
  const absolu = montant < 0n ? -montant : montant
  return `${Number((absolu * 10000n) / plusGrand.value) / 100}%`
}
</script>

<template>
  <section class="compta-card padded flux-card" aria-labelledby="flux-title">
    <div class="flux-heading">
      <h2 id="flux-title">{{ titre }}</h2>
      <span v-if="flux.length > 0" class="compta-meta">Solde net {{ formatSigne(net) }}&nbsp;€</span>
    </div>

    <p v-if="flux.length === 0" class="compta-message">Aucun mouvement bancaire pour le moment.</p>
    <template v-else>
      <ul class="flux-list">
        <li v-for="ligne in flux" :key="ligne.id" class="flux-row">
          <span class="flux-date">{{ formatJourMois(ligne.date) }}</span>
          <span class="flux-track" aria-hidden="true">
            <span class="flux-bar" :class="{ outflow: ligne.montant < 0n }" :style="{ width: largeur(ligne.montant) }" />
          </span>
          <span class="flux-amount mono">{{ formatSigne(ligne.montant) }}</span>
        </li>
      </ul>

      <ul class="flux-legend" aria-label="Légende">
        <li><span class="swatch" aria-hidden="true" />Encaissement</li>
        <li><span class="swatch outflow" aria-hidden="true" />Décaissement</li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.flux-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.flux-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.flux-list,
.flux-legend {
  margin: 0;
  padding: 0;
  list-style: none;
}

.flux-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.flux-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.flux-date {
  width: 56px;
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 13px;
}

.flux-track {
  position: relative;
  height: 28px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  border-radius: 6px;
  background: var(--page);
}

.flux-bar {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 6px;
  background: var(--brand);
}

.flux-bar.outflow,
.swatch.outflow {
  background: var(--outflow);
}

.flux-amount {
  width: 120px;
  flex: 0 0 auto;
  font-size: 14px;
  text-align: right;
}

.flux-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  color: var(--muted);
  font-size: 13px;
}

.flux-legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--brand);
}

@media (max-width: 700px) {
  .flux-amount {
    width: 96px;
  }
}
</style>
