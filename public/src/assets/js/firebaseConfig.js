// ========================
// Configuração Firebase
// ========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Config do teu projeto
const firebaseConfig = {
  apiKey: "AIzaSyBvJs40C5p-wt11zrWUtsyyIDf5GJ2XtFo",
  authDomain: "cokplay-376c3.firebaseapp.com",
  projectId: "cokplay-376c3",
  storageBucket: "cokplay-376c3.firebasestorage.app",
  messagingSenderId: "157159786165",
  appId: "1:157159786165:web:13d8cf7f99e3864f4c20fc",
  measurementId: "G-ZMR17K0VNZ"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);