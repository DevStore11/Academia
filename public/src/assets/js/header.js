// Header and navigation functionality
document.addEventListener('DOMContentLoaded', function() {
  // Sticky navbar on scroll
  const navbar = document.querySelector('.navbar');
  
  if (navbar) {
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll <= 0) {
        navbar.style.background = 'rgba(26, 26, 46, 0.95)';
        navbar.style.boxShadow = 'var(--shadow)';
        return;
      }
      
      if (currentScroll > lastScroll && currentScroll > 100) {
        // Scroll down
        navbar.style.transform = 'translateY(-100%)';
      } else {
        // Scroll up
        navbar.style.transform = 'translateY(0)';
        navbar.style.background = currentScroll > 100 ? 'rgba(26, 26, 46, 0.98)' : 'rgba(26, 26, 46, 0.95)';
      }
      
      lastScroll = currentScroll;
    });
  }
  
  // Active navigation link based on scroll position
  function setActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      
      if (window.pageYOffset >= sectionTop - 200) {
        current = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}` || 
          (current === '' && link.getAttribute('href') === 'index.html')) {
        link.classList.add('active');
      }
    });
  }
  
  window.addEventListener('scroll', setActiveNavLink);
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        
        const headerHeight = document.querySelector('.navbar').offsetHeight;
        const targetPosition = target.offsetTop - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Add active state to current page in navigation
  function setCurrentPage() {
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      
      if (currentPath === linkPath || 
          (currentPath === '' && linkPath === 'index.html')) {
        link.classList.add('active');
      }
    });
  }
  
  setCurrentPage();
});