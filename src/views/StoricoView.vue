<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../supabase'
import DettaglioMovimento from '../components/DettaglioMovimento.vue'
import ActionButtons from '../components/ActionButtons.vue'
import MovimentoInfo from '../components/MovimentoInfo.vue'

// --- STATO ---
const loading = ref(false)
const movimenti = ref([])
const expandedRows = ref(new Set())
const refDettaglio = ref(null)

// Dati grezzi per i filtri
const options = ref({
  conti: [],
  categorie: [],
  tags: [] 
})

// Gestione Suggerimenti Ricerca (Custom)
const allDescriptions = ref([]) // Tutte le descrizioni uniche
const filteredSuggestions = ref([]) // Quelle che matchano mentre scrivi
const showSuggestions = ref(false)

// Filtri Attivi
const filters = ref({
  keyword: '',
  dateStart: '',
  dateEnd: '',
  tipo: 'Tutti',
  conto: '',
  categoria: '',
  tags: [] // Array per selezione multipla
})

// --- CALCOLI ---
const totaleFiltrato = computed(() => {
  return movimenti.value.reduce((acc, m) => {
    return m.tipo === 'Entrata' 
      ? acc + parseFloat(m.importo) 
      : acc - parseFloat(m.importo)
  }, 0).toFixed(2)
})

// --- LOGICA SUGGERIMENTI CUSTOM ---
const onSearchInput = () => {
  if (filters.value.keyword.length < 2) {
    showSuggestions.value = false
    return
  }
  const k = filters.value.keyword.toLowerCase()
  filteredSuggestions.value = allDescriptions.value
    .filter(d => d.toLowerCase().includes(k))
    .slice(0, 5) // Mostra max 5 suggerimenti
  
  showSuggestions.value = filteredSuggestions.value.length > 0
}

const selectSuggestion = (text) => {
  filters.value.keyword = text
  showSuggestions.value = false
  cerca()
}

// --- LOGICA TAG (SELETTORI VELOCI) ---
const toggleTag = (tagName) => {
  const index = filters.value.tags.indexOf(tagName)
  if (index === -1) {
    filters.value.tags.push(tagName) // Aggiungi
  } else {
    filters.value.tags.splice(index, 1) // Rimuovi
  }
}

// --- WATCHERS ---
watch(() => filters.value.dateStart, (newVal) => {
  if (newVal && filters.value.dateEnd && newVal > filters.value.dateEnd) {
    filters.value.dateEnd = newVal
  }
})

// --- CARICAMENTO DATI ---
onMounted(async () => {
  // 1. Carica opzioni
  const p1 = supabase.from('conti').select('nome').order('nome')
  const p2 = supabase.from('categorie').select('nome').order('nome')
  const p3 = supabase.from('tags').select('nome').order('nome')
  // 2. Carica descrizioni per autocomplete (ultimi 1000)
  const p4 = supabase.from('transazioni').select('descrizione').order('data', { ascending: false }).limit(1000)
  
  const [resConti, resCat, resTags, resDesc] = await Promise.all([p1, p2, p3, p4])
  
  if (resConti.data) options.value.conti = resConti.data
  if (resCat.data) options.value.categorie = resCat.data
  if (resTags.data) options.value.tags = resTags.data
  
  if (resDesc.data) {
    const unique = new Set(resDesc.data.map(d => d.descrizione))
    allDescriptions.value = Array.from(unique)
  }

  cerca()
})

