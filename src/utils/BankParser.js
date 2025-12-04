import Papa from "papaparse";
import readXlsxFile from "read-excel-file";

// =============================
// FUNZIONE PRINCIPALE
// =============================
export async function parseBankFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  if (extension === "csv") {
    return await parseCSV(file);
  } else if (extension === "xlsx" || extension === "xls") {
    return await parseExcel(file);
  } else {
    throw new Error("Formato non supportato. Usa CSV o XLSX.");
  }
}

// =============================
// LETTORE CSV
// =============================
function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const datiNormalizzati = analizzaRighe(results.data, file.name);
          resolve(datiNormalizzati);
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}

// =============================
// LETTORE EXCEL
// =============================
async function parseExcel(file) {
  const rows = await readXlsxFile(file);
  return analizzaRighe(rows, file.name);
}

// =============================
// CERVELLO: RICONOSCE BANCA E NORMALIZZA
// =============================
function analizzaRighe(rows, fileName) {
  if (!rows || rows.length < 1) {
    throw new Error("File vuoto");
  }

  let colData = -1;
  let colDesc = -1;
  let colImporto = -1;
  let colCategoria = -1;
  let colStato = -1; // solo per Revolut
  let startRow = 0;
  let bancaRilevata = "Generica";

  // 1) AUTO-RILEVAMENTO COLONNE
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const rigaOriginale = rows[i] || [];
    const riga = rigaOriginale.map((c) => String(c).toLowerCase().trim());

    // ---------- LOGICA REVOLUT ----------
    // Header tipico:
    // Tipo | Prodotto | Data di inizio | Data di completamento | Descrizione | Importo | Commissione | Valuta | State | Saldo | (Categoria)
    if (
      riga.includes("tipo") &&
      riga.includes("data di inizio") &&
      riga.includes("importo") &&
      riga.includes("descrizione")
    ) {
      colData = riga.indexOf("data di inizio");
      colDesc = riga.indexOf("descrizione");
      colImporto = riga.indexOf("importo");

      // Se esiste una colonna "categoria" di Revolut la usiamo come categoria_banca
      if (riga.includes("categoria")) {
        colCategoria = riga.indexOf("categoria");
      } else {
        // altrimenti usiamo "tipo" (Pagamento, Pagamento con carta, ecc.)
        colCategoria = riga.indexOf("tipo");
      }

      // stato / state (in alcuni CSV è "state", in altri "stato")
      if (riga.includes("state")) {
        colStato = riga.indexOf("state");
      } else if (riga.includes("stato")) {
        colStato = riga.indexOf("stato");
      }

      bancaRilevata = "Revolut";
      startRow = i + 1;
      break;
    }

    // ---------- LOGICA INTESA / CARISBO ----------
    if (
      riga.includes("data") &&
      (riga.includes("dettagli") || riga.includes("descrizione")) &&
      riga.includes("importo") &&
      !riga.includes("data di inizio") // per non confonderla con Revolut
    ) {
      colData = riga.indexOf("data");
      colDesc =
        riga.indexOf("dettagli") > -1
          ? riga.indexOf("dettagli")
          : riga.indexOf("descrizione");

      colImporto = riga.indexOf("importo");

      if (riga.includes("categoria")) {
        colCategoria = riga.indexOf("categoria");
      } else if (riga.includes("voce di spesa")) {
        colCategoria = riga.indexOf("voce di spesa");
      }

      bancaRilevata = "Intesa Sanpaolo";
      startRow = i + 1;
      break;
    }
  }

  // ---------- FALLBACK GENERICO ----------
  if (colData === -1) {
    colData = 0;
    colDesc = 1;
    colImporto = 2;
    startRow = 0;
    bancaRilevata = "Sconosciuta";
  }

  // 2) ESTRAZIONE MOVIMENTI
  const movimenti = [];

  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i] || [];

    if (!r[colData]) continue;

    // --- FILTRO STATO SOLO PER REVOLUT ---
    if (colStato > -1) {
      const stato = String(r[colStato] || "")
        .toUpperCase()
        .trim();
      if (stato && stato !== "COMPLETATO" && stato !== "COMPLETED") continue;
    }

    const dataObj = parseDate(r[colData]);
    if (!dataObj) continue;

    const importo = parseMoney(r[colImporto]);
    if (isNaN(importo) || importo === 0) continue;

    const desc = r[colDesc] || "Nessuna descrizione";

    // CATEGORIA DELLA BANCA (Revolut / Intesa)
    let catBanca = "Da Classificare";
    if (colCategoria > -1 && r[colCategoria]) {
      catBanca = toTitleCase(String(r[colCategoria]));
    }

    movimenti.push({
      data: dataObj.toISOString().split("T")[0], // YYYY-MM-DD
      descrizione: cleanText(desc),
      importo,
      tipo: importo < 0 ? "Uscita" : "Entrata",

      // il conto reale (es. "Revolut Salvo") viene impostato in ImportaView
      conto: bancaRilevata,

      categoria_banca: catBanca, // <- qui finiscono "Ricarica", "Pagamento", "Commissione", ecc.
      categoria_id: null,
      categoria: null,
    });
  }

  return { banca: bancaRilevata, movimenti };
}

// =============================
// HELPER DATE
// =============================
function parseDate(raw) {
  if (raw instanceof Date) return raw;
  const str = String(raw).trim();

  // Formato tipo Revolut: "2024-12-20 11:02:41"
  if (str.includes("-")) {
    const dataPura = str.split(" ")[0];
    const d = new Date(dataPura);
    if (!isNaN(d.getTime())) return d;
  }

  // Formato italiano: "20/12/2024"
  if (str.includes("/")) {
    const soloData = str.split(" ")[0];
    const parts = soloData.split("/");
    if (parts.length === 3) {
      const d = new Date(parts[2], parts[1] - 1, parts[0]);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

// =============================
// HELPER SOLDI
// =============================
function parseMoney(raw) {
  if (typeof raw === "number") return raw;

  let str = String(raw).trim();
  str = str.replace("€", "").replace("$", "").trim();

  // Formato internazionale: "1500.00"
  if (str.includes(".") && !str.includes(",")) {
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  }

  // Formato italiano: "1.500,00"
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }

  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

// =============================
// HELPER TESTO
// =============================
function cleanText(txt) {
  return String(txt).trim().replace(/\s+/g, " ");
}

function toTitleCase(str) {
  if (!str) return "Da Classificare";
  str = str.trim().toLowerCase();
  if (str === "" || str === "-") return "Da Classificare";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
