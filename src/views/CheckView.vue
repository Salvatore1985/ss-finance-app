<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const loading = ref(true)
const items = ref([])

const loadChecks = async () => {
  loading.value = true
  items.value = []
  try {
    // 1. Prendi TUTTI i sospesi
    const { data: sospesi, error } = await supabase
      .from('transazioni')
      .select('*')
      .eq('stato', 'da_convalidare')
      .order('data', { ascending: false })

    if (error) throw error

    // 2. Cerca i match
    for (const p of sospesi) {
      const { data: matches } = await supabase
        .from('transazioni')
        .select('*')
        .eq('stato', 'confermato')
        .eq('data', p.data)
        .eq('importo', p.importo)
        .eq('conto', p.conto)
        .limit(1)

      items.value.push({ pending: p, match: matches?.[0] })
    }
  } catch (e) { alert(e.message) } finally { loading.value = false }
}

onMounted(() => loadChecks())

const unisci = async (index) => {
  const item = items.value[index]
  const vecchio = item.match
  const nuovo = item.pending
  if (!vecchio) return

  try {
    const tagsUniti = [...new Set([...(vecchio.tags || []), ...(nuovo.tags || [])])]
    let notaFinale = vecchio.note || ''
    if (nuovo.note) notaFinale += ` | ${nuovo.note}`
    
    await supabase.from('transazioni').update({
      tags: tagsUniti,
      note: notaFinale,
      file_url: vecchio.file_url || nuovo.file_url 
    }).eq('id', vecchio.id)

    await supabase.from('transazioni').delete().eq('id', nuovo.id)
    items.value.splice(index, 1)
  } catch (e) { alert("Errore Unione: " + e.message) }
}

const confermaNuovo = async (index) => {
  const item = items.value[index]
  try {
    await supabase.from('transazioni').update({ stato: 'confermato' }).eq('id', item.pending.id)
    items.value.splice(index, 1)
  } catch (e) { alert(e.message) }
}

const scarta = async (index) => {
  if(!confirm("Eliminare?")) return
  try {
    await supabase.from('transazioni').delete().eq('id', items.value[index].pending.id)
    items.value.splice(index, 1)
  } catch (e) { alert(e.message) }
}
</script>

<template>
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold m-0">Check</h4>
      <span class="badge bg-light text-dark border">{{ items.length }}</span>
    </div>

    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    <div v-else-if="items.length === 0" class="text-center py-5 text-muted">Tutto pulito!</div>

    <div v-else class="d-flex flex-column gap-3">
      <div v-for="(item, idx) in items" :key="item.pending.id" class="card border-0 shadow-sm">
        <div class="card-header bg-white border-0 pt-3 d-flex justify-content-between">
          <span class="fw-bold text-primary">{{ new Date(item.pending.data).toLocaleDateString() }}</span>
          <span class="fw-bold">{{ item.pending.importo }} €</span>
        </div>
        <div class="card-body">
          <div v-if="item.match" class="row g-0 border rounded-3 mb-3">
            <div class="col-6 border-end p-2 bg-warning bg-opacity-10">
              <div class="badge bg-warning text-dark mb-1">Nuovo</div>
              <div class="small fw-bold text-truncate">{{ item.pending.descrizione }}</div>
            </div>
            <div class="col-6 p-2 bg-light">
              <div class="badge bg-secondary mb-1">Esistente</div>
              <div class="small fw-bold text-truncate text-muted">{{ item.match.descrizione }}</div>
            </div>
          </div>
          
          <div v-else class="mb-3">
             <h6 class="fw-bold">{{ item.pending.descrizione }}</h6>
          </div>

          <div class="d-flex gap-2">
            <template v-if="item.match">
              <button @click="unisci(idx)" class="btn btn-dark flex-grow-1 fw-bold shadow-sm">UNISCI</button>
              <button @click="confermaNuovo(idx)" class="btn btn-outline-secondary">Crea Nuovo</button>
            </template>
            <template v-else>
              <button @click="confermaNuovo(idx)" class="btn btn-success flex-grow-1 fw-bold shadow-sm">CONFERMA</button>
            </template>
            <button @click="scarta(idx)" class="btn btn-outline-danger"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>