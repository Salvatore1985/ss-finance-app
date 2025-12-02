<template>
  <div class="chart-box">
    <!-- HEADER -->
    <div class="chart-header">
      <h6 class="chart-title">{{ titolo }}</h6>
      <div class="chart-subtitle">
        Utente: {{ activeUserLabel }}
      </div>
    </div>

    <!-- VISTE NON ANCORA IMPLEMENTATE -->
    <template v-if="view !== 'periodo'">
      <div class="chart-body">
        <p class="chart-placeholder">
          Per ora il grafico è disponibile solo per la vista
          <strong>Periodo</strong>.
        </p>
        <p class="chart-note">
          Seleziona "Periodo" nella colonna <strong>Vista</strong> a sinistra.
        </p>
      </div>
    </template>

    <!-- VISTA PERIODO: GRAFICO VERO -->
    <template v-else>
      <!-- Loading -->
      <div v-if="loading" class="chart-body">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <!-- Nessun dato -->
      <div v-else-if="!hasData" class="chart-body">
        <p class="chart-placeholder">
          Non ci sono abbastanza dati per generare il grafico.
        </p>
      </div>

      <!-- Grafico -->
      <div v-else class="chart-body chart-body-hasdata">
        <div class="chart-container">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'

// Chart.js + vue-chartjs
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

// Registriamo i componenti di Chart.js (come in ChartsSection.vue)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  activeUser: {
    type: String,
    default: 'all' // 'all' | 'salvo' | 'sigi'
  },
  view: {
    type: String,
    default: 'periodo' // 'periodo' | 'conti' | 'tipo' | 'categorie'
  }
})

// --- STATO DB ---
const profili = ref([])          // profili (Salvo, Sigi, ecc.)
const transazioni = ref([])      // transazioni filtrate per utente
const loading = ref(false)
const error = ref(null)

// --- LABEL TITOLO (in base alla vista) ---
const titolo = computed(() => {
  switch (props.view) {
    case 'periodo':
      return 'Andamento per periodo'
    case 'conti':
      return 'Distribuzione per conti e banche'
    case 'tipo':
      return 'Analisi per tipo di movimento'
    case 'categorie':
      return 'Analisi per categorie / tag'
    default:
      return 'Andamento generale'
  }
})

// --- LABEL UTENTE ATTIVO ---
const activeUserLabel = computed(() => {
  if (props.activeUser === 'salvo') return 'Salvo'
  if (props.activeUser === 'sigi') return 'Sigi'
  return 'Tutti'
})

// --- ID PROFILI ATTIVI (come nei KPI) ---
const profiloIdsAttivi = computed(() => {
  if (!profili.value || profili.value.length === 0) return []

  if (props.activeUser === 'all') {
    return profili.value.map(p => p.id)
  }

  const targetName = props.activeUser.toLowerCase()
  return profili.value
    .filter(p => p.nome && p.nome.toLowerCase().includes(targetName))
    .map(p => p.id)
})

// Abbiamo dati?
const hasData = computed(() => transazioni.value && transazioni.value.length > 0)

// --- CARICAMENTO PROFILI + TRANSAZIONI ---
async function caricaProfiliSeNecessario () {
  if (profili.value.length > 0) return

  try {
    const { data, error: err } = await supabase
      .from('profili')
      .select('id, nome')

    if (err) {
      console.error('Errore caricamento profili (chart):', err)
      return
    }
    if (data) profili.value = data
  } catch (e) {
    console.error('Errore generico profili (chart):', e)
  }
}

async function caricaTransazioni () {
  loading.value = true
  error.value = null

  try {
    await caricaProfiliSeNecessario()

    let query = supabase
      .from('transazioni')
      .select('id, data, importo, tipo, stato, user_id')

    const ids = profiloIdsAttivi.value
    if (ids.length > 0) {
      query = query.in('user_id', ids)
    }

    // prendiamo solo transazioni confermate
    query = query.eq('stato', 'confermato')

    const { data, error: err } = await query

    if (err) {
      console.error('Errore caricamento transazioni (chart):', err)
      error.value = 'DB'
      transazioni.value = []
      return
    }

    transazioni.value = data || []
  } catch (e) {
    console.error('Errore generico transazioni (chart):', e)
    error.value = 'GEN'
    transazioni.value = []
  } finally {
    loading.value = false
  }
}

// Primo caricamento
onMounted(() => {
  caricaTransazioni()
})

// Ricarica quando cambia utente (Tutti / Salvo / Sigi)
watch(
  () => props.activeUser,
  () => {
    caricaTransazioni()
  }
)

// --- LOGICA GRAFICO (solo vista "Periodo") ---
// Raggruppiamo per mese e calcoliamo Entrate/Uscite
const chartData = computed(() => {
  const rawData = transazioni.value
  const mesiMap = {}

  rawData.forEach(t => {
    if (!t.data) return
    const d = new Date(t.data)
    if (Number.isNaN(d.getTime())) return

    // chiave tipo "2024-03"
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    if (!mesiMap[key]) mesiMap[key] = { in: 0, out: 0 }

    const importo = Number(t.importo) || 0

    // Se nel DB hai il campo t.tipo ("Entrata"/"Uscita"), lo usiamo.
    // Se per qualche transazione manca, usiamo il segno dell'importo.
    if (t.tipo === 'Entrata') {
      mesiMap[key].in += Math.abs(importo)
    } else if (t.tipo === 'Uscita') {
      mesiMap[key].out += Math.abs(importo)
    } else {
      if (importo >= 0) mesiMap[key].in += importo
      else mesiMap[key].out += Math.abs(importo)
    }
  })

  // Se non ci sono valori, ritorna struttura vuota (evita errori)
  const keys = Object.keys(mesiMap)
  if (keys.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  // Ordino le chiavi e prendo gli ultimi 6 mesi
  const sortedKeys = keys.sort().slice(-6)

  const labels = sortedKeys.map(k => {
    const [y, m] = k.split('-')
    const date = new Date(Number(y), Number(m) - 1)
    return date.toLocaleString('it-IT', { month: 'short' })
  })

  const dataIn = sortedKeys.map(k => mesiMap[k].in)
  const dataOut = sortedKeys.map(k => mesiMap[k].out)

  return {
    labels,
    datasets: [
      {
        label: 'Entrate',
        backgroundColor: '#10b981',
        data: dataIn,
        borderRadius: 4
      },
      {
        label: 'Uscite',
        backgroundColor: '#6366f1',
        data: dataOut,
        borderRadius: 4
      }
    ]
  }
})

// Opzioni Chart.js (copiate/adattate da ChartsSection.vue)
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 16
      }
    },
    tooltip: {
      callbacks: {
        label (context) {
          const value = context.parsed.y || 0
          return `${context.dataset.label}: ${new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
          }).format(value)}`
        }
      }
    },
    title: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        font: { size: 11 },
        callback (value) {
          return new Intl.NumberFormat('it-IT', {
            maximumFractionDigits: 0
          }).format(value)
        }
      },
      grid: {
        color: '#e5e7eb'
      }
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } }
    }
  }
}
</script>

<style scoped>
.chart-box {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  border: 2px solid red;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
}

.chart-header {
  margin-bottom: 6px;
}

.chart-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: #0f172a;
}

.chart-subtitle {
  font-size: 0.75rem;
  color: #6b7280;
}

.chart-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.chart-body-hasdata {
  align-items: stretch;
}

.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.chart-placeholder {
  font-size: 0.9rem;
  color: #4b5563;
}

.chart-note {
  margin-top: 4px;
  font-size: 0.75rem;
  color: #9ca3af;
}
</style>
