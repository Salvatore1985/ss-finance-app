<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

import MovimentoInfo from '../components/Movimenti/MovimentoInfo.vue'
import ActionButtons from '../components/Movimenti/ActionButtons.vue'
import DettaglioMovimento from '../components/Movimenti/DettaglioMovimento.vue'
import NuovoMovimento from '../components/Movimenti/NuovoMovimento.vue'

const loading = ref(false)
const errore = ref('')
const movimenti = ref([])

const refDettaglio = ref(null)

// Carica movimenti dal DB
const caricaMovimenti = async () => {
  loading.value = true
  errore.value = ''

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error(authError)
    errore.value = 'Errore di autenticazione'
    loading.value = false
    return
  }

  if (!user) {
    movimenti.value = []
    loading.value = false
    return
  }

  const { data, error } = await supabase
    .from('transazioni')
    .select('id, data, descrizione, importo, tipo, categoria, categoria_banca, categoria_id, conto, tags, stato, note, file_url')
    .eq('user_id', user.id)
    .order('data', { ascending: false })
    .order('id', { ascending: false })
    .limit(200)

  if (error) {
    console.error(error)
    errore.value = 'Errore nel caricamento dei movimenti'
    movimenti.value = []
  } else {
    movimenti.value = (data || []).map(m => ({
      ...m,
      // mi assicuro che tags sia sempre un array
      tags: Array.isArray(m.tags) ? m.tags : (m.tags || [])
    }))
  }

  loading.value = false
}

// Apertura modale dettaglio
const apriDettaglio = (mov, mode = 'view') => {
  if (!refDettaglio.value) return
  refDettaglio.value.apri(mov, mode)
}

onMounted(caricaMovimenti)
</script>

<template>
  <!-- Layout verticale: header fisso + lista che scorre -->
  <div class="page-fixed-layout">
    
    <!-- HEADER -->
    <header class="page-header px-4 py-4 bg-white border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h3 class="fw-bold text-dark m-0">Movimenti</h3>
          <p class="text-muted small m-0">
            Lista completa transazioni (ultimi 200 movimenti)
          </p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-light border fw-bold shadow-sm">
            <i class="bi bi-funnel me-1"></i> Filtra
          </button>
          <button
            class="btn btn-outline-primary fw-bold shadow-sm"
            @click="$router.push('/importa')"
          >
            <i class="bi bi-upload me-1"></i> Importa estratto
          </button>
          <button
            class="btn btn-primary fw-bold shadow-sm"
            data-bs-toggle="modal"
            data-bs-target="#modalNuovo"
          >
            <i class="bi bi-plus-lg me-1"></i> Nuovo
          </button>
        </div>
      </div>
    </header>


    <!-- CONTENUTO SCORREVOLE -->
    <div class="page-content-scroll px-4 py-3">

      <!-- Stato / errori -->
      <div v-if="errore" class="alert alert-danger">
        {{ errore }}
      </div>

      <div v-else-if="loading" class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3"></div>
        <div>Caricamento movimenti...</div>
      </div>

      <div v-else-if="!movimenti.length" class="alert alert-light border text-center py-4">
        Nessun movimento trovato.
      </div>

      <!-- LISTA MOVIMENTI -->
      <div v-else class="d-flex flex-column gap-2">
        <div
          v-for="mov in movimenti"
          :key="mov.id"
          class="card border-0 shadow-sm"
        >
          <div class="card-body p-2 p-md-3">
            <MovimentoInfo
              :movimento="mov"
              show-tags
              show-attachments
            >
              <!-- Slot AZIONI a destra -->
              <template #actions>
                <ActionButtons
                  @view="apriDettaglio(mov, 'view')"
                  @edit="apriDettaglio(mov, 'edit')"
                  @split="apriDettaglio(mov, 'split')"
                />
              </template>
            </MovimentoInfo>
          </div>
        </div>
      </div>

      <!-- Spazio in fondo per non stare attaccato al bordo -->
      <div style="height: 40px;"></div>
    </div>

    <!-- MODALI -->
    <DettaglioMovimento ref="refDettaglio" @refresh="caricaMovimenti" />
    <NuovoMovimento @saved="caricaMovimenti" />
  </div>
</template>

<style scoped>
/* Struttura verticale: header fisso, lista che scorre */
.page-fixed-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* Header in alto, non si schiaccia */
.page-header {
  flex-shrink: 0;
  z-index: 10;
}

/* Corpo centrale con scroll interno */
.page-content-scroll {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;

  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.page-content-scroll::-webkit-scrollbar {
  width: 6px;
}
.page-content-scroll::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
</style>
