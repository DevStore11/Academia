/* ============================================================
   Campeonato.js — Power Play E-Sport (página pública)
   ============================================================ */

// ── SECÇÃO 1: Imports ───────────────────────────────────────

import { db } from './firebaseConfig.js';
import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

// ── SECÇÃO 2: Estado global ─────────────────────────────────

let campeonatoActivo = null;
let todosCampeonatos = [];
let filtroActivo = 'all';
let termoBusca = '';

// ── SECÇÃO 3: Inicialização ─────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  injectEstilos();
  carregarCampeonatos();
  configurarFiltros();
  configurarBusca();
  configurarNavegacao();
});

// ── CSS injectado por JS (filtros, ecrãs, bracket, etc.) ───

function injectEstilos() {
  const css = `
    .filtros-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .filtros {
      display: flex;
      gap: 0.8rem;
      flex-wrap: wrap;
    }
    .filtro-btn {
      padding: 10px 20px;
      background: var(--dark-bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition);
      font-weight: 600;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .filtro-btn:hover {
      color: var(--primary-green);
      border-color: var(--primary-green);
    }
    .filtro-btn.active {
      background: var(--primary-green);
      color: var(--dark-bg);
      border-color: transparent;
    }
    .busca-container {
      flex: 1;
      max-width: 300px;
    }
    .busca-input {
      position: relative;
    }
    .busca-input i {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-tertiary);
    }
    .busca-input input {
      width: 100%;
      padding: 12px 16px 12px 42px;
      background: var(--dark-bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      color: var(--text-primary);
      font-size: 0.95rem;
      transition: var(--transition);
    }
    .busca-input input:focus {
      outline: none;
      border-color: var(--primary-green);
      box-shadow: 0 0 0 3px rgba(0, 204, 106, 0.1);
    }
    .loading-container {
      text-align: center;
      padding: 4rem;
      color: var(--text-tertiary);
    }
    .loading-container p {
      margin-top: 1rem;
      font-size: 1.1rem;
    }
    #lista-vazia {
      text-align: center;
      padding: 4rem;
      color: var(--text-tertiary);
    }
    #lista-vazia i {
      font-size: 3rem;
      display: block;
      margin-bottom: 1rem;
      opacity: 0.4;
    }
    #lista-vazia p {
      font-size: 1.1rem;
    }
    .participante-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .participante-item:last-child {
      border-bottom: none;
    }
    .participante-nome-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }
    .participante-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-campeao {
      background: rgba(255, 215, 0, 0.15);
      color: #ffd700;
      border: 1px solid rgba(255, 215, 0, 0.3);
    }
    .badge-activo {
      background: rgba(0, 232, 122, 0.12);
      color: #00e87a;
      border: 1px solid rgba(0, 232, 122, 0.3);
    }
    .badge-eliminado {
      background: rgba(255, 59, 92, 0.12);
      color: #ff3b5c;
      border: 1px solid rgba(255, 59, 92, 0.3);
      opacity: 0.7;
    }
    #detalhe-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 1.5rem 0;
    }
    @media (max-width: 768px) {
      #detalhe-info { grid-template-columns: 1fr; }
    }
    .detalhe-info-card {
      background: var(--dark-bg-tertiary);
      padding: 1rem 1.2rem;
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
    }
    .detalhe-info-card .label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .detalhe-info-card .value {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .detalhe-info-card .value.green {
      color: var(--primary-green);
    }
    #detalhe-nome {
      font-size: 2rem;
      color: var(--primary-green);
      margin: 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--primary-green);
    }
    #btn-voltar-lista, #btn-voltar-detalhe {
      background: transparent;
      color: var(--primary-green);
      border: 1px solid var(--primary-green);
      padding: 10px 20px;
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      font-weight: 600;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    #btn-voltar-lista:hover, #btn-voltar-detalhe:hover {
      background: rgba(0, 204, 106, 0.1);
      transform: translateX(-5px);
    }
    #detalhe-bracket-aviso {
      text-align: center;
      padding: 2rem;
      color: var(--text-tertiary);
      background: var(--dark-bg-tertiary);
      border-radius: var(--border-radius);
      border: 1px solid var(--border-color);
      margin: 1rem 0;
    }
    #btn-ver-bracket {
      background: linear-gradient(135deg, var(--primary-green), var(--primary-green-dark));
      color: var(--dark-bg);
      border: none;
      padding: 12px 24px;
      border-radius: var(--border-radius-sm);
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 1rem 0;
    }
    #btn-ver-bracket:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-green);
    }
    #bracket-nome {
      font-size: 1.8rem;
      color: var(--primary-green);
      margin: 1rem 0;
    }
    #btn-guardar-png, #btn-partilhar-whatsapp {
      padding: 10px 20px;
      border-radius: var(--border-radius-sm);
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-right: 0.5rem;
      margin-bottom: 1rem;
    }
    #btn-guardar-png {
      background: var(--dark-bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }
    #btn-guardar-png:hover {
      border-color: var(--primary-green);
      color: var(--primary-green);
    }
    #btn-partilhar-whatsapp {
      background: #25d366;
      color: #fff;
      border: none;
    }
    #btn-partilhar-whatsapp:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    #toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      transform: translateX(120%);
      opacity: 0;
      transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .35s ease;
      pointer-events: all;
      max-width: 320px;
    }
    .toast.show { transform: translateX(0); opacity: 1; }
    .toast-success { background: rgba(0,232,122,0.12); border: 1px solid rgba(0,232,122,0.4); color: #00e87a; }
    .toast-error   { background: rgba(255,59,92,0.12);  border: 1px solid rgba(255,59,92,0.4);  color: #ff3b5c; }
    .toast-info    { background: rgba(59,139,255,0.12); border: 1px solid rgba(59,139,255,0.4); color: #3b8bff; }
    @media (max-width: 768px) {
      #toast-container { bottom: 16px; right: 16px; left: 16px; }
      .toast { max-width: 100%; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// ── SECÇÃO 4: carregarCampeonatos() ────────────────────────

async function carregarCampeonatos() {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'Champions'),
        where('publico', '==', true),
        orderBy('criado_em', 'desc')
      )
    );
    todosCampeonatos = [];
    snap.forEach(d => {
      todosCampeonatos.push({ id: d.id, ...d.data() });
    });
    renderLista();
  } catch (e) {
    document.getElementById('lista-campeonatos').innerHTML =
      '<div class="loading-container"><p>Erro ao carregar campeonatos.</p></div>';
  }
}

// ── SECÇÃO 5: renderLista() ─────────────────────────────────

function renderLista() {
  const container = document.getElementById('lista-campeonatos');
  const vazia = document.getElementById('lista-vazia');

  const filtrados = todosCampeonatos.filter(c => {
    if (filtroActivo !== 'all' && c.status !== filtroActivo) return false;
    if (termoBusca && !c.nome.toLowerCase().includes(termoBusca)) return false;
    return true;
  });

  if (filtrados.length === 0) {
    container.innerHTML = '';
    vazia.style.display = 'block';
    return;
  }

  vazia.style.display = 'none';

  const coresStatus = {
    em_curso: { classe: 'status-ativo', label: 'Em Curso' },
    aguardando: { classe: 'status-aguardando', label: 'Aguardando' },
    finalizado: { classe: 'status-finalizado', label: 'Finalizado' }
  };

  container.innerHTML = filtrados.map(c => {
    const st = coresStatus[c.status] || { classe: 'status-aguardando', label: c.status };
    return `
      <div class="torneio-card" onclick="abrirDetalhe('${c.id}')">
        <div class="torneio-header">
          <h3 class="torneio-titulo">${escapeHtml(c.nome)}</h3>
          <span class="torneio-status ${st.classe}">${st.label}</span>
        </div>
        <div class="torneio-info">
          <div class="info-item">
            <span class="info-label"><i class="fas fa-users"></i> Jogadores</span>
            <span class="info-value">${c.tamanho || '—'}</span>
          </div>
          ${c.data ? `
          <div class="info-item">
            <span class="info-label"><i class="fas fa-calendar"></i> Data</span>
            <span class="info-value">${escapeHtml(c.data)}</span>
          </div>` : ''}
          ${c.local ? `
          <div class="info-item">
            <span class="info-label"><i class="fas fa-map-marker-alt"></i> Local</span>
            <span class="info-value">${escapeHtml(c.local)}</span>
          </div>` : ''}
        </div>
        ${c.premio1 ? `
        <div class="torneio-premiacao">
          <div class="premiacao-titulo"><i class="fas fa-medal"></i> Prémio Principal</div>
          <div class="premiacao-valores">
            <div class="premio">
              <div class="premio-valor">${escapeHtml(c.premio1)}</div>
            </div>
          </div>
        </div>` : ''}
      </div>`;
  }).join('');
}

// ── SECÇÃO 6: configurarFiltros() ──────────────────────────

function configurarFiltros() {
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      filtroActivo = this.dataset.filter;
      renderLista();
    });
  });
}

// ── SECÇÃO 7: configurarBusca() ────────────────────────────

function configurarBusca() {
  const input = document.getElementById('busca-campeonato');
  if (!input) return;
  input.addEventListener('input', function () {
    termoBusca = this.value.toLowerCase().trim();
    renderLista();
  });
}

// ── SECÇÃO 8: abrirDetalhe(id) ─────────────────────────────

window.abrirDetalhe = async function (id) {
  const ecraDetalhe = document.getElementById('ecra-detalhe');
  ecraDetalhe.innerHTML = '<div class="loading-container"><div class="loading"></div><p>A carregar detalhes...</p></div>';
  mostrarEcra('ecra-detalhe');

  try {
    const snap = await getDoc(doc(db, 'Champions', id));
    if (!snap.exists()) {
      ecraDetalhe.innerHTML = '<div class="loading-container"><p>Campeonato não encontrado.</p></div>';
      return;
    }

    const camp = { id: snap.id, ...snap.data() };
    campeonatoActivo = camp;

    const partSnap = await getDocs(collection(db, 'Champions', id, 'participantes'));
    const participantes = [];
    partSnap.forEach(d => {
      participantes.push({ uid: d.id, ...d.data() });
    });

    const numParticipantes = participantes.length;

    let detalheInfoHTML = `
      <div class="detalhe-info-card">
        <div class="label"><i class="fas fa-users"></i> Participantes</div>
        <div class="value green">${numParticipantes}</div>
      </div>`;

    if (camp.data && camp.hora) {
      detalheInfoHTML += `
        <div class="detalhe-info-card">
          <div class="label"><i class="fas fa-calendar"></i> Data/Hora</div>
          <div class="value">${escapeHtml(camp.data)} às ${escapeHtml(camp.hora)}</div>
        </div>`;
    } else if (camp.data) {
      detalheInfoHTML += `
        <div class="detalhe-info-card">
          <div class="label"><i class="fas fa-calendar"></i> Data</div>
          <div class="value">${escapeHtml(camp.data)}</div>
        </div>`;
    }

    if (camp.local) {
      detalheInfoHTML += `
        <div class="detalhe-info-card">
          <div class="label"><i class="fas fa-map-marker-alt"></i> Local</div>
          <div class="value">${escapeHtml(camp.local)}</div>
        </div>`;
    }

    if (camp.taxa_inscricao) {
      detalheInfoHTML += `
        <div class="detalhe-info-card">
          <div class="label"><i class="fas fa-credit-card"></i> Taxa</div>
          <div class="value">${escapeHtml(camp.taxa_inscricao)}</div>
        </div>`;
    }

    if (camp.premio1) {
      let premiosHTML = `<div class="label"><i class="fas fa-medal"></i> Prémios</div><div class="value">`;
      if (camp.premio1) premiosHTML += `<div>🥇 ${escapeHtml(camp.premio1)}</div>`;
      if (camp.premio2) premiosHTML += `<div>🥈 ${escapeHtml(camp.premio2)}</div>`;
      if (camp.premio3) premiosHTML += `<div>🥉 ${escapeHtml(camp.premio3)}</div>`;
      premiosHTML += '</div>';
      detalheInfoHTML += `<div class="detalhe-info-card">${premiosHTML}</div>`;
    }

    let participantesHTML = '';
    if (participantes.length === 0) {
      participantesHTML = '<div style="text-align:center;padding:2rem;color:var(--text-tertiary);">Nenhum participante inscrito.</div>';
    } else {
      participantes.sort((a, b) => (a.seed || 999) - (b.seed || 999));
      participantes.forEach((p, idx) => {
        const ehCampeao = camp.campeao === p.uid;
        const eliminado = p.eliminado;
        let badgeClass = 'badge-activo';
        let badgeText = 'Activo';
        if (ehCampeao) {
          badgeClass = 'badge-campeao';
          badgeText = 'Campeão';
        } else if (eliminado) {
          badgeClass = 'badge-eliminado';
          badgeText = 'Eliminado';
        }
        participantesHTML += `
          <div class="participante-item">
            <div class="participante-nome-info">
              <div class="avatar-circle" style="background:${corAvatar(p.uid)}">${iniciaisNome(p.nome)}</div>
              <span class="participante-nome">${escapeHtml(p.nome || 'Desconhecido')}</span>
            </div>
            <span class="participante-badge ${badgeClass}">${badgeText}</span>
          </div>`;
      });
    }

    ecraDetalhe.innerHTML = `
      <button id="btn-voltar-lista">
        <i class="fas fa-arrow-left"></i> Voltar
      </button>
      <h2 id="detalhe-nome">${escapeHtml(camp.nome)}</h2>
      <div id="detalhe-info">${detalheInfoHTML}</div>
      <div class="tabela-participantes">
        <div class="tabela-header">
          <h3><i class="fas fa-users"></i> Participantes</h3>
        </div>
        <div class="tabela-content">
          <div id="lista-participantes">${participantesHTML}</div>
        </div>
      </div>
      <div id="detalhe-bracket-aviso" style="${camp.chave_gerada ? 'display:none;' : 'display:block;'}">
        <p>Bracket ainda não disponível.</p>
      </div>
      <button id="btn-ver-bracket" style="${camp.chave_gerada ? 'display:inline-flex;' : 'display:none;'}" onclick="abrirBracket()">
        <i class="fas fa-sitemap"></i> Ver Bracket
      </button>`;

    // Re-ligar botão voltar
    document.getElementById('btn-voltar-lista').addEventListener('click', () => {
      mostrarEcra('ecra-lista');
      campeonatoActivo = null;
    });

  } catch (e) {
    ecraDetalhe.innerHTML = `<div class="loading-container"><p>Erro: ${e.message}</p></div>`;
  }
};

// ── SECÇÃO 9: abrirBracket() ───────────────────────────────

window.abrirBracket = async function () {
  if (!campeonatoActivo) return;

  const container = document.getElementById('bracket-container');
  container.innerHTML = '<div class="loading-container"><div class="loading"></div><p>A carregar bracket...</p></div>';
  mostrarEcra('ecra-bracket');

  document.getElementById('bracket-nome').textContent = campeonatoActivo.nome;

  const id = campeonatoActivo.id;

  try {
    const partSnap = await getDocs(collection(db, 'Champions', id, 'participantes'));
    const partic = {};
    partSnap.forEach(d => { partic[d.id] = d.data(); });

    const fasesSnap = await getDocs(
      query(collection(db, 'Champions', id, 'fases'), orderBy('ordem'))
    );
    const dadosFases = [];
    for (const faseDoc of fasesSnap.docs) {
      const fase = { id: faseDoc.id, ...faseDoc.data() };
      const jogosSnap = await getDocs(
        query(collection(db, 'Champions', id, 'fases', faseDoc.id, 'jogos'), orderBy('posicao_chave.slot'))
      );
      const jogos = [];
      jogosSnap.forEach(d => jogos.push({ id: d.id, ...d.data() }));
      dadosFases.push({ ...fase, jogos });
    }

    if (dadosFases.length === 0) {
      container.innerHTML = '<div class="loading-container"><p>Bracket não disponível.</p></div>';
      return;
    }

    const svg = gerarSVG(dadosFases, partic, campeonatoActivo);
    container.innerHTML = svg;
    ajustarResponsividade();
  } catch (e) {
    container.innerHTML = `<div class="loading-container"><p>Erro: ${e.message}</p></div>`;
  }
};

// ── SECÇÃO 10: gerarSVG(fases, partic, camp) ───────────────

const CARD_W = 150;
const CARD_H = 72;
const CARD_GAP = 24;
const COL_GAP = 56;
const PADDING = 40;
const RADIUS = 8;

const CORES_AVATAR = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6',
                      '#1abc9c','#e67e22','#e91e63','#00bcd4','#ff5722'];

const COR_FUNDO_SVG = '#0a0d13';
const COR_FUNDO_CARD = '#141921';
const COR_BORDA = '#1e2a3a';
const COR_BORDA_WIN = '#00e87a';
const COR_TEXTO_PRIM = '#e8edf5';
const COR_TEXTO_SEC = '#8a99b3';
const COR_VERDE = '#00e87a';
const COR_LINHA = '#1e2a3a';
const COR_LINHA_WIN = '#00e87a';

function gerarSVG(fases, partic, camp) {
  const totalFases = fases.length;

  function jogosLado(jogos, lado) {
    const validos = jogos.filter(j => j.time1_id !== null || j.time2_id !== null);
    const lista = validos.length > 0 ? validos : jogos;
    const metade = Math.ceil(lista.length / 2);
    if (lado === 'esq') return lista.slice(0, metade);
    return lista.slice(metade).reverse();
  }

  function colHeight(n) {
    return n * CARD_H + (n - 1) * CARD_GAP;
  }

  // Preparar dados de cada lado
  const dadosEsq = [];
  const dadosDir = [];
  for (let f = 0; f < totalFases; f++) {
    dadosEsq.push(jogosLado(fases[f].jogos, 'esq'));
    dadosDir.push(jogosLado(fases[f].jogos, 'dir'));
  }

  const numColunasLado = totalFases - 1;
  const alturasEsq = dadosEsq.slice(0, numColunasLado).map(j => colHeight(j.length));
  const alturasDir = dadosDir.slice(0, numColunasLado).map(j => colHeight(j.length));
  const alturaMaxLado = Math.max(...alturasEsq, ...alturasDir, 0);

  const larguraSVG = PADDING * 2 + numColunasLado * CARD_W * 2 + numColunasLado * COL_GAP * 2 + 160;
  const alturaSVG = PADDING * 2 + alturaMaxLado + 60;

  let svg = `<svg viewBox="0 0 ${larguraSVG} ${alturaSVG}" xmlns="http://www.w3.org/2000/svg" font-family="'Exo 2', 'Inter', sans-serif">`;
  svg += `<rect width="${larguraSVG}" height="${alturaSVG}" fill="${COR_FUNDO_SVG}"/>`;

  // ── Lado Esquerdo ──
  for (let f = 0; f < numColunasLado; f++) {
    const jogos = dadosEsq[f];
    const colX = PADDING + f * (CARD_W + COL_GAP);
    const colH = colHeight(jogos.length);
    const colY = PADDING + 20 + (alturaMaxLado - colH) / 2;

    svg += `<text x="${colX + CARD_W / 2}" y="${colY - 8}" fill="${COR_TEXTO_SEC}" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1">${(fases[f].nome || '').toUpperCase()}</text>`;

    jogos.forEach((jogo, idx) => {
      const cardY = colY + idx * (CARD_H + CARD_GAP);
      svg += desenharJogo(jogo, colX, cardY, CARD_W, CARD_H, RADIUS, partic);
    });

    // Conectores entre colunas (lado esquerdo: saída pela direita)
    if (f < numColunasLado - 1 && jogos.length >= 2) {
      const proxJogos = dadosEsq[f + 1];
      const proxColX = PADDING + (f + 1) * (CARD_W + COL_GAP);
      const proxColH = colHeight(proxJogos.length);
      const proxColY = PADDING + 20 + (alturaMaxLado - proxColH) / 2;
      const nPares = Math.floor(jogos.length / 2);

      for (let i = 0; i < nPares; i++) {
        const jogoSup = jogos[i * 2];
        const jogoInf = jogos[i * 2 + 1];
        const winSup = jogoSup ? jogoSup.vencedor_id : null;
        const winInf = jogoInf ? jogoInf.vencedor_id : null;

        const cardYSup = colY + (i * 2) * (CARD_H + CARD_GAP);
        const cardYInf = colY + (i * 2 + 1) * (CARD_H + CARD_GAP);

        const y1 = winSup ? cardYSup + 18 : cardYSup + CARD_H / 2;
        const y2 = winInf ? cardYInf + 18 : cardYInf + CARD_H / 2;
        const ym = (y1 + y2) / 2;

        const xExit = colX + CARD_W;
        const xConnMid = xExit + COL_GAP / 2;
        const xEntry = proxColX;

        // Slot alvo na próxima coluna
        const targetCardY = proxColY + i * (CARD_H + CARD_GAP);

        const corLinha = COR_LINHA;
        const corWin = COR_LINHA_WIN;

        svg += `<path d="M${xExit},${y1} L${xConnMid},${y1}" stroke="${winSup ? corWin : corLinha}" stroke-opacity="${winSup ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        svg += `<path d="M${xExit},${y2} L${xConnMid},${y2}" stroke="${winInf ? corWin : corLinha}" stroke-opacity="${winInf ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        svg += `<path d="M${xConnMid},${y1} L${xConnMid},${ym}" stroke="${winSup ? corWin : corLinha}" stroke-opacity="${winSup ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        svg += `<path d="M${xConnMid},${y2} L${xConnMid},${ym}" stroke="${winInf ? corWin : corLinha}" stroke-opacity="${winInf ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        svg += `<path d="M${xConnMid},${ym} L${xEntry},${ym}" stroke="${(winSup || winInf) ? corWin : corLinha}" stroke-opacity="${(winSup || winInf) ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
      }
    }
  }

  // ── Lado Direito ──
  for (let f = 0; f < numColunasLado; f++) {
    const jogos = dadosDir[f];
    const colX = larguraSVG - PADDING - (f + 1) * (CARD_W + COL_GAP);
    const colH = colHeight(jogos.length);
    const colY = PADDING + 20 + (alturaMaxLado - colH) / 2;

    svg += `<text x="${colX + CARD_W / 2}" y="${colY - 8}" fill="${COR_TEXTO_SEC}" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1">${(fases[f].nome || '').toUpperCase()}</text>`;

    jogos.forEach((jogo, idx) => {
      const cardY = colY + idx * (CARD_H + CARD_GAP);
      svg += desenharJogo(jogo, colX, cardY, CARD_W, CARD_H, RADIUS, partic);
    });

    // Conectores (lado direito: saída pela esquerda)
    if (f < numColunasLado - 1 && jogos.length >= 2) {
      const proxJogos = dadosDir[f + 1];
      const proxColX = larguraSVG - PADDING - (f + 2) * (CARD_W + COL_GAP);
      const proxColH = colHeight(proxJogos.length);
      const proxColY = PADDING + 20 + (alturaMaxLado - proxColH) / 2;
      const nPares = Math.floor(jogos.length / 2);

      for (let i = 0; i < nPares; i++) {
        const jogoSup = jogos[i * 2];
        const jogoInf = jogos[i * 2 + 1];
        const winSup = jogoSup ? jogoSup.vencedor_id : null;
        const winInf = jogoInf ? jogoInf.vencedor_id : null;

        const cardYSup = colY + (i * 2) * (CARD_H + CARD_GAP);
        const cardYInf = colY + (i * 2 + 1) * (CARD_H + CARD_GAP);

        const y1 = winSup ? cardYSup + 18 : cardYSup + CARD_H / 2;
        const y2 = winInf ? cardYInf + 18 : cardYInf + CARD_H / 2;
        const ym = (y1 + y2) / 2;

        const xExit = colX;
        const xConnMid = colX - COL_GAP / 2;
        const xEntry = proxColX + CARD_W;

        const corLinha = COR_LINHA;
        const corWin = COR_LINHA_WIN;

        svg += `<path d="M${xExit},${y1} L${xConnMid},${y1}" stroke="${winSup ? corWin : corLinha}" stroke-opacity="${winSup ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        svg += `<path d="M${xExit},${y2} L${xConnMid},${y2}" stroke="${winInf ? corWin : corLinha}" stroke-opacity="${winInf ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        svg += `<path d="M${xConnMid},${y1} L${xConnMid},${ym}" stroke="${winSup ? corWin : corLinha}" stroke-opacity="${winSup ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        svg += `<path d="M${xConnMid},${y2} L${xConnMid},${ym}" stroke="${winInf ? corWin : corLinha}" stroke-opacity="${winInf ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        svg += `<path d="M${xConnMid},${ym} L${xEntry},${ym}" stroke="${(winSup || winInf) ? corWin : corLinha}" stroke-opacity="${(winSup || winInf) ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
      }
    }
  }

  // ── Centro: Final ──
  const centroX = PADDING + numColunasLado * (CARD_W + COL_GAP);
  const centroW = 160;
  const finalJogo = fases[totalFases - 1]?.jogos?.[0] || null;

  svg += `<text x="${centroX + centroW / 2}" y="${PADDING + 20 + (alturaMaxLado / 2) - 50}" fill="${COR_VERDE}" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="2">FINAL</text>`;

  if (finalJogo) {
    const finalCardX = centroX + (centroW - (CARD_W + 20)) / 2;
    const finalCardY = PADDING + 20 + (alturaMaxLado - CARD_H) / 2;
    svg += desenharJogo(finalJogo, finalCardX, finalCardY, CARD_W + 20, CARD_H, RADIUS, partic);
  }

  // Troféu e campeão
  const campY = PADDING + 20 + (alturaMaxLado / 2) + 50;
  const campNome = camp.campeao ? (partic[camp.campeao]?.nome || '') : '';
  if (campNome) {
    svg += `<text x="${centroX + centroW / 2}" y="${campY}" fill="${COR_VERDE}" font-size="28" text-anchor="middle">🏆</text>`;
    svg += `<text x="${centroX + centroW / 2}" y="${campY + 30}" fill="${COR_VERDE}" font-size="14" font-weight="700" text-anchor="middle">${escapeXml(campNome)}</text>`;
  } else {
    svg += `<text x="${centroX + centroW / 2}" y="${campY}" fill="${COR_TEXTO_SEC}" font-size="12" font-weight="600" text-anchor="middle">Em disputa</text>`;
  }

  svg += '</svg>';
  return svg;
}

// ── desenharJogo ───────────────────────────────────────────

function desenharJogo(jogo, x, y, w, h, r, partic) {
  if (!jogo) {
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${COR_FUNDO_CARD}" stroke="${COR_BORDA}" stroke-width="0.5"/>
      <text x="${x + w / 2}" y="${y + h / 2 + 4}" fill="${COR_TEXTO_SEC}" font-size="10" text-anchor="middle">A definir</text>`;
  }

  const t1Id = jogo.time1_id;
  const t2Id = jogo.time2_id;
  const vId = jogo.vencedor_id;
  const concluido = jogo.status_jogo === 'concluido';
  const gols1 = jogo.gols1;
  const gols2 = jogo.gols2;

  const strokeCor = concluido && vId ? COR_BORDA_WIN : COR_BORDA;

  let html = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${COR_FUNDO_CARD}" stroke="${strokeCor}" stroke-width="${concluido ? '1' : '0.5'}"/>`;

  // Linha separadora
  const sepY = y + h / 2;
  html += `<line x1="${x + 8}" y1="${sepY}" x2="${x + w - 8}" y2="${sepY}" stroke="${COR_BORDA}" stroke-width="0.5"/>`;

  // Time 1
  const t1Nome = nomeTimeSVG(t1Id, partic);
  const t1Win = concluido && vId === t1Id;
  const t1Elim = concluido && !t1Win && vId && t1Id;
  html += desenharTime(x, y, w, t1Nome, t1Id, t1Win, t1Elim, 18, partic);

  // Time 2
  const t2Nome = nomeTimeSVG(t2Id, partic);
  const t2Win = concluido && vId === t2Id;
  const t2Elim = concluido && !t2Win && vId && t2Id;
  html += desenharTime(x, y, w, t2Nome, t2Id, t2Win, t2Elim, 54, partic);

  // Placar
  if (concluido && gols1 != null && gols2 != null) {
    html += `<text x="${x + w / 2}" y="${sepY + 4}" fill="${COR_TEXTO_SEC}" font-size="10" font-weight="600" text-anchor="middle">${gols1}–${gols2}</text>`;
  }

  return html;
}

function desenharTime(x, y, w, nome, uid, venceu, eliminado, offsetY, partic) {
  const opacity = eliminado ? '0.5' : '1';
  const avatarCor = uid && uid !== 'null' ? corAvatar(uid) : '#444';
  const inicial = uid ? iniciaisNome(nome) : '?';
  const nomeTruncado = truncarNome(nome, 14);

  let html = '';

  // Avatar circle
  html += `<circle cx="${x + 14}" cy="${y + offsetY}" r="11" fill="${avatarCor}"/>`;
  html += `<text x="${x + 14}" y="${y + offsetY + 4}" fill="#fff" font-size="9" font-weight="700" text-anchor="middle" opacity="${opacity}">${escapeXml(inicial)}</text>`;

  // Nome
  html += `<text x="${x + 30}" y="${y + offsetY + 4}" fill="${venceu ? COR_VERDE : COR_TEXTO_PRIM}" font-size="11" font-weight="${venceu ? '700' : '500'}" opacity="${opacity}">${escapeXml(nomeTruncado)}</text>`;

  // Check de vencedor
  if (venceu) {
    html += `<circle cx="${x + w - 12}" cy="${y + offsetY}" r="4" fill="${COR_VERDE}"/>`;
  }

  return html;
}

function nomeTimeSVG(tId, partic) {
  if (!tId) return 'A definir';
  const p = partic[tId];
  return p ? (p.nome || 'A definir') : 'A definir';
}

// ── SECÇÃO 11: ajustarResponsividade() ─────────────────────

function ajustarResponsividade() {
  const container = document.getElementById('bracket-container');
  const svg = container.querySelector('svg');
  if (!svg) return;

  const vb = svg.getAttribute('viewBox');
  if (!vb) return;
  const partes = vb.split(' ').map(Number);
  const larguraSVG = partes[2];
  const alturaSVG = partes[3];
  const larguraContainer = container.getBoundingClientRect().width;
  const ratio = larguraContainer / larguraSVG;

  // Remover gradientes anteriores
  const gradExist = container.querySelectorAll('.bracket-gradient');
  gradExist.forEach(g => g.remove());

  if (ratio >= 1) {
    svg.style.width = larguraSVG + 'px';
    svg.style.height = alturaSVG + 'px';
  } else if (ratio >= 0.45) {
    svg.style.width = '100%';
    svg.style.height = 'auto';
  } else {
    svg.style.width = larguraSVG + 'px';
    svg.style.height = 'auto';
    container.style.position = 'relative';

    const gradEsq = document.createElement('div');
    gradEsq.className = 'bracket-gradient';
    gradEsq.style.cssText = 'position:absolute;left:0;top:0;height:100%;width:32px;background:linear-gradient(to right,#0a0d13,transparent);pointer-events:none;z-index:2;';

    const gradDir = document.createElement('div');
    gradDir.className = 'bracket-gradient';
    gradDir.style.cssText = 'position:absolute;right:0;top:0;height:100%;width:32px;background:linear-gradient(to left,#0a0d13,transparent);pointer-events:none;z-index:2;';

    container.appendChild(gradEsq);
    container.appendChild(gradDir);
  }
}

// Listener de resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(ajustarResponsividade, 200);
});

