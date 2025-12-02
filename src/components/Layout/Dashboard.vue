<template>
  <div class="dashboard-layout">
    <!-- COLONNA SINISTRA: CONTROLLI -->
    <aside class="dashboard-sidebar">
      <h6 class="sidebar-title">CONTROLLI DASHBOARD</h6>

      <button class="sidebar-btn primary">Filtra Data</button>
      <button class="sidebar-btn">Cambia Grafico</button>
      <button class="sidebar-btn">Seleziona Conto</button>
      <button class="sidebar-btn">Esporta Report</button>

      <div class="sidebar-info">
        <div class="sidebar-info-icon">i</div>
        <div class="sidebar-info-text">
          Questi comandi modificano<br />
          solo la vista attuale.
        </div>
      </div>
    </aside>

    <!-- PARTE DESTRA: GRIGLIA DASHBOARD -->
    <main class="dashboard-main">
      <!-- RIGA KPI -->
      <section class="row-kpi">
        <div
          class="dash-box"
          v-for="n in 4"
          :key="'kpi-'+n"
        >
          KPI {{ n }}
        </div>
      </section>

      <!-- RIGA GRAFICO PRINCIPALE -->
      <section class="row-chart">
        <div class="dash-box">
          GRAFICO
        </div>
      </section>

      <!-- RIGA LISTE / WIDGET BASSI -->
      <section class="row-bottom">
        <div class="dash-box">
          LISTA
        </div>
        <div class="dash-box extra-box">
          EXTRA
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
// Nessuna logica per ora: solo contenitori
</script>

<style scoped>
/* ROOT DELLA PAGINA: riempie tutta l'area app-content */
.dashboard-layout {
  width: 100%;
  height: 100%;
  display: flex;
  background: #f4f7fb;
  min-height: 0; /* importante per permettere lo scroll interno */
}

/* SIDEBAR SINISTRA (desktop) */
.dashboard-sidebar {
  width: 260px;
  padding: 16px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  background: #ffffff;

  /* se i pulsanti sono tanti, scrolla SOLO la colonna */
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
}

.sidebar-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #6b7280;
  text-transform: uppercase;
}

.sidebar-btn {
  width: 100%;
  text-align: left;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 10px 12px;
  font-size: 0.85rem;
  cursor: pointer;
}

.sidebar-btn.primary {
  border-color: #4f46e5;
  background: #4f46e5;
  color: #ffffff;
}

.sidebar-info {
  margin-top: auto;
  display: flex;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: #e0f2fe;
  font-size: 0.75rem;
  color: #0f172a;
}

.sidebar-info-icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
}

/* AREA PRINCIPALE */
.dashboard-main {
  flex: 1 1 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

/* RIGHE della dashboard (desktop: altezze in %) */
.row-kpi {
  flex: 0 0 22%;
  display: flex;
  gap: 12px;
  min-height: 0;
}

.row-chart {
  flex: 0 0 33%;
  display: flex;
  min-height: 0;
}

.row-bottom {
  flex: 1 1 0;
  display: flex;
  gap: 12px;
  min-height: 0;
}

/* CONTENITORI PLACEHOLDER (bordo rosso) */
.dash-box {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  border-radius: 12px;
  border: 2px solid red; /* 👈 bordo rosso per vedere gli spazi */
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
}

/* ========== RESPONSIVE ========== */

/* Tablet & Mobile */
@media (max-width: 992px) {
  .dashboard-layout {
    flex-direction: column; /* sidebar sopra, card sotto */
  }

  /* Sidebar a tutta larghezza, con scroll se è alta */
  .dashboard-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 12px;
    max-height: 40%;      /* occupa max il 40% dello schermo */
    overflow-y: auto;     /* scroll interno se non ci sta tutto */
  }

  /* Area card sotto, che può scrollare */
  .dashboard-main {
    padding: 8px;
    flex: 1 1 auto;
    overflow-y: auto;     /* 👈 scroll su mobile per vedere tutte le card */
    max-height: 60%;
  }

  /* le righe non hanno più altezza fissa in % */
  .row-kpi,
  .row-chart,
  .row-bottom {
    flex: 0 0 auto;
  }

  /* KPI: 2 per riga */
  .row-kpi {
    flex-wrap: wrap;
  }

  .row-kpi .dash-box {
    flex: 1 1 calc(50% - 6px);
  }

  /* LISTA + EXTRA: una sotto l'altra */
  .row-bottom {
    flex-wrap: wrap;
  }

  .row-bottom .dash-box {
    flex: 1 1 100%;
  }

  .row-bottom .extra-box {
    flex: 1 1 100%;
  }
}

/* Schermi molto piccoli: se vuoi puoi nascondere l'EXTRA */
@media (max-width: 576px) {
  .row-kpi {
    flex: 0 0 auto;
  }

  /* puoi lasciare 2 per riga, oppure scommentare per 1 per riga:
  .row-kpi .dash-box {
    flex: 1 1 100%;
  }
  */

  .row-bottom .extra-box {
    display: none;
  }
}
</style>
