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


    const app  = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db   = getFirestore(app);

    // ======================================
    // 🔑 MUDA ESTA SENHA PARA ALGO SÓ TU SABES
    // ======================================
    const SENHA_ACESSO = "cokplay@admin2025";

    window.verificarAcesso = function () {
      const entrada = document.getElementById("senhaAcesso").value;
      if (entrada === SENHA_ACESSO) {
        document.getElementById("ecraAcesso").style.display = "none";
        document.getElementById("ecraAdmin").style.display  = "block";
      } else {
        document.getElementById("mensagemAcesso").textContent = "❌ Senha incorrecta.";
      }
    };

    document.getElementById("senhaAcesso").addEventListener("keydown", (e) => {
      if (e.key === "Enter") window.verificarAcesso();
    });

    function mostrarMensagem(texto, tipo) {
      const el = document.getElementById("mensagem");
      el.style.display = "block";
      el.textContent = texto;
      el.className = tipo;
    }

    window.registarAdmin = async function () {
      const nome  = document.getElementById("nome").value.trim();
      const email = document.getElementById("email").value.trim();
      const senha = document.getElementById("senha").value;

      if (!nome || !email || !senha) {
        mostrarMensagem("Preencha todos os campos.", "erro");
        return;
      }

      if (senha.length < 6) {
        mostrarMensagem("A senha deve ter no mínimo 6 caracteres.", "erro");
        return;
      }

      try {
        const credencial = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = credencial.user.uid;

        await setDoc(doc(db, "usuarios", uid), {
          uid,
          nome,
          email,
          role: "admin",
          tipoConta: "admin",
          authProvider: "password",
          criadoEm: serverTimestamp()
        });

        mostrarMensagem(`✅ Admin "${nome}" criado com sucesso!`, "sucesso");

        document.getElementById("nome").value  = "";
        document.getElementById("email").value = "";
        document.getElementById("senha").value = "";

      } catch (erro) {
        console.error(erro);
        if (erro.code === "auth/email-already-in-use") {
          mostrarMensagem("Este email já está registado.", "erro");
        } else if (erro.code === "auth/invalid-email") {
          mostrarMensagem("Email inválido.", "erro");
        } else if (erro.code === "auth/weak-password") {
          mostrarMensagem("Senha fraca.", "erro");
        } else {
          mostrarMensagem("Erro: " + erro.message, "erro");
        }
      }
    };
  