<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import DettaglioMovimento from '../components/DettaglioMovimento.vue'
import ActionButtons from '../components/ActionButtons.vue'
import MovimentoInfo from '../components/MovimentoInfo.vue'
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
  <div class="d-flex flex-column h-100 container py-3" style="max-height: calc(90vh - 80px);">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold m-0">Movimenti</h4>
      <span class="badge bg-light text-muted border">{{ movimenti.length }} transazioni</span>
    </div>
    <div class="flex-grow-1 overflow-auto rounded-3 border bg-white shadow-sm position-relative">
      <div v-if="caricamento" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div v-else class="card border-0 shadow-sm">
        <div class="list-group list-group-flush">
          
          <!-- NOTA: Ho tolto @click dalla riga intera -->
          <div
            v-for="mov in movimenti"
            :key="mov.id"
            class="list-group-item py-3 border-light border-3"
          >
            <MovimentoInfo
              :movimento="mov"
              :show-tags="false"
              :show-attachments="false"
            >
              <template #actions>
                <ActionButtons
                  @view="vediDettaglio(mov)"
                  @edit="modificaMovimento(mov)"
                  @split="dividiMovimento(mov)"
                />
              </template>
            </MovimentoInfo>
          </div>
        </div>
        
        <div v-if="movimenti.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
          Nessun movimento trovato.
        </div>
    </div>
    </div>

    <DettaglioMovimento ref="refDettaglio" @refresh="getMovimenti" />

  </div>
</template>

