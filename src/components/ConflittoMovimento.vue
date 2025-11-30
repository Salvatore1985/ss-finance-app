<script setup>
import { ref, computed } from 'vue'
import { Modal } from 'bootstrap'

// Evento che restituisce la decisione alla pagina Importa
const emit = defineEmits(['risolto'])

const modalInstance = ref(null)
const existingMatches = ref([]) // I movimenti trovati nel DB (Storico)
const incoming = ref(null)      // Il movimento nuovo (dal File)

// --- SCELTE UTENTE ---
const selectedMatchId = ref(null) // Quale dei vecchi sto selezionando per il confronto
const choiceCat = ref('old')      // 'old' (DB) o 'new' (File)
const choiceDesc = ref('old')     // 'old' o 'new'
const choiceTags = ref('merge')   // 'merge' (unisci), 'old', 'new'
const choiceFile = ref('old')     // 'old' (tieni allegato esistente) o 'new' (sovrascrivi/vuoto)

// --- APERTURA MODALE ---
const apri = (matches, nuovoMovimento) => {
  existingMatches.value = matches
  incoming.value = nuovoMovimento
  
  // 1. Seleziona il primo match come default
  selectedMatchId.value = matches[0].id
  
  // 2. Reset Scelte Default
  choiceCat.value = 'old'
  choiceDesc.value = 'old'
  choiceTags.value = 'merge' // Di solito unire i tag è la cosa migliore
  choiceFile.value = 'old'

  // 3. Logica Intelligente per i Default
  // Se quello vecchio è "Da Classificare" e il nuovo ha una categoria valida, usa il nuovo
  if (matches[0].categoria === 'Da Classificare' && nuovoMovimento.categoria !== 'Da Classificare') {
    choiceCat.value = 'new'
  }
  
  // Se la descrizione nuova è più lunga/dettagliata, potresti volerla (qui lascio old per sicurezza)
  // Ma se la vecchia è vuota, usa la nuova
  if (!matches[0].descrizione) choiceDesc.value = 'new'

  const el = document.getElementById('modalConflitto')
  // Backdrop static: non si chiude cliccando fuori (ti obbliga a scegliere)
  modalInstance.value = new Modal(el, { backdrop: 'static', keyboard: false })
  modalInstance.value.show()
}

// --- AZIONE 1: UNISCI (MERGE) ---
const confermaUnione = () => {
  const vecchio = existingMatches.value.find(m => m.id === selectedMatchId.value)
  const nuovo = incoming.value

  // 1. Logica Unione Tag (Array)
  let tagsFinali = []
  if (choiceTags.value === 'merge') {
    // Unisce i due array e rimuove duplicati usando Set
    const vecchiTag = vecchio.tags || []
    const nuoviTag = nuovo.tags || []
    tagsFinali = [...new Set([...vecchiTag, ...nuoviTag])]
  } else if (choiceTags.value === 'old') {
    tagsFinali = vecchio.tags || []
  } else {
    tagsFinali = nuovo.tags || []
  }

  // 2. Costruzione Oggetto Finale
  const movimentoUnito = {
    id: vecchio.id, // Manteniamo l'ID storico (faremo un UPDATE)
    
    // Scelte utente
    categoria: choiceCat.value === 'old' ? vecchio.categoria : nuovo.categoria,
    descrizione: choiceDesc.value === 'old' ? vecchio.descrizione : nuovo.descrizione,
    
    // I dati bancari "duri" (Importo, Data, Conto) prendiamo quelli del file (Nuovo)
    // perché di solito l'estratto conto è la verità assoluta rispetto all'inserimento manuale
    importo: nuovo.importo,
    data: nuovo.data,
    conto: nuovo.conto,
    
    tags: tagsFinali,
    
    // File: se scelgo old, tengo il vecchio url
    file_url: choiceFile.value === 'old' ? vecchio.file_url : null,
    
    // Note: Appendiamo una traccia
    note: vecchio.note ? `${vecchio.note} | Unito con import` : 'Unito con import',
    
    // Blocchiamo il ricalcolo automatico futuro
    is_manual: true 
  }

  chiudi('MERGE', movimentoUnito)
}

// --- AZIONE 2: CREA NUOVO (È UN DOPPIONE REALE) ---
const creaNuovo = () => {
  // Ignora il conflitto e crea un duplicato (es. due caffè identici)
  chiudi('CREATE', incoming.value)
}

// --- AZIONE 3: DECIDI DOPO (SKIP) ---
const decidiDopo = () => {
  // Salta questo movimento (verrà messo in 'Da Convalidare' o saltato dalla logica padre)
  chiudi('SKIP', null)
}

// --- CHIUSURA ---
const chiudi = (azione, dati) => {
  modalInstance.value.hide()
  
  // FIX: Rimuovi backdrop manualmente se Bootstrap si incastra
  const bd = document.querySelector('.modal-backdrop'); if(bd) bd.remove();
  document.body.classList.remove('modal-open'); document.body.style = '';
  
  emit('risolto', { azione, dati })
}

defineExpose({ apri })
</script>

