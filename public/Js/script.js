import { db } from './firebaseConfig.js';
import { collection, getDocs, query, where, setDoc, doc } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// ==========================
// Atualizar tabela da liga
// ==========================
export async function atualizarTabelas() {
    const ligasSnap = await getDocs(collection(db, "ligas"));
    
    for (const ligaDoc of ligasSnap.docs) {
        const ligaId = ligaDoc.id;
        const liga = ligaDoc.data();

        // Inicializar clubes na tabela
        let tabela = (liga.clubes || []).map(clube => ({
            nome: clube,
            jogos: 0,
            vitorias: 0,
            empates: 0,
            derrotas: 0,
            gols_marcados: 0,
            gols_sofridos: 0,
            saldo_gols: 0,
            pontos: 0
        }));

        // Buscar confrontos desta liga com resultados
        const confrontosSnap = await getDocs(collection(db, "confrontos"));
        confrontosSnap.forEach(cDoc => {
            const c = cDoc.data();
            if (c.liga_id === ligaId && c.resultado) {
                const [gCasa, gFora] = c.resultado.split(" - ").map(Number);
                const idxCasa = tabela.findIndex(cl => cl.nome === c.casa);
                const idxFora = tabela.findIndex(cl => cl.nome === c.fora);

                if (idxCasa >= 0 && idxFora >= 0) {
                    // Atualizar jogos
                    tabela[idxCasa].jogos++;
                    tabela[idxFora].jogos++;

                    // Atualizar gols
                    tabela[idxCasa].gols_marcados += gCasa;
                    tabela[idxCasa].gols_sofridos += gFora;
                    tabela[idxCasa].saldo_gols = tabela[idxCasa].gols_marcados - tabela[idxCasa].gols_sofridos;

                    tabela[idxFora].gols_marcados += gFora;
                    tabela[idxFora].gols_sofridos += gCasa;
                    tabela[idxFora].saldo_gols = tabela[idxFora].gols_marcados - tabela[idxFora].gols_sofridos;

                    // Atualizar vitórias, empates, derrotas e pontos
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
                }
            }
        });

        // Salvar/atualizar tabela no Firestore
        await setDoc(doc(db, "tabelas", ligaId), { liga_id: ligaId, clubes: tabela });
    }
}

// ==========================
// Mostrar tabelas no index.html
// ==========================
export async function carregarTabelas() {
    const todasTabelasDiv = document.getElementById("todas-tabelas");
    todasTabelasDiv.innerHTML = "";

    const ligasSnap = await getDocs(collection(db, "ligas"));
    for (const ligaDoc of ligasSnap.docs) {
        const ligaId = ligaDoc.id;
        const liga = ligaDoc.data();

        const tabelaSnap = await getDocs(query(collection(db, "tabelas"), where("liga_id", "==", ligaId)));
        const tabelaData = tabelaSnap.empty ? null : tabelaSnap.docs[0].data();

        // Container da tabela
        let tabelaHTML = `
            <div class="table-container">
                <header>
                    <h2>${liga.nome}</h2>
                </header>
                <table class="league-table">
                    <thead>
                        <tr>
                            <th>Pos</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th>
                            <th>GM</th><th>GS</th><th>SG</th><th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (tabelaData && tabelaData.clubes) {
            const clubes = tabelaData.clubes.sort((a, b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols);

            clubes.forEach((c, index) => {
                // Determinar classes de linha e posição
                let rowClass = "";
                let posClass = "";

                if (index === 0) { // campeão
                    rowClass = "champion-row";
                    posClass = "position-1";
                } else if (index >= 1 && index <= 3) { // zona europeia (2º a 4º)
                    rowClass = "europe-row";
                    posClass = `position-${index+1}`;
                } else if (index >= clubes.length - 4) { // despromoção
                    rowClass = "relegation-row";
                    posClass = "position-relegation";
                } else {
                    rowClass = "";
                    posClass = "position-normal";
                }

                tabelaHTML += `
                    <tr class="${rowClass}">
                        <td><span class="position-indicator ${posClass}">${index + 1}</span></td>
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
            tabelaHTML += `<tr><td colspan="10">Nenhum dado disponível</td></tr>`;
        }

        tabelaHTML += `</tbody></table></div>`;
        todasTabelasDiv.innerHTML += tabelaHTML;
    }
}
// ==========================
// Mostrar confrontos por liga (somente ligas com jogos)
// ==========================
export async function carregarConfrontosPorLiga() {
    const container = document.getElementById("lista-confrontos");
    container.innerHTML = "";

    // Buscar ligas
    const ligasSnap = await getDocs(collection(db, "ligas"));

    // Buscar confrontos
    const confrontosSnap = await getDocs(collection(db, "confrontos"));

    // Agrupar confrontos por liga
    const confrontosPorLiga = {};
    confrontosSnap.forEach(doc => {
        const c = doc.data();
        if (!confrontosPorLiga[c.liga_id]) {
            confrontosPorLiga[c.liga_id] = [];
        }

        // Criar objeto Date correto combinando data + hora
        const [ano, mes, dia] = c.data.split("-").map(Number);
        const [hora, minuto] = c.hora.split(":").map(Number);
        const dataJogo = new Date(ano, mes - 1, dia, hora, minuto); // mês 0-index
        c.dataHora = dataJogo;

        confrontosPorLiga[c.liga_id].push(c);
    });

    // Renderizar apenas ligas com confrontos
    ligasSnap.forEach(ligaDoc => {
        const ligaId = ligaDoc.id;
        const liga = ligaDoc.data();
        let confrontos = confrontosPorLiga[ligaId];

        if (!confrontos || confrontos.length === 0) return;

        // 🔹 Ordenar por data crescente
        confrontos.sort((a, b) => a.dataHora - b.dataHora);

        const blocoLiga = document.createElement("div");
        blocoLiga.classList.add("bloco-liga");

        // Cabeçalho clicável
        const cabecalhoLiga = document.createElement("div");
        cabecalhoLiga.classList.add("cabecalho-liga");
        cabecalhoLiga.textContent = liga.nome;

        // Lista de confrontos (fechada por padrão)
        const listaJogos = document.createElement("div");
        listaJogos.classList.add("lista-jogos");
        listaJogos.style.display = "none";

        confrontos.forEach(c => {
            let texto = c.resultado
                ? `${c.casa} ${c.resultado} ${c.fora}`
                : `${c.casa} vs ${c.fora}`;

            // Formatar data + hora corretamente
            const dataFormatada = c.dataHora.toLocaleDateString('pt-MZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const jogo = document.createElement("div");
            jogo.classList.add(
                "cartao-confronto",
                c.resultado ? "jogo-realizado" : "jogo-pendente"
            );
            jogo.innerHTML = `<span class="texto-jogo">${texto}</span> <span class="data-jogo">${dataFormatada}</span>`;

            listaJogos.appendChild(jogo);
        });

        // Toggle ao clicar na liga
        cabecalhoLiga.addEventListener("click", () => {
            const aberto = listaJogos.style.display === "block";
            listaJogos.style.display = aberto ? "none" : "block";
            cabecalhoLiga.classList.toggle("liga-aberta", !aberto);
        });

        blocoLiga.appendChild(cabecalhoLiga);
        blocoLiga.appendChild(listaJogos);
        container.appendChild(blocoLiga);
    });
}

// ==========================
// Inicialização
// ==========================
document.addEventListener('DOMContentLoaded', async () => {
    await atualizarTabelas();
    await carregarTabelas();
      await carregarConfrontosPorLiga();
});
