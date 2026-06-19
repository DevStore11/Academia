import { db, auth } from './firebaseConfig.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, query, where, orderBy, serverTimestamp,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';

let uidLogado = null;
let campeonatoActivo = null;
let numJogadoresSel = 16;
let todosJogadores = [];
let jogadoresSelecionados = [];
let _cacheCampeonatos = [];
let jogoResultadoActivo = null;
let campResultadoActivo = null;
let participantesActivos = {};

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = '../pages/login.html';
    return;
  }
  uidLogado = user.uid;
  verificarOrganizador();
});

async function verificarOrganizador() {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uidLogado));
    if (!snap.exists()) {
      window.location.href = '../pages/login.html';
      return;
    }
    const dados = snap.data();
    if (dados.role !== 'organizer') {
      window.location.href = '../pages/login.html';
      return;
    }
    document.getElementById('userNameHeader').textContent = dados.nome || 'Organizador';
    document.getElementById('userAvatarHeader').textContent = dados.nome ? dados.nome.charAt(0).toUpperCase() : 'O';
    await carregarMeusCampeonatos();
  } catch (e) {
    window.location.href = '../pages/login.html';
  }
}

window.toggleSidebar = function () {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
};

window.mudarTab = function (el) {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('overlay').style.pointerEvents = '';
  }
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

  const tabId = el.dataset.tab;
  const sec = document.getElementById(tabId);
  if (sec) sec.classList.add('active');
  el.classList.add('active');

  const titulos = {
    'meus-campeonatos': 'Meus Campeonatos',
    'criar-campeonato': 'Criar Campeonato',
    'adicionar-jogadores': 'Inscrever Jogadores',
    resultados: 'Inserir Resultados',
    bracket: 'Bracket Eliminatória',
    grupos: 'Ver Fases'
  };
  document.getElementById('pageTitle').textContent = titulos[tabId] || tabId;

  if (tabId === 'meus-campeonatos') carregarMeusCampeonatos();
  else if (tabId === 'adicionar-jogadores') iniciarSecaoJogadores();
  else if (tabId === 'resultados') iniciarSecaoResultados();
  else if (tabId === 'bracket') iniciarSecaoBracket();
  else if (tabId === 'grupos') iniciarSecaoGrupos();
};

window.mudarTabPorNome = function (tabId) {
  const el = document.querySelector(`[data-tab="${tabId}"]`);
  if (el) mudarTab(el);
};

window.fazerLogout = async function () {
  await signOut(auth);
  window.location.href = '../pages/login.html';
};

function mostrarToast(mensagem, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `
    <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'times-circle' : 'info-circle'}"></i>
    <span>${mensagem}</span>
  `;
  container.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

const NOMES_FASES = {
  2: ['Semifinal', 'Final'],
  3: ['Quartas', 'Meias', 'Final'],
  4: ['Oitavas', 'Quartas', 'Meias', 'Final'],
  5: ['32avos', 'Oitavas', 'Quartas', 'Meias', 'Final']
};

function nomeFase(ordem, total) {
  return (NOMES_FASES[total] || [])[ordem - 1] || `Fase ${ordem}`;
}

function embaralhar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function preencherSelectsComCache(campeonatos) {
  const ids = [
    'select-campeonato-jogadores',
    'select-campeonato-resultados',
    'select-campeonato-bracket',
    'select-campeonato-grupos'
  ];
  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">— Seleccione um campeonato —</option>';
    campeonatos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
    if (val) sel.value = val;
  });
}

