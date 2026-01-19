// ============================
// Importações do Firebase
// ============================
import { db } from './firebaseConfig.js';
import { collection, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// ============================
// Função principal
// ============================
document.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");

    // Verifica login
    if (!username) {
        alert("Por favor, faça login primeiro!");
        window.location.href = "login.html";
        return;
    }

    // Exibe o nome do usuário
    document.getElementById("user-name").textContent = username;

    // Inicializa menu hamburger
    initHamburgerMenu();

    // Carrega estatísticas, ligas e próximos jogos
    await carregarEstatisticas(username);
    await carregarLigas(username);
    await carregarProximosJogos(username);
});

// ============================
// Hamburger menu
// ============================
function initHamburgerMenu() {
    const botao = document.getElementById("botaoHamburguer");
    const menu = document.getElementById("menuMobile");

    botao.addEventListener("click", () => {
        if (menu.style.display === "flex") {
            menu.style.display = "none";
        } else {
            menu.style.display = "flex";
            menu.style.flexDirection = "column";
        }
    });
}

// ============================
// Estatísticas do jogador
// ============================
async function carregarEstatisticas(username) {
    const statsDiv = document.getElementById("stats");

    const confrontosSnap = await getDocs(collection(db, "confrontos"));
    let jogos = 0, vitorias = 0, empates = 0, derrotas = 0, golsMarcados = 0, golsSofridos = 0;

    confrontosSnap.forEach(doc => {
        const c = doc.data();
        if (c.casa === username || c.fora === username) {
            jogos++;
            if (!c.resultado || c.resultado === "0 - 0") return;

            const [golsCasa, golsFora] = c.resultado.split(" - ").map(Number);

            if (c.casa === username) {
                golsMarcados += golsCasa;
                golsSofridos += golsFora;
                if (golsCasa > golsFora) vitorias++;
                else if (golsCasa === golsFora) empates++;
                else derrotas++;
            } else {
                golsMarcados += golsFora;
                golsSofridos += golsCasa;
                if (golsFora > golsCasa) vitorias++;
                else if (golsFora === golsCasa) empates++;
                else derrotas++;
            }
        }
    });

    // Atualiza cards individuais
    statsDiv.querySelector("#vitorias").textContent = vitorias;
    statsDiv.querySelector("#empates").textContent = empates;
    statsDiv.querySelector("#derrotas").textContent = derrotas;
    statsDiv.querySelector("#golos").textContent = golsMarcados;
}

// ============================
// Ligas do jogador
// ============================
async function carregarLigas(username) {
    const ligasDiv = document.getElementById("ligas");
    ligasDiv.innerHTML = "<h2 class='section-title'>Ligas e Classificações</h2>";

    const ligasSnap = await getDocs(collection(db, "ligas"));

    for (const ligaDoc of ligasSnap.docs) {
        const liga = ligaDoc.data();
        if (liga.clubes && liga.clubes.includes(username)) {
            const tabelasSnap = await getDocs(collection(db, "tabelas"));
            const tabelaData = tabelasSnap.docs.find(t => t.data().liga_id === ligaDoc.id)?.data();

            let tabelaHTML = `
                <div class="liga-card">
                    <h3>${liga.nome}</h3>
                    <table class="liga-tabela">
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th>Clube</th>
                                <th>J</th>
                                <th>V</th>
                                <th>E</th>
                                <th>D</th>
                                <th>GM</th>
                                <th>GS</th>
                                <th>SG</th>
                                <th>Pts</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (tabelaData && tabelaData.clubes) {
                const clubesOrdenados = tabelaData.clubes.sort((a,b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols);
                clubesOrdenados.forEach((c,index) => {
                    tabelaHTML += `
                        <tr ${c.nome === username ? 'style="background-color:#ffcc00; font-weight:bold;"' : ''}>
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
                        </tr>
                    `;
                });
            } else {
                tabelaHTML += `<tr><td colspan="10">Sem dados disponíveis</td></tr>`;
            }

            tabelaHTML += `</tbody></table></div>`;
            ligasDiv.innerHTML += tabelaHTML;
        }
    }
}

// ============================
// Próximos jogos (últimos 7 dias)
// ============================
async function carregarProximosJogos(username) {
    const cardsDiv = document.getElementById("cards-proximos-jogos");
    cardsDiv.innerHTML = "";

    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);

    const confrontosSnap = await getDocs(collection(db, "confrontos"));
    
    confrontosSnap.forEach(doc => {
        const c = doc.data();
        if (!c.data) return;

        const dataJogo = new Date(c.data);
        if (dataJogo >= seteDiasAtras && (c.casa === username || c.fora === username)) {
            const card = document.createElement("div");
            card.classList.add("card-jogo");
            card.innerHTML = `
                <h3>${c.casa} vs ${c.fora}</h3>
                <p><strong>Data:</strong> ${dataJogo.toLocaleDateString()}</p>
                <p><strong>Hora:</strong> ${c.hora || '-'}</p>
                <p><strong>Resultado:</strong> ${c.resultado || 'Pendente'}</p>
            `;
            cardsDiv.appendChild(card);
        }
    });
}
