<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabase";

import MovimentoInfo from "../components/Movimenti/MovimentoInfo.vue";
import ActionButtons from "../components/Movimenti/ActionButtons.vue";
import DettaglioMovimento from "../components/Movimenti/DettaglioMovimento.vue";

// (lasciati per futuro export, anche se qui non li usiamo ancora)
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const router = useRouter();

const loading = ref(false);
const errore = ref("");
const movimenti = ref([]);

// Filtri
const filtroUtente = ref("all"); // 'all' | user_id
const filtroConto = ref("all"); // 'all' | nome conto

// Profili per tradurre user_id -> nome
const listaProfili = ref([]); // [{ id, nome }, ...]
const refDettaglio = ref(null);

// ================== CARICAMENTO MOVIMENTI ==================
const caricaMovimenti = async () => {
  loading.value = true;
  errore.value = "";

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error(authError);
    errore.value = "Errore di autenticazione";
    loading.value = false;
    return;
  }

  if (!user) {
    movimenti.value = [];
    loading.value = false;
    return;
  }

  try {
    // Profili (Salvo / Sigi ecc.)
    const { data: profili, error: profError } = await supabase
      .from("profili")
      .select("id, nome")
      .order("nome");

    if (!profError && profili) {
      listaProfili.value = profili;
    }

    // TUTTI i movimenti (non filtrati per user_id)
    const { data, error } = await supabase
      .from("transazioni")
      .select(
        "id, data, descrizione, importo, tipo, categoria, categoria_banca, categoria_id, conto, tags, stato, note, file_url, user_id"
      )
      .order("data", { ascending: false })
      .order("id", { ascending: false })
      .limit(300);

    if (error) {
      console.error(error);
      errore.value = "Errore nel caricamento dei movimenti";
      movimenti.value = [];
    } else {
      movimenti.value = (data || []).map((m) => ({
        ...m,
        // normalizziamo i tag in array
        tags: Array.isArray(m.tags) ? m.tags : m.tags ? [m.tags] : [],
      }));
    }
  } finally {
    loading.value = false;
  }
};

// ================== OPZIONI FILTRI ==================
const utentiOptions = computed(() => listaProfili.value);

const contiOptions = computed(() => {
  const set = new Set();
  movimenti.value.forEach((m) => {
    if (m.conto) set.add(m.conto.trim());
  });
  return Array.from(set).sort();
});

// Lista movimenti filtrata per utente + conto
const movimentiFiltrati = computed(() => {
  return movimenti.value.filter((m) => {
    if (filtroUtente.value !== "all") {
      if (m.user_id !== filtroUtente.value) return false;
    }

    if (filtroConto.value !== "all") {
      const conto = (m.conto || "").trim();
      if (conto !== filtroConto.value) return false;
    }

    return true;
  });
});

// ================== MODALE DETTAGLIO ==================
const apriDettaglio = (mov, mode = "view") => {
  if (!refDettaglio.value) return;
  refDettaglio.value.apri(mov, mode);
};

onMounted(caricaMovimenti);
</script>

