// src/utils/RuleEngine.js (o percorso equivalente)
import { supabase } from '@/supabase'

/**
 * Applica le regole ai movimenti caricati da BankParser.
 *
 * - NON tocca categoria_banca (resta il valore della banca)
 * - Imposta categoria_id in base a regole.categoria_id
 * - Imposta categoria (testo) usando la tabella categorie
 */
export async function applicaRegole(movimenti) {
  if (!movimenti || movimenti.length === 0) {
    return movimenti || []
  }

  // 1. Carico tutte le regole utili
  const { data: regole, error: errRegole } = await supabase
    .from('regole')
    .select('id, keyword, categoria_id')

  if (errRegole) {
    console.error('[Regole] Errore caricamento regole:', errRegole)
    // in caso di errore, restituisco i movimenti così come sono
    return movimenti
  }

  // 2. Carico il dizionario categorie (id -> nome)
  const { data: categorie, error: errCat } = await supabase
    .from('categorie')
    .select('id, nome')

  if (errCat) {
    console.error('[Regole] Errore caricamento categorie:', errCat)
    return movimenti
  }

  const catById = new Map(categorie.map(c => [c.id, c.nome]))

  // 3. Per ogni movimento applico la prima regola che matcha
  const result = movimenti.map(mov => {
    // Se ha già categoria_id (magari messa a mano) non lo tocco
    if (mov.categoria_id) {
      const nomeCat = catById.get(mov.categoria_id) || mov.categoria || null
      return {
        ...mov,
        categoria_id: mov.categoria_id,
        categoria: nomeCat
      }
    }

    const descr = (mov.descrizione || '').toLowerCase()
    const catBanca = (mov.categoria_banca || '').toLowerCase()
    const target = `${descr} ${catBanca}`.trim()

    let nuovaCategoriaId = null

    for (const reg of regole) {
      if (!reg.keyword) continue
      const kw = reg.keyword.toLowerCase().trim()
      if (!kw) continue

      if (target.includes(kw)) {
        nuovaCategoriaId = reg.categoria_id || null
        break   // prima regola che matcha, ci fermiamo
      }
    }

    const nomeCategoria = nuovaCategoriaId
      ? (catById.get(nuovaCategoriaId) || mov.categoria || null)
      : mov.categoria || null

    return {
      ...mov,
      categoria_id: nuovaCategoriaId,
      categoria: nomeCategoria
    }
  })

  return result
}
