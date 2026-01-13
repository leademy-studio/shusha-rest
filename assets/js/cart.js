// Модуль управления корзиной
class ShoppingCart {
    constructor() {
        this.items = this.loadFromStorage();
        this.listeners = [];
    }

    // Загрузить корзину из localStorage
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('shushaCart');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Ошибка загрузки корзины:', e);
            return [];
        }
    }

    // Сохранить корзину в localStorage
    saveToStorage() {
        try {
            localStorage.setItem('shushaCart', JSON.stringify(this.items));
            this.notifyListeners();
        } catch (e) {
            console.error('Ошибка сохранения корзины:', e);
        }
    }

    // Подписаться на изменения корзины
    subscribe(callback) {
        this.listeners.push(callback);
    }

    // Уведомить подписчиков
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.items));
    }

    // Добавить товар в корзину
    addItem(product) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                category: product.category,
                weight: product.weight,
                quantity: 1
            });
        }
        
        this.saveToStorage();
        return true;
    }

    // Удалить товар из корзины
    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
    }

    // Изменить количество товара
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = quantity;
                this.saveToStorage();
            }
        }
    }

    // Увеличить количество
    incrementItem(productId) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity += 1;
            this.saveToStorage();
        }
    }

    // Уменьшить количество
    decrementItem(productId) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            if (item.quantity > 1) {
                item.quantity -= 1;
                this.saveToStorage();
            } else {
                this.removeItem(productId);
            }
        }
    }

    // Получить все товары
    getItems() {
        return this.items;
    }

    // Получить общее количество товаров
    getTotalItems() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    // Получить общую стоимость
    getTotalPrice() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // Очистить корзину
    clear() {
        this.items = [];
        this.saveToStorage();
    }

    // Проверить, есть ли товар в корзине
    hasItem(productId) {
        return this.items.some(item => item.id === productId);
    }

    // Получить количество конкретного товара
    getItemQuantity(productId) {
        const item = this.items.find(item => item.id === productId);
        return item ? item.quantity : 0;
    }
}

// Создаем глобальный экземпляр корзины
const cart = new ShoppingCart();
const isMiniApp = document.documentElement.dataset.miniApp === "true";
const catalogHref = isMiniApp ? "telegram.html" : "catalog.html";

const tgApp = typeof Telegram !== "undefined" && Telegram.WebApp ? Telegram.WebApp : null;
if (tgApp && isMiniApp) {
    tgApp.ready();
    tgApp.expand();
}

// UI корзины
class CartUI {
    constructor(cartInstance) {
        this.cart = cartInstance;
        this.modal = null;
        this.badge = null;
        this.init();
    }

    init() {
        this.createCartButton();
        this.createModal();
        this.cart.subscribe(() => this.updateBadge());
        this.updateBadge();
    }

