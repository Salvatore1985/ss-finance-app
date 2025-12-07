<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabase";

import MovimentoInfo from "../components/Movimenti/MovimentoInfo.vue";
import ActionButtons from "../components/Movimenti/ActionButtons.vue";
import DettaglioMovimento from "../components/Movimenti/DettaglioMovimento.vue";
import Button from "../components/UI/Button/Button.vue"; // Import Button component

// (lasciati per futuro export, anche se qui non li usiamo ancora)
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const router = useRouter();

const loading = ref(false);
const errore = ref("");
const movimenti = ref([]);

// Filtri base
const filtroUtente = ref("all"); // 'all' | user_id
const filtroConto = ref("all"); // 'all' | nome conto

// Filtri avanzati
const filtroCategoria = ref(""); // singola categoria (non array)
const filtroTags = ref([]); // array di nomi tags (multiselect)
const filtroDataDa = ref(""); // YYYY-MM-DD
const filtroDataA = ref(""); // YYYY-MM-DD
const filtroDescrizione = ref(""); // testo libero
const showAutocomplete = ref(false); // mostra dropdown autocomplete
const showFiltersAdvanced = ref(false); // mostra/nascondi filtri avanzati
const showActionMenu = ref(false); // menu burger azioni mobile

// Liste per select
const listaProfili = ref([]); // [{ id, nome }, ...]
const listaCategorie = ref([]); // [{ nome }, ...]
const listaTags = ref([]); // [{ nome }, ...]

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

    // Carica categorie per filtro
    const { data: categorie } = await supabase
      .from("categorie")
      .select("nome")
      .order("nome");
    if (categorie) {
      listaCategorie.value = categorie;
    }

    // Carica tags per filtro
    const { data: tags } = await supabase
      .from("tags")
      .select("nome")
      .order("nome");
    if (tags) {
      listaTags.value = tags;
    }

    // TUTTI i movimenti (non filtrati per user_id)
    const { data, error } = await supabase
      .from("transazioni")
      .select(
        "id, data, descrizione, importo, tipo, categoria, categoria_banca, categoria_id, conto, tags, stato, note, file_url, user_id"
      )
      .order("data", { ascending: false })
      .order("id", { ascending: false })
      .limit(3000); // Aumentato a 3000 per vedere tutti i movimenti

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

// Suggerimenti autocomplete per descrizione (unici)
const descrizioniSuggerite = computed(() => {
  if (!filtroDescrizione.value || filtroDescrizione.value.length < 2) {
    return [];
  }
  
  const search = filtroDescrizione.value.toLowerCase();
  const set = new Set();
  
  movimenti.value.forEach((m) => {
    const desc = (m.descrizione || "").toLowerCase();
    // Cerca anche parzialmente, non solo all'inizio
    if (desc.includes(search) && desc !== search) {
      set.add(m.descrizione);
    }
  });
  
  return Array.from(set).slice(0, 10); // max 10 suggerimenti
});

// Lista movimenti filtrata
const movimentiFiltrati = computed(() => {
  return movimenti.value.filter((m) => {
    // Filtro utente
    if (filtroUtente.value !== "all") {
      if (m.user_id !== filtroUtente.value) return false;
    }

    // Filtro conto
    if (filtroConto.value !== "all") {
      const conto = (m.conto || "").trim();
      if (conto !== filtroConto.value) return false;
    }

    // Filtro categoria (singola selezione)
    if (filtroCategoria.value) {
      const catMovimento = m.categoria || m.categoria_banca || "";
      if (catMovimento !== filtroCategoria.value) return false;
    }

    // Filtro tags (multiselect - almeno un tag deve corrispondere)
    if (filtroTags.value.length > 0) {
      const tagMovimento = Array.isArray(m.tags) ? m.tags : [];
      const hasMatch = filtroTags.value.some(tag => tagMovimento.includes(tag));
      if (!hasMatch) return false;
    }

    // Filtro data da
    if (filtroDataDa.value) {
      if (m.data < filtroDataDa.value) return false;
    }

    // Filtro data a
    if (filtroDataA.value) {
      if (m.data > filtroDataA.value) return false;
    }

    // Filtro descrizione (parziale, case-insensitive)
    if (filtroDescrizione.value) {
      const search = filtroDescrizione.value.toLowerCase();
      const desc = (m.descrizione || "").toLowerCase();
      if (!desc.includes(search)) return false;
    }

    return true;
  });
});