<template>
  <!-- Layout verticale: header fisso + lista che scorre -->
  <div class="page-fixed-layout">
    <!-- HEADER -->
    <header class="page-header px-4 py-3 bg-white border-bottom">
      <!-- TITOLO + AZIONI PRINCIPALI -->
      <div
        class="d-flex flex-wrap align-items-start justify-content-between gap-3"
      >
        <div>
          <h3 class="fw-bold text-dark mb-1">Movimenti</h3>
          <p class="text-muted small mb-0">
            Ultimi movimenti registrati (max 300). Puoi filtrare per utente e
            conto.
          </p>
        </div>

        <!-- AZIONI (stanno sempre a destra / sotto su mobile) -->
        <div class="d-flex flex-wrap gap-2">
          <!-- Vai alla pagina Importa -->
          <button
            class="btn btn-outline-primary fw-bold mov-action-btn shadow-sm"
            @click="router.push('/importa')"
          >
            <i class="bi bi-upload me-1" /> Importa estratto
          </button>

          <!-- Apre il modale Nuovo (id #modalNuovo gestito in App.vue) -->
          <button
            class="btn btn-primary fw-bold mov-action-btn shadow-sm"
            data-bs-toggle="modal"
            data-bs-target="#modalNuovo"
          >
            <i class="bi bi-plus-lg me-1" /> Nuovo
          </button>
        </div>
      </div>

      <!-- BARRA FILTRI -->
      <div class="mov-filters mt-3">
        <div class="row g-2 align-items-end">
          <!-- UTENTE -->
          <div class="col-6 col-md-3">
            <label class="small text-muted mb-1 d-block">Utente</label>
            <select v-model="filtroUtente" class="form-select form-select-sm">
              <option value="all">Tutti</option>
              <option v-for="u in utentiOptions" :key="u.id" :value="u.id">
                {{ u.nome }}
              </option>
            </select>
          </div>

          <!-- CONTO -->
          <div class="col-6 col-md-3">
            <label class="small text-muted mb-1 d-block">Conto</label>
            <select v-model="filtroConto" class="form-select form-select-sm">
              <option value="all">Tutti</option>
              <option v-for="c in contiOptions" :key="c" :value="c">
                {{ c }}
              </option>
            </select>
          </div>

          <!-- INFO RISULTATI -->
          <div
            class="col-12 col-md-auto ms-md-auto text-end small text-muted mt-2 mt-md-0"
          >
            <span v-if="loading">
              <span class="spinner-border spinner-border-sm me-1" />
              Caricamento...
            </span>
            <span v-else>
              {{ movimentiFiltrati.length }} movimenti trovati
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- CONTENUTO SCORREVOLE -->
    <div class="page-content-scroll px-3 px-md-4 py-3">
      <!-- Errori -->
      <div v-if="errore" class="alert alert-danger">
        {{ errore }}
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="text-center text-muted py-5">
        <div class="spinner-border text-primary mb-3"></div>
        <div>Caricamento movimenti...</div>
      </div>

      <!-- Nessun dato nel DB -->
      <div
        v-else-if="!movimenti.length"
        class="alert alert-light border text-center py-4"
      >
        Nessun movimento trovato.
      </div>

      <!-- Nessun dato con i filtri -->
      <div
        v-else-if="!movimentiFiltrati.length"
        class="alert alert-light border text-center py-4"
      >
        Nessun movimento trovato con i filtri selezionati.
      </div>

      <!-- LISTA MOVIMENTI -->
      <div v-else class="d-flex flex-column gap-2">
        <div
          v-for="mov in movimentiFiltrati"
          :key="mov.id"
          class="card border-0 shadow-sm"
        >
          <div class="card-body p-2 p-md-3">
            <MovimentoInfo
              :movimento="mov"
              :show-tags="true"
              :show-categoria-banca="true"
            >
              <!-- Slot pulsanti azione -->
              <template #actions>
                <ActionButtons
                  @view="apriDettaglio(mov, 'view')"
                  @edit="apriDettaglio(mov, 'edit')"
                  @split="apriDettaglio(mov, 'split')"
                />
              </template>
            </MovimentoInfo>
          </div>
        </div>
      </div>

      <!-- Spazio in fondo -->
      <div style="height: 40px"></div>
    </div>

    <!-- Modale dettaglio (modifica / split ecc.) -->
    <DettaglioMovimento ref="refDettaglio" @refresh="caricaMovimenti" />
  </div>
</template>

<style scoped>
/* Struttura verticale: header fisso, lista con scroll interno */
.page-fixed-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* Header in alto, non si schiaccia */
.page-header {
  flex-shrink: 0;
  z-index: 10;
}

/* Corpo centrale con scroll interno */
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

/* Box filtri */
.mov-filters {
  background-color: #f9fafb;
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
}

/* Bottoni azione (Importa / Nuovo) */
.mov-action-btn {
  min-width: 140px;
}

@media (max-width: 576px) {
  .mov-filters {
    padding: 8px 10px;
  }

  .mov-action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
