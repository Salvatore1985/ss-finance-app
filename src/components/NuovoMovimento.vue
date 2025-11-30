<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { Modal } from 'bootstrap'

const emit = defineEmits(['saved'])
const salvataggio = ref(false)
const availableTags = ref([]) // Lista di tutti i tag disponibili nel sistema
const availableAccounts = ref([])
const availableCategories = ref([])

const form = ref({
  importo: '',
  descrizione: '',
  tipo: '',
  data: new Date().toISOString().split('T')[0],
  conto: '',     
  categoria: '',   
  tags: []               // <--- ORA È UN ARRAY VUOTO
})

// Carichiamo la lista dei Tag dal DB all'avvio
onMounted(async () => {
  const [{ data: tags }, { data: conti }, { data: categorie }] = await Promise.all([
    supabase.from('tags').select('*').order('nome'),
    supabase.from('conti').select('nome').order('nome'),
    supabase.from('categorie').select('nome').order('nome')
  ])

  if (tags) availableTags.value = tags
  if (conti) {
    availableAccounts.value = conti
    if (!form.value.conto && conti.length > 0) form.value.conto = conti[0].nome
  }
  if (categorie) {
    availableCategories.value = categorie
    if (!form.value.categoria && categorie.length > 0) form.value.categoria = categorie[0].nome
  }
})

// Aggiunge un tag alla lista (se non c'è già)
const aggiungiTag = (event) => {
  const tagName = event.target.value
  if (tagName && !form.value.tags.includes(tagName)) {
    form.value.tags.push(tagName)
  }
  event.target.value = "" // Resetta la select
}

// Rimuove un tag cliccando la X
const rimuoviTag = (index) => {
  form.value.tags.splice(index, 1)
}

const salva = async () => {
  if (!form.value.importo || !form.value.descrizione) return alert("Compila importo e descrizione!")

  try {
    salvataggio.value = true
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('transazioni').insert([
      {
        user_id: user.id,
        importo: parseFloat(form.value.importo),
        descrizione: form.value.descrizione,
        tipo: form.value.tipo,
        data: form.value.data,
        categoria: form.value.categoria,
        conto: form.value.conto,
        tags: form.value.tags, // <--- SALVIAMO L'ARRAY
        stato: 'confermato'
      }
    ])

    if (error) throw error

    // Reset e Chiusura
    form.value.descrizione = ''
    form.value.importo = ''
    form.value.tags = []
    
    const modalElement = document.getElementById('modalNuovo')
    const modalInstance = Modal.getOrCreateInstance(modalElement)
    modalInstance.hide()

    const backdrop = document.querySelector('.modal-backdrop')
    if (backdrop) backdrop.remove()
    document.body.classList.remove('modal-open')
    document.body.style = ''

    emit('saved')

  } catch (error) {
    alert("Errore: " + error.message)
  } finally {
    salvataggio.value = false
  }
}
</script>

<template>
  <div class="modal fade" id="modalNuovo" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg p-3" style="border-radius: 20px;">
        
        <div class="modal-header border-0">
          <h5 class="modal-title fw-bold">Nuovo Movimento</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="salva">
            
            <!-- Importo -->
            <div class="mb-4">
              <label class="small fw-bold text-muted mb-1">Importo</label>
              <div class="input-group input-group-lg border rounded-3 overflow-hidden">
                <span class="input-group-text bg-white border-0 text-muted ps-3">€</span>
                <input v-model="form.importo" type="number" step="0.01" class="form-control border-0 fw-bold fs-1" placeholder="0.00" style="height: 70px;">
              </div>
            </div>

            <!-- Data e Tipo -->
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="small fw-bold text-muted mb-1">Data</label>
                <input v-model="form.data" type="date" class="form-control">
              </div>
              <div class="col-6">
                <label class="small fw-bold text-muted mb-1">Tipo</label>
                <select v-model="form.tipo" class="form-select">
                  <option value="Uscita">Uscita</option>
                  <option value="Entrata">Entrata</option>
                </select>
              </div>
            </div>

            <!-- Descrizione -->
            <div class="mb-3">
              <label class="small fw-bold text-muted mb-1">Descrizione</label>
              <input v-model="form.descrizione" type="text" class="form-control" placeholder="Spesa...">
            </div>

            <!-- Conto e Categoria (Semplificati per ora) -->
            <div class="row g-3 mb-3">␊
              <div class="col-6">␊
                <label class="small fw-bold text-muted mb-1">Conto</label>␊
                <select v-model="form.conto" class="form-select">␊
                   <option v-for="c in availableAccounts" :key="c.nome" :value="c.nome">{{ c.nome }}</option>
                </select>␊
              </div>␊
              <div class="col-6">␊
                <label class="small fw-bold text-muted mb-1">Categoria</label>␊
                <select v-model="form.categoria" class="form-select">␊
                   <option v-for="c in availableCategories" :key="c.nome" :value="c.nome">{{ c.nome }}</option>
                </select>␊
              </div>␊
            </div>␊

            <!-- NUOVO SISTEMA TAG MULTIPLI -->
            <div class="mb-4">
               <label class="small fw-bold text-muted mb-1">Tag (Opzionali)</label>
               <div class="border rounded-3 p-2 bg-light">
                 
                 <!-- Lista dei tag selezionati (Pillole) -->
                 <div class="d-flex flex-wrap gap-2 mb-2" v-if="form.tags.length > 0">
                   <span 
                      v-for="(tag, index) in form.tags" 
                      :key="tag" 
                      class="badge bg-warning text-dark border border-warning rounded-pill d-flex align-items-center px-3"
                   >
                     #{{ tag }}
                     <i class="bi bi-x-circle-fill ms-2 cursor-pointer text-black-50" @click="rimuoviTag(index)"></i>
                   </span>
                 </div>

                 <!-- Select per aggiungere nuovo tag -->
                 <select class="form-select form-select-sm border-0 bg-transparent text-muted" @change="aggiungiTag">
                   <option value="" selected>+ Aggiungi Tag...</option>
                   <option v-for="t in availableTags" :key="t.id" :value="t.nome">{{ t.nome }}</option>
                 </select>

               </div>
            </div>

            <button type="submit" class="btn btn-primary w-100 py-3 fw-bold shadow-sm rounded-3">
              Salva
            </button>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-pointer { cursor: pointer; }
</style>