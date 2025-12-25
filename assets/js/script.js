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
