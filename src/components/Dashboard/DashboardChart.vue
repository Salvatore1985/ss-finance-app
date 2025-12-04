<template>
  <div class="chart-box">
    <!-- HEADER -->
    <div class="chart-header">
      <h6 class="chart-title">{{ titolo }}</h6>
      <div class="chart-subtitle">
        Utente: {{ activeUserLabel }}
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="chart-body">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- NESSUN DATO -->
    <div
      v-else-if="!hasData || chartData.labels.length === 0"
      class="chart-body"
    >
      <p class="chart-placeholder">
        Non ci sono abbastanza dati per generare il grafico.
      </p>
    </div>

    <!-- GRAFICO -->
    <div v-else class="chart-body chart-body-hasdata">
      <div class="chart-container">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'

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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  activeUser: {
    type: String,
    default: 'all' // 'all' | 'salvo' | 'sigi'
  },
  view: {
    type: String,
    default: 'periodo' // 'periodo' | 'conti' | 'tipo' | 'categorie' | 'tag'
  }
})

// ------------ STATO ------------
const profili = ref([])
const transazioni = ref([])
const loading = ref(false)
const error = ref(null)

const hasData = computed(
  () => transazioni.value && transazioni.value.length > 0
)

// ------------ LABEL UI ------------
const titolo = computed(() => {
  switch (props.view) {
    case 'periodo':
      return 'Andamento per periodo'
    case 'conti':
      return 'Distribuzione per conti e banche'
    case 'tipo':
      return 'Analisi per tipo di movimento'
    case 'categorie':
      return 'Analisi per categorie'
    case 'tag':
      return 'Analisi per tag'
    default:
      return 'Andamento generale'
  }
})

const activeUserLabel = computed(() => {
  if (props.activeUser === 'salvo') return 'Salvo'
  if (props.activeUser === 'sigi') return 'Sigi'
  return 'Tutti'
})

// ------------ FILTRO UTENTE SU PROFILI ------------
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

// ------------ CARICAMENTO DATI ------------
async function caricaProfiliSeNecessario () {
  if (profili.value.length > 0) return

  try {
    const { data, error: err } = await supabase
      .from('profili')
      .select('id, nome')

    if (!err && data) profili.value = data
  } catch (e) {
    console.error('Errore profili (chart):', e)
  }
}