// ── SECÇÃO 12: exportarPNG() ───────────────────────────────

window.exportarPNG = async function () {
  const svgEl = document.querySelector('#bracket-container svg');
  if (!svgEl) {
    mostrarToast('Bracket não disponível.', 'error');
    return;
  }

  const nomeCamp = campeonatoActivo?.nome || 'bracket';

  try {
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = function () {
      const vb = svgEl.getAttribute('viewBox').split(' ').map(Number);
      const imgW = vb[2];
      const imgH = vb[3];

      const canvas = document.createElement('canvas');
      canvas.width = imgW;
      canvas.height = imgH;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0a0d13';
      ctx.fillRect(0, 0, imgW, imgH);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(function (pngBlob) {
        if (!pngBlob) {
          mostrarToast('Erro ao gerar imagem.', 'error');
          return;
        }
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.download = `bracket-${nomeCamp.replace(/\s+/g, '_')}.png`;
        a.href = pngUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        }, 1000);
        mostrarToast('Imagem guardada!', 'success');
      }, 'image/png');
    };

    img.onerror = function () {
      mostrarToast('Erro ao processar imagem.', 'error');
    };

    img.src = url;
  } catch (e) {
    mostrarToast('Erro ao exportar: ' + e.message, 'error');
  }
};

// ── SECÇÃO 13: partilharBracket() ──────────────────────────

