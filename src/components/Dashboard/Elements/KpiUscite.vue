<template>
  <div class="kpi-box">
    <div v-if="loading" class="kpi-body text-muted small">
      Caricamento uscite...
    </div>

    <div v-else class="kpi-body">
      <div class="kpi-label">Uscite totali</div>

      <div class="kpi-value kpi-value-out">
        {{ formattedTotale }}
      </div>

      <div class="kpi-sub">
        {{ activeUserLabel }}
      </div>

      <div v-if="error" class="kpi-error">
        Errore caricamento
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totale: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: [String, Boolean, Object, null],
    default: null
  },
  activeUserLabel: {
    type: String,
    default: ''
  }
})

const formattedTotale = computed(() => {
  const num = Number(props.totale) || 0
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(num)
})
</script>

<style scoped>
.kpi-box {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  border-radius: 12px;
  border: 2px solid red;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.kpi-body {
  width: 100%;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.kpi-value {
  font-size: 1.4rem;
  font-weight: 700;
}

.kpi-value-out {
  color: #f97316; /* arancio per le spese */
}

.kpi-sub {
  font-size: 0.75rem;
  color: #6b7280;
}

.kpi-error {
  margin-top: 4px;
  font-size: 0.7rem;
  color: #b91c1c;
}
</style>
