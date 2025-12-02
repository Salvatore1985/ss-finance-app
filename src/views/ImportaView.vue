<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { parseBankFile } from '../utils/BankParser'
import { applicaRegole } from '../utils/RuleEngine'
import { useRouter } from 'vue-router'
import ConflittoMovimento from '../components/Movimenti/ConflittoMovimento.vue'

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

const conflictQueue = ref([])
const stats = ref({ inseriti: 0, sospesi: 0, uniti: 0, saltati: 0 })

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
  if (!profiloTarget) return alert("Profilo non trovato nel database")
  
  importData.value.targetUserId = profiloTarget.id

  try {
    loading.value = true
    const res = await parseBankFile(file)
    importData.value.banca = formData.value.banca || res.banca
    importData.value.movimenti = res.movimenti.sort((a,b)=>new Date(a.data)-new Date(b.data))
    step.value = 2
  } catch(e) { alert(e.message) } finally { loading.value = false }
}

const confermaESalva = async () => {
  loading.value = true
  msgStato.value = "Analisi duplicati..."

  // 1. Dati Nuovi (dal file, con regole applicate)
  const movsProcessati = await applicaRegole(importData.value.movimenti)
  
  // Parametri per la ricerca nel DB (prendiamo solo YYYY-MM-DD per sicurezza)
  const dataMin = String(movsProcessati[0].data).split('T')[0]
  const dataMax = String(movsProcessati[movsProcessati.length - 1].data).split('T')[0]
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  console.log("--- DEBUG CONVALIDA ---")
  console.log(`Cercando nel DB tra: ${dataMin} e ${dataMax}`)
  console.log(`Conto: ${banca} | User: ${targetId}`)

  // 2. Scarica Storico (Dati Vecchi nello stesso range)
  const { data: storico, error } = await supabase
    .from('transazioni')
    .select('*')
    .eq('user_id', targetId)
    .eq('conto', banca)
    .gte('data', dataMin)
    .lte('data', dataMax)

  if (error) {
    console.error("Errore download storico:", error)
    alert("Errore connessione DB")
    loading.value = false
    return
  }
  
  console.log(`Movimenti trovati nel DB (Storico): ${storico.length}`)

  const listaVerde = []
  const listaGialla = []

  // 3. CONFRONTO RIGA PER RIGA ("IL CERVELLO")
  movsProcessati.forEach((nuovo, index) => {
    
    // Normalizziamo i dati del NUOVO movimento
    const dataNuovo = String(nuovo.data).split('T')[0] // Prende solo YYYY-MM-DD
    const impNuovo = parseFloat(nuovo.importo)

    // Filtriamo lo storico cercando un gemello
    const matches = storico.filter(vecchio => {
      // A. CONFRONTO DATA (Tagliata a 10 caratteri)
      const dataVecchio = String(vecchio.data).split('T')[0]
      const stessaData = dataVecchio === dataNuovo

      // B. CONFRONTO IMPORTO (Tolleranza 1 centesimo)
      const impVecchio = parseFloat(vecchio.importo)
      const stessoImporto = Math.abs(impVecchio - impNuovo) < 0.01

      // C. CONFRONTO CONTO (Trim spazi vuoti)
      // Nota: il conto è già filtrato dalla query iniziale, ma doppio controllo non guasta
      const stessoConto = vecchio.conto.trim() === banca.trim()

      // LOG DI DEBUG (Solo per il primo movimento per capire cosa succede)
      if (index === 0) {
         console.log(`CHECK RIGA 1 -> DB: [${dataVecchio}, ${impVecchio}] vs FILE: [${dataNuovo}, ${impNuovo}]`)
         console.log(`   Esito: Data=${stessaData} Importo=${stessoImporto}`)
      }

      return stessaData && stessoImporto && stessoConto
    })

    if (matches.length > 0) {
      if (index === 0) console.log("   ✅ DUPLICATO TROVATO!")
      listaGialla.push({ nuovo, matches })
    } else {
      if (index === 0) console.log("   ❌ NESSUN MATCH TROVATO (Verrà creato nuovo)")
      listaVerde.push(nuovo)
    }
  })

  console.log(`RISULTATO FINALE -> Nuovi: ${listaVerde.length} | Conflitti: ${listaGialla.length}`)

  // 4. SMISTAMENTO (La Regola del 5)
  if (listaGialla.length > 5) {
    await salvaMassivoInStaging(listaVerde, listaGialla)
  } else {
    await avviaRisoluzioneInterattiva(listaVerde, listaGialla)
  }
}
const salvaMassivoInStaging = async (verdi, gialli) => {
  msgStato.value = "Salvataggio massivo..."
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  const righeVerdi = verdi.map(m => preparaRigaDB(m, targetId, banca, 'confermato'))
  const righeGialle = gialli.map(item => preparaRigaDB(item.nuovo, targetId, banca, 'da_convalidare'))

  const tutte = [...righeVerdi, ...righeGialle]
  
  const { error } = await supabase.from('transazioni').insert(tutte)
  if (error) return alert("Errore DB: " + error.message)

  await salvaLogEFile(tutte.length)
  alert(`Fatto! ${righeVerdi.length} salvati, ${righeGialle.length} in attesa di controllo.`)
  router.push('/')
}