window.partilharBracket = async function () {
  const nomeCamp = campeonatoActivo?.nome || 'bracket';

  try {
    const canvas = await gerarCanvasBracket();
    if (!canvas) return;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      mostrarToast('Erro ao gerar imagem.', 'error');
      return;
    }

    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], `bracket-${nomeCamp.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Bracket — ' + nomeCamp,
            text: '🏆 Vê a chave do campeonato ' + nomeCamp,
            files: [file]
          });
          return;
        }
      } catch (shareErr) {
        // Fallback se compartilhar falhar
      }
    }

    // Fallback: download + WhatsApp Web
    const pngUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `bracket-${nomeCamp.replace(/\s+/g, '_')}.png`;
    a.href = pngUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.open(
      'https://wa.me/?text=' + encodeURIComponent('🏆 Bracket do campeonato ' + nomeCamp),
      '_blank'
    );

    setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } catch (e) {
    mostrarToast('Erro ao partilhar: ' + e.message, 'error');
  }
};

async function gerarCanvasBracket() {
  const svgEl = document.querySelector('#bracket-container svg');
  if (!svgEl) {
    mostrarToast('Bracket não disponível.', 'error');
    return null;
  }

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise(resolve => {
    const img = new Image();
    img.onload = function () {
      const vb = svgEl.getAttribute('viewBox').split(' ').map(Number);
      const canvas = document.createElement('canvas');
      canvas.width = vb[2];
      canvas.height = vb[3];
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0d13';
      ctx.fillRect(0, 0, vb[2], vb[3]);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// ── SECÇÃO 14: configurarNavegacao() ───────────────────────

function configurarNavegacao() {
  // Botões fixos do ecrã 3
  document.getElementById('btn-voltar-detalhe')?.addEventListener('click', () => {
    mostrarEcra('ecra-detalhe');
  });

  document.getElementById('btn-guardar-png')?.addEventListener('click', exportarPNG);
  document.getElementById('btn-partilhar-whatsapp')?.addEventListener('click', partilharBracket);
}

// ── SECÇÃO 15: Funções auxiliares ──────────────────────────

function mostrarEcra(id) {
  ['ecra-lista', 'ecra-detalhe', 'ecra-bracket'].forEach(eid => {
    const el = document.getElementById(eid);
    if (el) el.style.display = eid === id ? 'block' : 'none';
  });
}

function corAvatar(uid) {
  if (!uid) return CORES_AVATAR[0];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash += uid.charCodeAt(i);
  }
  return CORES_AVATAR[hash % CORES_AVATAR.length];
}

function iniciaisNome(nome) {
  if (!nome || !nome.trim()) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

function truncarNome(nome, max) {
  if (!nome || !nome.trim()) return '';
  if (nome.length > max) return nome.slice(0, max - 1) + '…';
  return nome;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeXml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function mostrarToast(mensagem, tipo) {
  tipo = tipo || 'success';
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const el = document.createElement('div');
  el.className = 'toast toast-' + tipo;
  el.innerHTML = `
    <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'times-circle' : 'info-circle'}"></i>
    <span>${escapeHtml(mensagem)}</span>`;

  container.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3500);
}