async function caricaTransazioni () {
  loading.value = true
  error.value = null

  try {
    await caricaProfiliSeNecessario()

    // 👇 qui facciamo anche la JOIN con transazioni_tags → tags
    let query = supabase
      .from('transazioni')
      .select(`
        id,
        user_id,
        data,
        importo,
        tipo,
        categoria,
        conto,
        transazioni_tags (
          tag_id,
          tags (
            id,
            nome
          )
        )
      `)

    const ids = profiloIdsAttivi.value
    if (ids.length > 0) {
      query = query.in('user_id', ids)
    }

    // niente filtro su "stato" per ora, così sei sicuro di vedere tutto
    const { data, error: err } = await query

    console.log('[Chart] righe transazioni:', data?.length || 0)

    if (err) {
      console.error('Errore transazioni (chart):', err)
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

onMounted(() => {
  caricaTransazioni()
})

watch(
  () => props.activeUser,
  () => {
    caricaTransazioni()
  }
)

// ------------ BUILDER DATI PER OGNI VISTA ------------

// PERIODO: Entrate/Uscite per mese (ultimi 6 mesi)
function buildPeriodoData (rawData) {
  const mesiMap = {}

  rawData.forEach(t => {
    if (!t.data) return
    const d = new Date(t.data)
    if (Number.isNaN(d.getTime())) return

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    if (!mesiMap[key]) mesiMap[key] = { in: 0, out: 0 }

    const importo = Number(t.importo) || 0

    if (t.tipo === 'Entrata') {
      mesiMap[key].in += Math.abs(importo)
    } else if (t.tipo === 'Uscita') {
      mesiMap[key].out += Math.abs(importo)
    } else {
      if (importo >= 0) mesiMap[key].in += importo
      else mesiMap[key].out += Math.abs(importo)
    }
  })

  const keys = Object.keys(mesiMap)
  if (keys.length === 0) {
    return { labels: [], datasets: [] }
  }

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
}

// CONTI & BANCHE: top 5 conti
function buildContiData (rawData) {
  const contiMap = {}

  rawData.forEach(t => {
    const conto = (t.conto || 'Senza conto').trim() || 'Senza conto'
    if (!contiMap[conto]) contiMap[conto] = { in: 0, out: 0 }

    const importo = Number(t.importo) || 0

    if (t.tipo === 'Entrata') {
      contiMap[conto].in += Math.abs(importo)
    } else if (t.tipo === 'Uscita') {
      contiMap[conto].out += Math.abs(importo)
    } else {
      if (importo >= 0) contiMap[conto].in += importo
      else contiMap[conto].out += Math.abs(importo)
    }
  })

  const entries = Object.entries(contiMap)
  if (entries.length === 0) {
    return { labels: [], datasets: [] }
  }

  const top = entries
    .map(([conto, v]) => ({
      conto,
      in: v.in,
      out: v.out,
      total: v.in + v.out
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const labels = top.map(e => e.conto)
  const dataIn = top.map(e => e.in)
  const dataOut = top.map(e => e.out)

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
}

// TIPO DI ANALISI: totale Entrate vs Uscite
function buildTipoData (rawData) {
  let totIn = 0
  let totOut = 0

  rawData.forEach(t => {
    const val = Number(t.importo) || 0
    if (val >= 0) totIn += val
    else totOut += Math.abs(val)
  })

  if (totIn === 0 && totOut === 0) {
    return { labels: [], datasets: [] }
  }

  return {
    labels: ['Entrate', 'Uscite'],
    datasets: [
      {
        label: 'Totale',
        data: [totIn, totOut],
        backgroundColor: ['#10b981', '#6366f1'],
        borderRadius: 4
      }
    ]
  }
}

// CATEGORIE: top 6 categorie
function buildCategorieData (rawData) {
  const catMap = {}

  rawData.forEach(t => {
    const cat = (t.categoria || 'Senza categoria').trim() || 'Senza categoria'
    if (!catMap[cat]) catMap[cat] = { in: 0, out: 0 }

    const importo = Number(t.importo) || 0

    if (t.tipo === 'Entrata') {
      catMap[cat].in += Math.abs(importo)
    } else if (t.tipo === 'Uscita') {
      catMap[cat].out += Math.abs(importo)
    } else {
      if (importo >= 0) catMap[cat].in += importo
      else catMap[cat].out += Math.abs(importo)
    }
  })

  const entries = Object.entries(catMap)
  if (entries.length === 0) {
    return { labels: [], datasets: [] }
  }

  const top = entries
    .map(([categoria, v]) => ({
      categoria,
      in: v.in,
      out: v.out,
      total: v.in + v.out
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  const labels = top.map(e => e.categoria)
  const dataIn = top.map(e => e.in)
  const dataOut = top.map(e => e.out)

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
}

// TAG: top 8 tag usando la tabella transazioni_tags
function buildTagData (rawData) {
  const tagMap = {}

  rawData.forEach(t => {
    const relations = t.transazioni_tags || []
    const amount = Math.abs(Number(t.importo) || 0)

    relations.forEach(r => {
      const tagName = r.tags?.nome || 'Senza tag'
      if (!tagMap[tagName]) tagMap[tagName] = 0
      tagMap[tagName] += amount
    })
  })

  const entries = Object.entries(tagMap)
  if (entries.length === 0) {
    return { labels: [], datasets: [] }
  }

  const top = entries
    .map(([tag, val]) => ({ tag, val }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 8)

  const labels = top.map(e => e.tag)
  const dataVals = top.map(e => e.val)

  return {
    labels,
    datasets: [
      {
        label: 'Totale',
        backgroundColor: '#6366f1',
        data: dataVals,
        borderRadius: 4
      }
    ]
  }
}

// ------------ CHART DATA (sceglie il builder giusto) ------------
const chartData = computed(() => {
  const raw = transazioni.value || []

  if (raw.length === 0) {
    return { labels: [], datasets: [] }
  }

  if (props.view === 'conti') {
    return buildContiData(raw)
  }
  if (props.view === 'tipo') {
    return buildTipoData(raw)
  }
  if (props.view === 'categorie') {
    return buildCategorieData(raw)
  }
  if (props.view === 'tag') {
    return buildTagData(raw)
  }

  // default = periodo
  return buildPeriodoData(raw)
})

// ------------ OPZIONI CHART ------------
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
