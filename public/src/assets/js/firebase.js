// assets/js/firebase.js

// Importar módulos do Firebase (versão 12.3.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Configuração do teu projeto Firebase
const configuracaoFirebase = {
  apiKey: "AIzaSyDjYME4-b9rr29K08A2tCn-pa4zzi5-n5c",
  authDomain: "mozfifa.firebaseapp.com",
  projectId: "mozfifa",
  storageBucket: "mozfifa.firebasestorage.app",
  messagingSenderId: "1022999961168",
  appId: "1:1022999961168:web:b30a235051d21ae8fe3b55"
};

// Inicializar Firebase
const app = initializeApp(configuracaoFirebase);

// Conexão com Firestore
const db = getFirestore(app);

// Conexão com Auth
const auth = getAuth(app);

// Exportar tudo para usar em outros scripts
export { app, auth, db };
