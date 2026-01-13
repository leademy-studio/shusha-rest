import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Раздача всех статических файлов из корня проекта (включая catalog.html)
app.use(express.static(__dirname));
const PORT = process.env.PORT || 3000;
const IIKO_BASE_URL = process.env.IIKO_BASE_URL || "https://api-ru.iiko.services";
const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_CONTACT_POLL_MS = 5000;

const telegramContactStore = new Map();
let telegramUpdatesOffset = 0;
let telegramPollingStarted = false;

if (!IIKO_API_LOGIN) {
    console.warn("⚠️  IIKO_API_LOGIN is not set. Create .env based on .env.example.");
}
if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️  Telegram token or chat ID is not set in .env. Notifications will be disabled.");
}

app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.get("/api/telegram-contact", (req, res) => {
    const userId = req.query.userId ? String(req.query.userId) : "";
    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }

    const entry = telegramContactStore.get(userId);
    if (!entry) {
        return res.status(404).json({ phone: "" });
    }

    return res.json({ phone: entry.phone, updatedAt: entry.updatedAt });
});

app.get("/", (_, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/catalog", (_, res) => {
    res.sendFile(path.join(__dirname, "catalog.html"));
});

app.get(["/telegram", "/telegram/"], (_, res) => {
    res.sendFile(path.join(__dirname, "telegram.html"));
});

app.get(["/contacts", "/contacts/"], (_, res) => {
    res.sendFile(path.join(__dirname, "contacts.html"));
});

app.get("/api/catalog", async (_, res) => {
    try {
        // Пробуем загрузить из iiko API
        if (IIKO_API_LOGIN) {
            try {
                const token = await fetchAccessToken();
                const organizations = await fetchOrganizations(token);
                const organizationId = organizations[0]?.id;

                if (organizationId) {
                    const terminalGroups = await fetchTerminalGroups(token, [organizationId]);
                    const terminalGroupId =
                        terminalGroups.find((group) => group.isActive)?.id || terminalGroups[0]?.id || null;

                    if (terminalGroupId) {
                        const nomenclature = await fetchNomenclature(token, organizationId);
                        const items = simplifyNomenclature(nomenclature, organizationId);

                        return res.json({
                            items,
                            organizationId,
                            terminalGroupId
                        });
                    }
                }
            } catch (iikoError) {
                console.warn("iiko API unavailable, falling back to static menu:", iikoError.message);
            }
        }

        // Фоллбэк: загружаем статическое меню
        const staticMenuPath = path.join(__dirname, "static-menu.json");
        
        if (fs.existsSync(staticMenuPath)) {
            const staticMenu = JSON.parse(fs.readFileSync(staticMenuPath, "utf-8"));
            return res.json(staticMenu);
        }

        return res.status(500).json({ error: "Menu not available" });
    } catch (error) {
        console.error("Catalog fetch failed:", error);
        res.status(500).json({ error: "Failed to load catalog", details: error.message });
    }
});

app.post("/api/reservation", async (req, res) => {
    const { date, time, guests, phone } = req.body || {};
    if (!date || !time || !guests || !phone) {
        return res.status(400).json({ success: false, message: "Некорректные данные бронирования" });
    }

    try {
        const message = formatReservationForTelegram({ date, time, guests, phone });
        if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
            await sendTelegramNotification(message);
        }
        res.status(200).json({ success: true, message: "Заявка отправлена" });
    } catch (error) {
        logTelegramError && logTelegramError(error && error.stack ? error.stack : String(error));
        res.status(500).json({ success: false, message: "Ошибка отправки в Telegram" });
    }
});

app.post("/api/orders", async (req, res) => {
    const order = req.body;

    try {
        console.log("Received new order:", JSON.stringify(order, null, 2));

        if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
            const message = formatOrderForTelegram(order);
            await sendTelegramNotification(message);
        }

        if (order && order.telegram && order.telegram.userId) {
            const confirmation = formatOrderConfirmation(order);
            try {
                await sendTelegramMessage(order.telegram.userId, confirmation);
            } catch (notifyError) {
                logTelegramError(
                    notifyError && notifyError.stack ? notifyError.stack : String(notifyError)
                );
            }
        }

        res.status(200).json({ success: true, message: "Order received" });
    } catch (error) {
        console.error("Failed to process order:", error);
        res.status(500).json({ success: false, message: "Failed to process order" });
    }
});

