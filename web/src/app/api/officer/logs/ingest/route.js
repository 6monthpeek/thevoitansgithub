"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
async function POST(req) {
    try {
        const start = Date.now();
        // 1) Shared-secret doğrulaması (opsiyonel ama önerilir)
        // Header adı öncelik sırası:
        //   1) X-Ingest-Token
        //   2) Authorization: Bearer <token>
        const xIngestHeader = req.headers.get("x-ingest-token") || req.headers.get("X-Ingest-Token");
        const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
        const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
        const provided = (xIngestHeader || bearer || "").trim();
        const expected = (process.env.SITE_LOG_INGEST_TOKEN || "").trim();
        if (expected && provided !== expected) {
            const mode = xIngestHeader ? "x-ingest-token" : (bearer ? "bearer" : "none");
            return server_1.NextResponse.json({ error: "forbidden", code: "BAD_TOKEN", mode }, { status: 403 });
        }
        // 2) Body parse
        let body = {};
        try {
            body = await req.json();
        }
        catch {
            return server_1.NextResponse.json({ error: "invalid json", code: "BAD_JSON" }, { status: 400 });
        }
        const now = new Date().toISOString();
        // 3) Normalize
        const normGuildId = body?.guildId ||
            body?.data?.guildId ||
            body?.data?.guild?.id ||
            undefined;
        const normUserId = body?.userId ||
            body?.data?.userId ||
            body?.data?.author?.id ||
            undefined;
        const normChannelId = body?.channelId ||
            body?.data?.channelId ||
            body?.data?.channel?.id ||
            undefined;
        const entry = {
            timestamp: body?.timestamp || now,
            event: String(body?.event || "unknown"),
            guildId: normGuildId ? String(normGuildId) : undefined,
            userId: normUserId ? String(normUserId) : undefined,
            channelId: normChannelId ? String(normChannelId) : undefined,
            data: body?.data ?? undefined,
        };
        if (!entry.event) {
            return server_1.NextResponse.json({ error: "event field required", code: "MISSING_EVENT" }, { status: 400 });
        }
        // 4) Yazma hedefi:
        // - Prod (Vercel): /tmp/site-logs.json (runtime yazılabilir)
        // - Local/dev: web/output/site-logs.json (repo içi)
        // Ek olarak NDJSON paralel yazım: /tmp/site-logs.ndjson veya web/output/site-logs.ndjson
        try {
            const targetPath = isProd ? "/tmp/site-logs.json" : "web/output/site-logs.json";
            const targetNdjson = isProd ? "/tmp/site-logs.ndjson" : "web/output/site-logs.ndjson";
            // Mevcut içeriği oku (yoksa boş dizi)
            let arr = [];
            try {
                const buf = await (await import("fs/promises")).readFile(targetPath, "utf8");
                const json = JSON.parse(buf);
                if (Array.isArray(json))
                    arr = json;
            }
            catch {
                arr = [];
            }
            // Append (boyut büyürse ileride rotasyon/KV eklenir)
            arr.push(entry);
            // Klasör oluşturmayı dener (local path için)
            try {
                const { dirname } = await import("path");
                const dir = dirname(targetPath);
                await (await import("fs/promises")).mkdir(dir, { recursive: true });
            }
            catch { }
            // NDJSON için de klasör hazır olsun
            try {
                const { dirname } = await import("path");
                const dir = dirname(targetNdjson);
                await (await import("fs/promises")).mkdir(dir, { recursive: true });
            }
            catch { }
            // JSON array dosyasını güncelle
            await (await import("fs/promises")).writeFile(targetPath, JSON.stringify(arr, null, 2), "utf8");
            // NDJSON dosyasına satır ekle (append)
            try {
                await (await import("fs/promises")).appendFile(targetNdjson, JSON.stringify(entry) + "\n", "utf8");
            }
            catch (e) {
                console.error("[log-ingest][ndjson-append-error]", e?.message || e);
            }
            const took = Date.now() - start;
            return server_1.NextResponse.json({ ok: true, tookMs: took, mode: isProd ? "prod-tmp" : "local-file", paths: { json: targetPath, ndjson: targetNdjson } }, { status: 200 });
        }
        catch (e) {
            return server_1.NextResponse.json({ error: "storage error", code: "IO_ERROR", message: e?.message || "io-failed" }, { status: 500 });
        }
    }
    catch (e) {
        return server_1.NextResponse.json({ error: e?.message || "failed", code: "UNHANDLED" }, { status: 500 });
    }
}
