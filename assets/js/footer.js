// Footer functionality

// Back to Top button
function initBackToTop() {
    const backToTopButton = document.getElementById('back-to-top');
    
    if (backToTopButton) {
        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Load footer component
async function loadFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    
    if (footerPlaceholder) {
        try {
            const response = await fetch('/footer.html');
            if (response.ok) {
                const html = await response.text();
                footerPlaceholder.innerHTML = html;
                initBackToTop();
            } else {
                console.error('Footer не загружен:', response.status);
            }
        } catch (error) {
            console.error('Ошибка загрузки footer:', error);
        }
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadFooter();
        // Если footer уже в DOM (не через placeholder)
        if (!document.getElementById('footer-placeholder')) {
            initBackToTop();
        }
    });
} else {
    loadFooter();
    if (!document.getElementById('footer-placeholder')) {
        initBackToTop();
    }
}