async function carregarMeusCampeonatos() {
  const container = document.getElementById('lista-campeonatos');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div> A carregar campeonatos...</div>';

  try {
    const snap = await getDocs(
      query(collection(db, 'Champions'), where('criado_por', '==', uidLogado), orderBy('criado_em', 'desc'))
    );

    let total = 0, ativos = 0, finalizados = 0;
    const cards = [];
    _cacheCampeonatos = [];

    snap.forEach(d => {
      total++;
      const c = d.data();
      _cacheCampeonatos.push({ id: d.id, nome: c.nome, status: c.status });
      if (c.status === 'em_curso') ativos++;
      if (c.status === 'finalizado') finalizados++;

      const statusCor = { em_curso: 'green', aguardando: 'blue', finalizado: 'orange' }[c.status] || 'blue';
      const statusLabel = { em_curso: 'Em Curso', aguardando: 'Aguardando', finalizado: 'Finalizado' }[c.status] || c.status;

      cards.push(`
        <div class="campeonato-card">
          <div class="campeonato-card-header">
            <div class="campeonato-info">
              <div class="campeonato-nome">${c.nome}</div>
              <div class="campeonato-meta">
                <span><i class="fas fa-users"></i> ${c.tamanho} jogadores</span>
                ${c.data ? `<span><i class="fas fa-calendar"></i> ${c.data}</span>` : ''}
                ${c.local ? `<span><i class="fas fa-map-marker-alt"></i> ${c.local}</span>` : ''}
              </div>
            </div>
            <span class="badge badge-${statusCor}">${statusLabel}</span>
          </div>
          <div class="campeonato-card-footer" style="display:flex;justify-content:flex-end;gap:8px;">
            <button class="btn btn-sm btn-primary" onclick="selecionarCampeonato('${d.id}')">
              <i class="fas fa-check"></i> Seleccionar
            </button>
          </div>
        </div>
      `);
    });

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-ativos').textContent = ativos;
    document.getElementById('stat-finalizados').textContent = finalizados;

    preencherSelectsComCache(_cacheCampeonatos);

    container.innerHTML = cards.length
      ? `<div class="campeonatos-grid">${cards.join('')}</div>`
      : '<div class="empty-state"><i class="fas fa-trophy"></i><p>Nenhum campeonato criado ainda.</p></div>';
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar: ${e.message}</p></div>`;
  }
}

window.selecionarCampeonato = function (id) {
  campeonatoActivo = id;
  const c = _cacheCampeonatos.find(c => c.id === id);
  if (!c) return;
  document.getElementById('select-campeonato-jogadores').value = id;
  document.getElementById('select-campeonato-resultados').value = id;
  document.getElementById('select-campeonato-bracket').value = id;
  document.getElementById('select-campeonato-grupos').value = id;
  if (c.status === 'aguardando') {
    mudarTabPorNome('adicionar-jogadores');
    carregarJogadoresCampeonato();
  } else if (c.status === 'em_curso') {
    mudarTabPorNome('resultados');
    carregarResultados();
  }
};

window.selecionarNumJogadores = function (btn) {
  document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  numJogadoresSel = parseInt(btn.dataset.num);

  document.getElementById('num-selecionado').textContent = `${numJogadoresSel} jogadores`;

  const previews = {
    4: 'Semifinal \u2192 Final',
    8: 'Quartos \u2192 Meias \u2192 Final',
    16: 'Oitavas \u2192 Quartos \u2192 Meias \u2192 Final',
    32: '32avos \u2192 Oitavas \u2192 Quartos \u2192 Meias \u2192 Final'
  };
  document.getElementById('grupos-preview').textContent = previews[numJogadoresSel] || '';
};

window.limparFormCampeonato = function () {
  ['nome-campeonato', 'descricao-campeonato', 'data-campeonato',
    'hora-campeonato', 'local-campeonato', 'premio-1', 'premio-2',
    'premio-3', 'taxa-inscricao'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const radio = document.querySelector('input[name="visibilidade"][value="publico"]');
  if (radio) radio.checked = true;

  numJogadoresSel = 16;
  document.querySelectorAll('.num-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.num === '16');
  });
  document.getElementById('num-selecionado').textContent = '16 jogadores';
  document.getElementById('grupos-preview').textContent = 'Oitavas \u2192 Quartos \u2192 Meias \u2192 Final';
};

window.criarCampeonato = async function () {
  const nome = document.getElementById('nome-campeonato').value.trim();
  if (!nome) {
    mostrarToast('Insira o nome do campeonato.', 'error');
    return;
  }

  const descricao = document.getElementById('descricao-campeonato').value.trim();
  const data = document.getElementById('data-campeonato').value;
  const hora = document.getElementById('hora-campeonato').value;
  const local = document.getElementById('local-campeonato').value.trim();
  const premio1 = document.getElementById('premio-1').value.trim();
  const premio2 = document.getElementById('premio-2').value.trim();
  const premio3 = document.getElementById('premio-3').value.trim();
  const taxa = document.getElementById('taxa-inscricao').value.trim();
  const visRadio = document.querySelector('input[name="visibilidade"]:checked');
  const visibilidade = visRadio ? visRadio.value : 'publico';

  const btn = document.querySelector('#criar-campeonato .btn-primary:last-child');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A criar...';

  try {
    const docRef = await addDoc(collection(db, 'Champions'), {
      nome,
      descricao: descricao || '',
      data: data || '',
      hora: hora || '',
      local: local || '',
      premio1: premio1 || '',
      premio2: premio2 || '',
      premio3: premio3 || '',
      taxa_inscricao: taxa || '',
      visibilidade,
      tamanho: numJogadoresSel,
      status: 'aguardando',
      fase_atual: null,
      chave_gerada: false,
      campeao: null,
      criado_por: uidLogado,
      criado_em: serverTimestamp()
    });

    mostrarToast('Campeonato criado!', 'success');
    limparFormCampeonato();
    campeonatoActivo = docRef.id;

    await carregarMeusCampeonatos();

    document.getElementById('select-campeonato-jogadores').value = docRef.id;
    mudarTabPorNome('adicionar-jogadores');
    carregarJogadoresCampeonato();
  } catch (e) {
    mostrarToast('Erro ao criar: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Criar Campeonato';
  }
};

async function iniciarSecaoJogadores() {
  const sel = document.getElementById('select-campeonato-jogadores');
  sel.innerHTML = '<option value="">— Seleccione um campeonato —</option>';
  _cacheCampeonatos
    .filter(c => c.status === 'aguardando' || c.status === 'em_curso')
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
  if (campeonatoActivo) sel.value = campeonatoActivo;
  if (sel.value) {
    document.getElementById('secao-adicionar-jogadores').style.display = 'block';
    await carregarJogadoresCampeonato();
  }
}

window.carregarJogadoresCampeonato = async function () {
  const id = document.getElementById('select-campeonato-jogadores').value;
  const secao = document.getElementById('secao-adicionar-jogadores');
  if (!id) {
    secao.style.display = 'none';
    return;
  }

  campeonatoActivo = id;
  secao.style.display = 'block';

  const campSnap = await getDoc(doc(db, 'Champions', id));
  if (!campSnap.exists()) return;
  const camp = campSnap.data();

  document.getElementById('max-jogadores').textContent = camp.tamanho;

  const inscSnap = await getDocs(collection(db, 'Champions', id, 'participantes'));
  const inscritosIds = new Set();
  inscSnap.forEach(d => inscritosIds.add(d.id));

  const listaEl = document.getElementById('lista-jogadores-cadastrados');
  listaEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div> A carregar jogadores...</div>';

  try {
    const usersSnap = await getDocs(query(collection(db, 'usuarios'), where('role', '==', 'usuario')));
    todosJogadores = [];
    usersSnap.forEach(d => todosJogadores.push({ id: d.id, ...d.data() }));

    if (todosJogadores.length === 0) {
      listaEl.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Nenhum jogador cadastrado.</p></div>';
      return;
    }

    jogadoresSelecionados = [...inscritosIds];
    renderizarListaJogadores(camp.tamanho);
  } catch (e) {
    listaEl.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro: ${e.message}</p></div>`;
  }
};

