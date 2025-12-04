<template>
  <div class="dashboard-layout">
    <!-- SIDEBAR SINISTRA -->
    <aside class="dashboard-sidebar">
      <h6 class="sidebar-title">CONTROLLI DASHBOARD</h6>

      <!-- UTENTI -->
      <div class="sidebar-block">
        <div class="sidebar-label">Utenti</div>
        <button
          class="sidebar-btn"
          :class="{ primary: activeUser === 'all' }"
          @click="activeUser = 'all'"
        >
          Tutti
        </button>
        <button
          class="sidebar-btn"
          :class="{ primary: activeUser === 'salvo' }"
          @click="activeUser = 'salvo'"
        >
          Salvo
        </button>
        <button
          class="sidebar-btn"
          :class="{ primary: activeUser === 'sigi' }"
          @click="activeUser = 'sigi'"
        >
          Sigi
        </button>
      </div>

      <!-- VISTA (collega i bottoni al grafico centrale) -->
      <div class="sidebar-block">
        <div class="sidebar-label">Vista</div>

        <button
          class="sidebar-btn"
          :class="{ primary: selectedView === 'periodo' }"
          @click="setView('periodo')"
        >
          Periodo
        </button>

        <button
          class="sidebar-btn"
          :class="{ primary: selectedView === 'conti' }"
          @click="setView('conti')"
        >
          Conti &amp; Banche
        </button>

        <button
          class="sidebar-btn"
          :class="{ primary: selectedView === 'tipo' }"
          @click="setView('tipo')"
        >
          Tipo di analisi
        </button>

        <button
          class="sidebar-btn"
          :class="{ primary: selectedView === 'categorie' }"
          @click="setView('categorie')"
        >
          Categorie
        </button>

        <button
          class="sidebar-btn"
          :class="{ primary: selectedView === 'tag' }"
          @click="setView('tag')"
        >
          Tag
        </button>
      </div>

      <!-- VISUALIZZAZIONE -->
      <div class="sidebar-block">
        <div class="sidebar-label">Visualizzazione</div>
        <button class="sidebar-btn">Raggruppa per</button>
        <button class="sidebar-btn">Layout dashboard</button>
      </div>

      <!-- FILTRI & CONFRONTI -->
      <div class="sidebar-block">
        <div class="sidebar-label">Filtri &amp; confronti</div>
        <button class="sidebar-btn">Filtri avanzati</button>
        <button class="sidebar-btn">Confronta con...</button>
      </div>

      <!-- AZIONI -->
      <div class="sidebar-block">
        <div class="sidebar-label">Azioni</div>
        <button class="sidebar-btn">Esporta / Condividi</button>
        <button class="sidebar-btn">Reset filtri</button>
      </div>

      <!-- INFO FINALE -->
      <div class="sidebar-info">
        <div class="sidebar-info-icon">i</div>
        <div class="sidebar-info-text">
          Questi comandi modificano<br />
          solo la vista attuale.
        </div>
      </div>
    </aside>

    <!-- AREA PRINCIPALE -->
    <main class="dashboard-main">
      <!-- RIGA KPI -->
      <section class="row-kpi">
        <DashboardKpis :active-user="activeUser" />
      </section>

      <!-- RIGA GRAFICO -->
      <section class="row-chart" ref="chartSection">
        <DashboardChart
          :active-user="activeUser"
          :view="selectedView"
        />
      </section>

      <!-- RIGA LISTA + EXTRA + COLONNA DX -->
      <section class="row-bottom">
        <!-- COLONNA 1: LISTA MOVIMENTI (SCORREVOLE) -->
        <div class="col-bottom col-bottom-list">
          <DashboardList
            :active-user="activeUser"
            :view="selectedView"
          />
        </div>

        <!-- COLONNA 2: INSIGHT RAPIDI (DashboardExtra) -->
        <div class="col-bottom col-bottom-extra">
          <DashboardExtra :active-user="activeUser" />
        </div>

        <!-- COLONNA 3: SPAZIO EXTRA A DESTRA -->
        <div class="col-bottom col-bottom-right">
          <div class="right-box">
            <p class="right-title">Spazio extra</p>
            <p class="right-subtitle">
              Qui possiamo aggiungere un altro widget (es. categorie top, obiettivi, ecc.).
            </p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DashboardKpis from '../components/Dashboard/DashboardKpis.vue'
