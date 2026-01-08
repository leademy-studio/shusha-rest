const slides = [
    {
        title: "Свежие роллы за 25 минут",
        description: "Сборка под заказ, аккуратная упаковка и бесплатная доставка в пределах МКАД."
    },
    {
        title: "Горячие блюда без ожидания",
        description: "Поке, воки и супы приезжают теплыми за счет термопакетов и бережной логистики."
    },
    {
        title: "Сеты для компании",
        description: "Скомпоновали лучшие роллы в наборы на 2, 4 или 6 персон, чтобы не выбирать долго."
    },
    {
        title: "Десерты и матча",
        description: "Матча-латте, чизкейки и моти в фирменном стиле — завершение идеального вечера."
    }
];

const heroPanel = document.querySelector(".hero__panel");
const titleElement = document.getElementById("hero-title");
const descriptionElement = document.getElementById("hero-description");
const sliderSteps = Array.from(document.querySelectorAll(".hero__slider-step"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const popularGrid = document.querySelector(".popular__grid");

if (heroPanel && titleElement && descriptionElement && sliderSteps.length) {
    let currentIndex = 0;
    let autoRotate;
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeThreshold = 40;

    const setSlide = (index) => {
        currentIndex = (index + slides.length) % slides.length;
        const { title, description } = slides[currentIndex];

        heroPanel.dataset.activeSlide = String(currentIndex);
        titleElement.textContent = title;
        descriptionElement.textContent = description;

        sliderSteps.forEach((step, stepIndex) => {
            step.classList.toggle("hero__slider-step--active", stepIndex === currentIndex);
            step.setAttribute("aria-pressed", stepIndex === currentIndex ? "true" : "false");
        });
    };

    const startAutoRotate = () => {
        if (prefersReducedMotion) {
            return;
        }

        autoRotate = window.setInterval(() => {
            setSlide(currentIndex + 1);
        }, 6500);
    };

    const resetAutoRotate = () => {
        window.clearInterval(autoRotate);
        startAutoRotate();
    };

    sliderSteps.forEach((step) => {
        step.addEventListener("click", () => {
            const targetIndex = Number(step.dataset.slide);
            setSlide(targetIndex);
            resetAutoRotate();
        });
    });

    const handleTouchStart = (event) => {
        const touch = event.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    };

    const handleTouchEnd = (event) => {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
            return;
        }

        if (deltaX < 0) {
            setSlide(currentIndex + 1);
        } else {
            setSlide(currentIndex - 1);
        }
        resetAutoRotate();
    };

    heroPanel.addEventListener("touchstart", handleTouchStart, { passive: true });
    heroPanel.addEventListener("touchend", handleTouchEnd, { passive: true });

    setSlide(0);
    startAutoRotate();
}

const corporateGalleries = Array.from(document.querySelectorAll(".corporate__gallery"));

corporateGalleries.forEach((gallery) => {
    const mainImage = gallery.querySelector(".corporate__photo--main img");
    const thumbnails = Array.from(gallery.querySelectorAll(".corporate__photo-grid img"));

    if (!mainImage || !thumbnails.length) {
        return;
    }

    const swapImages = (thumb) => {
        if (!thumb || thumb === mainImage) {
            return;
        }

        const mainSrc = mainImage.src;
        const mainAlt = mainImage.alt;

        mainImage.src = thumb.src;
        mainImage.alt = thumb.alt || mainAlt;

        thumb.src = mainSrc;
        thumb.alt = mainAlt;
    };

    thumbnails.forEach((thumb) => {
        thumb.setAttribute("role", "button");
        thumb.setAttribute("tabindex", "0");

        thumb.addEventListener("click", () => swapImages(thumb));
        thumb.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                swapImages(thumb);
            }
        });
    });
});

async function fetchCatalog() {
    const response = await fetch("/api/catalog");
    if (!response.ok) {
        throw new Error("Catalog request failed");
    }
    return response.json();
}