// ================== HELPER FUNCTIONS ==================
// Seleziona suggerimento autocomplete
const selezionaSuggerimento = (descrizione) => {
  filtroDescrizione.value = descrizione;
  showAutocomplete.value = false;
};

// Gestione focus input descrizione
const onDescrizioneFocus = () => {
  if (descrizioniSuggerite.value.length > 0) {
    showAutocomplete.value = true;
  }
};

const onDescrizioneBlur = () => {
  // Delay per permettere il click sul suggerimento
  setTimeout(() => {
    showAutocomplete.value = false;
  }, 200);
};

// Validazione date
const onDataDaChange = () => {
  // Se dataA è già impostata e è prima di dataDa, resettala
  if (filtroDataA.value && filtroDataA.value < filtroDataDa.value) {
    filtroDataA.value = filtroDataDa.value;
  }
};

// Aggiungi tag da select
const aggiungiTag = (event) => {
  const tag = event.target.value;
  if (tag && !filtroTags.value.includes(tag)) {
    filtroTags.value.push(tag);
  }
  // Reset select
  event.target.value = "";
};

// Rimuovi tag specifico
const rimuoviTag = (tag) => {
  const idx = filtroTags.value.indexOf(tag);
  if (idx > -1) {
    filtroTags.value.splice(idx, 1);
  }
};

