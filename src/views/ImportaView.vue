<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { parseBankFile } from '../utils/BankParser'
import { applicaRegole } from '../utils/RuleEngine'
import { useRouter } from 'vue-router'
import ConflittoMovimento from '../components/ConflittoMovimento.vue'

const router = useRouter()
const step = ref(1)
const loading = ref(false)
const msgStato = ref('')
const refConflitto = ref(null)

const fileInput = ref(null)
const formData = ref({ chiSeiNome: '', banca: '', note: '' })
const importData = ref({ targetUserId: null, movimenti: [], banca: '' })
const sessioneAttuale = ref(null)
const listaProfili = ref([])
const listaBanche = ref([])

// Code per la gestione interattiva
const conflictQueue = ref([]) // Coda dei conflitti da risolvere a mano
const stats = ref({ inseriti: 0, sospesi: 0, uniti: 0, saltati: 0 })

// --- INIT ---
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  sessioneAttuale.value = user
  const { data: profili } = await supabase.from('profili').select('*')
  listaProfili.value = profili || []
  if (user && profili) {
    const mio = profili.find(p => p.id === user.id)
    if (mio) formData.value.chiSeiNome = mio.nome
  }
  const { data: conti } = await supabase.from('conti').select('nome').order('nome')
  if (conti) listaBanche.value = conti.map(c => c.nome)
})

const avviaImportazione = async () => {
  if (!formData.value.chiSeiNome) return alert("Seleziona 'Chi sei?'")
  const file = fileInput.value?.files[0]
  if (!file) return alert("Seleziona file")

  const profiloTarget = listaProfili.value.find(p => p.nome === formData.value.chiSeiNome)
  if (!profiloTarget) return alert("Profilo non trovato")
  importData.value.targetUserId = profiloTarget.id

  try {
    loading.value = true
    const res = await parseBankFile(file)
    importData.value.banca = formData.value.banca || res.banca
    importData.value.movimenti = res.movimenti.sort((a,b)=>new Date(a.data)-new Date(b.data))
    step.value = 2
  } catch(e) { alert(e.message) } finally { loading.value = false }
}

// ============================================================
//  CORE: PRE-SCANSIONE E SMISTAMENTO
// ============================================================

const confermaESalva = async () => {
  loading.value = true
  msgStato.value = "Analisi duplicati e regole..."

  // 1. Applica Regole (Categorie/Tag)
  const movsProcessati = await applicaRegole(importData.value.movimenti)
  
  // 2. Recupera dati dal DB per confronto (solo range date e conto specifico)
  const dataMin = movsProcessati[0].data
  const dataMax = movsProcessati[movsProcessati.length - 1].data
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  const { data: storico } = await supabase
    .from('transazioni')
    .select('id, data, importo, conto, descrizione, categoria, file_url, note, tags')
    .eq('user_id', targetId)
    .eq('conto', banca)
    .gte('data', dataMin)
    .lte('data', dataMax)

  // 3. Dividi in liste: VERDI (Sicuri) e GIALLI (Conflitti)
  const listaVerde = []
  const listaGialla = [] // Conterrà oggetti { nuovo: mov, matches: [] }

  movsProcessati.forEach(nuovo => {
    // Criterio duplicato: Stessa Data + Stesso Importo
    // (Non controlliamo descrizione per sicurezza, meglio un falso positivo che un doppione)
    const matches = storico.filter(vecchio => 
      vecchio.data === nuovo.data && 
      parseFloat(vecchio.importo) === parseFloat(nuovo.importo)
    )

    if (matches.length > 0) {
      listaGialla.push({ nuovo, matches })
    } else {
      listaVerde.push(nuovo)
    }
  })

  // 4. DECISIONE STRATEGICA (La regola del 5)
  if (listaGialla.length > 5) {
    await salvaMassivoInStaging(listaVerde, listaGialla)
  } else {
    await avviaRisoluzioneInterattiva(listaVerde, listaGialla)
  }
}

