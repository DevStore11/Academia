// =======================================
// IMPORTAÇÕES FIREBASE
// =======================================
import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  query,
  where,
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// =======================================
// ATUALIZAR TABELAS NO FIRESTORE
// Recalcula pontos/gols com base nos confrontos e salva
// =======================================
export async function atualizarTabelas() {
  const ligasSnap = await getDocs(collection(db, "ligas"));
  const confrontosSnap = await getDocs(collection(db, "confrontos"));

  for (const ligaDoc of ligasSnap.docs) {
    const ligaId = ligaDoc.id;
    const liga = ligaDoc.data();

    // Inicializar estatísticas de cada clube
    let tabela = (liga.clubes || []).map((clube) => ({
      nome: clube,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      gols_marcados: 0,
      gols_sofridos: 0,
      saldo_gols: 0,
      pontos: 0,
    }));

    // Processar confrontos desta liga
    confrontosSnap.forEach((cDoc) => {
      const c = cDoc.data();
      if (c.liga_id !== ligaId || !c.resultado) return;

      const [gCasa, gFora] = c.resultado.split(" - ").map(Number);
      const idxCasa = tabela.findIndex((cl) => cl.nome === c.casa);
      const idxFora = tabela.findIndex((cl) => cl.nome === c.fora);

      if (idxCasa < 0 || idxFora < 0) return;

      // Jogos e gols
      tabela[idxCasa].jogos++;
      tabela[idxFora].jogos++;
      tabela[idxCasa].gols_marcados += gCasa;
      tabela[idxCasa].gols_sofridos += gFora;
      tabela[idxCasa].saldo_gols =
        tabela[idxCasa].gols_marcados - tabela[idxCasa].gols_sofridos;
      tabela[idxFora].gols_marcados += gFora;
      tabela[idxFora].gols_sofridos += gCasa;
      tabela[idxFora].saldo_gols =
        tabela[idxFora].gols_marcados - tabela[idxFora].gols_sofridos;

      // Pontos
      if (gCasa > gFora) {
        tabela[idxCasa].vitorias++;
        tabela[idxCasa].pontos += 3;
        tabela[idxFora].derrotas++;
      } else if (gCasa < gFora) {
        tabela[idxFora].vitorias++;
        tabela[idxFora].pontos += 3;
        tabela[idxCasa].derrotas++;
      } else {
        tabela[idxCasa].empates++;
        tabela[idxFora].empates++;
        tabela[idxCasa].pontos++;
        tabela[idxFora].pontos++;
      }
    });

    // Guardar tabela calculada no Firestore
    await setDoc(doc(db, "tabelas", ligaId), {
      liga_id: ligaId,
      clubes: tabela,
    });
  }
}

// =======================================
// CARREGAR LIGAS E GERAR BOTÕES DE FILTRO
// =======================================
async function carregarLigas() {
  const ligasSnap = await getDocs(collection(db, "ligas"));
  // HTML usa id="filtros-ligas" + class="league-filters"
  const filtrosContainer = document.getElementById("filtros-ligas");
  filtrosContainer.innerHTML = "";

  const ligas = [];

  ligasSnap.forEach((ligaDoc) => {
    const liga = ligaDoc.data();
    ligas.push({ id: ligaDoc.id, nome: liga.nome });

    const btn = document.createElement("button");
    btn.classList.add("filter-btn");
    btn.dataset.league = ligaDoc.id;
    btn.innerText = liga.nome;
    filtrosContainer.appendChild(btn);
  });

  // Botão "Todas as Ligas" no início
  const allBtn = document.createElement("button");
  allBtn.classList.add("filter-btn", "active");
  allBtn.dataset.league = "all";
  allBtn.innerText = "Todas as Ligas";
  filtrosContainer.prepend(allBtn);

  return ligas;
}

// =======================================
// DETERMINAR CLASSE DE POSIÇÃO NA TABELA
// =======================================
function getPosicaoClasse(index, total) {
  if (index === 0) return { row: "champion-row", pos: "position-1" };
  if (index >= 1 && index <= 3)
    return { row: "europe-row", pos: `position-${index + 1}` };
  if (index >= total - 4)
    return { row: "relegation-row", pos: "position-relegation" };
  return { row: "", pos: "position-normal" };
}

