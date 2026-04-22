// =======================================
// CARROSSEL
// =======================================
(function () {
  const images = document.querySelectorAll(".carousel-image");
  const indicators = document.querySelectorAll(".indicator");
  let current = 0;
  let timer = null;

  function goTo(index) {
    images[current].classList.remove("active");
    indicators[current]?.classList.remove("active");
    current = (index + images.length) % images.length;
    images[current].classList.add("active");
    indicators[current]?.classList.add("active");
  }

  function next() {
    goTo(current + 1);
  }

  function startAuto() {
    stopAuto();
    timer = setInterval(next, 4000);
  }

  function stopAuto() {
    if (timer) clearInterval(timer);
  }

  // Clique nos indicadores
  indicators.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      goTo(i);
      startAuto(); // reinicia o timer ao clicar
    });
  });

  // Swipe em mobile
  let touchStartX = 0;

  document.querySelector(".carousel-container")?.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );

  document.querySelector(".carousel-container")?.addEventListener(
    "touchend",
    (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        goTo(diff > 0 ? current + 1 : current - 1);
        startAuto();
      }
    },
    { passive: true }
  );

  startAuto();
})();

// =======================================
// HAMBURGER MENU
// =======================================
(function () {
  const btn = document.getElementById("hamburgerBtn");
  const menu = document.getElementById("navMenu");

  if (!btn || !menu) return;

  function openMenu() {
    menu.classList.add("active");
    btn.classList.add("active");
    btn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden"; // impede scroll do fundo
  }

  function closeMenu() {
    menu.classList.remove("active");
    btn.classList.remove("active");
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function toggleMenu() {
    menu.classList.contains("active") ? closeMenu() : openMenu();
  }

  // Clique no botão hamburger
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Fechar ao clicar num link do menu
  menu.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Fechar ao clicar fora do menu
  document.addEventListener("click", (e) => {
    if (menu.classList.contains("active") && !menu.contains(e.target)) {
      closeMenu();
    }
  });

  // Fechar ao pressionar ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Fechar o menu se o ecrã crescer para desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeMenu();
  });
})();

// =======================================
// BACK TO TOP
// =======================================
(function () {
  const btn = document.getElementById("backToTop");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 400);
  });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

// =======================================
// NEWSLETTER FORM
// =======================================
(function () {
  const form = document.getElementById("newsletterForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.innerHTML = `
      <div class="newsletter-success">
        <i class="fas fa-check-circle"></i>
        <p>Inscrito com sucesso!</p>
      </div>`;
  });
})();