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
const oauthLoading = ref(false);

const passwordFieldType = computed(() =>
  showPassword.value ? "text" : "password"
);

const handleLogin = async () => {
  loading.value = true;
  errorMsg.value = "";

  // 1. DEBUG: Vediamo cosa stiamo inviando
  console.log("Tentativo login con:", email.value, password.value);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    // 2. DEBUG: Se c'è errore, stampalo tutto
    if (error) {
      console.error("ERRORE SUPABASE DETTAGLIATO:", error);
      // Spesso l'errore è "Email not confirmed"
      throw error;
    }

    console.log("Login riuscito:", data);

    if (data?.session) {
      router.push({ name: "dashboard" });
    }
  } catch (error) {
    // Mostra il messaggio vero invece di uno generico
    console.error(error);

    if (error.message === "Email not confirmed") {
      errorMsg.value = "Devi confermare la tua email prima di accedere!";
    } else if (error.message === "Invalid login credentials") {
      errorMsg.value = "Email o password errati.";
    } else {
      errorMsg.value = "Errore: " + error.message;
    }
  } finally {
    loading.value = false;
  }
};

const handleOAuthLogin = async (provider) => {
  try {
    oauthLoading.value = true;
    errorMsg.value = "";

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Errore OAuth", error);
    errorMsg.value = "Accesso social non riuscito. Riprova.";
  } finally {
    oauthLoading.value = false;
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
          <button
            type="button"
            class="btn social-btn google"
            :disabled="oauthLoading"
            @click="handleOAuthLogin('google')"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
            />
            {{ oauthLoading ? "Attendi..." : "Google" }}
          </button>
          <button
            type="button"
            class="btn social-btn github"
            :disabled="oauthLoading"
            @click="handleOAuthLogin('github')"
          >
            <i class="bi bi-github"></i>
            {{ oauthLoading ? "Attendi..." : "GitHub" }}
          </button>
          <button
            type="button"
            class="btn social-btn linkedin"
            :disabled="oauthLoading"
            @click="handleOAuthLogin('linkedin')"
          >
            <i class="bi bi-linkedin"></i>
            {{ oauthLoading ? "Attendi..." : "LinkedIn" }}
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

/* Input: spazio per lucchetto a sinistra e occhio a destra */
.input-wrapper .form-control {
  padding-left: 38px; /* spazio per l'icona lock */
  padding-right: 40px; /* spazio per l'occhio */
}

.input-wrapper .form-control:focus {
  border-color: #6366f1;
  background-color: #fff;
  box-shadow: none;
}
/* Icona lucchetto a sinistra, dentro il campo */
.input-wrapper > .bi-lock {
  position: absolute;
  left: 12px;
  font-size: 16px;
  pointer-events: none;
  color: #6b7280;
}
.password-wrapper {
  gap: 0.5rem;
}

/* Bottone occhio a destra, centrato verticalmente e cliccabile */
.toggle-password {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  padding: 0;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.toggle-password i {
  font-size: 18px;
  color: #6b7280;
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
