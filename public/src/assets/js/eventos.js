// ============================================================
// Eventos.js — Dashboard de Gestão de Campeonatos
// Colecção: Champions (Firestore)
// Jogadores: /usuarios
// Auth: Firebase Auth (login obrigatório)
// ============================================================

// ── Importações Firebase ─────────────────────────────────────
import { db, auth } from "./firebaseConfig.js";
import {
  collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy,
  serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// ── Estado Global ─────────────────────────────────────────────
let currentUser      = null;
let campeonatoActivo = null;
let numJogadoresSel  = 16;
let jogadoresSel     = [];
let todosJogadores   = [];
let _campeonatosCache = [];
let jogoResultadoActivo  = null;  // { jogoId, faseId, time1Id, time2Id, proximoJogoId, proximoSlot }
let campResultadoActivo  = null;
let participantesActivos = {};

// ============================================================
// AUTH — Guarda de autenticação
// ============================================================
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../pages/login.html";
    return;
  }
  currentUser = user;
  iniciarDashboard();
});

async function iniciarDashboard() {
  const snap  = await getDoc(doc(db, "usuarios", currentUser.uid));
  const dados = snap.exists() ? snap.data() : {};
  const nome  = dados.nome || currentUser.email || "Organizador";

  document.getElementById("userNameHeader").textContent   = nome;
  document.getElementById("userAvatarHeader").textContent = nome.charAt(0).toUpperCase();

  await carregarMeusCampeonatos();
  await preencherSelectsComCache(_campeonatosCache);
}

// ============================================================
// NAVEGAÇÃO — Tabs
// ============================================================
window.mudarTab = function(el) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));

  const tabId = el.dataset.tab;
  const sec   = document.getElementById(tabId);
  if (sec) sec.classList.add("active");
  el.classList.add("active");

  const titulos = {
    "meus-campeonatos"   : "Meus Campeonatos",
    "criar-campeonato"   : "Criar Campeonato",
    "adicionar-jogadores": "Inscrever Jogadores",
    "resultados"         : "Inserir Resultados",
    "bracket"            : "Bracket Eliminatória",
    "grupos"             : "Ver Fases"
  };
  document.getElementById("pageTitle").textContent = titulos[tabId] || tabId;
};

window.mudarTabPorNome = function(tabId) {
  const el = document.querySelector(`[data-tab="${tabId}"]`);
  if (el) mudarTab(el);
};

// ============================================================
// SIDEBAR
// ============================================================
window.toggleSidebar = function() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("active");
};

// ============================================================
// LOGOUT
// ============================================================
window.fazerLogout = async function() {
  await signOut(auth);
  window.location.href = "../pages/login.html";
};

function preencherSelectsComCache(campeonatos) {
  const ids = [
    "select-campeonato-jogadores",
    "select-campeonato-resultados",
    "select-campeonato-bracket",
    "select-campeonato-grupos"
  ];
  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = `<option value="">— Seleccione um campeonato —</option>`;
    campeonatos.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
    if (val) sel.value = val;
  });
}

