// =======================================
// IMPORTAÇÕES FIREBASE
// =======================================
import { db } from "./firebaseConfig.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// =======================================
// INICIALIZAÇÃO
// =======================================
document.addEventListener("DOMContentLoaded", () => {
  inicializarTabs();
  carregarUsuarios();
  carregarLigasGerais();
  carregarClubes();
});

// =======================================
// TABS
// =======================================
function inicializarTabs() {
  const itens = document.querySelectorAll(".menu-item");
  const tabs = document.querySelectorAll(".tab-content");

  itens.forEach(item => {
    item.addEventListener("click", () => {
      itens.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      tabs.forEach(t => t.classList.remove("active"));
      if(item.dataset.tab) {
        document.getElementById(item.dataset.tab).classList.add("active");
        document.getElementById("pageTitle").textContent = "Painel Admin - " + item.innerText;
      }
    });
  });
}

// =======================================
// LOGOUT
// =======================================
window.logout = function () {
  localStorage.clear();
  location.href = "login.html";
};

// =======================================
// USUÁRIOS
// =======================================
async function carregarUsuarios() {
  const tbody = document.querySelector("#usersTable tbody");
  const cardsContainer = document.getElementById("usersCards");
  tbody.innerHTML = "";
  cardsContainer.innerHTML = "";

  const snap = await getDocs(collection(db, "usuarios"));

  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#707070;padding:2rem;">Nenhum utilizador encontrado.</td></tr>`;
    cardsContainer.innerHTML = `<div class="user-card-vazio">Nenhum utilizador encontrado.</div>`;
    return;
  }

  snap.forEach(docSnap => {
    const u = docSnap.data();
    const id = docSnap.id;
    const criadoEm = u.criadoEm?.toDate
      ? u.criadoEm.toDate().toLocaleDateString("pt-PT")
      : "-";

    // ── Tabela (desktop) ──────────────────────────────
    tbody.innerHTML += `
      <tr>
        <td>${u.uid || id}</td>
        <td>${u.nome || "-"}</td>
        <td>${u.email || "-"}</td>
        <td>${u.idade || "-"}</td>
        <td>${u.bairro || "-"}</td>
        <td>${u.role || "-"}</td>
        <td>${u.tipoConta || "-"}</td>
        <td>${u.authProvider || "-"}</td>
        <td>${criadoEm}</td>
        <td><button onclick="apagarUsuario('${id}')">Apagar</button></td>
      </tr>
    `;

    // ── Cards (mobile) ────────────────────────────────
    const roleLabel = u.role || "-";
    const card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML = `
      <div class="user-card-nome">${u.nome || "Sem nome"}</div>
      <div class="user-card-row">
        <span class="user-card-label">Email</span>
        <span class="user-card-value">${u.email || "-"}</span>
      </div>
      <div class="user-card-row">
        <span class="user-card-label">Idade</span>
        <span class="user-card-value">${u.idade || "-"}</span>
      </div>
      <div class="user-card-row">
        <span class="user-card-label">Bairro</span>
        <span class="user-card-value">${u.bairro || "-"}</span>
      </div>
      <div class="user-card-row">
        <span class="user-card-label">Role</span>
        <span class="user-card-value user-card-role">${roleLabel}</span>
      </div>
      <div class="user-card-row">
        <span class="user-card-label">Tipo de Conta</span>
        <span class="user-card-value">${u.tipoConta || "-"}</span>
      </div>
      <div class="user-card-row">
        <span class="user-card-label">Criado Em</span>
        <span class="user-card-value">${criadoEm}</span>
      </div>
      <div class="user-card-actions">
        <button onclick="apagarUsuario('${id}')">
          <i class="fas fa-trash"></i> Apagar
        </button>
      </div>
    `;
    cardsContainer.appendChild(card);
  });
}

window.apagarUsuario = async function (id) {
  if (!confirm("Apagar este usuário?")) return;
  await deleteDoc(doc(db, "usuarios", id));
  mostrarToast("Usuário removido", "success");
  carregarUsuarios();
  carregarClubes();
};

// =======================================
// LIGAS
// =======================================
async function carregarLigasGerais() {
  const selects = [
    "select-liga",
    "select-liga-confrontos",
    "select-liga-resultados",
    "select-liga-tabela"
  ];

  const snap = await getDocs(collection(db, "ligas"));

  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = `<option value="">-- Selecione --</option>`;
    snap.forEach(d => {
      select.innerHTML += `<option value="${d.id}">${d.data().nome || "-"}</option>`;
    });
  });

  const tabela = document.querySelector("#tabelaLigas tbody");
  tabela.innerHTML = "";
  snap.forEach(d => {
    const liga = d.data();
    tabela.innerHTML += `
      <tr>
        <td>${d.id}</td>
        <td>${liga.nome || "-"}</td>
        <td>
          <button onclick="apagarLiga('${d.id}')">Apagar</button>
        </td>
      </tr>
    `;
  });
}

