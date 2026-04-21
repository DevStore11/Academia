const botao = document.getElementById("botaoHamburguer");
const menu = document.getElementById("menuMobile");

botao.addEventListener("click", () => {
    menu.classList.toggle("menu-aberto");
});
