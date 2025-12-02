<template>
  <Card variant="primary" title="Saldo Attuale" subtitle="Patrimonio Netto">
    <!-- Se carica mostra spinner, altrimenti il numero -->
    <div v-if="loading" class="spinner-border text-white mt-2" role="status"></div>
    <h2 v-else class="display-4 fw-bold mt-2">
      {{ formatMoney(saldo) }}
    </h2>

    <template #header>
      <div class="bg-white bg-opacity-25 p-2 rounded-circle">
        <i class="bi bi-wallet2 fs-4 text-white"></i>
      </div>
    </template>
  </Card>
</template>

<script setup>
import Card from '@/components/UI/Card/Card.vue'

defineProps({
  saldo: Number,
  loading: Boolean
})

const formatMoney = (val) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}
</script>