    // Создать кнопку корзины
    createCartButton() {
        const button = document.createElement('button');
        button.className = 'cart-button';
        button.type = 'button';
        button.setAttribute('aria-label', 'Открыть корзину');
        button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6h15l-1.5 8.5H7.5L6 6zm0 0L4 3H1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="19" r="1.5" fill="currentColor"/>
                <circle cx="17" cy="19" r="1.5" fill="currentColor"/>
            </svg>
            <span class="cart-button__badge" style="display: none;">0</span>
        `;
        
        this.badge = button.querySelector('.cart-button__badge');
        button.addEventListener('click', () => this.openModal());
        
        document.body.appendChild(button);

        if (isMiniApp) {
            this.createScrollTopButton();
        }
    }

    // Обновить счетчик товаров
    updateBadge() {
        const count = this.cart.getTotalItems();
        if (this.badge) {
            this.badge.textContent = count;
            this.badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    createScrollTopButton() {
        const button = document.createElement('button');
        button.className = 'scroll-top-button';
        button.type = 'button';
        button.setAttribute('aria-label', 'Наверх');
        button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        const updateVisibility = () => {
            const shouldShow = window.scrollY > 240;
            button.classList.toggle('scroll-top-button--visible', shouldShow);
        };

        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', updateVisibility, { passive: true });
        updateVisibility();
        document.body.appendChild(button);
    }

    // Создать модальное окно корзины
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'cart-modal';
        modal.innerHTML = `
            <div class="cart-modal__overlay"></div>
            <div class="cart-modal__content">
                <div class="cart-modal__header">
                    <h2 class="cart-modal__title">Корзина</h2>
                    <button class="cart-modal__close" type="button" aria-label="Закрыть корзину">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="cart-modal__body">
                    <div class="cart-modal__items"></div>
                    <div class="cart-modal__empty" style="display: none;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                            <path d="M6 6h15l-1.5 8.5H7.5L6 6zm0 0L4 3H1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="9" cy="19" r="1" fill="currentColor"/>
                            <circle cx="17" cy="19" r="1" fill="currentColor"/>
                        </svg>
                        <p>Корзина пуста</p>
                        <button class="cart-modal__empty-button" type="button">Перейти в каталог</button>
                    </div>
                </div>
                <div class="cart-modal__footer">
                    <div class="cart-modal__total">
                        <span>Итого:</span>
                        <span class="cart-modal__total-price">0 ₽</span>
                    </div>
                    <button class="cart-modal__checkout" type="button">Оформить заказ</button>
                </div>
            </div>
        `;
        
        this.modal = modal;
        
        // События
        modal.querySelector('.cart-modal__overlay').addEventListener('click', () => this.closeModal());
        modal.querySelector('.cart-modal__close').addEventListener('click', () => this.closeModal());
        modal.querySelector('.cart-modal__checkout').addEventListener('click', () => this.openCheckout());
        modal.querySelector('.cart-modal__empty-button').addEventListener('click', () => {
            this.closeModal();
            window.location.href = catalogHref;
        });
        
        document.body.appendChild(modal);
    }

    // Открыть корзину
    openModal() {
        this.renderItems();
        this.modal.classList.add('cart-modal--open');
        document.body.style.overflow = 'hidden';
    }

    // Закрыть корзину
    closeModal() {
        this.modal.classList.remove('cart-modal--open');
        document.body.style.overflow = '';
    }

    // Отрендерить товары в корзине
    renderItems() {
        const items = this.cart.getItems();
        const container = this.modal.querySelector('.cart-modal__items');
        const emptyState = this.modal.querySelector('.cart-modal__empty');
        const footer = this.modal.querySelector('.cart-modal__footer');
        
        if (items.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            footer.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        footer.style.display = 'flex';
        
        container.innerHTML = items.map(item => this.createItemHTML(item)).join('');
        
        // Добавляем обработчики
        container.querySelectorAll('.cart-item__remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.cart.removeItem(id);
                this.renderItems();
            });
        });
        
        container.querySelectorAll('.cart-item__decrement').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.cart.decrementItem(id);
                this.renderItems();
            });
        });
        
        container.querySelectorAll('.cart-item__increment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.cart.incrementItem(id);
                this.renderItems();
            });
        });
        
        // Обновляем итоговую стоимость
        this.updateTotal();
    }

    // Создать HTML товара
    createItemHTML(item) {
        const total = item.price * item.quantity;
        return `
            <div class="cart-item">
                <img class="cart-item__image" src="${item.imageUrl}" alt="${item.name}">
                <div class="cart-item__details">
                    <h3 class="cart-item__name">${item.name}</h3>
                    ${item.weight ? `<span class="cart-item__weight">${item.weight}</span>` : ''}
                    <p class="cart-item__price">${this.formatPrice(item.price)}</p>
                </div>
                <div class="cart-item__controls">
                    <div class="cart-item__quantity">
                        <button class="cart-item__decrement" type="button" data-id="${item.id}" aria-label="Уменьшить количество">−</button>
                        <span class="cart-item__count">${item.quantity}</span>
                        <button class="cart-item__increment" type="button" data-id="${item.id}" aria-label="Увеличить количество">+</button>
                    </div>
                    <p class="cart-item__total">${this.formatPrice(total)}</p>
                    <button class="cart-item__remove" type="button" data-id="${item.id}" aria-label="Удалить товар">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    // Обновить итоговую стоимость
    updateTotal() {
        const total = this.cart.getTotalPrice();
        const totalElement = this.modal.querySelector('.cart-modal__total-price');
        if (totalElement) {
            totalElement.textContent = this.formatPrice(total);
        }
    }

    // Форматировать цену
    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
    }

