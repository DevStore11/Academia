import { auth, db } from "./firebase.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Recuperar senha
async function recuperarSenha() {
  const nome = document.getElementById('nomeRecuperar').value.trim();
  const email = document.getElementById('emailRecuperar').value.trim();
  const mensagem = document.getElementById('mensagemRecuperacao');

  if (!nome || !email) {
    mensagem.style.color = 'red';
    mensagem.textContent = "Preencha todos os campos";
    return;
  }

  try {
    // Verificar se o usuário existe na Firestore
    const docRef = doc(db, "usuarios", email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().nome === nome) {
      // Envia email de redefinição via Firebase Auth
      await sendPasswordResetEmail(auth, email);
      mensagem.style.color = 'green';
      mensagem.textContent = "Email de recuperação enviado! Verifique sua caixa de entrada.";

    } else {
      mensagem.style.color = 'red';
      mensagem.textContent = "Nome ou email incorreto.";
    }

  } catch (error) {
    mensagem.style.color = 'red';
    mensagem.textContent = "Erro: " + error.message;
    console.error(error);
  }
}

// Evento do botão
document.getElementById('btnRecuperar').addEventListener('click', recuperarSenha);
