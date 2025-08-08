"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
function POST(req) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        try {
            const start = Date.now();
            // 1) Shared-secret doğrulaması (opsiyonel ama önerilir)
            // Header adı öncelik sırası:
            //   1) X-Ingest-Token
            //   2) Authorization: Bearer <token>
            const xIngestHeader = req.headers.get("x-ingest-token") || req.headers.get("X-Ingest-Token");
            const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
            const bearer = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer ")) ? authHeader.slice("Bearer ".length) : undefined;
            const provided = (xIngestHeader || bearer || "").trim();
            const expected = (process.env.SITE_LOG_INGEST_TOKEN || "").trim();
            if (expected && provided !== expected) {
                const mode = xIngestHeader ? "x-ingest-token" : (bearer ? "bearer" : "none");
                return server_1.NextResponse.json({ error: "forbidden", code: "BAD_TOKEN", mode }, { status: 403 });
            }
            // 2) Body parse
            let body = {};
            try {
                body = yield req.json();
            }
            catch (_l) {
                return server_1.NextResponse.json({ error: "invalid json", code: "BAD_JSON" }, { status: 400 });
            }
            const now = new Date().toISOString();
            // 3) Normalize
            const normGuildId = (body === null || body === void 0 ? void 0 : body.guildId) ||
                ((_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.guildId) ||
                ((_c = (_b = body === null || body === void 0 ? void 0 : body.data) === null || _b === void 0 ? void 0 : _b.guild) === null || _c === void 0 ? void 0 : _c.id) ||
                undefined;
            const normUserId = (body === null || body === void 0 ? void 0 : body.userId) ||
                ((_d = body === null || body === void 0 ? void 0 : body.data) === null || _d === void 0 ? void 0 : _d.userId) ||
                ((_f = (_e = body === null || body === void 0 ? void 0 : body.data) === null || _e === void 0 ? void 0 : _e.author) === null || _f === void 0 ? void 0 : _f.id) ||
                undefined;
            const normChannelId = (body === null || body === void 0 ? void 0 : body.channelId) ||
                ((_g = body === null || body === void 0 ? void 0 : body.data) === null || _g === void 0 ? void 0 : _g.channelId) ||
                ((_j = (_h = body === null || body === void 0 ? void 0 : body.data) === null || _h === void 0 ? void 0 : _h.channel) === null || _j === void 0 ? void 0 : _j.id) ||
                undefined;
            const entry = {
                timestamp: (body === null || body === void 0 ? void 0 : body.timestamp) || now,
                event: String((body === null || body === void 0 ? void 0 : body.event) || "unknown"),
                guildId: normGuildId ? String(normGuildId) : undefined,
                userId: normUserId ? String(normUserId) : undefined,
                channelId: normChannelId ? String(normChannelId) : undefined,
                data: (_k = body === null || body === void 0 ? void 0 : body.data) !== null && _k !== void 0 ? _k : undefined,
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
                    const buf = yield (yield import("fs/promises")).readFile(targetPath, "utf8");
                    const json = JSON.parse(buf);
                    if (Array.isArray(json))
                        arr = json;
                }
                catch (_m) {
                    arr = [];
                }
                // Append (boyut büyürse ileride rotasyon/KV eklenir)
                arr.push(entry);
                // Klasör oluşturmayı dener (local path için)
                try {
                    const { dirname } = yield import("path");
                    const dir = dirname(targetPath);
                    yield (yield import("fs/promises")).mkdir(dir, { recursive: true });
                }
                catch (_o) { }
                // NDJSON için de klasör hazır olsun
                try {
                    const { dirname } = yield import("path");
                    const dir = dirname(targetNdjson);
                    yield (yield import("fs/promises")).mkdir(dir, { recursive: true });
                }
                catch (_p) { }
                // JSON array dosyasını güncelle
                yield (yield import("fs/promises")).writeFile(targetPath, JSON.stringify(arr, null, 2), "utf8");
                // NDJSON dosyasına satır ekle (append)
                try {
                    yield (yield import("fs/promises")).appendFile(targetNdjson, JSON.stringify(entry) + "\n", "utf8");
                }
                catch (e) {
                    console.error("[log-ingest][ndjson-append-error]", (e === null || e === void 0 ? void 0 : e.message) || e);
                }
                const took = Date.now() - start;
                return server_1.NextResponse.json({ ok: true, tookMs: took, mode: isProd ? "prod-tmp" : "local-file", paths: { json: targetPath, ndjson: targetNdjson } }, { status: 200 });
            }
            catch (e) {
                return server_1.NextResponse.json({ error: "storage error", code: "IO_ERROR", message: (e === null || e === void 0 ? void 0 : e.message) || "io-failed" }, { status: 500 });
            }
        }
        catch (e) {
            return server_1.NextResponse.json({ error: (e === null || e === void 0 ? void 0 : e.message) || "failed", code: "UNHANDLED" }, { status: 500 });
        }
    });
}