import DashboardChart from '../components/Dashboard/DashboardChart.vue'
import DashboardList from '../components/Dashboard/DashboardList.vue'
import DashboardExtra from '../components/Dashboard/DashboardExtra.vue'

const activeUser = ref('all')          // 'all' | 'salvo' | 'sigi'
const selectedView = ref('periodo')    // 'periodo' | 'conti' | 'tipo' | 'categorie' | 'tag'
const chartSection = ref(null)

// quando cambio vista:
// - aggiorno selectedView
// - su mobile scrollo dolcemente alla sezione grafico
function setView (viewId) {
  selectedView.value = viewId

  if (window.innerWidth <= 992 && chartSection.value) {
    chartSection.value.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}
</script>

<style scoped>
/* ROOT DELLA PAGINA: riempie tutta l'area app */
.dashboard-layout {
  width: 100%;
  height: 100%;
  display: flex;
  background: #f4f7fb;
  min-height: 0;
}

/* SIDEBAR SINISTRA */
.dashboard-sidebar {
  width: 260px;
  padding: 16px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  background: #ffffff;

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
  margin-bottom: 8px;
}

.sidebar-block {
  margin-bottom: 16px;
}

.sidebar-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 6px;
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

/* RIGHE della dashboard */
.row-kpi {
  flex: 0 0 22%;
  min-height: 0;
}

.row-chart {
  flex: 0 0 33%;
  display: flex;
  min-height: 0;
}

.row-chart > * {
  flex: 1 1 0;
}

/* RIGA INFERIORE: 3 COLONNE */
.row-bottom {
  flex: 1 1 0;
  display: flex;
  gap: 12px;
  min-height: 0;
}

.col-bottom {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 3 colonne da 1/3 ciascuna */
.col-bottom-list,
.col-bottom-extra,
.col-bottom-right {
  flex: 0 0 33.3333%;
  max-width: 33.3333%;
}

/* LISTA SCORREVOLE DENTRO LA SUA COLONNA */
.col-bottom-list {
  overflow-y: auto;
}

/* INSIGHT RAPIDI: contenitore “pulito” senza bordo rosso */
.col-bottom-extra {
  /* niente bordo rosso, il look lo dà il contenuto di DashboardExtra */
}

/* COLONNA DESTRA: placeholder */
.right-box {
  flex: 1 1 auto;
  border-radius: 16px;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.right-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.right-subtitle {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

/* RESPONSIVE */
@media (max-width: 992px) {
  .dashboard-layout {
    flex-direction: column;
  }

  .dashboard-sidebar {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    gap: 8px;
    padding: 8px 12px;
    max-height: 40%;
  }

  .sidebar-title {
    width: 100%;
  }

  .sidebar-btn {
    flex: 1 1 calc(50% - 6px);
    font-size: 0.8rem;
    padding: 8px;
  }

  .sidebar-info {
    width: 100%;
    margin-top: 8px;
  }

  .dashboard-main {
    padding: 8px;
    flex: 1 1 auto;
    overflow-y: auto;
    max-height: 60%;
  }

  .row-kpi,
  .row-chart,
  .row-bottom {
    flex: 0 0 auto;
    min-height: auto;
  }

  .row-bottom {
    flex-wrap: wrap;
  }

  /* su schermi più stretti le colonne vanno una sotto l'altra */
  .col-bottom-list,
  .col-bottom-extra,
  .col-bottom-right {
    flex: 1 1 100%;
    max-width: 100%;
  }
}

@media (max-width: 576px) {
  /* su smartphone mostriamo solo la lista, nascondiamo le altre due colonne */
  .col-bottom-extra,
  .col-bottom-right {
    display: none;
  }
}
</style>