// Reset tutti i filtri avanzati
const resettaFiltri = () => {
  filtroCategoria.value = ""; // singola categoria
  filtroTags.value = [];
  filtroDataDa.value = "";
  filtroDataA.value = "";
  filtroDescrizione.value = "";
};

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
    <!-- HEADER COMPATTO -->
    <header class="page-header px-3 px-md-4 py-2 py-md-3 bg-white border-bottom">
      <!-- TITOLO + AZIONI PRINCIPALI -->
      <div
        class="d-flex flex-wrap align-items-center justify-content-between gap-2"
      >
        <div>
          <h3 class="fw-bold text-dark mb-0 fs-5 fs-md-4">Movimenti</h3>
          <p class="text-muted small mb-0 d-none d-md-block">
            Ultimi movimenti registrati (max 3000).
          </p>
        </div>

        <!-- AZIONI -->
        <!-- Desktop: Bottoni normali -->
        <div class="d-none d-md-flex gap-2">
          <button
            class="btn btn-outline-primary fw-bold mov-action-btn shadow-sm"
            @click="router.push('/importa')"
          >
            <i class="bi bi-upload me-1" /> Importa estratto
          </button>
          <button
            class="btn btn-primary fw-bold mov-action-btn shadow-sm"
            data-bs-toggle="modal"
            data-bs-target="#modalNuovo"
          >
            <i class="bi bi-plus-lg me-1" /> Nuovo
          </button>
        </div>

        <!-- Mobile: Menu burger -->
        <div class="d-md-none position-relative">
          <button 
            @click="showActionMenu = !showActionMenu"
            class="btn btn-outline-primary btn-sm px-2"
            type="button"
          >
            <i class="bi bi-three-dots-vertical fs-5"></i>
          </button>
          
          <!-- Dropdown menu -->
          <div 
            v-show="showActionMenu" 
            class="dropdown-menu-mobile"
            @click="showActionMenu = false"
          >
            <button 
              @click="router.push('/importa')"
              class="dropdown-item-mobile"
              type="button"
            >
              <i class="bi bi-upload me-2"></i>
              Importa estratto
            </button>
            <button 
              data-bs-toggle="modal"
              data-bs-target="#modalNuovo"
              class="dropdown-item-mobile"
              type="button"
            >
              <i class="bi bi-plus-lg me-2"></i>
              Nuovo movimento
            </button>
          </div>
        </div>
      </div>

      <!-- BARRA FILTRI COMPATTA -->
      <div class="mov-filters mt-3">
        <!-- Desktop: Filtri in una riga -->
        <div class="d-none d-md-flex align-items-end gap-2 flex-wrap">
          <!-- UTENTE -->
          <div style="min-width: 120px;">
            <label class="small text-muted mb-1 d-block">Utente</label>
            <select v-model="filtroUtente" class="form-select form-select-sm">
              <option value="all">Tutti</option>
              <option v-for="u in utentiOptions" :key="u.id" :value="u.id">
                {{ u.nome }}
              </option>
            </select>
          </div>

          <!-- CONTO -->
          <div style="min-width: 120px;">
            <label class="small text-muted mb-1 d-block">Conto</label>
            <select v-model="filtroConto" class="form-select form-select-sm">
              <option value="all">Tutti</option>
              <option v-for="c in contiOptions" :key="c" :value="c">
                {{ c }}
              </option>
            </select>
          </div>

          <!-- CATEGORIA -->
          <div style="min-width: 140px;">
            <label class="small text-muted mb-1 d-block">Categoria</label>
            <select v-model="filtroCategoria" class="form-select form-select-sm">
              <option value="">Tutte</option>
              <option v-for="cat in listaCategorie" :key="cat.nome" :value="cat.nome">
                {{ cat.nome }}
              </option>
            </select>
          </div>

          <!-- TAGS -->
          <div style="min-width: 140px;">
            <label class="small text-muted mb-1 d-block">Tags</label>
            <select @change="aggiungiTag" class="form-select form-select-sm">
              <option value="">+ Tag</option>
              <option v-for="tag in listaTags" :key="tag.nome" :value="tag.nome" :disabled="filtroTags.includes(tag.nome)">
                {{ tag.nome }}
              </option>
            </select>
          </div>

          <!-- DATA DA -->
          <div style="min-width: 140px;">
            <label class="small text-muted mb-1 d-block">Da</label>
            <input v-model="filtroDataDa" @change="onDataDaChange" type="date" class="form-control form-control-sm" />
          </div>

          <!-- DATA A -->
          <div style="min-width: 140px;">
            <label class="small text-muted mb-1 d-block">A</label>
            <input v-model="filtroDataA" :min="filtroDataDa" type="date" class="form-control form-control-sm" />
          </div>

          <!-- DESCRIZIONE -->
          <div class="flex-grow-1 position-relative" style="min-width: 200px;">
            <label class="small text-muted mb-1 d-block">Descrizione</label>
            <input
              v-model="filtroDescrizione"
              @focus="onDescrizioneFocus"
              @blur="onDescrizioneBlur"
              @input="showAutocomplete = descrizioniSuggerite.length > 0"
              type="text"
              class="form-control form-control-sm"
              placeholder="Cerca..."
            />
            <!-- Autocomplete -->
            <div v-show="showAutocomplete && descrizioniSuggerite.length > 0" class="autocomplete-dropdown">
              <div
                v-for="(desc, idx) in descrizioniSuggerite"
                :key="idx"
                @mousedown="selezionaSuggerimento(desc)"
                class="autocomplete-item"
              >
                <i class="bi bi-search me-2 text-muted"></i>
                {{ desc }}
              </div>
            </div>
          </div>

          <!-- CERCA -->
          <div>
            <Button text="Cerca" icon="bi-search" variant="primary" @click="caricaMovimenti" />
          </div>

          <!-- RESET -->
          <div>
            <button @click="resettaFiltri" class="btn btn-sm btn-outline-secondary" title="Reset filtri">
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
          </div>
        </div>

        <!-- Mobile: Bottoni compatti + Modale -->
        <div class="d-md-none">
          <div class="d-flex gap-2 align-items-center">
            <!-- Filtri rapidi inline -->
            <select v-model="filtroUtente" class="form-select form-select-sm flex-fill">
              <option value="all">Tutti</option>
              <option v-for="u in utentiOptions" :key="u.id" :value="u.id">{{ u.nome }}</option>
            </select>

            <!-- Bottone filtri avanzati (apre modale) -->
            <button @click="showFiltersAdvanced = true" class="btn btn-sm btn-primary">
              <i class="bi bi-funnel-fill"></i>
              Filtri
            </button>

            <!-- Bottone cerca -->
            <button @click="caricaMovimenti" class="btn btn-sm btn-success">
              <i class="bi bi-search"></i>
            </button>
          </div>
        </div>

        <!-- Tags selezionati (visibili sempre se presenti) -->
        <div v-if="filtroTags.length > 0" class="selected-tags-row mt-2">
          <span v-for="tag in filtroTags" :key="tag" class="selected-tag-badge-small">
            #{{ tag }}
            <i @click="rimuoviTag(tag)" class="bi bi-x-circle-fill ms-1"></i>
          </span>
        </div>

        <!-- Contatore risultati -->
        <div class="text-center text-md-end small mt-2">
          <span v-if="loading" class="text-muted">
            <span class="spinner-border spinner-border-sm me-1" />
            Caricamento...
          </span>
          <span v-else class="badge bg-primary">
            <i class="bi bi-list-check me-1"></i>
            {{ movimentiFiltrati.length }} risultati
          </span>
        </div>
      </div>

    </header>

    <!-- MODALE FILTRI MOBILE (Full Screen) - FUORI DALL'HEADER -->
    <div 
      v-show="showFiltersAdvanced" 
      class="mobile-filters-modal d-md-none"
      @click.self="showFiltersAdvanced = false"
    >
      <div class="modal-content-mobile">
        <div class="modal-header-mobile">
          <h5 class="mb-0"><i class="bi bi-funnel-fill me-2"></i>Filtri Ricerca</h5>
          <button 
            @click.stop="showFiltersAdvanced = false" 
            class="btn-close-mobile"
            type="button"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-mobile">
          <!-- CONTO -->
          <div class="mb-3">
            <label class="small text-muted mb-1 d-block fw-bold">Conto</label>
            <select v-model="filtroConto" class="form-select">
              <option value="all">Tutti</option>
              <option v-for="c in contiOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <!-- CATEGORIA -->
          <div class="mb-3">
            <label class="small text-muted mb-1 d-block fw-bold">Categoria</label>
            <select v-model="filtroCategoria" class="form-select">
              <option value="">Tutte</option>
              <option v-for="cat in listaCategorie" :key="cat.nome" :value="cat.nome">
                {{ cat.nome }}
              </option>
            </select>
          </div>

          <!-- TAGS -->
          <div class="mb-3">
            <label class="small text-muted mb-1 d-block fw-bold">Tags</label>
            <select @change="aggiungiTag" class="form-select">
              <option value="">+ Aggiungi tag</option>
              <option v-for="tag in listaTags" :key="tag.nome" :value="tag.nome" :disabled="filtroTags.includes(tag.nome)">
                {{ tag.nome }}
              </option>
            </select>
            <div v-if="filtroTags.length > 0" class="mt-2">
              <span v-for="tag in filtroTags" :key="tag" class="selected-tag-badge-small me-1">
                #{{ tag }}
                <i @click="rimuoviTag(tag)" class="bi bi-x-circle-fill ms-1"></i>
              </span>
            </div>
          </div>

          <!-- DATE -->
          <div class="mb-3">
            <label class="small text-muted mb-1 d-block fw-bold">Data da</label>
            <input v-model="filtroDataDa" @change="onDataDaChange" type="date" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="small text-muted mb-1 d-block fw-bold">Data a</label>
            <input v-model="filtroDataA" :min="filtroDataDa" type="date" class="form-control" />
          </div>

          <!-- DESCRIZIONE -->
          <div class="mb-3">
            <label class="small text-muted mb-1 d-block fw-bold">Descrizione</label>
            <input
              v-model="filtroDescrizione"
              type="text"
              class="form-control"
              placeholder="Cerca nella descrizione..."
            />
          </div>
        </div>

        <div class="modal-footer-mobile">
          <button @click="resettaFiltri(); showFiltersAdvanced = false" class="btn btn-outline-secondary flex-fill">
            <i class="bi bi-arrow-counterclockwise me-1"></i>
            Reset
          </button>
          <button @click="showFiltersAdvanced = false" class="btn btn-primary flex-fill">
            <i class="bi bi-check-lg me-1"></i>
            Applica
          </button>
        </div>
      </div>
    </div>

    <!-- CONTENUTO SCORREVOLE -->
    <div class="page-content-scroll px-3 px-md-4 pt-3 pb-1">
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
      <div v-else class="movimenti-list">
        <div
          v-for="mov in movimentiFiltrati"
          :key="mov.id"
          class="card border-0 shadow-sm movimento-card"
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

