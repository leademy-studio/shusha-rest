// Header functionality

// Mobile menu toggle
function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('header-nav');
    const header = document.getElementById('header');
    
    if (menuToggle && nav) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'header__overlay';
        document.body.appendChild(overlay);
        
        menuToggle.addEventListener('click', () => {
            const isOpen = nav.classList.contains('header__nav--open');
            
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });
        
        // Close menu on overlay click
        overlay.addEventListener('click', closeMenu);
        
        // Close menu on link click
        const menuLinks = nav.querySelectorAll('.header__menu-link');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    closeMenu();
                }
            });
        });
        
        function openMenu() {
            nav.classList.add('header__nav--open');
            menuToggle.classList.add('header__menu-toggle--active');
            overlay.classList.add('header__overlay--visible');
            document.body.style.overflow = 'hidden';
        }
        
        function closeMenu() {
            nav.classList.remove('header__nav--open');
            menuToggle.classList.remove('header__menu-toggle--active');
            overlay.classList.remove('header__overlay--visible');
            document.body.style.overflow = '';
        }
        
        // Close menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        });
    }
}

// Header scroll effect
function initHeaderScroll() {
    const header = document.getElementById('header');
    
    if (header) {
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            // Add scrolled class
            if (currentScrollY > 50) {
                header.classList.add('header--scrolled');
            } else {
                header.classList.remove('header--scrolled');
            }
            
            // Optional: Hide header on scroll down
            // Uncomment to enable
            /*
            if (currentScrollY > lastScrollY && currentScrollY > 150) {
                header.classList.add('header--hidden');
            } else {
                header.classList.remove('header--hidden');
            }
            */
            
            lastScrollY = currentScrollY;
        });
    }
}

// Active menu link
function initActiveMenuLink() {
    const menuLinks = document.querySelectorAll('.header__menu-link');
    const currentPath = window.location.pathname;
    
    menuLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        
        // Exact match or index page
        if (linkPath === currentPath || 
            (currentPath === '/' && linkPath === '/') ||
            (currentPath.includes(linkPath) && linkPath !== '/')) {
            link.classList.add('header__menu-link--active');
        }
    });
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                const headerHeight = document.getElementById('header')?.offsetHeight || 0;
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize all header functionality
function initHeader() {
    initMobileMenu();
    initHeaderScroll();
    initActiveMenuLink();
    initSmoothScroll();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
} else {
    initHeader();
}
