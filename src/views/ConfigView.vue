<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const activeTab = ref('cat') // 'cat', 'tag'
const loading = ref(false)

// Form Dati
const formCat = ref({ nome: '', tipo: 'Uscita' })
const formTag = ref({ nome: '' })
const formRegola = ref({ keyword: '', categoria: '', tag: '' })

// Liste per le select
const listaCategorie = ref([])
const listaTag = ref([])

// --- CARICAMENTO DATI ---
const caricaListe = async () => {
  // Carichiamo Categorie
  const { data: cats } = await supabase.from('categorie').select('*').order('nome')
  if (cats) listaCategorie.value = cats

  // Carichiamo Tag (ORA ESISTONO!)
  const { data: tags } = await supabase.from('tags').select('*').order('nome')
  if (tags) listaTag.value = tags
}

onMounted(() => {
  caricaListe()
})

// --- AZIONE: CREA CATEGORIA ---
const creaCategoria = async () => {
  if (!formCat.value.nome) return alert("Inserisci il nome")
  try {
    loading.value = true
    const { error } = await supabase.from('categorie').insert([{
      nome: formCat.value.nome,
      tipo: formCat.value.tipo,
      icona: 'bi-grid-fill'
    }])
    if (error) throw error
    alert("Categoria creata!")
    formCat.value.nome = ''
    caricaListe()
  } catch (e) {
    alert("Errore: " + e.message)
  } finally {
    loading.value = false
  }
}

// --- AZIONE: CREA TAG (NUOVA!) ---
const creaTag = async () => {
  if (!formTag.value.nome) return alert("Inserisci il nome del Tag")
  try {
    loading.value = true
    const { error } = await supabase.from('tags').insert([{
      nome: formTag.value.nome,
      colore: 'bg-warning' // Default giallo
    }])
    if (error) throw error
    alert("Tag creato!")
    formTag.value.nome = ''
    caricaListe() // Ricarica liste per le regole
  } catch (e) {
    alert("Errore: " + e.message)
  } finally {
    loading.value = false
  }
}

// --- AZIONE: SALVA REGOLA (AGGIORNATA PER I TAG) ---
const salvaRegola = async () => {
  if (!formRegola.value.keyword) return alert("Inserisci la parola chiave")
  if (!formRegola.value.categoria && !formRegola.value.tag) return alert("Seleziona almeno una Categoria o un Tag")

  try {
    loading.value = true
    const { error } = await supabase.from('regole').insert([{
      keyword: formRegola.value.keyword.toLowerCase(),
      categoria: formRegola.value.categoria || null,   // Salva categoria se c'è
      tag_target: formRegola.value.tag || null          // Salva tag se c'è (colonna nuova)
    }])
    if (error) throw error
    
    alert("Regola salvata!")
    // Reset form
    formRegola.value.keyword = ''
    formRegola.value.categoria = ''
    formRegola.value.tag = ''
  } catch (e) {
    alert("Errore: " + e.message)
  } finally {
    loading.value = false
  }
}

