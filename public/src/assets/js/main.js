// Main JavaScript file for Power Play E-Sport

document.addEventListener('DOMContentLoaded', function() {
  // Carousel functionality
  const carouselImages = document.querySelectorAll('.carousel-image');
  const indicators = document.querySelectorAll('.indicator');
  let currentSlide = 0;
  
  function showSlide(index) {
    // Remove active class from all images and indicators
    carouselImages.forEach(img => img.classList.remove('active'));
    indicators.forEach(ind => ind.classList.remove('active'));
    
    // Add active class to current slide
    carouselImages[index].classList.add('active');
    indicators[index].classList.add('active');
    currentSlide = index;
  }
  
  // Initialize carousel
  function initCarousel() {
    if (carouselImages.length === 0) return;
    
    // Set up indicators
    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        showSlide(index);
      });
    });
    
    // Auto rotate slides
    setInterval(() => {
      let nextSlide = (currentSlide + 1) % carouselImages.length;
      showSlide(nextSlide);
    }, 5000);
  }
  
  // League filters
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  function initLeagueFilters() {
    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        const league = this.dataset.league;
        filterTables(league);
      });
    });
  }
  
  function filterTables(league) {
    const tables = document.querySelectorAll('.league-table');
    
    tables.forEach(table => {
      if (league === 'all' || table.dataset.league === league) {
        table.style.display = 'block';
        setTimeout(() => {
          table.style.opacity = '1';
          table.style.transform = 'translateY(0)';
        }, 10);
      } else {
        table.style.opacity = '0';
        table.style.transform = 'translateY(20px)';
        setTimeout(() => {
          table.style.display = 'none';
        }, 300);
      }
    });
  }
  
  // Back to top button
  const backToTopBtn = document.getElementById('backToTop');
  
  function initBackToTop() {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    });
    
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  // Newsletter form
  const newsletterForm = document.getElementById('newsletterForm');
  
  function initNewsletter() {
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.querySelector('input[type="email"]').value;
        
        // Here you would typically send the email to your server
        // For now, we'll just show a success message
        this.innerHTML = `
          <div class="newsletter-success">
            <i class="fas fa-check-circle"></i>
            <p>Inscrição realizada com sucesso!</p>
          </div>
        `;
        
        // Reset form after 3 seconds
        setTimeout(() => {
          this.innerHTML = `
            <input type="email" placeholder="Seu email" required>
            <button type="submit" class="btn-subscribe">Inscrever</button>
          `;
          initNewsletter(); // Reinitialize event listeners
        }, 3000);
      });
    }
  }
  
  // Modal functionality
  const modalOverlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modalPoliticas');
  const openModalBtn = document.getElementById('abrir-politicas');
  const closeModalBtn = document.getElementById('fecharModal');
  
  function initModal() {
    if (openModalBtn && modal && modalOverlay) {
      openModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('show');
        modalOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
      });
      
      function closeModal() {
        modal.classList.remove('show');
        modalOverlay.classList.remove('show');
        document.body.style.overflow = 'auto';
      }
      
      if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
      }
      
      modalOverlay.addEventListener('click', closeModal);
      
      // Close modal with Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
          closeModal();
        }
      });
    }
  }
  
  // Initialize animations on scroll
  function initAnimations() {
    const elements = document.querySelectorAll('.feature-card, .match-card, .league-table');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    
    elements.forEach(element => {
      observer.observe(element);
    });
  }
  
  // Mobile menu toggle
  function initMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburgerBtn && navMenu) {
      hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : 'auto';
      });
      
      // Close menu when clicking on links
      const navLinks = navMenu.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          hamburgerBtn.classList.remove('active');
          navMenu.classList.remove('active');
          document.body.style.overflow = 'auto';
        });
      });
    }
  }
  
  // Initialize everything
  function init() {
    initCarousel();
    initLeagueFilters();
    initBackToTop();
    initNewsletter();
    initModal();
    initAnimations();
    initMobileMenu();
    
    console.log('Power Play E-Sport website initialized');
  }
  
  // Wait for all resources to load
  window.addEventListener('load', init);
});