function formatPrice(price) {
    if (typeof price !== "number" || Number.isNaN(price)) {
        return "";
    }
    return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

function extractWeight(name) {
    const patterns = [
        /\((\d+\s*(?:гр|г|мл|л|кг|шт))\)/i,
        /(\d+\s*(?:гр|г|мл|л|кг|шт))\*/i,
        /(\d+\s*(?:гр|г|мл|л|кг|шт))$/i
    ];
    
    for (const pattern of patterns) {
        const match = name.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    return null;
}

function cleanProductName(name) {
    let cleaned = name
        .replace(/\(\d+\s*(?:гр|г|мл|л|кг|шт)\)/gi, '')
        .replace(/\d+\s*(?:гр|г|мл|л|кг|шт)\*/gi, '')
        .replace(/\s+\d+\s*(?:гр|г|мл|л|кг|шт)$/gi, '')
        .replace(/\*+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned;
}

function createPopularCard({ id, name, price, imageUrl, category, description, weight }) {
    const article = document.createElement("article");
    article.className = "popular-card catalog-card";

    const figure = document.createElement("figure");
    figure.className = "popular-card__media";

    const img = document.createElement("img");
    img.className = "popular-card__image";
    img.alt = name;
    img.loading = "lazy";
    img.src = imageUrl || "assets/images/default.jpg";
    
    // Обработка ошибок загрузки
    img.onerror = function() {
        this.src = "assets/images/default.jpg";
    };
    
    // Бейдж категории
    if (category) {
        const categoryBadge = document.createElement("span");
        categoryBadge.className = "popular-card__category-badge";
        categoryBadge.textContent = category;
        figure.appendChild(categoryBadge);
    }
    
    // Добавляем оверлей для описания
    const overlay = document.createElement("div");
    overlay.className = "popular-card__overlay";
    
    const overlayTitle = document.createElement("h4");
    overlayTitle.className = "popular-card__overlay-title";
    overlayTitle.textContent = "Описание";
    
    const overlayText = document.createElement("p");
    overlayText.className = "popular-card__overlay-text";
    overlayText.textContent = description && description.trim() 
        ? description.trim() 
        : "Подробное описание блюда отсутствует.";
    
    overlay.append(overlayTitle, overlayText);
    figure.appendChild(overlay);

    figure.insertBefore(img, figure.firstChild);

    const body = document.createElement("div");
    body.className = "popular-card__body";

    const top = document.createElement("div");
    top.className = "popular-card__top";
    
    const titleWrapper = document.createElement("div");
    titleWrapper.className = "popular-card__title-wrapper";

    const title = document.createElement("h3");
    title.className = "popular-card__title";
    title.textContent = name;
    
    titleWrapper.appendChild(title);
    
    // Добавляем вес, если есть
    if (weight) {
        const weightBadge = document.createElement("span");
        weightBadge.className = "popular-card__weight";
        weightBadge.textContent = weight;
        titleWrapper.appendChild(weightBadge);
    }

    const priceEl = document.createElement("span");
    priceEl.className = "popular-card__price";
    priceEl.textContent = formatPrice(price) || "—";

    top.append(titleWrapper, priceEl);
    
    const actions = document.createElement("div");
    actions.className = "popular-card__actions";

    const addButton = document.createElement("button");
    addButton.className = "popular-card__button popular-card__button--primary";
    addButton.type = "button";
    addButton.dataset.productId = id;
    addButton.innerHTML = `
        <span class="popular-card__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6h15l-1.5 8.5H7.5L6 6zm0 0L4 3H1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="19" r="1" fill="currentColor"/>
                <circle cx="17" cy="19" r="1" fill="currentColor"/>
            </svg>
        </span>
        В корзину
    `;
    
    // Добавляем функционал корзины
    addButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof cart !== 'undefined') {
            const product = { id, name, price, imageUrl, category, weight };
            cart.addItem(product);
            
            // Визуальная обратная связь
            addButton.classList.add('popular-card__button--added');
            addButton.innerHTML = `
                <span class="popular-card__icon" aria-hidden="true">✓</span>
                Добавлено
            `;
            
            setTimeout(() => {
                addButton.classList.remove('popular-card__button--added');
                addButton.innerHTML = `
                    <span class="popular-card__icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M6 6h15l-1.5 8.5H7.5L6 6zm0 0L4 3H1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="9" cy="19" r="1" fill="currentColor"/>
                            <circle cx="17" cy="19" r="1" fill="currentColor"/>
                        </svg>
                    </span>
                    В корзину
                `;
            }, 1500);
        }
    });

    const detailsButton = document.createElement("button");
    detailsButton.className = "popular-card__button popular-card__button--ghost";
    detailsButton.type = "button";
    detailsButton.textContent = "Подробнее";
    
    // Переменная для хранения таймера
    let overlayTimer = null;
    
    // Обработчик для кнопки "Подробнее"
    detailsButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        const isActive = overlay.classList.contains('active');
        
        if (isActive) {
            overlay.classList.remove('active');
            if (overlayTimer) {
                clearTimeout(overlayTimer);
                overlayTimer = null;
            }
        } else {
            overlay.classList.add('active');
            overlayTimer = setTimeout(() => {
                overlay.classList.remove('active');
                overlayTimer = null;
            }, 5000);
        }
    });

    actions.append(addButton, detailsButton);
    body.append(top, actions);
    article.append(figure, body);

    return article;
}

async function populatePopular() {
    if (!popularGrid) {
        return;
    }

    try {
        const { items = [] } = await fetchCatalog();
        if (!items.length) {
            popularGrid.innerHTML = '<p style="text-align: center; color: #666;">Товары загружаются...</p>';
            return;
        }

        const normalizedItems = items.map((item, index) => ({
            id: item.id || `popular-${index}`,
            name: cleanProductName(item.name),
            price: item.price,
            imageUrl: item.imageUrl || "assets/images/default.jpg",
            category: item.category,
            description: item.description || "",
            weight: extractWeight(item.name)
        }));

        const primaryPool = normalizedItems.filter((item) => item.category !== "Прохладительные напитки");
        const withImages = primaryPool.filter((item) => Boolean(item.imageUrl));
        const fallbackPool = normalizedItems.filter((item) => !withImages.includes(item));

        const combined = [...withImages, ...fallbackPool];
        const topItems = combined.slice(0, 4);

        if (!topItems.length) {
            popularGrid.innerHTML = '<p style="text-align: center; color: #666;">Товары загружаются...</p>';
            return;
        }

        popularGrid.innerHTML = "";
        topItems.forEach((item) => {
            popularGrid.appendChild(createPopularCard(item));
        });
    } catch (error) {
        console.warn("Failed to load catalog:", error);
        popularGrid.innerHTML = '<p style="text-align: center; color: #666;">Не удалось загрузить товары</p>';
    }
}

populatePopular();
