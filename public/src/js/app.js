// ==================== Menu e Header ====================

// Seleciona elementos do header
const nav = document.querySelector('header nav');
const menuDesktop = nav.querySelector('ul');
const botoes = nav.querySelector('div');
const header = document.querySelector('header');

// Cria o botão hamburger
const botaoHamburger = document.createElement('button');
botaoHamburger.innerHTML = '☰';
botaoHamburger.style.fontSize = '1.5rem';
botaoHamburger.style.backgroundColor = 'white';
botaoHamburger.style.background = 'none';
botaoHamburger.style.border = 'none';
botaoHamburger.style.cursor = 'pointer';
botaoHamburger.style.display = 'none'; // começa oculto
nav.appendChild(botaoHamburger);

// Cria um menu mobile escondido
const menuMobile = document.createElement('div');
menuMobile.style.position = 'absolute';
menuMobile.style.top = '100%';
menuMobile.style.right = '0';
menuMobile.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
menuMobile.style.backdropFilter = 'blur(10px)';
menuMobile.style.border = '1px solid #e5e7eb';
menuMobile.style.borderRadius = '0.5rem';
menuMobile.style.padding = '1rem';
menuMobile.style.display = 'none';
menuMobile.style.flexDirection = 'column';
menuMobile.style.gap = '1rem';
menuMobile.style.zIndex = '100';
nav.appendChild(menuMobile);

// Move links e botões para o menu mobile
const links = Array.from(menuDesktop.querySelectorAll('li')).map(li => li.cloneNode(true));
links.forEach(link => menuMobile.appendChild(link));
const botoesClone = botoes.cloneNode(true);
menuMobile.appendChild(botoesClone);

// ==================== Função de Responsividade ====================
function atualizarLayout() {
    const larguraTela = window.innerWidth;

    // ===== Menu =====
    if(larguraTela < 768) {
        menuDesktop.style.display = 'none';
        botoes.style.display = 'none';
        botaoHamburger.style.display = 'block';
    } else {
        menuDesktop.style.display = 'flex';
        botoes.style.display = 'flex';
        botaoHamburger.style.display = 'none';
        menuMobile.style.display = 'none';
    }

    // ===== Hero Section =====
    const h1 = document.querySelector('#inicio h1');
    const p = document.querySelector('#inicio p');
    const botoesHero = document.querySelectorAll('#inicio button');

    // Ajusta h1
    if (larguraTela < 480) {
        h1.style.fontSize = '2rem';
    } else if (larguraTela < 768) {
        h1.style.fontSize = '2.5rem';
    } else if (larguraTela < 1024) {
        h1.style.fontSize = '3.5rem';
    } else {
        h1.style.fontSize = '4rem';
    }

    // Ajusta parágrafo
    if (larguraTela < 480) {
        p.style.fontSize = '0.9rem';
        p.style.maxWidth = '90%';
    } else if (larguraTela < 768) {
        p.style.fontSize = '1rem';
        p.style.maxWidth = '35rem';
    } else if (larguraTela < 1024) {
        p.style.fontSize = '1.1rem';
        p.style.maxWidth = '38rem';
    } else {
        p.style.fontSize = '1.125rem';
        p.style.maxWidth = '40rem';
    }

    // Ajusta botões da Hero Section
    botoesHero.forEach(btn => {
        if (larguraTela < 480) {
            btn.style.fontSize = '0.9rem';
            btn.style.padding = '0.6rem 1rem';
        } else if (larguraTela < 768) {
            btn.style.fontSize = '1rem';
            btn.style.padding = '0.8rem 1.5rem';
        } else {
            btn.style.fontSize = '1.125rem';
            btn.style.padding = '1rem 2rem';
        }
    });

    // Ajusta grid dos cards 👥🏆⚡
    const cards = document.querySelectorAll('#inicio > div div[style*="grid-template-columns"] > div');
    cards.forEach(card => {
        if(larguraTela < 480){
            card.style.padding = '0.8rem';
        } else if(larguraTela < 768){
            card.style.padding = '1rem';
        } else {
            card.style.padding = '1.5rem';
        }
    });
}

// ==================== Eventos ====================
botaoHamburger.addEventListener('click', () => {
    menuMobile.style.display = menuMobile.style.display === 'flex' ? 'none' : 'flex';
});

window.addEventListener('resize', atualizarLayout);
window.addEventListener('load', atualizarLayout);
