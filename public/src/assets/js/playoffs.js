import { auth, db } from "./firebaseConfig.js";
import {
  collection, doc, addDoc, setDoc, updateDoc, getDoc, deleteDoc,
  onSnapshot, getDocs, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

let playoffActual = null;
let participantesSeleccionados = [];
let unsubscribeConfrontos = null;
let campeaoEditandoId = null;

document.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("user_id");
  if (!userId || role !== "playoff") {
    window.location.href = "../pages/login.html";
    return;
  }

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const ecra = btn.dataset.ecra;
      if (!btn.disabled) mostrarEcra(ecra);
    });
  });

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = "../pages/login.html";
  });

  document.getElementById("btn-novo-playoff").addEventListener("click", () => {
    mostrarEcra("criar");
  });

  document.getElementById("btn-guardar-playoff").addEventListener("click", criarPlayoff);
  document.getElementById("btn-confirmar-participantes").addEventListener("click", confirmarParticipantes);
  document.getElementById("btn-guardar-campeao").addEventListener("click", guardarCampeao);
  document.getElementById("input-foto-campeao").addEventListener("change", previewFoto);

  const hamburgerBtn = document.getElementById("hamburger-btn");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const sidebar = document.getElementById("sidebar");

  function abrirSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");
  }

  function fecharSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener("click", abrirSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", fecharSidebar);

  carregarListaPlayoffs();
  carregarLigas();
  carregarListaCampeoes();
});

function mostrarEcra(id) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".ecra").forEach(e => e.classList.add("hidden"));
  document.getElementById(`ecra-${id}`).classList.remove("hidden");
  const btn = document.querySelector(`.nav-item[data-ecra="${id}"]`);
  if (btn) btn.classList.add("active");
  if (window.innerWidth <= 768) fecharSidebar();
}

function carregarListaPlayoffs() {
  const container = document.getElementById("lista-playoffs");
  onSnapshot(
    query(collection(db, "playoffs"), orderBy("criadoEm", "desc")),
    (snap) => {
      container.innerHTML = "";
      if (snap.empty) {
        container.innerHTML = '<div class="empty-message">Nenhum playoff criado ainda.</div>';
        return;
      }
      snap.forEach(docSnap => {
        const p = docSnap.data();
        const pid = docSnap.id;
        let statusLabel, statusClass;
        switch (p.status) {
          case "configuracao": statusLabel = "Configuração"; statusClass = "status-configuracao"; break;
          case "em_curso": statusLabel = "Em Curso"; statusClass = "status-em_curso"; break;
          case "terminado": statusLabel = "Terminado"; statusClass = "status-terminado"; break;
          default: statusLabel = p.status; statusClass = "";
        }
        container.innerHTML += `
          <div class="playoff-card">
            <div>
              <strong>${p.nome}</strong>
              <span class="status-badge ${statusClass}">${statusLabel}</span>
            </div>
            <button class="btn-primary" data-playoff-id="${pid}">
              <i class="fas fa-cog"></i> Gerir
            </button>
          </div>`;
      });
      container.querySelectorAll("[data-playoff-id]").forEach(btn => {
        btn.addEventListener("click", () => carregarPlayoff(btn.dataset.playoffId));
      });
    }
  );
}

function carregarLigas() {
  onSnapshot(collection(db, "ligas"), (snap) => {
    const select = document.getElementById("select-liga");
    const valAtual = select.value;
    select.innerHTML = '<option value="">Independente (sem liga)</option>';
    snap.forEach(docSnap => {
      const liga = docSnap.data();
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = liga.nome || liga.name || "Liga";
      select.appendChild(opt);
    });
    select.value = valAtual;
  });
}

async function criarPlayoff() {
  const nome = document.getElementById("input-nome-playoff").value.trim();
  if (!nome) {
    alert("Insira o nome do playoff.");
    return;
  }
  const ligaId = document.getElementById("select-liga").value || null;
  const maos = parseInt(document.getElementById("select-maos").value);
  const totalParticipantes = parseInt(document.getElementById("select-participantes").value);

  const docRef = await addDoc(collection(db, "playoffs"), {
    nome,
    ligaId,
    maos,
    totalParticipantes,
    participantes: [],
    rondaActual: 1,
    status: "configuracao",
    criadoEm: new Date().toISOString()
  });

  playoffActual = { id: docRef.id, nome, ligaId, maos, totalParticipantes, participantes: [], rondaActual: 1, status: "configuracao" };
  document.getElementById("btn-participantes").disabled = false;
  mostrarEcra("participantes");
  carregarParticipantes();
}