function renderizarListaJogadores(max) {
  const listaEl = document.getElementById('lista-jogadores-cadastrados');
  const filtro = (document.getElementById('search-jogadores')?.value || '').toLowerCase();
  const filtrados = todosJogadores.filter(j =>
    (j.nome || '').toLowerCase().includes(filtro)
  );

  if (filtrados.length === 0) {
    listaEl.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Nenhum jogador encontrado.</p></div>';
    return;
  }

  listaEl.innerHTML = filtrados.map(j => {
    const selecionado = jogadoresSelecionados.includes(j.id);
    const jaInscrito = selecionado;
    return `
      <div class="jogador-item ${selecionado ? 'selected' : ''}" onclick="${jaInscrito ? '' : `toggleJogador('${j.id}',${max})`}" id="jog-${j.id}" style="${jaInscrito ? 'opacity:0.7;' : ''}">
        <div class="jogador-info">
          <div class="jogador-nome">${j.nome || '—'}</div>
          <div class="jogador-meta">${j.bairro || ''}</div>
        </div>
        <div class="jogador-check ${selecionado ? 'checked' : ''}">
          <i class="fas fa-${selecionado ? 'check-circle' : 'circle'}"></i>
        </div>
      </div>
    `;
  }).join('');

  atualizarContadorJogadores(max);
}

window.toggleJogador = function (userId, max) {
  const idx = jogadoresSelecionados.indexOf(userId);
  if (idx === -1) {
    if (jogadoresSelecionados.length >= max) {
      mostrarToast(`Limite de ${max} jogadores atingido.`, 'error');
      return;
    }
    jogadoresSelecionados.push(userId);
  } else {
    jogadoresSelecionados.splice(idx, 1);
  }
  const id = document.getElementById('select-campeonato-jogadores').value;
  getDoc(doc(db, 'Champions', id)).then(snap => renderizarListaJogadores(snap.data().tamanho));
};

function atualizarContadorJogadores(max) {
  document.getElementById('count-selecionados').textContent = jogadoresSelecionados.length;
  document.getElementById('btn-confirmar-jogadores').disabled = jogadoresSelecionados.length !== max;
}

window.filtrarJogadores = function () {
  const id = document.getElementById('select-campeonato-jogadores').value;
  if (!id) return;
  getDoc(doc(db, 'Champions', id)).then(snap => renderizarListaJogadores(snap.data().tamanho));
};

