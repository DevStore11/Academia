import { db } from "./firebaseConfig.js";
import {
  collection,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const ligaId = params.get("liga");
  const nomeClube = decodeURIComponent(params.get("clube") || "");

  if (!ligaId || !nomeClube) {
    document.body.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Parâmetros inválidos — clube ou liga não especificados.</div>`;
    return;
  }

  const clubeNomeEl = document.getElementById("clube-nome");
  if (clubeNomeEl) clubeNomeEl.textContent = nomeClube;

  onSnapshot(doc(db, "tabelas", ligaId), (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    const clubes = data.clubes || [];
    const clubeData = clubes.find((c) => c.nome === nomeClube);

    if (!clubeData) {
      document.getElementById("stats-grid").innerHTML =
        `<div class="error-message">Clube não encontrado nesta liga.</div>`;
      return;
    }

    renderizarStats(clubeData);
  });

  onSnapshot(collection(db, "confrontos"), (snapshot) => {
    const todosConfrontos = snapshot.docs
      .map((d) => d.data())
      .filter(
        (c) =>
          c.liga_id === ligaId &&
          (c.casa === nomeClube || c.fora === nomeClube)
      );

    const realizados = todosConfrontos.filter((c) => c.estado === "terminado");
    const pendentes = todosConfrontos.filter((c) => c.estado !== "terminado");

    renderizarConfrontosRealizados(realizados, nomeClube);
    renderizarConfrontosPendentes(pendentes, nomeClube);
  });

  onSnapshot(doc(db, "ligas", ligaId), (snapshot) => {
    if (!snapshot.exists()) return;
    const ligaEl = document.getElementById("clube-liga");
    if (ligaEl) ligaEl.textContent = snapshot.data().nome;
  });
});

function renderizarStats(clube) {
  const grid = document.getElementById("stats-grid");
  if (!grid) return;

  const stats = [
    { label: "Jogos", value: clube.jogos, icon: "fa-futbol", color: "" },
    { label: "Vitórias", value: clube.vitorias, icon: "fa-trophy", color: "var(--success)" },
    { label: "Empates", value: clube.empates, icon: "fa-handshake", color: "var(--warning)" },
    { label: "Derrotas", value: clube.derrotas, icon: "fa-times-circle", color: "var(--danger)" },
    { label: "Golos Marcados", value: clube.gols_marcados, icon: "fa-arrow-up", color: "" },
    { label: "Golos Sofridos", value: clube.gols_sofridos, icon: "fa-arrow-down", color: "" },
    { label: "Saldo de Golos", value: clube.saldo_gols, icon: "fa-balance-scale", color: "" },
    { label: "Pontos", value: clube.pontos, icon: "fa-star", color: "var(--primary-green)" },
  ];

  grid.innerHTML = stats
    .map(
      (s) => `
      <div class="stat-card" ${s.color ? `style="--stat-color: ${s.color}"` : ""}>
        <div class="stat-icon"><i class="fas ${s.icon}"></i></div>
        <div class="stat-value" ${s.color ? `style="color: ${s.color}"` : ""}>${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>`
    )
    .join("");
}

function renderizarConfrontosRealizados(confrontos, nomeClube) {
  const container = document.getElementById("confrontos-realizados");
  if (!container) return;

  if (confrontos.length === 0) {
    container.innerHTML = `<p class="empty-message">Nenhum confronto realizado ainda.</p>`;
    return;
  }

  container.innerHTML = confrontos
    .map((c) => {
      const gCasa = c.golos_casa;
      const gFora = c.golos_fora;
      let classeResultado = "resultado-empate";

      if (gCasa > gFora) {
        classeResultado =
          c.casa === nomeClube ? "resultado-vitoria" : "resultado-derrota";
      } else if (gCasa < gFora) {
        classeResultado =
          c.casa === nomeClube ? "resultado-derrota" : "resultado-vitoria";
      }

      return `
      <div class="match-item ${classeResultado}">
        <span class="team-home">${c.casa}</span>
        <span class="score">${gCasa} — ${gFora}</span>
        <span class="team-away">${c.fora}</span>
      </div>`;
    })
    .join("");
}

function renderizarConfrontosPendentes(confrontos) {
  const container = document.getElementById("confrontos-pendentes");
  if (!container) return;

  if (confrontos.length === 0) {
    container.innerHTML = `<p class="empty-message">Nenhum confronto agendado.</p>`;
    return;
  }

  container.innerHTML = confrontos
    .map(
      (c) => `
      <div class="confronto-card confronto-pendente">
        <span class="confronto-equipas">${c.casa} <span class="confronto-vs">VS</span> ${c.fora}</span>
        <span class="confronto-badge">Por Realizar</span>
      </div>`
    )
    .join("");
}
