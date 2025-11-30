import { supabase } from '../supabase'

/**
 * Prende una lista di movimenti e applica le regole salvate nel DB.
 * Ritorna la lista modificata con le categorie assegnate.
 */
export async function applicaRegole(movimenti) {
  // 1. Scarica tutte le regole dal DB
  const { data: regole, error } = await supabase.from('regole').select('*')
  
  if (error || !regole) {
    console.error("Errore caricamento regole:", error)
    return movimenti // Se fallisce, ritorna i movimenti originali
  }

  // 2. Loop su ogni movimento
  return movimenti.map(mov => {
    // Se ha già una categoria valida dalla banca, saltiamo (o sovrascriviamo? Meglio sovrascrivere se c'è una regola esplicita)
    
    let nuovaCategoria = mov.categoria // Partiamo da quella che c'è (es. "Da Classificare" o quella della banca)
    const descrizione = mov.descrizione.toLowerCase()

    // 3. Cerca match con le regole
    for (const regola of regole) {
      if (descrizione.includes(regola.keyword.toLowerCase())) {
        nuovaCategoria = regola.categoria
        break // Trovata una regola, ci fermiamo (vince la prima o la più specifica?)
      }
    }

    // Ritorniamo il movimento con la categoria aggiornata
    return {
      ...mov,
      categoria: nuovaCategoria
    }
  })
}