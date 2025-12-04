<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabase";
import { parseBankFile } from "../utils/BankParser";
import { applicaRegole } from "../utils/RuleEngine";
import ConflittoMovimento from "../components/Movimenti/ConflittoMovimento.vue";

// Librerie export
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

const GOOGLE_DRIVE_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycb.../exec"; // <-- metti qui la tua URL

const router = useRouter();

const step = ref(1);
const loading = ref(false);
const msgStato = ref("");

const fileInput = ref(null);
const formData = ref({ chiSeiNome: "", banca: "", note: "" });
const importData = ref({ targetUserId: null, movimenti: [], banca: "" });
const sessioneAttuale = ref(null);
const listaProfili = ref([]);
const listaBanche = ref([]);

const refConflitto = ref(null);
const conflictQueue = ref([]);
const stats = ref({ inseriti: 0, sospesi: 0, uniti: 0, saltati: 0 });

//-----------------Helper per convertire ArrayBuffer → base64--------------
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// ----------------- HELPER DATE + NOME FILE -----------------
const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const buildFileNameFromMovimenti = (movs) => {
  if (!movs || !movs.length) {
    return {
      nomeFileBase: "Estratto",
      dataMinFmt: "",
      dataMaxFmt: "",
    };
  }

  const ordinati = [...movs].sort(
    (a, b) => new Date(a.data) - new Date(b.data)
  );

  const dataMinFmt = formatDate(ordinati[0].data);
  const dataMaxFmt = formatDate(ordinati[ordinati.length - 1].data);

  const owner = formData.value.chiSeiNome || "Utente";
  const conto = importData.value.banca || "Conto";

  const nomeFileBase = `${owner} - ${conto} (${dataMinFmt} al ${dataMaxFmt})`;

  return { nomeFileBase, dataMinFmt, dataMaxFmt, ordinati };
};

// ================== ON MOUNT ==================
onMounted(async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    console.error("Auth error", authError);
    return;
  }
  sessioneAttuale.value = user;

  // Profili (chi sei)
  const { data: profili, error: profError } = await supabase
    .from("profili")
    .select("*");

  if (profError) {
    console.error("Errore profili", profError);
  } else {
    listaProfili.value = profili || [];
    if (user && profili) {
      const mio = profili.find((p) => p.id === user.id);
      if (mio) formData.value.chiSeiNome = mio.nome;
    }
  }

  // Banche / conti
  const { data: conti, error: contiError } = await supabase
    .from("conti")
    .select("nome")
    .order("nome");

  if (contiError) {
    console.error("Errore conti", contiError);
  } else if (conti) {
    listaBanche.value = conti.map((c) => c.nome);
  }
});

// ================== STEP 1: CARICA FILE ==================
const avviaImportazione = async () => {
  if (!formData.value.chiSeiNome) {
    alert("Seleziona 'Chi sei?'");
    return;
  }

  const fileEl = fileInput.value;
  const selectedFile = fileEl?.files?.[0];
  if (!selectedFile) {
    alert("Seleziona un file CSV o XLSX");
    return;
  }

  const profiloTarget = listaProfili.value.find(
    (p) => p.nome === formData.value.chiSeiNome
  );
  if (!profiloTarget) {
    alert("Profilo non trovato nel database");
    return;
  }

  importData.value.targetUserId = profiloTarget.id;

  try {
    loading.value = true;
    msgStato.value = "Analisi file...";

    const res = await parseBankFile(selectedFile);

    // 1) Nome conto / banca
    if (formData.value.banca) {
      // se hai scelto "Revolut Sigi" dalla select, usiamo esattamente quello
      importData.value.banca = formData.value.banca.trim();
    } else {
      // altrimenti: "Revolut" + "Sigi" => "Revolut Sigi"
      const baseBanca = (res.banca || "Senza conto").trim();
      const owner = formData.value.chiSeiNome || "";
      importData.value.banca = `${baseBanca} ${owner}`.trim();
    }

    // 2) Applico le regole e ordino per data
    const movConRegole = await applicaRegole(res.movimenti || []);

    importData.value.movimenti = movConRegole.sort(
      (a, b) => new Date(a.data) - new Date(b.data)
    );

    step.value = 2;
  } catch (e) {
    console.error(e);
    alert(e.message || "Errore durante la lettura del file");
  } finally {
    loading.value = false;
  }
};

