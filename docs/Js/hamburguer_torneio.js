const botaoHamburguer = document.getElementById('botaoHamburguer');
const menuMobile = document.getElementById('menuMobile');

botaoHamburguer.addEventListener('click', () => {
    menuMobile.style.display = menuMobile.style.display === 'flex' ? 'none' : 'flex';
});
