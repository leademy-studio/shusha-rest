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
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) {
            return; // не подсвечиваем якорные ссылки как активные страницы
        }

        const linkPath = new URL(link.href).pathname;

        const isExact = linkPath === currentPath;
        const isIndex = currentPath === '/' && linkPath === '/';

        if (isExact || isIndex) {
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

function initReservationModal() {
    const openButtons = document.querySelectorAll('[data-open-reservation]');
    const modal = document.getElementById('reservation-modal');
    const overlay = modal?.querySelector('.reservation-modal__overlay');
    const closeButtons = modal ? modal.querySelectorAll('[data-close-reservation]') : [];
    const form = document.getElementById('reservation-form');
    const dateInput = document.getElementById('reservation-date');
    const timeSelect = document.getElementById('reservation-time');
    const guestsInput = document.getElementById('reservation-guests');
    const phoneInput = document.getElementById('reservation-phone');
    const consentCheckbox = document.getElementById('reservation-consent');
    const statusField = document.getElementById('reservation-status');

    if (!modal || !openButtons.length || !form || !dateInput || !timeSelect || !guestsInput || !phoneInput || !consentCheckbox) {
        return;
    }

    const config = {
        minGuests: 1,
        maxGuests: 20,
        startHour: 10,
        endHour: 23
    };

    const timeSlots = buildTimeSlots(config.startHour, config.endHour);
    populateTimeSelect(timeSelect, timeSlots);

    function formatDateValue(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function buildTimeSlots(startHour, endHour) {
        const slots = [];
        for (let hour = startHour; hour <= endHour; hour += 1) {
            [0, 30].forEach((minute) => {
                if (hour === endHour && minute > 30) {
                    return;
                }
                const h = String(hour).padStart(2, '0');
                const m = String(minute).padStart(2, '0');
                slots.push(`${h}:${m}`);
            });
        }
        return slots;
    }

    function populateTimeSelect(selectEl, slots) {
        selectEl.innerHTML = '';
        const fragment = document.createDocumentFragment();
        slots.forEach((slot) => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            fragment.appendChild(option);
        });
        selectEl.appendChild(fragment);
    }

    function findNearestSlot(now, slots) {
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const target = Math.ceil(nowMinutes / 30) * 30;
        for (const slot of slots) {
            const [h, m] = slot.split(':').map(Number);
            const slotMinutes = h * 60 + m;
            if (slotMinutes >= target) {
                return slot;
            }
        }
        return slots[slots.length - 1];
    }

    function setDefaultDateTime() {
        const today = new Date();
        const todayValue = formatDateValue(today);
        dateInput.min = todayValue;
        dateInput.value = todayValue;
        const defaultSlot = findNearestSlot(today, timeSlots);
        timeSelect.value = defaultSlot;
    }

    function updateTimeForDate() {
        const today = formatDateValue(new Date());
        const chosen = dateInput.value || today;
        if (chosen < today) {
            dateInput.value = today;
        }
        const slot = chosen === today ? findNearestSlot(new Date(), timeSlots) : timeSlots[0];
        timeSelect.value = slot;
    }

    function clampGuests(value) {
        return Math.min(config.maxGuests, Math.max(config.minGuests, value));
    }

    function formatPhone(raw) {
        let digits = raw.replace(/\D/g, '');
        if (!digits) return '';

        if (digits.startsWith('8')) {
            digits = '7' + digits.slice(1);
        } else if (digits.startsWith('9')) {
            digits = '7' + digits;
        } else if (digits.startsWith('7')) {
            digits = '7' + digits.slice(1);
        }

        if (!digits.startsWith('7')) {
            digits = '7' + digits;
        }

        digits = digits.slice(0, 11);

        let formatted = '+7';
        if (digits.length > 1) {
            formatted += ' ' + digits.slice(1, 4);
        }
        if (digits.length > 4) {
            formatted += ' ' + digits.slice(4, 7);
        }
        if (digits.length > 7) {
            formatted += ' ' + digits.slice(7, 9);
        }
        if (digits.length > 9) {
            formatted += ' ' + digits.slice(9, 11);
        }
        return formatted.trim();
    }

    function openModal() {
        setDefaultDateTime();
        guestsInput.value = clampGuests(Number(guestsInput.value) || 2);
        phoneInput.value = '';
        consentCheckbox.checked = false;
        statusField.textContent = '';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        phoneInput.focus();
    }

    function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    openButtons.forEach((btn) => btn.addEventListener('click', openModal));
    closeButtons.forEach((btn) => btn.addEventListener('click', closeModal));
    overlay?.addEventListener('click', closeModal);

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
            closeModal();
        }
    });

    dateInput.addEventListener('change', updateTimeForDate);

    modal.addEventListener('click', (event) => {
        const target = event.target;
        if (target?.dataset?.counter === 'plus') {
            guestsInput.value = clampGuests(Number(guestsInput.value || '0') + 1);
        }
        if (target?.dataset?.counter === 'minus') {
            guestsInput.value = clampGuests(Number(guestsInput.value || '0') - 1);
        }
    });

    phoneInput.addEventListener('input', () => {
        phoneInput.value = formatPhone(phoneInput.value);
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        statusField.textContent = '';

        if (!form.checkValidity()) {
            statusField.textContent = 'Заполните все поля и согласие.';
            return;
        }

        const phoneDigits = phoneInput.value.replace(/\D/g, '');
        if (phoneDigits.length < 11) {
            statusField.textContent = 'Введите корректный номер телефона.';
            phoneInput.focus();
            return;
        }

        statusField.textContent = 'Заявка отправлена, мы свяжемся с вами для подтверждения.';
        statusField.classList.add('reservation-modal__status--success');
        setTimeout(() => {
            statusField.classList.remove('reservation-modal__status--success');
            closeModal();
        }, 3000);
    });
}

// Initialize all header functionality
function initHeader() {
    initMobileMenu();
    initHeaderScroll();
    initActiveMenuLink();
    initSmoothScroll();
    initReservationModal();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
} else {
    initHeader();
}