const avviaRisoluzioneInterattiva = async (verdi, gialli) => {
  msgStato.value = "Salvataggio..."
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  // 1. Salva i sicuri
  if (verdi.length > 0) {
    const righe = verdi.map(m => preparaRigaDB(m, targetId, banca, 'confermato'))
    await supabase.from('transazioni').insert(righe)
    stats.value.inseriti += verdi.length
  }

  // 2. Se non ci sono conflitti, fine
  if (gialli.length === 0) {
    await salvaLogEFile(verdi.length)
    alert("Importazione completata senza conflitti!")
    router.push('/')
    return
  }

  // 3. Gestisci conflitti
  conflictQueue.value = gialli
  loading.value = false 
  processaProssimoConflitto()
}

const processaProssimoConflitto = () => {
  if (conflictQueue.value.length === 0) {
    fineProcessoInterattivo()
    return
  }
  const item = conflictQueue.value[0]
  const nuovoArricchito = { ...item.nuovo, conto: importData.value.banca, user_id: importData.value.targetUserId, note: formData.value.note }
  refConflitto.value.apri(item.matches, nuovoArricchito)
}

const gestisciRisoluzione = async ({ azione, dati }) => {
  loading.value = true
  
  if (azione === 'MERGE') {
    const { id, ...fields } = dati
    await supabase.from('transazioni').update(fields).eq('id', id)
    stats.value.uniti++
  } else if (azione === 'CREATE') {
    const riga = preparaRigaDB(dati, importData.value.targetUserId, importData.value.banca, 'confermato')
    await supabase.from('transazioni').insert([riga])
    stats.value.inseriti++
  } else if (azione === 'SKIP') {
    const riga = preparaRigaDB(conflictQueue.value[0].nuovo, importData.value.targetUserId, importData.value.banca, 'da_convalidare')
    await supabase.from('transazioni').insert([riga])
    stats.value.sospesi++
  }

  conflictQueue.value.shift()
  loading.value = false
  processaProssimoConflitto()
}

const fineProcessoInterattivo = async () => {
  loading.value = true
  const tot = stats.value.inseriti + stats.value.uniti + stats.value.sospesi
  await salvaLogEFile(tot)
  alert(`Finito!\nInseriti: ${stats.value.inseriti}\nUniti: ${stats.value.uniti}\nSospesi: ${stats.value.sospesi}`)
  router.push('/')
}

const preparaRigaDB = (m, uid, conto, stato) => ({
  user_id: uid, data: m.data, descrizione: m.descrizione, importo: m.importo, tipo: m.tipo, categoria: m.categoria, conto: conto, tags: m.tags || [], stato: stato, note: formData.value.note
})

const salvaLogEFile = async (count) => {
  // ... (tieni la logica di salvataggio file CSV che avevi prima, è corretta) ...
  // Per brevità qui metto solo il log DB
  const nomeFile = `Import ${formData.value.chiSeiNome} - ${importData.value.banca}.csv`
  await supabase.from('importazioni_log').insert([{
    user_id: sessioneAttuale.value.id,
    banca: importData.value.banca,
    nome_file_generato: nomeFile,
    url_file: '', // Metti URL vero se fai upload
    righe_importate: count
  }])
}

const reset = () => { step.value = 1; if(fileInput.value) fileInput.value.value = ''; }
</script>

<template>
  <div class="container py-4">
    <h4 class="fw-bold text-center mb-4">Importa Estratto</h4>

    <div v-if="step === 1" class="mx-auto" style="max-width: 500px;">
        <div class="mb-3">
           <label class="fw-bold small">Chi sei?</label>
           <select v-model="formData.chiSeiNome" class="form-select"><option v-for="p in listaProfili" :key="p.id" :value="p.nome">{{p.nome}}</option></select>
        </div>
        <div class="mb-3">
           <label class="fw-bold small">Banca</label>
           <select v-model="formData.banca" class="form-select"><option value="" selected>Rileva...</option><option v-for="b in listaBanche" :key="b" :value="b">{{b}}</option></select>
        </div>
        <div class="mb-3"><label class="fw-bold small">File</label><input type="file" ref="fileInput" class="form-control" accept=".csv, .xlsx" @change="(e)=>fileInput.value=e.target"></div>
        <div class="mb-3"><textarea v-model="formData.note" class="form-control" placeholder="Note..."></textarea></div>
        
        <button @click="avviaImportazione" class="btn btn-success w-100 fw-bold" :disabled="loading">
           {{ loading ? 'Analisi...' : 'AVVIA IMPORTAZIONE' }}
        </button>
    </div>

    <div v-if="step === 2">
       <div class="alert alert-info">Anteprima: {{ importData.movimenti.length }} righe trovate.</div>
       <!-- Qui va la tabella di anteprima che hai già -->
       
       <div class="text-end mt-3">
         <button @click="confermaESalva" class="btn btn-primary px-5 fw-bold" :disabled="loading">
           <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
           {{ loading ? msgStato : 'CONFERMA E SALVA' }}
         </button>
       </div>
    </div>

    <ConflittoMovimento ref="refConflitto" @risolto="gestisciRisoluzione" />
  </div>
</template>