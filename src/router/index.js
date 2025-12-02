import { createRouter, createWebHistory } from 'vue-router'

// Importiamo le 4 viste che abbiamo creato
import HomeView from '../views/HomeView.vue'
import MovimentiView from '../views/MovimentiView.vue'
import StoricoView from '../views/StoricoView.vue'
import ConfigView from '../views/ConfigView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: HomeView
    },
    {
      path: '/movimenti',
      name: 'movimenti',
      component: MovimentiView
    },
    {
      path: '/storico', // Corrisponde a "Analisi" nel menu
      name: 'storico',
      component: StoricoView
    },
    {
      path: '/config',
      name: 'config',
      component: ConfigView
    },
   { path: '/importa', name: 'importa', component: () => import('../views/ImportaView.vue') }

  ]
})

export default router