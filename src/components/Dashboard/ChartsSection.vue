<template>
  <Card title="Andamento Mensile">
    
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- Empty State (Se non ci sono dati) -->
    <div v-else-if="!hasData" class="text-center py-5 text-muted small">
      Non ci sono abbastanza dati per generare il grafico.
    </div>

    <!-- Grafico -->
    <div v-else class="chart-container" style="height: 250px; position: relative;">
      <Bar :data="chartData" :options="chartOptions" />
    </div>

  </Card>
</template>

<script setup>
import { computed } from 'vue'
import Card from '@/components/UI/Card/Card.vue'

// Importiamo i pezzi di Chart.js necessari
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar } from 'vue-chartjs'

// Registriamo i componenti di Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  transazioni: { type: Array, default: () => [] },
  loading: Boolean
})

// Verifica se abbiamo dati
const hasData = computed(() => props.transazioni && props.transazioni.length > 0)

// --- LOGICA DI ELABORAZIONE DATI ---
const chartData = computed(() => {
  const rawData = props.transazioni
  const mesiMap = {}

  // 1. Raggruppa i dati per mese (es. "2023-10")
  rawData.forEach(t => {
    const d = new Date(t.data)
    // Chiave ordinabile: "2023-11"
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    
    if (!mesiMap[key]) mesiMap[key] = { in: 0, out: 0 }
    
    if (t.tipo === 'Entrata') mesiMap[key].in += t.importo
    else mesiMap[key].out += t.importo
  })

  // 2. Ordina le chiavi (ultimi 6 mesi) e prepara gli array
  const sortedKeys = Object.keys(mesiMap).sort().slice(-6) // Prendi solo ultimi 6 mesi
  
  const labels = sortedKeys.map(k => {
    const [y, m] = k.split('-')
    const date = new Date(y, m - 1)
    // Restituisce "Ott", "Nov" etc.
    return date.toLocaleString('it-IT', { month: 'short' })
  })

  const dataIn = sortedKeys.map(k => mesiMap[k].in)
  const dataOut = sortedKeys.map(k => mesiMap[k].out)

  // 3. Struttura dati per Chart.js
  return {
    labels: labels,
    datasets: [
      {
        label: 'Entrate',
        backgroundColor: '#10b981', // Verde Success
        data: dataIn,
        borderRadius: 4
      },
      {
        label: 'Uscite',
        backgroundColor: '#6366f1', // Blu Primary
        data: dataOut,
        borderRadius: 4
      }
    ]
  }
})

// --- OPZIONI GRAFICO (Look & Feel) ---
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      ticks: { font: { size: 10 } }
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } }
    }
  }
}
</script>

<style scoped>
/* Assicura che il grafico non esploda su mobile */
.chart-container {
  width: 100%;
}
</style>