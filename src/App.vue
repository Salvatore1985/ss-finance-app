<script setup>
import { RouterView, useRoute, useRouter } from 'vue-router'
import { ref, onMounted, computed, watch } from 'vue'
import NuovoMovimento from './components/NuovoMovimento.vue'
import { Modal } from 'bootstrap'
import { supabase } from './supabase'

// route & router
const route = useRoute()
const router = useRouter()

// -------- UTENTE LOGGATO --------
const userEmail = ref('')

// mappa email -> nome
const EMAIL_TO_NAME = {
  'salvatorecascone8@gmail.com': 'Salvo',
  // 👇 SOSTITUISCI con l’email vera di Sigi
  'sigidembacaj@gmail.com': 'Sigi',
}

const isLoggedIn = computed(() => !!userEmail.value)

const userLabel = computed(() => {
  if (!userEmail.value) return 'Accedi'

  const email = userEmail.value.toLowerCase().trim()
  if (EMAIL_TO_NAME[email]) return EMAIL_TO_NAME[email]

  const nick = email.split('@')[0] || 'Account'
  return nick.charAt(0).toUpperCase() + nick.slice(1)
})

const caricaUtente = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (!error && data.user) {
    userEmail.value = data.user.email || ''
  } else {
    userEmail.value = ''
  }
}

// stato apertura menu account
const showAccountMenu = ref(false)

const toggleAccountMenu = () => {
  if (!isLoggedIn.value) {
    // se non sei loggato → vai al login
    router.push('/login')
  } else {
    showAccountMenu.value = !showAccountMenu.value
  }
}

// chiudi menu quando cambi pagina
watch(
  () => route.fullPath,
  () => {
    showAccountMenu.value = false
  }
)

// logout vero
const logout = async () => {
  await supabase.auth.signOut()
  userEmail.value = ''
  showAccountMenu.value = false
  router.push('/login')
}

// -------- NAV / MODALE --------
const vaiA = (path) => {
  router.push(path)
}

const apriNuovo = () => {
  const el = document.getElementById('modalNuovo')
  if (!el) return
  const modal = new Modal(el)
  modal.show()
}

const refreshData = () => {
  window.location.reload()
}

onMounted(() => {
  caricaUtente()
})
</script>

