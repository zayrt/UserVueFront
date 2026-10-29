<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BalanceTable from '../../components/BalanceTable.vue'
import { getBalance } from '../../services/comptabiliteService'
import type { Balance } from '../../types/comptabilite'

const balance = ref<Balance | null>(null)
const loading = ref(false)
const error = ref('')

async function loadBalance() {
  loading.value = true
  error.value = ''

  try {
    balance.value = await getBalance()
  } catch (requestError: unknown) {
    error.value = requestError instanceof Error ? requestError.message : 'Impossible de récupérer la balance.'
  } finally {
    loading.value = false
  }
}

onMounted(loadBalance)
</script>

<template>
  <header class="compta-page-header">
    <div>
      <p class="compta-page-context">Totaux et soldes par compte</p>
      <h1>Balance</h1>
    </div>
  </header>

  <BalanceTable :balance="balance" :loading="loading" :error="error" @retry="loadBalance" />
</template>