// --- CASO A: TROPPI CONFLITTI -> SALVA IN STAGING ---
const salvaMassivoInStaging = async (verdi, gialli) => {
  msgStato.value = "Salvataggio massivo..."
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  // Prepara Verdi (Confermati)
  const righeVerdi = verdi.map(m => preparaRigaDB(m, targetId, banca, 'confermato'))
  
  // Prepara Gialli (Da Convalidare)
  const righeGialle = gialli.map(item => preparaRigaDB(item.nuovo, targetId, banca, 'da_convalidare'))

  const tutteLeRighe = [...righeVerdi, ...righeGialle]

  // Insert unica
  const { error } = await supabase.from('transazioni').insert(tutteLeRighe)
  if (error) return alert("Errore DB: " + error.message)

  // Log e Chiusura
  await salvaLogEFile(tutteLeRighe.length)
  
  alert(`IMPORTAZIONE COMPLETATA!\n\n✅ Confermati: ${righeVerdi.length}\n⚠️ In 'Check': ${righeGialle.length}\n\nTroppi conflitti per gestirli ora. Vai nella pagina 'Check' per sistemarli con calma.`)
  router.push('/')
}

// --- CASO B: POCHI CONFLITTI -> INTERATTIVO ---
const avviaRisoluzioneInterattiva = async (verdi, gialli) => {
  msgStato.value = "Salvataggio dati sicuri..."
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  // 1. Salva subito i Verdi
  if (verdi.length > 0) {
    const righeVerdi = verdi.map(m => preparaRigaDB(m, targetId, banca, 'confermato'))
    await supabase.from('transazioni').insert(righeVerdi)
    stats.value.inseriti += verdi.length
  }

  // 2. Se non ci sono gialli, abbiamo finito
  if (gialli.length === 0) {
    await salvaLogEFile(verdi.length)
    alert(`Tutto pulito! Importati ${verdi.length} movimenti.`)
    router.push('/')
    return
  }

  // 3. Prepara la coda per il modale
  conflictQueue.value = gialli // Array di {nuovo, matches}
  loading.value = false // Nascondi spinner, mostra modale
  processaProssimoConflitto()
}

// --- LOOP INTERATTIVO ---
const processaProssimoConflitto = () => {
  if (conflictQueue.value.length === 0) {
    fineProcessoInterattivo()
    return
  }

  const currentItem = conflictQueue.value[0]
  // Arricchiamo l'oggetto nuovo con dati di contesto per il modale
  const nuovoArricchito = {
    ...currentItem.nuovo,
    conto: importData.value.banca,
    user_id: importData.value.targetUserId,
    note: formData.value.note
  }

  // Apri il modale (passiamo i match trovati nel DB e il nuovo movimento)
  refConflitto.value.apri(currentItem.matches, nuovoArricchito)
}

// Callback dal modale
const gestisciRisoluzione = async ({ azione, dati }) => {
  loading.value = true // Spinner momentaneo tra un modale e l'altro
  
  if (azione === 'MERGE') {
    const { id, ...fields } = dati
    await supabase.from('transazioni').update(fields).eq('id', id)
    stats.value.uniti++
  } 
  else if (azione === 'CREATE') {
    const riga = preparaRigaDB(dati, importData.value.targetUserId, importData.value.banca, 'confermato')
    await supabase.from('transazioni').insert([riga])
    stats.value.inseriti++
  } 
  else if (azione === 'SKIP') {
    // Se salta, potremmo volerlo salvare come 'da_convalidare' o buttarlo. 
    // Per ora lo salviamo come 'da_convalidare' per non perdere dati.
    const riga = preparaRigaDB(conflictQueue.value[0].nuovo, importData.value.targetUserId, importData.value.banca, 'da_convalidare')
    await supabase.from('transazioni').insert([riga])
    stats.value.sospesi++
  }

  conflictQueue.value.shift() // Rimuovi dalla coda
  loading.value = false
  processaProssimoConflitto()
}

const fineProcessoInterattivo = async () => {
  loading.value = true
  const tot = stats.value.inseriti + stats.value.uniti + stats.value.sospesi
  await salvaLogEFile(tot)
  
  alert(`Finito!\n\n✅ Nuovi: ${stats.value.inseriti}\n🔄 Uniti: ${stats.value.uniti}\n⚠️ Sospesi: ${stats.value.sospesi}`)
  router.push('/')
}

// --- UTILS ---
const preparaRigaDB = (m, uid, conto, stato) => ({
  user_id: uid,
  data: m.data,
  descrizione: m.descrizione,
  importo: m.importo,
  tipo: m.tipo,
  categoria: m.categoria,
  conto: conto,
  tags: m.tags || [], // Assicura array
  stato: stato,
  note: formData.value.note
})

