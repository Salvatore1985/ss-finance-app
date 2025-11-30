<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  try {
    loading.value = true
    errorMsg.value = ''
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) throw error

    // Se login ok, vai alla dashboard
    router.push('/')
    
  } catch (error) {
    errorMsg.value = "Email o password errati."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container vh-100 d-flex align-items-center justify-content-center">
    <div class="card border-0 shadow-lg p-4" style="max-width: 400px; width: 100%;">
      
      <div class="text-center mb-4">
        <div class="bg-primary text-white rounded-circle d-inline-flex p-3 mb-3">
          <i class="bi bi-wallet-fill fs-1"></i>
        </div>
        <h3 class="fw-bold text-dark">S.S. Finance</h3>
        <p class="text-muted">Accedi per gestire le spese</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="mb-3">
          <label class="fw-bold small text-muted">Email</label>
          <input v-model="email" type="email" class="form-control" placeholder="nome@esempio.com" required>
        </div>
        
        <div class="mb-4">
          <label class="fw-bold small text-muted">Password</label>
          <input v-model="password" type="password" class="form-control" placeholder="••••••••" required>
        </div>

        <div v-if="errorMsg" class="alert alert-danger small py-2">
          {{ errorMsg }}
        </div>

        <button :disabled="loading" class="btn btn-primary w-100 fw-bold py-2 shadow-sm">
          {{ loading ? 'Accesso in corso...' : 'Accedi' }}
        </button>
      </form>
    </div>
  </div>
</template>