// =======================================
// CARREGAR E RENDERIZAR TABELAS POR LIGA
// =======================================
async function carregarTabelas(ligas) {
  const container = document.getElementById("todas-tabelas");
  container.innerHTML = `
        <div class='loading-tables'>
            <div class='loader'></div>
            <p>Carregando tabelas...</p>
        </div>`;

  const tabelasSnap = await getDocs(collection(db, "tabelas"));
  container.innerHTML = "";

  ligas.forEach((liga) => {
    const tabelaDoc = tabelasSnap.docs.find(
      (d) => d.data().liga_id === liga.id,
    );
    const clubes = tabelaDoc
      ? tabelaDoc
          .data()
          .clubes.sort(
            (a, b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols,
          )
      : [];

    const tabelaEl = document.createElement("div");
    tabelaEl.classList.add("league-table");
    tabelaEl.dataset.league = liga.id;

    const linhas =
      clubes.length > 0
        ? clubes
            .map((c, i) => {
              const { row, pos } = getPosicaoClasse(i, clubes.length);
              return `
                    <tr class="${row}">
                        <td><span class="position-indicator ${pos}">${i + 1}</span></td>
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
            })
            .join("")
        : `<tr><td colspan="10">Nenhum dado disponível</td></tr>`;

    tabelaEl.innerHTML = `
            <div class="table-container">
                <header><h2>${liga.nome}</h2></header>
                <table>
                    <thead>
                        <tr>
                            <th>Pos</th><th>Clube</th><th>J</th><th>V</th>
                            <th>E</th><th>D</th><th>GM</th><th>GS</th><th>SG</th><th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>`;

    container.appendChild(tabelaEl);
  });
}

// =======================================
// CARREGAR CONFRONTOS COM CARDS VISUAIS
// =======================================
async function carregarConfrontos(ligas) {
  const container = document.getElementById("lista-confrontos");
  container.innerHTML = `
        <div class='loading-matches'>
            <div class='loader'></div>
            <p>Carregando confrontos...</p>
        </div>`;

  const confrontosSnap = await getDocs(collection(db, "confrontos"));
  const usuariosSnap = await getDocs(collection(db, "usuarios"));
  container.innerHTML = "";

  // Mapa de logos por nome de clube
  const clubesLogos = {};
  usuariosSnap.forEach((uDoc) => {
    const u = uDoc.data();
    if (u.nome) clubesLogos[u.nome] = u.logo || "";
  });

  ligas.forEach((liga) => {
    const ligaConfrontos = confrontosSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.liga_id === liga.id)
      .map((c) => {
        // Parsing correcto de data evitando problemas de timezone
        const [ano, mes, dia] = c.data.split("-").map(Number);
        const [hora, minuto] = c.hora.split(":").map(Number);
        c.dataHora = new Date(ano, mes - 1, dia, hora, minuto);
        return c;
      })
      .sort((a, b) => a.dataHora - b.dataHora);

    if (ligaConfrontos.length === 0) return;

    const ligaContainer = document.createElement("div");
    ligaContainer.classList.add("league-matches");
    ligaContainer.dataset.league = liga.id;

    // Cabeçalho clicável (accordion)
    const cabecalho = document.createElement("div");
    cabecalho.classList.add("cabecalho-liga");
    cabecalho.innerHTML = `<h3>${liga.nome}</h3><span class="toggle-icon">▼</span>`;

    // Lista de jogos (aberta por padrão)
    const listaJogos = document.createElement("div");
    listaJogos.classList.add("lista-jogos");

    cabecalho.addEventListener("click", () => {
      const aberto = listaJogos.style.display !== "none";
      listaJogos.style.display = aberto ? "none" : "block";
      cabecalho.classList.toggle("liga-fechada", aberto);
    });

    ligaConfrontos.forEach((match) => {
      const dataFormatada = match.dataHora.toLocaleDateString("pt-MZ", {
        day: "2-digit",
        month: "short",
      });
      const horaFormatada = match.dataHora.toLocaleTimeString("pt-MZ", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Resultado ou VS
      let vsHtml = `<span class="vs-badge">VS</span>`;
      if (match.resultado && match.resultado.includes("-")) {
        const [gCasa, gFora] = match.resultado.split(" - ").map(Number);
        if (!isNaN(gCasa) && !isNaN(gFora)) {
          vsHtml = `<span class="score">${gCasa} - ${gFora}</span>`;
        }
      }

      const logosCasa = clubesLogos[match.casa]
        ? `<img src="${clubesLogos[match.casa]}" alt="${match.casa}" class="team-logo">`
        : "";
      const logosFora = clubesLogos[match.fora]
        ? `<img src="${clubesLogos[match.fora]}" alt="${match.fora}" class="team-logo">`
        : "";

      const statusClass = match.resultado ? "jogo-realizado" : "jogo-pendente";

      listaJogos.insertAdjacentHTML(
        "beforeend",
        `
                <div class="match-card ${statusClass}">
                    <div class="match-header">
                        <span class="league-badge">${liga.nome}</span>
                        <span class="match-date">
                            <i class="far fa-calendar-alt"></i> ${dataFormatada} • ${horaFormatada}
                        </span>
                    </div>
                    <div class="teams">
                        <div class="team">
                            ${logosCasa}
                            <span class="team-name">${match.casa}</span>
                        </div>
                        <div class="vs">${vsHtml}</div>
                        <div class="team">
                            <span class="team-name">${match.fora}</span>
                            ${logosFora}
                        </div>
                    </div>
                    <div class="match-info">
                        <span><i class="fas fa-map-marker-alt"></i> ${match.estadio || "Não definido"}</span>
                        <button class="btn-notify" data-match="${liga.nome}-${match.casa}-${match.fora}">
                            <i class="fas fa-bell"></i> Lembrar
                        </button>
                    </div>
                </div>
            `,
      );
    });

    ligaContainer.appendChild(cabecalho);
    ligaContainer.appendChild(listaJogos);
    container.appendChild(ligaContainer);
  });
}

// =======================================
// FILTROS POR LIGA
// =======================================
function ativarFiltros() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const leagueId = btn.dataset.league;

      document.querySelectorAll(".league-table").forEach((t) => {
        t.style.display =
          leagueId === "all" || t.dataset.league === leagueId
            ? "block"
            : "none";
      });

      document.querySelectorAll(".league-matches").forEach((m) => {
        m.style.display =
          leagueId === "all" || m.dataset.league === leagueId
            ? "block"
            : "none";
      });
    });
  });
}

// =======================================
// INICIALIZAÇÃO
// =======================================
document.addEventListener("DOMContentLoaded", async () => {
  await atualizarTabelas(); // Recalcular e salvar tabelas no Firestore
  const ligas = await carregarLigas(); // Carregar ligas e filtros
  await carregarTabelas(ligas); // Renderizar tabelas
  await carregarConfrontos(ligas); // Renderizar confrontos
  ativarFiltros(); // Activar filtros por liga
});
