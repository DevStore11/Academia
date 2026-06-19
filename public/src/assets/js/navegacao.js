// ============================================================
// LOGOUT
// ============================================================
window.fazerLogout = async function() {
  await signOut(auth);
  window.location.href = "../pages/login.html";
};

function preencherSelectsComCache(campeonatos) {
  const ids = [
    "select-campeonato-jogadores",
    "select-campeonato-resultados",
    "select-campeonato-bracket",
    "select-campeonato-grupos"
  ];
  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = `<option value="">— Seleccione um campeonato —</option>`;
    campeonatos.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
    if (val) sel.value = val;
  });
}

// ============================================================
// NAVEGAÇÃO — Tabs
// ============================================================
window.mudarTab = function(el) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));

  const tabId = el.dataset.tab;
  const sec   = document.getElementById(tabId);
  if (sec) sec.classList.add("active");
  el.classList.add("active");

  const titulos = {
    "meus-campeonatos"   : "Meus Campeonatos",
    "criar-campeonato"   : "Criar Campeonato",
    "adicionar-jogadores": "Inscrever Jogadores",
    "resultados"         : "Inserir Resultados",
    "bracket"            : "Bracket Eliminatória",
    "grupos"             : "Ver Fases"
  };
  document.getElementById("pageTitle").textContent = titulos[tabId] || tabId;
};

window.mudarTabPorNome = function(tabId) {
  const el = document.querySelector(`[data-tab="${tabId}"]`);
  if (el) mudarTab(el);
};

// ============================================================
// SIDEBAR
// ============================================================
window.toggleSidebar = function() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("active");
};