// --- AZIONE: RICALCOLO INTELLIGENTE ---
const ricalcolaTutto = async () => {
  if(!confirm("Vuoi ri-applicare le regole a tutto lo storico?\n(I movimenti modificati a mano non verranno toccati)")) return
  
  try {
    loading.value = true
    const { data: regole } = await supabase.from('regole').select('*')
    
    // Scarica solo i movimenti NON protetti
    const { data: movimenti } = await supabase
      .from('transazioni')
      .select('*')
      .is('is_manual', false) 

    let aggiornati = 0
    
    for (const mov of movimenti) {
      const desc = mov.descrizione.toLowerCase()
      let updates = {} 
      let modificato = false

      // Cerca regole corrispondenti
      for (const r of regole) {
        if (desc.includes(r.keyword.toLowerCase())) {
          
          // 1. Applica Categoria (se la regola ne ha una)
          if (r.categoria) {
            updates.categoria = r.categoria
            modificato = true
          }

          // 2. Applica Tag (se la regola ne ha uno)
          // Nota: sovrascrive i tag automatici precedenti, ma mantiene pulito
          if (r.tag_target) {
            updates.tags = [r.tag_target] // Per ora ne mettiamo uno solo via regola
            modificato = true
          }
        }
      }
      
      if (modificato) {
        await supabase.from('transazioni').update(updates).eq('id', mov.id)
        aggiornati++
      }
    }
    alert(`Fatto! Aggiornati ${aggiornati} movimenti.`)
  } catch (e) {
    alert("Errore: " + e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container py-4">
    
    <!-- BANNER -->
    <div class="card bg-purple-gradient border-0 text-white mb-4 p-4 shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h4 class="fw-bold mb-1"><i class="bi bi-stars me-2"></i>Automazione</h4>
          <div class="opacity-75 small">Configura categorie e tag</div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      
      <!-- COLONNA 1: CREA -->
      <div class="col-md-6">
        <div class="card p-4 h-100 shadow-sm border-0">
          
          <!-- TABS -->
          <div class="d-flex justify-content-center mb-4 border-bottom pb-3">
             <button @click="activeTab='cat'" class="btn fw-bold me-2 rounded-pill px-4" :class="activeTab==='cat' ? 'btn-dark' : 'btn-light bg-transparent text-muted'">Categoria</button>
             <button @click="activeTab='tag'" class="btn fw-bold rounded-pill px-4" :class="activeTab==='tag' ? 'btn-dark' : 'btn-light bg-transparent text-muted'">Tag</button>
          </div>

          <!-- FORM CATEGORIA -->
          <div v-if="activeTab === 'cat'" class="animate-fade">
            <h6 class="fw-bold mb-3 text-primary">Nuova Categoria</h6>
            <div class="mb-3">
              <input v-model="formCat.nome" type="text" class="form-control" placeholder="Es. Palestra">
            </div>
            <div class="mb-3">
              <select v-model="formCat.tipo" class="form-select">
                <option>Uscita</option>
                <option>Entrata</option>
              </select>
            </div>
            <button @click="creaCategoria" class="btn btn-primary w-100 fw-bold py-2" :disabled="loading">Crea Categoria</button>
          </div>
          
           <!-- FORM TAG (ORA FUNZIONANTE) -->
           <div v-else class="animate-fade">
            <h6 class="fw-bold mb-3 text-warning text-dark">Nuovo Tag</h6>
            <div class="mb-3">
              <input v-model="formTag.nome" type="text" class="form-control" placeholder="Es. Vacanza 2025">
            </div>
            <button @click="creaTag" class="btn btn-warning w-100 fw-bold py-2 text-dark" :disabled="loading">Crea Tag</button>
          </div>

        </div>
      </div>

      <!-- COLONNA 2: REGOLE AVANZATE -->
      <div class="col-md-6">
        <div class="card p-4 h-100 shadow-sm border-0">
          <h6 class="fw-bold mb-3 text-info">Crea Regola</h6>
          <p class="small text-muted mb-3">Se la descrizione contiene la parola chiave...</p>
          
          <div class="mb-3">
             <label class="small fw-bold text-muted mb-1">Se contiene:</label>
             <input v-model="formRegola.keyword" type="text" class="form-control" placeholder="Es. amazon, netflix">
          </div>

          <div class="row g-2 mb-4">
            <div class="col-6">
               <label class="small fw-bold text-muted mb-1">Imposta Cat.</label>
               <select v-model="formRegola.categoria" class="form-select">
                 <option value="" selected>-- Nessuna --</option>
                 <option v-for="c in listaCategorie" :key="c.id" :value="c.nome">{{ c.nome }}</option>
               </select>
            </div>
            <div class="col-6">
               <label class="small fw-bold text-muted mb-1">Aggiungi Tag</label>
               <select v-model="formRegola.tag" class="form-select">
                 <option value="" selected>-- Nessuno --</option>
                 <option v-for="t in listaTag" :key="t.id" :value="t.nome">{{ t.nome }}</option>
               </select>
            </div>
          </div>

          <button @click="salvaRegola" class="btn btn-info text-white w-100 fw-bold py-2" :disabled="loading">Salva Regola</button>
        </div>
      </div>

    </div>

    <!-- FOOTER RICALCOLO -->
    <div class="card bg-light border-0 p-4 mt-4 shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
           <div class="bg-white text-dark rounded-circle p-3 me-3 shadow-sm"><i class="bi bi-arrow-repeat fs-4"></i></div>
           <div>
             <h6 class="fw-bold mb-0 text-dark">Ricalcolo Storico</h6>
             <small class="text-muted">Applica le nuove regole ai vecchi dati.</small>
           </div>
        </div>
        <button @click="ricalcolaTutto" class="btn btn-dark fw-bold shadow-sm" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          Esegui
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>