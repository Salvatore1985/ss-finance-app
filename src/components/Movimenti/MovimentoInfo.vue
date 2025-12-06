<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  movimento: {
    type: Object,
    required: true,
  },
  showTags: {
    type: Boolean,
    default: false,
  },
  showCategoriaBanca: {
    type: Boolean,
    default: false,
  },
});

// stato locale: descrizione intera / troncata
const showFullDesc = ref(false);

// --- FORMATTER SEMPLICI ---
const dataLabel = computed(() => {
  if (!props.movimento?.data) return "";
  const d = new Date(props.movimento.data);
  if (Number.isNaN(d.getTime())) return props.movimento.data;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
});

const importoLabel = computed(() => {
  const val = Number(props.movimento?.importo || 0);
  return (
    val.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
});

const isUscita = computed(() => {
  return (props.movimento?.tipo || "").toLowerCase() === "uscita";
});

const tipoLabel = computed(() => {
  const t = (props.movimento?.tipo || "").toLowerCase();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
});

const contoLabel = computed(() => props.movimento?.conto || "");

const categoriaLabel = computed(() => props.movimento?.categoria || "");

const categoriaBancaLabel = computed(
  () => props.movimento?.categoria_banca || ""
);

// Tags come array di stringhe
const tagsList = computed(() => {
  const t = props.movimento?.tags;
  if (!t) return [];
  if (Array.isArray(t)) return t;
  if (typeof t === "string") {
    try {
      // se è JSON
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // altrimenti split su virgola
      return t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
});
</script>

<template>
  <div class="mov-row">
    <!-- COLONNA SINISTRA: data + descrizione + categorie / tag -->
    <div class="mov-col-left">
      <!-- data + tipo + conto -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
        <span class="mov-data text-muted small">
          {{ dataLabel }}
        </span>

        <span
          v-if="tipoLabel"
          class="badge rounded-pill mov-badge-tipo"
          :class="isUscita ? 'mov-badge-uscita' : 'mov-badge-entrata'"
        >
          {{ tipoLabel }}
        </span>

        <span v-if="contoLabel" class="badge rounded-pill mov-badge-conto">
          {{ contoLabel }}
        </span>
      </div>

      <!-- descrizione (troncata con tre puntini, cliccabile per espandere) -->
      <div
        class="fw-semibold mb-1 mov-desc"
        :class="{ 'text-truncate': !showFullDesc }"
        @click="showFullDesc = !showFullDesc"
      >
        {{ movimento.descrizione }}
      </div>

      <!-- categorie + tag -->
      <div class="d-flex flex-wrap gap-1 align-items-center small">
        <!-- categoria app -->
        <span
          v-if="categoriaLabel"
          class="badge rounded-pill mov-badge-cat-app"
        >
          {{ categoriaLabel }}
        </span>

        <!-- categoria banca (se diversa da app e se richiesta) -->
        <span
          v-if="
            showCategoriaBanca &&
            categoriaBancaLabel &&
            categoriaBancaLabel !== categoriaLabel
          "
          class="badge rounded-pill mov-badge-cat-banca"
        >
          {{ categoriaBancaLabel }}
        </span>

        <!-- tag -->
        <span v-if="showTags">
          <span
            v-for="tag in tagsList"
            :key="tag"
            class="badge rounded-pill mov-badge-tag"
          >
            #{{ tag }}
          </span>
        </span>
      </div>
    </div>

    <!-- COLONNA DESTRA: importo + azioni -->
    <div class="mov-col-right">
      <div
        class="mov-importo fw-bold"
        :class="isUscita ? 'text-danger' : 'text-success'"
      >
        {{ importoLabel }}
      </div>

      <div class="mov-actions">
        <!-- slot: pulsanti (view / edit / split...) -->
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mov-row {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 0.75rem;
}

/* colonna sinistra prende tutto lo spazio disponibile */
.mov-col-left {
  flex: 1 1 auto;
  min-width: 0; /* per far funzionare text-truncate */
}

/* colonna destra (importo + pulsanti) resta compatta */
.mov-col-right {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

/* descrizione (testo troncato) */
.mov-desc {
  cursor: pointer;
  display: block;
  max-width: 100%;
}

/* su mobile la stringa è più corta per farci stare importo + pulsanti */
.mov-desc.text-truncate {
  max-width: 220px;
}

@media (min-width: 768px) {
  .mov-desc.text-truncate {
    max-width: 420px;
  }
}

/* data */
.mov-data {
  font-size: 0.8rem;
}

/* badge tipo */
.mov-badge-tipo {
  font-size: 0.7rem;
  padding-inline: 0.6rem;
}

.mov-badge-entrata {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.mov-badge-uscita {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

/* conto */
.mov-badge-conto {
  background: rgba(15, 23, 42, 0.04);
  color: #0f172a;
  font-weight: 500;
}

/* categorie */
.mov-badge-cat-app {
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  font-weight: 500;
}

.mov-badge-cat-banca {
  background: rgba(148, 163, 184, 0.16);
  color: #0f172a;
}

/* tag */
.mov-badge-tag {
  background: rgba(14, 165, 233, 0.08);
  color: #0369a1;
  font-weight: 500;
}

/* importo */
.mov-importo {
  font-size: 0.95rem;
}

/* colonna azioni: verticale, dentro la card */
.mov-actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
</style>
