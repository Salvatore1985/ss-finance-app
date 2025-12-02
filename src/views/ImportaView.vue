<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { parseBankFile } from '../utils/BankParser'
import { applicaRegole } from '../utils/RuleEngine'
import ConflittoMovimento from '../components/Movimenti/ConflittoMovimento.vue'

const router = useRouter()

const step = ref(1)
const loading = ref(false)
const msgStato = ref('')

const fileInput = ref(null)
const formData = ref({ chiSeiNome: '', banca: '', note: '' })
const importData = ref({ targetUserId: null, movimenti: [], banca: '' })
const sessioneAttuale = ref(null)
const listaProfili = ref([])
const listaBanche = ref([])

const refConflitto = ref(null)
const conflictQueue = ref([])
const stats = ref({ inseriti: 0, sospesi: 0, uniti: 0, saltati: 0 })

// ================== ON MOUNT ==================
onMounted(async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('Auth error', authError)
    return
  }
  sessioneAttuale.value = user

  // Profili (chi sei)
  const { data: profili, error: profError } = await supabase
    .from('profili')
    .select('*')

  if (profError) {
    console.error('Errore profili', profError)
  } else {
    listaProfili.value = profili || []
    if (user && profili) {
      const mio = profili.find(p => p.id === user.id)
      if (mio) formData.value.chiSeiNome = mio.nome
    }
  }

  // Banche / conti
  const { data: conti, error: contiError } = await supabase
    .from('conti')
    .select('nome')
    .order('nome')

  if (contiError) {
    console.error('Errore conti', contiError)
  } else if (conti) {
    listaBanche.value = conti.map(c => c.nome)
  }
})

// ================== STEP 1: CARICA FILE ==================
const avviaImportazione = async () => {
  if (!formData.value.chiSeiNome) {
    alert("Seleziona 'Chi sei?'")
    return
  }

  const fileEl = fileInput.value
  const file = fileEl?.files?.[0]
  if (!file) {
    alert('Seleziona un file CSV o XLSX')
    return
  }

  const profiloTarget = listaProfili.value.find(
    p => p.nome === formData.value.chiSeiNome
  )
  if (!profiloTarget) {
    alert('Profilo non trovato nel database')
    return
  }

  importData.value.targetUserId = profiloTarget.id

  try {
    loading.value = true
    msgStato.value = 'Analisi file...'

    const res = await parseBankFile(file)

    importData.value.banca = formData.value.banca || res.banca
    importData.value.movimenti = res.movimenti.sort(
      (a, b) => new Date(a.data) - new Date(b.data)
    )

    step.value = 2
  } catch (e) {
    console.error(e)
    alert(e.message || 'Errore durante la lettura del file')
  } finally {
    loading.value = false
  }
}

// ================== STEP 2: DUPLICATI + SALVATAGGIO ==================
const confermaESalva = async () => {
  loading.value = true
  msgStato.value = 'Analisi duplicati...'

  // 1. Applica regole (categoria_id + categoria testo)
  const movsProcessati = await applicaRegole(importData.value.movimenti)

  if (!movsProcessati.length) {
    alert('Nessun movimento da importare')
    loading.value = false
    return
  }

  const dataMin = String(movsProcessati[0].data).split('T')[0]
  const dataMax = String(movsProcessati[movsProcessati.length - 1].data).split('T')[0]
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  const { data: storico, error } = await supabase
    .from('transazioni')
    .select('*')
    .eq('user_id', targetId)
    .eq('conto', banca)
    .gte('data', dataMin)
    .lte('data', dataMax)

  if (error) {
    console.error('Errore download storico:', error)
    alert('Errore connessione DB')
    loading.value = false
    return
  }

  const listaVerde = []
  const listaGialla = []

  movsProcessati.forEach(nuovo => {
    const dataNuovo = String(nuovo.data).split('T')[0]
    const impNuovo = parseFloat(nuovo.importo)

    const matches = (storico || []).filter(vecchio => {
      const dataVecchio = String(vecchio.data).split('T')[0]
      const stessaData = dataVecchio === dataNuovo

      const impVecchio = parseFloat(vecchio.importo)
      const stessoImporto = Math.abs(impVecchio - impNuovo) < 0.01

      const stessoConto = (vecchio.conto || '').trim() === banca.trim()
      return stessaData && stessoImporto && stessoConto
    })

    if (matches.length > 0) {
      listaGialla.push({ nuovo, matches })
    } else {
      listaVerde.push(nuovo)
    }
  })

  if (listaGialla.length > 5) {
    await salvaMassivoInStaging(listaVerde, listaGialla)
  } else {
    await avviaRisoluzioneInterattiva(listaVerde, listaGialla)
  }
}

