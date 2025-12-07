<template>
  <!-- Modal Container -->
  <div 
    class="modal fade" 
    ref="modalRef" 
    id="modalNuovo" 
    tabindex="-1" 
    aria-hidden="true" 
    data-bs-backdrop="static"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg p-3" style="border-radius: 20px;">
        
        <!-- Header -->
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold">Nuovo Movimento</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <!-- Body -->
        <div class="modal-body pt-3">
          <form @submit.prevent="salva">
            
            <!-- 1. Importo e Descrizione -->
            <Input 
              label="Importo" 
              type="number" 
              v-model="form.importo" 
              icon="bi-currency-euro" 
              placeholder="0.00" 
              class="mb-3"
            />

            <Input 
              label="Descrizione" 
              v-model="form.descrizione" 
              icon="bi-pencil" 
              placeholder="Es. Pizza" 
              class="mb-3"
            />

            <!-- 2. Data e Tipo -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <Input type="date" label="Data" v-model="form.data" />
              </div>
              <div class="col-6">
                <SelectInput 
                  label="Tipo" 
                  v-model="form.tipo" 
                  :options="['Uscita', 'Entrata']" 
                />
              </div>
            </div>

            <!-- 3. Conto e Categoria (Dinamici) -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <SelectInput 
                  label="Conto"
                  v-model="form.conto" 
                  :options="listaConti"
                  optionLabel="nome"
                  optionValue="nome"
                  icon="bi-bank"
                />
              </div>
              <div class="col-6">
                <SelectInput 
                  label="Categoria"
                  v-model="form.categoria" 
                  :options="listaCategorie"
                  optionLabel="nome"
                  optionValue="nome"
                  icon="bi-grid"
                />
              </div>
            </div>

            <!-- 4. Sistema TAG (Ibrido) -->
            <div class="mb-3">
               <label class="form-label small fw-bold text-muted text-uppercase ls-1">Tag</label>
               <div class="border rounded-3 p-2 bg-light d-flex flex-wrap gap-2 align-items-center">
                 <!-- Badge Tag Selezionati -->
                 <span v-for="(t, i) in form.tags" :key="i" class="badge bg-warning text-dark rounded-pill shadow-sm">
                   #{{ t }} 
                   <i class="bi bi-x ms-1 cursor-pointer" @click="rimuoviTag(i)"></i>
                 </span>
                 
                 <!-- Select per aggiungere (Stile "ghost") -->
                 <select 
                    class="form-select form-select-sm border-0 bg-transparent w-auto fw-bold text-muted" 
                    @change="aggiungiTag"
                    style="box-shadow: none;"
                 >
                   <option value="" selected>+ Aggiungi Tag</option>
                   <option v-for="t in listaTag" :key="t.nome" :value="t.nome">{{ t.nome }}</option>
                 </select>
               </div>
            </div>

            <!-- 5. Note e File -->
            <Input 
              label="Note" 
              v-model="form.note" 
              placeholder="Dettagli aggiuntivi..." 
              class="mb-3"
            />

            <div class="mb-4">
              <label class="form-label small fw-bold text-muted text-uppercase ls-1">Allegato</label>
              <input type="file" accept="image/*" @change="handleFile" class="form-control form-control-sm text-muted">
            </div>

            <!-- 6. Submit -->
            <Button 
              text="Salva Movimento" 
              variant="primary" 
              :loading="salvataggio" 
              icon="bi-check-lg" 
              block 
              type="submit"
            />

          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { Modal } from 'bootstrap'

// IMPORTIAMO I NUOVI COMPONENTI UI
import Input from '@/components/UI/Input/Input.vue'
import SelectInput from '@/components/UI/Input/SelectInput.vue'
import Button from '@/components/UI/Button/Button.vue'

const emit = defineEmits(['saved'])
const salvataggio = ref(false)
const modalRef = ref(null)

// Dati liste
const listaConti = ref([])
const listaCategorie = ref([])
const listaTag = ref([])

const form = ref({
  importo: '',
  descrizione: '',
  tipo: 'Uscita',
  data: new Date().toISOString().split('T')[0],
  conto: '',
  categoria: '',
  tags: [],
  note: '',
  file: null
})

// --- CARICAMENTO DATI ---
onMounted(async () => {
  const [resConti, resCat, resTag] = await Promise.all([
    supabase.from('conti').select('nome').order('nome'),
    supabase.from('categorie').select('nome').order('nome'),
    supabase.from('tags').select('nome').order('nome')
  ])

  if (resConti.data) listaConti.value = resConti.data
  if (resCat.data) listaCategorie.value = resCat.data
  if (resTag.data) listaTag.value = resTag.data

  // Defaults
  if (listaConti.value.length) form.value.conto = listaConti.value[0].nome
  if (listaCategorie.value.length) form.value.categoria = listaCategorie.value[0].nome
})

// Gestione Tag
const aggiungiTag = (event) => {
  const tagName = event.target.value
  if (tagName && !form.value.tags.includes(tagName)) form.value.tags.push(tagName)
  event.target.value = ""
}
const rimuoviTag = (index) => form.value.tags.splice(index, 1)

// Gestione File
const handleFile = (e) => form.value.file = e.target.files[0]

// SALVATAGGIO
const salva = async () => {
  if (!form.value.importo || !form.value.descrizione) return alert("Compila importo e descrizione!")

  try {
    salvataggio.value = true
    const { data: { user } } = await supabase.auth.getUser()
    
    let fileUrl = null
    
    // Upload File
    if (form.value.file) {
      const nomeClean = form.value.file.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const path = `${user.id}/${Date.now()}_${nomeClean}`
      
      const { error: upErr } = await supabase.storage.from('ricevute').upload(path, form.value.file)
      if (upErr) throw upErr
      
      const { data: pubUrl } = supabase.storage.from('ricevute').getPublicUrl(path)
      fileUrl = pubUrl.publicUrl
    }

    // Insert DB
    const { error } = await supabase.from('transazioni').insert([{
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
    }])

    if (error) throw error

    // Chiudi Modal
    const modalInstance = Modal.getOrCreateInstance(modalRef.value)
    modalInstance.hide()
    
    // Reset e Notifica
    resetForm()
    emit('saved')

  } catch (err) {
    console.error(err)
    alert("Errore salvataggio: " + err.message)
  } finally {
    salvataggio.value = false
  }
}

const resetForm = () => {
  form.value.importo = ''
  form.value.descrizione = ''
  form.value.tags = []
  form.value.note = ''
  form.value.file = null
}
</script>

<style scoped>
.cursor-pointer { cursor: pointer; }
.ls-1 { letter-spacing: 0.5px; }
</style>