async function carregarParticipantes() {
  const container = document.getElementById("lista-participantes");
  const btnConfirmar = document.getElementById("btn-confirmar-participantes");
  container.innerHTML = '<div class="loading-state">A carregar participantes...</div>';
  btnConfirmar.classList.add("hidden");
  participantesSeleccionados = [];

  if (playoffActual.ligaId) {
    const docSnap = await getDoc(doc(db, "tabelas", playoffActual.ligaId));
    if (!docSnap.exists()) {
      container.innerHTML = '<div class="empty-message">Liga não encontrada.</div>';
      return;
    }
    const ligaDados = docSnap.data();
    const clubes = (ligaDados.clubes || ligaDados.tabela || []).slice();
    clubes.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
    const apurados = clubes.slice(0, playoffActual.totalParticipantes);
    container.innerHTML = "";
    apurados.forEach(c => {
      container.innerHTML += `
        <div class="participante-item">
          <i class="fas fa-check-circle" style="color:var(--primary-green)"></i>
          <span>${c.nome || c.clube || "—"}</span>
        </div>`;
    });
    participantesSeleccionados = apurados.map(c => c.nome || c.clube || "");
    btnConfirmar.classList.remove("hidden");
  } else {
    const snap = await getDocs(query(collection(db, "usuarios"), where("role", "==", "usuario")));
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = '<div class="empty-message">Nenhum utilizador encontrado.</div>';
      return;
    }
    const checkboxes = [];
    snap.forEach(docSnap => {
      const u = docSnap.data();
      const nomeClube = u.nome || u.username || "—";
      const div = document.createElement("div");
      div.className = "participante-item";
      div.innerHTML = `
        <input type="checkbox" value="${nomeClube}" id="chk-${docSnap.id}">
        <label for="chk-${docSnap.id}">${nomeClube}</label>`;
      container.appendChild(div);
      const chk = div.querySelector("input");
      chk.addEventListener("change", () => {
        if (chk.checked) {
          participantesSeleccionados.push(nomeClube);
        } else {
          participantesSeleccionados = participantesSeleccionados.filter(n => n !== nomeClube);
        }
        if (participantesSeleccionados.length === playoffActual.totalParticipantes) {
          btnConfirmar.classList.remove("hidden");
        } else {
          btnConfirmar.classList.add("hidden");
        }
      });
      checkboxes.push(chk);
    });
  }
}

async function confirmarParticipantes() {
  if (participantesSeleccionados.length !== playoffActual.totalParticipantes) {
    alert(`Seleccione exactamente ${playoffActual.totalParticipantes} participantes.`);
    return;
  }

  await updateDoc(doc(db, "playoffs", playoffActual.id), {
    participantes: participantesSeleccionados,
    status: "em_curso"
  });
  playoffActual.status = "em_curso";
  playoffActual.participantes = participantesSeleccionados;

  const shuffled = [...participantesSeleccionados];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const batch = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const casa = shuffled[i];
    const fora = shuffled[i + 1];
    batch.push(addDoc(collection(db, "playoff_confrontos"), {
      playoffId: playoffActual.id,
      ronda: 1,
      casa,
      fora,
      maos: playoffActual.maos,
      estado: "pendente",
      vencedor: "",
      destaque: false,
      agregado_casa: 0,
      agregado_fora: 0,
      resultado_ida: { golos_casa: 0, golos_fora: 0, inserido: false },
      resultado_volta: { golos_casa: 0, golos_fora: 0, inserido: false }
    }));
  }
  await Promise.all(batch);

  document.getElementById("btn-resultados-inserir").disabled = false;
  document.getElementById("btn-resultados-ver").disabled = false;
  mostrarEcra("resultados-inserir");
  carregarConfrontosInserir();
  carregarConfrontosVer();
}