    // Открыть форму оформления заказа
    openCheckout() {
        this.closeModal();
        const checkoutUI = new CheckoutUI(this.cart);
        checkoutUI.open();
    }
}

// UI оформления заказа
class CheckoutUI {
    constructor(cartInstance) {
        this.cart = cartInstance;
        this.modal = null;
        this.init();
    }

    init() {
        this.createModal();
    }

    createModal() {
        const emailField = isMiniApp
            ? ''
            : `
                            <div class="checkout-form__field">
                                <label class="checkout-form__label" for="checkout-email">Email</label>
                                <input class="checkout-form__input" type="email" id="checkout-email" name="email">
                            </div>
                        `;
        const contactButton = isMiniApp
            ? `
                            <button class="checkout-form__contact" type="button" data-telegram-contact>
                                Заполнить из Telegram
                            </button>
                        `
            : '';

        const modal = document.createElement('div');
        modal.className = 'checkout-modal';
        modal.innerHTML = `
            <div class="checkout-modal__overlay"></div>
            <div class="checkout-modal__content">
                <div class="checkout-modal__header">
                    <h2 class="checkout-modal__title">Оформление заказа</h2>
                    <button class="checkout-modal__close" type="button" aria-label="Закрыть">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="checkout-modal__body">
                    <form class="checkout-form" id="checkout-form">
                        <div class="checkout-form__section">
                            <h3 class="checkout-form__subtitle">Контактные данные</h3>
                            <div class="checkout-form__field">
                                <label class="checkout-form__label" for="checkout-name">Имя *</label>
                                <input class="checkout-form__input" type="text" id="checkout-name" name="name" required>
                            </div>
                            <div class="checkout-form__field">
                                <label class="checkout-form__label" for="checkout-phone">Телефон *</label>
                                <input class="checkout-form__input" type="tel" id="checkout-phone" name="phone" placeholder="+7 (___) ___-__-__" required>
                            </div>
                            ${contactButton}
                            ${emailField}
                        </div>
                        
                        <div class="checkout-form__section">
                            <h3 class="checkout-form__subtitle">Способ получения</h3>
                            <div class="checkout-form__radio-group" data-delivery-method>
                                <label class="checkout-form__radio">
                                    <input type="radio" name="delivery-method" value="pickup" checked required>
                                    <span>Самовывоз</span>
                                </label>
                                <label class="checkout-form__radio">
                                    <input type="radio" name="delivery-method" value="delivery">
                                    <span>Доставка по адресу</span>
                                </label>
                            </div>
                        </div>

                        <div class="checkout-form__section checkout-form__section--hidden" data-delivery-section>
                            <h3 class="checkout-form__subtitle">Адрес доставки</h3>
                            <div class="checkout-form__field">
                                <label class="checkout-form__label" for="checkout-address">Адрес *</label>
                                <input class="checkout-form__input" type="text" id="checkout-address" name="address" placeholder="Улица, дом, квартира" required>
                            </div>
                            <div class="checkout-form__field">
                                <label class="checkout-form__label" for="checkout-comment">Комментарий к заказу</label>
                                <textarea class="checkout-form__textarea" id="checkout-comment" name="comment" rows="3" placeholder="Домофон, этаж, пожелания к заказу"></textarea>
                            </div>
                        </div>
                        
                        <div class="checkout-form__section">
                            <h3 class="checkout-form__subtitle">Способ оплаты</h3>
                            <div class="checkout-form__radio-group">
                                <label class="checkout-form__radio">
                                    <input type="radio" name="payment" value="cash" checked>
                                    <span>Наличными курьеру</span>
                                </label>
                                <label class="checkout-form__radio">
                                    <input type="radio" name="payment" value="card">
                                    <span>Картой курьеру</span>
                                </label>
                                <label class="checkout-form__radio">
                                    <input type="radio" name="payment" value="online" disabled aria-disabled="true" title="Временно недоступно">
                                    <span>Оплата онлайн (временно недоступно)</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="checkout-form__summary">
                            <div class="checkout-form__summary-row">
                                <span>Товаров:</span>
                                <span>${this.cart.getTotalItems()} шт.</span>
                            </div>
                            <div class="checkout-form__summary-row">
                                <span>Стоимость:</span>
                                <span data-summary-subtotal>${this.formatPrice(this.cart.getTotalPrice())}</span>
                            </div>
                            <div class="checkout-form__summary-row">
                                <span>Доставка:</span>
                                <span>Бесплатно</span>
                            </div>
                            <div class="checkout-form__summary-row checkout-form__summary-row--discount" data-discount-row hidden>
                                <span>Скидка 10% (самовывоз)</span>
                                <span data-discount-amount>−0 ₽</span>
                            </div>
                            <div class="checkout-form__summary-row checkout-form__summary-row--total">
                                <span>Итого:</span>
                                <span data-summary-total>${this.formatPrice(this.cart.getTotalPrice())}</span>
                            </div>
                        </div>
                        
                        <button class="checkout-form__submit" type="submit">Подтвердить заказ</button>
                    </form>
                </div>
            </div>
        `;
        
        this.modal = modal;
        
        // События
        modal.querySelector('.checkout-modal__overlay').addEventListener('click', () => this.close());
        modal.querySelector('.checkout-modal__close').addEventListener('click', () => this.close());
        modal.querySelector('#checkout-form').addEventListener('submit', (e) => this.handleSubmit(e));

        const deliverySection = modal.querySelector('[data-delivery-section]');
        const deliveryRadios = Array.from(modal.querySelectorAll('input[name="delivery-method"]'));
        const addressInput = modal.querySelector('#checkout-address');
        const commentInput = modal.querySelector('#checkout-comment');
        const subtotalEl = modal.querySelector('[data-summary-subtotal]');
        const totalEl = modal.querySelector('[data-summary-total]');
        const discountRow = modal.querySelector('[data-discount-row]');
        const discountAmountEl = modal.querySelector('[data-discount-amount]');

        const updateDeliverySection = () => {
            const selected = modal.querySelector('input[name="delivery-method"]:checked');
            const isDelivery = selected?.value === 'delivery';
            const isPickup = selected?.value === 'pickup';
            const subtotal = this.cart.getTotalPrice();
            const discount = isPickup ? Math.round(subtotal * 0.1) : 0;
            const total = subtotal - discount;

            deliverySection.classList.toggle('checkout-form__section--hidden', !isDelivery);
            deliverySection.setAttribute('aria-hidden', String(!isDelivery));
            addressInput.required = isDelivery;
            addressInput.disabled = !isDelivery;
            commentInput.disabled = !isDelivery;
            if (!isDelivery) {
                addressInput.value = '';
                commentInput.value = '';
            }

            if (subtotalEl) {
                subtotalEl.textContent = this.formatPrice(subtotal);
            }
            if (totalEl) {
                totalEl.textContent = this.formatPrice(total);
            }
            if (discountRow && discountAmountEl) {
                discountRow.hidden = !isPickup;
                discountRow.setAttribute('aria-hidden', String(!isPickup));
                discountAmountEl.textContent = `−${this.formatPrice(discount)}`;
            }
        };

        deliveryRadios.forEach((radio) => {
            radio.addEventListener('change', updateDeliverySection);
        });

        updateDeliverySection();

        // Маска для телефона
        const phoneInput = modal.querySelector('#checkout-phone');
        phoneInput.addEventListener('input', (e) => this.formatPhone(e));
        
        document.body.appendChild(modal);
        this.prefillFromTelegram();
        this.bindTelegramContact();
    }