const salvaMassivoInStaging = async (verdi, gialli) => {
  msgStato.value = 'Salvataggio massivo...'
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  const righeVerdi = verdi.map(m =>
    preparaRigaDB(m, targetId, banca, 'confermato')
  )
  const righeGialle = gialli.map(item =>
    preparaRigaDB(item.nuovo, targetId, banca, 'da_convalidare')
  )

  const tutte = [...righeVerdi, ...righeGialle]

  const { error } = await supabase.from('transazioni').insert(tutte)
  if (error) {
    console.error(error)
    alert('Errore DB: ' + error.message)
    loading.value = false
    return
  }

  await salvaLogEFile(tutte.length)
  alert(
    `Fatto! ${righeVerdi.length} salvati, ${righeGialle.length} in attesa di controllo.`
  )
  router.push('/movimenti')
}

const avviaRisoluzioneInterattiva = async (verdi, gialli) => {
  msgStato.value = 'Salvataggio...'
  const targetId = importData.value.targetUserId
  const banca = importData.value.banca

  // 1. Salva i sicuri
  if (verdi.length > 0) {
    const righe = verdi.map(m =>
      preparaRigaDB(m, targetId, banca, 'confermato')
    )
    const { error } = await supabase.from('transazioni').insert(righe)
    if (error) console.error(error)
    stats.value.inseriti += verdi.length
  }

  // 2. Nessun conflitto -> finito
  if (gialli.length === 0) {
    await salvaLogEFile(stats.value.inseriti)
    alert('Importazione completata senza conflitti!')
    router.push('/movimenti')
    return
  }

  // 3. Avvia la coda conflitti
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
  const nuovoArricchito = {
    ...item.nuovo,
    conto: importData.value.banca,
    user_id: importData.value.targetUserId,
    note: formData.value.note
  }
  refConflitto.value?.apri(item.matches, nuovoArricchito)
}