window.confirmarJogadores = async function () {
  const id = document.getElementById('select-campeonato-jogadores').value;
  if (!id || jogadoresSelecionados.length === 0) return;

  const campSnap = await getDoc(doc(db, 'Champions', id));
  if (!campSnap.exists()) return;
  const camp = campSnap.data();

  if (jogadoresSelecionados.length !== camp.tamanho) {
    mostrarToast(`Seleccione exactamente ${camp.tamanho} jogadores.`, 'error');
    return;
  }

  const btn = document.getElementById('btn-confirmar-jogadores');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A gerar chave...';

  try {
    const embaralhados = embaralhar(jogadoresSelecionados);

    for (let i = 0; i < embaralhados.length; i++) {
      const uid = embaralhados[i];
      const user = todosJogadores.find(j => j.id === uid) || {};
      await setDoc(doc(db, 'Champions', id, 'participantes', uid), {
        userId: uid,
        nome: user.nome || 'Desconhecido',
        seed: i + 1,
        eliminado: false,
        inscrito_em: serverTimestamp()
      });
    }

    await gerarChave(id, embaralhados, camp.tamanho);

    await updateDoc(doc(db, 'Champions', id), {
      chave_gerada: true,
      status: 'em_curso',
      fase_atual: 'fase_001'
    });

    mostrarToast('Chave gerada! Torneio iniciado.', 'success');
    await preencherSelectsComCache(_cacheCampeonatos);
    await carregarMeusCampeonatos();
    document.getElementById('select-campeonato-resultados').value = id;
    mudarTabPorNome('resultados');
    carregarResultados();
  } catch (e) {
    mostrarToast('Erro ao gerar chave: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-random"></i> Sortear Chave e Iniciar Torneio';
  }
};

async function gerarChave(campId, jogadoresOrdenados, tamanho) {
  const numFases = Math.log2(tamanho);

  for (let f = 1; f <= numFases; f++) {
    const faseId = `fase_${String(f).padStart(3, '0')}`;
    await setDoc(doc(db, 'Champions', campId, 'fases', faseId), {
      nome: nomeFase(f, numFases),
      ordem: f,
      status: f === 1 ? 'pendente' : 'pendente',
      total_jogos: tamanho / Math.pow(2, f),
      concluidos: 0
    });
  }

  const numJogos1 = tamanho / 2;
  for (let j = 0; j < numJogos1; j++) {
    const jogoId = `fase_001_jogo_${String(j + 1).padStart(3, '0')}`;
    const proximoJogoId = numFases > 1 ? `fase_002_jogo_${String(Math.floor(j / 2) + 1).padStart(3, '0')}` : null;
    const proximoSlot = proximoJogoId ? (j % 2 === 0 ? 'time1' : 'time2') : null;

    await setDoc(doc(db, 'Champions', campId, 'fases', 'fase_001', 'jogos', jogoId), {
      jogoId,
      time1_id: jogadoresOrdenados[j * 2],
      time2_id: jogadoresOrdenados[j * 2 + 1],
      gols1: null,
      gols2: null,
      vencedor_id: null,
      status_jogo: 'pendente',
      posicao_chave: { fase: 1, slot: j + 1 },
      proximo_jogo_id: proximoJogoId,
      proximo_slot: proximoSlot,
      criado_em: serverTimestamp()
    });
  }

  for (let f = 2; f <= numFases; f++) {
    const faseId = `fase_${String(f).padStart(3, '0')}`;
    const numJogos = tamanho / Math.pow(2, f);

    for (let j = 0; j < numJogos; j++) {
      const jogoId = `${faseId}_jogo_${String(j + 1).padStart(3, '0')}`;
      const proximaFaseId = f < numFases ? `fase_${String(f + 1).padStart(3, '0')}` : null;
      const proximoJogoId = proximaFaseId
        ? `${proximaFaseId}_jogo_${String(Math.floor(j / 2) + 1).padStart(3, '0')}`
        : null;
      const proximoSlot = proximoJogoId ? (j % 2 === 0 ? 'time1' : 'time2') : null;

      await setDoc(doc(db, 'Champions', campId, 'fases', faseId, 'jogos', jogoId), {
        jogoId,
        time1_id: null,
        time2_id: null,
        gols1: null,
        gols2: null,
        vencedor_id: null,
        status_jogo: 'pendente',
        posicao_chave: { fase: f, slot: j + 1 },
        proximo_jogo_id: proximoJogoId,
        proximo_slot: proximoSlot,
        criado_em: serverTimestamp()
      });
    }
  }
}

async function iniciarSecaoResultados() {
  const sel = document.getElementById('select-campeonato-resultados');
  sel.innerHTML = '<option value="">— Seleccione um campeonato —</option>';
  _cacheCampeonatos
    .filter(c => c.status === 'em_curso')
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
  if (campeonatoActivo) sel.value = campeonatoActivo;
  if (sel.value) {
    await carregarResultados();
  }
}

window.carregarResultados = async function () {
  const id = document.getElementById('select-campeonato-resultados').value;

  document.getElementById('selector-fase-resultados').style.display = 'none';
  document.getElementById('selector-jogo-resultados').style.display = 'none';
  document.getElementById('card-resultado-directo').style.display = 'none';
  document.getElementById('secao-resultados-empty').style.display = 'flex';
  document.getElementById('select-fase-resultados').innerHTML = '<option value="">— Seleccione uma fase —</option>';
  document.getElementById('select-jogo-resultados').innerHTML = '<option value="">— Seleccione um confronto —</option>';
  jogoResultadoActivo = null;
  campResultadoActivo = null;
  participantesActivos = {};

  if (!id) return;

  campResultadoActivo = id;

  try {
    const partSnap = await getDocs(collection(db, 'Champions', id, 'participantes'));
    partSnap.forEach(d => { participantesActivos[d.id] = d.data(); });

    const fasesSnap = await getDocs(
      query(collection(db, 'Champions', id, 'fases'), orderBy('ordem'))
    );
    const fases = [];
    fasesSnap.forEach(d => {
      const f = d.data();
      if (f.status !== 'concluido') {
        fases.push({ id: d.id, ...f });
      }
    });

    if (fases.length === 0) {
      document.getElementById('secao-resultados-empty').innerHTML =
        '<i class="fas fa-futbol"></i><p>Nenhuma fase activa encontrada.</p>';
      return;
    }

    const sel = document.getElementById('select-fase-resultados');
    fases.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.nome;
      sel.appendChild(opt);
    });

    document.getElementById('selector-fase-resultados').style.display = 'block';
    document.getElementById('secao-resultados-empty').style.display = 'none';

    if (fases.length === 1) {
      sel.value = fases[0].id;
      carregarJogosResultados();
    }
  } catch (e) {
    mostrarToast('Erro ao carregar fases: ' + e.message, 'error');
  }
};

