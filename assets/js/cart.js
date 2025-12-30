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
    }

    // Обновить счетчик товаров
    updateBadge() {
        const count = this.cart.getTotalItems();
        if (this.badge) {
            this.badge.textContent = count;
            this.badge.style.display = count > 0 ? 'flex' : 'none';
        }
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
            window.location.href = 'catalog.html';
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
                            <div class="checkout-form__field">
                                <label class="checkout-form__label" for="checkout-email">Email</label>
                                <input class="checkout-form__input" type="email" id="checkout-email" name="email">
                            </div>
                        </div>
                        
                        <div class="checkout-form__section">
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
                                    <input type="radio" name="payment" value="online">
                                    <span>Оплата онлайн</span>
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
                                <span>${this.formatPrice(this.cart.getTotalPrice())}</span>
                            </div>
                            <div class="checkout-form__summary-row">
                                <span>Доставка:</span>
                                <span>Бесплатно</span>
                            </div>
                            <div class="checkout-form__summary-row checkout-form__summary-row--total">
                                <span>Итого:</span>
                                <span>${this.formatPrice(this.cart.getTotalPrice())}</span>
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
        
        // Маска для телефона
        const phoneInput = modal.querySelector('#checkout-phone');
        phoneInput.addEventListener('input', (e) => this.formatPhone(e));
        
        document.body.appendChild(modal);
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

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const order = {
            customer: {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email')
            },
            delivery: {
                address: formData.get('address'),
                comment: formData.get('comment')
            },
            payment: formData.get('payment'),
            items: this.cart.getItems(),
            total: this.cart.getTotalPrice(),
            timestamp: new Date().toISOString()
        };
        
        console.log('Заказ:', order);
        
        // Здесь будет отправка на сервер
        try {
            // Пример отправки (раскомментировать, когда будет API)
            // const response = await fetch('/api/orders', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(order)
            // });
            // const result = await response.json();
            
            // Временная имитация успешного заказа
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showSuccess();
            this.cart.clear();
        } catch (error) {
            console.error('Ошибка отправки заказа:', error);
            alert('Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте снова.');
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
            window.location.href = 'catalog.html';
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