// --- RICERCA ---
const cerca = async () => {
  showSuggestions.value = false // Chiudi tendina se aperta
  loading.value = true
  try {
    let query = supabase
      .from('transazioni')
      .select('*')
      .order('data', { ascending: false })
      .limit(200)

    // RICERCA AVANZATA (OR su più campi)
    if (filters.value.keyword.trim()) {
      const escapeForIlike = (text) => text
        .replaceAll('*', '\\*')
        .replaceAll('%', '\\%')
        .replaceAll('_', '\\_')
        .replaceAll(',', '\\,')

      const kw = escapeForIlike(filters.value.keyword.trim())
      // Cerca in descrizione, note, conto e categoria
      query = query.or(
        `descrizione.ilike.*${kw}*,note.ilike.*${kw}*,conto.ilike.*${kw}*,categoria.ilike.*${kw}*`
      )
    }

    // Filtri Standard
    if (filters.value.dateStart) query = query.gte('data', filters.value.dateStart)
    if (filters.value.dateEnd) query = query.lte('data', filters.value.dateEnd)
    if (filters.value.tipo !== 'Tutti') query = query.eq('tipo', filters.value.tipo)
    if (filters.value.conto) query = query.eq('conto', filters.value.conto)
    if (filters.value.categoria) query = query.eq('categoria', filters.value.categoria)
    
    // Filtro Tags (Overlaps)
    if (filters.value.tags.length > 0) {
      query = query.overlaps('tags', filters.value.tags)
    }

    const { data, error } = await query
    if (error) throw error
    movimenti.value = data

  } catch (e) {
    alert("Errore: " + e.message)
  } finally {
    loading.value = false
  }
}

// Utils
const setOggi = () => {
  const today = new Date().toISOString().split('T')[0]
  filters.value.dateStart = today
  filters.value.dateEnd = today
  cerca()
}
const toggleExpand = (id) => {
  if (expandedRows.value.has(id)) expandedRows.value.delete(id)
  else expandedRows.value.add(id)
}

// Wrapper per le funzioni del modale
const apriVisualizza = (mov) => { if (refDettaglio.value) refDettaglio.value.apri(mov, 'view') }
const apriModifica = (mov) => { if (refDettaglio.value) refDettaglio.value.apri(mov, 'edit') }
const apriDividi = (mov) => { if (refDettaglio.value) refDettaglio.value.apri(mov, 'split') }
</script>

