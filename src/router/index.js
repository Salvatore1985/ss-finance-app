import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase' // Importiamo supabase per controllare se sei loggato

import HomeView from '../views/HomeView.vue'
import MovimentiView from '../views/MovimentiView.vue'
import StoricoView from '../views/StoricoView.vue'
import ImportaView from '../views/ImportaView.vue'
import ConfigView from '../views/ConfigView.vue'
import LoginView from '../views/LoginView.vue' // <--- NUOVO
import CheckView from '../views/CheckView.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView }, // <--- NUOVO
    { path: '/', name: 'dashboard', component: HomeView },
    { path: '/movimenti', name: 'movimenti', component: MovimentiView },
    { path: '/storico', name: 'storico', component: StoricoView },
    { path: '/importa', name: 'importa', component: ImportaView },
    { path: '/config', name: 'config', component: ConfigView },
    { path: '/check', name: 'check', component: CheckView },
  ]
})

// --- GUARDIA DI PROTEZIONE ---
router.beforeEach(async (to, from, next) => {
  // Chiediamo a Supabase se c'è un utente attivo
  const { data: { session } } = await supabase.auth.getSession()

  // Se non c'è sessione e provi ad andare su pagine diverse dal login
  if (!session && to.name !== 'login') {
    next({ name: 'login' }) // Ti calcio al login
  } else if (session && to.name === 'login') {
    next({ name: 'dashboard' }) // Se sei già loggato, non ti faccio vedere il login
  } else {
    next() // Vai pure
  }
})

export default router