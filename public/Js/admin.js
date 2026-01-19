// ========================
// Importação Firebase
// ========================
import { db } from "./firebaseConfig.js";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ========================
// Verificar Sessão Admin
// ========================
document.addEventListener('DOMContentLoaded', function () {
  const username = localStorage.getItem("username");
  const password = localStorage.getItem("password");

  // Inicializar Tabs
  const menuItems = document.querySelectorAll('.menu-item');
  const tabContents = document.querySelectorAll('.tab-content');

  menuItems.forEach(item => {
    item.addEventListener('click', function () {
      menuItems.forEach(menuItem => menuItem.classList.remove('active'));
      this.classList.add('active');
      tabContents.forEach(tab => tab.classList.remove('active'));

      const tabId = this.getAttribute('data-tab');
      const correspondingTab = document.getElementById(tabId);
      if (correspondingTab) {
        correspondingTab.classList.add('active');
        const pageTitle = document.getElementById('pageTitle');
        const tabName = this.querySelector('span').textContent;
        pageTitle.textContent = `Painel Admin - ${tabName}`;
      }
    });
  });

  carregarUsuarios();
  carregarLigas();
  carregarClubes();
});

// ========================
// Logout
// ========================
function logout() { 
  localStorage.clear();
  window.location.href = "login.html"; 
}

