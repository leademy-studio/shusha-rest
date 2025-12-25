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

let currentIndex = 0;
let autoRotate;

function setSlide(index) {
    currentIndex = (index + slides.length) % slides.length;

    const { title, description } = slides[currentIndex];
    heroPanel.dataset.activeSlide = String(currentIndex);
    titleElement.textContent = title;
    descriptionElement.textContent = description;

    sliderSteps.forEach((step, stepIndex) => {
        step.classList.toggle("hero__slider-step--active", stepIndex === currentIndex);
        step.setAttribute("aria-pressed", stepIndex === currentIndex ? "true" : "false");
    });
}

function startAutoRotate() {
    if (prefersReducedMotion) {
        return;
    }

    autoRotate = window.setInterval(() => {
        setSlide(currentIndex + 1);
    }, 6500);
}

function resetAutoRotate() {
    window.clearInterval(autoRotate);
    startAutoRotate();
}

sliderSteps.forEach((step) => {
    step.addEventListener("click", () => {
        const targetIndex = Number(step.dataset.slide);
        setSlide(targetIndex);
        resetAutoRotate();
    });
});

setSlide(0);
startAutoRotate();

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

function createPopularCard({ name, price, imageUrl }) {
    const article = document.createElement("article");
    article.className = "popular-card";

    const figure = document.createElement("figure");
    figure.className = "popular-card__media";

    const img = document.createElement("img");
    img.className = "popular-card__image";
    img.alt = name;
    img.loading = "lazy";
    img.src =
        imageUrl ||
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80";

    figure.appendChild(img);

    const body = document.createElement("div");
    body.className = "popular-card__body";

    const top = document.createElement("div");
    top.className = "popular-card__top";

    const title = document.createElement("h3");
    title.className = "popular-card__title";
    title.textContent = name;

    const priceEl = document.createElement("span");
    priceEl.className = "popular-card__price";
    priceEl.textContent = formatPrice(price) || "—";

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

async function populatePopular() {
    if (!popularGrid) {
        return;
    }

    try {
        const { items } = await fetchCatalog();
        if (!items?.length) {
            return;
        }

        const topItems = items.slice(0, 3);
        popularGrid.innerHTML = "";
        topItems.forEach((item) => {
            popularGrid.appendChild(createPopularCard(item));
        });
    } catch (error) {
        // Keep static fallback cards if request fails
        console.warn("Failed to load catalog:", error);
    }
}

populatePopular();
