import { db } from "./firebaseConfig.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ========================
// Carregar torneios
// ========================
async function carregarTorneios() {
    const snap = await getDocs(collection(db, "campeonatos"));
    const lista = document.getElementById("lista-torneios");
    lista.innerHTML = "";

    if(snap.empty) {
        lista.innerHTML = "Nenhum torneio disponível.";
        return;
    }

    snap.forEach(docSnap => {
        const torneio = { id: docSnap.id, ...docSnap.data() };
        const card = document.createElement("div");
        card.classList.add("card-torneio");
        card.innerHTML = `
            <h2>${torneio.nome}</h2>
            <p>Clubes: ${torneio.clubes?.length || 0}</p>
            <p>Mãos: ${torneio.numMaos || 1}</p>
            <button class="botao-ver">Ver torneio</button>
        `;

        card.querySelector(".botao-ver").addEventListener("click", () => {
            document.getElementById("lista-torneios").style.display = "none";
            document.getElementById("detalhe-torneio").style.display = "block";
            document.getElementById("nome-torneio-detalhe").textContent = torneio.nome;
            desenharTorneio(torneio.confrontos || [], torneio.numMaos || 1);
        });

        lista.appendChild(card);
    });
}

// ========================
// Botão voltar à lista
// ========================
document.getElementById("voltar-lista").addEventListener("click", () => {
    document.getElementById("detalhe-torneio").style.display = "none";
    document.getElementById("lista-torneios").style.display = "grid";
});

// ========================
// Desenhar torneio interativo
// ========================
function desenharTorneio(confrontos, numMaos) {
    const container = document.getElementById("torneio-container");
    container.innerHTML = "";

    if(!confrontos || confrontos.length === 0) {
        container.innerHTML = "<p>Nenhum confronto registado ainda.</p>";
        return;
    }

    const fases = {};
    confrontos.forEach(c => {
        if(c.fase) {
            if(!fases[c.fase]) fases[c.fase] = [];
            fases[c.fase].push(c);
        }
    });

    const ordemFases = ["Oitavas","Quartas","Semis","Final"];
    let grandeVencedor = null;

    ordemFases.forEach(faseNome => {
        if(!fases[faseNome]) return;

        const h3 = document.createElement("h3");
        h3.textContent = faseNome;
        h3.style.color = "#0b4a6f"; 
        h3.style.marginBottom = "12px"; 
        h3.style.fontSize = "24px";
        container.appendChild(h3);

        fases[faseNome].forEach(c => {
            const bloco = document.createElement("article");
            bloco.classList.add("resumo-confronto");

            const casaNome = c.casa || "TBD";
            const foraNome = c.fora || "TBD";

            // Equipa Casa
            const casaDiv = document.createElement("div");
            casaDiv.classList.add("resumo-equipa");
            const logoCasa = document.createElement("span");
            logoCasa.classList.add("logo-simples");
            logoCasa.textContent = casaNome[0] || "?";
            casaDiv.appendChild(logoCasa);
            const nomeCasa = document.createElement("div");
            const nomeCasaTxt = document.createElement("div");
            nomeCasaTxt.classList.add("nome-equipa");
            nomeCasaTxt.textContent = casaNome;
            nomeCasa.appendChild(nomeCasaTxt); 
            casaDiv.appendChild(nomeCasa);
            bloco.appendChild(casaDiv);

            // Equipa Fora
            const foraDiv = document.createElement("div");
            foraDiv.classList.add("resumo-equipa"); 
            foraDiv.style.justifyContent="flex-end";
            const nomeForaDiv = document.createElement("div"); 
            nomeForaDiv.style.textAlign="right";
            const nomeForaTxt = document.createElement("div"); 
            nomeForaTxt.classList.add("nome-equipa"); 
            nomeForaTxt.textContent=foraNome;
            nomeForaDiv.appendChild(nomeForaTxt); 
            foraDiv.appendChild(nomeForaDiv);
            const logoFora = document.createElement("span"); 
            logoFora.classList.add("logo-simples"); 
            logoFora.textContent=foraNome[0]||"?";
            foraDiv.appendChild(logoFora);

            // Resultado agregado
            let somaCasa=0,somaFora=0;
            if(c.resultados && c.resultados.length>0){
                c.resultados.forEach(r=>{ 
                    const [gC,gF]=r.split("-").map(Number); 
                    somaCasa+=gC; somaFora+=gF; 
                });
            }

            const resultadoDiv = document.createElement("div"); 
            resultadoDiv.style.textAlign="center";
            const placarResumo = document.createElement("div"); 
            placarResumo.classList.add("placar-resumo");
            placarResumo.textContent = (c.resultados && c.resultados.length>0)?`${somaCasa} - ${somaFora}`:"-";
            resultadoDiv.appendChild(placarResumo);

            const estadoResumo = document.createElement("div"); 
            estadoResumo.classList.add("estado-resumo");
            if(c.resultados && c.resultados.length>0){
                const vencedor = somaCasa>=somaFora?casaNome:foraNome;
                estadoResumo.textContent = faseNome==="Final"?`🏆 Grande Vencedor: ${vencedor}`:`FT — ${vencedor} avança`;
                if(faseNome==="Final") grandeVencedor=vencedor;
            } else estadoResumo.textContent="Confronto marcado";
            resultadoDiv.appendChild(estadoResumo);

            bloco.appendChild(resultadoDiv); 
            bloco.appendChild(foraDiv);

            // Detalhes por mão
            const detalhesDiv = document.createElement("div"); 
            detalhesDiv.classList.add("detalhes-maos"); 
            detalhesDiv.style.display="none";
            const maosParaExibir = faseNome==="Final"?1:numMaos;
            for(let i=0;i<maosParaExibir;i++){
                const r=(c.resultados && c.resultados[i])||"-";
                const p = document.createElement("p"); 
                p.classList.add("detalhe-mao");
                p.textContent=`Mão ${i+1}: ${casaNome} ${r} ${foraNome}`;
                detalhesDiv.appendChild(p);
            }
            bloco.appendChild(detalhesDiv);

            // Toggle detalhes ao clicar no bloco
            bloco.addEventListener("click",()=>{ 
                detalhesDiv.style.display = detalhesDiv.style.display==="none"?"block":"none"; 
            });

            container.appendChild(bloco);
        });
    });

    if(grandeVencedor){
        const vencedorDiv=document.createElement("div");
        vencedorDiv.classList.add("grande-vencedor");
        vencedorDiv.style.marginTop="24px";
        vencedorDiv.style.fontSize="22px";
        vencedorDiv.style.fontWeight="700";
        vencedorDiv.style.color="#0b4a6f";
        vencedorDiv.textContent=`🏆 Grande Vencedor: ${grandeVencedor}`;
        container.appendChild(vencedorDiv);
    }
}

// ========================
// Inicialização
// ========================
carregarTorneios();