// ================== EXPORT: EXCEL ==================
const esportaEstrattoExcel = async () => {
  if (!importData.value.movimenti.length) {
    alert("Nessun movimento da esportare");
    return;
  }

  try {
    loading.value = true;
    msgStato.value = "Generazione Excel...";

    const movsProcessati = await applicaRegole(importData.value.movimenti);
    const { nomeFileBase, ordinati } =
      buildFileNameFromMovimenti(movsProcessati);

    const rows = ordinati.map((m) => ({
      Data: formatDate(m.data),
      Descrizione: m.descrizione || "",
      Importo: Number(m.importo).toFixed(2),
      Tipo: m.tipo || "",
      "Categoria banca": m.categoria_banca || "",
      "Categoria app": m.categoria || "",
      Conto: importData.value.banca || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estratto");

    XLSX.writeFile(wb, `${nomeFileBase}.xlsx`);
  } catch (e) {
    console.error("Errore export Excel", e);
    alert("Errore durante la generazione del file Excel");
  } finally {
    loading.value = false;
    msgStato.value = "";
  }
};
/**const salvaExcelSuDrive = async () => {
  if (!importData.value.movimenti.length) {
    alert("Nessun movimento da esportare");
    return;
  }

  try {
    loading.value = true;
    msgStato.value = "Invio Excel a Drive...";

    // 1) Applico le regole e preparo i dati
    const movsProcessati = await applicaRegole(importData.value.movimenti);
    const { nomeFileBase, ordinati } =
      buildFileNameFromMovimenti(movsProcessati);

    const rows = ordinati.map((m) => ({
      Data: formatDate(m.data),
      Descrizione: m.descrizione || "",
      Importo: Number(m.importo).toFixed(2),
      Tipo: m.tipo || "",
      "Categoria banca": m.categoria_banca || "",
      "Categoria app": m.categoria || "",
      Conto: importData.value.banca || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estratto");

    // 2) Creo il binario dell'xlsx in memoria
    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    const base64Data = arrayBufferToBase64(excelBuffer);

    // 3) Chiamo la web app su Apps Script
    const resp = await fetch(GOOGLE_DRIVE_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `${nomeFileBase}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        content: base64Data,
      }),
    });

    if (!resp.ok) {
      throw new Error("Errore HTTP: " + resp.status);
    }

    const data = await resp.json();
    if (data.error) {
      throw new Error(data.message || "Errore dalla web app Google");
    }

    console.log("File salvato su Drive:", data);
    alert("Estratto Excel salvato su Drive!");

    // Se vuoi, qui potresti usare salvaLogEFile(..., data.url)
  } catch (e) {
    console.error("Errore salvataggio Excel su Drive", e);
    alert("Errore durante il salvataggio su Drive: " + e.message);
  } finally {
    loading.value = false;
    msgStato.value = "";
  }
};**/

// ================== EXPORT: PDF ==================
const esportaEstrattoPdf = async () => {
  if (!importData.value.movimenti.length) {
    alert("Nessun movimento da esportare");
    return;
  }

  try {
    loading.value = true;
    msgStato.value = "Generazione PDF...";

    const movsProcessati = await applicaRegole(importData.value.movimenti);
    const { nomeFileBase, ordinati } =
      buildFileNameFromMovimenti(movsProcessati);

    const doc = new jsPDF("p", "pt", "a4");

    const marginLeft = 40;
    const marginTop = 50;
    const lineHeight = 14;
    let y = marginTop;

    // Titolo
    doc.setFontSize(12);
    doc.text(nomeFileBase, marginLeft, y);
    y += 24;

    // Header tabella
    doc.setFontSize(9);
    const headers = ["Data", "Descrizione", "Importo", "Tipo", "Categoria"];
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

    for (const m of ordinati) {
      // Nuova pagina se siamo in fondo
      if (y > maxY) {
        doc.addPage();
        y = marginTop;

        // ristampo header
        doc.setFontSize(9);
        headers.forEach((h, idx) => {
          doc.text(h, colX[idx], y);
        });
        y += 8;
        doc.line(marginLeft, y, marginLeft + 520, y);
        y += 8;
      }

      const data = formatDate(m.data);
      const descrizione = m.descrizione || "";
      const importo = Number(m.importo).toFixed(2);
      const tipo = m.tipo || "";
      const categoria = (m.categoria || m.categoria_banca || "").slice(0, 20);

      // Descrizione su più righe se lunga
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
    console.error("Errore export PDF", e);
    alert("Errore durante la generazione del PDF");
  } finally {
    loading.value = false;
    msgStato.value = "";
  }
};

// ================== STEP 2: DUPLICATI + SALVATAGGIO ==================
const confermaESalva = async () => {
  loading.value = true;
  msgStato.value = "Analisi duplicati...";

  const movsProcessati = await applicaRegole(importData.value.movimenti);

  if (!movsProcessati.length) {
    alert("Nessun movimento da importare");
    loading.value = false;
    return;
  }

  const dataMin = String(movsProcessati[0].data).split("T")[0];
  const dataMax = String(movsProcessati[movsProcessati.length - 1].data).split(
    "T"
  )[0];
  const targetId = importData.value.targetUserId;
  const banca = importData.value.banca;

  const { data: storico, error } = await supabase
    .from("transazioni")
    .select("*")
    .eq("user_id", targetId)
    .eq("conto", banca)
    .gte("data", dataMin)
    .lte("data", dataMax);

  if (error) {
    console.error("Errore download storico:", error);
    alert("Errore connessione DB");
    loading.value = false;
    return;
  }

  const listaVerde = [];
  const listaGialla = [];

  movsProcessati.forEach((nuovo) => {
    const dataNuovo = String(nuovo.data).split("T")[0];
    const impNuovo = parseFloat(nuovo.importo);

    const matches = (storico || []).filter((vecchio) => {
      const dataVecchio = String(vecchio.data).split("T")[0];
      const stessaData = dataVecchio === dataNuovo;

      const impVecchio = parseFloat(vecchio.importo);
      const stessoImporto = Math.abs(impVecchio - impNuovo) < 0.01;

      const stessoConto = (vecchio.conto || "").trim() === banca.trim();
      return stessaData && stessoImporto && stessoConto;
    });

    if (matches.length > 0) {
      listaGialla.push({ nuovo, matches });
    } else {
      listaVerde.push(nuovo);
    }
  });

  if (listaGialla.length > 5) {
    await salvaMassivoInStaging(listaVerde, listaGialla);
  } else {
    await avviaRisoluzioneInterattiva(listaVerde, listaGialla);
  }
};

const salvaMassivoInStaging = async (verdi, gialli) => {
  msgStato.value = "Salvataggio massivo...";
  const targetId = importData.value.targetUserId;
  const banca = importData.value.banca;

  const righeVerdi = verdi.map((m) =>
    preparaRigaDB(m, targetId, banca, "confermato")
  );
  const righeGialle = gialli.map((item) =>
    preparaRigaDB(item.nuovo, targetId, banca, "da_convalidare")
  );

  const tutte = [...righeVerdi, ...righeGialle];

  const { error } = await supabase.from("transazioni").insert(tutte);
  if (error) {
    console.error(error);
    alert("Errore DB: " + error.message);
    loading.value = false;
    return;
  }

  await salvaLogEFile(tutte.length);
  alert(
    `Fatto! ${righeVerdi.length} salvati, ${righeGialle.length} in attesa di controllo.`
  );
  router.push("/movimenti");
};

const avviaRisoluzioneInterattiva = async (verdi, gialli) => {
  msgStato.value = "Salvataggio...";
  const targetId = importData.value.targetUserId;
  const banca = importData.value.banca;

  if (verdi.length > 0) {
    const righe = verdi.map((m) =>
      preparaRigaDB(m, targetId, banca, "confermato")
    );
    const { error } = await supabase.from("transazioni").insert(righe);
    if (error) console.error(error);
    stats.value.inseriti += verdi.length;
  }

  if (gialli.length === 0) {
    await salvaLogEFile(stats.value.inseriti);
    alert("Importazione completata senza conflitti!");
    router.push("/movimenti");
    return;
  }

  conflictQueue.value = gialli;
  loading.value = false;
  processaProssimoConflitto();
};

const processaProssimoConflitto = () => {
  if (conflictQueue.value.length === 0) {
    fineProcessoInterattivo();
    return;
  }
  const item = conflictQueue.value[0];
  const nuovoArricchito = {
    ...item.nuovo,
    conto: importData.value.banca,
    user_id: importData.value.targetUserId,
    note: formData.value.note,
  };
  refConflitto.value?.apri(item.matches, nuovoArricchito);
};

const gestisciRisoluzione = async ({ azione, dati }) => {
  loading.value = true;

  if (azione === "MERGE") {
    const { id, ...fields } = dati;
    await supabase.from("transazioni").update(fields).eq("id", id);
    stats.value.uniti++;
  } else if (azione === "CREATE") {
    const riga = preparaRigaDB(
      dati,
      importData.value.targetUserId,
      importData.value.banca,
      "confermato"
    );
    await supabase.from("transazioni").insert([riga]);
    stats.value.inseriti++;
  } else if (azione === "SKIP") {
    const riga = preparaRigaDB(
      conflictQueue.value[0].nuovo,
      importData.value.targetUserId,
      importData.value.banca,
      "da_convalidare"
    );
    await supabase.from("transazioni").insert([riga]);
    stats.value.sospesi++;
  }

  conflictQueue.value.shift();
  loading.value = false;
  processaProssimoConflitto();
  preparaRigaDB;
};

const fineProcessoInterattivo = async () => {
  loading.value = true;
  const tot = stats.value.inseriti + stats.value.uniti + stats.value.sospesi;
  await salvaLogEFile(tot);
  alert(
    `Finito!\nInseriti: ${stats.value.inseriti}\nUniti: ${stats.value.uniti}\nSospesi: ${stats.value.sospesi}`
  );
  router.push("/movimenti");
};

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
  note: formData.value.note,
  is_manual: false,
});

const salvaLogEFile = async (count) => {
  if (!sessioneAttuale.value) return;

  // Calcolo periodo da / periodo a dai movimenti importati
  let periodoDa = null;
  let periodoA = null;

  if (importData.value.movimenti && importData.value.movimenti.length) {
    const ordinati = [...importData.value.movimenti].sort(
      (a, b) => new Date(a.data) - new Date(b.data)
    );
    periodoDa = ordinati[0].data;
    periodoA = ordinati[ordinati.length - 1].data;
  }

  const nomeFile = `Import ${formData.value.chiSeiNome} - ${importData.value.banca}.csv`;

  const { error } = await supabase.from("importazioni_log").insert([
    {
      // chi è loggato (es. Salvo)
      user_id: sessioneAttuale.value.id,

      // per chi è l’estratto (Salvo, Sigi, ecc.)
      target_user_id: importData.value.targetUserId,

      banca: (importData.value.banca || "").trim(),
      nome_file_generato: nomeFile,
      url_file: "",

      tipo: "estratto_conto",
      periodo_da: periodoDa,
      periodo_a: periodoA,
      righe_importate: count,
      righe_confermate: (stats.value.inseriti || 0) + (stats.value.uniti || 0),
      righe_da_convalidare: stats.value.sospesi || 0,
    },
  ]);

  if (error) console.error("Errore log importazioni", error);
};

const reset = () => {
  step.value = 1;
  importData.value = { targetUserId: null, movimenti: [], banca: "" };
  stats.value = { inseriti: 0, sospesi: 0, uniti: 0, saltati: 0 };
  conflictQueue.value = [];
  if (fileInput.value) fileInput.value.value = "";
};
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
      <div v-if="step === 1" class="mx-auto" style="max-width: 540px">
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
              <label class="fw-bold small mb-1"
                >File estratto (.csv / .xlsx)</label
              >
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
              {{ loading ? msgStato : "AVVIA IMPORTAZIONE" }}
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
                {{ importData.movimenti.length }} movimenti trovati | Banca:
                <strong>{{ importData.banca }}</strong> | Utente:
                <strong>{{ formData.chiSeiNome }}</strong>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-outline-secondary" @click="reset">
                Torna al file
              </button>
              <button
                class="btn btn-outline-primary"
                @click="esportaEstrattoExcel"
                :disabled="loading || !importData.movimenti.length"
              >
                <i class="bi bi-file-earmark-spreadsheet me-1"></i>
                Esporta Excel
              </button>
              <button
                class="btn btn-outline-primary"
                @click="esportaEstrattoPdf"
                :disabled="loading || !importData.movimenti.length"
              >
                <i class="bi bi-file-earmark-pdf me-1"></i>
                Esporta PDF
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
                {{ loading ? msgStato : "CONFERMA E SALVA" }}
              </button>
              <button
                class="btn btn-outline-success"
                @click="salvaExcelSuDrive"
                :disabled="loading || !importData.movimenti.length"
              >
                <i class="bi bi-cloud-upload me-1"></i>
                Salva Excel su Drive
              </button>
            </div>
          </div>
        </div>

        <div class="alert alert-info small">
          I movimenti verranno analizzati per duplicati e salvati nel DB.
        </div>
      </div>

      <div style="height: 40px"></div>
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
