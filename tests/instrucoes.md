
Contexto do projecto:
Dashboard de gestão de campeonatos de e-sports (Power Play E-Sport / academiadefifa.com).
Stack: Vanilla JS ES Modules, Firebase Auth, CSS custom properties.
Bug a corrigir: em mobile/tablet, após fechar a sidebar, um overlay invisível fica a cobrir
toda a página bloqueando cliques em botões, inputs e qualquer elemento interactivo.
Causa: conflito entre controlo de display/pointerEvents via CSS (classes) e via JS (style inline).

Caminho C:\Emerson-Projetos\firebase1> 

Ficheiros a editar:
- public/src/assets/js/power.js
- public/src/assets/css/testeCampeonato.css

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TAREFA — PARTE 1: Eventos.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASSO 1 — Reescrever a função `toggleSidebar`.
Localizar:

  window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const abrir = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    overlay.style.pointerEvents = abrir ? 'auto' : 'none';
  };

Substituir por:

  window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  };

PASSO 2 — Corrigir o bloco mobile dentro de `mudarTab`.
Localizar:

  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
  }

Substituir por:

  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('overlay').style.pointerEvents = '';
  }

PASSO 3 — Limpar o bloco `DOMContentLoaded` no fundo do ficheiro.
Localizar:

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('overlay');
    overlay.style.pointerEvents = 'none';
    overlay.addEventListener('click', function () {
      if (this.classList.contains('active')) window.toggleSidebar();
    });
  });

Substituir por:

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('overlay');
    overlay.addEventListener('click', function () {
      if (this.classList.contains('active')) window.toggleSidebar();
    });
  });

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TAREFA — PARTE 2: testeCampeonato.css
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASSO 4 — Corrigir os estilos do `.sidebar-overlay`.
Localizar:

  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 149;
    background: rgba(0,0,0,.65);
    backdrop-filter: blur(3px);
    opacity: 0;
    transition: opacity var(--transition);
  }
  .sidebar-overlay.active {
    opacity: 1;
     display: block;
  }

Substituir por:

  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 149;
    background: rgba(0,0,0,.65);
    backdrop-filter: blur(3px);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition);
  }
  .sidebar-overlay.active {
    display: block;
    opacity: 1;
    pointer-events: auto;
  }

REGRAS OBRIGATÓRIAS:
- Não alterar nenhuma outra função do Eventos.js fora das mencionadas
- Não alterar nenhuma outra regra CSS fora do bloco .sidebar-overlay
- Não alterar ficheiros fora da lista acima
- Não mudar nomes de variáveis, funções ou classes que não foram mencionados
- Manter o mesmo estilo de código (aspas simples no JS, indentação 2 espaços)
- Se houver dúvida sobre algum passo, parar e perguntar antes de executar