function carregarConfrontosInserir() {
  const container = document.getElementById("confrontos-inserir");
  const badge = document.getElementById("badge-ronda-inserir");
  badge.textContent = `Ronda ${playoffActual.rondaActual}`;
  container.innerHTML = '<div class="loading-state">A carregar confrontos...</div>';

  if (unsubscribeConfrontos) unsubscribeConfrontos();

  unsubscribeConfrontos = onSnapshot(
    query(
      collection(db, "playoff_confrontos"),
      where("playoffId", "==", playoffActual.id),
      where("ronda", "==", playoffActual.rondaActual)
    ),
    (snap) => {
      container.innerHTML = "";
      if (snap.empty) {
        container.innerHTML = '<div class="empty-message">Nenhum confronto nesta ronda.</div>';
        return;
      }

      const confrontos = [];
      snap.forEach(d => confrontos.push({ id: d.id, ...d.data() }));

      confrontos.forEach(c => {
        const div = document.createElement("div");
        div.className = "confronto-card";

        if (c.maos === 1) {
          div.innerHTML = `
            <div class="confronto-equipas-row">
              <span class="team-name home">${c.casa}</span>
              <span class="vs-label">VS</span>
              <span class="team-name away">${c.fora}</span>
            </div>
            <div class="inputs-resultado">
              <input type="number" class="input-golos" id="golos-casa-${c.id}" value="${c.resultado_ida.golos_casa}" min="0">
              <span style="color:var(--text-secondary)">—</span>
              <input type="number" class="input-golos" id="golos-fora-${c.id}" value="${c.resultado_ida.golos_fora}" min="0">
            </div>
            <button class="btn-primary guardar-resultado" data-id="${c.id}" data-maos="1">
              <i class="fas fa-save"></i> Guardar Resultado
            </button>
            ${c.estado === "terminado" ? `<div style="margin-top:0.5rem"><span class="vencedor-badge">Vencedor: ${c.vencedor}</span></div>` : ""}
            ${c.resultado_ida.inserido && c.estado !== "terminado" ? `
            <div style="margin-top:0.75rem;display:flex;align-items:center;gap:0.5rem">
              <span style="color:var(--text-secondary);font-size:0.85rem">Escolha o vencedor:</span>
              <select id="select-vencedor-${c.id}" class="input-golos" style="width:auto">
                <option value="${c.casa}">${c.casa}</option>
                <option value="${c.fora}">${c.fora}</option>
              </select>
              <button class="btn-primary confirmar-vencedor" data-id="${c.id}">
                <i class="fas fa-check"></i> Confirmar Vencedor
              </button>
            </div>` : ""}
          `;
        } else {
          const idaInserida = c.resultado_ida.inserido;
          const voltaInserida = c.resultado_volta.inserido;
          div.innerHTML = `
            <div class="confronto-equipas-row">
              <span class="team-name home">${c.casa}</span>
              <span class="vs-label">VS</span>
              <span class="team-name away">${c.fora}</span>
            </div>
            <div style="margin-bottom:0.5rem;font-size:0.8rem;color:var(--text-secondary)"><strong>IDA</strong></div>
            <div class="inputs-resultado">
              <input type="number" class="input-golos" id="ida-casa-${c.id}" value="${c.resultado_ida.golos_casa}" min="0" ${idaInserida ? "disabled" : ""}>
              <span style="color:var(--text-secondary)">—</span>
              <input type="number" class="input-golos" id="ida-fora-${c.id}" value="${c.resultado_ida.golos_fora}" min="0" ${idaInserida ? "disabled" : ""}>
              <button class="btn-primary guardar-ida" data-id="${c.id}" ${idaInserida ? "disabled" : ""}>
                <i class="fas fa-save"></i> Guardar Ida
              </button>
            </div>
            <div style="margin-bottom:0.5rem;font-size:0.8rem;color:var(--text-secondary)"><strong>VOLTA</strong></div>
            <div class="inputs-resultado">
              <input type="number" class="input-golos" id="volta-casa-${c.id}" value="${c.resultado_volta.golos_casa}" min="0" ${!idaInserida ? "disabled" : ""}>
              <span style="color:var(--text-secondary)">—</span>
              <input type="number" class="input-golos" id="volta-fora-${c.id}" value="${c.resultado_volta.golos_fora}" min="0" ${!idaInserida ? "disabled" : ""}>
              <button class="btn-primary guardar-volta" data-id="${c.id}" ${!idaInserida ? "disabled" : ""}>
                <i class="fas fa-save"></i> Guardar Volta
              </button>
            </div>
            ${idaInserida || voltaInserida ? `
            <div class="agregado-display">Agregado: ${c.agregado_casa} — ${c.agregado_fora}</div>` : ""}
            ${c.estado === "terminado" ? `<div style="margin-top:0.5rem"><span class="vencedor-badge">Vencedor: ${c.vencedor}</span></div>` : ""}
            ${idaInserida && voltaInserida && c.estado !== "terminado" ? `
            <div style="margin-top:0.75rem;display:flex;align-items:center;gap:0.5rem">
              <span style="color:var(--text-secondary);font-size:0.85rem">Escolha o vencedor:</span>
              <select id="select-vencedor-${c.id}" class="input-golos" style="width:auto">
                <option value="${c.casa}">${c.casa}</option>
                <option value="${c.fora}">${c.fora}</option>
              </select>
              <button class="btn-primary confirmar-vencedor" data-id="${c.id}">
                <i class="fas fa-check"></i> Confirmar Vencedor
              </button>
            </div>` : ""}
          `;
        }

        container.appendChild(div);
      });

      document.querySelectorAll(".guardar-resultado").forEach(btn => {
        btn.addEventListener("click", () => guardarResultadoIda(btn.dataset.id));
      });
      document.querySelectorAll(".guardar-ida").forEach(btn => {
        btn.addEventListener("click", () => guardarResultadoIda(btn.dataset.id));
      });
      document.querySelectorAll(".guardar-volta").forEach(btn => {
        btn.addEventListener("click", () => guardarResultadoVolta(btn.dataset.id));
      });
      document.querySelectorAll(".confirmar-vencedor").forEach(btn => {
        btn.addEventListener("click", () => confirmarVencedorManual(btn.dataset.id));
      });

      verificarRondaCompleta(confrontos);
    }
  );
}

