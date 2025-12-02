<template>
  <div class="row g-3">
    
    <!-- CARD ENTRATE -->
    <div class="col-6">
      <Card noPadding class="h-100 border-start border-4 border-success">
        <div class="p-3">
          <small class="text-muted fw-bold text-uppercase ls-1">Entrate Mese</small>
          <div v-if="loading" class="spinner-border spinner-border-sm text-success d-block mt-2"></div>
          <h4 v-else class="fw-bold text-dark mt-1 mb-0">
            <i class="bi bi-arrow-down-circle-fill text-success me-1"></i>
            {{ formatMoney(entrate) }}
          </h4>
        </div>
      </Card>
    </div>

    <!-- CARD USCITE -->
    <div class="col-6">
      <Card noPadding class="h-100 border-start border-4 border-danger">
        <div class="p-3">
          <small class="text-muted fw-bold text-uppercase ls-1">Uscite Mese</small>
          <div v-if="loading" class="spinner-border spinner-border-sm text-danger d-block mt-2"></div>
          <h4 v-else class="fw-bold text-dark mt-1 mb-0">
            <i class="bi bi-arrow-up-circle-fill text-danger me-1"></i>
            {{ formatMoney(uscite) }}
          </h4>
        </div>
      </Card>
    </div>

  </div>
</template>

<script setup>
import Card from '@/components/UI/Card/Card.vue'

defineProps({
  entrate: Number,
  uscite: Number,
  loading: Boolean
})

const formatMoney = (val) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}
</script>