window.carregarJogosResultados = async function () {
  const faseId = document.getElementById('select-fase-resultados').value;
  const selJogo = document.getElementById('select-jogo-resultados');

  selJogo.innerHTML = '<option value="">— Seleccione um confronto —</option>';
  document.getElementById('selector-jogo-resultados').style.display = 'none';
  document.getElementById('card-resultado-directo').style.display = 'none';
  jogoResultadoActivo = null;

  if (!faseId || !campResultadoActivo) return;

  try {
    const jogosSnap = await getDocs(
      query(
        collection(db, 'Champions', campResultadoActivo, 'fases', faseId, 'jogos'),
        orderBy('posicao_chave.slot')
      )
    );

    let temJogosPendentes = false;
    jogosSnap.forEach(d => {
      const j = d.data();
      if (j.time1_id && j.time2_id && j.status_jogo !== 'concluido') {
        temJogosPendentes = true;
        const t1 = participantesActivos[j.time1_id] || { nome: '?' };
        const t2 = participantesActivos[j.time2_id] || { nome: '?' };
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${t1.nome} vs ${t2.nome}`;
        opt.dataset.faseId = faseId;
        opt.dataset.time1Id = j.time1_id;
        opt.dataset.time2Id = j.time2_id;
        opt.dataset.proximoJogoId = j.proximo_jogo_id || '';
        opt.dataset.proximoSlot = j.proximo_slot || '';
        selJogo.appendChild(opt);
      }
    });

    if (!temJogosPendentes) {
      mostrarToast('Todos os jogos desta fase já foram concluídos.', 'info');
      return;
    }

    document.getElementById('selector-jogo-resultados').style.display = 'block';
  } catch (e) {
    mostrarToast('Erro ao carregar jogos: ' + e.message, 'error');
  }
};

window.selecionarJogoResultados = function () {
  const selJogo = document.getElementById('select-jogo-resultados');
  const opt = selJogo.options[selJogo.selectedIndex];

  document.getElementById('card-resultado-directo').style.display = 'none';
  document.getElementById('golos-casa').value = '';
  document.getElementById('golos-fora').value = '';
  jogoResultadoActivo = null;

  if (!opt || !opt.value) return;

  const time1Id = opt.dataset.time1Id;
  const time2Id = opt.dataset.time2Id;
  const t1 = participantesActivos[time1Id] || { nome: '?', clube: '—' };
  const t2 = participantesActivos[time2Id] || { nome: '?', clube: '—' };

  document.getElementById('nome-time1-resultado').textContent = t1.nome || '?';
  document.getElementById('nome-time2-resultado').textContent = t2.nome || '?';
  document.getElementById('clube-time1-resultado').textContent = t1.bairro || '—';
  document.getElementById('clube-time2-resultado').textContent = t2.bairro || '—';

  jogoResultadoActivo = {
    jogoId: opt.value,
    faseId: opt.dataset.faseId,
    time1Id: time1Id,
    time2Id: time2Id,
    proximoJogoId: opt.dataset.proximoJogoId || null,
    proximoSlot: opt.dataset.proximoSlot || null
  };

  document.getElementById('card-resultado-directo').style.display = 'block';
};

window.guardarResultado = async function () {
  if (!jogoResultadoActivo || !campResultadoActivo) {
    mostrarToast('Nenhum jogo seleccionado.', 'error');
    return;
  }

  const g1 = parseInt(document.getElementById('golos-casa').value);
  const g2 = parseInt(document.getElementById('golos-fora').value);

  if (isNaN(g1) || isNaN(g2)) {
    mostrarToast('Insira os dois resultados.', 'error');
    return;
  }
  if (g1 === g2) {
    mostrarToast('Empates não são permitidos.', 'error');
    return;
  }

  const { jogoId, faseId, time1Id, time2Id, proximoJogoId, proximoSlot } = jogoResultadoActivo;
  const vencedorId = g1 > g2 ? time1Id : time2Id;

  const btn = document.getElementById('btn-guardar-resultado');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';

  try {
    await updateDoc(doc(db, 'Champions', campResultadoActivo, 'fases', faseId, 'jogos', jogoId), {
      gols1: g1,
      gols2: g2,
      vencedor_id: vencedorId,
      status_jogo: 'concluido'
    });

    if (proximoJogoId && proximoSlot) {
      const faseNumProx = proximoJogoId.split('_jogo_')[0];
      if (faseNumProx) {
        await updateDoc(
          doc(db, 'Champions', campResultadoActivo, 'fases', faseNumProx, 'jogos', proximoJogoId),
          { [`${proximoSlot}_id`]: vencedorId }
        );
      }
    }

    await verificarFaseConcluida(campResultadoActivo, faseId);
    mostrarToast('Resultado registado!', 'success');

    jogoResultadoActivo = null;
    document.getElementById('card-resultado-directo').style.display = 'none';
    document.getElementById('selector-jogo-resultados').style.display = 'none';
    document.getElementById('select-jogo-resultados').innerHTML = '<option value="">— Seleccione um confronto —</option>';
    document.getElementById('golos-casa').value = '';
    document.getElementById('golos-fora').value = '';

    await carregarJogosResultados();

    const bracketSel = document.getElementById('select-campeonato-bracket');
    if (bracketSel?.value === campResultadoActivo) carregarBracket();
  } catch (e) {
    mostrarToast('Erro ao guardar: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Registar Resultado';
  }
};

async function verificarFaseConcluida(campId, faseId) {
  const jogosSnap = await getDocs(collection(db, 'Champions', campId, 'fases', faseId, 'jogos'));
  let total = 0, concluidos = 0;
  jogosSnap.forEach(d => {
    if (d.data().time1_id) {
      total++;
      if (d.data().status_jogo === 'concluido') concluidos++;
    }
  });

  await updateDoc(doc(db, 'Champions', campId, 'fases', faseId), { concluidos });

  if (total !== concluidos) return;

  await updateDoc(doc(db, 'Champions', campId, 'fases', faseId), { status: 'concluido' });

  const fasesSnap = await getDocs(query(collection(db, 'Champions', campId, 'fases'), orderBy('ordem')));
  const fases = [];
  fasesSnap.forEach(d => fases.push({ id: d.id, ...d.data() }));

  const idxAtual = fases.findIndex(f => f.id === faseId);
  if (idxAtual < fases.length - 1) {
    const proxFase = fases[idxAtual + 1];
    await updateDoc(doc(db, 'Champions', campId, 'fases', proxFase.id), { status: 'pendente' });
    await updateDoc(doc(db, 'Champions', campId), { fase_atual: proxFase.id });
    mostrarToast('Fase conclu\u00edda! Pr\u00f3xima fase desbloqueada.', 'success');
  } else {
    const finalJogoSnap = await getDocs(collection(db, 'Champions', campId, 'fases', faseId, 'jogos'));
    let campVencedorId = null;
    finalJogoSnap.forEach(d => {
      if (d.data().vencedor_id) campVencedorId = d.data().vencedor_id;
    });
    if (campVencedorId) {
      await updateDoc(doc(db, 'Champions', campId), {
        campeao: campVencedorId,
        status: 'finalizado'
      });
      const nomeCampeao = participantesActivos[campVencedorId]?.nome || '—';
      mostrarToast(`\u{1F3C6} ${nomeCampeao} \u00e9 o CAMPE\u00C3O!`, 'success');
    }
    await carregarMeusCampeonatos();
  }
}

async function iniciarSecaoBracket() {
  const sel = document.getElementById('select-campeonato-bracket');
  sel.innerHTML = '<option value="">— Seleccione um campeonato —</option>';
  _cacheCampeonatos.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nome;
    sel.appendChild(opt);
  });
  if (campeonatoActivo) sel.value = campeonatoActivo;
  if (sel.value) await carregarBracket();
}

window.carregarBracket = async function () {
  const id = document.getElementById('select-campeonato-bracket').value;
  const secao = document.getElementById('secao-bracket');

  if (!id) {
    secao.innerHTML = '<div class="empty-state"><i class="fas fa-sitemap"></i><p>Seleccione um campeonato.</p></div>';
    return;
  }

  campeonatoActivo = id;
  secao.innerHTML = '<div class="loading-spinner"><div class="spinner"></div> A carregar bracket...</div>';

  try {
    const campSnap = await getDoc(doc(db, 'Champions', id));
    if (!campSnap.exists()) {
      secao.innerHTML = '<div class="empty-state"><p>Campeonato n\u00e3o encontrado.</p></div>';
      return;
    }
    const camp = campSnap.data();

    if (!camp.chave_gerada) {
      secao.innerHTML = '<div class="empty-state"><i class="fas fa-sitemap"></i><p>Chave ainda n\u00e3o gerada.</p></div>';
      return;
    }

    const partSnap = await getDocs(collection(db, 'Champions', id, 'participantes'));
    const partic = {};
    partSnap.forEach(d => { partic[d.id] = d.data(); });

    const fasesSnap = await getDocs(query(collection(db, 'Champions', id, 'fases'), orderBy('ordem')));
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

    secao.innerHTML = renderizarBracket(dadosFases, partic, camp);
  } catch (e) {
    secao.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro: ${e.message}</p></div>`;
  }
};

function renderizarBracket(fases, partic, camp) {
  const totalFases = fases.length;

  function nomeTime(tId) {
    if (!tId) return 'A definir';
    const t = partic[tId];
    return t ? (t.nome || 'A definir') : 'A definir';
  }

  function golsTexto(jogo) {
    if (jogo.status_jogo === 'concluido') return `${jogo.gols1 ?? '-'}`;
    return '-';
  }

  function timeHTML(tId, vencedorId, concluido, isFinal) {
    const vazio = !tId;
    const isW = concluido && vencedorId === tId;
    const extraStyle = isFinal ? 'min-height:36px;' : '';
    return `
      <div class="br-time${isW ? ' winner' : ''}${vazio ? ' vazio' : ''}" style="${extraStyle}">
        <span class="br-nome">${nomeTime(tId)}</span>
        ${isW ? '<span class="br-win-dot"></span>' : ''}
      </div>`;
  }

  function jogoHTML(jogo, isFinal) {
    if (!jogo) return `
      <div class="br-match">
        <div class="br-time vazio"><span class="br-nome">A definir</span></div>
        <div class="br-sep"><span class="br-vs">vs</span></div>
        <div class="br-time vazio"><span class="br-nome">A definir</span></div>
      </div>`;
    const con = jogo.status_jogo === 'concluido';
    return `
      <div class="br-match${con ? ' done' : ''}">
        ${timeHTML(jogo.time1_id, jogo.vencedor_id, con, isFinal)}
        <div class="br-sep">
          ${con
            ? `<span class="br-score">${jogo.gols1}\u2013${jogo.gols2}</span>`
            : '<span class="br-vs">vs</span>'}
        </div>
        ${timeHTML(jogo.time2_id, jogo.vencedor_id, con, isFinal)}
      </div>`;
  }

  const CONN_W = 24;
  const MATCH_H = 82;
  const MATCH_G = 16;

  function colHeight(numJogos) {
    return numJogos * MATCH_H + (numJogos - 1) * MATCH_G;
  }

  function connRoundSVG(jogos, alturaTotal, dir) {
    const n = jogos.length;
    const segH = alturaTotal / n;
    let paths = '';

    for (let i = 0; i < Math.floor(n / 2); i++) {
      const jogoSuperior = jogos[i * 2];
      const jogoInferior = jogos[i * 2 + 1];
      const winSup = jogoSuperior?.vencedor_id;
      const winInf = jogoInferior?.vencedor_id;

      const y1 = segH * (i * 2) + segH / 2;
      const y2 = segH * (i * 2 + 1) + segH / 2;
      const ym = (y1 + y2) / 2;

      if (dir === 'right') {
        paths += `<path d="M0,${y1} L${CONN_W / 2},${y1}" stroke="${winSup ? 'var(--accent-green)' : '#333'}" stroke-opacity="${winSup ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        paths += `<path d="M0,${y2} L${CONN_W / 2},${y2}" stroke="${winInf ? 'var(--accent-green)' : '#333'}" stroke-opacity="${winInf ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        paths += `<path d="M${CONN_W / 2},${y1} L${CONN_W / 2},${ym}" stroke="${winSup ? 'var(--accent-green)' : '#333'}" stroke-opacity="${winSup ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        paths += `<path d="M${CONN_W / 2},${y2} L${CONN_W / 2},${ym}" stroke="${winInf ? 'var(--accent-green)' : '#333'}" stroke-opacity="${winInf ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        paths += `<path d="M${CONN_W / 2},${ym} L${CONN_W},${ym}" stroke="var(--accent-green)" stroke-opacity="${(winSup || winInf) ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
      } else {
        paths += `<path d="M${CONN_W},${y1} L${CONN_W / 2},${y1}" stroke="${winSup ? 'var(--accent-green)' : '#333'}" stroke-opacity="${winSup ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        paths += `<path d="M${CONN_W},${y2} L${CONN_W / 2},${y2}" stroke="${winInf ? 'var(--accent-green)' : '#333'}" stroke-opacity="${winInf ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        paths += `<path d="M${CONN_W / 2},${y1} L${CONN_W / 2},${ym}" stroke="${winSup ? 'var(--accent-green)' : '#333'}" stroke-opacity="${winSup ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        paths += `<path d="M${CONN_W / 2},${y2} L${CONN_W / 2},${ym}" stroke="${winInf ? 'var(--accent-green)' : '#333'}" stroke-opacity="${winInf ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
        paths += `<path d="M${CONN_W / 2},${ym} L0,${ym}" stroke="var(--accent-green)" stroke-opacity="${(winSup || winInf) ? '1' : '0.5'}" stroke-width="1.5" fill="none"/>`;
      }
    }
    return `<svg width="${CONN_W}" height="${alturaTotal}" style="flex-shrink:0;display:block;align-self:center">${paths}</svg>`;
  }

  function connFinalSVG(altura, dir) {
    const ym = altura / 2;
    const d = dir === 'right'
      ? `M0,${ym} L${CONN_W},${ym}`
      : `M${CONN_W},${ym} L0,${ym}`;
    return `<svg width="${CONN_W}" height="${altura}" style="flex-shrink:0;display:block;align-self:center">
      <path d="${d}" stroke="var(--accent-green)" stroke-opacity="0.65" stroke-width="2" fill="none"/>
    </svg>`;
  }

  function jogosLado(faseIdx, lado) {
    const jogos = fases[faseIdx].jogos;
    const validos = jogos.filter(j => j.time1_id !== null || j.time2_id !== null);
    const lista = validos.length > 0 ? validos : jogos;
    const metade = Math.ceil(lista.length / 2);
    if (lado === 'esq') return lista.slice(0, metade);
    return lista.slice(metade).reverse();
  }

  let colunasEsq = [];
  let colunasDir = [];

  for (let f = 0; f < totalFases - 1; f++) {
    const fase = fases[f];
    const label = fase.nome.toUpperCase();
    const jogosEsq = jogosLado(f, 'esq');
    const jogosDir = jogosLado(f, 'dir');
    const nE = jogosEsq.length;
    const nD = jogosDir.length;
    const hE = colHeight(nE);
    const hD = colHeight(nD);

    const rowsEsq = jogosEsq.map(j => jogoHTML(j)).join(`<div style="height:${MATCH_G}px"></div>`);
    const rowsDir = jogosDir.map(j => jogoHTML(j)).join(`<div style="height:${MATCH_G}px"></div>`);

    colunasEsq.push(`
      <div class="br-round-wrap">
        <div class="br-round-label">${label}</div>
        <div class="br-round" style="height:${hE}px;width:128px">
          ${rowsEsq}
        </div>
      </div>`);

    colunasDir.push(`
      <div class="br-round-wrap">
        <div class="br-round-label">${label}</div>
        <div class="br-round" style="height:${hD}px;width:128px">
          ${rowsDir}
        </div>
      </div>`);

    if (f < totalFases - 2) {
      colunasEsq.push(connRoundSVG(jogosEsq, hE, 'right'));
      colunasDir.push(connRoundSVG(jogosDir, hD, 'left'));
    }
  }

  const semiIdx = totalFases - 2;
  const jogosSFE = jogosLado(semiIdx, 'esq');
  const jogosSFD = jogosLado(semiIdx, 'dir');
  const hSFE = colHeight(jogosSFE.length);
  const hSFD = colHeight(jogosSFD.length);

  colunasEsq.push(connFinalSVG(hSFE, 'right'));
  colunasDir.push(connFinalSVG(hSFD, 'left'));

  const jogoFinal = fases[totalFases - 1]?.jogos?.[0] || null;

  let campeaoNome = '';
  if (camp.campeao) {
    const cp = partic[camp.campeao];
    if (cp) campeaoNome = cp.nome || '';
  }

  const campeaoHTML = campeaoNome
    ? `<div style="text-align:center;margin-bottom:8px;font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--accent-green);">
        \u{1F3C6} ${campeaoNome}
      </div>`
    : '';

  const finalLabelHTML = campeaoNome
    ? ''
    : '<div class="br-round-label" style="margin-bottom:8px;">FINAL</div>';

  const centroHTML = `
    <div class="br-center">
      ${campeaoHTML}
      ${finalLabelHTML}
      <div class="br-final-block">
        <div class="br-match" style="margin-bottom:60px;">
          ${jogoHTML(jogoFinal, true)}
        </div>
      </div>
    </div>`;

  const htmlEsq = colunasEsq.join('');
  const htmlDir = [...colunasDir].reverse().join('');

  return `
    <div class="bracket-champions">
      <div class="bracket-scroll-x">
        <div class="bracket-inner">
          <div class="br-side br-left">${htmlEsq}</div>
          ${centroHTML}
          <div class="br-side br-right">${htmlDir}</div>
        </div>
      </div>
    </div>`;
}

async function iniciarSecaoGrupos() {
  const sel = document.getElementById('select-campeonato-grupos');
  sel.innerHTML = '<option value="">— Seleccione um campeonato —</option>';
  _cacheCampeonatos.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nome;
    sel.appendChild(opt);
  });
  if (campeonatoActivo) sel.value = campeonatoActivo;
  if (sel.value) await carregarGrupos();
}

window.carregarGrupos = async function () {
  const id = document.getElementById('select-campeonato-grupos').value;
  const secao = document.getElementById('secao-grupos');

  if (!id) {
    secao.innerHTML = '<div class="empty-state"><i class="fas fa-layer-group"></i><p>Seleccione um campeonato.</p></div>';
    return;
  }

  campeonatoActivo = id;
  secao.innerHTML = '<div class="loading-spinner"><div class="spinner"></div> A carregar fases...</div>';

  try {
    const partSnap = await getDocs(collection(db, 'Champions', id, 'participantes'));
    const partic = {};
    partSnap.forEach(d => { partic[d.id] = d.data(); });

    const fasesSnap = await getDocs(query(collection(db, 'Champions', id, 'fases'), orderBy('ordem')));
    const fases = [];
    fasesSnap.forEach(d => fases.push({ id: d.id, ...d.data() }));

    if (fases.length === 0) {
      secao.innerHTML = '<div class="empty-state"><i class="fas fa-layer-group"></i><p>Chave ainda n\u00e3o gerada.</p></div>';
      return;
    }

    const jogosPorFase = await Promise.all(
      fases.map(fase =>
        getDocs(
          query(collection(db, 'Champions', id, 'fases', fase.id, 'jogos'), orderBy('posicao_chave.slot'))
        ).then(snap => {
          const js = [];
          snap.forEach(d => js.push({ id: d.id, ...d.data() }));
          return js;
        })
      )
    );

    let html = '';
    fases.forEach((fase, fi) => {
      const jogos = jogosPorFase[fi];
      const statusLabel = { pendente: 'Pendente', concluido: 'Conclu\u00edda' }[fase.status] || 'Pendente';
      const statusCor = { pendente: 'gray', concluido: 'green' }[fase.status] || 'gray';

      html += `
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <div class="card-header-title">
              <i class="fas fa-layer-group"></i> ${fase.nome}
            </div>
            <span class="badge badge-${statusCor}">${statusLabel}</span>
          </div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${jogos.map(jogo => {
                const t1 = partic[jogo.time1_id] || { nome: 'A definir' };
                const t2 = partic[jogo.time2_id] || { nome: 'A definir' };
                const textoResultado = jogo.status_jogo === 'concluido'
                  ? `${jogo.gols1} x ${jogo.gols2}`
                  : 'Pendente';
                return `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;">
                    <span>${t1.nome} <strong>X</strong> ${t2.nome}</span>
                    <span style="color:${jogo.status_jogo === 'concluido' ? 'var(--accent-green)' : 'var(--text-tertiary)'};font-weight:600;">${textoResultado}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>`;
    });

    secao.innerHTML = html;
  } catch (e) {
    secao.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro: ${e.message}</p></div>`;
  }
};

window.partilharBracket = function () {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    mostrarToast('Link copiado!', 'success');
  }).catch(() => {
    mostrarToast('Erro ao copiar link.', 'error');
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('overlay');
  overlay.addEventListener('click', function () {
    if (this.classList.contains('active')) window.toggleSidebar();
  });
});