async function guardarResultadoIda(confrontoId) {
  const idaCasa = parseInt(document.getElementById(`golos-casa-${confrontoId}`)?.value || document.getElementById(`ida-casa-${confrontoId}`)?.value || 0);
  const idaFora = parseInt(document.getElementById(`golos-fora-${confrontoId}`)?.value || document.getElementById(`ida-fora-${confrontoId}`)?.value || 0);

  await updateDoc(doc(db, "playoff_confrontos", confrontoId), {
    "resultado_ida.golos_casa": idaCasa,
    "resultado_ida.golos_fora": idaFora,
    "resultado_ida.inserido": true,
    agregado_casa: idaCasa,
    agregado_fora: idaFora
  });
}

async function guardarResultadoVolta(confrontoId) {
  const voltaCasa = parseInt(document.getElementById(`volta-casa-${confrontoId}`).value || 0);
  const voltaFora = parseInt(document.getElementById(`volta-fora-${confrontoId}`).value || 0);

  const c = await getDoc(doc(db, "playoff_confrontos", confrontoId));
  const dados = c.data();

  const agregadoCasa = (dados.agregado_casa || 0) + voltaCasa;
  const agregadoFora = (dados.agregado_fora || 0) + voltaFora;

  await updateDoc(doc(db, "playoff_confrontos", confrontoId), {
    "resultado_volta.golos_casa": voltaCasa,
    "resultado_volta.golos_fora": voltaFora,
    "resultado_volta.inserido": true,
    agregado_casa: agregadoCasa,
    agregado_fora: agregadoFora
  });
}

async function confirmarVencedorManual(confrontoId) {
  const select = document.getElementById(`select-vencedor-${confrontoId}`);
  const vencedor = select.value;
  await updateDoc(doc(db, "playoff_confrontos", confrontoId), {
    estado: "terminado",
    vencedor
  });
}

async function verificarRondaCompleta(confrontos) {
  const todosTerminados = confrontos.every(c => c.estado === "terminado");
  if (!todosTerminados) return;

  const container = document.getElementById("confrontos-inserir");
  const btnGerar = document.createElement("button");
  btnGerar.className = "btn-primary";
  btnGerar.style.marginTop = "1rem";
  btnGerar.innerHTML = '<i class="fas fa-forward"></i> Gerar Próxima Ronda';
  btnGerar.addEventListener("click", () => gerarProximaRonda(confrontos));
  container.appendChild(btnGerar);
}

