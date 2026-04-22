// assets/js/login.js

import { auth, db } from "./firebaseConfig.js";

import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider
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
// VERIFICAR RESULTADO DO REDIRECT DO GOOGLE
// =========================
async function verificarRedirectGoogle() {
  try {
    const resultado = await getRedirectResult(auth);
    if (!resultado) return;

    const { email } = resultado.user;

    // Procura no Firestore pelo email
    const usuariosRef = collection(db, "usuarios");
    const q = query(usuariosRef, where("email", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      mostrarMensagem("Email não registado no sistema. Faça o cadastro primeiro.", "erro");
      return;
    }

    const dadosUsuario = snap.docs[0].data();
    const idUsuario = snap.docs[0].id;

    guardarSessao(idUsuario, dadosUsuario);
    redirecionar(dadosUsuario.role);

  } catch (erro) {
    console.error("Erro redirect Google:", erro);
    if (erro.code === "auth/unauthorized-domain") {
      mostrarMensagem("Domínio não autorizado. Contacte o admin.", "erro");
    } else {
      mostrarMensagem("Falha no login com Google.", "erro");
    }
  }
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

      // Procura por nome primeiro, depois por username
      let snap = await getDocs(query(usuariosRef, where("nome", "==", identificacao)));
      if (snap.empty) {
        snap = await getDocs(query(usuariosRef, where("username", "==", identificacao)));
      }

      if (snap.empty) {
        mostrarMensagem("Nome do clube ou senha incorrectos", "erro");
        return;
      }

      const docUsuario = snap.docs[0];
      dadosUsuario = docUsuario.data();
      idUsuario = docUsuario.id;

      // v1.0 — sem email, compara senha no Firestore
      if (!dadosUsuario.email) {
        if (!dadosUsuario.senha || dadosUsuario.senha !== senha) {
          mostrarMensagem("Nome do clube ou senha incorrectos", "erro");
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
          return;
        }
      }
    }

    // =========================
    // VALIDAÇÃO FINAL
    // =========================
    if (!getNome(dadosUsuario) || !dadosUsuario.role) {
      mostrarMensagem("Conta incompleta. Contacte o admin.", "erro");
      return;
    }

    guardarSessao(idUsuario, dadosUsuario);
    redirecionar(dadosUsuario.role);

  } catch (erro) {
    console.error("Erro no login:", erro);

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
// LOGIN COM GOOGLE (redirect)
// =========================
async function loginComGoogle() {
  try {
    await signInWithRedirect(auth, provedorGoogle);
  } catch (erro) {
    console.error("Erro ao iniciar login Google:", erro);
    mostrarMensagem("Falha ao iniciar login com Google.", "erro");
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
  verificarRedirectGoogle();

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