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

// Recupero della sessione con un piccolo timeout di fallback per evitare
// blocchi infiniti se Supabase non risponde.
async function getSessionWithTimeout(timeoutMs = 3500) {
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          data: { session: null },
          error: new Error("Session timeout"),
        }),
      timeoutMs
    )
  );

  try {
    return await Promise.race([supabase.auth.getSession(), timeoutPromise]);
  } catch (error) {
    return { data: { session: null }, error };
  }
}

// Tutto tranne /login richiede un utente loggato
router.beforeEach(async (to, from, next) => {
  try {
    const { data, error: sessionError } = await getSessionWithTimeout();
    const session = data?.session;

    if (sessionError) {
      console.error("Errore auth guard", sessionError);
    }

    const user = session?.user || null;

    // Pagina pubblica
    if (to.name === "login") {
      // Se sei già loggato e provi ad andare su /login → torna in app
      if (user) {
        return next({ name: from.name || "dashboard" });
      }
      return next();
    }

    // Per tutte le altre pagine serve il login
    if (!user) {
      return next({ name: "login" });
    }

    return next();
  } catch (error) {
    console.error("Errore auth guard", error);
    // in caso di problemi imprevisti torno alla login per evitare blocchi di navigazione
    if (to.name === "login") {
      return next();
    }
    return next({ name: "login" });
  }
});

export default router;