async function gerarProximaRonda(confrontos) {
  const vencedores = confrontos.map(c => c.vencedor).filter(v => v);

  if (vencedores.length === 1) {
    document.getElementById("input-clube-campeao").value = vencedores[0];
    document.getElementById("btn-campeao").disabled = false;
    mostrarEcra("campeao");
    return;
  }

  const proxRonda = playoffActual.rondaActual + 1;
  const shuffled = [...vencedores];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const batch = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const casa = shuffled[i];
    const fora = shuffled[i + 1];
    batch.push(addDoc(collection(db, "playoff_confrontos"), {
      playoffId: playoffActual.id,
      ronda: proxRonda,
      casa,
      fora,
      maos: playoffActual.maos,
      estado: "pendente",
      vencedor: "",
      destaque: false,
      agregado_casa: 0,
      agregado_fora: 0,
      resultado_ida: { golos_casa: 0, golos_fora: 0, inserido: false },
      resultado_volta: { golos_casa: 0, golos_fora: 0, inserido: false }
    }));
  }
  await Promise.all(batch);

  playoffActual.rondaActual = proxRonda;
  await updateDoc(doc(db, "playoffs", playoffActual.id), { rondaActual: proxRonda });

  if (unsubscribeConfrontos) unsubscribeConfrontos();
  carregarConfrontosInserir();
}

function carregarConfrontosVer() {
  const container = document.getElementById("confrontos-ver");
  container.innerHTML = '<div class="loading-state">A carregar resultados...</div>';

  onSnapshot(
    query(
      collection(db, "playoff_confrontos"),
      where("playoffId", "==", playoffActual.id)
    ),
    (snap) => {
      container.innerHTML = "";
      if (snap.empty) {
        container.innerHTML = '<div class="empty-message">Nenhum resultado disponível.</div>';
        return;
      }

      const porRonda = {};
      snap.forEach(d => {
        const c = { id: d.id, ...d.data() };
        if (!porRonda[c.ronda]) porRonda[c.ronda] = [];
        porRonda[c.ronda].push(c);
      });

      Object.keys(porRonda).sort((a, b) => a - b).forEach(ronda => {
        const sec = document.createElement("div");
        sec.className = "ronda-section";
        sec.innerHTML = `<div class="ronda-titulo">RONDA ${ronda}</div>`;
        porRonda[ronda].forEach(c => {
          const card = document.createElement("div");
          card.className = "confronto-card";
          if (c.estado === "terminado") {
            card.innerHTML = `
              <div class="confronto-equipas-row">
                <span class="team-name home">${c.casa}</span>
                <span class="vs-label">${c.agregado_casa} : ${c.agregado_fora}</span>
                <span class="team-name away">${c.fora}</span>
              </div>
              <span class="vencedor-badge">Vencedor: ${c.vencedor}</span>
              <div style="margin-top:0.75rem;display:flex;align-items:center;gap:0.5rem">
                <button class="btn-destaque ${c.destaque ? 'btn-destaque-activo' : ''}"
                  data-id="${c.id}" data-destaque="${c.destaque ? 'true' : 'false'}">
                  <i class="fas fa-star"></i>
                  ${c.destaque ? 'Remover Destaque' : 'Colocar em Destaque'}
                </button>
                <button class="btn-acao btn-editar" data-id="${c.id}">
                  <i class="fas fa-pen"></i> Editar
                </button>
                <button class="btn-acao btn-apagar" data-id="${c.id}">
                  <i class="fas fa-trash"></i> Apagar
                </button>
              </div>`;
          } else {
            card.innerHTML = `
              <div class="confronto-equipas-row">
                <span class="team-name home">${c.casa}</span>
                <span class="vs-label">VS</span>
                <span class="team-name away">${c.fora}</span>
              </div>
              <span class="status-badge" style="background:rgba(0,153,204,0.15);color:var(--accent-blue)">Por Realizar</span>
              <div style="margin-top:0.75rem;display:flex;align-items:center;gap:0.5rem">
                <button class="btn-destaque ${c.destaque ? 'btn-destaque-activo' : ''}"
                  data-id="${c.id}" data-destaque="${c.destaque ? 'true' : 'false'}">
                  <i class="fas fa-star"></i>
                  ${c.destaque ? 'Remover Destaque' : 'Colocar em Destaque'}
                </button>
                <button class="btn-acao btn-editar" data-id="${c.id}">
                  <i class="fas fa-pen"></i> Editar
                </button>
                <button class="btn-acao btn-apagar" data-id="${c.id}">
                  <i class="fas fa-trash"></i> Apagar
                </button>
              </div>`;
          }
          sec.appendChild(card);
        });
        container.appendChild(sec);
      });

      container.querySelectorAll(".btn-destaque").forEach(btn => {
        btn.addEventListener("click", async () => {
          const confrontoId = btn.dataset.id;
          const destaqueActual = btn.dataset.destaque === "true";
          await updateDoc(doc(db, "playoff_confrontos", confrontoId), {
            destaque: !destaqueActual
          });
        });
      });

      container.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => editarResultado(btn.dataset.id));
      });
      container.querySelectorAll(".btn-apagar").forEach(btn => {
        btn.addEventListener("click", () => apagarConfronto(btn.dataset.id));
      });
    }
  );
}

