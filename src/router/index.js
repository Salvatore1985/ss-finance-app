// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";

// Viste principali
import HomeView from "../views/HomeView.vue";
import MovimentiView from "../views/MovimentiView.vue";
import StoricoView from "../views/StoricoView.vue";
import ConfigView from "../views/ConfigView.vue";
import LoginView from "../views/LoginView.vue";

import { supabase } from "../supabase";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { hideChrome: true },
    },
    {
      path: "/",
      name: "dashboard",
      component: HomeView,
    },
    {
      path: "/movimenti",
      name: "movimenti",
      component: MovimentiView,
    },
    {
      path: "/storico", // Corrisponde a "Storico" nel menu
      name: "storico",
      component: StoricoView,
    },
    {
      path: "/config",
      name: "config",
      component: ConfigView,
    },
    {
      path: "/importa",
      name: "importa",
      component: () => import("../views/ImportaView.vue"),
    },
    // qualsiasi altra cosa → dashboard
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

// Tutto tranne /login richiede un utente loggato
router.beforeEach(async (to, from, next) => {
  // Pagina pubblica
  if (to.name === "login") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Se sei già loggato e provi ad andare su /login → torna in app
    if (user) {
      return next({ name: from.name || "dashboard" });
    }
    return next();
  }

  // Per tutte le altre pagine serve il login
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error("Errore auth guard", error);
  }
  if (!user) {
    return next({ name: "login" });
  }

  next();
});

export default router;