async function fetchAccessToken() {
    const response = await fetch(`${IIKO_BASE_URL}/api/1/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiLogin: IIKO_API_LOGIN })
    });

    if (!response.ok) {
        throw new Error(`Access token request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.token ?? data.accessToken ?? data;
}

async function fetchOrganizations(token) {
    const response = await fetch(`${IIKO_BASE_URL}/api/1/organizations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
    });

    if (!response.ok) {
        throw new Error(`Organizations request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.organizations || [];
}

async function fetchTerminalGroups(token, organizationIds) {
    const response = await fetch(`${IIKO_BASE_URL}/api/1/terminal_groups`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            organizationIds,
            returnAdditionalInfo: false,
            includeExternalDeleted: false
        })
    });

    if (!response.ok) {
        throw new Error(`Terminal groups request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.terminalGroups || [];
}

async function fetchNomenclature(token, organizationId) {
    const response = await fetch(`${IIKO_BASE_URL}/api/1/nomenclature`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            organizationId
        })
    });

    if (!response.ok) {
        throw new Error(`Nomenclature request failed with status ${response.status}`);
    }

    return response.json();
}

function simplifyNomenclature(nomenclature, organizationId) {
    const groupsIndex = new Map();
    (nomenclature.groups || []).forEach((group) => {
        if (group?.id) {
            groupsIndex.set(group.id, group.name || "Меню");
        }
    });

    const products = nomenclature.products || [];
    return products.reduce((acc, product) => {
        if (!product || product.isDeleted) {
            return acc;
        }

        const sizePrice =
            (product.sizePrices || []).find((p) => {
                if (p.organizationId) {
                    return p.organizationId === organizationId;
                }
                if (p.organizations && Array.isArray(p.organizations)) {
                    return p.organizations.includes(organizationId);
                }
                return true;
            }) || (product.sizePrices || [])[0];

        if (!sizePrice) {
            return acc;
        }

        const priceRaw = sizePrice.price ?? null;
        const price = typeof priceRaw === "number" ? priceRaw : priceRaw ? Number(priceRaw) : null;
        const imageUrl = (product.imageLinks && product.imageLinks[0]) || null;
        const category = groupsIndex.get(product.parentGroup) || "Меню";
        const description = product.description || "";

        acc.push({
            id: sizePrice.sizeId ? `${product.id}:${sizePrice.sizeId}` : product.id,
            name: product.name || "Блюдо",
            description: description.trim(),
            price,
            imageUrl,
            category
        });

        return acc;
    }, []);
}

function formatReservationForTelegram({ date, time, guests, phone }) {
    return [
        '*📝 Новая заявка на бронирование!*',
        '',
        `*Дата:* ${date}`,
        `*Время:* ${time}`,
        `*Гостей:* ${guests}`,
        `*Телефон:* \`${phone}\``,
    ].join('\n');
}

function formatOrderForTelegram(order) {
    const itemsText = order.items
        .map((item) => `- ${item.name} (x${item.quantity}) - ${item.price * item.quantity} ₽`)
        .join("\n");

    const deliveryMethod = order.delivery.method === "pickup" ? "Самовывоз" : "Доставка";
    let deliveryInfo = "";
    if (deliveryMethod === "Доставка") {
        deliveryInfo = `
*Адрес:* ${order.delivery.address || "Не указан"}
*Комментарий:* ${order.delivery.comment || "Нет"}
        `.trim();
    }

    const paymentMethod =
        {
            cash: "Наличными курьеру",
            card: "Картой курьеру",
            online: "Оплата онлайн"
        }[order.payment] || "Не указан";

    return `
*🎉 Новый заказ!*

*Клиент:*
Имя: ${order.customer.name}
Телефон: \`${order.customer.phone}\`
Email: ${order.customer.email || "Не указан"}

*Детали заказа:*
${itemsText}

*Сумма:* ${order.subtotal} ₽
*Скидка (самовывоз):* ${order.discount} ₽
*Итого:* *${order.total} ₽*

*Получение:* ${deliveryMethod}
${deliveryInfo}
*Оплата:* ${paymentMethod}
    `.trim();
}

function formatOrderConfirmation(order) {
    const itemsCount = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const total = order.total ?? order.subtotal ?? 0;
    return [
        "✅ Заказ успешно оформлен!",
        "",
        `Позиции: ${itemsCount} шт.`,
        `Итого: ${total} ₽`,
        "Мы свяжемся с вами для подтверждения.",
    ].join("\n");
}

async function sendTelegramNotification(text) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn("Telegram credentials not set, skipping notification.");
        return;
    }

    await sendTelegramMessage(TELEGRAM_CHAT_ID, text, "Markdown");
}

async function sendTelegramMessage(chatId, text, parseMode = "Markdown") {
    if (!TELEGRAM_TOKEN || !chatId) {
        console.warn("Telegram credentials not set, skipping notification.");
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            logTelegramError(`Telegram API error: ${response.status} - ${errorData.description}`);
            throw new Error(`Telegram API error: ${response.status} - ${errorData.description}`);
        }
        console.log("Telegram notification sent successfully.");
    } catch (err) {
        logTelegramError(err && err.stack ? err.stack : String(err));
        throw err;
    }
}

function logTelegramError(message) {
    const logPath = path.join(__dirname, 'telegram_error.log');
    const logMsg = `[${new Date().toISOString()}] ${message}\n`;
    try {
        fs.appendFileSync(logPath, logMsg, 'utf8');
    } catch (e) {
        console.error('Failed to write to telegram_error.log:', e);
    }
}

async function pollTelegramContacts() {
    if (!TELEGRAM_TOKEN) {
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${telegramUpdatesOffset}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return;
        }

        const data = await response.json();
        if (!data.ok) {
            return;
        }

        const updates = Array.isArray(data.result) ? data.result : [];
        updates.forEach((update) => {
            if (typeof update.update_id === "number") {
                telegramUpdatesOffset = Math.max(telegramUpdatesOffset, update.update_id + 1);
            }

            const message = update.message;
            if (!message || !message.contact) {
                return;
            }

            const contact = message.contact;
            const userId = contact.user_id || (message.from ? message.from.id : null);
            if (!userId || !contact.phone_number) {
                return;
            }

            telegramContactStore.set(String(userId), {
                phone: contact.phone_number,
                updatedAt: Date.now()
            });
        });
    } catch (error) {
        logTelegramError(error && error.stack ? error.stack : String(error));
    }
}

function startTelegramContactPolling() {
    if (telegramPollingStarted || !TELEGRAM_TOKEN) {
        return;
    }
    telegramPollingStarted = true;
    pollTelegramContacts();
    setInterval(pollTelegramContacts, TELEGRAM_CONTACT_POLL_MS);
}

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    startTelegramContactPolling();
});
