// ============================
// Importações do Firebase
// ============================
import { auth, db } from './firebaseConfig.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// ============================
// Função principal
// ============================
document.addEventListener("DOMContentLoaded", async () => {
    const userId = localStorage.getItem("user_id");

    // Verifica login
    if (!userId) {
        alert("Por favor, faça login primeiro!");
        window.location.href = "login.html";
        return;
    }

    // Pega dados completos do Firestore
    const docRef = doc(db, "usuarios", userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        alert("Dados do usuário não encontrados. Faça login novamente.");
        window.location.href = "login.html";
        return;
    }

    const usuario = docSnap.data();

    // Exibe nome e outros dados do usuário
    document.getElementById("user-name").textContent = usuario.nome || "-";
    document.getElementById("user-email").textContent = usuario.email || "-";
    document.getElementById("user-role").textContent = usuario.role || "-";
    document.getElementById("user-bairro").textContent = usuario.bairro || "-";
    document.getElementById("user-idade").textContent = usuario.idade || "-";

    // Inicializa menu hamburger
    initHamburgerMenu();

    // Carrega estatísticas, ligas e próximos jogos
    await carregarEstatisticas(usuario.nome);
    await carregarLigas(usuario.nome);
    await carregarProximosJogos(usuario.nome);
});

// ============================
// Hamburger menu
// ============================
function initHamburgerMenu() {
    const botao = document.getElementById("botaoHamburguer");
    const menu = document.getElementById("menuMobile");

    botao.addEventListener("click", () => {
        menu.style.display = menu.style.display === "flex" ? "none" : "flex";
        menu.style.flexDirection = "column";
    });
}

// ============================
// Estatísticas do jogador
// ============================
async function carregarEstatisticas(nomeClube) {
    const statsDiv = document.getElementById("stats");

    const confrontosSnap = await getDocs(collection(db, "confrontos"));
    let jogos = 0, vitorias = 0, empates = 0, derrotas = 0, golsMarcados = 0, golsSofridos = 0;

    confrontosSnap.forEach(doc => {
        const c = doc.data();
        if (c.casa === nomeClube || c.fora === nomeClube) {
            jogos++;
            if (!c.golos_casa && !c.golos_fora) return;

            const golsCasa = Number(c.golos_casa) || 0;
            const golsFora = Number(c.golos_fora) || 0;

            if (c.casa === nomeClube) {
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
async function carregarLigas(nomeClube) {
    const ligasDiv = document.getElementById("ligas");
    ligasDiv.innerHTML = "<h2 class='section-title'>Ligas e Classificações</h2>";

    const ligasSnap = await getDocs(collection(db, "ligas"));

    for (const ligaDoc of ligasSnap.docs) {
        const liga = ligaDoc.data();
        if (liga.clubes && liga.clubes.includes(nomeClube)) {
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

            if (tabelaData?.clubes) {
                const clubesOrdenados = tabelaData.clubes.sort((a,b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols);
                clubesOrdenados.forEach((c,index) => {
                    tabelaHTML += `
                        <tr ${c.nome === nomeClube ? 'style="background-color:#ffcc00; font-weight:bold;"' : ''}>
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
// Próximos jogos
// ============================
async function carregarProximosJogos(nomeClube) {
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
        if (dataJogo >= seteDiasAtras && (c.casa === nomeClube || c.fora === nomeClube)) {
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
