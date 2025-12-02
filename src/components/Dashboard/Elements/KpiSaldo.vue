<template>
  <div class="dash-box kpi-card">
    <div v-if="loading" class="kpi-body text-muted small">
      Caricamento saldo...
    </div>

    <div v-else class="kpi-body">
      <div class="kpi-label">Saldo totale</div>

      <div
        class="kpi-value"
        :class="{ negative: saldo < 0 }"
      >
        {{ formattedSaldo }}
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
  saldo: {
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

const formattedSaldo = computed(() => {
  const num = Number(props.saldo) || 0
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(num)
})
</script>

<style scoped>
.kpi-card {
  align-items: stretch;
  background: rgba(255, 255, 255, 0.7);
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
  color: #16a34a; /* verde positivo */
}

.kpi-value.negative {
  color: #dc2626; /* rosso se negativo */
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
