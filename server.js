import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Раздача всех статических файлов из корня проекта (включая catalog.html)
app.use(express.static(__dirname));
const PORT = process.env.PORT || 3000;
const IIKO_BASE_URL = process.env.IIKO_BASE_URL || "https://api-ru.iiko.services";
const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;

if (!IIKO_API_LOGIN) {
    console.warn("⚠️  IIKO_API_LOGIN is not set. Create .env based on .env.example.");
}

app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.get("/", (_, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/catalog", (_, res) => {
    res.sendFile(path.join(__dirname, "catalog.html"));
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
        const fs = await import("fs");
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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
