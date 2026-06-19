// assets/js/cadastro.js

import { auth, db } from "./firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  deleteUser
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ===============================
// ELEMENTOS
// ===============================
const formularioCadastro = document.getElementById("cadastroForm");
const mensagem = document.getElementById("mensagem");

const inputNomeClube = document.getElementById("nomeClube");
const inputEmail = document.getElementById("email");
const inputIdade = document.getElementById("idade");
const inputBairro = document.getElementById("bairro");
const inputSenha = document.getElementById("senha");
const checkboxTermos = document.getElementById("termos");

// ===============================
// FUNÇÃO DE MENSAGEM
// ===============================
function mostrarMensagem(texto, tipo = "erro") {
  mensagem.style.display = "block";
  mensagem.textContent = texto;
  mensagem.className = `mensagem ${tipo}`;
}

// ===============================
// FUNÇÃO PRINCIPAL DE CADASTRO
// ===============================
formularioCadastro.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nomeClube = inputNomeClube.value.trim();
  const email = inputEmail.value.trim();
  const idade = Number(inputIdade.value);
  const bairro = inputBairro.value.trim();
  const senha = inputSenha.value;

  // ===============================
  // VALIDAÇÕES
  // ===============================
  if (!nomeClube || !email || !senha || !bairro) {
    mostrarMensagem("Preencha todos os campos obrigatórios.");
    return;
  }

  if (!email.includes("@")) {
    mostrarMensagem("Email inválido.");
    return;
  }

  if (senha.length < 6) {
    mostrarMensagem("A senha deve ter no mínimo 6 caracteres.");
    return;
  }

  if (!checkboxTermos.checked) {
    mostrarMensagem("Deves aceitar os termos.");
    return;
  }

  if (!idade || idade < 9) {
    mostrarMensagem("Idade mínima é 9 anos.");
    return;
  }

  try {
    // ===============================
    // VERIFICAR SE O EMAIL JÁ ESTÁ REGISTADO NO AUTH
    // ===============================
    const metodos = await fetchSignInMethodsForEmail(auth, email);
    if (metodos.length > 0) {
      mostrarMensagem("Este email já está registrado! Faça login.", "erro");
      return;
    }

    // ===============================
    // CRIAR UTILIZADOR NO AUTH
    // ===============================
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    const uid = credencial.user.uid;

    try {
      // ===============================
      // CRIAR REGISTRO NO FIRESTORE
      // ===============================
      await setDoc(doc(db, "usuarios", uid), {
        uid,
        nome: nomeClube,
        email,
        idade,
        bairro,
        role: "usuario",
        tipoConta: "moderno",
        authProvider: "password",
        criadoEm: serverTimestamp()
      });

      mostrarMensagem("Conta criada com sucesso!", "sucesso");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);

    } catch (erroFirestore) {
      // ===============================
      // SE FIRESTORE FALHAR, DELETAR UTILIZADOR DO AUTH
      // ===============================
      await deleteUser(credencial.user);
      console.error("Erro ao salvar no Firestore. Auth removido:", erroFirestore);
      mostrarMensagem("Erro ao criar conta. Tente novamente.", "erro");
    }

  } catch (erro) {
    console.error("Erro no cadastro:", erro);

    if (erro.code === "auth/email-already-in-use") {
      mostrarMensagem("Este email já existe. Faça login.", "erro");
    } else if (erro.code === "auth/weak-password") {
      mostrarMensagem("Senha fraca. Use no mínimo 6 caracteres.", "erro");
    } else if (erro.code === "auth/invalid-email") {
      mostrarMensagem("Email inválido.", "erro");
    } else if (erro.code === "auth/network-request-failed") {
      mostrarMensagem("Erro de rede. Verifique a conexão.", "erro");
    } else {
      mostrarMensagem("Erro ao criar conta. Tente novamente.", "erro");
    }
  }
});

// ===============================
// MOSTRAR / OCULTAR SENHA
// ===============================
const botaoToggleSenha = document.getElementById("toggleSenha");

if (botaoToggleSenha) {
  botaoToggleSenha.addEventListener("click", () => {
    if (inputSenha.type === "password") {
      inputSenha.type = "text";
      botaoToggleSenha.innerHTML = `<i class="fas fa-eye-slash"></i>`;
    } else {
      inputSenha.type = "password";
      botaoToggleSenha.innerHTML = `<i class="fas fa-eye"></i>`;
    }
  });
}