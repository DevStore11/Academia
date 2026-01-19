
// Carrossel automático
const imagens = document.querySelectorAll('.carousel-image');
let indice = 0;

function mostrarImagem() {
    imagens.forEach(img => img.classList.remove('active'));
    imagens[indice].classList.add('active');
    indice = (indice + 1) % imagens.length;
}

setInterval(mostrarImagem, 4000); 

// Menu Hamburger + Direct Link sempre
const botaoHamburguer = document.getElementById('botaoHamburguer');
const menuMobile = document.getElementById('menuMobile');

botaoHamburguer.addEventListener('click', () => {

    //                          
https://otieu.com/4/10373949
    // 👉 abre / fecha o menu
    menuMobile.style.display =
        menuMobile.style.display === 'flex' ? 'none' : 'flex';
});
