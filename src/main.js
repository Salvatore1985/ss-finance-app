// src/main.js
import './assets/main.css'

// Importa Bootstrap CSS e Icone
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Importa il tuo CSS personalizzato (se ne hai uno, es. assets/base.css)
import './assets/base.css' 
import './assets/main.css'

const app = createApp(App)
app.use(router)

app.mount('#app')