// ========================
// Importações Firebase
// ========================
import { db } from "./firebaseConfig.js";
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ========================
// FUNÇÃO DE LOGIN
// ========================
async function login(event) {
  event.preventDefault(); // Evita recarregamento da página

  const nomeClube = document.getElementById("usernameLogin").value.trim();
  const password = document.getElementById("passwordLogin").value.trim();

  if (!nomeClube || !password) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    // ========================
    // LOGIN HARDCODED
    // ========================
    if (nomeClube.toLowerCase() === "poweradmin" && password === "power123") {
      localStorage.setItem("user_id", "admin");
      localStorage.setItem("username", "Administrador");
      localStorage.setItem("role", "admin");
      window.location.href = "dashboard-admin.html";
      return;
    }

    if (nomeClube.trim().toLowerCase() === "funpower" && password === "powerfun12345") {
      localStorage.setItem("user_id", "funcionario");
      localStorage.setItem("username", "Funcionário");
      localStorage.setItem("role", "funcionario");
      window.location.href = "campeonato.html";
      return;
    }

    if (nomeClube.toLowerCase() === "work" && password === "12345") {
      localStorage.setItem("user_id", "funcionario");
      localStorage.setItem("username", "Funcionário");
      localStorage.setItem("role", "funcionario");
      window.location.href = "dash-funcionario.html";
      return;
    }

    // ========================
    // CONSULTA FIRESTORE
    // ========================
    const q = query(
      collection(db, "usuarios"),
      where("username", "==", nomeClube),
      where("password", "==", password)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("Nome do clube ou senha incorretos!");
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // ========================
    // LOGIN POR ROLE
    // ========================
    localStorage.setItem("user_id", userDoc.id);
    localStorage.setItem("username", userData.username);
    localStorage.setItem("role", userData.role);

    if (userData.role === "admin") window.location.href = "dashboard-admin.html";
    else if (userData.role === "funcionario") window.location.href = "CapAdmin.html";
    else window.location.href = "dashboard.html";

  } catch (err) {
    console.error("Erro ao logar:", err);
    alert(`Erro ao efetuar login: ${err.message}`);
  }
}

// ========================
// LIGAÇÃO AO FORMULÁRIO
// ========================
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", login);
});
