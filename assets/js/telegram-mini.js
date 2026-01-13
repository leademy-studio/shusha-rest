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
})();
