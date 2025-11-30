<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import DettaglioMovimento from '../components/DettaglioMovimento.vue'

const movimenti = ref([])
const caricamento = ref(true)
const refDettaglio = ref(null)

const getMovimenti = async () => {
  try {
    caricamento.value = true
    let { data, error } = await supabase
      .from('transazioni')
      .select('*')
      .order('data', { ascending: false })
      .limit(100)

    if (error) throw error
    movimenti.value = data
  } catch (error) {
    console.error(error)
  } finally {
    caricamento.value = false
  }
}

// Funzioni specifiche per i 3 bottoni
const vediDettaglio = (mov) => {
  refDettaglio.value.apri(mov, 'view') // Apre in lettura (Occhio)
}

const modificaMovimento = (mov) => {
  refDettaglio.value.apri(mov, 'edit') // Apre in modifica (Matita)
}

const dividiMovimento = (mov) => {
  refDettaglio.value.apri(mov, 'split') // Apre in split (Forbice)
}

onMounted(() => {
  getMovimenti()
})
</script>

<template>
  <div class="container py-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold m-0">Movimenti</h4>
      <span class="badge bg-light text-muted border">{{ movimenti.length }} transazioni</span>
    </div>

    <div v-if="caricamento" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else class="card border-0 shadow-sm">
      <div class="list-group list-group-flush">
        
        <!-- NOTA: Ho tolto @click dalla riga intera -->
        <div 
          v-for="mov in movimenti" 
          :key="mov.id" 
          class="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-center py-3 border-light gap-3"
        >
          
          <!-- PARTE SINISTRA (Icona e Testo) -->
          <div class="d-flex align-items-center w-100">
            <div class="rounded-circle bg-light p-2 me-3 d-flex justify-content-center align-items-center shadow-sm" style="width: 45px; height: 45px; flex-shrink: 0;">
              <i class="bi fs-5" 
                 :class="mov.tipo === 'Entrata' ? 'bi-piggy-bank-fill text-success' : 'bi-bag-fill text-primary'">
              </i>
            </div>
            
            <div class="flex-grow-1 min-width-0"> <!-- min-width-0 serve per il text-truncate -->
              <div class="d-flex justify-content-between align-items-center">
                <div class="fw-bold text-dark text-truncate pe-2">{{ mov.descrizione }}</div>
                <!-- Importo visibile subito -->
                <div class="fw-bold text-nowrap" :class="mov.tipo === 'Uscita' ? 'text-dark' : 'text-success'">
                  {{ mov.tipo === 'Uscita' ? '-' : '+' }} {{ parseFloat(mov.importo).toFixed(2) }} €
                </div>
              </div>
              
              <div class="small text-muted d-flex align-items-center gap-2 mt-1">
                <span class="badge bg-secondary bg-opacity-10 text-secondary border fw-medium" style="font-size: 0.7rem;">{{ mov.categoria }}</span>
                <span>{{ new Date(mov.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) }}</span>
              </div>
            </div>
          </div>

          <!-- PARTE DESTRA (I 3 BOTTONI) -->
          <!-- d-flex gap-2: mette i bottoni vicini -->
          <div class="d-flex gap-2 justify-content-end w-100 w-md-auto mt-2 mt-md-0">
            
            <!-- 1. OCCHIO (Vedi) -->
            <button @click="vediDettaglio(mov)" class="btn btn-white border shadow-sm btn-action text-primary" title="Dettaglio">
              <i class="bi bi-eye"></i>
            </button>

            <!-- 2. MATITA (Modifica) -->
            <button @click="modificaMovimento(mov)" class="btn btn-white border shadow-sm btn-action text-dark" title="Modifica">
              <i class="bi bi-pencil"></i>
            </button>

            <!-- 3. FORBICE (Dividi) -->
            <button @click="dividiMovimento(mov)" class="btn btn-white border shadow-sm btn-action text-dark" title="Dividi">
              <i class="bi bi-scissors"></i>
            </button>

          </div>

        </div>
      </div>
      
      <div v-if="movimenti.length === 0" class="text-center py-5 text-muted">
         <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
         Nessun movimento trovato.
      </div>
    </div>

    <DettaglioMovimento ref="refDettaglio" @refresh="getMovimenti" />

  </div>
</template>

<style scoped>
/* Stile per i bottoni quadrati come nell'immagine */
.btn-action {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px; /* Bordi arrotondati come le card */
  transition: all 0.2s;
  background-color: #fff;
}
.btn-action:hover {
  background-color: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.btn-white {
  background-color: white;
}
</style>