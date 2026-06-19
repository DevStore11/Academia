// assets/js/login.js

import { auth, db } from "./firebaseConfig.js";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const provedorGoogle = new GoogleAuthProvider();

// =========================
// HELPER — pega nome ou username
// =========================
function getNome(dados) {
  return dados.nome || dados.username || "";
}

// =========================
// VERIFICAR SESSÃO EXISTENTE (auth state)
// =========================
function verificarSessaoExistente() {
  // Se já há user_id guardado e estamos na página de login, não redirecionar
  // automaticamente — deixar o Firebase Auth resolver via onAuthStateChanged
  onAuthStateChanged(auth, async (user) => {
    // Só redireciona se vier de um login Google (flag na sessionStorage)
    const pendingGoogle = sessionStorage.getItem("pending_google_login");
    if (!user || !pendingGoogle) return;

    sessionStorage.removeItem("pending_google_login");
    mostrarCarregando(true);

    try {
      const { email } = user;
      const usuariosRef = collection(db, "usuarios");
      const q = query(usuariosRef, where("email", "==", email));
      const snap = await getDocs(q);

      if (snap.empty) {
        mostrarMensagem("Email não registado no sistema. Faça o cadastro primeiro.", "erro");
        mostrarCarregando(false);
        return;
      }

      const dadosUsuario = snap.docs[0].data();
      const idUsuario = snap.docs[0].id;

      guardarSessao(idUsuario, dadosUsuario);
      redirecionar(dadosUsuario.role);

    } catch (erro) {
      console.error("Erro ao verificar conta Google:", erro);
      mostrarMensagem("Erro ao verificar conta. Tente novamente.", "erro");
      mostrarCarregando(false);
    }
  });
}

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

  mostrarCarregando(true);

  try {
    let dadosUsuario;
    let idUsuario;

    // =========================
    // LOGIN POR EMAIL (v2.0)
    // =========================
    if (identificacao.includes("@")) {
      const credencial = await signInWithEmailAndPassword(auth, identificacao, senha);
      const uid = credencial.user.uid;

      const docRef = doc(db, "usuarios", uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        mostrarMensagem("Conta não encontrada no sistema. Contacte o admin.", "erro");
        mostrarCarregando(false);
        return;
      }

      dadosUsuario = docSnap.data();
      idUsuario = uid;
    }

    // =========================
    // LOGIN POR NOME / USERNAME
    // =========================
    else {
      const usuariosRef = collection(db, "usuarios");

      let snap = await getDocs(query(usuariosRef, where("nome", "==", identificacao)));
      if (snap.empty) {
        snap = await getDocs(query(usuariosRef, where("username", "==", identificacao)));
      }

      if (snap.empty) {
        mostrarMensagem("Nome do clube ou senha incorrectos", "erro");
        mostrarCarregando(false);
        return;
      }

      const docUsuario = snap.docs[0];
      dadosUsuario = docUsuario.data();
      idUsuario = docUsuario.id;

      // v1.0 — sem email, compara senha no Firestore
      if (!dadosUsuario.email) {
        if (!dadosUsuario.senha || dadosUsuario.senha !== senha) {
          mostrarMensagem("Nome do clube ou senha incorrectos", "erro");
          mostrarCarregando(false);
          return;
        }
      }
      // v2.0 — tem email, autentica via Firebase Auth
      else {
        try {
          await signInWithEmailAndPassword(auth, dadosUsuario.email, senha);
        } catch (erroAuth) {
          if (
            erroAuth.code === "auth/wrong-password" ||
            erroAuth.code === "auth/invalid-credential"
          ) {
            mostrarMensagem("Nome do clube ou senha incorrectos", "erro");
          } else {
            mostrarMensagem("Erro ao autenticar. Tente novamente.", "erro");
          }
          mostrarCarregando(false);
          return;
        }
      }
    }

    // =========================
    // VALIDAÇÃO FINAL
    // =========================
    if (!getNome(dadosUsuario) || !dadosUsuario.role) {
      mostrarMensagem("Conta incompleta. Contacte o admin.", "erro");
      mostrarCarregando(false);
      return;
    }

    guardarSessao(idUsuario, dadosUsuario);
    redirecionar(dadosUsuario.role);

  } catch (erro) {
    console.error("Erro no login:", erro);
    mostrarCarregando(false);

    if (erro.code === "auth/wrong-password" || erro.code === "auth/invalid-credential") {
      mostrarMensagem("Senha incorrecta", "erro");
    } else if (erro.code === "auth/user-not-found") {
      mostrarMensagem("Conta não encontrada", "erro");
    } else if (erro.code === "auth/network-request-failed") {
      mostrarMensagem("Erro de rede. Verifique a conexão.", "erro");
    } else {
      mostrarMensagem("Erro ao efectuar login", "erro");
    }
  }
}

