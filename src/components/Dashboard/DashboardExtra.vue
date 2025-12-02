<template>
  <div class="extra-content">
    <!-- Header -->
    <div class="extra-header">
      <div class="extra-title">Insight rapidi</div>
      <div class="extra-subtitle">
        Basati sulle transazioni (utente: {{ activeUserLabel }})
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="extra-body extra-center">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- Nessun dato -->
    <div v-else-if="!hasData" class="extra-body extra-center">
      <p class="extra-empty">Non ci sono dati sufficienti.</p>
    </div>

    <!-- Dati -->
    <div v-else class="extra-body">
      <div class="extra-grid">
        <!-- Spesa mese corrente -->
        <div class="extra-item">
          <div class="extra-label">Spesa mese corrente</div>
          <div class="extra-value negativo">
            {{ formatCurrency(spesaMeseCorrente) }}
          </div>
          <div class="extra-caption">
            {{ movimentiMeseCorrente }} movimenti
          </div>
        </div>

        <!-- Categoria top -->
        <div class="extra-item">
          <div class="extra-label">Categoria top (spesa)</div>
          <div class="extra-value">
            {{ topCategoria.nome || '—' }}
          </div>
          <div class="extra-caption" v-if="topCategoria.totale">
            {{ formatCurrency(topCategoria.totale) }}
          </div>
        </div>

        <!-- Conto più usato -->
        <div class="extra-item">
          <div class="extra-label">Conto più usato</div>
          <div class="extra-value">
            {{ topConto.nome || '—' }}
          </div>
          <div class="extra-caption" v-if="topConto.movimenti">
            {{ topConto.movimenti }} movimenti
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'

const props = defineProps({
  activeUser: {
    type: String,
    default: 'all' // 'all' | 'salvo' | 'sigi'
  }
})

const profili = ref([])
const transazioni = ref([])
const loading = ref(false)
const error = ref(null)

const hasData = computed(
  () => transazioni.value && transazioni.value.length > 0
)

const activeUserLabel = computed(() => {
  if (props.activeUser === 'salvo') return 'Salvo'
  if (props.activeUser === 'sigi') return 'Sigi'
  return 'Tutti'
})

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

onMounted(() => {
  caricaTransazioniExtra()
})

watch(
  () => props.activeUser,
  () => {
    caricaTransazioniExtra()
  }
)

async function caricaProfiliSeNecessario () {
  if (profili.value.length > 0) return

  try {
    const { data, error: err } = await supabase
      .from('profili')
      .select('id, nome')

    if (!err && data) profili.value = data
  } catch (e) {
    console.error('[EXTRA] errore profili:', e)
  }
}

async function caricaTransazioniExtra () {
  loading.value = true
  error.value = null

  try {
    await caricaProfiliSeNecessario()

    let query = supabase
      .from('transazioni')
      .select('*') // prendiamo tutte le colonne (data, importo, categoria, conto, tipo...)

    const ids = profiloIdsAttivi.value
    if (ids.length > 0) {
      query = query.in('user_id', ids)
    }

    const { data, error: err } = await query

    console.log('[EXTRA] righe transazioni:', data?.length || 0)

    if (err) {
      console.error('[EXTRA] errore transazioni:', err)
      error.value = 'DB'
      transazioni.value = []
      return
    }

    transazioni.value = data || []
  } catch (e) {
    console.error('[EXTRA] errore generico:', e)
    error.value = 'GEN'
    transazioni.value = []
  } finally {
    loading.value = false
  }
}

// ---------- COMPUTED INSIGHT ----------

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth()

const movimentiMese = computed(() => {
  return (transazioni.value || []).filter(t => {
    if (!t.data) return false
    const d = new Date(t.data)
    if (Number.isNaN(d.getTime())) return false
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth
  })
})

const spesaMeseCorrente = computed(() => {
  return movimentiMese.value.reduce((acc, t) => {
    const val = Number(t.importo) || 0
    if (t.tipo === 'Uscita' || val < 0) {
      return acc + Math.abs(val)
    }
    return acc
  }, 0)
})

const movimentiMeseCorrente = computed(
  () => movimentiMese.value.length
)

const topCategoria = computed(() => {
  const map = {}

  ;(transazioni.value || []).forEach(t => {
    const cat = (t.categoria || 'Senza categoria').trim() || 'Senza categoria'
    const val = Number(t.importo) || 0

    // consideriamo solo la spesa
    if (!(t.tipo === 'Uscita' || val < 0)) return

    if (!map[cat]) map[cat] = 0
    map[cat] += Math.abs(val)
  })

  const entries = Object.entries(map)
  if (entries.length === 0) {
    return { nome: '', totale: 0 }
  }

  const [nome, totale] = entries.reduce(
    (best, curr) => (curr[1] > best[1] ? curr : best),
    entries[0]
  )

  return { nome, totale }
})

const topConto = computed(() => {
  const map = {}

  ;(transazioni.value || []).forEach(t => {
    const conto = (t.conto || 'Senza conto').trim() || 'Senza conto'
    const val = Math.abs(Number(t.importo) || 0)

    if (!map[conto]) {
      map[conto] = { movimenti: 0, totale: 0 }
    }

    map[conto].movimenti += 1
    map[conto].totale += val
  })

  const entries = Object.entries(map)
  if (entries.length === 0) {
    return { nome: '', movimenti: 0, totale: 0 }
  }

  const [nome, info] = entries.reduce(
    (best, curr) => (curr[1].movimenti > best[1].movimenti ? curr : best),
    entries[0]
  )

  return { nome, movimenti: info.movimenti, totale: info.totale }
})

// ---------- FORMATTING ----------
function formatCurrency (value) {
  const num = Number(value) || 0
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(num)
}
</script>

<style scoped>
.extra-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.extra-header {
  margin-bottom: 6px;
}

.extra-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.extra-subtitle {
  font-size: 0.75rem;
  color: #6b7280;
}

.extra-body {
  flex: 1 1 auto;
}

.extra-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.extra-empty {
  font-size: 0.85rem;
  color: #6b7280;
}

.extra-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  height: 100%;
}

.extra-item {
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.extra-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
}

.extra-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.extra-value.negativo {
  color: #dc2626;
}

.extra-caption {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Responsive: su schermi stretti mettiamo gli item uno sotto l’altro */
@media (max-width: 992px) {
  .extra-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 576px) {
  .extra-grid {
    grid-template-columns: 1fr;
  }
}
</style>
