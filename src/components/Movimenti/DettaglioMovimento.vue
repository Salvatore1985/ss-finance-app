<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "../../supabase";
import { Modal } from "bootstrap";

const emit = defineEmits(["refresh"]);
const movimento = ref(null);
const mode = ref("view");
const loading = ref(false);

// Liste Dinamiche
const listaConti = ref([]);
const listaCategorie = ref([]);
const listaTag = ref([]);

const editForm = ref({ tags: [] });
const splitForm = ref({ amount: "", category: "", tags: [] });

// --- LABEL CATEGORIA (interna o banca) ---
const categoriaLabel = computed(() => {
  if (!movimento.value) return "—";
  // prima la categoria interna, se esiste
  return movimento.value.categoria || movimento.value.categoria_banca || "—";
});

// --- NORMALIZZA TAG (array, stringa, JSON, ecc.) ---
function normalizeTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        return [trimmed];
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  return [];
}

const tagsList = computed(() => normalizeTags(movimento.value?.tags));

// Caricamento Dati all'avvio
onMounted(async () => {
  const { data: c } = await supabase.from("conti").select("nome").order("nome");
  if (c) listaConti.value = c;

  const { data: cat } = await supabase
    .from("categorie")
    .select("nome")
    .order("nome");
  if (cat) listaCategorie.value = cat;

  const { data: t } = await supabase.from("tags").select("nome").order("nome");
  if (t) listaTag.value = t;
});

const splitRimanente = computed(() => {
  if (!movimento.value) return 0;
  const totaleAbs = Math.abs(parseFloat(movimento.value.importo));
  const partAbs = Math.abs(parseFloat(splitForm.value.amount) || 0);
  return (totaleAbs - partAbs).toFixed(2);
});

const apri = (mov, modalitaIniziale = "view") => {
  movimento.value = mov;
  mode.value = modalitaIniziale;

  editForm.value = {
    ...mov,
    tags: normalizeTags(mov.tags),
  };
  splitForm.value = { amount: "", category: "", tags: [] }; // Reset tags nello split

  const el = document.getElementById("modalDettaglio");
  // IMPORTANTE: Usa getOrCreateInstance invece di new Modal
  // Questo previene la creazione di istanze multiple e backdrop duplicati
  const modal = Modal.getOrCreateInstance(el);
  modal.show();
};

defineExpose({ apri });

const aggiungiTag = (event) => {
  const val = event.target.value;
  if (val && !editForm.value.tags.includes(val)) {
    editForm.value.tags.push(val);
  }
  event.target.value = "";
};
const rimuoviTag = (idx) => editForm.value.tags.splice(idx, 1);

// Gestione tag per lo split
const aggiungiTagSplit = (event) => {
  const val = event.target.value;
  if (val && !splitForm.value.tags.includes(val)) {
    splitForm.value.tags.push(val);
  }
  event.target.value = "";
};
const rimuoviTagSplit = (idx) => splitForm.value.tags.splice(idx, 1);

const salvaModifica = async () => {
  try {
    loading.value = true;
    const { error } = await supabase
      .from("transazioni")
      .update({
        descrizione: editForm.value.descrizione,
        importo: parseFloat(editForm.value.importo),
        data: editForm.value.data,
        categoria: editForm.value.categoria,
        conto: editForm.value.conto,
        tags: editForm.value.tags,
        is_manual: true,
      })
      .eq("id", movimento.value.id);

    if (error) throw error;
    chiudiEaggiorna();
  } catch (e) {
    alert("Errore modifica: " + e.message);
  } finally {
    loading.value = false;
  }
};

const elimina = async () => {
  if (!confirm("Sei sicuro?")) return;
  try {
    loading.value = true;
    await supabase.from("transazioni").delete().eq("id", movimento.value.id);
    chiudiEaggiorna();
  } catch (e) {
    alert(e.message);
  } finally {
    loading.value = false;
  }
};