const salvaLogEFile = async (righeCount) => {
  // 1. Genera CSV
  const movs = importData.value.movimenti
  const nomeScelto = formData.value.chiSeiNome
  const banca = importData.value.banca
  const dataMin = movs[0].data
  const dataMax = movs[movs.length - 1].data
  const fmt = d => d.split('-').reverse().join('-')
  const nomeFile = `${nomeScelto} - ${banca} (${fmt(dataMin)} al ${fmt(dataMax)}).csv`

  let csv = "Data,Descrizione,Importo,Tipo,Categoria\n"
  movs.forEach(m => csv += `${m.data},"${m.descrizione}",${m.importo},${m.tipo},${m.categoria}\n`)
  
  // 2. Upload
  const blob = new Blob([csv], { type: 'text/csv' })
  await supabase.storage.from('estratti').upload(`${importData.value.targetUserId}/${nomeFile}`, blob, { upsert: true })
  
  const { data: { publicUrl } } = supabase.storage.from('estratti').getPublicUrl(`${importData.value.targetUserId}/${nomeFile}`)

  // 3. Log DB
  await supabase.from('importazioni_log').insert([{
    user_id: sessioneAttuale.value.id,
    banca: banca,
    nome_file_generato: nomeFile,
    url_file: publicUrl,
    data_inizio: dataMin,
    data_fine: dataMax,
    righe_importate: righeCount
  }])
}

const reset = () => { step.value = 1; if(fileInput.value) fileInput.value.value = ''; }
</script>

<template>
  <div class="container py-4">
    <h4 class="fw-bold text-center mb-4">Importa Estratto</h4>

    <!-- STEP 1: FORM -->
    <div v-if="step === 1" class="mx-auto" style="max-width: 500px;">
      
      <div class="mb-3">
        <label class="form-label text-dark fw-bold small">Chi sei?</label>
        <select v-model="formData.chiSeiNome" class="form-select form-select-lg bg-white border shadow-sm" style="border-radius: 12px;">
          <option value="" disabled>Seleziona</option>
          <option v-for="p in listaProfili" :key="p.id" :value="p.nome">{{ p.nome }}</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label text-dark fw-bold small">Banca</label>
        <select v-model="formData.banca" class="form-select form-select-lg bg-white border shadow-sm" style="border-radius: 12px;">
          <option value="" selected>Rileva dal file...</option>
          <option v-for="b in listaBanche" :key="b" :value="b">🏦 {{ b }}</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label text-dark fw-bold small">File</label>
        <input type="file" ref="fileInput" class="form-control form-control-lg shadow-sm" style="border-radius: 12px;" accept=".csv, .xlsx, .xls">
      </div>

      <div class="mb-4">
        <label class="form-label text-dark fw-bold small">Note (Opzionale)</label>
        <textarea v-model="formData.note" class="form-control shadow-sm" rows="2" style="border-radius: 12px;"></textarea>
      </div>

      <button @click="avviaImportazione" class="btn btn-success w-100 py-3 fw-bold shadow-sm rounded-3" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
        {{ loading ? 'Analisi...' : 'AVVIA IMPORTAZIONE' }}
      </button>
    </div>

    <!-- STEP 2: ANTEPRIMA -->
    <div v-if="step === 2" class="card border-0 shadow-sm mt-3">
      <div class="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="fw-bold mb-0">Anteprima</h5>
          <div class="text-muted small">Righe: {{ importData.movimenti.length }} • Conto: {{ importData.banca }}</div>
        </div>
        <button @click="reset" class="btn btn-outline-secondary btn-sm px-3 rounded-pill">Annulla</button>
      </div>

      <div class="table-responsive bg-white" style="max-height: 400px;">
        <table class="table table-hover align-middle mb-0">
          <thead class="bg-light sticky-top">
            <tr><th class="ps-3">Data</th><th>Descrizione</th><th class="text-end pe-3">Importo</th></tr>
          </thead>
          <tbody>
            <tr v-for="(m, idx) in importData.movimenti" :key="idx">
              <td class="small ps-3">{{ m.data }}</td>
              <td class="small text-truncate" style="max-width: 200px;">{{ m.descrizione }}</td>
              <td class="text-end fw-bold pe-3" :class="m.tipo==='Uscita'?'text-dark':'text-success'">{{ m.importo.toFixed(2) }} €</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-footer bg-white border-0 py-3 text-end">
        <button @click="confermaESalva" class="btn btn-primary px-5 py-2 fw-bold shadow-sm rounded-pill" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          {{ loading ? msgStato : 'CONFERMA E SALVA' }}
        </button>
      </div>
    </div>

    <!-- COMPONENTE CONFLITTO (Appare solo se <= 5 conflitti) -->
    <ConflittoMovimento ref="refConflitto" @risolto="gestisciRisoluzione" />

  </div>
</template>