// ========================
// Importação Firebase
// ========================
import { db } from "./firebaseConfig.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } 
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ========================
// Sessão e Tabs
// ========================
document.addEventListener("DOMContentLoaded", async () => {
    const menuItems = document.querySelectorAll(".menu-item");
    const tabContents = document.querySelectorAll(".tab-content");

    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            menuItems.forEach(m => m.classList.remove("active"));
            item.classList.add("active");
            tabContents.forEach(t => t.classList.remove("active"));
            const tabId = item.getAttribute("data-tab");
            document.getElementById(tabId).classList.add("active");
            document.getElementById("pageTitle").textContent = item.querySelector("span").textContent;
        });
    });

    await carregarCampeonatos();
    await carregarClubesCheckboxes();
    atualizarClubesSelects();
});

// ========================
// Logout
// ========================
function logout() { 
  localStorage.clear();
  window.location.href = "login.html"; 
}

async function carregarCampeonatos() {
    const snapshot = await getDocs(collection(db, "campeonatos"));
    const tbody = document.querySelector("#tabelaCampeonatos tbody");
    const selectCampeonato = document.getElementById("select-campeonato");
    const selectConfrontos = document.getElementById("select-campeonato-confrontos");
    tbody.innerHTML = `<tr><td colspan="5">Carregando...</td></tr>`;

    let campeonatos = [];
    snapshot.forEach(docSnap => {
        const c = { id: docSnap.id, ref: docSnap.ref, ...docSnap.data() };
        campeonatos.push(c);
    });

    tbody.innerHTML = "";

    campeonatos.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${c.id}</td>
            <td>${c.nome}</td>
            <td>${c.clubes?.length || 0}</td>
            <td>${c.numMaos || 1}</td>
            <td><button class="btn-apagar">Apagar</button></td>
        `;
        // Adiciona o evento de apagar
        tr.querySelector(".btn-apagar").addEventListener("click", async () => {
            if (!confirm("Deseja apagar este campeonato?")) return;
            await deleteDoc(doc(db, "campeonatos", c.id));
            carregarCampeonatos(); // Recarrega a lista
        });
        tbody.appendChild(tr);
    });

    [selectCampeonato, selectConfrontos].forEach(sel => {
        sel.innerHTML = '<option value="">-- Selecione --</option>';
        campeonatos.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
    });
}


// Criar campeonato
document.getElementById("form-campeonato").addEventListener("submit", async e => {
    e.preventDefault();
    const nome = document.getElementById("nome-campeonato").value.trim();
    const num = parseInt(document.getElementById("num-participantes").value);
    const numMaos = parseInt(document.getElementById("num-maos").value);
    if (!nome || !num || !numMaos) return alert("Preencha todos os campos");
    await addDoc(collection(db, "campeonatos"), { nome, numParticipantes: num, numMaos, clubes: [], confrontos: [] });
    alert("Campeonato criado com sucesso!");
    e.target.reset();
    carregarCampeonatos();
});

// ========================
// Clubes
// ========================
async function carregarClubesCheckboxes() {
    const snapshot = await getDocs(collection(db, "usuarios"));
    const container = document.getElementById("clubes-checkboxes");
    container.innerHTML = "";
    snapshot.forEach(docSnap => {
        const c = { id: docSnap.id, ...docSnap.data() };
        container.innerHTML += `
            <div>
                <input type="checkbox" id="clube${c.id}" value="${c.username}">
                <label for="clube${c.id}">${c.username}</label>
            </div>
        `;
    });
}

// Adicionar clubes ao campeonato
document.getElementById("form-add-clubes").addEventListener("submit", async e => {
    e.preventDefault();
    const campeonatoId = document.getElementById("select-campeonato").value;
    if (!campeonatoId) return alert("Selecione um campeonato");
    const clubesSelecionados = Array.from(document.querySelectorAll("#clubes-checkboxes input:checked")).map(c => c.value);
    if (clubesSelecionados.length === 0) return alert("Selecione pelo menos 1 clube");

    await updateDoc(doc(db, "campeonatos", campeonatoId), { clubes: clubesSelecionados });
    alert("Clubes adicionados ao campeonato!");
    atualizarClubesSelects();
});

// ========================
// Atualizar selects para confrontos manuais
// ========================
async function atualizarClubesSelects() {
    const snap = await getDocs(collection(db, "campeonatos"));
    let campeonatos = [];
    snap.forEach(docSnap => campeonatos.push({ id: docSnap.id, ...docSnap.data() }));

    const selectCampeonato = document.getElementById("select-campeonato-confrontos");
    selectCampeonato.addEventListener("change", () => carregarClubesParaConfrontos(selectCampeonato.value));
}

async function carregarClubesParaConfrontos(campeonatoId) {
    const snap = await getDocs(collection(db, "campeonatos"));
    let campeonato = snap.docs.map(d => ({ id:d.id, ...d.data() })).find(c => c.id === campeonatoId);
    if (!campeonato || !campeonato.clubes) return;

    const selectCasa = document.getElementById("select-clube-casa");
    const selectFora = document.getElementById("select-clube-fora");
    selectCasa.innerHTML = '<option value="">Casa</option>';
    selectFora.innerHTML = '<option value="">Fora</option>';

    campeonato.clubes.forEach(clube => {
        selectCasa.innerHTML += `<option value="${clube}">${clube}</option>`;
        selectFora.innerHTML += `<option value="${clube}">${clube}</option>`;
    });

    carregarConfrontos(campeonatoId);
}

// ========================
// Marcar confronto manual
// ========================
document.getElementById("form-marcar-confronto").addEventListener("submit", async e => {
    e.preventDefault();
    const campeonatoId = document.getElementById("select-campeonato-confrontos").value;
    const fase = document.getElementById("select-fase").value;
    const casa = document.getElementById("select-clube-casa").value;
    const fora = document.getElementById("select-clube-fora").value;

    if (!campeonatoId || !fase || !casa || !fora) return alert("Preencha todos os campos do confronto");
    if (casa === fora) return alert("Casa e Fora não podem ser iguais");

    const snap = await getDocs(collection(db, "campeonatos"));
    let campeonatoDoc = snap.docs.map(d => ({ id:d.id, ref:d.ref, ...d.data() })).find(c => c.id === campeonatoId);

    if (!campeonatoDoc.confrontos) campeonatoDoc.confrontos = [];
    campeonatoDoc.confrontos.push({ fase, casa, fora, resultados: [], vencedor: null });

    await updateDoc(campeonatoDoc.ref, { confrontos: campeonatoDoc.confrontos });
    alert("Confronto adicionado!");
    carregarConfrontos(campeonatoId);
});

// ========================
// Carregar confrontos
// ========================
async function carregarConfrontos(campeonatoId) {
    const tbody = document.querySelector("#tabelaConfrontos tbody");
    tbody.innerHTML = "";
    const snap = await getDocs(collection(db, "campeonatos"));
    let campeonato = snap.docs.map(d => ({ id:d.id, ref:d.ref, ...d.data() })).find(c => c.id === campeonatoId);
    if (!campeonato || !campeonato.confrontos) return;

    const selectConfronto = document.getElementById("select-confronto");
    selectConfronto.innerHTML = '<option value="">-- Selecione --</option>';

    campeonato.confrontos.forEach((c, idx) => {
        const resultado = c.resultados.length > 0 ? c.resultados.join(", ") : "-";
        tbody.innerHTML += `<tr>
            <td>${c.fase}</td>
            <td>${c.casa} vs ${c.fora}</td>
            <td>${resultado}</td>
            <td>${c.vencedor || '-'}</td>
            <td>${campeonato.numMaos}</td>
            <td><button onclick="apagarConfronto('${campeonatoId}', ${idx})">Apagar</button></td>
        </tr>`;
        selectConfronto.innerHTML += `<option value="${idx}">${c.casa} vs ${c.fora}</option>`;
    });

    desenharTorneio(campeonato.confrontos, campeonato.numMaos);
}

// ========================
// Inserir resultados
// ========================
document.getElementById("form-resultado").addEventListener("submit", async e => {
    e.preventDefault();
    const campeonatoId = document.getElementById("select-campeonato-confrontos").value;
    const idx = parseInt(document.getElementById("select-confronto").value);
    const gCasa = parseInt(document.getElementById("golos-casa").value);
    const gFora = parseInt(document.getElementById("golos-fora").value);

    if (isNaN(idx) || isNaN(gCasa) || isNaN(gFora)) return alert("Preencha todos os campos");

    const snap = await getDocs(collection(db, "campeonatos"));
    let campeonato = snap.docs.map(d => ({ id:d.id, ref:d.ref, ...d.data() })).find(c => c.id === campeonatoId);
    if (!campeonato || !campeonato.confrontos) return;

    const confronto = campeonato.confrontos[idx];
    confronto.resultados.push(`${gCasa}-${gFora}`);

    // Calcular vencedor quando todas as mãos forem jogadas
    if (confronto.resultados.length === campeonato.numMaos) {
        const soma = confronto.resultados.reduce((acc, r) => {
            const [c, f] = r.split("-").map(Number);
            acc.casa += c;
            acc.fora += f;
            return acc;
        }, {casa:0, fora:0});
        confronto.vencedor = soma.casa >= soma.fora ? confronto.casa : confronto.fora;

        // Avançar vencedor para próxima fase
        const fasesOrdem = ["Oitavas","Quartas","Semis","Final"];
        const idxFase = fasesOrdem.indexOf(confronto.fase);
        if (idxFase < fasesOrdem.length - 1) {
            const proxFase = fasesOrdem[idxFase + 1];
            const proximoConfronto = campeonato.confrontos.find(c2 => c2.fase === proxFase && (!c2.casa || !c2.fora));
            if (proximoConfronto) {
                if (!proximoConfronto.casa) proximoConfronto.casa = confronto.vencedor;
                else if (!proximoConfronto.fora) proximoConfronto.fora = confronto.vencedor;
            }
        }
    }

    campeonato.confrontos[idx] = confronto;
    await updateDoc(campeonato.ref, { confrontos: campeonato.confrontos });

    alert("Resultado registrado!");
    carregarConfrontos(campeonatoId);
});

// ========================
// Apagar confronto
// ========================
window.apagarConfronto = async (campeonatoId, idx) => {
    if (!confirm("Deseja apagar este confronto?")) return;
    const snap = await getDocs(collection(db, "campeonatos"));
    let campeonato = snap.docs.map(d => ({ id:d.id, ref:d.ref, ...d.data() })).find(c => c.id === campeonatoId);
    if (!campeonato || !campeonato.confrontos) return;
    campeonato.confrontos.splice(idx, 1);
    await updateDoc(campeonato.ref, { confrontos: campeonato.confrontos });
    carregarConfrontos(campeonatoId);
};

// ========================
// Desenhar torneio
// ========================
function desenharTorneio(confrontos, numMaos) {
    const container = document.getElementById("torneio-container");
    container.innerHTML = "";

    // Agrupar confrontos por fase
    const fases = {};
    confrontos.forEach(c => {
        if (!fases[c.fase]) fases[c.fase] = [];
        fases[c.fase].push(c);
    });

    const ordemFases = ["Oitavas","Quartas","Semis","Final"];
    let grandeVencedor = null; // Para armazenar o vencedor da Final

    ordemFases.forEach(faseNome => {
        if (!fases[faseNome]) return;

        // Cabeçalho da fase
        const h3 = document.createElement("h3");
        h3.textContent = faseNome;
        h3.style.color = "#0b4a6f";
        h3.style.marginBottom = "12px";
        h3.style.fontSize = "24px";
        container.appendChild(h3);

        fases[faseNome].forEach(c => {
            const bloco = document.createElement("article");
            bloco.classList.add("resumo-confronto");
            bloco.style.marginBottom = "16px";

            // Equipa Casa
            const casaDiv = document.createElement("div");
            casaDiv.classList.add("resumo-equipa");
            const logoCasa = document.createElement("span");
            logoCasa.classList.add("logo-simples");
            logoCasa.textContent = c.casa[0];
            casaDiv.appendChild(logoCasa);
            const nomeCasa = document.createElement("div");
            const nomeCasaTxt = document.createElement("div");
            nomeCasaTxt.classList.add("nome-equipa");
            nomeCasaTxt.textContent = c.casa;
            nomeCasa.appendChild(nomeCasaTxt);
            casaDiv.appendChild(nomeCasa);
            bloco.appendChild(casaDiv);

            // Equipa Fora
            const foraDiv = document.createElement("div");
            foraDiv.classList.add("resumo-equipa");
            foraDiv.style.justifyContent = "flex-end";
            const nomeForaDiv = document.createElement("div");
            nomeForaDiv.style.textAlign = "right";
            const nomeForaTxt = document.createElement("div");
            nomeForaTxt.classList.add("nome-equipa");
            nomeForaTxt.textContent = c.fora;
            nomeForaDiv.appendChild(nomeForaTxt);
            foraDiv.appendChild(nomeForaDiv);
            const logoFora = document.createElement("span");
            logoFora.classList.add("logo-simples");
            logoFora.textContent = c.fora[0];
            foraDiv.appendChild(logoFora);

            // Soma dos resultados
            let somaCasa = 0, somaFora = 0;
            c.resultados.forEach(r => {
                const [gCasa, gFora] = r.split("-").map(Number);
                somaCasa += gCasa;
                somaFora += gFora;
            });

            // Resultado agregado
            const resultadoDiv = document.createElement("div");
            resultadoDiv.style.textAlign = "center";
            const placarResumo = document.createElement("div");
            placarResumo.classList.add("placar-resumo");
            placarResumo.textContent = c.resultados.length > 0 ? `${somaCasa} - ${somaFora}` : "-";
            resultadoDiv.appendChild(placarResumo);

            const estadoResumo = document.createElement("div");
            estadoResumo.classList.add("estado-resumo");
            if(c.resultados.length > 0) {
                const vencedor = somaCasa >= somaFora ? c.casa : c.fora;
                estadoResumo.textContent = faseNome === "Final" ? `FT — Grande Vencedor: ${vencedor}` : `FT — ${vencedor} avança`;
                if(faseNome === "Final") grandeVencedor = vencedor;
            } else {
                estadoResumo.textContent = "Confronto marcado";
            }
            resultadoDiv.appendChild(estadoResumo);

            bloco.appendChild(resultadoDiv);
            bloco.appendChild(foraDiv);

            // Resultados por mão
            let maosParaExibir = (faseNome === "Final") ? 1 : numMaos;
            for(let i = 0; i < maosParaExibir; i++) {
                const resultado = c.resultados[i] || "-";
                const p = document.createElement("p");
                p.style.marginTop = "6px";
                p.textContent = `Mão ${i+1}: ${c.casa} ${resultado} ${c.fora}`;
                bloco.appendChild(p);
            }

            container.appendChild(bloco);
        });
    });

    // Mostrar grande vencedor ao final do torneio
    if(grandeVencedor) {
        const vencedorDiv = document.createElement("div");
        vencedorDiv.style.marginTop = "20px";
        vencedorDiv.style.padding = "20px";
        vencedorDiv.style.backgroundColor = "#0b4a6f";
        vencedorDiv.style.color = "#fff";
        vencedorDiv.style.fontSize = "22px";
        vencedorDiv.style.fontWeight = "700";
        vencedorDiv.style.textAlign = "center";
        vencedorDiv.style.borderRadius = "12px";
        vencedorDiv.textContent = `🏆 Grande Vencedor: ${grandeVencedor}`;
        container.appendChild(vencedorDiv);
    }
}



// ========================
// Exportar funções globalmente
// ========================
window.logout = logout;
