import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
        if (!IIKO_API_LOGIN) {
            return res.status(500).json({ error: "IIKO_API_LOGIN env variable is not configured" });
        }

        const token = await fetchAccessToken();
        const organizations = await fetchOrganizations(token);
        const organizationId = organizations[0]?.id;

        if (!organizationId) {
            return res.status(500).json({ error: "No organizations available for the provided API login" });
        }

        const menuMeta = await fetchMenuMeta(token);
        const externalMenuId = menuMeta.externalMenus?.[0]?.id;
        const priceCategoryId = menuMeta.priceCategories?.[0]?.id;

        if (!externalMenuId) {
            return res.status(500).json({ error: "No external menus found for the provided API login" });
        }

        const menu = await fetchMenuById(token, {
            externalMenuId,
            organizationId,
            priceCategoryId
        });

        const items = simplifyMenu(menu, organizationId).slice(0, 12);

        return res.json({
            items,
            organizationId,
            externalMenuId,
            priceCategoryId
        });
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

async function fetchMenuMeta(token) {
    const response = await fetch(`${IIKO_BASE_URL}/api/2/menu`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
    });

    if (!response.ok) {
        throw new Error(`Menu meta request failed with status ${response.status}`);
    }

    return response.json();
}

async function fetchMenuById(token, { externalMenuId, organizationId, priceCategoryId }) {
    const response = await fetch(`${IIKO_BASE_URL}/api/2/menu/by_id`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            externalMenuId,
            organizationIds: [organizationId],
            priceCategoryId,
            version: 4
        })
    });

    if (!response.ok) {
        throw new Error(`Menu request failed with status ${response.status}`);
    }

    return response.json();
}

function simplifyMenu(menu, organizationId) {
    const categories = menu.itemGroups || menu.productCategories || [];
    const items = [];

    categories.forEach((category) => {
        if (!category?.items?.length) {
            return;
        }

        category.items.forEach((item) => {
            const size = (item.itemSizes && item.itemSizes[0]) || (item.sizes && item.sizes[0]);
            if (!size) {
                return;
            }

            const priceEntry =
                (size.prices || []).find((p) => {
                    if (!p.organizations || !Array.isArray(p.organizations)) {
                        return true;
                    }
                    return p.organizations.includes(organizationId);
                }) || (size.prices || [])[0];

            const price = priceEntry?.price ?? null;
            const imageUrl = size.buttonImageUrl || category.buttonImageUrl || menu.buttonImageUrl || null;

            items.push({
                id: `${item.id}:${size.id ?? ""}`,
                name: item.name || "Блюдо",
                price: typeof price === "number" ? price : price ? Number(price) : null,
                imageUrl,
                category: category.name || null
            });
        });
    });

    return items;
}

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
