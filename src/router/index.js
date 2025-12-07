import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../supabase";

// Viste
import HomeView from "../views/HomeView.vue";
import MovimentiView from "../views/MovimentiView.vue";
import StoricoView from "../views/StoricoView.vue";
import ConfigView from "../views/ConfigView.vue";
import LoginView from "../views/LoginView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { hideChrome: true }, // <--- FONDAMENTALE: Nasconde menu
    },
    {
      path: "/",
      name: "dashboard",
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: "/movimenti",
      name: "movimenti",
      component: MovimentiView,
      meta: { requiresAuth: true },
    },
    {
      path: "/storico",
      name: "storico",
      component: StoricoView,
      meta: { requiresAuth: true },
    },
    {
      path: "/config",
      name: "config",
      component: ConfigView,
      meta: { requiresAuth: true },
    },
    {
      path: "/importa",
      name: "importa",
      component: () => import("../views/ImportaView.vue"),
      meta: { requiresAuth: true },
    },
    // Qualsiasi pagina non trovata -> Dashboard
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

// --- GUARDIA DI NAVIGAZIONE ---
// Questo codice viene eseguito PRIMA di ogni cambio pagina
router.beforeEach(async (to, from, next) => {
  try {
    const { data, error: sessionError } = await supabase.auth.getSession();
    // If session retrieval fails, clear corrupted data and redirect to login
    if (sessionError) {
      console.error("Session retrieval error:", sessionError);
      await supabase.auth.signOut(); // This clears localStorage
      if (to.name !== "login") {
        return next({ name: "login" });
      }
      return next();
    }
    const session = data?.session;
    // 2. Se la pagina richiede login (requiresAuth) e NON c'è sessione -> LOGIN
    if (to.meta.requiresAuth && !session) {
      return next({ name: "login" });
    }

    // 3. Se sono già loggato e provo ad andare al login -> DASHBOARD
    if (to.name === "login" && session) {
      return next({ name: "dashboard" });
    }

    // 4. Altrimenti vai dove devi andare
    next();
  } catch (error) {
    console.error("Errore router:", error);
    // Clear potentially corrupted session
    await supabase.auth.signOut();
    if (to.name !== "login") {
      next({ name: "login" });
    } else {
      next();
    }
  }
});

export default router;
