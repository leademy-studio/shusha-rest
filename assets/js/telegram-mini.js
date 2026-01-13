(function initTelegramMiniApp() {
    if (typeof Telegram === "undefined" || !Telegram.WebApp) {
        return;
    }

    const tg = Telegram.WebApp;
    tg.ready();
    tg.expand();

    const theme = tg.themeParams || {};
    if (theme.bg_color) {
        document.documentElement.style.setProperty("--page-bg", theme.bg_color);
    }

    const extractPhone = (payload) => {
        if (!payload) {
            return "";
        }
        if (typeof payload === "string") {
            try {
                return extractPhone(JSON.parse(payload));
            } catch (e) {
                return "";
            }
        }
        return (
            payload.phone_number ||
            payload.phone ||
            payload.contact?.phone_number ||
            payload.user?.phone_number ||
            payload.response?.contact?.phone_number ||
            payload.response?.phone_number ||
            ""
        );
    };

    tg.onEvent("contactRequested", (data) => {
        const phone = extractPhone(data);
        if (phone) {
            window.__tgContactPhone = phone;
        }
        window.__tgContactData = data;
    });
})();
