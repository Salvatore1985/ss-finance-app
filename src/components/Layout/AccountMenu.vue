<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/supabase"; // usa '@/...' come negli altri file␊

const router = useRouter();

const showMenu = ref(false);
const profileName = ref(""); // es. "Salvo" / "Sigi"
const avatarLetter = ref("U"); // lettera dentro il cerchio
const loadingProfile = ref(false);
const menuRef = ref(null);
let authSubscription = null;

const computeLetter = (name, email) => {
  if (name && name.trim().length) {
    return name.trim().charAt(0).toUpperCase();
  }
  if (email && email.length) {
    return email.trim().charAt(0).toUpperCase();
  }
  return "U";
};

const resetProfile = () => {
  profileName.value = "";
  avatarLetter.value = "U";
};

const loadProfile = async () => {
  loadingProfile.value = true;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      resetProfile();
      return;
    }

    // Prendo il profilo dalla tabella "profili"
    const { data: profili, error: profError } = await supabase
      .from("profili")
      .select("id, nome")
      .eq("id", user.id) // id di auth = id della tabella profili
      .limit(1);

    if (!profError && profili && profili.length) {
      profileName.value = profili[0].nome || "";
    } else {
      profileName.value = "";
    }

    avatarLetter.value = computeLetter(profileName.value, user.email);
  } catch (e) {
    console.error("Errore caricamento profilo", e);
    resetProfile();
  } finally {
    loadingProfile.value = false;
  }
};

const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

const handleClickOutside = (event) => {
  if (!menuRef.value) return;
  if (!menuRef.value.contains(event.target)) {
    showMenu.value = false;
  }
};

const logout = async () => {
  await supabase.auth.signOut();
  showMenu.value = false;
  resetProfile();
  // Torno alla pagina di login
  router.push({ name: "login" });
};

onMounted(() => {
  loadProfile();

  const { data } = supabase.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") {
      resetProfile();
      return;
    }

    // SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED → aggiorno l'avatar
    await loadProfile();
  });

  authSubscription = data?.subscription;
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  authSubscription?.unsubscribe?.();
});
</script>

<template>
  <div ref="menuRef" class="account-menu-wrapper">
    <!-- Avatar -->
    <button
      type="button"
      class="avatar-circle"
      @click.stop="toggleMenu"
      :title="profileName || 'Account'"
    >
      <span v-if="!loadingProfile">{{ avatarLetter }}</span>
      <span v-else class="spinner-border spinner-border-sm"></span>
    </button>

    <!-- Dropdown -->
    <div v-if="showMenu" class="account-dropdown shadow-sm">
      <div class="px-3 py-2 border-bottom">
        <div class="small text-muted">Profilo attivo</div>
        <div class="fw-semibold">
          {{ profileName || "—" }}
        </div>
      </div>

      <button
        type="button"
        class="dropdown-item d-flex align-items-center gap-2 py-2"
        @click="logout"
      >
        <i class="bi bi-box-arrow-right"></i>
        <span>Esci / Cambia utente</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.account-menu-wrapper {
  position: relative;
  display: inline-block;
}

/* Cerchio blu uguale ovunque, non tocchiamo il layout del resto */
.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: none;
  background: #4f46e5;
  color: #ffffff;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
}

.avatar-circle:focus {
  outline: none;
  box-shadow: 0 0 0 2px #e0e7ff;
}

.account-dropdown {
  position: absolute;
  right: 0;
  margin-top: 8px;
  min-width: 220px;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  z-index: 1200;
}
</style>
