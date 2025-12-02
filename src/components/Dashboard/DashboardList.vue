<template>
  <div class="list-box">
    <!-- header -->
    <div class="list-header">
      <div class="list-title">Lista movimenti</div>
      <div class="list-subtitle">
        Utente: {{ activeUserLabel }}
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="list-body list-body-center">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- nessun dato -->
    <div v-else-if="!hasData" class="list-body list-body-center">
      <p class="list-empty">Non ci sono movimenti da mostrare.</p>
    </div>

    <!-- lista vera -->
    <div v-else class="list-body">
      <ul class="list">
        <li
          v-for="mov in movimenti"
          :key="mov.id"
          class="list-row"
        >
          <div class="list-main">
            <span class="list-date">{{ formatDate(mov.data) }}</span>
            <span class="list-label">
              {{ mov.tipo || 'Movimento' }}
            </span>
          </div>

          <div
            class="list-amount"
            :class="{
              positivo: mov.importo > 0,
              negativo: mov.importo < 0
            }"
          >
            {{ formatImporto(mov.importo) }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'

const props = defineProps({
  activeUser: {
    type: String,
    default: 'all'
  },
  view: {
    type: String,
    default: 'periodo' // per il futuro, se vuoi cambiare il tipo di lista
  }
})

const profili = ref([])
const rows = ref([])
const loading = ref(false)
const error = ref(null)

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

const hasData = computed(() => rows.value && rows.value.length > 0)

// ordino già lato DB, ma qui tengo la computed per eventuali trasformazioni
const movimenti = computed(() => rows.value || [])

onMounted(() => {
  caricaMovimenti()
})

watch(
  () => props.activeUser,
  () => {
    caricaMovimenti()
  }
)

async function caricaProfiliSeNecessario () {
  if (profili.value.length > 0) return

  try {
    const { data, error: err } = await supabase
      .from('profili')
      .select('id, nome')

    if (!err && data) {
      profili.value = data
    }
  } catch (e) {
    console.error('Errore profili (lista):', e)
  }
}

async function caricaMovimenti () {
  loading.value = true
  error.value = null

  try {
    await caricaProfiliSeNecessario()

    let query = supabase
      .from('transazioni')
      .select('id, data, importo, tipo, stato, user_id')
      .eq('stato', 'confermato')
      .order('data', { ascending: false })
      .limit(10) // ultimi 10 movimenti

    const ids = profiloIdsAttivi.value
    if (ids.length > 0) {
      query = query.in('user_id', ids)
    }

    const { data, error: err } = await query

    if (err) {
      console.error('Errore transazioni (lista):', err)
      error.value = 'DB'
      rows.value = []
      return
    }

    rows.value = data || []
  } catch (e) {
    console.error('Errore generico lista:', e)
    error.value = 'GEN'
    rows.value = []
  } finally {
    loading.value = false
  }
}

function formatDate (iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short'
  })
}

function formatImporto (value) {
  const num = Number(value) || 0
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(num)
}
</script>

<style scoped>
.list-box {
  /* si comporta come una dash-box: metà riga */
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;

  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
}

.list-header {
  margin-bottom: 6px;
}

.list-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.list-subtitle {
  font-size: 0.75rem;
  color: #6b7280;
}

.list-body {
  flex: 1 1 auto;
  overflow-y: auto;
}

.list-body-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.list-empty {
  font-size: 0.85rem;
  color: #6b7280;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.85rem;
}

.list-row:last-child {
  border-bottom: none;
}

.list-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.list-label {
  font-size: 0.85rem;
  color: #374151;
}

.list-amount {
  font-weight: 600;
  font-size: 0.9rem;
}

.list-amount.positivo {
  color: #16a34a;
}

.list-amount.negativo {
  color: #dc2626;
}
</style>
