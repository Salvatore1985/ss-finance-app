<script setup>
import { ref, computed } from "vue";
import { supabase } from "../supabase";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const rememberMe = ref(false);
const loading = ref(false);
const errorMsg = ref("");

const passwordFieldType = computed(() =>
  showPassword.value ? "text" : "password"
);

const handleLogin = async () => {
  try {
    loading.value = true;
    errorMsg.value = "";

    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    router.push("/");
  } catch (error) {
    errorMsg.value = "Email o password errati.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="auth-card shadow-lg">
      <div class="auth-header text-center">
        <h2>Login</h2>
        <p class="text-muted">Accedi per gestire le tue finanze</p>
      </div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">Username o Email</label>
          <div class="input-wrapper">
            <i class="bi bi-person"></i>
            <input
              v-model="email"
              type="email"
              class="form-control"
              placeholder="Inserisci email"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <div class="input-wrapper password-wrapper">
            <i class="bi bi-lock"></i>
            <input
              v-model="password"
              :type="passwordFieldType"
              class="form-control"
              placeholder="Inserisci password"
              required
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'bi bi-eye' : 'bi bi-eye-slash'"></i>
            </button>
          </div>
        </div>

        <div class="form-options">
          <label class="remember-me">
            <input v-model="rememberMe" type="checkbox" />
            <span>Ricordami</span>
          </label>
          <a class="link-primary" href="#">Password dimenticata?</a>
        </div>

        <div v-if="errorMsg" class="alert alert-danger small py-2">
          {{ errorMsg }}
        </div>

        <button
          :disabled="loading"
          class="btn btn-primary w-100 submit-btn"
          type="submit"
        >
          {{ loading ? "Accesso in corso..." : "Login" }}
        </button>

        <p class="signup-text">
          Non hai un account?
          <a class="link-primary" href="#">Registrati</a>
        </p>

        <div class="divider">
          <span>Oppure continua con</span>
        </div>

        <div class="social-buttons">
          <button type="button" class="btn social-btn google">
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
            />
            Google
          </button>
          <button type="button" class="btn social-btn github">
            <i class="bi bi-github"></i> GitHub
          </button>
          <button type="button" class="btn social-btn linkedin">
            <i class="bi bi-linkedin"></i> LinkedIn
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #e0e7ff, #f7f7ff);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 18px;
  padding: 2.5rem 2rem;
  border: 1px solid #eef1f7;
}

.auth-header h2 {
  font-weight: 700;
  color: #1f2937;
}

.auth-header p {
  margin-bottom: 1.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-weight: 600;
  color: #111827;
  font-size: 0.95rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper i {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  font-size: 1rem;
}

.input-wrapper .form-control {
  padding-left: 40px;
  height: 48px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.input-wrapper .form-control:focus {
  border-color: #6366f1;
  background-color: #fff;
  box-shadow: none;
}

.password-wrapper {
  gap: 0.5rem;
}

.toggle-password {
  position: absolute;
  right: 10px;
  border: none;
  background: transparent;
  color: #6b7280;
  padding: 0.3rem 0.5rem;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
}

.remember-me {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #111827;
  font-weight: 500;
}

.link-primary {
  color: #6366f1;
  font-weight: 600;
  text-decoration: none;
}

.link-primary:hover {
  text-decoration: underline;
}

.submit-btn {
  height: 48px;
  background: #6366f1;
  border: none;
  font-weight: 700;
  border-radius: 12px;
}

.signup-text {
  text-align: center;
  margin: 0.5rem 0 0;
  color: #6b7280;
}

.signup-text .link-primary {
  font-weight: 700;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: #9ca3af;
  font-weight: 600;
  justify-content: center;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.social-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  border-radius: 10px;
  height: 44px;
  font-weight: 600;
}

.social-btn img {
  width: 20px;
  height: 20px;
}

.social-btn.google {
  color: #db4437;
}

.social-btn.github {
  color: #111827;
}

.social-btn.linkedin {
  color: #0a66c2;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 2rem 1.5rem;
  }

  .social-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
