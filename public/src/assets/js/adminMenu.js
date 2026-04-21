const hamburger = document.querySelector('.hamburger');
const sidebar = document.querySelector('.sidebar');
const content = document.querySelector('.content');

hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  content.classList.toggle('full-width');
});

function inicializarTabs() {
  const menuItems = document.querySelectorAll(".menu-item");
  const tabContents = document.querySelectorAll(".tab-content");

  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      menuItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      tabContents.forEach(tab => tab.classList.remove("active"));
      const tabId = item.getAttribute("data-tab");
      document.getElementById(tabId)?.classList.add("active");

      document.getElementById("pageTitle").textContent =
        "Painel Admin - " + item.querySelector("span").textContent;
    });
  });
}