// Conferma prima di eseguire lo split
const confermaeSplit = () => {
  const imp = parseFloat(splitForm.value.amount);
  const totale = parseFloat(movimento.value.importo);
  const totaleAbs = Math.abs(totale);
  const impAbs = Math.abs(imp);
  
  // Validazione input
  if (!imp || !splitForm.value.category) {
    alert("Compila tutti i campi obbligatori (importo e categoria)");
    return;
  }
  
  const EPSILON = 0.01;
  if (impAbs > totaleAbs + EPSILON) {
    alert(`Importo troppo alto! Massimo: €${totaleAbs.toFixed(2)}`);
    return;
  }
  
  if (impAbs < EPSILON) {
    alert("L'importo deve essere maggiore di zero");
    return;
  }

  // Apri il modale di conferma Bootstrap
  const el = document.getElementById("modalConfermaSplit");
  const modal = Modal.getOrCreateInstance(el);
  modal.show();
};

const eseguiSplit = async () => {
  // Le validazioni sono già state fatte in confermaeSplit
  const imp = parseFloat(splitForm.value.amount);
  const totale = parseFloat(movimento.value.importo);
  const impAbs = Math.abs(imp);

  try {
    loading.value = true;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    // Per le uscite (negative), dobbiamo mantenere il segno
    const impConSegno = totale < 0 ? -impAbs : impAbs;
    const rimasto = totale - impConSegno;

    // Update vecchio
    await supabase
      .from("transazioni")
      .update({
        importo: rimasto,
        descrizione: movimento.value.descrizione + " (Split)",
      })
      .eq("id", movimento.value.id);

    // Insert nuovo con i tag
    await supabase.from("transazioni").insert([
      {
        user_id: user.id,
        data: movimento.value.data,
        descrizione: movimento.value.descrizione + " (Split)",
        importo: impConSegno,
        tipo: movimento.value.tipo,
        categoria: splitForm.value.category,
        conto: movimento.value.conto,
        tags: splitForm.value.tags, // Includi i tag
        stato: "confermato",
      },
    ]);

    // Chiudi il modale di conferma
    const modalConferma = document.getElementById("modalConfermaSplit");
    const instanceConferma = Modal.getInstance(modalConferma);
    if (instanceConferma) {
      instanceConferma.hide();
    }

    chiudiEaggiorna();
  } catch (e) {
    alert("Errore durante lo split: " + e.message);
  } finally {
    loading.value = false;
  }
};

const chiudiEaggiorna = () => {
  const el = document.getElementById("modalDettaglio");
  const modal = Modal.getInstance(el);
  if (modal) {
    modal.hide();
  }
  
  // Reset mode to view for next opening
  mode.value = "view";
  
  // Cleanup backdrop and body classes (precauzione aggiuntiva)
  setTimeout(() => {
    const backdrops = document.querySelectorAll(".modal-backdrop");
    backdrops.forEach(bd => bd.remove());
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  }, 300); // Aspetta che l'animazione di chiusura finisca
  
  emit("refresh");
};
</script>