    open() {
        this.modal.classList.add('checkout-modal--open');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.modal.classList.remove('checkout-modal--open');
        document.body.style.overflow = '';
        this.modal.remove();
    }

    formatPhone(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('7') || value.startsWith('8')) {
            value = value.substring(1);
        }
        
        let formatted = '+7';
        if (value.length > 0) {
            formatted += ' (' + value.substring(0, 3);
        }
        if (value.length >= 4) {
            formatted += ') ' + value.substring(3, 6);
        }
        if (value.length >= 7) {
            formatted += '-' + value.substring(6, 8);
        }
        if (value.length >= 9) {
            formatted += '-' + value.substring(8, 10);
        }
        
        e.target.value = formatted;
    }

    prefillFromTelegram() {
        if (!isMiniApp || !tgApp) {
            return;
        }

        const user = tgApp.initDataUnsafe && tgApp.initDataUnsafe.user ? tgApp.initDataUnsafe.user : null;
        if (!user) {
            return;
        }

        const nameInput = this.modal.querySelector('#checkout-name');
        const phoneInput = this.modal.querySelector('#checkout-phone');
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        const phone = user.phone_number || user.phone || '';

        if (nameInput && fullName && !nameInput.value) {
            nameInput.value = fullName;
        }
        if (phoneInput && phone && !phoneInput.value) {
            phoneInput.value = phone;
            this.formatPhone({ target: phoneInput });
        }
    }

    bindTelegramContact() {
        if (!isMiniApp || !tgApp || typeof tgApp.requestContact !== 'function') {
            return;
        }

        const contactButton = this.modal.querySelector('[data-telegram-contact]');
        if (!contactButton) {
            return;
        }

        const onContact = (eventData) => {
            const phoneInput = this.modal.querySelector('#checkout-phone');
            if (!phoneInput) {
                return;
            }

            let phone = '';
            const responseRaw = eventData && eventData.response ? eventData.response : null;
            if (typeof responseRaw === 'string') {
                try {
                    const parsed = JSON.parse(responseRaw);
                    phone =
                        parsed?.phone_number ||
                        parsed?.contact?.phone_number ||
                        parsed?.user?.phone_number ||
                        '';
                } catch (e) {
                    phone = '';
                }
            }

            if (phone && !phoneInput.value) {
                phoneInput.value = phone;
                this.formatPhone({ target: phoneInput });
            }

            contactButton.disabled = false;
            contactButton.textContent = 'Заполнить из Telegram';
        };

        tgApp.onEvent('contactRequested', onContact);

        contactButton.addEventListener('click', async () => {
            contactButton.disabled = true;
            contactButton.textContent = 'Запрашиваем...';
            try {
                await tgApp.requestContact();
            } catch (e) {
                contactButton.disabled = false;
                contactButton.textContent = 'Заполнить из Telegram';
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const deliveryMethod = formData.get('delivery-method');
        const subtotal = this.cart.getTotalPrice();
        const discount = deliveryMethod === 'pickup' ? Math.round(subtotal * 0.1) : 0;
        const total = subtotal - discount;
        const order = {
            customer: {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email')
            },
            delivery: {
                method: deliveryMethod
            },
            payment: formData.get('payment'),
            items: this.cart.getItems(),
            subtotal,
            discount,
            total,
            timestamp: new Date().toISOString()
        };

        if (deliveryMethod === 'delivery') {
            order.delivery.address = formData.get('address');
            order.delivery.comment = formData.get('comment');
        }
        
        console.log('Заказ:', order);
        
        // Отправка заказа на сервер
        try {
            const submitButton = e.target.querySelector('.checkout-form__submit');
            submitButton.disabled = true;
            submitButton.textContent = 'Отправляем...';

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Server response:', result);
            
            this.showSuccess();
            this.cart.clear();
        } catch (error) {
            console.error('Ошибка отправки заказа:', error);
            alert('Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте снова.');
            
            const submitButton = e.target.querySelector('.checkout-form__submit');
            submitButton.disabled = false;
            submitButton.textContent = 'Подтвердить заказ';
        }
    }

    showSuccess() {
        this.modal.querySelector('.checkout-modal__body').innerHTML = `
            <div class="checkout-success">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3>Заказ успешно оформлен!</h3>
                <p>Мы свяжемся с вами в ближайшее время для подтверждения.</p>
                <button class="checkout-success__button" type="button">Вернуться в каталог</button>
            </div>
        `;
        
        this.modal.querySelector('.checkout-success__button').addEventListener('click', () => {
            this.close();
            window.location.href = catalogHref;
        });
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
    }
}

// Инициализация UI корзины при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CartUI(cart);
    });
} else {
    new CartUI(cart);
}
