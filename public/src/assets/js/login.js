import { auth, db } from "./firebaseConfig.js";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const provedorGoogle = new GoogleAuthProvider();

// =========================
// FUNÇÃO PRINCIPAL DE LOGIN
// =========================
async function efectuarLogin(evento) {
  evento.preventDefault();

  const identificacao = document.getElementById("identificacaoLogin").value.trim();
  const senha = document.getElementById("senhaLogin").value.trim();

  if (!identificacao || !senha) {
    mostrarMensagem("Preencha todos os campos", "erro");
    return;
  }

  try {
    // =========================
    // LOGIN HARDCODED
    // =========================
    if (identificacao === "admin" && senha === "1234567") {
      guardarSessao("admin", { nome: "Administrador", role: "admin", tipoConta: "hardcoded" });
      redirecionar("admin");
      return;
    }

    if (identificacao === "funcionario" && senha === "12345") {
      guardarSessao("funcionario", { nome: "Funcionário", role: "funcionario", tipoConta: "hardcoded" });
      redirecionar("funcionario");
      return;
    }

    let dadosUsuario;
    let idUsuario;

    // =========================
    // LOGIN POR EMAIL
    // =========================
    if (identificacao.includes("@")) {
      // 1️⃣ Auth confirma identidade
      const credencial = await signInWithEmailAndPassword(auth, identificacao, senha);
      const uid = credencial.user.uid;

      // 2️⃣ Firestore confirma utilizador
      const docRef = doc(db, "usuarios", uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        mostrarMensagem("Conta não encontrada no sistema. Contacte o admin.", "erro");
        return;
      }

      dadosUsuario = docSnap.data();
      idUsuario = uid;
    }

    // =========================
    // LOGIN POR NOME (CLUBE)
    // =========================
    else {
      const q = query(
        collection(db, "usuarios"),
        where("nome", "==", identificacao)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        mostrarMensagem("Nome do clube ou senha incorrectos", "erro");
        return;
      }

      const docUsuario = snap.docs[0];
      dadosUsuario = docUsuario.data();
      idUsuario = docUsuario.id;

      if (!dadosUsuario.senha || dadosUsuario.senha !== senha) {
        mostrarMensagem("Nome do clube ou senha incorrectos", "erro");
        return;
      }
    }

    // =========================
    // VALIDAÇÃO FINAL
    // =========================
    if (!dadosUsuario.nome || !dadosUsuario.role) {
      mostrarMensagem("Conta incompleta. Contacte o admin.", "erro");
      return;
    }

    guardarSessao(idUsuario, dadosUsuario);
    redirecionar(dadosUsuario.role);

  } catch (erro) {
    console.error("Erro no login:", erro);

    if (erro.code === "auth/wrong-password") {
      mostrarMensagem("Senha incorrecta", "erro");
    } else if (erro.code === "auth/user-not-found") {
      mostrarMensagem("Conta não encontrada", "erro");
    } else {
      mostrarMensagem("Erro ao efectuar login", "erro");
    }
  }
}

// =========================
// LOGIN COM GOOGLE
// =========================
async function loginComGoogle() {
  try {
    const resultado = await signInWithPopup(auth, provedorGoogle);
    const { uid, email } = resultado.user;

    const docRef = doc(db, "usuarios", uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      mostrarMensagem("Conta Google sem cadastro no sistema", "erro");
      return;
    }

    const dadosUsuario = docSnap.data();

    if (!dadosUsuario.nome) {
      mostrarMensagem("Conta incompleta. Contacte o admin.", "erro");
      return;
    }

    guardarSessao(uid, dadosUsuario);
    redirecionar(dadosUsuario.role);

  } catch (erro) {
    console.error("Erro Google:", erro);
    mostrarMensagem("Falha no login com Google", "erro");
  }
}

// =========================
// FUNÇÕES AUXILIARES
// =========================
function guardarSessao(id, dados) {
  localStorage.setItem("user_id", id);
  localStorage.setItem("nome", dados.nome);
  localStorage.setItem("role", dados.role);
  localStorage.setItem("tipoConta", dados.tipoConta || "");
}

function redirecionar(role) {
  if (role === "admin") {
    window.location.href = "../pages/dashboard-admin.html";
  } else if (role === "funcionario") {
    window.location.href = "../pages/dashboard-funcionario.html";
  } else {
    window.location.href = "../pages/dashboard.html";
  }
}

function mostrarMensagem(texto, tipo) {
  const msg = document.getElementById("mensagemLogin");
  msg.style.display = "block";
  msg.textContent = texto;
  msg.className = `message-box ${tipo}`;
}

// =========================
// EVENTOS
// =========================
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("formularioLogin")
    .addEventListener("submit", efectuarLogin);

  document
    .getElementById("btnGoogle")
    ?.addEventListener("click", loginComGoogle);
});
document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formularioLogin");
  const btnGoogle = document.getElementById("btnGoogle");

  if (formLogin) formLogin.addEventListener("submit", efectuarLogin);
  if (btnGoogle) btnGoogle.addEventListener("click", loginComGoogle);

  const toggleSenha = document.getElementById("toggleSenha");
  const senhaInput = document.getElementById("senhaLogin");
  if (toggleSenha && senhaInput) {
    toggleSenha.addEventListener("click", () => {
      senhaInput.type = senhaInput.type === "password" ? "text" : "password";
      toggleSenha.innerHTML = senhaInput.type === "password" 
        ? '<i class="fas fa-eye"></i>' 
        : '<i class="fas fa-eye-slash"></i>';
    });
  }
});