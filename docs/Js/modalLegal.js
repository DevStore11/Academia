const abrirPoliticas = document.getElementById("abrir-politicas");
const modalPoliticas = document.getElementById("modal-politicas");
const fundoModal = document.getElementById("fundo-modal");
const fecharModal = document.getElementById("fechar-modal");

abrirPoliticas.addEventListener("click", function (e) {
  e.preventDefault();
  modalPoliticas.classList.add("ativo");
  fundoModal.style.display = "block";
});

fecharModal.addEventListener("click", fechar);
fundoModal.addEventListener("click", fechar);

function fechar() {
  modalPoliticas.classList.remove("ativo");
  fundoModal.style.display = "none";
}