<template>
  <div class="d-flex flex-column h-100 container py-1" style="max-height: calc(100vh - 80px);">
    
    <!-- === SEZIONE FILTRI FISSA === -->
    <div class="flex-shrink-0 mb-2">
      
      <div class="card border-0 shadow-sm p-2 bg-white">
        
        <!-- 1. RICERCA CON SUGGERIMENTI CUSTOM -->
        <div class="position-relative mb-2">
          <div class="input-group shadow-sm" style="border-radius: 10px; overflow: hidden;">
            <span class="input-group-text bg-white border-end-0"><i class="bi bi-search"></i></span>
            <input 
              v-model="filters.keyword" 
              @input="onSearchInput"
              type="text" 
              class="form-control border-start-0" 
              placeholder="Cerca movimento..." 
              @keyup.enter="cerca"
            >
          </div>
          
          <!-- Lista Suggerimenti (Appare sopra tutto) -->
          <ul v-if="showSuggestions" class="list-group position-absolute w-100 shadow-lg mt-1" style="z-index: 1000; border-radius: 10px;">
            <li 
              v-for="s in filteredSuggestions" 
              :key="s" 
              class="list-group-item list-group-item-action cursor-pointer"
              @click="selectSuggestion(s)"
            >
              <i class="bi bi-clock-history text-muted me-2 small"></i> {{ s }}
            </li>
          </ul>
        </div>

        <!-- 2. DATE -->
        <div class="row g-2 mb-2">
          <div class="col-5">
            <div class="form-control d-flex flex-column justify-content-center px-2 py-1 bg-light border-0">
              <label class="small text-muted" style="font-size: 0.6rem;">DA</label>
              <input v-model="filters.dateStart" type="date" class="bg-transparent border-0 p-0 fw-bold w-100 small-date">
            </div>
          </div>
          <div class="col-5">
            <div class="form-control d-flex flex-column justify-content-center px-2 py-1 bg-light border-0">
              <label class="small text-muted" style="font-size: 0.6rem;">A</label>
              <input v-model="filters.dateEnd" :min="filters.dateStart" type="date" class="bg-transparent border-0 p-0 fw-bold w-100 small-date">
            </div>
          </div>
          <div class="col-2">
            <button @click="setOggi" class="btn btn-white border w-100 h-100 d-flex flex-column align-items-center justify-content-center p-0">
              <span style="font-size: 0.6rem;">OGGI</span>
            </button>
          </div>
        </div>

        <!-- 3. SELECT FILTRI (Conto, Cat) -->
        <div class="d-flex gap-2 mb-2">
          <select v-model="filters.tipo" class="form-select form-select-sm" style="width: auto;">
            <option>Tutti</option><option>Uscita</option><option>Entrata</option>
          </select>
          <select v-model="filters.conto" class="form-select form-select-sm">
            <option value="">Tutti i Conti</option>
            <option v-for="c in options.conti" :key="c.nome" :value="c.nome">{{ c.nome }}</option>
          </select>
          <select v-model="filters.categoria" class="form-select form-select-sm">
            <option value="">Tutte le Cat.</option>
            <option v-for="c in options.categorie" :key="c.nome" :value="c.nome">{{ c.nome }}</option>
          </select>
        </div>

        <!-- 4. SELETTORI TAG (SCORREVOLI) -->
        <div v-if="options.tags.length > 0" class="border-top pt-2 mt-2">
          <div class="small text-muted fw-bold mb-1" style="font-size: 0.7rem;">FILTRA PER TAG (Seleziona più di uno)</div>
          <div class="d-flex gap-2 overflow-auto pb-2 no-scrollbar">
            
            <button 
              v-for="t in options.tags" 
              :key="t.nome"
              @click="toggleTag(t.nome)"
              class="btn btn-sm rounded-pill text-nowrap px-3 d-flex align-items-center transition-all"
              :class="filters.tags.includes(t.nome) ? 'btn-warning text-dark border-warning fw-bold shadow-sm' : 'btn-outline-secondary border-0 bg-light text-muted'"
            >
              <i class="bi me-1" :class="filters.tags.includes(t.nome) ? 'bi-check-circle-fill' : 'bi-circle'"></i>
              {{ t.nome }}
            </button>

          </div>
        </div>

        <button @click="cerca" class="btn btn-primary w-100 mt-2 fw-bold shadow-sm">
          CERCA
        </button>
      </div>

      <!-- HEADER RISULTATI -->
      <div class="d-flex justify-content-between align-items-end mt-3 px-1">
        <div class="text-muted small">{{ movimenti.length }} risultati</div>
        <div class="fw-bold fs-5 text-dark">Tot: {{ totaleFiltrato }} €</div>
      </div>
    </div>

    <!-- === LISTA SCORREVOLE === -->
    <div class="flex-grow-1 overflow-auto rounded-3 border bg-white shadow-sm position-relative">
      
      <div v-if="loading" class="position-absolute top-50 start-50 translate-middle">
        <div class="spinner-border text-primary"></div>
      </div>

      <div v-else-if="movimenti.length === 0" class="text-center py-5 text-muted">
        <i class="bi bi-search display-6 mb-2 d-block opacity-25"></i>
        Nessun movimento trovato.
      </div>

      <div v-else class="list-group list-group-flush">
        <!-- NOTA: Qui uso il tuo componente MovimentoInfo -->
        <div v-for="mov in movimenti" :key="mov.id" class="list-group-item p-3 border-light border-3">
          <MovimentoInfo
            :movimento="mov"
            :expanded="expandedRows.has(mov.id)"
            date-variant="long"
            amount-mode="raw"
            :show-tags="true"
            :show-attachments="true"
            @toggle="toggleExpand(mov.id)"
          >
            <!-- Slot per i bottoni azioni -->
            <template #actions>
              <div class="d-flex flex-column align-items-end gap-2">
                <ActionButtons
                  @view="apriVisualizza(mov)"
                  @edit="apriModifica(mov)"
                  @split="apriDividi(mov)"
                />
              </div>
            </template>
          </MovimentoInfo>
        </div>
      </div>
    </div>

    <!-- Modale Dettaglio (gestisce le azioni reali) -->
    <DettaglioMovimento ref="refDettaglio" @refresh="cerca" />

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.small-date { font-size: 0.8rem; outline: none; }
.cursor-pointer { cursor: pointer; }
.transition-all { transition: all 0.2s ease; }
</style>