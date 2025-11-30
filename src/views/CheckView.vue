<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const loading = ref(true)
const items = ref([]) // Conterrà oggetti { pending: ..., match: ... }

// --- CARICAMENTO ---
const loadChecks = async () => {
  loading.value = true
  items.value = []

  try {
    // 1. Prendi tutti i movimenti in attesa
    const { data: sospesi, error } = await supabase
      .from('transazioni')
      .select('*')
      .eq('stato', 'da_convalidare')
      .order('data', { ascending: false })

    if (error) throw error

    // 2. Per ogni sospeso, cerca se c'è un match nei confermati
    // (Stesso importo, stessa data, stesso conto)
    for (const p of sospesi) {
      const { data: matches } = await supabase
        .from('transazioni')
        .select('*')
        .eq('stato', 'confermato')
        .eq('data', p.data)
        .eq('importo', p.importo)
        .eq('conto', p.conto)
        .limit(1) // Ne prendiamo uno per semplicità

      items.value.push({
        pending: p,
        match: matches && matches.length > 0 ? matches[0] : null
      })
    }

  } catch (e) {
    alert("Errore caricamento: " + e.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadChecks()
})

// --- AZIONE: UNISCI (Vince il vecchio, il nuovo sparisce ma aggiorna note/tag) ---
const unisci = async (index) => {
  const item = items.value[index]
  const vecchio = item.match
  const nuovo = item.pending

  try {
    // 1. Uniamo i tag
    const tagsUniti = [...new Set([...(vecchio.tags || []), ...(nuovo.tags || [])])]
    
    // 2. Aggiorniamo il vecchio
    await supabase.from('transazioni').update({
      tags: tagsUniti,
      note: vecchio.note ? `${vecchio.note} | Check: Unito` : 'Check: Unito',
      // Se vuoi che il nuovo file sovrascriva, aggiungi qui file_url
    }).eq('id', vecchio.id)

    // 3. Cancelliamo il sospeso (perché l'abbiamo unito)
    await supabase.from('transazioni').delete().eq('id', nuovo.id)

    // Rimuovi dalla lista visiva
    items.value.splice(index, 1)

  } catch (e) {
    alert("Errore unione: " + e.message)
  }
}

// --- AZIONE: CONFERMA NUOVO (È un movimento legittimo, non un duplicato) ---
const confermaNuovo = async (index) => {
  const item = items.value[index]
  try {
    await supabase.from('transazioni')
      .update({ stato: 'confermato' })
      .eq('id', item.pending.id)
    
    items.value.splice(index, 1)
  } catch (e) {
    alert(e.message)
  }
}

// --- AZIONE: SCARTA (Era un errore, cancellalo) ---
const scarta = async (index) => {
  const item = items.value[index]
  if(!confirm("Eliminare definitivamente questo movimento importato?")) return

  try {
    await supabase.from('transazioni').delete().eq('id', item.pending.id)
    items.value.splice(index, 1)
  } catch (e) {
    alert(e.message)
  }
}
</script>

<template>
  <div class="container py-4">
    
    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold m-0"><i class="bi bi-check-circle-fill text-warning me-2"></i>Check</h4>
      <span class="badge bg-light text-dark border">{{ items.length }} da rivedere</span>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <!-- VUOTO -->
    <div v-else-if="items.length === 0" class="text-center py-5">
      <div class="bg-success text-white rounded-circle d-inline-flex p-4 mb-3 shadow-sm">
        <i class="bi bi-check-lg display-4"></i>
      </div>
      <h5>Tutto pulito!</h5>
      <p class="text-muted">Non ci sono movimenti in sospeso.</p>
      <button @click="$router.push('/')" class="btn btn-outline-dark rounded-pill px-4 mt-2">Torna alla Dashboard</button>
    </div>

    <!-- LISTA CARD -->
    <div v-else class="d-flex flex-column gap-3">
      
      <div v-for="(item, idx) in items" :key="item.pending.id" class="card border-0 shadow-sm overflow-hidden">
        
        <!-- HEADER CARD: INFO BASE -->
        <div class="card-header bg-white border-0 pt-3 pb-0 d-flex justify-content-between">
          <div class="fw-bold text-primary">{{ item.pending.data }}</div>
          <div class="fw-bold" :class="item.pending.tipo==='Uscita'?'text-dark':'text-success'">
            {{ item.pending.importo }} €
          </div>
        </div>

        <div class="card-body">
          
          <!-- SEZIONE CONFRONTO (Se c'è un match) -->
          <div v-if="item.match" class="row g-0 border rounded-3 mb-3 overflow-hidden">
            
            <!-- Lato SX: IL NUOVO (Sospeso) -->
            <div class="col-6 border-end p-2 bg-warning bg-opacity-10">
              <div class="badge bg-warning text-dark mb-1">In Sospeso</div>
              <div class="small fw-bold text-truncate">{{ item.pending.descrizione }}</div>
              <div class="small text-muted">{{ item.pending.categoria }}</div>
            </div>

            <!-- Lato DX: IL VECCHIO (Esistente) -->
            <div class="col-6 p-2 bg-light">
              <div class="badge bg-secondary mb-1">Già Presente</div>
              <div class="small fw-bold text-truncate text-muted">{{ item.match.descrizione }}</div>
              <div class="small text-muted">{{ item.match.categoria }}</div>
            </div>

          </div>

          <!-- SEZIONE SOLO NUOVO (Se non c'è match ma è sospeso per altri motivi) -->
          <div v-else class="mb-3">
            <h6 class="fw-bold">{{ item.pending.descrizione }}</h6>
            <span class="badge bg-light text-dark border">{{ item.pending.categoria }}</span>
            <span class="badge bg-light text-dark border ms-1">{{ item.pending.conto }}</span>
          </div>

          <!-- BOTTONI AZIONE -->
          <div class="d-flex gap-2">
            
            <!-- Tasto UNISCI (Solo se c'è match) -->
            <button v-if="item.match" @click="unisci(idx)" class="btn btn-dark flex-grow-1 fw-bold py-2 shadow-sm">
              <i class="bi bi-arrows-merge me-2"></i> Unisci
            </button>

            <!-- Tasto CONFERMA NUOVO (Se non c'è match o vuoi duplicare) -->
            <button v-else @click="confermaNuovo(idx)" class="btn btn-success flex-grow-1 fw-bold py-2 shadow-sm">
              <i class="bi bi-check-lg me-2"></i> Conferma
            </button>
            
            <!-- Tasto SCARTA -->
            <button @click="scarta(idx)" class="btn btn-outline-danger" title="Elimina">
              <i class="bi bi-trash"></i>
            </button>

            <!-- Se c'è match, mostriamo anche il tasto "Crea Nuovo" piccolo, per i casi rari -->
            <button v-if="item.match" @click="confermaNuovo(idx)" class="btn btn-outline-secondary" title="È un movimento diverso">
              <i class="bi bi-plus-lg"></i>
            </button>

          </div>

        </div>
      </div>

    </div>

  </div>
</template>