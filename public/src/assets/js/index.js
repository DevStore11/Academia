// =======================================
// IMPORTAÇÕES FIREBASE
// =======================================
import { db } from "./firebaseConfig.js";
import {
  collection,
  onSnapshot,
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// =======================================
// CACHE DOS SNAPSHOTS
// =======================================
let ultimasLigas = null;
let ultimosConfrontos = null;

// =======================================
// RECALCULAR QUANDO OS DADOS MUDAM
// =======================================
function recalcularTabelas() {
  if (!ultimasLigas || !ultimosConfrontos) return;

  atualizarTabelas(ultimasLigas, ultimosConfrontos).then((tabelaMap) => {
    carregarLigas(ultimasLigas).then(ligas => {
      carregarTabelas(ligas, tabelaMap);
      ativarFiltros();
    });
  });
}

// =======================================
// ATUALIZAR TABELAS NO FIRESTORE
// Recalcula pontos/gols com base nos confrontos,
// salva no Firestore e RETORNA os dados calculados
// para evitar race condition na leitura posterior.
// Agora recebe os docs dos snapshots em vez de chamar getDocs.
// =======================================
export async function atualizarTabelas(ligasDocs, confrontosDocs) {
  const tabelaMap = {}; // { [ligaId]: clubes[] }
  const escritas = []; // promessas de setDoc para executar em paralelo

  for (const ligaDoc of ligasDocs) {
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

    confrontosDocs.forEach((cDoc) => {
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
async function carregarLigas(ligasDocs) {
  const ligas = [];

  ligasDocs.forEach((ligaDoc) => {
    if (ligaDoc.data().visivel === false) return;
    ligas.push({ id: ligaDoc.id, nome: ligaDoc.data().nome });
  });

  // Filtros das TABELAS
  const filtroTabelas = document.getElementById("filtros-ligas");
  if (filtroTabelas) {
    filtroTabelas.innerHTML = "";

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
                  <td><a href="/src/pages/clube.html?liga=${liga.id}&clube=${encodeURIComponent(c.nome)}" class="clube-link">${c.nome}</a></td>
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
// CARREGAR CAMPEÃO EM DESTAQUE
// =======================================
function carregarCampeaoDestaque() {
  const section = document.getElementById("campeao-destaque-section");
  const content = document.getElementById("campeao-destaque-content");
  if (!section || !content) return;

  onSnapshot(collection(db, "campeoes"), (snap) => {
    const emDestaque = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.destaque === true);

    if (emDestaque.length === 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "block";
    content.innerHTML = "";
    emDestaque.forEach(c => {
      content.innerHTML += `
        <div class="campeao-destaque-card">
          <div class="campeao-destaque-foto-wrap">
            <img src="${c.fotoUrl}" alt="${c.clubeNome}" class="campeao-destaque-foto">
            <div class="campeao-destaque-overlay"></div>
          </div>
          <div class="campeao-destaque-info">
            <span class="campeao-destaque-ano">${c.ano}</span>
            <h2 class="campeao-destaque-nome">${c.clubeNome}</h2>
            <p class="campeao-destaque-desc">${c.descricao}</p>
            <span class="campeao-destaque-badge">
              <i class="fas fa-trophy"></i> CAMPEÃO
            </span>
          </div>
        </div>`;
    });
  });
}

// =======================================
// CARREGAR CONFRONTOS EM DESTAQUE
// =======================================
function carregarConfrontosDestaque() {
  const section = document.getElementById("confrontos-destaque-section");
  const container = document.getElementById("lista-confrontos-destaque");
  if (!section || !container) return;

  onSnapshot(collection(db, "playoff_confrontos"), (snap) => {
    const emDestaque = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.destaque === true);

    if (emDestaque.length === 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "block";
    container.innerHTML = "";
    emDestaque.forEach(d => {
      const c = d;
      const terminado = c.estado === "terminado";
      container.innerHTML += `
        <div class="confronto-destaque-card">
          <div class="confronto-destaque-equipas">
            <span class="confronto-destaque-clube">${c.casa}</span>
            <span class="confronto-destaque-resultado">
              ${terminado
                ? `${c.agregado_casa} — ${c.agregado_fora}`
                : `<span class="confronto-destaque-vs">VS</span>`}
            </span>
            <span class="confronto-destaque-clube">${c.fora}</span>
          </div>
          ${terminado
            ? `<div class="confronto-destaque-vencedor">
                 <i class="fas fa-trophy"></i> ${c.vencedor}
               </div>`
            : `<div class="confronto-destaque-pendente">Por Realizar</div>`}
        </div>`;
    });
  });
}

// =======================================
// INICIALIZAÇÃO
// Usa onSnapshot em vez de getDocs para atualização
// em tempo real sempre que ligas ou confrontos mudam.
// =======================================
document.addEventListener("DOMContentLoaded", () => {
  onSnapshot(collection(db, "ligas"), (snapshot) => {
    ultimasLigas = snapshot.docs;
    recalcularTabelas();
  });

  onSnapshot(collection(db, "confrontos"), (snapshot) => {
    ultimosConfrontos = snapshot.docs;
    recalcularTabelas();
  });

  carregarCampeaoDestaque();
  carregarConfrontosDestaque();
});