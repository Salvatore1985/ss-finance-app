import Papa from 'papaparse'
import readXlsxFile from 'read-excel-file'

// Funzione principale
export async function parseBankFile(file) {
  const extension = file.name.split('.').pop().toLowerCase()

  if (extension === 'csv') {
    return await parseCSV(file)
  } else if (extension === 'xlsx' || extension === 'xls') {
    return await parseExcel(file)
  } else {
    throw new Error("Formato non supportato. Usa CSV o XLSX.")
  }
}

// Lettore CSV
function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false, 
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const datiNormalizzati = analizzaRighe(results.data, file.name)
          resolve(datiNormalizzati)
        } catch (e) {
          reject(e)
        }
      },
      error: (err) => reject(err)
    })
  })
}

// Lettore Excel
async function parseExcel(file) {
  const rows = await readXlsxFile(file)
  return analizzaRighe(rows, file.name)
}

// --- IL CERVELLO: Capisce la banca e normalizza i dati ---
function analizzaRighe(rows, fileName) {
  if (!rows || rows.length < 1) throw new Error("File vuoto")

  let colData = -1
  let colDesc = -1
  let colImporto = -1
  let colCategoria = -1 
  let colStato = -1 // Nuova gestione stato
  let startRow = 0
  let bancaRilevata = "Generica"

  // 1. AUTO-RILEVAMENTO DELLE COLONNE
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const riga = rows[i].map(c => String(c).toLowerCase().trim())
    
    // --- LOGICA REVOLUT (CSV TUO) ---
    // Cerca: "tipo", "data di inizio", "descrizione", "importo", "state"
    if (riga.includes('tipo') && riga.includes('data di inizio') && riga.includes('importo') && riga.includes('descrizione')) {
      colData = riga.indexOf('data di inizio')
      colDesc = riga.indexOf('descrizione')
      colImporto = riga.indexOf('importo')
      
      // Usiamo "Tipo" (es. Pagamento) come categoria banca provvisoria
      colCategoria = riga.indexOf('tipo')
      
      // Cerchiamo lo stato per filtrare solo i completati
      if (riga.includes('state')) colStato = riga.indexOf('state')
      
      bancaRilevata = "Revolut"
      startRow = i + 1
      break
    }

    // --- LOGICA INTESA / CARISBO (Standard precedente) ---
    if (riga.includes('data') && (riga.includes('dettagli') || riga.includes('descrizione')) && riga.includes('importo') && !riga.includes('data di inizio')) {
      colData = riga.indexOf('data')
      colDesc = riga.indexOf('dettagli') > -1 ? riga.indexOf('dettagli') : riga.indexOf('descrizione')
      colImporto = riga.indexOf('importo')
      
      if (riga.includes('categoria')) colCategoria = riga.indexOf('categoria')
      else if (riga.includes('voce di spesa')) colCategoria = riga.indexOf('voce di spesa')
      
      bancaRilevata = "Intesa Sanpaolo"
      startRow = i + 1
      break
    }
  }

  // Fallback se non trova nulla
  if (colData === -1) {
    colData = 0; colDesc = 1; colImporto = 2; startRow = 0;
    bancaRilevata = "Sconosciuta"
  }

  // 2. ESTRAZIONE DATI
  const movimenti = []

  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i]
    
    // Controllo sicurezza
    if (!r[colData]) continue 

    // --- FILTRO STATO (Solo per Revolut) ---
    // Se c'è la colonna stato, e il valore NON è "COMPLETATO" (o COMPLETED), saltiamo la riga
    if (colStato > -1) {
      const stato = String(r[colStato]).toUpperCase()
      if (stato !== 'COMPLETATO' && stato !== 'COMPLETED') continue
    }

    let dataObj = parseDate(r[colData])
    if (!dataObj) continue 

    let importo = parseMoney(r[colImporto])
    if (isNaN(importo) || importo === 0) continue

    let desc = r[colDesc] || "Nessuna descrizione"
    
    // RECUPERO CATEGORIA
    let catBanca = "Da Classificare"
    if (colCategoria > -1 && r[colCategoria]) {
       catBanca = toTitleCase(String(r[colCategoria]))
    }

    movimenti.push({
      data: dataObj.toISOString().split('T')[0], // YYYY-MM-DD
      descrizione: cleanText(desc),
      importo: importo,
      tipo: importo < 0 ? 'Uscita' : 'Entrata',
      categoria: catBanca, 
      conto: bancaRilevata
    })
  }

  return { banca: bancaRilevata, movimenti }
}

// --- HELPER DATE ---
function parseDate(raw) {
  if (raw instanceof Date) return raw
  const str = String(raw).trim()
  
  // Gestione formato Revolut: "2024-03-13 21:38:38"
  // Basta prendere la parte prima dello spazio se è in formato ISO
  if (str.includes('-')) {
    const dataPura = str.split(' ')[0] // Prende "2024-03-13"
    return new Date(dataPura)
  }

  // Gestione formato Italiano: "13/03/2024"
  if (str.includes('/')) {
    const parts = str.split(' ')[0].split('/') // Prende prima dello spazio, poi splitta
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0])
  }

  return null
}

// --- HELPER SOLDI ---
function parseMoney(raw) {
  if (typeof raw === 'number') return raw
  let str = String(raw).trim().replace('€', '').replace('$', '').trim()
  
  // Gestione standard CSV internazionale (punto per decimali)
  // Revolut nel CSV usa "40.00" (punto)
  if (str.includes('.') && !str.includes(',')) {
    return parseFloat(str)
  }

  // Gestione Italiana (1.000,00)
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (str.includes(',')) {
    str = str.replace(',', '.')
  }
  return parseFloat(str)
}

function cleanText(txt) {
  return String(txt).trim().replace(/\s+/g, ' ')
}

function toTitleCase(str) {
  if (!str) return "Da Classificare"
  str = str.trim().toLowerCase()
  if (str === "" || str === "-") return "Da Classificare"
  return str.charAt(0).toUpperCase() + str.slice(1)
}