const gestisciRisoluzione = async ({ azione, dati }) => {
  loading.value = true

  if (azione === 'MERGE') {
    const { id, ...fields } = dati
    await supabase.from('transazioni').update(fields).eq('id', id)
    stats.value.uniti++
  } else if (azione === 'CREATE') {
    const riga = preparaRigaDB(
      dati,
      importData.value.targetUserId,
      importData.value.banca,
      'confermato'
    )
    await supabase.from('transazioni').insert([riga])
    stats.value.inseriti++
  } else if (azione === 'SKIP') {
    const riga = preparaRigaDB(
      conflictQueue.value[0].nuovo,
      importData.value.targetUserId,
      importData.value.banca,
      'da_convalidare'
    )
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
  alert(
    `Finito!\nInseriti: ${stats.value.inseriti}\nUniti: ${stats.value.uniti}\nSospesi: ${stats.value.sospesi}`
  )
  router.push('/movimenti')
}

// ================== UTILS ==================
const preparaRigaDB = (m, uid, conto, stato) => ({
  user_id: uid,
  data: m.data,
  descrizione: m.descrizione,
  importo: m.importo,
  tipo: m.tipo,
  categoria_banca: m.categoria_banca ?? null,
  categoria_id: m.categoria_id ?? null,
  categoria: m.categoria ?? null,
  conto: conto,
  tags: m.tags || [],
  stato: stato,
  note: formData.value.note
})

const salvaLogEFile = async (count) => {
  if (!sessioneAttuale.value) return

  const nomeFile = `Import ${formData.value.chiSeiNome} - ${importData.value.banca}.csv`
  const { error } = await supabase.from('importazioni_log').insert([{
    user_id: sessioneAttuale.value.id,
    banca: importData.value.banca,
    nome_file_generato: nomeFile,
    url_file: '',
    righe_importate: count
  }])

  if (error) console.error('Errore log importazioni', error)
}

const reset = () => {
  step.value = 1
  importData.value = { targetUserId: null, movimenti: [], banca: '' }
  stats.value = { inseriti: 0, sospesi: 0, uniti: 0, saltati: 0 }
  conflictQueue.value = []
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="page-fixed-layout">
    <!-- HEADER -->
    <header class="page-header px-4 py-3 bg-white border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h3 class="fw-bold text-dark m-0">Importa estratto conto</h3>
          <p class="text-muted small m-0">
            Carica il file dalla banca, applica le regole e salva i movimenti.
          </p>
        </div>
        <button
          class="btn btn-outline-secondary fw-bold"
          @click="router.push('/movimenti')"
        >
          <i class="bi bi-arrow-left me-1"></i> Torna ai movimenti
        </button>
      </div>
    </header>

    <!-- CONTENUTO SCORREVOLE -->
    <div class="page-content-scroll px-3 px-md-4 py-3 py-md-4">
      <!-- STEP 1 -->
      <div v-if="step === 1" class="mx-auto" style="max-width: 540px;">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-3 p-md-4">
            <h5 class="fw-semibold mb-3">Dati importazione</h5>

            <div class="mb-3">
              <label class="fw-bold small mb-1">Chi sei?</label>
              <select v-model="formData.chiSeiNome" class="form-select">
                <option disabled value="">Seleziona...</option>
                <option v-for="p in listaProfili" :key="p.id" :value="p.nome">
                  {{ p.nome }}
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="fw-bold small mb-1">Banca / Conto</label>
              <select v-model="formData.banca" class="form-select">
                <option value="">Rileva automaticamente</option>
                <option v-for="b in listaBanche" :key="b" :value="b">
                  {{ b }}
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="fw-bold small mb-1">File estratto (.csv / .xlsx)</label>
              <input
                type="file"
                ref="fileInput"
                class="form-control"
                accept=".csv, .xlsx"
              />
            </div>

            <div class="mb-3">
              <label class="fw-bold small mb-1">Note (facoltative)</label>
              <textarea
                v-model="formData.note"
                class="form-control"
                rows="2"
              ></textarea>
            </div>

            <button
              @click="avviaImportazione"
              class="btn btn-primary w-100 fw-bold"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="spinner-border spinner-border-sm me-2"
              ></span>
              {{ loading ? msgStato : 'AVVIA IMPORTAZIONE' }}
            </button>
          </div>
        </div>
      </div>

      <!-- STEP 2 -->
      <div v-else>
        <div class="card border-0 shadow-sm mb-3">
          <div
            class="card-body d-flex justify-content-between align-items-center flex-wrap gap-2"
          >
            <div>
              <div class="fw-semibold">Anteprima importazione</div>
              <div class="text-muted small">
                {{ importData.movimenti.length }} movimenti trovati |
                Banca: <strong>{{ importData.banca }}</strong> |
                Utente: <strong>{{ formData.chiSeiNome }}</strong>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary" @click="reset">
                Torna al file
              </button>
              <button
                @click="confermaESalva"
                class="btn btn-primary fw-bold"
                :disabled="loading"
              >
                <span
                  v-if="loading"
                  class="spinner-border spinner-border-sm me-2"
                ></span>
                {{ loading ? msgStato : 'CONFERMA E SALVA' }}
              </button>
            </div>
          </div>
        </div>

        <div class="alert alert-info small">
          I movimenti verranno analizzati per duplicati e salvati nel DB.
        </div>
      </div>

      <div style="height: 40px;"></div>
    </div>

    <!-- MODALE CONFLITTI -->
    <ConflittoMovimento ref="refConflitto" @risolto="gestisciRisoluzione" />
  </div>
</template>

<style scoped>
.page-fixed-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.page-header {
  flex-shrink: 0;
  z-index: 10;
}

.page-content-scroll {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.page-content-scroll::-webkit-scrollbar {
  width: 6px;
}
.page-content-scroll::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
</style>
