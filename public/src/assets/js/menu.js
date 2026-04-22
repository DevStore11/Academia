 const menuItems = document.querySelectorAll('.menu-item');
  const tabContents = document.querySelectorAll('.tab-content');

  menuItems.forEach(item => {
    item.addEventListener('click', function () {
      menuItems.forEach(menuItem => menuItem.classList.remove('active'));
      this.classList.add('active');
      tabContents.forEach(tab => tab.classList.remove('active'));

      const tabId = this.getAttribute('data-tab');
      const correspondingTab = document.getElementById(tabId);
      if (correspondingTab) {
        correspondingTab.classList.add('active');
        const pageTitle = document.getElementById('pageTitle');
        const tabName = this.querySelector('span').textContent;
        pageTitle.textContent = `Painel Admin - ${tabName}`;
      }
    });
  });
const btnHamburger = document.getElementById("hamburgerBtn");
const menuNav = document.getElementById("menuNav");

btnHamburger.addEventListener("click", () => {
    menuNav.classList.toggle("ativo");
});