document.getElementById("form-liga").addEventListener("submit", async e => {
  e.preventDefault();
  const nome = document.getElementById("nome-liga").value.trim();
  if (!nome) return;

  await addDoc(collection(db, "ligas"), { nome, clubes: [] });
  mostrarToast("Liga criada", "success");
  e.target.reset();
  carregarLigasGerais();
});

window.apagarLiga = async function (id) {
  if (!confirm("Apagar liga?")) return;
  await deleteDoc(doc(db, "ligas", id));
  mostrarToast("Liga apagada", "success");
  carregarLigasGerais();
};

// =======================================
// CLUBES (todos os nomes cadastrados)
// =======================================
async function carregarClubes() {
  const container = document.getElementById("clubes-checkboxes");
  container.innerHTML = "";

  const snap = await getDocs(collection(db, "usuarios"));
  snap.forEach(d => {
    const u = d.data();
    if (!u.nome) return;
    container.innerHTML += `
      <label>
        <input type="checkbox" value="${u.nome}">
        ${u.nome}
      </label><br>
    `;
  });
}

document.getElementById("form-add-clubes-liga").addEventListener("submit", async e => {
  e.preventDefault();
  const liga_id = document.getElementById("select-liga").value;
  const clubes = [...document.querySelectorAll("#clubes-checkboxes input:checked")].map(c => c.value);
  if (!liga_id || clubes.length === 0) return;

  await updateDoc(doc(db, "ligas", liga_id), {
    clubes: arrayUnion(...clubes)
  });

  mostrarToast("Clubes adicionados", "success");
});

// =======================================
// CONFRONTOS
// =======================================
document.getElementById("select-liga-confrontos").addEventListener("change", async e => {
  const liga_id = e.target.value;
  const ligaSnap = await getDocs(collection(db, "ligas"));
  const liga = ligaSnap.docs.find(l => l.id === liga_id)?.data();

  const casa = document.getElementById("select-clube-casa");
  const fora = document.getElementById("select-clube-fora");
  casa.innerHTML = fora.innerHTML = `<option value="">-- Selecione --</option>`;

  liga?.clubes?.forEach(c => {
    if (!c) return;
    casa.innerHTML += `<option>${c}</option>`;
    fora.innerHTML += `<option>${c}</option>`;
  });

  carregarConfrontos(liga_id);
});

document.getElementById("form-confrontos").addEventListener("submit", async e => {
  e.preventDefault();
  const liga_id = document.getElementById("select-liga-confrontos").value;
  const casa = document.getElementById("select-clube-casa").value;
  const fora = document.getElementById("select-clube-fora").value;
  const data = document.getElementById("data-confronto").value;
  const hora = document.getElementById("hora-confronto").value;
  const modo = document.querySelector("input[name='modo-confronto']:checked").value;
  if (!liga_id || !casa || !fora || !modo) return;

  await addDoc(collection(db, "confrontos"), {
    liga_id,
    casa,
    fora,
    data,
    hora,
    modo,
    estado: "marcado",
    golos_casa: 0,
    golos_fora: 0
  });

  mostrarToast("Confronto marcado", "success");
  carregarConfrontos(liga_id);
});

async function carregarConfrontos(liga_id) {
  const tbody = document.querySelector("#tabelaConfrontos tbody");
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "confrontos"));
  snap.forEach(d => {
    const c = d.data();
    if (c.liga_id !== liga_id) return;

    tbody.innerHTML += `
      <tr>
        <td>${c.data} ${c.hora}</td>
        <td>${c.casa} vs ${c.fora}</td>
        <td>${c.modo}</td>
        <td>${c.golos_casa} - ${c.golos_fora}</td>
        <td>${c.estado}</td>
        <td>-</td>
      </tr>
    `;
  });
}

// =======================================
// RESULTADOS
// =======================================
document.getElementById("select-liga-resultados").addEventListener("change", async e => {
  const liga_id = e.target.value;
  const select = document.getElementById("select-confronto");
  select.innerHTML = `<option value="">-- Selecione --</option>`;

  const snap = await getDocs(collection(db, "confrontos"));
  snap.forEach(d => {
    const c = d.data();
    if (c.liga_id === liga_id && c.estado !== "terminado") {
      select.innerHTML += `<option value="${d.id}">${c.casa} vs ${c.fora}</option>`;
    }
  });
});

