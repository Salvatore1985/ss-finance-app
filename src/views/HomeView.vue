<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase'
import DettaglioMovimento from '../components/DettaglioMovimento.vue'

const movimenti = ref([])
const caricamento = ref(true)
const refDettaglio = ref(null) // Riferimento al modale

// Filtro visuale (Totale/Salvo/Sigi) - Per ora solo estetico
const filtroUtente = ref('Totale')

// --- CALCOLI AUTOMATICI (Computed) ---
const saldo = computed(() => {
  return movimenti.value.reduce((acc, m) => m.tipo === 'Entrata' ? acc + parseFloat(m.importo) : acc - parseFloat(m.importo), 0).toFixed(2)
})

const entrate = computed(() => {
  return movimenti.value
    .filter(m => m.tipo === 'Entrata')
    .reduce((acc, m) => acc + parseFloat(m.importo), 0)
    .toFixed(2)
})

const uscite = computed(() => {
  return Math.abs(
    movimenti.value
      .filter(m => m.tipo === 'Uscita')
      .reduce((acc, m) => acc + parseFloat(m.importo), 0)
  ).toFixed(2)
})

// --- SCARICAMENTO DATI ---
const getMovimenti = async () => {
  try {
    caricamento.value = true
    // Scarichiamo gli ultimi 20 movimenti per la Dashboard
    let { data, error } = await supabase
      .from('transazioni')
      .select('*')
      .order('data', { ascending: false })
      .limit(20)

    if (error) throw error
    movimenti.value = data
  } catch (error) {
    console.error(error)
  } finally {
    caricamento.value = false
  }
}

// --- GESTIONE BOTTONI ---
const vediDettaglio = (mov) => refDettaglio.value.apri(mov, 'view')
const modificaMovimento = (mov) => refDettaglio.value.apri(mov, 'edit')
const dividiMovimento = (mov) => refDettaglio.value.apri(mov, 'split')

onMounted(() => {
  getMovimenti()
})
</script>