<template>
  <div class="bg-blob"></div>

  <!-- NAVBAR DESKTOP -->
  <nav class="navbar d-none d-lg-block navbar-expand-lg glass-nav mb-4">
    <div class="container">
      <a class="navbar-brand fw-bold" href="#" style="color: var(--primary-dark);">
        <i class="bi bi-wallet-fill me-2"></i>S.S. Finance
      </a>
      
      <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-nav" :class="{ active: route.name === 'dashboard' }" @click="vaiA('/')">
          <i class="bi bi-grid-1x2-fill"></i> Dash
        </button>
        <button class="btn btn-nav" :class="{ active: route.name === 'movimenti' }" @click="vaiA('/movimenti')">
          <i class="bi bi-receipt-cutoff"></i> Movimenti
        </button>
        <button class="btn btn-nav" :class="{ active: route.name === 'storico' }" @click="vaiA('/storico')">
          <i class="bi bi-search"></i> Storico
        </button>
        <button class="btn btn-nav" :class="{ active: route.name === 'check' }" @click="vaiA('/check')">
          <i class="bi bi-check-circle-fill"></i> Check
        </button>
        <button class="btn btn-nav" :class="{ active: route.name === 'importa' }" @click="vaiA('/importa')">
          <i class="bi bi-cloud-arrow-up-fill"></i> Importa
        </button>
        <button class="btn btn-nav" :class="{ active: route.name === 'config' }" @click="vaiA('/config')">
          <i class="bi bi-gear-fill"></i> Config
        </button>
        
        <button class="btn btn-primary btn-sm fw-bold ms-3 px-3 rounded-pill shadow-sm" @click="apriNuovo">
          <i class="bi bi-plus-lg me-1"></i> Nuovo
        </button>

        <!-- ICONA / MENU ACCOUNT DESKTOP -->
        <div class="position-relative ms-2">
          <button
            class="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-2"
            type="button"
            @click="toggleAccountMenu"
          >
            <i class="bi bi-person-circle"></i>
            <span class="small">{{ userLabel }}</span>
            <i v-if="isLoggedIn" class="bi bi-caret-down-fill small"></i>
          </button>

          <!-- MENU A TENDINA -->
          <div
            v-if="isLoggedIn && showAccountMenu"
            class="account-menu shadow-sm rounded-3 bg-white position-absolute end-0 mt-2 py-2"
            style="min-width: 180px; z-index: 1050;"
          >
            <div class="px-3 pb-2 small text-muted">
              Collegato come
              <div class="fw-semibold text-dark">{{ userLabel }}</div>
            </div>
            <button
              class="dropdown-item text-danger small px-3"
              type="button"
              @click="logout"
            >
              <i class="bi bi-box-arrow-right me-1"></i>
              Esci / cambia utente
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- CONTENUTO PRINCIPALE -->
  <div class="container main-container">
    
    <!-- HEADER MOBILE -->
    <div class="d-flex d-lg-none justify-content-between align-items-center mb-4 pt-4 px-3">
      <div>
        <small class="text-muted fw-semibold">Ciao,</small>
        <h4 class="fw-bold text-dark m-0">{{ userLabel }}</h4>
      </div>
      <button
        class="shadow-sm rounded-circle p-2 bg-white text-primary border-0"
        type="button"
        @click="toggleAccountMenu"
      >
        <i class="bi bi-person-fill fs-4"></i>
      </button>
    </div>

    <!-- piccolo menu mobile (riuso lo stesso stato) -->
    <div
      v-if="isLoggedIn && showAccountMenu"
      class="d-lg-none px-3 mb-3"
    >
      <div class="card shadow-sm">
        <div class="card-body py-2">
          <div class="small text-muted">
            Collegato come
          </div>
          <div class="fw-semibold mb-2">{{ userLabel }}</div>
          <button
            class="btn btn-outline-danger btn-sm w-100"
            type="button"
            @click="logout"
          >
            <i class="bi bi-box-arrow-right me-1"></i>
            Esci / cambia utente
          </button>
        </div>
      </div>
    </div>

    <!-- QUI IL ROUTER MOSTRA LA PAGINA -->
    <RouterView />
    
  </div>

  <!-- NAVBAR MOBILE IN BASSO -->
  <div class="bottom-nav d-lg-none">
    <div class="nav-item" :class="{ active: route.name === 'dashboard' }" @click="vaiA('/')">
      <i class="bi bi-grid-1x2-fill"></i>
      <span>Dash</span>
    </div>

    <div class="nav-item" :class="{ active: route.name === 'movimenti' }" @click="vaiA('/movimenti')">
      <i class="bi bi-receipt"></i>
      <span>Mov</span>
    </div>

    <div class="nav-item" :class="{ active: route.name === 'storico' }" @click="vaiA('/storico')">
      <i class="bi bi-search"></i>
      <span>Storico</span>
    </div>
    <div class="nav-item" :class="{ active: route.name === 'check' }" @click="vaiA('/check')">
      <i class="bi bi-check-circle-fill"></i>
      <span>Check</span>
    </div>
    <div class="nav-item-fab" @click="apriNuovo">
      <i class="bi bi-plus-lg"></i>
    </div>

    <div class="nav-item" :class="{ active: route.name === 'importa' }" @click="vaiA('/importa')">
      <i class="bi bi-cloud-arrow-up-fill"></i>
      <span>Importa</span>
    </div>
    
    <div class="nav-item" :class="{ active: route.name === 'config' }" @click="vaiA('/config')">
      <i class="bi bi-gear"></i>
      <span>Config</span>
    </div>
  </div>

  <!-- MODALE NUOVO MOVIMENTO -->
  <NuovoMovimento @saved="refreshData" />
</template>