<template>
  <div class="modal fade" id="modalConflitto" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg"> <!-- modal-lg per più spazio -->
      <div class="modal-content border-0 shadow-lg overflow-hidden" style="border-radius: 16px;">
        
        <!-- HEADER GIALLO (ATTENZIONE) -->
        <div class="modal-header bg-warning bg-opacity-25 border-bottom border-warning">
          <h5 class="modal-title fw-bold text-dark d-flex align-items-center">
            <i class="bi bi-exclamation-triangle-fill text-warning me-2 fs-4"></i>
            Movimento già presente
          </h5>
        </div>

        <div class="modal-body p-4" v-if="incoming">
          <p class="text-muted small mb-4">
            Ho trovato corrispondenze nello storico per questo movimento del <strong>{{ incoming.data }}</strong> di <strong>{{ incoming.importo }} €</strong>.
            <br>Scegli come unire i dati per non creare duplicati.
          </p>

          <div class="row">
            
            <!-- COLONNA SINISTRA: SELEZIONE MATCH -->
            <div class="col-md-5 border-end">
              <h6 class="small fw-bold text-muted text-uppercase mb-2">Confronta con:</h6>
              <div v-for="m in existingMatches" :key="m.id" 
                   class="card mb-2 border cursor-pointer transition-all" 
                   :class="selectedMatchId === m.id ? 'border-primary bg-primary bg-opacity-10' : 'border-light bg-light'"
                   @click="selectedMatchId = m.id">
                <div class="card-body p-2 d-flex align-items-center">
                  <div class="form-check me-2">
                    <input type="radio" :checked="selectedMatchId === m.id" class="form-check-input">
                  </div>
                  <div>
                    <div class="fw-bold text-dark text-truncate" style="max-width: 150px;">{{ m.descrizione }}</div>
                    <div class="small text-muted">{{ m.categoria }}</div>
                    <!-- Badge se ha file -->
                    <span v-if="m.file_url" class="badge bg-secondary mt-1" style="font-size: 0.6rem;">
                      <i class="bi bi-paperclip"></i> Allegato
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- COLONNA DESTRA: OPZIONI DI MERGE -->
            <div class="col-md-7 ps-md-4">
              
              <!-- 1. CATEGORIA -->
              <div class="mb-3 border-bottom pb-2">
                <label class="small fw-bold text-dark mb-1">Categoria</label>
                <div class="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                  <div class="form-check">
                    <input v-model="choiceCat" value="old" type="radio" class="form-check-input" id="catOld">
                    <label class="form-check-label small" for="catOld">
                      {{ existingMatches.find(m=>m.id===selectedMatchId)?.categoria }} (Storico)
                    </label>
                  </div>
                  <div class="form-check">
                    <input v-model="choiceCat" value="new" type="radio" class="form-check-input" id="catNew">
                    <label class="form-check-label small fw-bold text-primary" for="catNew">
                      {{ incoming.categoria }} (Nuovo)
                    </label>
                  </div>
                </div>
              </div>

              <!-- 2. DESCRIZIONE -->
              <div class="mb-3 border-bottom pb-2">
                <label class="small fw-bold text-dark mb-1">Descrizione</label>
                <div class="bg-light p-2 rounded">
                  <div class="form-check mb-1">
                    <input v-model="choiceDesc" value="old" type="radio" class="form-check-input" id="descOld">
                    <label class="form-check-label small text-truncate d-block" for="descOld" style="max-width: 100%;">
                      {{ existingMatches.find(m=>m.id===selectedMatchId)?.descrizione }}
                    </label>
                  </div>
                  <div class="form-check">
                    <input v-model="choiceDesc" value="new" type="radio" class="form-check-input" id="descNew">
                    <label class="form-check-label small text-primary fw-bold text-truncate d-block" for="descNew" style="max-width: 100%;">
                      {{ incoming.descrizione }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- 3. TAG (MERGE) -->
              <div class="mb-3 border-bottom pb-2">
                <label class="small fw-bold text-dark mb-1">Tag</label>
                <div class="bg-light p-2 rounded">
                  <div class="form-check mb-2">
                    <input v-model="choiceTags" value="merge" type="radio" class="form-check-input" id="tagMerge">
                    <label class="form-check-label small fw-bold text-success" for="tagMerge">
                      <i class="bi bi-intersect"></i> Unisci Tutti i Tag
                    </label>
                  </div>
                  <div class="d-flex gap-3">
                    <div class="form-check">
                      <input v-model="choiceTags" value="old" type="radio" class="form-check-input">
                      <label class="form-check-label small">Tieni Storico</label>
                    </div>
                    <div class="form-check">
                      <input v-model="choiceTags" value="new" type="radio" class="form-check-input">
                      <label class="form-check-label small">Usa Nuovo</label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 4. ALLEGATI (Se presente nel vecchio) -->
              <div v-if="existingMatches.find(m=>m.id===selectedMatchId)?.file_url" class="mb-3">
                <label class="small fw-bold text-dark mb-1">Allegato (Scontrino)</label>
                <div class="alert alert-info py-2 px-3 mb-0">
                  <div class="form-check">
                    <input v-model="choiceFile" value="old" type="radio" class="form-check-input" checked>
                    <label class="form-check-label small fw-bold">
                      Mantieni Scontrino Esistente
                    </label>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- BOTTONI AZIONE -->
          <div class="d-grid gap-2 mt-3">
            <button @click="confermaUnione" class="btn btn-dark fw-bold py-2 shadow-sm">
              <i class="bi bi-check2-all me-2"></i> CONFERMA UNIONE
            </button>
            
            <div class="row g-2">
              <div class="col-6">
                <button @click="decidiDopo" class="btn btn-outline-warning w-100 fw-bold text-dark">
                  <i class="bi bi-hourglass-split me-1"></i> Decidi Dopo
                </button>
              </div>
              <div class="col-6">
                <button @click="creaNuovo" class="btn btn-outline-secondary w-100 fw-bold">
                  <i class="bi bi-plus-lg me-1"></i> Crea Nuovo
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-pointer { cursor: pointer; }
.transition-all { transition: all 0.2s; }
</style>