async function editarResultado(confrontoId) {
  const snap = await getDoc(doc(db, "playoff_confrontos", confrontoId));
  if (!snap.exists()) return;
  const c = snap.data();

  const updateData = {
    estado: "pendente",
    vencedor: "",
    "resultado_ida.inserido": false
  };

  if (c.maos === 2) {
    updateData["resultado_volta.inserido"] = false;
  }

  await updateDoc(doc(db, "playoff_confrontos", confrontoId), updateData);

  playoffActual.rondaActual = c.ronda;
  mostrarEcra("resultados-inserir");
  if (unsubscribeConfrontos) unsubscribeConfrontos();
  carregarConfrontosInserir();
}

async function apagarConfronto(confrontoId) {
  const snap = await getDoc(doc(db, "playoff_confrontos", confrontoId));
  if (!snap.exists()) return;
  const c = snap.data();

  if (c.vencedor) {
    const proxSnap = await getDocs(
      query(
        collection(db, "playoff_confrontos"),
        where("playoffId", "==", c.playoffId),
        where("ronda", "==", c.ronda + 1)
      )
    );
    const dependente = proxSnap.docs.find(d => {
      const data = d.data();
      return data.casa === c.vencedor || data.fora === c.vencedor;
    });
    if (dependente) {
      const confirmou = confirm(
        `Atenção: o vencedor deste confronto (${c.vencedor}) já está a jogar na Ronda ${c.ronda + 1}. Apagar este confronto NÃO vai corrigir a ronda seguinte automaticamente — terás de ajustar isso manualmente. Queres apagar mesmo assim?`
      );
      if (!confirmou) return;
    } else {
      if (!confirm("Apagar este confronto?")) return;
    }
  } else {
    if (!confirm("Apagar este confronto?")) return;
  }

  await deleteDoc(doc(db, "playoff_confrontos", confrontoId));
}

async function editarCampeao(campeaoId) {
  const snap = await getDoc(doc(db, "campeoes", campeaoId));
  if (!snap.exists()) return;
  const dados = snap.data();

  document.getElementById("input-clube-campeao").value = dados.clubeNome;
  document.getElementById("input-descricao-campeao").value = dados.descricao;

  campeaoEditandoId = campeaoId;
  document.getElementById("btn-guardar-campeao").innerHTML = '<i class="fas fa-save"></i> Atualizar Campeão';

  mostrarEcra("campeao");
  document.querySelector(".form-card").scrollIntoView({ behavior: "smooth" });
}

async function apagarCampeao(campeaoId) {
  const snap = await getDoc(doc(db, "campeoes", campeaoId));
  if (!snap.exists()) return;
  const c = snap.data();

  if (!confirm("Apagar este registo de campeão? O playoff associado voltará ao estado 'Em Curso'.")) return;

  await deleteDoc(doc(db, "campeoes", campeaoId));

  if (c.playoffId) {
    try {
      await updateDoc(doc(db, "playoffs", c.playoffId), { status: "em_curso" });
    } catch (err) {
      console.warn("Não foi possível reverter o status do playoff:", err);
    }
  }
}