// =========================
// LOGIN COM GOOGLE (popup — mais fiável que redirect)
// =========================
async function loginComGoogle() {
  mostrarCarregando(true);

  try {
    const resultado = await signInWithPopup(auth, provedorGoogle);
    const { email } = resultado.user;

    const usuariosRef = collection(db, "usuarios");
    const q = query(usuariosRef, where("email", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      mostrarMensagem("Email não registado no sistema. Faça o cadastro primeiro.", "erro");
      mostrarCarregando(false);
      return;
    }

    const dadosUsuario = snap.docs[0].data();
    const idUsuario = snap.docs[0].id;

    guardarSessao(idUsuario, dadosUsuario);
    redirecionar(dadosUsuario.role);

  } catch (erro) {
    console.error("Erro login Google:", erro);
    mostrarCarregando(false);

    if (erro.code === "auth/popup-blocked") {
      // Fallback para redirect se popup bloqueado
      mostrarMensagem("Popup bloqueado. A redirecionar...", "info");
      sessionStorage.setItem("pending_google_login", "1");
      const { signInWithRedirect } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js");
      await signInWithRedirect(auth, provedorGoogle);
    } else if (erro.code === "auth/popup-closed-by-user") {
      mostrarMensagem("Login cancelado.", "erro");
    } else if (erro.code === "auth/unauthorized-domain") {
      mostrarMensagem("Domínio não autorizado. Contacte o admin.", "erro");
    } else {
      mostrarMensagem("Falha no login com Google.", "erro");
    }
  }
}

// =========================
// FUNÇÕES AUXILIARES
// =========================
function guardarSessao(id, dados) {
  localStorage.setItem("user_id", id);
  localStorage.setItem("nome", getNome(dados));
  localStorage.setItem("role", dados.role);
  localStorage.setItem("tipoConta", dados.tipoConta || "");
}

function redirecionar(role) {
  if (role === "admin") {
    window.location.href = "../pages/dashboard-admin.html";
  } else if (role === "funcionario") {
    window.location.href = "../pages/dashboard-funcionario.html";
  } else if(role==="organizer"){
    window.location.href="../pages/eventos.html";

  } else if (role === "playoff") {
    window.location.href = "../pages/dashboard-playoffs.html";
  } else {
    window.location.href = "../pages/dashboard.html";
  }
}

function mostrarMensagem(texto, tipo) {
  const msg = document.getElementById("mensagemLogin");
  if (!msg) return;
  msg.style.display = "block";
  msg.textContent = texto;
  msg.className = `message-box ${tipo}`;
}

function mostrarCarregando(estado) {
  const btn = document.getElementById("btnGoogle");
  const btnSubmit = document.querySelector("#formularioLogin button[type='submit']");
  if (btn) btn.disabled = estado;
  if (btnSubmit) btnSubmit.disabled = estado;
}

// =========================
// EVENTOS
// =========================
document.addEventListener("DOMContentLoaded", () => {
  // Verificar se voltou de um redirect Google
  verificarSessaoExistente();

  const formLogin = document.getElementById("formularioLogin");
  const btnGoogle = document.getElementById("btnGoogle");
  const toggleSenha = document.getElementById("toggleSenha");
  const senhaInput = document.getElementById("senhaLogin");

  if (formLogin) formLogin.addEventListener("submit", efectuarLogin);
  if (btnGoogle) btnGoogle.addEventListener("click", loginComGoogle);

  if (toggleSenha && senhaInput) {
    toggleSenha.addEventListener("click", () => {
      senhaInput.type = senhaInput.type === "password" ? "text" : "password";
      toggleSenha.innerHTML = senhaInput.type === "password"
        ? '<i class="fas fa-eye"></i>'
        : '<i class="fas fa-eye-slash"></i>';
    });
  }
});