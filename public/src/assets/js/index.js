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
// Recalcula pontos/gols com base nos confrontos,
// salva no Firestore e RETORNA os dados calculados
// para evitar race condition na leitura posterior.
// =======================================
export async function atualizarTabelas() {
  const ligasSnap = await getDocs(collection(db, "ligas"));
  const confrontosSnap = await getDocs(collection(db, "confrontos"));

  const tabelaMap = {}; // { [ligaId]: clubes[] }
  const escritas = []; // promessas de setDoc para executar em paralelo

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

      // Ignora confrontos de outra liga ou que não estejam terminados
      if (c.liga_id !== ligaId || c.estado !== "terminado") return;

      // Lê golos dos campos individuais (igual ao admin.js)
      const gCasa = c.golos_casa;
      const gFora = c.golos_fora;

      // Validação defensiva
      if (typeof gCasa !== "number" || typeof gFora !== "number") return;

      const idxCasa = tabela.findIndex((cl) => cl.nome === c.casa);
      const idxFora = tabela.findIndex((cl) => cl.nome === c.fora);
      if (idxCasa < 0 || idxFora < 0) return;

      // Atualiza estatísticas
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

      // Pontuação
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

    // Guarda em memória para devolver ao caller
    tabelaMap[ligaId] = tabela;

    // Acumula escrita sem bloquear o loop
    escritas.push(
      setDoc(doc(db, "tabelas", ligaId), {
        liga_id: ligaId,
        clubes: tabela,
        atualizada_em: new Date().toISOString(),
      })
    );
  }

  // Garante que todas as escritas terminaram antes de prosseguir
  await Promise.all(escritas);

  // Devolve os dados frescos — evita segunda leitura do Firestore
  return tabelaMap;
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
  const zonaPromocao =
    total <= 6  ? 1 :
    total <= 10 ? 2 :
    total <= 14 ? 3 : 4;

  const zonaDescida =
    total <= 6  ? 1 :
    total <= 10 ? 2 :
    total <= 14 ? 3 : 4;

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
// Recebe tabelaMap direto — sem nova leitura do Firestore
// =======================================
async function carregarTabelas(ligas, tabelaMap) {
  const container = document.getElementById("todas-tabelas");
  if (!container) return;

  container.innerHTML = `
    <div class="loading-tables">
      <div class="loader"></div>
      <p>Carregando tabelas...</p>
    </div>`;

  // Cede o evento ao browser para o loader aparecer antes de renderizar
  await new Promise((r) => setTimeout(r, 0));

  container.innerHTML = "";

  ligas.forEach((liga) => {
    // Usa os dados calculados em memória (frescos, sem cache)
    const clubes = (tabelaMap[liga.id] || []).sort(
      (a, b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols
    );

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
// tabelaMap é passado direto para carregarTabelas,
// evitando race condition com a cache do Firestore.
// =======================================
document.addEventListener("DOMContentLoaded", async () => {
  const tabelaMap = await atualizarTabelas(); // calcula + salva + retorna dados frescos
  const ligas = await carregarLigas();        // carrega ligas e monta filtros
  await carregarTabelas(ligas, tabelaMap);    // renderiza com dados já em memória
  ativarFiltros();                            // ativa filtros por liga
});