<template>
  <div class="container py-4">
    
    <!-- 1. FILTRI UTENTE (Pillole) -->
    <div class="d-flex justify-content-center mb-4">
      <div class="bg-white rounded-pill p-1 shadow-sm d-inline-flex">
        <button 
          @click="filtroUtente='Totale'" 
          class="btn rounded-pill px-4 fw-bold btn-sm transition-all"
          :class="filtroUtente==='Totale' ? 'btn-primary' : 'btn-light bg-transparent border-0 text-muted'"
        >Totale</button>
        <button 
          @click="filtroUtente='Salvo'" 
          class="btn rounded-pill px-4 fw-bold btn-sm transition-all"
          :class="filtroUtente==='Salvo' ? 'btn-primary' : 'btn-light bg-transparent border-0 text-muted'"
        >Salvo</button>
        <button 
          @click="filtroUtente='Sigi'" 
          class="btn rounded-pill px-4 fw-bold btn-sm transition-all"
          :class="filtroUtente==='Sigi' ? 'btn-primary' : 'btn-light bg-transparent border-0 text-muted'"
        >Sigi</button>
      </div>
    </div>

    <div class="row g-4 mb-4">
      
      <!-- 2. COLONNA SINISTRA (KPI) -->
      <div class="col-lg-5 d-flex flex-column gap-3">
        
        <!-- CARD SALDO VIOLA -->
        <div class="card bg-purple-gradient p-4 text-white shadow-md position-relative overflow-hidden border-0">
          <div class="position-relative z-1">
            <div class="text-white-50 small fw-bold text-uppercase mb-1 ls-1">SALDO</div>
            <h1 class="fw-bold mb-0 display-5">{{ saldo }} €</h1>
          </div>
          <!-- Decorazione Cerchio -->
          <div class="position-absolute top-0 end-0 m-3 rounded-circle bg-white opacity-25" style="width: 80px; height: 80px;"></div>
        </div>

        <!-- ENTRATE / USCITE -->
        <div class="row g-3">
          <div class="col-6">
            <div class="card p-3 h-100 border-0 shadow-sm">
              <span class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Entrate</span>
              <div class="d-flex align-items-center mt-2">
                <i class="bi bi-arrow-down-circle-fill text-success me-2 fs-5"></i>
                <h5 class="fw-bold text-dark mb-0">+{{ entrate }}</h5>
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="card p-3 h-100 border-0 shadow-sm">
              <span class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Uscite</span>
              <div class="d-flex align-items-center mt-2">
                <i class="bi bi-arrow-up-circle-fill text-danger me-2 fs-5"></i>
                <h5 class="fw-bold text-dark mb-0">-{{ uscite }}</h5>
              </div>
            </div>
          </div>
        </div>

        <!-- CONTRIBUTO MESE (Placeholder Visivo) -->
        <div class="card p-3 border-0 shadow-sm">
          <div class="d-flex justify-content-between mb-2">
            <span class="small fw-bold text-uppercase text-muted">Contributo Mese</span>
            <i class="bi bi-people-fill text-muted"></i>
          </div>
          <div class="progress" style="height: 12px; border-radius: 6px;">
            <div class="progress-bar bg-primary" style="width: 60%"></div>
            <div class="progress-bar bg-info" style="width: 40%"></div>
          </div>
          <div class="d-flex justify-content-between mt-2 small fw-bold">
            <span class="text-primary">Salvo (60%)</span>
            <span class="text-info">(40%) Sigi</span>
          </div>
        </div>

      </div>

      <!-- 3. COLONNA DESTRA (GRAFICI PLACEHOLDER) -->
      <div class="col-lg-7">
        <div class="card p-4 h-100 border-0 shadow-sm">
          <h6 class="fw-bold mb-4 text-muted small text-uppercase">Trend</h6>
          
          <div class="row align-items-center h-100">
            <!-- Grafico a Barre Finto -->
            <div class="col-md-7 border-end">
              <div class="d-flex align-items-end justify-content-around px-2" style="height: 180px;">
                <div class="bg-primary opacity-50 rounded-top w-100 mx-1" style="height: 40%"></div>
                <div class="bg-danger opacity-25 rounded-top w-100 mx-1" style="height: 60%"></div>
                <div class="bg-primary opacity-50 rounded-top w-100 mx-1" style="height: 80%"></div>
                <div class="bg-danger opacity-25 rounded-top w-100 mx-1" style="height: 30%"></div>
                <div class="bg-primary rounded-top w-100 mx-1" style="height: 90%"></div>
                <div class="bg-danger opacity-50 rounded-top w-100 mx-1" style="height: 50%"></div>
              </div>
              <div class="text-center small text-muted mt-2">Ultimi 6 Mesi</div>
            </div>
            
            <!-- Grafico a Ciambella Finto -->
            <div class="col-md-5 text-center mt-3 mt-md-0">
              <div class="position-relative d-inline-block">
                <div class="rounded-circle border border-5 border-primary" style="width: 140px; height: 140px; border-right-color: #e0e7ff !important;"></div>
                <div class="position-absolute top-50 start-50 translate-middle fw-bold h4 m-0 text-primary">€</div>
              </div>
              <div class="mt-3 small d-flex justify-content-center gap-2">
                <span class="badge bg-primary">Spesa</span>
                <span class="badge bg-secondary bg-opacity-25 text-dark">Casa</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- 4. LISTA RECENTI -->
    <h5 class="fw-bold mb-3 px-1 border-2">Recenti</h5>

    <div v-if="caricamento" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else class="card border-0 shadow-sm mb-5">
      <div class="list-group list-group-flush">
        
        <div 
          v-for="mov in movimenti" 
          :key="mov.id" 
          class="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-center py-3 border-light gap-3"
        >
          
          <div class="d-flex align-items-center w-100">
            <!-- Icona -->
            <div class="rounded-circle bg-light p-2 me-3 d-flex justify-content-center align-items-center shadow-sm" style="width: 45px; height: 45px; flex-shrink: 0;">
              <i class="bi fs-5" :class="mov.tipo === 'Entrata' ? 'bi-piggy-bank-fill text-success' : 'bi-bag-fill text-primary'"></i>
            </div>
            
            <!-- Descrizione e Data -->
            <div class="flex-grow-1 min-width-0">
              <div class="d-flex justify-content-between align-items-center">
                 <div class="fw-bold text-dark text-truncate pe-2">{{ mov.descrizione }}</div>
                 <div class="fw-bold text-nowrap" :class="mov.tipo === 'Uscita' ? 'text-dark' : 'text-success'">
                    {{ mov.tipo === 'Uscita' ? '' : '+' }} {{ parseFloat(mov.importo).toFixed(2) }} €
                 </div>
              </div>
              <div class="d-flex align-items-center gap-2 mt-1">
                <span class="badge bg-secondary bg-opacity-10 text-secondary border fw-medium" style="font-size: 0.7rem;">{{ mov.categoria }}</span>
                <small class="text-muted" style="font-size: 0.75rem;">{{ new Date(mov.data).toLocaleDateString('it-IT', {day: '2-digit', month: 'short'}) }}</small>
              </div>
            </div>
          </div>

          <!-- 3 BOTTONI AZIONE -->
          <div class="d-flex gap-2 mt-2 mt-sm-0 w-100 w-sm-auto justify-content-end">
            <button @click="vediDettaglio(mov)" class="btn btn-white border shadow-sm btn-sm px-2 py-1 text-primary btn-square" title="Vedi">
              <i class="bi bi-eye"></i>
            </button>
            <button @click="modificaMovimento(mov)" class="btn btn-white border shadow-sm btn-sm px-2 py-1 text-dark btn-square" title="Modifica">
              <i class="bi bi-pencil"></i>
            </button>
            <button @click="dividiMovimento(mov)" class="btn btn-white border shadow-sm btn-sm px-2 py-1 text-dark btn-square" title="Dividi">
              <i class="bi bi-scissors"></i>
            </button>
          </div>

        </div>
      </div>
      
      <!-- Se vuoto -->
      <div v-if="movimenti.length === 0" class="text-center py-4 text-muted small">
          Nessun movimento ancora.
      </div>
    </div>

    <!-- Modale Dettaglio (Invisibile) -->
    <DettaglioMovimento ref="refDettaglio" @refresh="getMovimenti" />

  </div>
</template>

<style scoped>
.transition-all {
  transition: all 0.2s ease;
}
.btn-square {
  width: 36px; 
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}
.btn-white {
  background-color: white;
}
.btn-white:hover {
  background-color: #f8fafc;
}
</style>