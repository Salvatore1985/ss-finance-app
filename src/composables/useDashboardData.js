import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'

export function useDashboardData() {
  const loading = ref(false)
  const errore = ref('')
  const transazioni = ref([])

  const oggi = new Date()
  const meseCorrente = oggi.getMonth()
  const annoCorrente = oggi.getFullYear()

  // Solo transazioni confermate
  const transazioniConfermate = computed(() =>
    transazioni.value.filter(t => !t.stato || t.stato === 'confermato')
  )

  // Saldo totale
  const saldo = computed(() =>
    transazioniConfermate.value.reduce(
      (sum, t) => sum + Number(t.importo || 0),
      0
    )
  )

  // Entrate / uscite mese corrente
  const entrateMese = computed(() =>
    transazioniConfermate.value.reduce((sum, t) => {
      if (!t.data) return sum
      const d = new Date(t.data)
      if (d.getMonth() !== meseCorrente || d.getFullYear() !== annoCorrente) return sum
      const imp = Number(t.importo || 0)
      return imp > 0 ? sum + imp : sum
    }, 0)
  )

  const usciteMese = computed(() =>
    transazioniConfermate.value.reduce((sum, t) => {
      if (!t.data) return sum
      const d = new Date(t.data)
      if (d.getMonth() !== meseCorrente || d.getFullYear() !== annoCorrente) return sum
      const imp = Number(t.importo || 0)
      return imp < 0 ? sum + imp : sum
    }, 0)
  )

  // Movimenti recenti (per la tua lista “ultimi movimenti”)
  const movimentiRecenti = computed(() => {
    const arr = [...transazioniConfermate.value]
    return arr
      .sort((a, b) => {
        const da = new Date(a.data)
        const db = new Date(b.data)
        if (db - da !== 0) return db - da
        return (b.id || 0) - (a.id || 0)
      })
      .slice(0, 7)
  })

  // Spese per categoria nel mese corrente (solo uscite)
  const topCategorie = computed(() => {
    const mappa = new Map()

    for (const t of transazioniConfermate.value) {
      if (!t.data) continue
      const d = new Date(t.data)
      if (d.getMonth() !== meseCorrente || d.getFullYear() !== annoCorrente) continue

      const imp = Number(t.importo || 0)
      if (imp >= 0) continue // consideriamo solo uscite

      const nomeCategoria = t.categoria || t.categoria_banca || 'Da classificare'
      const attuale = mappa.get(nomeCategoria) || 0
      mappa.set(nomeCategoria, attuale + imp) // imp è negativo
    }

    const arr = Array.from(mappa.entries())
    arr.sort((a, b) => a[1] - b[1]) // più negativo = più spesa

    return arr.slice(0, 5).map(([nome, totaleNegativo]) => ({
      nome,
      totale: Math.abs(totaleNegativo) // lo mostriamo positivo
    }))
  })

  // Se ti serve per i grafici
  const transazioniPerGrafico = computed(() => transazioniConfermate.value)

  const formatMoney = (val) =>
    new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(val || 0)

  // Caricamento iniziale
  onMounted(async () => {
    loading.value = true
    errore.value = ''

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error(authError)
      errore.value = 'Errore di autenticazione'
      loading.value = false
      return
    }

    const { data, error: dbError } = await supabase
      .from('transazioni')
      .select('id, data, descrizione, importo, tipo, categoria, categoria_banca, categoria_id, conto, tags, stato')
      .eq('user_id', user.id)
      .order('data', { ascending: true })

    if (dbError) {
      console.error(dbError)
      errore.value = 'Errore nel caricamento dei dati'
      transazioni.value = []
    } else {
      transazioni.value = data || []
    }

    loading.value = false
  })

  return {
    loading,
    errore,
    transazioni,
    transazioniConfermate,
    saldo,
    entrateMese,
    usciteMese,
    movimentiRecenti,
    topCategorie,
    transazioniPerGrafico,
    formatMoney
  }
}
