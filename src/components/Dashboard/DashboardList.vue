<template>
  <div class="list-box">
    <!-- HEADER -->
    <div class="list-header">
      <div>
        <div class="list-title">Lista movimenti</div>
        <div class="list-subtitle">
          Utente: {{ activeUserLabel }}
        </div>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="list-body list-center">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- NESSUN DATO -->
    <div
      v-else-if="rows.length === 0"
      class="list-body list-center"
    >
      <p class="list-empty">Non ci sono movimenti da mostrare.</p>
    </div>

    <!-- LISTA -->
    <div v-else class="list-body">
      <div class="mov-list">
        <button
          v-for="row in rows"
          :key="row.id"
          type="button"
          class="mov-row"
          @click="openDetail(row)"
        >
          <div class="mov-main">
            <div class="mov-date">{{ formatDateShort(row.data) }}</div>
            <div class="mov-desc">
              {{ row.descrizione || 'Senza descrizione' }}
            </div>
            <div class="mov-meta">
              <span v-if="row.categoria" class="mov-pill">
                {{ row.categoria }}
              </span>
              <span v-if="row.conto" class="mov-pill alt">
                {{ row.conto }}
              </span>
            </div>
          </div>

          <div
            class="mov-amount"
            :class="{
              neg: isOut(row),
              pos: isIn(row)
            }"
          >
            {{ formatCurrency(row.importo) }}
          </div>
        </button>
      </div>
    </div>

    <!-- MODALE DETTAGLIO -->
    <div
      v-if="showDetail && selected"
      class="mov-modal-backdrop"
      @click.self="closeDetail"
    >
      <div class="mov-modal">
        <div class="mov-modal-header">
          <div class="mov-modal-title">
            Dettaglio movimento
          </div>
          <button
            type="button"
            class="btn-close"
            aria-label="Chiudi"
            @click="closeDetail"
          ></button>
        </div>

        <div class="mov-modal-body">
          <div class="mov-modal-amount" :class="{ neg: isOut(selected), pos: isIn(selected) }">
            {{ formatCurrency(selected.importo) }}
          </div>
          <div class="mov-modal-date">
            {{ formatDateLong(selected.data) }}
          </div>

          <dl class="mov-modal-info">
            <div>
              <dt>Descrizione</dt>
              <dd>{{ selected.descrizione || '—' }}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{{ selected.tipo || '—' }}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>{{ selected.categoria || '—' }}</dd>
            </div>
            <div>
              <dt>Conto</dt>
              <dd>{{ selected.conto || '—' }}</dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd>{{ selected.id }}</dd>
            </div>
          </dl>
        </div>

        <div class="mov-modal-footer">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            @click="closeDetail"
          >
            Chiudi
          </button>
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
    default: 'all'
  },
  view: {
    type: String,
    default: 'periodo'
  }
})

const profili = ref([])
const rows = ref([])
const loading = ref(false)
const error = ref(null)

const selected = ref(null)
const showDetail = ref(false)

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

    if (!err && data) profili.value = data
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
      .select('*')
      .order('data', { ascending: false })
      .limit(30)

    const ids = profiloIdsAttivi.value
    if (ids.length > 0) {
      query = query.in('user_id', ids)
    }

    const { data, error: err } = await query

    console.log('[Lista] righe:', data?.length || 0)

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

// ---------- UTIL ----------

function isOut (row) {
  const val = Number(row.importo) || 0
  return row.tipo === 'Uscita' || val < 0
}

function isIn (row) {
  const val = Number(row.importo) || 0
  return row.tipo === 'Entrata' || val > 0
}

function formatCurrency (value) {
  const num = Number(value) || 0
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(num)
}

function formatDateShort (value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short'
  })
}

function formatDateLong (value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function openDetail (row) {
  selected.value = row
  showDetail.value = true
}

function closeDetail () {
  showDetail.value = false
  selected.value = null
}
</script>

<style scoped>
.list-box {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
}

.list-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-empty {
  font-size: 0.85rem;
  color: #6b7280;
}

.mov-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 100%;
  overflow-y: auto;
}

.mov-row {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 6px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  text-align: left;
}

.mov-row:hover {
  background: #f3f4ff;
  border-color: #6366f1;
}

.mov-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mov-date {
  font-size: 0.7rem;
  color: #9ca3af;
}

.mov-desc {
  font-size: 0.85rem;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mov-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mov-pill {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
}

.mov-pill.alt {
  background: #ecfeff;
  color: #0e7490;
}

.mov-amount {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.mov-amount.pos {
  color: #16a34a;
}

.mov-amount.neg {
  color: #dc2626;
}

/* MODALE DETTAGLIO */
.mov-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.mov-modal {
  background: #ffffff;
  border-radius: 14px;
  padding: 12px 14px;
  max-width: 420px;
  width: calc(100% - 32px);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
}

.mov-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.mov-modal-title {
  font-size: 0.9rem;
  font-weight: 600;
}

.mov-modal-body {
  padding-top: 4px;
  padding-bottom: 6px;
}

.mov-modal-amount {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.mov-modal-amount.pos {
  color: #16a34a;
}

.mov-modal-amount.neg {
  color: #dc2626;
}

.mov-modal-date {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 8px;
}

.mov-modal-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  font-size: 0.8rem;
}

.mov-modal-info dt {
  font-weight: 600;
  color: #4b5563;
}

.mov-modal-info dd {
  margin: 0;
  color: #111827;
}

.mov-modal-footer {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}
</style>
