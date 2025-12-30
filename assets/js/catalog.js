const catalogGrid = document.getElementById("catalog-grid");
const statusLabel = document.getElementById("catalog-status");
const filtersContainer = document.getElementById("catalog-filters");

let catalogItems = [];
let activeFilter = "all";
let statusNote = "";

const moneyFormatter =
    typeof formatPrice === "function"
        ? formatPrice
        : (price) => {
              if (typeof price !== "number" || Number.isNaN(price)) {
                  return "";
              }
              return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
          };

function extractWeight(name) {
    // Извлекаем вес из названия: (300гр), 500 мл, (200гр)*, 150гр и т.д.
    const patterns = [
        /\((\d+\s*(?:гр|г|мл|л|кг|шт))\)/i,  // (300гр), (500 мл)
        /(\d+\s*(?:гр|г|мл|л|кг|шт))\*/i,     // 300гр*, 500 мл*
        /(\d+\s*(?:гр|г|мл|л|кг|шт))$/i       // 300гр, 500 мл в конце
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
    // Убираем вес из названия и лишние символы
    let cleaned = name
        .replace(/\(\d+\s*(?:гр|г|мл|л|кг|шт)\)/gi, '')  // убираем (300гр)
        .replace(/\d+\s*(?:гр|г|мл|л|кг|шт)\*/gi, '')    // убираем 300гр*
        .replace(/\s+\d+\s*(?:гр|г|мл|л|кг|шт)$/gi, '')  // убираем 300гр в конце
        .replace(/\*+$/g, '')                             // убираем оставшиеся *
        .replace(/\s+/g, ' ')                             // нормализуем пробелы
        .trim();
    return cleaned;
}

function setStatus(text) {
    if (statusLabel) {
        statusLabel.textContent = text;
    }
}

function normalizeItems(items) {
    if (!Array.isArray(items) || !items.length) {
        return [];
    }

    const normalized = items.map((item, index) => {
        const parsedPrice = typeof item.price === "number" ? item.price : Number(item.price);
        const categoryName =
            typeof item.category === "string"
                ? item.category.trim() || "Меню"
                : item.category
                  ? String(item.category)
                  : "Меню";
        
        // Определяем изображение: реальное из API или дефолтное
        let imageUrl = item.imageUrl;
        if (!imageUrl) {
            imageUrl = "assets/images/default.jpg";
        }
        
        const originalName = item.name || "Блюдо";
        const weight = extractWeight(originalName);
        const cleanedName = cleanProductName(originalName);
        
        return {
            id: item.id || `catalog-item-${index}`,
            name: cleanedName,
            originalName: originalName,
            weight: weight,
            description: item.description || "",
            price: Number.isFinite(parsedPrice) ? parsedPrice : null,
            category: categoryName,
            imageUrl
        };
    });

    // Сортируем: напитки в конец списка
    return normalized.sort((a, b) => {
        const isDrinkA = a.category === "Прохладительные напитки";
        const isDrinkB = b.category === "Прохладительные напитки";
        
        if (isDrinkA && !isDrinkB) return 1;  // a после b
        if (!isDrinkA && isDrinkB) return -1; // a перед b
        return 0; // сохраняем исходный порядок
    });
}

function createCard({ id, name, price, imageUrl, category, description, weight }) {
    const article = document.createElement("article");
    article.className = "popular-card catalog-card";
    article.setAttribute("role", "listitem");
    article.setAttribute("itemtype", "https://schema.org/Product");
    article.setAttribute("itemscope", "");

    const figure = document.createElement("figure");
    figure.className = "popular-card__media";

    const img = document.createElement("img");
    img.className = "popular-card__image";
    img.src = imageUrl;
    img.alt = name;
    img.loading = "lazy";
    img.setAttribute("itemprop", "image");
    
    // Добавляем обработку ошибок загрузки изображений
    img.onerror = function() {
        this.src = "assets/images/default.jpg";
    };

    // Добавляем бейдж категории
    const categoryBadge = document.createElement("span");
    categoryBadge.className = "popular-card__category-badge";
    categoryBadge.textContent = category;

    figure.append(img, categoryBadge);

    const body = document.createElement("div");
    body.className = "popular-card__body";

    const top = document.createElement("div");
    top.className = "popular-card__top";

    const titleWrapper = document.createElement("div");
    titleWrapper.className = "popular-card__title-wrapper";
    
    const title = document.createElement("h3");
    title.className = "popular-card__title";
    title.textContent = name;
    title.setAttribute("itemprop", "name");
    
    titleWrapper.appendChild(title);
    
    // Добавляем вес, если он есть
    if (weight) {
        const weightBadge = document.createElement("span");
        weightBadge.className = "popular-card__weight";
        weightBadge.textContent = weight;
        titleWrapper.appendChild(weightBadge);
    }

    const priceEl = document.createElement("span");
    priceEl.className = "popular-card__price";
    priceEl.textContent = price ? moneyFormatter(price) : "По запросу";
    priceEl.setAttribute("itemprop", "offers");
    priceEl.setAttribute("itemscope", "");
    priceEl.setAttribute("itemtype", "https://schema.org/Offer");

    const priceCurrency = document.createElement("meta");
    priceCurrency.setAttribute("itemprop", "priceCurrency");
    priceCurrency.content = "RUB";
    priceEl.appendChild(priceCurrency);

    if (price) {
        const priceNumber = document.createElement("meta");
        priceNumber.setAttribute("itemprop", "price");
        priceNumber.content = String(price);
        priceEl.appendChild(priceNumber);
    }

    top.append(titleWrapper, priceEl);

    // Добавляем описание, если оно есть
    if (description && description.trim()) {
        const descEl = document.createElement("p");
        descEl.className = "popular-card__description";
        descEl.textContent = description.trim();
        descEl.setAttribute("itemprop", "description");
        body.appendChild(descEl);
    }

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

    actions.append(addButton, detailsButton);
    body.append(top, actions);

    article.append(figure, body);

    return article;
}

function renderCatalog(list) {
    if (!catalogGrid) {
        return;
    }

    console.log(`renderCatalog вызвана с ${list.length} товарами`);
    catalogGrid.innerHTML = "";

    if (!list.length) {
        const emptyState = document.createElement("p");
        emptyState.className = "catalog-empty";
        emptyState.textContent = "Не нашли блюда в этой подборке. Попробуйте другой фильтр.";
        catalogGrid.appendChild(emptyState);
        return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((item) => {
        try {
            fragment.appendChild(createCard(item));
        } catch (e) {
            console.error("Ошибка создания карточки:", e, item);
        }
    });
    catalogGrid.appendChild(fragment);
    console.log(`Отрисовано ${list.length} карточек`);
}

function collectCategories(items) {
    const categories = items
        .map((item) => {
            const category = typeof item.category === "string" ? item.category.trim() : String(item.category || "");
            return category;
        })
        .filter(Boolean);

    return Array.from(new Set(categories));
}

function updateActiveFilterUI() {
    if (!filtersContainer) {
        return;
    }

    const buttons = filtersContainer.querySelectorAll(".catalog-chip");
    buttons.forEach((button) => {
        const isActive = button.dataset.filter === activeFilter;
        button.classList.toggle("catalog-chip--active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
}

function setActiveFilter(nextFilter) {
    activeFilter = nextFilter;
    updateActiveFilterUI();

    const filtered =
        nextFilter === "all" ? catalogItems : catalogItems.filter((item) => item.category === nextFilter);
    renderCatalog(filtered);

    const categoryLabel = nextFilter === "all" ? "весь каталог" : `категорию «${nextFilter}»`;
    const suffix = statusNote ? ` — ${statusNote}` : ".";
    setStatus(`Показываем ${filtered.length} позиций, ${categoryLabel}${suffix}`);
}

function renderFilters(categories) {
    if (!filtersContainer) {
        return;
    }

    filtersContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();

    const addButton = (value, label) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "catalog-chip";
        button.dataset.filter = value;
        button.textContent = label;
        button.addEventListener("click", () => setActiveFilter(value));
        fragment.appendChild(button);
    };

    addButton("all", "Все позиции");
    categories.forEach((category) => addButton(category, category));

    filtersContainer.appendChild(fragment);
    updateActiveFilterUI();
}

async function loadCatalog() {
    if (!catalogGrid) {
        return;
    }

    setStatus("Загружаем меню...");
    
    // Показываем скелетоны во время загрузки
    catalogGrid.innerHTML = `
        <div class="catalog-skeleton">
            ${Array(6).fill('<div class="catalog-skeleton__item"></div>').join('')}
        </div>
    `;

    let incoming = [];
    try {
        if (typeof fetchCatalog === "function") {
            console.log("Загружаем каталог из API...");
            const response = await fetchCatalog();
            console.log("API ответ:", response);
            incoming = Array.isArray(response?.items) ? response.items : [];
            console.log(`Получено товаров: ${incoming.length}`);
        } else {
            console.warn("fetchCatalog не определена, используем fallback");
        }
    } catch (error) {
        console.error("Catalog: не удалось получить меню", error);
    }

    const normalizedItems = normalizeItems(incoming);
    console.log(`Нормализовано товаров: ${normalizedItems.length}`);
    catalogItems = normalizedItems;
    
    if (incoming.length) {
        statusNote = "данные из меню IIKO";
    } else {
        statusNote = "меню недоступно";
    }

    const categories = collectCategories(normalizedItems);
    console.log(`Найдено категорий: ${categories.length}`, categories);
    renderFilters(categories);
    setActiveFilter("all");
}

document.addEventListener("DOMContentLoaded", loadCatalog);
