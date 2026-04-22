// =======================================
// IMPORTAÇÕES FIREBASE
// =======================================
import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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

    confrontosSnap.forEach((cDoc) => {
      const c = cDoc.data();
      if (c.liga_id !== ligaId || !c.resultado) return;

      const [gCasa, gFora] = c.resultado.split(" - ").map(Number);
      const idxCasa = tabela.findIndex((cl) => cl.nome === c.casa);
      const idxFora = tabela.findIndex((cl) => cl.nome === c.fora);
      if (idxCasa < 0 || idxFora < 0) return;

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

    await setDoc(doc(db, "tabelas", ligaId), {
      liga_id: ligaId,
      clubes: tabela,
    });
  }
}

// =======================================
// CARREGAR LIGAS E GERAR BOTÕES DE FILTRO
// Apenas para as tabelas
// =======================================
async function carregarLigas() {
  const ligasSnap = await getDocs(collection(db, "ligas"));
  const ligas = [];

  ligasSnap.forEach((ligaDoc) => {
    ligas.push({ id: ligaDoc.id, nome: ligaDoc.data().nome });
  });

  // Filtros das TABELAS
  const filtroTabelas = document.getElementById("filtros-ligas");
  if (filtroTabelas) {
    filtroTabelas.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.classList.add("filter-btn", "active");
    allBtn.dataset.league = "all";
    allBtn.innerText = "Todas as Ligas";
    filtroTabelas.appendChild(allBtn);
    ligas.forEach((liga) => {
      const btn = document.createElement("button");
      btn.classList.add("filter-btn");
      btn.dataset.league = liga.id;
      btn.innerText = liga.nome;
      filtroTabelas.appendChild(btn);
    });
  }

  return ligas;
}

// =======================================
// DETERMINAR CLASSE DE POSIÇÃO NA TABELA
// Adapta zonas de promoção/descida ao total de clubes
// =======================================
function getPosicaoClasse(index, total) {
  // Zonas calculadas proporcionalmente
  const zonaPromocao = total <= 6  ? 1
                     : total <= 10 ? 2
                     : total <= 14 ? 3
                     : 4; // 15+ clubes → top 4

  const zonaDescida  = total <= 6  ? 1
                     : total <= 10 ? 2
                     : total <= 14 ? 3
                     : 4; // 15+ clubes → últimos 4

  // Campeão — destaque especial (sempre o 1º)
  if (index === 0) {
    return { row: "promotion-row champion-row", pos: "position-champion" };
  }

  // Zona de promoção
  if (index < zonaPromocao) {
    return { row: "promotion-row", pos: "position-top" };
  }

  // Zona de descida
  if (index >= total - zonaDescida) {
    return { row: "relegation-row", pos: "position-relegation" };
  }

  // Meio da tabela
  return { row: "", pos: "position-normal" };
}

// =======================================
// CARREGAR E RENDERIZAR TABELAS POR LIGA
// =======================================
async function carregarTabelas(ligas) {
  const container = document.getElementById("todas-tabelas");
  container.innerHTML = `
        <div class="loading-tables">
            <div class="loader"></div>
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
// FILTROS POR LIGA — apenas tabelas
// =======================================
function ativarFiltros() {
  document.getElementById("filtros-ligas")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document
      .querySelectorAll("#filtros-ligas .filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const leagueId = btn.dataset.league;
    document.querySelectorAll(".league-table").forEach((t) => {
      t.style.display =
        leagueId === "all" || t.dataset.league === leagueId ? "block" : "none";
    });
  });
}

// =======================================
// INICIALIZAÇÃO
// =======================================
document.addEventListener("DOMContentLoaded", async () => {
  await atualizarTabelas();
  const ligas = await carregarLigas();
  await carregarTabelas(ligas);
  ativarFiltros();
});