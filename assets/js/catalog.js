const catalogGrid = document.getElementById("catalog-grid");
const statusLabel = document.getElementById("catalog-status");
const filtersContainer = document.getElementById("catalog-filters");

const fallbackItems = [
    {
        id: "set-classic",
        name: "Сет «Восточная классика»",
        price: 1290,
        category: "Роллы",
        imageUrl:
            "https://images.unsplash.com/photo-1604908177138-0681c9f9f1ae?auto=format&fit=crop&w=900&q=80"
    },
    {
        id: "kebab-lamb",
        name: "Шашлык из баранины на углях",
        price: 980,
        category: "Мангал",
        imageUrl:
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80"
    },
    {
        id: "poke-salmon",
        name: "Поке с лососем и киноа",
        price: 720,
        category: "Боулы",
        imageUrl:
            "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80"
    },
    {
        id: "khachapuri",
        name: "Хачапури по-аджарски",
        price: 540,
        category: "Выпечка",
        imageUrl:
            "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=900&q=80"
    },
    {
        id: "soup-tom",
        name: "Том ям с креветкой",
        price: 690,
        category: "Супы",
        imageUrl:
            "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80"
    },
    {
        id: "dessert-mango",
        name: "Чизкейк манго-маракуйя",
        price: 390,
        category: "Десерты",
        imageUrl:
            "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=900&q=80"
    },
    {
        id: "drink-matcha",
        name: "Матча латте на кокосовом молоке",
        price: 310,
        category: "Напитки",
        imageUrl:
            "https://images.unsplash.com/photo-1481390322020-00505612b252?auto=format&fit=crop&w=900&q=80"
    },
    {
        id: "veggie-roll",
        name: "Веган ролл с авокадо",
        price: 460,
        category: "Роллы",
        imageUrl:
            "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80"
    }
];

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

function setStatus(text) {
    if (statusLabel) {
        statusLabel.textContent = text;
    }
}

function normalizeItems(items) {
    if (!Array.isArray(items) || !items.length) {
        return fallbackItems;
    }

    return items.map((item, index) => {
        const parsedPrice = typeof item.price === "number" ? item.price : Number(item.price);
        const categoryName =
            typeof item.category === "string"
                ? item.category.trim() || "Меню"
                : item.category
                  ? String(item.category)
                  : "Меню";
        return {
            id: item.id || `catalog-item-${index}`,
            name: item.name || "Блюдо",
            price: Number.isFinite(parsedPrice) ? parsedPrice : null,
            category: categoryName,
            imageUrl:
                item.imageUrl ||
                "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80"
        };
    });
}

function createCard({ name, price, imageUrl, category }) {
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

    figure.append(img);

    const body = document.createElement("div");
    body.className = "popular-card__body";

    const top = document.createElement("div");
    top.className = "popular-card__top";

    const title = document.createElement("h3");
    title.className = "popular-card__title";
    title.textContent = name;
    title.setAttribute("itemprop", "name");

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

    top.append(title, priceEl);

    const actions = document.createElement("div");
    actions.className = "popular-card__actions";

    const addButton = document.createElement("button");
    addButton.className = "popular-card__button popular-card__button--primary";
    addButton.type = "button";
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
        fragment.appendChild(createCard(item));
    });
    catalogGrid.appendChild(fragment);
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

    let incoming = [];
    try {
        if (typeof fetchCatalog === "function") {
            const response = await fetchCatalog();
            incoming = Array.isArray(response?.items) ? response.items : [];
        }
    } catch (error) {
        console.warn("Catalog: не удалось получить меню", error);
    }

    const normalizedItems = normalizeItems(incoming.length ? incoming : fallbackItems);
    catalogItems = normalizedItems;
    statusNote = incoming.length
        ? "данные из меню IIKO"
        : "показываем подборку, сервис меню недоступен";

    const categories = collectCategories(normalizedItems);
    renderFilters(categories);
    setActiveFilter("all");
}

document.addEventListener("DOMContentLoaded", loadCatalog);
