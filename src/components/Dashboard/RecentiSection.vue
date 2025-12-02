<template>
  <Card title="Ultimi Movimenti">
    
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else-if="movimenti.length === 0" class="text-center py-4 text-muted">
      Nessun movimento recente.
    </div>

    <!-- Lista -->
    <div v-else class="list-group list-group-flush">
      <div 
        v-for="mov in movimenti" 
        :key="mov.id" 
        class="list-group-item px-0 py-3 border-bottom d-flex align-items-center justify-content-between"
      >
        
        <!-- Icona e Testo -->
        <div class="d-flex align-items-center gap-3">
          <!-- Icona Categoria -->
          <div 
            class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            :class="mov.tipo === 'Entrata' ? 'bg-success bg-opacity-10 text-success' : 'bg-primary bg-opacity-10 text-primary'"
            style="width: 40px; height: 40px;"
          >
            <!-- Qui potremmo mettere l'icona vera se salvata nel DB, per ora mettiamo generica -->
            <i :class="mov.tipo === 'Entrata' ? 'bi-graph-up-arrow' : 'bi-bag'"></i>
          </div>
          
          <div class="overflow-hidden">
            <h6 class="fw-bold mb-0 text-white text-truncate">{{ mov.descrizione }}</h6>
            <small class="text-muted">{{ formatDate(mov.data) }} • {{ mov.categoria }}</small>
          </div>
        </div>

        <!-- Importo -->
        <div class="fw-bold text-end ms-2" :class="mov.tipo === 'Entrata' ? 'text-success' : 'text-white'">
          {{ mov.tipo === 'Entrata' ? '+' : '-' }} {{ formatMoney(mov.importo) }}
        </div>

      </div>
    </div>

    <!-- Footer: Link a tutti i movimenti -->
    <template #footer>
      <router-link to="/movimenti" class="btn btn-light btn-sm w-100 fw-bold text-muted">
        Vedi tutti <i class="bi bi-chevron-right"></i>
      </router-link>
    </template>

  </Card>
</template>

<script setup>
import Card from '@/components/UI/Card/Card.vue'

defineProps({
  movimenti: Array,
  loading: Boolean
})

const formatMoney = (val) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

const formatDate = (dateString) => {
  const d = new Date(dateString)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}
</script>