// ============================================================
// TOAST
// ============================================================
function toast(msg, tipo = "success") {
  const container = document.getElementById("toast-container");
  const el        = document.createElement("div");
  el.className    = `toast toast-${tipo}`;
  el.innerHTML    = `
    <i class="fas fa-${tipo === "success" ? "check-circle" : tipo === "error" ? "times-circle" : "info-circle"}"></i>
    <span>${msg}</span>
  `;
  container.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

// ============================================================
// HELPERS
// ============================================================
function nomeFase(tamanho) {
  const mapa = { 2:"Final", 4:"Semifinal", 8:"Quartas de Final", 16:"Oitavas de Final", 32:"Dezasseis-avos" };
  return mapa[tamanho] || `${tamanho} jogadores`;
}

function nomeFasePorOrdem(ordem, totalFases) {
  if (ordem === totalFases)     return "Final";
  if (ordem === totalFases - 1) return "Semifinal";
  if (ordem === totalFases - 2) return "Quartas de Final";
  if (ordem === totalFases - 3) return "Oitavas de Final";
  return `Fase ${ordem}`;
}

function gerarIdCampeonato() {
  return `champ_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function inicialClube(nome) {
  if (!nome) return "?";
  const palavras = nome.trim().split(" ");
  if (palavras.length >= 2) return (palavras[0][0] + palavras[1][0]).toUpperCase();
  return nome.substring(0, 2).toUpperCase();
}

function corAleatoria(seed) {
  const cores = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#e91e63","#00bcd4","#ff5722"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return cores[Math.abs(hash) % cores.length];
}

function embaralhar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// TAB: MEUS CAMPEONATOS
// ============================================================
async function carregarMeusCampeonatos() {
  const container = document.getElementById("lista-campeonatos");
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> A carregar campeonatos...</div>`;

  try {
    const snap = await getDocs(
      query(collection(db, "Champions"), where("criado_por", "==", currentUser.uid), orderBy("criado_em", "desc"))
    );

    let total = 0, ativos = 0, finalizados = 0;
    const cards = [];

    snap.forEach(d => {
      total++;
      const c = d.data();
      _campeonatosCache.push({ id: d.id, nome: c.nome });
      if (c.status === "ativo")      ativos++;
      if (c.status === "finalizado") finalizados++;

      const statusCor   = { ativo:"green", aguardando:"blue", finalizado:"orange" }[c.status] || "blue";
      const statusLabel = { ativo:"Em Curso", aguardando:"Aguardando", finalizado:"Finalizado" }[c.status] || c.status;

      cards.push(`
        <div class="campeonato-card" onclick="abrirCampeonato('${d.id}')">
          <div class="campeonato-card-header">
            <div class="campeonato-icon"><i class="fas fa-trophy"></i></div>
            <div class="campeonato-info">
              <div class="campeonato-nome">${c.nome}</div>
              <div class="campeonato-meta">
                <span><i class="fas fa-users"></i> ${c.tamanho} jogadores</span>
                ${c.data_evento ? `<span><i class="fas fa-calendar"></i> ${c.data_evento}</span>` : ""}
                ${c.local ? `<span><i class="fas fa-map-marker-alt"></i> ${c.local}</span>` : ""}
              </div>
              ${c.descricao ? `<div class="campeonato-desc">${c.descricao}</div>` : ""}
            </div>
            <div class="status-badge status-${statusCor}">${statusLabel}</div>
          </div>
          ${c.premios?.primeiro || c.taxa_inscricao ? `
            <div class="campeonato-premios">
              ${c.premios?.primeiro ? `<span><i class="fas fa-medal" style="color:#f39c12"></i> ${c.premios.primeiro}</span>` : ""}
              ${c.taxa_inscricao   ? `<span><i class="fas fa-coins" style="color:#2ecc71"></i> ${c.taxa_inscricao}</span>` : ""}
            </div>
          ` : ""}
          <div class="campeonato-card-footer">
            <span style="font-size:11px;color:var(--text-tertiary);">
              ${nomeFase(c.tamanho)} · ${c.chave_gerada ? "Chave gerada" : "Aguardando inscrições"}
            </span>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();irParaBracket('${d.id}')">
                <i class="fas fa-sitemap"></i> Bracket
              </button>
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();confirmarEliminar('${d.id}','${c.nome}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `);
    });

    document.getElementById("stat-total").textContent      = total;
    document.getElementById("stat-ativos").textContent     = ativos;
    document.getElementById("stat-finalizados").textContent = finalizados;

    container.innerHTML = cards.length
      ? `<div class="campeonatos-grid">${cards.join("")}</div>`
      : `<div class="empty-state"><i class="fas fa-trophy"></i><p>Ainda não criou nenhum campeonato.<br>
          <button class="btn btn-primary" style="margin-top:12px" onclick="mudarTabPorNome('criar-campeonato')">
            <i class="fas fa-plus"></i> Criar Primeiro
          </button></p></div>`;

  } catch(e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar: ${e.message}</p></div>`;
  }
}

window.abrirCampeonato = function(id) {
  campeonatoActivo = id;
  ["select-campeonato-jogadores","select-campeonato-resultados","select-campeonato-bracket","select-campeonato-grupos"]
    .forEach(sid => { const sel = document.getElementById(sid); if (sel) sel.value = id; });
  mudarTabPorNome("bracket");
  carregarBracket();
};

window.irParaBracket = function(id) {
  campeonatoActivo = id;
  document.getElementById("select-campeonato-bracket").value = id;
  mudarTabPorNome("bracket");
  carregarBracket();
};

window.confirmarEliminar = function(id, nome) {
  if (!confirm(`Eliminar "${nome}"?\nEsta acção é irreversível.`)) return;
  eliminarCampeonato(id);
};

async function eliminarCampeonato(id) {
  try {
    await deleteDoc(doc(db, "Champions", id));
    toast("Campeonato eliminado.");
    await carregarMeusCampeonatos();
    await preencherSelectsComCache(_campeonatosCache);
  } catch(e) {
    toast("Erro ao eliminar: " + e.message, "error");
  }
}

// ============================================================
// TAB: CRIAR CAMPEONATO
// ============================================================
window.selecionarNumJogadores = function(btn) {
  document.querySelectorAll(".num-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  numJogadoresSel = parseInt(btn.dataset.num);

  document.getElementById("num-selecionado").textContent = `${numJogadoresSel} jogadores`;

  const previews = {
    2 : "Final",
    4 : "Semifinal → Final",
    8 : "Quartas → Meias → Final",
    16: "Oitavas → Final",
    32: "32avos → Oitavas → Final"
  };
  document.getElementById("grupos-preview").textContent = previews[numJogadoresSel] || "";
};

window.limparFormCampeonato = function() {
  ["nome-campeonato","descricao-campeonato","data-campeonato",
   "hora-campeonato","local-campeonato","premio-1","premio-2",
   "premio-3","taxa-inscricao"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const radio = document.querySelector('input[name="visibilidade"][value="publico"]');
  if (radio) radio.checked = true;

  numJogadoresSel = 16;
  document.querySelectorAll(".num-btn").forEach(b => {
    b.classList.toggle("selected", b.dataset.num === "16");
  });
  document.getElementById("num-selecionado").textContent = "16 jogadores";
  document.getElementById("grupos-preview").textContent  = "Oitavas → Final";
};

window.criarCampeonato = async function() {
  const nome = document.getElementById("nome-campeonato").value.trim();
  if (!nome) { toast("Insere o nome do campeonato.", "error"); return; }

  const descricao     = document.getElementById("descricao-campeonato").value.trim();
  const data          = document.getElementById("data-campeonato").value;
  const hora          = document.getElementById("hora-campeonato").value;
  const local         = document.getElementById("local-campeonato").value.trim();
  const premio1       = document.getElementById("premio-1").value.trim();
  const premio2       = document.getElementById("premio-2").value.trim();
  const premio3       = document.getElementById("premio-3").value.trim();
  const taxa          = document.getElementById("taxa-inscricao").value.trim();
  const visRadio      = document.querySelector('input[name="visibilidade"]:checked');
  const visibilidade  = visRadio ? visRadio.value : "publico";

  const btn = document.querySelector("#criar-campeonato .btn-primary:last-child");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A criar...`;

  try {
    const id = gerarIdCampeonato();
    await setDoc(doc(db, "Champions", id), {
      nome,
      descricao      : descricao || null,
      tamanho        : numJogadoresSel,
      data_evento    : data  || null,
      hora_evento    : hora  || null,
      local          : local || null,
      taxa_inscricao : taxa  || null,
      premios: {
        primeiro : premio1 || null,
        segundo  : premio2 || null,
        terceiro : premio3 || null
      },
      publico        : visibilidade === "publico",
      status         : "aguardando",
      fase_atual     : null,
      chave_gerada   : false,
      campeao        : null,
      criado_por     : currentUser.uid,
      criado_em      : serverTimestamp(),
      finalizado_em  : null,
      _schema_versao : 2
    });

    toast(`Campeonato "${nome}" criado com sucesso!`);
    limparFormCampeonato();
    campeonatoActivo = id;

    await carregarMeusCampeonatos();
    await preencherSelectsComCache(_campeonatosCache);

    document.getElementById("select-campeonato-jogadores").value = id;
    mudarTabPorNome("adicionar-jogadores");
    carregarJogadoresCampeonato();

  } catch(e) {
    toast("Erro ao criar: " + e.message, "error");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<i class="fas fa-plus"></i> Criar Campeonato`;
  }
};

// ============================================================
// TAB: INSCREVER JOGADORES
// ============================================================
window.carregarJogadoresCampeonato = async function() {
  const id    = document.getElementById("select-campeonato-jogadores").value;
  const secao = document.getElementById("secao-adicionar-jogadores");
  if (!id) { secao.style.display = "none"; return; }

  campeonatoActivo    = id;
  secao.style.display = "block";

  const campSnap = await getDoc(doc(db, "Champions", id));
  if (!campSnap.exists()) return;
  const camp = campSnap.data();

  document.getElementById("max-jogadores").textContent = camp.tamanho;
  jogadoresSel = [];

  const inscSnap = await getDocs(collection(db, "Champions", id, "participantes"));
  const inscritosIds = new Set();
  inscSnap.forEach(d => inscritosIds.add(d.id));

  const listaEl = document.getElementById("lista-jogadores-cadastrados");
  listaEl.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> A carregar jogadores...</div>`;

  try {
    const usersSnap = await getDocs(collection(db, "usuarios"));
    todosJogadores  = [];
    usersSnap.forEach(d => todosJogadores.push({ id: d.id, ...d.data() }));

    if (todosJogadores.length === 0) {
      listaEl.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Nenhum jogador cadastrado.</p></div>`;
      return;
    }

    jogadoresSel = [...inscritosIds];
    renderizarListaJogadores(camp.tamanho);

  } catch(e) {
    listaEl.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro: ${e.message}</p></div>`;
  }
};

function renderizarListaJogadores(max) {
  const listaEl  = document.getElementById("lista-jogadores-cadastrados");
  const filtro   = (document.getElementById("search-jogadores")?.value || "").toLowerCase();
  const filtrados = todosJogadores.filter(j =>
    (j.nome  || "").toLowerCase().includes(filtro) ||
    (j.clube || "").toLowerCase().includes(filtro)
  );

  if (filtrados.length === 0) {
    listaEl.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>Nenhum jogador encontrado.</p></div>`;
    return;
  }

  listaEl.innerHTML = filtrados.map(j => {
    const sel      = jogadoresSel.includes(j.id);
    const inisiais = inicialClube(j.clube || j.nome || "?");
    const cor      = corAleatoria(j.id);
    return `
      <div class="jogador-item ${sel ? "selected" : ""}" onclick="toggleJogador('${j.id}',${max})" id="jog-${j.id}">
        <div class="jogador-avatar" style="background:${cor}">${inisiais}</div>
        <div class="jogador-info">
          <div class="jogador-nome">${j.nome || "—"}</div>
          <div class="jogador-clube">${j.clube || "Sem clube"}</div>
        </div>
        <div class="jogador-check ${sel ? "checked" : ""}">
          <i class="fas fa-${sel ? "check-circle" : "circle"}"></i>
        </div>
      </div>
    `;
  }).join("");

  atualizarContadorJogadores(max);
}

window.filtrarJogadores = function() {
  const id = document.getElementById("select-campeonato-jogadores").value;
  if (!id) return;
  getDoc(doc(db, "Champions", id)).then(snap => renderizarListaJogadores(snap.data().tamanho));
};

window.toggleJogador = function(userId, max) {
  const idx = jogadoresSel.indexOf(userId);
  if (idx === -1) {
    if (jogadoresSel.length >= max) { toast(`Limite de ${max} jogadores atingido.`, "error"); return; }
    jogadoresSel.push(userId);
  } else {
    jogadoresSel.splice(idx, 1);
  }
  renderizarListaJogadores(max);
};

function atualizarContadorJogadores(max) {
  document.getElementById("count-selecionados").textContent = jogadoresSel.length;
  document.getElementById("btn-confirmar-jogadores").disabled = jogadoresSel.length !== max;
}

window.confirmarJogadores = async function() {
  const id = document.getElementById("select-campeonato-jogadores").value;
  if (!id || jogadoresSel.length === 0) return;

  const campSnap = await getDoc(doc(db, "Champions", id));
  if (!campSnap.exists()) return;
  const camp = campSnap.data();

  if (jogadoresSel.length !== camp.tamanho) {
    toast(`Selecciona exactamente ${camp.tamanho} jogadores.`, "error");
    return;
  }

  const btn     = document.getElementById("btn-confirmar-jogadores");
  btn.disabled  = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A gerar chave...`;

  try {
    const batch        = writeBatch(db);
    const embaralhados = embaralhar(jogadoresSel);

    for (let i = 0; i < embaralhados.length; i++) {
      const uid      = embaralhados[i];
      const userSnap = await getDoc(doc(db, "usuarios", uid));
      const u        = userSnap.exists() ? userSnap.data() : { nome: "Desconhecido", clube: "—" };
      batch.set(doc(db, "Champions", id, "participantes", uid), {
        userId     : uid,
        nome       : u.nome  || "Desconhecido",
        clube      : u.clube || "—",
        foto_url   : u.foto_url || null,
        seed       : i + 1,
        eliminado  : false,
        inscrito_em: serverTimestamp()
      });
    }
    await batch.commit();

    await gerarChave(id, embaralhados, camp.tamanho);

    await updateDoc(doc(db, "Champions", id), {
      status      : "ativo",
      chave_gerada: true,
      fase_atual  : nomeFase(camp.tamanho)
    });

    toast("Chave gerada com sucesso! 🏆");
    await preencherSelectsComCache(_campeonatosCache);
    document.getElementById("select-campeonato-bracket").value = id;
    mudarTabPorNome("bracket");
    carregarBracket();

  } catch(e) {
    toast("Erro ao gerar chave: " + e.message, "error");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<i class="fas fa-random"></i> Sortear Chave e Iniciar Torneio`;
  }
};

// ============================================================
// GERAÇÃO DA CHAVE
// ============================================================
async function gerarChave(campId, jogadoresOrdenados, tamanho) {
  const numFases = Math.log2(tamanho);
  const batch    = writeBatch(db);

  for (let f = 1; f <= numFases; f++) {
    const faseId = `fase_${String(f).padStart(3, "0")}`;
    batch.set(doc(db, "Champions", campId, "fases", faseId), {
      nome        : nomeFasePorOrdem(f, numFases),
      ordem       : f,
      status      : f === 1 ? "ativo" : "pendente",
      total_jogos : tamanho / Math.pow(2, f),
      concluidos  : 0
    });
  }
  await batch.commit();

  const batch2     = writeBatch(db);
  const numJogos1  = tamanho / 2;

  for (let j = 0; j < numJogos1; j++) {
    const jogoId        = `fase_001_jogo_${String(j + 1).padStart(3, "0")}`;
    const proximoJogoId = numFases > 1 ? `fase_002_jogo_${String(Math.floor(j / 2) + 1).padStart(3, "0")}` : null;
    const proximoSlot   = proximoJogoId ? (j % 2 === 0 ? "time1" : "time2") : null;

    batch2.set(doc(db, "Champions", campId, "fases", "fase_001", "jogos", jogoId), {
      jogoId,
      time1_id       : jogadoresOrdenados[j * 2],
      time2_id       : jogadoresOrdenados[j * 2 + 1],
      gols1          : null,
      gols2          : null,
      vencedor_id    : null,
      status_jogo    : "pendente",
      posicao_chave  : { fase: 1, slot: j + 1 },
      proximo_jogo_id: proximoJogoId,
      proximo_slot   : proximoSlot,
      criado_em      : serverTimestamp()
    });
  }
  await batch2.commit();

  // Cria documentos placeholder para fases 2+ (FIX CRÍTICO)
  for (let f = 2; f <= numFases; f++) {
    const faseId   = `fase_${String(f).padStart(3, "0")}`;
    const numJogos = tamanho / Math.pow(2, f);
    const batchJF  = writeBatch(db);

    for (let j = 0; j < numJogos; j++) {
      const jogoId        = `${faseId}_jogo_${String(j + 1).padStart(3, "0")}`;
      const proximaFaseId = f < numFases
        ? `fase_${String(f + 1).padStart(3, "0")}`
        : null;
      const proximoJogoId = proximaFaseId
        ? `${proximaFaseId}_jogo_${String(Math.floor(j / 2) + 1).padStart(3, "0")}`
        : null;
      const proximoSlot = proximoJogoId
        ? (j % 2 === 0 ? "time1" : "time2")
        : null;

      batchJF.set(doc(db, "Champions", campId, "fases", faseId, "jogos", jogoId), {
        jogoId,
        time1_id       : null,
        time2_id       : null,
        gols1          : null,
        gols2          : null,
        vencedor_id    : null,
        status_jogo    : "pendente",
        posicao_chave  : { fase: f, slot: j + 1 },
        proximo_jogo_id: proximoJogoId,
        proximo_slot   : proximoSlot,
        criado_em      : serverTimestamp()
      });
    }
    await batchJF.commit();
  }
}

// ============================================================
// TAB: INSERIR RESULTADOS
// ============================================================
window.carregarResultados = async function() {
  const id = document.getElementById("select-campeonato-resultados").value;

  // Esconder tudo
  document.getElementById("selector-fase-resultados").style.display  = "none";
  document.getElementById("selector-jogo-resultados").style.display  = "none";
  document.getElementById("card-resultado-directo").style.display    = "none";
  document.getElementById("secao-resultados-empty").style.display    = "flex";
  document.getElementById("select-fase-resultados").innerHTML        = `<option value="">— Seleccione uma fase —</option>`;
  document.getElementById("select-jogo-resultados").innerHTML        = `<option value="">— Seleccione um confronto —</option>`;
  jogoResultadoActivo  = null;
  campResultadoActivo  = null;
  participantesActivos = {};

  if (!id) return;

  campResultadoActivo = id;

  try {
    // Carregar participantes em cache
    const partSnap = await getDocs(collection(db, "Champions", id, "participantes"));
    partSnap.forEach(d => { participantesActivos[d.id] = d.data(); });

    // Carregar fases activas ou em curso
    const fasesSnap = await getDocs(
      query(collection(db, "Champions", id, "fases"), orderBy("ordem"))
    );
    const fases = [];
    fasesSnap.forEach(d => {
      const f = d.data();
      if (f.status === "ativo" || f.status === "pendente") {
        fases.push({ id: d.id, ...f });
      }
    });

    if (fases.length === 0) {
      document.getElementById("secao-resultados-empty").innerHTML =
        `<i class="fas fa-futbol"></i><p>Nenhuma fase activa encontrada. Verifique se a chave foi gerada.</p>`;
      return;
    }

    const sel = document.getElementById("select-fase-resultados");
    fases.forEach(f => {
      const opt     = document.createElement("option");
      opt.value     = f.id;
      opt.textContent = f.nome;
      sel.appendChild(opt);
    });

    document.getElementById("selector-fase-resultados").style.display = "block";
    document.getElementById("secao-resultados-empty").style.display   = "none";

    // Se só há uma fase activa, seleccioná-la automaticamente
    if (fases.length === 1) {
      sel.value = fases[0].id;
      carregarJogosResultados();
    }

  } catch(e) {
    toast("Erro ao carregar fases: " + e.message, "error");
  }
};

window.carregarJogosResultados = async function() {
  const faseId = document.getElementById("select-fase-resultados").value;
  const selJogo = document.getElementById("select-jogo-resultados");

  selJogo.innerHTML = `<option value="">— Seleccione um confronto —</option>`;
  document.getElementById("selector-jogo-resultados").style.display = "none";
  document.getElementById("card-resultado-directo").style.display   = "none";
  jogoResultadoActivo = null;

  if (!faseId || !campResultadoActivo) return;

  try {
    const jogosSnap = await getDocs(
      query(
        collection(db, "Champions", campResultadoActivo, "fases", faseId, "jogos"),
        orderBy("posicao_chave.slot")
      )
    );

    let temJogosPendentes = false;
    jogosSnap.forEach(d => {
      const j = d.data();
      // Apenas jogos com ambos os jogadores definidos e ainda não concluídos
      if (j.time1_id && j.time2_id && j.status_jogo !== "concluido") {
        temJogosPendentes = true;
        const t1   = participantesActivos[j.time1_id] || { nome: "?", clube: "—" };
        const t2   = participantesActivos[j.time2_id] || { nome: "?", clube: "—" };
        const opt  = document.createElement("option");
        opt.value  = d.id;
        opt.textContent = `${t1.nome} vs ${t2.nome}`;
        opt.dataset.faseId       = faseId;
        opt.dataset.time1Id      = j.time1_id;
        opt.dataset.time2Id      = j.time2_id;
        opt.dataset.proximoJogoId = j.proximo_jogo_id || "";
        opt.dataset.proximoSlot  = j.proximo_slot     || "";
        selJogo.appendChild(opt);
      }
    });

    if (!temJogosPendentes) {
      toast("Todos os jogos desta fase já foram concluídos.", "info");
      return;
    }

    document.getElementById("selector-jogo-resultados").style.display = "block";

  } catch(e) {
    toast("Erro ao carregar jogos: " + e.message, "error");
  }
};

window.selecionarJogoResultados = function() {
  const selJogo = document.getElementById("select-jogo-resultados");
  const opt     = selJogo.options[selJogo.selectedIndex];

  document.getElementById("card-resultado-directo").style.display = "none";
  document.getElementById("golos-casa").value = "";
  document.getElementById("golos-fora").value = "";
  jogoResultadoActivo = null;

  if (!opt || !opt.value) return;

  const time1Id = opt.dataset.time1Id;
  const time2Id = opt.dataset.time2Id;
  const t1      = participantesActivos[time1Id] || { nome: "?", clube: "—" };
  const t2      = participantesActivos[time2Id] || { nome: "?", clube: "—" };

  document.getElementById("nome-time1-resultado").textContent  = t1.nome  || "?";
  document.getElementById("clube-time1-resultado").textContent = t1.clube || "—";
  document.getElementById("nome-time2-resultado").textContent  = t2.nome  || "?";
  document.getElementById("clube-time2-resultado").textContent = t2.clube || "—";

  jogoResultadoActivo = {
    jogoId        : opt.value,
    faseId        : opt.dataset.faseId,
    time1Id       : time1Id,
    time2Id       : time2Id,
    proximoJogoId : opt.dataset.proximoJogoId || null,
    proximoSlot   : opt.dataset.proximoSlot   || null
  };

  document.getElementById("card-resultado-directo").style.display = "block";
};

window.guardarResultado = async function() {
  if (!jogoResultadoActivo || !campResultadoActivo) {
    toast("Nenhum jogo seleccionado.", "error");
    return;
  }

  const g1 = parseInt(document.getElementById("golos-casa").value);
  const g2 = parseInt(document.getElementById("golos-fora").value);

  if (isNaN(g1) || isNaN(g2)) { toast("Insere os dois resultados.", "error"); return; }
  if (g1 === g2)               { toast("Empates não são permitidos neste formato.", "error"); return; }

  const { jogoId, faseId, time1Id, time2Id, proximoJogoId, proximoSlot } = jogoResultadoActivo;
  const vencedorId = g1 > g2 ? time1Id : time2Id;
  const perdedorId = g1 > g2 ? time2Id : time1Id;

  const btn     = document.getElementById("btn-guardar-resultado");
  btn.disabled  = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A guardar...`;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "Champions", campResultadoActivo, "fases", faseId, "jogos", jogoId), {
      gols1: g1, gols2: g2, vencedor_id: vencedorId, status_jogo: "concluido"
    });
    batch.update(doc(db, "Champions", campResultadoActivo, "participantes", perdedorId), { eliminado: true });
    await batch.commit();

    // Avança vencedor para próximo jogo
    if (proximoJogoId && proximoSlot) {
      const faseNumProx = proximoJogoId.split("_jogo_")[0];
      if (faseNumProx) {
        await updateDoc(
          doc(db, "Champions", campResultadoActivo, "fases", faseNumProx, "jogos", proximoJogoId),
          { [`${proximoSlot}_id`]: vencedorId }
        );
      }
    }

    await verificarFaseConcluida(campResultadoActivo, faseId);
    toast("Resultado registado! ✅");

    // Reset UI
    jogoResultadoActivo = null;
    document.getElementById("card-resultado-directo").style.display   = "none";
    document.getElementById("selector-jogo-resultados").style.display = "none";
    document.getElementById("select-jogo-resultados").innerHTML        = `<option value="">— Seleccione um confronto —</option>`;
    document.getElementById("golos-casa").value = "";
    document.getElementById("golos-fora").value = "";

    // Recarregar a fase actual para mostrar jogos restantes
    await carregarJogosResultados();

    // Actualizar bracket se visível
    const bracketSel = document.getElementById("select-campeonato-bracket");
    if (bracketSel?.value === campResultadoActivo) carregarBracket();

  } catch(e) {
    toast("Erro ao guardar: " + e.message, "error");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<i class="fas fa-save"></i> Registar Resultado`;
  }
};

async function verificarFaseConcluida(campId, faseId) {
  const jogosSnap = await getDocs(collection(db, "Champions", campId, "fases", faseId, "jogos"));
  let total = 0, concluidos = 0;
  jogosSnap.forEach(d => {
    if (d.data().time1_id) {
      total++;
      if (d.data().status_jogo === "concluido") concluidos++;
    }
  });

  await updateDoc(doc(db, "Champions", campId, "fases", faseId), { concluidos });

  if (total !== concluidos) return;

  await updateDoc(doc(db, "Champions", campId, "fases", faseId), { status: "concluido" });

  const fasesSnap = await getDocs(query(collection(db, "Champions", campId, "fases"), orderBy("ordem")));
  const fases     = [];
  fasesSnap.forEach(d => fases.push({ id: d.id, ...d.data() }));

  const idxAtual = fases.findIndex(f => f.id === faseId);
  if (idxAtual < fases.length - 1) {
    const proxFase = fases[idxAtual + 1];
    await updateDoc(doc(db, "Champions", campId, "fases", proxFase.id), { status: "ativo" });
    await updateDoc(doc(db, "Champions", campId), { fase_atual: proxFase.nome });
    toast(`Fase concluída! A avançar para ${proxFase.nome} 🏆`);
  } else {
    // É a Final — determina campeão
    let campVencedorId = null;
    jogosSnap.forEach(d => { if (d.data().vencedor_id) campVencedorId = d.data().vencedor_id; });
    if (campVencedorId) {
      const campSnap = await getDoc(doc(db, "Champions", campId, "participantes", campVencedorId));
      const campeao  = campSnap.exists() ? campSnap.data() : {};
      await updateDoc(doc(db, "Champions", campId), {
        status       : "finalizado",
        finalizado_em: serverTimestamp(),
        campeao      : { userId: campVencedorId, nome: campeao.nome, clube: campeao.clube }
      });
      toast(`🏆 ${campeao.nome} é o CAMPEÃO!`, "success");
    }
  }
}

// ============================================================
// TAB: BRACKET
// ============================================================
window.carregarBracket = async function() {
  const id    = document.getElementById("select-campeonato-bracket").value;
  const secao = document.getElementById("secao-bracket");

  if (!id) {
    secao.innerHTML = `<div class="empty-state"><i class="fas fa-sitemap"></i><p>Seleccione um campeonato.</p></div>`;
    return;
  }

  campeonatoActivo = id;
  secao.innerHTML  = `<div class="loading-spinner"><div class="spinner"></div> A carregar bracket...</div>`;

  try {
    const campSnap = await getDoc(doc(db, "Champions", id));
    if (!campSnap.exists()) { secao.innerHTML = `<div class="empty-state"><p>Campeonato não encontrado.</p></div>`; return; }
    const camp = campSnap.data();

    if (!camp.chave_gerada) {
      secao.innerHTML = `<div class="empty-state"><i class="fas fa-sitemap"></i><p>Chave ainda não gerada.<br>
        <button class="btn btn-primary" style="margin-top:12px" onclick="mudarTabPorNome('adicionar-jogadores')">
          <i class="fas fa-user-plus"></i> Inscrever Jogadores
        </button></p></div>`;
      return;
    }

    const partSnap = await getDocs(collection(db, "Champions", id, "participantes"));
    const partic   = {};
    partSnap.forEach(d => { partic[d.id] = d.data(); });

    const fasesSnap = await getDocs(query(collection(db, "Champions", id, "fases"), orderBy("ordem")));
    const dadosFases = [];
    for (const faseDoc of fasesSnap.docs) {
      const fase      = { id: faseDoc.id, ...faseDoc.data() };
      const jogosSnap = await getDocs(
        query(collection(db, "Champions", id, "fases", faseDoc.id, "jogos"), orderBy("posicao_chave.slot"))
      );
      const jogos = [];
      jogosSnap.forEach(d => jogos.push({ id: d.id, ...d.data() }));
      dadosFases.push({ ...fase, jogos });
    }

    secao.innerHTML = renderizarBracketSimetrico(dadosFases, partic, camp);

  } catch(e) {
    secao.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro: ${e.message}</p></div>`;
  }
};

function renderizarBracketSimetrico(fases, partic, camp) {
  const totalFases = fases.length;

  // ── helpers de renderização ──────────────────────────────

  function nomeTime(tId) {
    if (!tId) return "A definir";
    const t = partic[tId];
    if (!t) return "A definir";
    const n = t.nome || "?";
    return n.length > 13 ? n.slice(0, 12) + "…" : n;
  }

  function timeHTML(tId, vencedorId, concluido) {
    const vazio = !tId;
    const isW   = concluido && vencedorId === tId;
    const cor   = corAleatoria(tId || "x");
    const t     = partic[tId] || {};
    const sigla = inicialClube(vazio ? "?" : (t.clube || t.nome || "?"));
    return `
      <div class="br-time${isW ? " winner" : ""}${vazio ? " vazio" : ""}">
        <div class="br-crest"
          style="background:${cor}22;border:0.5px solid ${cor}55;color:${cor}">
          ${sigla}
        </div>
        <span class="br-nome">${nomeTime(tId)}</span>
        ${isW ? `<span class="br-win-dot"></span>` : ""}
      </div>`;
  }

  function jogoHTML(jogo) {
    if (!jogo) return `
      <div class="br-match">
        <div class="br-time vazio"><div class="br-crest" style="background:#1a1a1a;border:0.5px solid #333;color:#333">?</div><span class="br-nome">A definir</span></div>
        <div class="br-sep"><span class="br-vs">vs</span></div>
        <div class="br-time vazio"><div class="br-crest" style="background:#1a1a1a;border:0.5px solid #333;color:#333">?</div><span class="br-nome">A definir</span></div>
      </div>`;
    const con = jogo.status_jogo === "concluido";
    return `
      <div class="br-match${con ? " done" : ""}">
        ${timeHTML(jogo.time1_id, jogo.vencedor_id, con)}
        <div class="br-sep">
          ${con
            ? `<span class="br-score">${jogo.gols1}–${jogo.gols2}</span>`
            : `<span class="br-vs">vs</span>`}
        </div>
        ${timeHTML(jogo.time2_id, jogo.vencedor_id, con)}
      </div>`;
  }

  // ── SVG conectores ───────────────────────────────────────
  const CONN_W = 24;

  function connRoundSVG(numJogosEntrada, alturaTotal, dir) {
    const n    = numJogosEntrada;
    const segH = alturaTotal / n;
    let paths  = "";
    const stroke = "rgba(0,204,106,0.4)";

    for (let i = 0; i < n / 2; i++) {
      const y1 = segH * (i * 2)       + segH / 2;
      const y2 = segH * (i * 2 + 1)   + segH / 2;
      const ym = (y1 + y2) / 2;
      if (dir === "right") {
        paths += `<path d="M0,${y1} L${CONN_W/2},${y1} L${CONN_W/2},${ym}
          L${CONN_W/2},${y2} L0,${y2} M${CONN_W/2},${ym} L${CONN_W},${ym}"
          stroke="${stroke}" stroke-width="1.5" fill="none"/>`;
      } else {
        paths += `<path d="M${CONN_W},${y1} L${CONN_W/2},${y1} L${CONN_W/2},${ym}
          L${CONN_W/2},${y2} L${CONN_W},${y2} M${CONN_W/2},${ym} L0,${ym}"
          stroke="${stroke}" stroke-width="1.5" fill="none"/>`;
      }
    }
    return `<svg width="${CONN_W}" height="${alturaTotal}"
      style="flex-shrink:0;display:block;align-self:center">${paths}</svg>`;
  }

  function connFinalSVG(altura, dir) {
    const ym = altura / 2;
    const d  = dir === "right"
      ? `M0,${ym} L${CONN_W},${ym}`
      : `M${CONN_W},${ym} L0,${ym}`;
    return `<svg width="${CONN_W}" height="${altura}"
      style="flex-shrink:0;display:block;align-self:center">
      <path d="${d}" stroke="rgba(0,204,106,0.65)"
        stroke-width="2" fill="none"/>
    </svg>`;
  }

  // ── dimensões ────────────────────────────────────────────
  const MATCH_H = 82;
  const MATCH_G = 16;
  const ROUND_W = 128;

  function colHeight(numJogos) {
    return numJogos * MATCH_H + (numJogos - 1) * MATCH_G;
  }

  // ── dividir jogos entre esquerdo e direito ───────────────
  function jogosLado(faseIdx, lado) {
    const jogos = fases[faseIdx].jogos;
    const validos = faseIdx === 0
      ? jogos
      : jogos.filter(j => j.time1_id !== null || j.time2_id !== null);

    const lista = validos.length > 0 ? validos : jogos;
    const metade = Math.ceil(lista.length / 2);

    if (lado === "esq") return lista.slice(0, metade);
    return lista.slice(metade).reverse();
  }

  // ── construir colunas esquerda e direita ─────────────────
  let colunasEsq = [];
  let colunasDir = [];

  for (let f = 0; f < totalFases - 1; f++) {
    const fase      = fases[f];
    const label     = fase.nome.toUpperCase();
    const jogosEsq  = jogosLado(f, "esq");
    const jogosDir  = jogosLado(f, "dir");
    const nE        = jogosEsq.length;
    const nD        = jogosDir.length;
    const hE        = colHeight(nE);
    const hD        = colHeight(nD);

    const rowsEsq = jogosEsq
      .map(j => jogoHTML(j))
      .join(`<div style="height:${MATCH_G}px"></div>`);

    colunasEsq.push(`
      <div class="br-round-wrap">
        <div class="br-round-label">${label}</div>
        <div class="br-round" style="height:${hE}px;width:${ROUND_W}px">
          ${rowsEsq}
        </div>
      </div>`);

    const rowsDir = jogosDir
      .map(j => jogoHTML(j))
      .join(`<div style="height:${MATCH_G}px"></div>`);

    colunasDir.push(`
      <div class="br-round-wrap">
        <div class="br-round-label">${label}</div>
        <div class="br-round" style="height:${hD}px;width:${ROUND_W}px">
          ${rowsDir}
        </div>
      </div>`);

    if (f < totalFases - 2) {
      colunasEsq.push(connRoundSVG(nE, hE, "right"));
      colunasDir.push(connRoundSVG(nD, hD, "left"));
    }
  }

  // ── conector entre Semifinal e Final ─────────────────────
  const jogsSFEsq = jogosLado(totalFases - 2, "esq");
  const jogsSFDir = jogosLado(totalFases - 2, "dir");
  const hSFE = colHeight(jogsSFEsq.length);
  const hSFD = colHeight(jogsSFDir.length);

  colunasEsq.push(connFinalSVG(hSFE, "right"));
  colunasDir.push(connFinalSVG(hSFD, "left"));

  // ── Final + Troféu (centro) ──────────────────────────────
  const jogoFinal  = fases[totalFases - 1]?.jogos?.[0] || null;
  const nomeCampeao = camp.campeao?.nome || "—";

  const centroHTML = `
    <div class="br-center">
      <div class="br-round-label">FINAL</div>
      <div class="br-final-block">
        ${jogoHTML(jogoFinal)}
        <div class="br-trophy">
          <i class="fas fa-trophy"></i>
          <div class="br-trophy-label">Campeão</div>
          <div class="br-trophy-winner">${nomeCampeao}</div>
        </div>
      </div>
    </div>`;

  // ── banner de campeão ────────────────────────────────────
  const bannerHTML = camp.campeao ? `
    <div class="campeao-banner">
      <i class="fas fa-crown"></i>
      <span>CAMPEÃO</span>
      <strong>${camp.campeao.nome}</strong>
      <span class="campeao-clube">${camp.campeao.clube}</span>
    </div>` : "";

  // ── montar HTML final ────────────────────────────────────
  const htmlEsq = colunasEsq.join("");
  const htmlDir = [...colunasDir].reverse().join("");

  return `
    <div class="bracket-champions">
      ${bannerHTML}
      <div class="bracket-scroll-x">
        <div class="bracket-inner">
          <div class="br-side br-left">${htmlEsq}</div>
          ${centroHTML}
          <div class="br-side br-right">${htmlDir}</div>
        </div>
      </div>
    </div>`;
}

// ============================================================
// TAB: VER FASES
// ============================================================
window.carregarGrupos = async function() {
  const id    = document.getElementById("select-campeonato-grupos").value;
  const secao = document.getElementById("secao-grupos");

  if (!id) {
    secao.innerHTML = `<div class="empty-state"><i class="fas fa-layer-group"></i><p>Seleccione um campeonato.</p></div>`;
    return;
  }

  campeonatoActivo = id;
  secao.innerHTML  = `<div class="loading-spinner"><div class="spinner"></div> A carregar fases...</div>`;

  try {
    const partSnap = await getDocs(collection(db, "Champions", id, "participantes"));
    const partic   = {};
    partSnap.forEach(d => { partic[d.id] = d.data(); });

    const fasesSnap = await getDocs(query(collection(db, "Champions", id, "fases"), orderBy("ordem")));
    const fases     = [];
    fasesSnap.forEach(d => fases.push({ id: d.id, ...d.data() }));

    if (fases.length === 0) {
      secao.innerHTML = `<div class="empty-state"><i class="fas fa-layer-group"></i><p>Chave ainda não gerada.</p></div>`;
      return;
    }

    const jogosDeTodasFases = await Promise.all(
      fases.map(fase =>
        getDocs(
          query(collection(db, "Champions", id, "fases", fase.id, "jogos"), orderBy("posicao_chave.slot"))
        ).then(snap => {
          const js = [];
          snap.forEach(d => js.push({ id: d.id, ...d.data() }));
          return js;
        })
      )
    );

    let html = "";
    fases.forEach((fase, fi) => {
      const jogos = jogosDeTodasFases[fi];

      const progress    = fase.total_jogos > 0 ? Math.round((fase.concluidos / fase.total_jogos) * 100) : 0;
      const statusLabel = { ativo:"Em Curso", pendente:"Aguardando", concluido:"Concluída" }[fase.status] || fase.status;
      const statusCor   = { ativo:"green",    pendente:"blue",        concluido:"orange"   }[fase.status] || "blue";

      html += `
        <div class="fase-card">
          <div class="fase-card-header">
            <div>
              <span class="fase-card-nome">${fase.nome}</span>
              <span class="status-badge status-${statusCor}" style="margin-left:10px">${statusLabel}</span>
            </div>
            <div class="fase-progress-info">${fase.concluidos}/${fase.total_jogos} jogos</div>
          </div>
          <div class="fase-progress-bar"><div class="fase-progress-fill" style="width:${progress}%"></div></div>
          <div class="fase-jogos-lista">
            ${jogos.map(jogo => {
              const t1  = partic[jogo.time1_id] || { nome: "A definir", clube: "—" };
              const t2  = partic[jogo.time2_id] || { nome: "A definir", clube: "—" };
              const con = jogo.status_jogo === "concluido";
              return `
                <div class="fase-jogo-row ${con ? "concluido" : ""}">
                  <div class="fjr-time">
                    <div class="fjr-avatar" style="background:${corAleatoria(jogo.time1_id||"x")}">${inicialClube(t1.clube)}</div>
                    <span class="${jogo.vencedor_id === jogo.time1_id && con ? "fjr-vencedor" : ""}">${t1.nome}</span>
                  </div>
                  <div class="fjr-placar">
                    ${con ? `<strong>${jogo.gols1}</strong> × <strong>${jogo.gols2}</strong>`
                          : `<span style="color:var(--text-tertiary);font-size:11px">Por jogar</span>`}
                  </div>
                  <div class="fjr-time right">
                    <span class="${jogo.vencedor_id === jogo.time2_id && con ? "fjr-vencedor" : ""}">${t2.nome}</span>
                    <div class="fjr-avatar" style="background:${corAleatoria(jogo.time2_id||"y")}">${inicialClube(t2.clube)}</div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    });

    secao.innerHTML = html;

  } catch(e) {
    secao.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro: ${e.message}</p></div>`;
  }
};

// ============================================================
// PARTILHAR BRACKET
// ============================================================
window.partilharBracket = function() {
  const url = `${window.location.origin}/pages/campeonatos.html?id=${campeonatoActivo}`;
  const msg = encodeURIComponent(`🏆 Segue a chave do campeonato:\n${url}`);
  window.open(`https://wa.me/?text=${msg}`, "_blank");
};