<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { Modal } from 'bootstrap'

const emit = defineEmits(['saved'])
const salvataggio = ref(false)

// Liste dinamiche dal DB
const listaConti = ref([])
const listaCategorie = ref([])
const listaTag = ref([])

const form = ref({
  importo: '',
  descrizione: '',
  tipo: 'Uscita',
  data: new Date().toISOString().split('T')[0],
  conto: '', // Vuoto all'inizio, obblighiamo a scegliere
  categoria: '',
  tags: [],
  note: '',
  file: null
})

// --- CARICAMENTO DATI DAL DB ---
onMounted(async () => {
  // 1. Conti
  const { data: c } = await supabase.from('conti').select('nome').order('nome')
  if (c) listaConti.value = c

  // 2. Categorie
  const { data: cat } = await supabase.from('categorie').select('nome').order('nome')
  if (cat) listaCategorie.value = cat

  // 3. Tag
  const { data: t } = await supabase.from('tags').select('nome').order('nome')
  if (t) listaTag.value = t

  // Default intelligenti (se ci sono dati)
  if (listaConti.value.length > 0) form.value.conto = listaConti.value[0].nome
  if (listaCategorie.value.length > 0) form.value.categoria = listaCategorie.value[0].nome
})

const aggiungiTag = (event) => {
  const tagName = event.target.value
  if (tagName && !form.value.tags.includes(tagName)) form.value.tags.push(tagName)
  event.target.value = ""
}

const rimuoviTag = (index) => form.value.tags.splice(index, 1)

const handleFile = (e) => form.value.file = e.target.files[0]

const salva = async () => {
  if (!form.value.importo || !form.value.descrizione) return alert("Compila i campi obbligatori!")

  try {
    salvataggio.value = true
    const { data: { user } } = await supabase.auth.getUser()
   let fileUrl = null
   
    // 1. Upload File (Se c'è)
    if (form.value.file) {
      // PULIZIA NOME FILE: Tolgo spazi e caratteri strani
      const nomeOriginalePulito = form.value.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const nomeFile = `${Date.now()}_${nomeOriginalePulito}`
      
      // Upload nel bucket 'ricevute'
      const { error: uploadErr } = await supabase.storage
        .from('ricevute') // <--- Assicurati che questo bucket esista su Supabase!
        .upload(`${user.id}/${nomeFile}`, form.value.file)
      
      if (uploadErr) throw uploadErr
      
      // Ottieni URL pubblico
      const { data: publicUrl } = supabase.storage
        .from('ricevute')
        .getPublicUrl(`${user.id}/${nomeFile}`)
        
      fileUrl = publicUrl.publicUrl
    }

    // Insert DB
    const { error } = await supabase.from('transazioni').insert([
      {
        user_id: user.id,
        importo: parseFloat(form.value.importo),
        descrizione: form.value.descrizione,
        tipo: form.value.tipo,
        data: form.value.data,
        categoria: form.value.categoria,
        conto: form.value.conto,
        tags: form.value.tags,
        note: form.value.note,
        file_url: fileUrl,
        stato: 'confermato',
        is_manual: true
      }
    ])

    if (error) throw error

    // Chiusura
    const modalElement = document.getElementById('modalNuovo')
    const modalInstance = Modal.getOrCreateInstance(modalElement)
    modalInstance.hide()
    
    // Reset Form (Mantenendo i default caricati)
    form.value.importo = ''
    form.value.descrizione = ''
    form.value.tags = []
    form.value.note = ''
    form.value.file = null
    
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
        
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold">Nuovo Movimento</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body pt-2">
          <form @submit.prevent="salva">
            
            <div class="mb-3">
              <div class="input-group input-group-lg border rounded-3 overflow-hidden">
                <span class="input-group-text bg-white border-0 text-muted ps-3">€</span>
                <input v-model="form.importo" type="number" step="0.01" class="form-control border-0 fw-bold fs-1" placeholder="0.00" required>
              </div>
            </div>

            <div class="mb-3">
              <input v-model="form.descrizione" type="text" class="form-control fw-bold" placeholder="Descrizione (es. Pizza)" required>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6"><input v-model="form.data" type="date" class="form-control"></div>
              <div class="col-6">
                <select v-model="form.tipo" class="form-select">
                  <option value="Uscita">Uscita</option>
                  <option value="Entrata">Entrata</option>
                </select>
              </div>
            </div>

            <!-- SELECT DINAMICHE -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="small text-muted mb-1">Conto</label>
                <select v-model="form.conto" class="form-select">
                   <option v-for="c in listaConti" :key="c.nome" :value="c.nome">{{ c.nome }}</option>
                </select>
              </div>
              <div class="col-6">
                <label class="small text-muted mb-1">Categoria</label>
                <select v-model="form.categoria" class="form-select">
                   <option v-for="c in listaCategorie" :key="c.nome" :value="c.nome">{{ c.nome }}</option>
                </select>
              </div>
            </div>

            <!-- TAG DINAMICI -->
            <div class="mb-3">
               <div class="border rounded-3 p-2 bg-light d-flex flex-wrap gap-2 align-items-center">
                 <span v-for="(t, i) in form.tags" :key="i" class="badge bg-warning text-dark rounded-pill">
                   #{{ t }} <i class="bi bi-x ms-1 cursor-pointer" @click="rimuoviTag(i)"></i>
                 </span>
                 <select class="form-select form-select-sm border-0 bg-transparent w-auto" @change="aggiungiTag">
                   <option value="" selected>+ Tag</option>
                   <option v-for="t in listaTag" :key="t.nome" :value="t.nome">{{ t.nome }}</option>
                 </select>
               </div>
            </div>

            <div class="mb-3">
              <textarea v-model="form.note" class="form-control" rows="2" placeholder="Note aggiuntive..."></textarea>
            </div>

            <div class="mb-4">
              <input type="file" @change="handleFile" class="form-control form-control-sm text-muted">
            </div>

            <button type="submit" class="btn btn-primary w-100 py-3 fw-bold shadow-sm rounded-3">
              <span v-if="salvataggio" class="spinner-border spinner-border-sm me-2"></span>
              Salva
            </button>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>