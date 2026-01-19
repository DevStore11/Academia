// ========================
// Importação Firebase
// ========================
import { db } from "./firebaseConfig.js";
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ========================
// FUNÇÃO DE CADASTRO
// ========================
export async function cadastrar() {
  const nomeClube = document.getElementById("usernameCadastro").value.trim();
  const password = document.getElementById("passwordCadastro").value.trim();
  const mensagem = document.getElementById("mensagemCadastro");

  // Limpar mensagens anteriores
  mensagem.innerText = "";
  mensagem.style.display = "none";

  // ========================
  // Validação dos campos
  // ========================
  if (!nomeClube || !password) {
    mensagem.innerText = "Por favor, preencha todos os campos.";
    mensagem.style.display = "block";
    mensagem.style.color = "#e53935"; // vermelho suave
    return;
  }

  // Regex para senha segura: mínimo 6 caracteres, 1 maiúscula, 1 minúscula, 1 número
  const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  if (!senhaRegex.test(password)) {
    mensagem.innerText = "A senha precisa ter pelo menos 6 caracteres, incluindo letras maiúsculas, minúsculas e números.";
    mensagem.style.display = "block";
    mensagem.style.color = "#f9a825"; // amarelo suave
    return;
  }

  try {
    // ========================
    // Verificar se já existe um usuário com esse nome
    // ========================
    const q = query(collection(db, "usuarios"), where("username", "==", nomeClube));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      mensagem.innerText = "Nome de clube já está em uso. Escolha outro.";
      mensagem.style.display = "block";
      mensagem.style.color = "#e53935"; // vermelho suave
      return;
    }

    // ========================
    // Criar novo usuário no Firestore
    // ========================
    await addDoc(collection(db, "usuarios"), {
      username: nomeClube,
      password: password,
      role: "clube", // todos que se cadastram são "clube"
    });

    // Mensagem de sucesso
    mensagem.innerText = "Cadastro realizado com sucesso!";
    mensagem.style.display = "block";
    mensagem.style.color = "#43a047"; // verde suave

    // Redireciona depois de 1.5s
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (err) {
    mensagem.innerText = "Erro ao cadastrar: " + err.message;
    mensagem.style.display = "block";
    mensagem.style.color = "#e53935"; // vermelho suave
    console.error(err);
  }
}

// ========================
// Disponibilizar globalmente caso necessário
// ========================
window.cadastrar = cadastrar;