document.getElementById("select-confronto").addEventListener("change", async e => {
  const confrontoId = e.target.value;
  const snap = await getDocs(collection(db, "confrontos"));
  const confronto = snap.docs.find(d => d.id === confrontoId)?.data();
  if (!confronto) return;

  document.getElementById("resultado-directo-box").style.display =
    confronto.modo === "directo" && confronto.estado !== "terminado" ? "block" : "none";

  document.getElementById("tempo-real-box").style.display =
    confronto.modo === "tempo_real" && confronto.estado !== "terminado" ? "block" : "none";
});

document.getElementById("form-resultados").addEventListener("submit", async e => {
  e.preventDefault();
  const id = document.getElementById("select-confronto").value;
  const snap = await getDocs(collection(db, "confrontos"));
  const confronto = snap.docs.find(d => d.id === id)?.data();
  if (!confronto) return;

  if (confronto.estado === "terminado") {
    mostrarToast("Este confronto já foi terminado.", "error");
    return;
  }

  if (confronto.modo === "directo") {
    const gc = Number(document.getElementById("golos-casa").value);
    const gf = Number(document.getElementById("golos-fora").value);
    await updateDoc(doc(db, "confrontos", id), {
      golos_casa: gc,
      golos_fora: gf,
      estado: "terminado"
    });
    mostrarToast("Resultado directado registado", "success");
  }

  if (confronto.modo === "tempo_real") {
    await updateDoc(doc(db, "confrontos", id), {
      estado: "em_andamento"
    });
    mostrarToast("Confronto em tempo real iniciado", "success");
  }

  carregarConfrontos(confronto.liga_id);
});

// =======================================
// TABELAS CLASSIFICATIVAS
// =======================================
document.getElementById("select-liga-tabela").addEventListener("change", async (e) => {
  const liga_id = e.target.value;
  if (!liga_id) {
    document.querySelector("#tabela-classificativa tbody").innerHTML = "";
    return;
  }
  await atualizarTabela(liga_id);
});

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
    if (c.liga_id === liga_id && c.estado === "terminado") {
      const gc = c.golos_casa;
      const gf = c.golos_fora;

      const clubeCasa = clubes.find(cl => cl.nome === c.casa);
      const clubeFora = clubes.find(cl => cl.nome === c.fora);
      if (!clubeCasa || !clubeFora) return;

      clubeCasa.jogos += 1;
      clubeFora.jogos += 1;

      clubeCasa.gols_marcados += gc;
      clubeCasa.gols_sofridos += gf;
      clubeFora.gols_marcados += gf;
      clubeFora.gols_sofridos += gc;

      clubeCasa.saldo_gols = clubeCasa.gols_marcados - clubeCasa.gols_sofridos;
      clubeFora.saldo_gols = clubeFora.gols_marcados - clubeFora.gols_sofridos;

      if (gc > gf) {
        clubeCasa.vitorias += 1;
        clubeFora.derrotas += 1;
        clubeCasa.pontos += 3;
      } else if (gc < gf) {
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

  const tabelasSnap = await getDocs(collection(db, "tabelas"));
  const tabelaDoc = tabelasSnap.docs.find(d => d.data().liga_id === liga_id);

  if (tabelaDoc) {
    await updateDoc(doc(db, "tabelas", tabelaDoc.id), { clubes: clubes, atualizada_em: new Date().toISOString() });
  } else {
    await addDoc(collection(db, "tabelas"), { liga_id, clubes: clubes, atualizada_em: new Date().toISOString() });
  }

  mostrarTabela(liga_id);
}

async function mostrarTabela(liga_id) {
  const tabelaBody = document.querySelector("#tabela-classificativa tbody");
  tabelaBody.innerHTML = "";

  const tabelasSnap = await getDocs(collection(db, "tabelas"));
  const tabelaDoc = tabelasSnap.docs.find(d => d.data().liga_id === liga_id);
  if (!tabelaDoc) return;

  const clubes = tabelaDoc.data().clubes.sort((a, b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols);

  clubes.forEach((c, index) => {
    tabelaBody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${c.nome}</td>
        <td>${c.jogos}</td>
        <td>${c.vitorias}</td>
        <td>${c.empates}</td>
        <td>${c.derrotas}</td>
        <td>${c.gols_marcados}</td>
        <td>${c.gols_sofridos}</td>
        <td>${c.saldo_gols}</td>
        <td>${c.pontos}</td>
      </tr>
    `;
  });
}

// =======================================
// TOAST
// =======================================
function mostrarToast(msg, tipo = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}