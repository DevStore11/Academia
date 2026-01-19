// =====================
// admin.js COMPLETO FINAL
// =====================

import { db } from "./firebaseConfig.js";
import { 
    collection, addDoc, getDocs, doc, updateDoc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    inicializarTabs();
    await carregarUsuarios();
    await carregarLigas();
    await carregarClubes();

    document.getElementById("select-liga-confrontos").addEventListener("change", e => {
        carregarClubesDaLiga(e.target.value);
        carregarConfrontos(e.target.value);
    });

    document.getElementById("select-liga-resultados").addEventListener("change", async e => {
        const liga_id = e.target.value;
        atualizarSelectConfrontos(liga_id);
        await mostrarTabela(liga_id);
    });

    document.getElementById("form-resultados").addEventListener("submit", registrarResultado);
    document.getElementById("form-confrontos").addEventListener("submit", criarConfronto);
    document.getElementById("form-liga").addEventListener("submit", criarLiga);
});

// =====================
// Tabs
// =====================
function inicializarTabs() {
    const menu = document.querySelectorAll(".menu-item");
    const tabs = document.querySelectorAll(".tab-content");

    menu.forEach(item => {
        item.addEventListener("click", () => {
            menu.forEach(i => i.classList.remove("active"));
            tabs.forEach(t => t.classList.remove("active"));

            item.classList.add("active");
            const id = item.getAttribute("data-tab");
            document.getElementById(id).classList.add("active");

            const page = document.getElementById("pageTitle");
            page.textContent = `Painel Admin - ${item.textContent.trim()}`;
        });
    });
}

// =====================
// Usuários
// =====================
async function carregarUsuarios() {
    const snap = await getDocs(collection(db, "usuarios"));
    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = "";

    snap.forEach(d => {
        const u = d.data();
        tbody.innerHTML += `
            <tr>
                <td>${d.id}</td>
                <td>${u.username}</td>
                <td>${u.password}</td>
                <td></td>
            </tr>
        `;
    });
}

window.apagarUsuario = async (id) => {
    await deleteDoc(doc(db, "usuarios", id));
    alert("Usuário removido");
    carregarUsuarios();
};

// =====================
// Ligas
// =====================
async function carregarLigas() {
    const snap = await getDocs(collection(db, "ligas"));
    const tbody = document.querySelector("#tabelaLigas tbody");
    tbody.innerHTML = "";

    const selects = [
        "select-liga",
        "select-liga-confrontos",
        "select-liga-resultados",
        "select-liga-tabela"
    ];

    selects.forEach(id => {
        document.getElementById(id).innerHTML = '<option value="">-- Selecione --</option>';
    });

    snap.forEach(docSnap => {
        const liga = { id: docSnap.id, ...docSnap.data() };
        tbody.innerHTML += `
            <tr>
                <td>${liga.id}</td>
                <td>${liga.nome}</td>
                <td></td>
            </tr>
        `;

        selects.forEach(id => {
            document.getElementById(id).innerHTML += `
                <option value="${liga.id}">${liga.nome}</option>`;
        });
    });
}

window.apagarLiga = async (id) => {
    await deleteDoc(doc(db, "ligas", id));
    alert("Liga apagada");
    carregarLigas();
};

async function criarLiga(e) {
    e.preventDefault();
    const nome = document.getElementById("nome-liga").value.trim();
    if (!nome)
         return alert("Introduza o nome da liga");

    await addDoc(collection(db, "ligas"), {
        nome,
        clubes: []
    });

    alert("Liga criada!");
    document.getElementById("nome-liga").value = "";
    carregarLigas();
}

// =====================
// Clubes
// =====================
async function carregarClubes() {
    const snap = await getDocs(collection(db, "usuarios"));
    const container = document.getElementById("clubes-checkboxes");

    container.innerHTML = "";
    snap.forEach(docSnap => {
        const c = docSnap.data();
        container.innerHTML += `
            <div>
                <input type="checkbox" value="${c.username}"> 
                <label>${c.username}</label>
            </div>
        `;
    });
}

document.getElementById("form-add-clubes-liga").addEventListener("submit", async e => {
    e.preventDefault();
    const liga_id = document.getElementById("select-liga").value;
    const clubes = Array.from(document.querySelectorAll("#clubes-checkboxes input:checked"))
        .map(i => i.value);

    if (!liga_id || clubes.length === 0) return alert("Selecione a liga e pelo menos 1 clube");

    await setDoc(doc(db, "ligas", liga_id), { clubes }, { merge: true });

    alert("Clubes adicionados");
});