// ========================
// Toast Notification
// ========================
function mostrarToast(mensagem, tipo="info") {
  const container = document.getElementById("toast-container");
  if (!container) return console.warn("Container de toast não encontrado");
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

// ========================
// Usuários (Clubes)
// ========================
async function carregarUsuarios() {
  const snapshot = await getDocs(collection(db, "usuarios"));
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "";
  snapshot.forEach(docSnap => {
    const u = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${docSnap.id}</td>
      <td>${u.username}</td>
      <td>${u.password}</td>
      <td><button onclick="apagarUsuario('${docSnap.id}')">Apagar</button></td>`;
    tbody.appendChild(row);
  });
}

async function apagarUsuario(id) {
  if (!confirm("Tens certeza que queres apagar este clube?")) return;
  try {
    await deleteDoc(doc(db, "usuarios", id));
    mostrarToast("Clube apagado com sucesso!", "success");
    carregarUsuarios();
  } catch(e) {
    mostrarToast("Erro ao apagar clube", "error");
  }
}

// ========================
// Ligas
// ========================
async function carregarLigas() {
  const snapshot = await getDocs(collection(db, "ligas"));
  const tbody = document.querySelector("#tabelaLigas tbody");
  tbody.innerHTML = "";
  const ligas = [];
  snapshot.forEach(docSnap => {
    const liga = { id: docSnap.id, ...docSnap.data() };
    ligas.push(liga);
    tbody.innerHTML += `
      <tr>
        <td>${liga.id}</td>
        <td>${liga.nome}</td>
        <td><button onclick="apagarLiga('${liga.id}')">Apagar</button></td>
      </tr>`;
  });

  // Preencher selects
  const selects = [
    document.getElementById("select-liga"),
    document.getElementById("select-liga-confrontos"),
    document.getElementById("select-liga-resultados"),
    document.getElementById("select-liga-tabela"),
    document.getElementById("filtro-liga")
  ];
  selects.forEach(sel => {
    if (sel) {
      sel.innerHTML = '<option value="">-- Selecione uma Liga --</option>';
      ligas.forEach(l => sel.innerHTML += `<option value="${l.id}">${l.nome}</option>`);
    }
  });
}

async function apagarLiga(id) {
  if (!confirm("Deseja apagar esta liga?")) return;
  try {
    await deleteDoc(doc(db, "ligas", id));
    mostrarToast("Liga apagada com sucesso!", "success");
    carregarLigas();
  } catch(e) {
    mostrarToast("Erro ao apagar liga", "error");
  }
}

// Adicionar nova liga
document.getElementById("form-liga").addEventListener("submit", async e => {
  e.preventDefault();
  const nome = document.getElementById("nome-liga").value.trim();
  if (!nome) return mostrarToast("Nome da liga obrigatório", "error");
  try {
    await addDoc(collection(db, "ligas"), { nome, clubes: [] });
    document.getElementById("nome-liga").value = "";
    mostrarToast("Liga criada com sucesso!", "success");
    carregarLigas();
  } catch(e) {
    mostrarToast("Erro ao criar liga", "error");
  }
});

// ========================
// Clubes
// ========================
async function carregarClubes() {
  const snapshot = await getDocs(collection(db, "usuarios"));
  const container = document.getElementById("clubes-checkboxes");
  const selectCasa = document.getElementById("select-clube-casa");
  const selectFora = document.getElementById("select-clube-fora");
  container.innerHTML = "";
  selectCasa.innerHTML = selectFora.innerHTML = '<option value="">-- Selecione --</option>';

  snapshot.forEach(docSnap => {
    const c = { id: docSnap.id, ...docSnap.data() };
    container.innerHTML += `
      <div>
        <input type="checkbox" id="clube${c.id}" value="${c.username}">
        <label for="clube${c.id}" style="display:inline;">${c.username}</label>
      </div>`;
    selectCasa.innerHTML += `<option value="${c.username}">${c.username}</option>`;
    selectFora.innerHTML += `<option value="${c.username}">${c.username}</option>`;
  });
}

// Adicionar clubes a liga
document.getElementById("form-add-clubes-liga").addEventListener("submit", async e => {
  e.preventDefault();
  const liga_id = document.getElementById("select-liga").value;
  const clubesSelecionados = Array.from(document.querySelectorAll("#clubes-checkboxes input:checked")).map(c => c.value);
  if (!liga_id || clubesSelecionados.length === 0) return mostrarToast("Selecione uma liga e pelo menos 1 clube", "error");

  try {
    await updateDoc(doc(db, "ligas", liga_id), {
      clubes: arrayUnion(...clubesSelecionados)
    });
    mostrarToast("Clubes adicionados à liga com sucesso!", "success");
    carregarLigas();
  } catch(e) {
    mostrarToast("Erro ao adicionar clubes", "error");
  }
});

// ========================
// Confrontos
// ========================
document.getElementById("form-confrontos").addEventListener("submit", async e => {
  e.preventDefault();
  const liga_id = document.getElementById("select-liga-confrontos").value;
  const casa = document.getElementById("select-clube-casa").value;
  const fora = document.getElementById("select-clube-fora").value;
  const data = document.getElementById("data-confronto").value;
  const hora = document.getElementById("hora-confronto").value;
  if (!liga_id || !casa || !fora || !data || !hora) return mostrarToast("Preencha todos os campos", "error");

  try {
    await addDoc(collection(db, "confrontos"), { liga_id, casa, fora, data, hora, resultado: null });
    mostrarToast("Confronto marcado com sucesso!", "success");
    carregarConfrontos(liga_id);
  } catch(e) {
    mostrarToast("Erro ao marcar confronto", "error");
  }
});

// Carregar confrontos
async function carregarConfrontos(liga_id) {
  const tbody = document.querySelector("#tabelaConfrontos tbody");
  tbody.innerHTML = "";
  const snapshot = await getDocs(collection(db, "confrontos"));
  snapshot.forEach(docSnap => {
    const c = { id: docSnap.id, ...docSnap.data() };
    if (c.liga_id === liga_id) {
      const status = c.resultado ? "Terminado" : "Pendente";
      tbody.innerHTML += `
        <tr>
          <td>${c.data} ${c.hora}</td>
          <td>${c.casa} vs ${c.fora}</td>
          <td>${c.resultado || '-'}</td>
          <td>${status}</td>
          <td><button onclick="apagarConfronto('${c.id}','${liga_id}')">Apagar</button></td>
        </tr>`;
    }
  });
}

// Apagar confronto
async function apagarConfronto(id, liga_id) {
  if (!confirm("Deseja apagar este confronto?")) return;
  try {
    await deleteDoc(doc(db, "confrontos", id));
    mostrarToast("Confronto apagado com sucesso!", "success");
    carregarConfrontos(liga_id);
  } catch(e) {
    mostrarToast("Erro ao apagar confronto", "error");
  }
}

// Atualizar selects de confrontos automaticamente
document.getElementById("select-liga-confrontos").addEventListener("change", e => {
  const liga_id = e.target.value;
  carregarConfrontos(liga_id);
  carregarClubesDaLiga(liga_id);
});

// Mostrar apenas clubes da liga selecionada
async function carregarClubesDaLiga(liga_id) {
  const selectCasa = document.getElementById("select-clube-casa");
  const selectFora = document.getElementById("select-clube-fora");
  selectCasa.innerHTML = selectFora.innerHTML = '<option value="">-- Selecione --</option>';

  const snap = await getDocs(collection(db, "ligas"));
  const liga = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(l => l.id === liga_id);
  if (!liga || !liga.clubes) return;

  liga.clubes.forEach(clube => {
    selectCasa.innerHTML += `<option value="${clube}">${clube}</option>`;
    selectFora.innerHTML += `<option value="${clube}">${clube}</option>`;
  });
}

// ========================
// Resultados
// ========================
document.getElementById("form-resultados").addEventListener("submit", async e => {
  e.preventDefault();
  const confronto_id = document.getElementById("select-confronto").value;
  const golos_casa = document.getElementById("golos-casa").value;
  const golos_fora = document.getElementById("golos-fora").value;
  if (!confronto_id || golos_casa === "" || golos_fora === "") return mostrarToast("Preencha todos os campos", "error");

  const liga_id = document.getElementById("select-liga-resultados").value;
  try {
    await updateDoc(doc(db, "confrontos", confronto_id), {
      resultado: `${golos_casa} - ${golos_fora}`
    });
    mostrarToast("Resultado registrado com sucesso!", "success");

    // Atualizar tabela de confrontos e classificativa
    carregarConfrontos(liga_id);
    await atualizarTabela(liga_id);
    carregarConfrontosParaResultados(liga_id);
  } catch(e) {
    mostrarToast("Erro ao registrar resultado", "error");
  }
});

// Select apenas com confrontos não finalizados
document.getElementById("select-liga-resultados").addEventListener("change", async e => {
  const liga_id = e.target.value;
  carregarConfrontosParaResultados(liga_id);
  mostrarTabela(liga_id);
});

async function carregarConfrontosParaResultados(liga_id) {
  const select = document.getElementById("select-confronto");
  select.innerHTML = '<option value="">-- Selecione um Confronto --</option>';
  const snapshot = await getDocs(collection(db, "confrontos"));
  snapshot.forEach(docSnap => {
    const c = { id: docSnap.id, ...docSnap.data() };
    if (c.liga_id === liga_id && !c.resultado) {
      select.innerHTML += `<option value="${c.id}">${c.casa} vs ${c.fora}</option>`;
    }
  });
}

// ========================
// Tabela Classificativa
// ========================
async function atualizarTabela(liga_id) {
  const ligasSnap = await getDocs(collection(db, "ligas"));
  const clubes = [];
  ligasSnap.forEach(docSnap => {
    const l = docSnap.data();
    if (docSnap.id === liga_id && l.clubes) {
      l.clubes.forEach(nomeClube => {
        clubes.push({
          nome: nomeClube,
          jogos: 0,
          vitorias: 0,
          empates: 0,
          derrotas: 0,
          gols_marcados: 0,
          gols_sofridos: 0,
          saldo_gols: 0,
          pontos: 0
        });
      });
    }
  });

  const confrontosSnap = await getDocs(collection(db, "confrontos"));
  confrontosSnap.forEach(cDoc => {
    const c = cDoc.data();
    if (c.liga_id === liga_id && c.resultado) {
      const [gCasa, gFora] = c.resultado.split(" - ").map(Number);
      const clubeCasa = clubes.find(cl => cl.nome === c.casa);
      const clubeFora = clubes.find(cl => cl.nome === c.fora);
      if (!clubeCasa || !clubeFora) return;

      clubeCasa.jogos += 1;
      clubeFora.jogos += 1;

      clubeCasa.gols_marcados += gCasa;
      clubeCasa.gols_sofridos += gFora;
      clubeFora.gols_marcados += gFora;
      clubeFora.gols_sofridos += gCasa;

      clubeCasa.saldo_gols = clubeCasa.gols_marcados - clubeCasa.gols_sofridos;
      clubeFora.saldo_gols = clubeFora.gols_marcados - clubeFora.gols_sofridos;

      if (gCasa > gFora) {
        clubeCasa.vitorias += 1;
        clubeFora.derrotas += 1;
        clubeCasa.pontos += 3;
      } else if (gCasa < gFora) {
        clubeFora.vitorias += 1;
        clubeCasa.derrotas += 1;
        clubeFora.pontos += 3;
      } else {
        clubeCasa.empates += 1;
        clubeFora.empates += 1;
        clubeCasa.pontos += 1;
        clubeFora.pontos += 1;
      }
    }
  });

  await setDoc(doc(db, "tabelas", liga_id), {
    liga_id: liga_id,
    clubes: clubes,
    atualizada_em: new Date().toISOString()
  }, { merge: true });

  mostrarTabela(liga_id);
}

async function mostrarTabela(liga_id) {
  const tabelaBody = document.querySelector("#tabela-classificativa tbody");
  tabelaBody.innerHTML = "";
  const tabelasSnap = await getDocs(collection(db, "tabelas"));
  tabelasSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.liga_id === liga_id) {
      const clubes = data.clubes.sort((a,b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols);
      clubes.forEach((c, index) => {
        tabelaBody.innerHTML += `
          <tr>
            <td>${index+1}</td>
            <td>${c.nome}</td>
            <td>${c.jogos}</td>
            <td>${c.vitorias}</td>
            <td>${c.empates}</td>
            <td>${c.derrotas}</td>
            <td>${c.gols_marcados}</td>
            <td>${c.gols_sofridos}</td>
            <td>${c.saldo_gols}</td>
            <td>${c.pontos}</td>
          </tr>`;
      });
    }
  });
}

// ========================
// Disponibilizar funções globalmente
// ======================== 
window.logout = logout;
window.apagarUsuario = apagarUsuario;
window.apagarLiga = apagarLiga;
window.apagarConfronto = apagarConfronto;
window.mostrarToast = mostrarToast;