<template>
  <div
    class="modal fade"
    id="modalDettaglio"
    tabindex="-1"
    aria-hidden="true"
    data-bs-backdrop="static"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div
        class="modal-content border-0 shadow-lg overflow-hidden"
        style="border-radius: 20px"
      >
        <div
          class="modal-header border-0 text-white p-4"
          :class="movimento?.tipo === 'Entrata' ? 'bg-success' : 'bg-primary'"
        >
          <div>
            <h2 class="fw-bold mb-0">
              {{ movimento?.tipo === "Uscita" ? "" : "+" }}
              {{ parseFloat(movimento?.importo || 0).toFixed(2) }} €
            </h2>
            <div class="opacity-75">{{ movimento?.data }}</div>
          </div>
          <button
            type="button"
            class="btn-close btn-close-white align-self-start"
            data-bs-dismiss="modal"
          ></button>
        </div>

        <div class="modal-body p-4">
          <!-- VISTA -->
          <div v-if="mode === 'view'">
            <h5 class="fw-bold mb-3 text-dark">{{ movimento?.descrizione }}</h5>
            <div class="row g-3 mb-4">
              <div class="col-6">
                <small
                  class="text-muted fw-bold text-uppercase"
                  style="font-size: 0.7rem"
                  >Categoria</small
                >
                <div class="fw-medium text-dark">
                  <i class="bi bi-grid-fill me-1 text-secondary"></i>
                  {{ categoriaLabel }}
                </div>
              </div>
              <div class="col-6">
                <small
                  class="text-muted fw-bold text-uppercase"
                  style="font-size: 0.7rem"
                  >Conto</small
                >
                <div class="fw-medium text-dark">
                  <i class="bi bi-bank2 me-1 text-secondary"></i>
                  {{ movimento?.conto }}
                </div>
              </div>
            </div>

            <!-- TAG VISTA -->
            <div class="mb-4" v-if="tagsList.length > 0">
              <div class="d-flex flex-wrap gap-2">
                <span
                  v-for="t in tagsList"
                  :key="t"
                  class="badge bg-warning text-dark border border-warning rounded-pill"
                >
                  #{{ t }}
                </span>
              </div>
            </div>

            <div class="d-grid gap-2">
              <button
                @click="mode = 'edit'"
                class="btn btn-outline-dark fw-bold py-2 rounded-3"
              >
                <i class="bi bi-pencil me-2"></i> Modifica
              </button>
              <button
                @click="elimina"
                class="btn btn-danger fw-bold py-2 rounded-3"
              >
                <i class="bi bi-trash me-2"></i> Elimina
              </button>
            </div>
          </div>

          <!-- MODIFICA -->
          <div v-if="mode === 'edit'">
            <h6 class="fw-bold mb-3 text-primary">Modifica</h6>

            <div class="mb-3">
              <input
                v-model="editForm.descrizione"
                class="form-control fw-bold"
              />
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <input
                  v-model="editForm.importo"
                  type="number"
                  step="0.01"
                  class="form-control"
                />
              </div>
              <div class="col-6">
                <input
                  v-model="editForm.data"
                  type="date"
                  class="form-control"
                />
              </div>
            </div>

            <!-- SELECT DINAMICHE -->
            <div class="row g-2 mb-4">
              <div class="col-6">
                <label class="small text-muted">Categoria</label>
                <select v-model="editForm.categoria" class="form-select">
                  <option
                    v-for="c in listaCategorie"
                    :key="c.nome"
                    :value="c.nome"
                  >
                    {{ c.nome }}
                  </option>
                </select>
              </div>
              <div class="col-6">
                <label class="small text-muted">Conto</label>
                <select v-model="editForm.conto" class="form-select">
                  <option v-for="c in listaConti" :key="c.nome" :value="c.nome">
                    {{ c.nome }}
                  </option>
                </select>
              </div>
            </div>

            <!-- TAG DINAMICI -->
            <div class="mb-4 border rounded-3 p-2 bg-light">
              <div
                class="d-flex flex-wrap gap-2 mb-2"
                v-if="editForm.tags && editForm.tags.length > 0"
              >
                <span
                  v-for="(t, idx) in editForm.tags"
                  :key="idx"
                  class="badge bg-warning text-dark border border-warning rounded-pill px-3 d-flex align-items-center"
                >
                  #{{ t }}
                  <i
                    class="bi bi-x-circle-fill ms-2 cursor-pointer opacity-50"
                    @click="rimuoviTag(idx)"
                  ></i>
                </span>
              </div>
              <select
                class="form-select form-select-sm border-0 bg-transparent"
                @change="aggiungiTag"
              >
                <option value="" selected>+ Tag</option>
                <option v-for="t in listaTag" :key="t.nome" :value="t.nome">
                  {{ t.nome }}
                </option>
              </select>
            </div>

            <div class="d-flex gap-2">
              <button
                @click="mode = 'view'"
                class="btn btn-light w-100 fw-bold"
              >
                Annulla
              </button>
              <button
                @click="salvaModifica"
                class="btn btn-primary w-100 fw-bold text-white"
              >
                Salva
              </button>
            </div>
          </div>

          <!-- SPLIT (DINAMICO) -->
          <div v-if="mode === 'split'">
            <h6 class="fw-bold mb-3 text-warning text-dark">Dividi Spesa</h6>
            <div class="mb-3">
              <label class="small text-muted">Quanto stacchi?</label>
              <input
                v-model="splitForm.amount"
                type="number"
                step="0.01"
                class="form-control fw-bold fs-5"
              />
              <div class="text-end small text-muted mt-1">
                Rimanente: <b>{{ splitRimanente }} €</b>
              </div>
            </div>
            <div class="mb-3">
              <label class="small text-muted">Nuova Categoria</label>
              <select v-model="splitForm.category" class="form-select">
                <option
                  v-for="c in listaCategorie"
                  :key="c.nome"
                  :value="c.nome"
                >
                  {{ c.nome }}
                </option>
              </select>
            </div>
            
            <!-- TAG DINAMICI per lo split -->
            <div class="mb-4 border rounded-3 p-2 bg-light">
              <label class="small text-muted mb-2 d-block">Tag (opzionali)</label>
              <div
                class="d-flex flex-wrap gap-2 mb-2"
                v-if="splitForm.tags && splitForm.tags.length > 0"
              >
                <span
                  v-for="(t, idx) in splitForm.tags"
                  :key="idx"
                  class="badge bg-warning text-dark border border-warning rounded-pill px-3 d-flex align-items-center"
                >
                  #{{ t }}
                  <i
                    class="bi bi-x-circle-fill ms-2 cursor-pointer opacity-50"
                    @click="rimuoviTagSplit(idx)"
                  ></i>
                </span>
              </div>
              <select
                class="form-select form-select-sm border-0 bg-transparent"
                @change="aggiungiTagSplit"
              >
                <option value="" selected>+ Tag</option>
                <option v-for="t in listaTag" :key="t.nome" :value="t.nome">
                  {{ t.nome }}
                </option>
              </select>
            </div>
            
            <div class="d-flex gap-2">
              <button
                @click="mode = 'view'"
                class="btn btn-light w-100 fw-bold"
              >
                Annulla
              </button>
              <button
                @click="confermaeSplit"
                class="btn btn-warning w-100 fw-bold"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- MODALE CONFERMA SPLIT -->
  <div
    class="modal fade"
    id="modalConfermaSplit"
    tabindex="-1"
    aria-hidden="true"
    data-bs-backdrop="static"
  >
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 16px">
        <div class="modal-header border-0 bg-warning text-dark p-3">
          <h6 class="modal-title fw-bold mb-0">
            <i class="bi bi-scissors me-2"></i>Conferma Split
          </h6>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body p-4">
          <p class="mb-2"><strong>Importo da dividere:</strong> €{{ Math.abs(parseFloat(splitForm.amount || 0)).toFixed(2) }}</p>
          <p class="mb-2"><strong>Categoria:</strong> {{ splitForm.category }}</p>
          <p class="mb-3">
            <strong>Tags:</strong> 
            <span v-if="splitForm.tags && splitForm.tags.length > 0">
              {{ splitForm.tags.join(', ') }}
            </span>
            <span v-else class="text-muted">Nessuno</span>
          </p>
          <hr class="my-3" />
          <p class="mb-0 text-muted small">
            <strong>Rimanente:</strong> €{{ splitRimanente }}
          </p>
        </div>
        <div class="modal-footer border-0 p-3 gap-2">
          <button
            type="button"
            class="btn btn-light fw-bold flex-fill"
            data-bs-dismiss="modal"
          >
            Annulla
          </button>
          <button
            type="button"
            class="btn btn-warning fw-bold flex-fill"
            @click="eseguiSplit"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
