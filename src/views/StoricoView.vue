<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "../supabase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

const loading = ref(false);
const errorMsg = ref("");

// dati dal DB
const logs = ref([]);
const profili = ref([]);

// filtri
const filtroUtente = ref("all");
const filtroBanca = ref("all");
const filtroTipo = ref("tutti");

// stato download singolo log (excel / pdf)
const downloadingExcelId = ref(null);
const downloadingPdfId = ref(null);

// --------- OPTIONS SELECT ---------
const bancaOptions = computed(() => {
  const set = new Set();
  logs.value.forEach((l) => {
    if (!l.banca) return;
    const name = l.banca.trim();
    set.add(name);
  });
  return Array.from(set).sort();
});

// --------- HELPER ----------
const resolveUserName = (userId) => {
  const p = profili.value.find((p) => p.id === userId);
  return p ? p.nome : "—";
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

const formatPeriodo = (log) => {
  if (!log.periodo_da && !log.periodo_a) return "—";
  const da = log.periodo_da ? formatDate(log.periodo_da) : "?";
  const a = log.periodo_a ? formatDate(log.periodo_a) : "?";
  return `${da} → ${a}`;
};

// --------- FILTRI APPLICATI ----------
const filteredLogs = computed(() => {
  return logs.value.filter((log) => {
    const ownerId = log.target_user_id || log.user_id;

    if (filtroTipo.value !== "tutti" && log.tipo !== filtroTipo.value)
      return false;
    if (filtroUtente.value !== "all" && ownerId !== filtroUtente.value)
      return false;

    if (filtroBanca.value !== "all") {
      const bankNorm = (log.banca || "").trim();
      if (bankNorm !== filtroBanca.value) return false;
    }

    return true;
  });
});

// --------- EXPORT ELABORATO: EXCEL ----------
const exportLogToExcel = async (log) => {
  if (!log.banca || !log.periodo_da || !log.periodo_a) {
    alert("Per questo import mancano i dati per ricostruire l’estratto.");
    return;
  }

  try {
    downloadingExcelId.value = log.id;

    const ownerId = log.target_user_id || null;
    const contoName = (log.banca || "").trim();

    let query = supabase
      .from("transazioni")
      .select("*")
      .eq("conto", contoName)
      .gte("data", log.periodo_da)
      .lte("data", log.periodo_a)
      .order("data", { ascending: true });

    if (ownerId) {
      query = query.eq("user_id", ownerId);
    }

    const { data: trans, error } = await query;

    if (error) {
      console.error("Errore lettura transazioni", error);
      alert("Errore nel recupero dei movimenti dal DB");
      return;
    }

    if (!trans || !trans.length) {
      alert("Nessun movimento trovato per questo import.");
      return;
    }

    const rows = trans.map((t) => ({
      Data: formatDate(t.data),
      Descrizione: t.descrizione || "",
      Importo: Number(t.importo).toFixed(2),
      Tipo: t.tipo || "", // Entrata / Uscita
      "Categoria banca": t.categoria_banca || "", // qui ti deve uscire "Pagamento con carta"
      "Categoria app": t.categoria || "",
      Conto: t.conto || "", // es. "Revolut Sigi"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estratto");

    const ownerName = resolveUserName(ownerId) || "Utente";
    const nomeFileBase = `${ownerName} - ${contoName} (${formatDate(
      log.periodo_da
    )} al ${formatDate(log.periodo_a)})`;

    XLSX.writeFile(wb, `${nomeFileBase}.xlsx`);
  } catch (e) {
    console.error("Errore export Excel da storico", e);
    alert("Errore durante la generazione del file elaborato");
  } finally {
    downloadingExcelId.value = null;
  }
};

// --------- EXPORT ELABORATO: PDF ----------
const exportLogToPdf = async (log) => {
  if (!log.banca || !log.periodo_da || !log.periodo_a) {
    alert("Per questo import mancano i dati per ricostruire l’estratto.");
    return;
  }

  try {
    downloadingPdfId.value = log.id;

    const ownerId = log.target_user_id || null;
    const contoName = (log.banca || "").trim();

    let query = supabase
      .from("transazioni")
      .select("*")
      .eq("conto", contoName)
      .gte("data", log.periodo_da)
      .lte("data", log.periodo_a)
      .order("data", { ascending: true });

    if (ownerId) {
      query = query.eq("user_id", ownerId);
    }

    const { data: trans, error } = await query;

    if (error) {
      console.error("Errore lettura transazioni", error);
      alert("Errore nel recupero dei movimenti dal DB");
      return;
    }

    if (!trans || !trans.length) {
      alert("Nessun movimento trovato per questo import.");
      return;
    }

    const ownerName = resolveUserName(ownerId) || "Utente";
    const title = `${ownerName} - ${contoName} (${formatDate(
      log.periodo_da
    )} al ${formatDate(log.periodo_a)})`;
    const nomeFileBase = title;

    const doc = new jsPDF("p", "pt", "a4");
    const marginLeft = 40;
    const marginTop = 50;
    const lineHeight = 14;
    let y = marginTop;

    // Titolo
    doc.setFontSize(12);
    doc.text(title, marginLeft, y);
    y += 24;

    // Header tabella
    doc.setFontSize(9);
    const headers = [
      "Data",
      "Descrizione",
      "Importo",
      "Tipo",
      "Categoria banca",
    ];
    const colX = [
      marginLeft,
      marginLeft + 70,
      marginLeft + 320,
      marginLeft + 380,
      marginLeft + 440,
    ];

    headers.forEach((h, idx) => {
      doc.text(h, colX[idx], y);
    });

    y += 8;
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + 520, y);
    y += 8;

    const pageHeight = doc.internal.pageSize.getHeight();
    const maxY = pageHeight - 40;

    for (const t of trans) {
      if (y > maxY) {
        doc.addPage();
        y = marginTop;

        doc.setFontSize(9);
        headers.forEach((h, idx) => {
          doc.text(h, colX[idx], y);
        });
        y += 8;
        doc.line(marginLeft, y, marginLeft + 520, y);
        y += 8;
      }

      const data = formatDate(t.data);
      const descrizione = t.descrizione || "";
      const importo = Number(t.importo).toFixed(2);
      const tipo = t.tipo || "";
      const categoria = (t.categoria_banca || t.categoria || "").slice(0, 30);

      const descrLines = doc.splitTextToSize(
        descrizione,
        colX[2] - colX[1] - 6
      );
      const rowHeight = lineHeight * Math.max(1, descrLines.length);

      doc.text(data, colX[0], y);
      doc.text(descrLines, colX[1], y);
      doc.text(importo, colX[2], y);
      doc.text(tipo, colX[3], y);
      doc.text(categoria, colX[4], y);

      y += rowHeight;
    }

    doc.save(`${nomeFileBase}.pdf`);
  } catch (e) {
    console.error("Errore export PDF da storico", e);
    alert("Errore durante la generazione del PDF");
  } finally {
    downloadingPdfId.value = null;
  }
};

// --------- CARICAMENTO DATI ----------
onMounted(async () => {
  loading.value = true;
  errorMsg.value = "";
  try {
    const [profRes, logRes] = await Promise.all([
      supabase.from("profili").select("id, nome").order("nome"),
      supabase
        .from("importazioni_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (profRes.error) {
      console.error("Errore profili", profRes.error);
      errorMsg.value = "Errore nel caricamento dei profili";
    } else {
      profili.value = profRes.data || [];
    }

    if (logRes.error) {
      console.error("Errore importazioni_log", logRes.error);
      errorMsg.value = "Errore nel caricamento dello storico importazioni";
    } else {
      logs.value = logRes.data || [];
    }
  } catch (e) {
    console.error(e);
    errorMsg.value = "Errore generico nel caricamento dati";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page-fixed-layout">
    <div class="page-content-scroll px-3 px-md-4 py-3">
      <!-- BARRA FILTRI -->
      <div
        class="skeleton-box p-3 mb-4 d-flex flex-wrap align-items-center gap-3"
      >
        <div>
          <label class="small fw-bold text-muted d-block mb-1"> Utente </label>
          <select v-model="filtroUtente" class="form-select form-select-sm">
            <option value="all">Tutti</option>
            <option v-for="p in profili" :key="p.id" :value="p.id">
              {{ p.nome }}
            </option>
          </select>
        </div>

        <div>
          <label class="small fw-bold text-muted d-block mb-1">
            Banca / Conto
          </label>
          <select v-model="filtroBanca" class="form-select form-select-sm">
            <option value="all">Tutti</option>
            <option v-for="b in bancaOptions" :key="b" :value="b">
              {{ b }}
            </option>
          </select>
        </div>

        <div>
          <label class="small fw-bold text-muted d-block mb-1">
            Tipo importazione
          </label>
          <select v-model="filtroTipo" class="form-select form-select-sm">
            <option value="tutti">Tutti</option>
            <option value="estratto_conto">Estratto conto</option>
          </select>
        </div>

        <div class="ms-auto small text-muted">
          <span v-if="loading">
            <span class="spinner-border spinner-border-sm me-1" />
            Caricamento...
          </span>
          <span v-else> {{ filteredLogs.length }} importazioni trovate </span>
        </div>
      </div>

      <!-- GRIGLIA ANALISI (placeholder) -->
      <div class="row g-3 mb-4">
        <div class="col-md-8">
          <div
            class="skeleton-box d-flex align-items-center justify-content-center text-muted fw-bold"
            style="height: 220px"
          >
            GRAFICO ANDAMENTO ANNUALE
          </div>
        </div>

        <div class="col-md-4">
          <div class="skeleton-box p-3 mb-3">
            <div class="fw-semibold mb-2">Riepilogo importazioni</div>
            <div class="d-flex justify-content-between small mb-1">
              <span>Totale importazioni</span>
              <strong>{{ logs.length }}</strong>
            </div>
            <div class="d-flex justify-content-between small mb-1">
              <span>Importazioni filtrate</span>
              <strong>{{ filteredLogs.length }}</strong>
            </div>
            <div class="d-flex justify-content-between small mb-1">
              <span>Righe confermate (somma)</span>
              <strong>
                {{
                  filteredLogs.reduce(
                    (acc, l) => acc + (l.righe_confermate || 0),
                    0
                  )
                }}
              </strong>
            </div>
            <div class="d-flex justify-content-between small">
              <span>Righe da convalidare (somma)</span>
              <strong class="text-warning">
                {{
                  filteredLogs.reduce(
                    (acc, l) => acc + (l.righe_da_convalidare || 0),
                    0
                  )
                }}
              </strong>
            </div>
          </div>

          <div class="skeleton-box p-3 small text-muted">
            In futuro qui possiamo mettere:
            <ul class="mb-0 ps-3">
              <li>Grafico per banca</li>
              <li>Trend mensile importazioni</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- STORICO IMPORTAZIONI -->
      <div class="skeleton-box p-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h5 class="fw-semibold mb-0">
              Storico importazioni estratti conto
            </h5>
            <p class="small text-muted mb-0">
              Ultime importazioni registrate nella tabella
              <code>importazioni_log</code>.
            </p>
          </div>
        </div>

        <div v-if="errorMsg" class="alert alert-danger py-2 small mb-2">
          {{ errorMsg }}
        </div>

        <!-- WRAPPER con altezza fissa + scroll verticale -->
        <div class="storico-table-container">
          <!-- DESKTOP: tabella -->
          <div class="d-none d-md-block">
            <table class="table table-sm align-middle mb-0 storico-table">
              <thead class="table-light">
                <tr>
                  <th>Data import</th>
                  <th>Utente</th>
                  <th>Banca / Conto</th>
                  <th>Periodo estratto</th>
                  <th>Righe</th>
                  <th>Tipo</th>
                  <th class="text-center">File</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!loading && !filteredLogs.length">
                  <td colspan="7" class="text-center text-muted small py-3">
                    Nessuna importazione trovata con i filtri selezionati.
                  </td>
                </tr>

                <tr v-for="log in filteredLogs" :key="log.id">
                  <td class="small">
                    {{ formatDateTime(log.created_at || log.inserito_il) }}
                  </td>
                  <td class="small">
                    {{ resolveUserName(log.target_user_id || log.user_id) }}
                  </td>
                  <td class="small">
                    {{ log.banca || "—" }}
                  </td>
                  <td class="small">
                    {{ formatPeriodo(log) }}
                  </td>
                  <td class="small">
                    <div>
                      Importate:
                      <strong>{{
                        log.righe_importate || log.righe_confermate || 0
                      }}</strong>
                    </div>
                    <div v-if="log.righe_da_convalidare">
                      Da convalidare:
                      <strong class="text-warning">{{
                        log.righe_da_convalidare
                      }}</strong>
                    </div>
                  </td>
                  <td class="small">
                    {{ log.tipo || "estratto_conto" }}
                  </td>
                  <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                      <button
                        class="btn btn-outline-secondary"
                        :disabled="
                          !log.periodo_da ||
                          !log.periodo_a ||
                          downloadingExcelId === log.id
                        "
                        @click="exportLogToExcel(log)"
                        title="Scarica estratto elaborato (Excel)"
                      >
                        <span
                          v-if="downloadingExcelId === log.id"
                          class="spinner-border spinner-border-sm"
                        />
                        <i v-else class="bi bi-file-earmark-spreadsheet" />
                      </button>

                      <button
                        class="btn btn-outline-secondary"
                        :disabled="
                          !log.periodo_da ||
                          !log.periodo_a ||
                          downloadingPdfId === log.id
                        "
                        @click="exportLogToPdf(log)"
                        title="Scarica estratto elaborato (PDF)"
                      >
                        <span
                          v-if="downloadingPdfId === log.id"
                          class="spinner-border spinner-border-sm"
                        />
                        <i v-else class="bi bi-file-earmark-pdf" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- MOBILE: CARD PER OGNI IMPORT -->
          <div class="d-md-none">
            <div
              v-if="!loading && !filteredLogs.length"
              class="text-center text-muted small py-3"
            >
              Nessuna importazione trovata con i filtri selezionati.
            </div>

            <div
              v-for="log in filteredLogs"
              :key="log.id"
              class="storico-mobile-card"
            >
              <div class="storico-mobile-row">
                <span class="storico-mobile-label">Data import</span>
                <span class="storico-mobile-value">
                  {{ formatDateTime(log.created_at || log.inserito_il) }}
                </span>
              </div>

              <div class="storico-mobile-row">
                <span class="storico-mobile-label">Utente</span>
                <span class="storico-mobile-value">
                  {{ resolveUserName(log.target_user_id || log.user_id) }}
                </span>
              </div>

              <div class="storico-mobile-row">
                <span class="storico-mobile-label">Banca / Conto</span>
                <span class="storico-mobile-value">
                  {{ log.banca || "—" }}
                </span>
              </div>

              <div class="storico-mobile-row">
                <span class="storico-mobile-label">Periodo estratto</span>
                <span class="storico-mobile-value">
                  {{ formatPeriodo(log) }}
                </span>
              </div>

              <div class="storico-mobile-row">
                <span class="storico-mobile-label">Righe</span>
                <span class="storico-mobile-value">
                  Importate:
                  <strong>{{
                    log.righe_importate || log.righe_confermate || 0
                  }}</strong>
                  <span v-if="log.righe_da_convalidare">
                    <br />
                    Da convalidare:
                    <strong class="text-warning">
                      {{ log.righe_da_convalidare }}
                    </strong>
                  </span>
                </span>
              </div>

              <div class="storico-mobile-row">
                <span class="storico-mobile-label">Tipo</span>
                <span class="storico-mobile-value">
                  {{ log.tipo || "estratto_conto" }}
                </span>
              </div>

              <div class="storico-mobile-buttons">
                <button
                  class="btn btn-outline-secondary btn-sm"
                  :disabled="
                    !log.periodo_da ||
                    !log.periodo_a ||
                    downloadingExcelId === log.id
                  "
                  @click="exportLogToExcel(log)"
                  title="Scarica estratto elaborato (Excel)"
                >
                  <span
                    v-if="downloadingExcelId === log.id"
                    class="spinner-border spinner-border-sm"
                  />
                  <i v-else class="bi bi-file-earmark-spreadsheet" />
                </button>

                <button
                  class="btn btn-outline-secondary btn-sm"
                  :disabled="
                    !log.periodo_da ||
                    !log.periodo_a ||
                    downloadingPdfId === log.id
                  "
                  @click="exportLogToPdf(log)"
                  title="Scarica estratto elaborato (PDF)"
                >
                  <span
                    v-if="downloadingPdfId === log.id"
                    class="spinner-border spinner-border-sm"
                  />
                  <i v-else class="bi bi-file-earmark-pdf" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-fixed-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.page-content-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
}

/* box generico bianco */
.skeleton-box {
  background-color: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

/* Wrapper con altezza fissa e scroll verticale per tabella/cards */
.storico-table-container {
  max-height: 260px;
  overflow-y: auto;
}

/* Tabella desktop */
.storico-table {
  width: 100%;
  table-layout: fixed;
  font-size: 0.85rem;
}

.storico-table th,
.storico-table td {
  white-space: normal;
  word-wrap: break-word;
}

/* Card mobile */
.storico-mobile-card {
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: 0.8rem;
}

.storico-mobile-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.storico-mobile-label {
  font-weight: 600;
  color: #6b7280;
}

.storico-mobile-value {
  text-align: right;
}

.storico-mobile-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}

/* spazio per la navbar bottom */
@media (max-width: 576px) {
  .page-content-scroll {
    padding-bottom: 80px;
  }
}
</style>