/* Lista movimenti - no gap extra */
.movimenti-list {
  display: flex;
  flex-direction: column;
}

.movimenti-list .movimento-card {
  margin-bottom: 8px;
}

.movimenti-list .movimento-card:last-child {
  margin-bottom: 0; /* Ultimo elemento senza margin */
}

/* Header compatto mobile */
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Dropdown menu mobile (burger) */
.dropdown-menu-mobile {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  overflow: hidden;
  z-index: 1000;
}

.dropdown-item-mobile {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: white;
  text-align: left;
  font-size: 0.95rem;
  color: #212529;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid #f1f3f5;
}

.dropdown-item-mobile:last-child {
  border-bottom: none;
}

.dropdown-item-mobile:hover {
  background: #f8f9fa;
}

.dropdown-item-mobile:active {
  background: #e9ecef;
}

/* Box filtri - Più compatto su mobile */
.mov-filters {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 8px;
  border: 1px solid #dee2e6;
}

/* Tag badge piccoli (per riga tags selezionati) */
.selected-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.selected-tag-badge-small {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.selected-tag-badge-small i {
  opacity: 0.7;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.selected-tag-badge-small i:hover {
  opacity: 1;
  color: #dc2626;
}

/* Autocomplete dropdown */
.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #dee2e6;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 2px;
  border-radius: 4px;
}

.autocomplete-item {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 0.875rem;
  border-bottom: 1px solid #f1f3f5;
  transition: background 0.15s ease;
  display: flex;
  align-items: center;
}

.autocomplete-item:last-child {
  border-bottom: none;
}

.autocomplete-item:hover {
  background: #f8f9fa;
  color: #6366f1;
}

/* MODALE FILTRI MOBILE (Full Screen) */
.mobile-filters-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999; /* MOLTO ALTO - sopra a tutto */
  display: flex;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content-mobile {
  background: white;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal-header-mobile {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #6366f1;
  color: white;
}

.modal-header-mobile h5 {
  font-weight: 600;
  font-size: 1.1rem;
}

.btn-close-mobile {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.2rem;
  padding: 8px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.btn-close-mobile:hover {
  opacity: 1;
}

.modal-body-mobile {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.modal-footer-mobile {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  background: #f9fafb;
}

/* Bottoni azione */
.mov-action-btn {
  min-width: 140px;
}

/* Card movimento mobile */
.movimento-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.movimento-card:active {
  transform: scale(0.98);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .mov-filters {
    padding: 6px;
  }

  .mov-action-btn {
    width: 100%;
    justify-content: center;
  }

  /* Card movimenti più compatte su mobile */
  .movimento-card {
    border-radius: 10px;
    margin-bottom: 8px;
  }

  .movimento-card .card-body {
    padding: 12px !important;
  }

  /* Testo ottimizzato per mobile */
  .movimento-card {
    font-size: 0.9rem;
  }

  .movimento-card .fw-bold {
    font-size: 1rem !important;
  }

  .movimento-card .small {
    font-size: 0.8rem !important;
  }
}
</style>