function previewFoto(evento) {
  const file = evento.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById("preview-foto");
    preview.classList.remove("hidden");
    preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

async function guardarCampeao() {
  const fileInput = document.getElementById("input-foto-campeao");
  const descricao = document.getElementById("input-descricao-campeao").value.trim();
  const clubeNome = document.getElementById("input-clube-campeao").value.trim();

  if (!clubeNome || !descricao) {
    alert("Preencha o nome do clube e a descrição.");
    return;
  }

  if (!campeaoEditandoId && !fileInput.files.length) {
    alert("Seleccione uma foto para o campeão.");
    return;
  }

  if (campeaoEditandoId) {
    let fotoUrl;
    if (fileInput.files.length > 0) {
      const formData = new FormData();
      formData.append("file", fileInput.files[0]);
      formData.append("upload_preset", "kj7uiiza");
      formData.append("folder", "powerplay/campeoes");
      const res = await fetch("https://api.cloudinary.com/v1_1/dvtnowjdc/image/upload", {
        method: "POST",
        body: formData
      });
      const dados = await res.json();
      fotoUrl = dados.secure_url;
    } else {
      const snap = await getDoc(doc(db, "campeoes", campeaoEditandoId));
      if (!snap.exists()) return;
      fotoUrl = snap.data().fotoUrl;
    }

    await updateDoc(doc(db, "campeoes", campeaoEditandoId), {
      clubeNome,
      fotoUrl,
      descricao
    });

    campeaoEditandoId = null;
    document.getElementById("input-clube-campeao").value = "";
    document.getElementById("input-descricao-campeao").value = "";
    fileInput.value = "";
    const preview = document.getElementById("preview-foto");
    preview.classList.add("hidden");
    preview.innerHTML = "";
    document.getElementById("btn-guardar-campeao").innerHTML = '<i class="fas fa-save"></i> Guardar Campeão';
    alert("Campeão actualizado com sucesso!");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("upload_preset", "kj7uiiza");
  formData.append("folder", "powerplay/campeoes");

  const res = await fetch("https://api.cloudinary.com/v1_1/dvtnowjdc/image/upload", {
    method: "POST",
    body: formData
  });
  const dados = await res.json();
  const fotoUrl = dados.secure_url;

  await addDoc(collection(db, "campeoes"), {
    playoffId: playoffActual.id,
    clubeNome,
    fotoUrl,
    descricao,
    ano: new Date().getFullYear(),
    criadoEm: new Date().toISOString(),
    destaque: false
  });

  await updateDoc(doc(db, "playoffs", playoffActual.id), { status: "terminado" });
  alert("Campeão registado com sucesso!");
}

function carregarListaCampeoes() {
  const container = document.getElementById("lista-campeoes-registados");
  if (!container) return;

  onSnapshot(collection(db, "campeoes"), (snap) => {
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = '<div class="empty-message">Nenhum campeão registado.</div>';
      return;
    }
    snap.forEach(d => {
      const c = d.data();
      const campeaoId = d.id;
      const div = document.createElement("div");
      div.className = "campeao-mini-card";
      div.innerHTML = `
        <img src="${c.fotoUrl}" alt="${c.clubeNome}" class="campeao-mini-foto">
        <div class="campeao-mini-info">
          <strong>${c.clubeNome}</strong>
          <span>${c.descricao || ""} — ${c.ano}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">
        <button class="btn-destaque ${c.destaque ? 'btn-destaque-activo' : ''}"
          data-id="${campeaoId}" data-destaque="${c.destaque ? 'true' : 'false'}">
          <i class="fas fa-star"></i>
          ${c.destaque ? 'Remover da Página Principal' : 'Mostrar na Página Principal'}
        </button>
        <button class="btn-acao btn-editar" data-id="${campeaoId}">
          <i class="fas fa-pen"></i> Editar
        </button>
        <button class="btn-acao btn-apagar" data-id="${campeaoId}">
          <i class="fas fa-trash"></i> Apagar
        </button>
        </div>`;
      container.appendChild(div);
    });

    container.querySelectorAll(".btn-destaque").forEach(btn => {
      btn.addEventListener("click", async () => {
        const campeaoId = btn.dataset.id;
        const destaqueActual = btn.dataset.destaque === "true";
        await updateDoc(doc(db, "campeoes", campeaoId), {
          destaque: !destaqueActual
        });
      });
    });

    container.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", () => editarCampeao(btn.dataset.id));
    });
    container.querySelectorAll(".btn-apagar").forEach(btn => {
      btn.addEventListener("click", () => apagarCampeao(btn.dataset.id));
    });
  });
}

async function carregarPlayoff(playoffId) {
  const snap = await getDoc(doc(db, "playoffs", playoffId));
  if (!snap.exists()) return;
  playoffActual = { id: snap.id, ...snap.data() };

  const buttons = ["btn-participantes", "btn-resultados-inserir", "btn-resultados-ver", "btn-campeao"];
  buttons.forEach(id => document.getElementById(id).disabled = false);

  mostrarEcra("resultados-inserir");
  carregarConfrontosInserir();
  carregarConfrontosVer();
}
