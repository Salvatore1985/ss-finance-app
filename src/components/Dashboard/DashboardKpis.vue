<template>
  <div class="kpi-row">
    <KpiSaldo
      :saldo="saldoTotale"
      :loading="loadingSaldo"
      :error="erroreSaldo"
      :active-user-label="activeUserLabel"
    />

    <KpiEntrate
      :totale="totaleEntrate"
      :loading="loadingEntrate"
      :error="erroreEntrate"
      :active-user-label="activeUserLabel"
    />

    <KpiUscite
      :totale="totaleUscite"
      :loading="loadingUscite"
      :error="erroreUscite"
      :active-user-label="activeUserLabel"
    />

    <KpiRisparmio
      :risparmio="risparmio"
      :loading="loadingRisparmio"
      :error="erroreRisparmio"
      :active-user-label="activeUserLabel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase'

import KpiSaldo from '@/components/Dashboard/Elements/KpiSaldo.vue'
import KpiEntrate from '@/components/Dashboard/Elements/KpiEntrate.vue'
import KpiUscite from '@/components/Dashboard/Elements/KpiUscite.vue'
import KpiRisparmio from '@/components/Dashboard/Elements/KpiRisparmio.vue'

const props = defineProps({
  activeUser: {
    type: String,
    default: 'all'
  }
})

// Profili (Salvo, Sigi, ecc.)
const profili = ref([])

// KPI 1: saldo
const loadingSaldo = ref(false)
const saldoTotale = ref(0)
const erroreSaldo = ref(null)

// KPI 2: entrate
const loadingEntrate = ref(false)
const totaleEntrate = ref(0)
const erroreEntrate = ref(null)

// KPI 3: uscite
const loadingUscite = ref(false)
const totaleUscite = ref(0)
const erroreUscite = ref(null)

// KPI 4: risparmio (da entrate/uscite)
const risparmio = computed(() => totaleEntrate.value - totaleUscite.value)
const loadingRisparmio = computed(() => loadingEntrate.value || loadingUscite.value)
const erroreRisparmio = computed(() => erroreEntrate.value || erroreUscite.value)

// Label utente attivo
const activeUserLabel = computed(() => {
  if (props.activeUser === 'salvo') return 'Salvo'
  if (props.activeUser === 'sigi') return 'Sigi'
  return 'Tutti gli utenti'
})

// Id profili da usare in base a activeUser
const profiloIdsAttivi = computed(() => {
  if (!profili.value || profili.value.length === 0) return []

  if (props.activeUser === 'all') {
    return profili.value.map(p => p.id)
  }

  const targetName = props.activeUser.toLowerCase()
  return profili.value
    .filter(p => p.nome && p.nome.toLowerCase().includes(targetName))
    .map(p => p.id)
})

// Carica profili + KPI all'avvio
onMounted(async () => {
  try {
    const { data: profiliDB, error } = await supabase
      .from('profili')
      .select('id, nome')

    if (!error && profiliDB) {
      profili.value = profiliDB
    }
  } catch (e) {
    console.error('Errore caricamento profili:', e)
  } finally {
    await Promise.all([caricaSaldo(), caricaEntrate(), caricaUscite()])
  }
})

// Quando cambia l'utente (Tutti / Salvo / Sigi) ricarico tutti i KPI
watch(
  () => props.activeUser,
  () => {
    caricaSaldo()
    caricaEntrate()
    caricaUscite()
  }
)

/* ========= FUNZIONI KPI ========= */

// Saldo totale (tutte le transazioni confermate)
async function caricaSaldo () {
  loadingSaldo.value = true
  erroreSaldo.value = null

  try {
    let query = supabase
      .from('transazioni')
      .select('importo, stato, user_id')

    const ids = profiloIdsAttivi.value
    if (ids.length > 0) query = query.in('user_id', ids)

    query = query.eq('stato', 'confermato')

    const { data, error } = await query

    if (error) {
      console.error('Errore transazioni (saldo):', error)
      erroreSaldo.value = 'DB'
      saldoTotale.value = 0
      return
    }

    const somma = (data || []).reduce(
      (acc, riga) => acc + (Number(riga.importo) || 0),
      0
    )

    saldoTotale.value = somma
  } catch (e) {
    console.error('Errore calcolo saldo:', e)
    erroreSaldo.value = 'GEN'
    saldoTotale.value = 0
  } finally {
    loadingSaldo.value = false
  }
}

// Entrate totali (importo > 0, confermate)
async function caricaEntrate () {
  loadingEntrate.value = true
  erroreEntrate.value = null

  try {
    let query = supabase
      .from('transazioni')
      .select('importo, stato, user_id')

    const ids = profiloIdsAttivi.value
    if (ids.length > 0) query = query.in('user_id', ids)

    query = query
      .eq('stato', 'confermato')
      .gt('importo', 0)

    const { data, error } = await query

    if (error) {
      console.error('Errore transazioni (entrate):', error)
      erroreEntrate.value = 'DB'
      totaleEntrate.value = 0
      return
    }

    const somma = (data || []).reduce(
      (acc, riga) => acc + (Number(riga.importo) || 0),
      0
    )

    totaleEntrate.value = somma
  } catch (e) {
    console.error('Errore calcolo entrate:', e)
    erroreEntrate.value = 'GEN'
    totaleEntrate.value = 0
  } finally {
    loadingEntrate.value = false
  }
}

// Uscite totali (importo < 0, confermate) – somma valori assoluti
async function caricaUscite () {
  loadingUscite.value = true
  erroreUscite.value = null

  try {
    let query = supabase
      .from('transazioni')
      .select('importo, stato, user_id')

    const ids = profiloIdsAttivi.value
    if (ids.length > 0) query = query.in('user_id', ids)

    query = query
      .eq('stato', 'confermato')
      .lt('importo', 0)

    const { data, error } = await query

    if (error) {
      console.error('Errore transazioni (uscite):', error)
      erroreUscite.value = 'DB'
      totaleUscite.value = 0
      return
    }

    const somma = (data || []).reduce(
      (acc, riga) => acc + Math.abs(Number(riga.importo) || 0),
      0
    )

    totaleUscite.value = somma
  } catch (e) {
    console.error('Errore calcolo uscite:', e)
    erroreUscite.value = 'GEN'
    totaleUscite.value = 0
  } finally {
    loadingUscite.value = false
  }
}
</script>

<style scoped>
.kpi-row {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 12px;
  min-height: 0;
}

/* ogni componente KPI si allarga in modo uniforme */
.kpi-row > * {
  flex: 1 1 0;
}

/* responsive: 2 per riga su tablet, 1 per riga su mobile stretto */
@media (max-width: 992px) {
  .kpi-row {
    flex-wrap: wrap;
  }

  .kpi-row > * {
    flex: 1 1 calc(50% - 6px);
  }
}

@media (max-width: 576px) {
  .kpi-row > * {
    flex: 1 1 100%;
  }
}
</style>