// ===============================
// Clubs filtrados por liga
// ===============================
async function carregarClubesDaLiga(liga_id) {
    const snap = await getDocs(collection(db, "ligas"));
    let clubesLiga = [];

    snap.forEach(docSnap => {
        if (docSnap.id === liga_id) {
            clubesLiga = docSnap.data().clubes || [];
        }
    });

    const casa = document.getElementById("select-clube-casa");
    const fora = document.getElementById("select-clube-fora");

    casa.innerHTML = '<option value="">-- Selecione --</option>';
    fora.innerHTML = '<option value="">-- Selecione --</option>';

    clubesLiga.forEach(c => {
        casa.innerHTML += `<option value="${c}">${c}</option>`;
        fora.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

// =====================
// Confrontos
// =====================
async function criarConfronto(e) {
    e.preventDefault();
    const liga_id = document.getElementById("select-liga-confrontos").value;
    const casa = document.getElementById("select-clube-casa").value;
    const fora = document.getElementById("select-clube-fora").value;
    const data = document.getElementById("data-confronto").value;
    const hora = document.getElementById("hora-confronto").value;

    if (!liga_id || !casa || !fora || !data || !hora)
        return alert("Preencha todos campos");

    await addDoc(collection(db, "confrontos"), {
        liga_id, casa, fora, data, hora, resultado: null, concluido: false
    });

    alert("Confronto criado!");
    carregarConfrontos(liga_id);
}

async function carregarConfrontos(liga_id) {
    const tbody = document.querySelector("#tabelaConfrontos tbody");
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "confrontos"));
    snap.forEach(docSnap => {
        const c = docSnap.data();
        if (c.liga_id === liga_id) {
            tbody.innerHTML += `
                <tr>
                    <td>${c.data} ${c.hora}</td>
                    <td>${c.casa} vs ${c.fora}</td>
                    <td>${c.resultado ?? "-"}</td>
                    <td><button onclick="apagarConfronto('${docSnap.id}')">Apagar</button></td>
                </tr>
            `;
        }
    });
}

window.apagarConfronto = async (id) => {
    await deleteDoc(doc(db, "confrontos", id));
    alert("Confronto removido");
    const liga = document.getElementById("select-liga-confrontos").value;
    carregarConfrontos(liga);
};

// =====================
// Resultados
// =====================
async function atualizarSelectConfrontos(liga_id) {
    const select = document.getElementById("select-confronto");
    select.innerHTML = '<option value="">-- Selecione --</option>';

    const snap = await getDocs(collection(db, "confrontos"));
    snap.forEach(docSnap => {
        const c = docSnap.data();

        // SOMENTE confrontos sem resultado
        if (c.liga_id === liga_id && !c.resultado) {
            select.innerHTML += `
                <option value="${docSnap.id}">
                    ${c.casa} vs ${c.fora}
                </option>`;
        }
    });
}

async function registrarResultado(e) {
    e.preventDefault();

    const confronto_id = document.getElementById("select-confronto").value;
    const gC = document.getElementById("golos-casa").value;
    const gF = document.getElementById("golos-fora").value;

    if (!confronto_id || gC === "" || gF === "")
        return alert("Preencha tudo");

    const liga_id = document.getElementById("select-liga-resultados").value;

    await updateDoc(doc(db, "confrontos", confronto_id), {
        resultado: `${gC} - ${gF}`,
        concluido: true
    });

    alert("Resultado guardado!");

    atualizarSelectConfrontos(liga_id);
    atualizarTabela(liga_id);
}

// =====================
// Tabela Classificativa
// =====================
async function atualizarTabela(liga_id) {
    const snapLigas = await getDocs(collection(db, "ligas"));
    let clubes = [];

    snapLigas.forEach(docSnap => {
        if (docSnap.id === liga_id) {
            (docSnap.data().clubes || []).forEach(c => {
                clubes.push({
                    nome: c,
                    jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
                    gols_marcados: 0, gols_sofridos: 0, saldo_gols: 0, pontos: 0
                });
            });
        }
    });

    const snapConf = await getDocs(collection(db, "confrontos"));
    snapConf.forEach(docSnap => {
        const c = docSnap.data();
        if (c.liga_id === liga_id && c.resultado) {
            const [gc, gf] = c.resultado.split(" - ").map(Number);
            const cc = clubes.find(cl => cl.nome === c.casa);
            const cf = clubes.find(cl => cl.nome === c.fora);

            if (!cc || !cf) return;

            cc.jogos++; cf.jogos++;
            cc.gols_marcados += gc; cc.gols_sofridos += gf;
            cf.gols_marcados += gf; cf.gols_sofridos += gc;
            cc.saldo_gols = cc.gols_marcados - cc.gols_sofridos;
            cf.saldo_gols = cf.gols_marcados - cf.gols_sofridos;

            if (gc > gf) { cc.vitorias++; cf.derrotas++; cc.pontos += 3; }
            else if (gc < gf) { cf.vitorias++; cc.derrotas++; cf.pontos += 3; }
            else { cc.empates++; cf.empates++; cc.pontos++; cf.pontos++; }
        }
    });

    await setDoc(doc(db, "tabelas", liga_id), {
        liga_id, clubes, atualizada_em: new Date().toISOString()
    });

    mostrarTabela(liga_id);
}

async function mostrarTabela(liga_id) {
    const tbody = document.querySelector("#tabela-classificativa tbody");
    tbody.innerHTML = "";

    const snap = await getDocs(collection(db, "tabelas"));
    snap.forEach(docSnap => {
        const t = docSnap.data();
        if (t.liga_id === liga_id) {
            const clubes = t.clubes.sort((a,b) => b.pontos - a.pontos || b.saldo_gols - a.saldo_gols);
            clubes.forEach((c, i) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${i+1}</td>
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
        }
    });
}

window.logout = function () {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
};
