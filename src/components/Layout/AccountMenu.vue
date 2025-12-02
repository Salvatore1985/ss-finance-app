<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'

const router = useRouter()

const userEmail = ref('')
const showMenu = ref(false)

const fetchUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (!error && data.user) {
    userEmail.value = data.user.email
  } else {
    userEmail.value = ''
  }
}

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const logout = async () => {
  await supabase.auth.signOut()
  userEmail.value = ''
  showMenu.value = false
  router.push('/login')
}

onMounted(() => {
  fetchUser()
})
</script>

<template>
  <div class="position-relative" @blur="closeMenu">
    <!-- Icona account -->
    <button
      type="button"
      class="btn btn-outline-light d-flex align-items-center gap-2"
      @click.stop="toggleMenu"
    >
      <i class="bi bi-person-circle fs-5"></i>
      <span v-if="userEmail" class="d-none d-sm-inline">
        {{ userEmail }}
      </span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="showMenu"
      class="dropdown-menu dropdown-menu-end show mt-2 shadow"
      style="min-width: 220px; right: 0; left: auto;"
    >
      <div class="px-3 py-2 small text-muted">
        Accesso come<br />
        <strong>{{ userEmail || 'Sconosciuto' }}</strong>
      </div>
      <div class="dropdown-divider"></div>
      <button class="dropdown-item d-flex align-items-center gap-2" @click="logout">
        <i class="bi bi-box-arrow-right"></i>
        <span>Esci / Cambia utente</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.dropdown-menu {
  background-color: #ffffff;
  border-radius: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
}
</style>
